import BookIssue from '../models/BookIssue.js';
import Book from '../models/Book.js';
import Student from '../models/Student.js';
import Faculty from '../models/Faculty.js';
import Setting from '../models/Setting.js';
import Reservation from '../models/Reservation.js';
import BookRequest from '../models/BookRequest.js';
import { refreshReservationQueue } from '../utils/reservationQueue.js';
import { logAudit } from '../utils/logger.js';
import { createNotification } from '../utils/notify.js';
import { emitEvent } from '../utils/socket.js';

// @desc   Issue a book to Student or Faculty
// @route  POST /api/issues
// @access Admin, Librarian
export const createIssue = async (req, res, next) => {
  try {
    const {
      memberType,
      memberId,
      bookId,
      issueDate = new Date(),
      dueDate,
    } = req.body;

    if (!memberType || !memberId || !bookId) {
      return res.status(400).json({
        success: false,
        message: 'Member Type, Member selection, and Book selection are required.',
      });
    }

    if (!['Student', 'Faculty'].includes(memberType)) {
      return res.status(400).json({
        success: false,
        message: 'Member type must be either Student or Faculty.',
      });
    }

    // 1. Fetch System Settings for limits
    let settings = await Setting.findOne();
    if (!settings) {
      settings = await Setting.create({});
    }

    // 2. Validate Member & Department
    let member;
    let memberDepartmentId;
    let borrowingLimit = memberType === 'Student'
      ? settings.studentBorrowingLimit || 3
      : settings.facultyBorrowingLimit || 5;

    if (memberType === 'Student') {
      member = await Student.findById(memberId).populate('departmentId', 'deptCode name status');
      if (!member) {
        return res.status(404).json({ success: false, message: 'Student not found.' });
      }
      if (member.status !== 'Active') {
        return res.status(400).json({
          success: false,
          message: `Cannot issue book. Student account is "${member.status}".`,
        });
      }
      memberDepartmentId = member.departmentId?._id;
    } else {
      member = await Faculty.findById(memberId).populate('departmentId', 'deptCode name status');
      if (!member) {
        return res.status(404).json({ success: false, message: 'Faculty member not found.' });
      }
      if (member.status !== 'Active') {
        return res.status(400).json({
          success: false,
          message: `Cannot issue book. Faculty account is "${member.status}".`,
        });
      }
      memberDepartmentId = member.departmentId?._id;
    }

    // 3. Check Member's Active Borrowing Limit
    const activeLoansCount = await BookIssue.countDocuments({
      memberType,
      memberId: member._id,
      status: { $in: ['Issued', 'Overdue'] },
    });

    if (activeLoansCount >= borrowingLimit) {
      return res.status(400).json({
        success: false,
        message: `${memberType} "${member.name}" has reached the maximum borrowing limit of ${borrowingLimit} books (currently holding ${activeLoansCount}). Return a book to issue more.`,
      });
    }

    // 4. Validate Book & Availability
    const book = await Book.findById(bookId).populate('departmentId', 'deptCode name');
    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found.' });
    }

    if (book.availableQuantity <= 0) {
      return res.status(400).json({
        success: false,
        message: `Book "${book.title}" is currently unavailable / out of stock in ${book.departmentId?.deptCode} department.`,
      });
    }

    // Check if the member already has an active issue for the exact same book
    const alreadyIssued = await BookIssue.findOne({
      memberType,
      memberId: member._id,
      bookId: book._id,
      status: { $in: ['Issued', 'Overdue'] },
    });

    if (alreadyIssued) {
      return res.status(400).json({
        success: false,
        message: `Member already has an active issued copy of "${book.title}".`,
      });
    }

    await refreshReservationQueue(book._id);
    const readyReservations = await Reservation.find({
      bookId: book._id,
      status: 'Ready for Pickup',
    }).sort({ readyAt: 1, reservedAt: 1, _id: 1 });
    const reservedForMember = readyReservations.find((reservation) => (
      reservation.memberType === memberType
      && String(reservation.memberId) === String(member._id)
    ));
    if (readyReservations.length && !reservedForMember) {
      return res.status(409).json({ success: false, message: 'This copy is reserved for another member.' });
    }

    // 5. Calculate Due Date if not explicitly provided
    let finalDueDate;
    if (dueDate) {
      finalDueDate = new Date(dueDate);
    } else {
      const issueDateObj = new Date(issueDate);
      const maxDays = settings.maxIssuePeriodDays || 14;
      finalDueDate = new Date(issueDateObj.getTime() + maxDays * 24 * 60 * 60 * 1000);
    }

    // 6. Generate unique issue number
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.floor(Math.random() * 900 + 100);
    const issueNumber = `ISS-${timestamp}-${random}`;

    // 7. Create Issue Transaction
    const bookIssue = await BookIssue.create({
      issueNumber,
      memberType,
      memberId: member._id,
      bookId: book._id,
      activeLoanKey: `${memberType}:${member._id}:${book._id}`,
      departmentId: book.departmentId?._id || memberDepartmentId,
      issueDate: new Date(issueDate),
      dueDate: finalDueDate,
      status: 'Issued',
      issuedBy: req.user?._id,
    });

    // 8. Decrement Book Available Quantity
    const inventoryUpdate = await Book.updateOne(
      { _id: book._id, availableQuantity: { $gt: 0 } },
      { $inc: { availableQuantity: -1 } }
    );
    if (!inventoryUpdate.modifiedCount) {
      await BookIssue.deleteOne({ _id: bookIssue._id });
      return res.status(409).json({ success: false, message: 'This book is currently unavailable.' });
    }
    await Book.updateOne(
      { _id: book._id, availableQuantity: 0 },
      { $set: { status: 'Unavailable' } }
    );

    if (reservedForMember) {
      const fulfilled = await Reservation.updateOne(
        { _id: reservedForMember._id, status: 'Ready for Pickup' },
        {
          $set: { status: 'Fulfilled', fulfilledIssueId: bookIssue._id },
          $unset: { activeReservationKey: 1 },
        }
      );
      if (!fulfilled.modifiedCount) {
        await BookIssue.deleteOne({ _id: bookIssue._id });
        await Book.updateOne(
          { _id: book._id, availableQuantity: { $lt: book.quantity } },
          { $inc: { availableQuantity: 1 }, $set: { status: 'Available' } }
        );
        return res.status(409).json({
          success: false,
          message: 'The reservation changed while the book was being issued. No issue was recorded; please retry.',
        });
      }
      await refreshReservationQueue(book._id);
    }

    // Mark associated approved request as Issued
    await BookRequest.updateMany(
      {
        bookId: book._id,
        memberId: member._id,
        status: { $in: ['Pending Approval', 'Approved'] },
      },
      {
        $set: {
          status: 'Issued',
          issuedAt: new Date(),
          issueId: bookIssue._id,
        },
      }
    );

    // Emit real-time WebSocket events
    emitEvent('book_updated', { bookId: book._id, availableQuantity: book.availableQuantity - 1 });
    emitEvent('issue_updated', { issueId: bookIssue._id, userId: member.userId, bookId: book._id, status: 'Issued' });
    emitEvent('request_updated', { userId: member.userId, bookId: book._id, status: 'Issued' });
    if (reservedForMember) {
      emitEvent('reservation_updated', {
        reservationId: reservedForMember.reservationId,
        userId: reservedForMember.userId,
        bookId: book._id,
        status: 'Fulfilled',
      });
    }

    // 9. Audit Log
    await logAudit({
      userId: req.user?._id,
      userName: req.user?.name,
      userRole: req.user?.role,
      action: 'Issue Book',
      description: `Issued "${book.title}" (${book.bookId}) to ${memberType} ${member.name} (${member.registerNumber || member.employeeId}). Due: ${finalDueDate.toLocaleDateString()}.`,
      req,
    });

    if (member.userId) {
      await createNotification({
        recipientId: member.userId,
        title: 'Book Issued Successfully',
        message: `You have borrowed "${book.title}". Return Due Date: ${finalDueDate.toLocaleDateString()}.`,
        type: 'success',
        link: '/dashboard',
      });
    }

    const populatedIssue = await BookIssue.findById(bookIssue._id)
      .populate('bookId', 'bookId title author isbn shelfNumber')
      .populate('departmentId', 'deptCode name')
      .populate('issuedBy', 'name');

    res.status(201).json({
      success: true,
      message: `Book "${book.title}" issued successfully to ${member.name}.`,
      data: populatedIssue,
    });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern?.activeLoanKey) {
      return res.status(409).json({ success: false, message: 'This member already has this book on loan.' });
    }
    next(error);
  }
};

// @desc   Get all issues with filters
// @route  GET /api/issues
// @access Private
export const getIssues = async (req, res, next) => {
  try {
    const {
      status,
      department,
      memberType,
      search,
      page = 1,
      limit = 50,
    } = req.query;

    const filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (memberType && memberType !== 'all') {
      filter.memberType = memberType;
    }

    if (department && department !== 'all') {
      filter.departmentId = department;
    }

    // Role-based scoping: If Student or Faculty is querying, only return their own issues!
    if (req.user?.role === 'student' && req.user?.memberRefId) {
      filter.memberType = 'Student';
      filter.memberId = req.user.memberRefId;
    } else if (req.user?.role === 'faculty' && req.user?.memberRefId) {
      filter.memberType = 'Faculty';
      filter.memberId = req.user.memberRefId;
    }

    if (search && search.trim()) {
      filter.$or = [
        { issueNumber: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [issues, total] = await Promise.all([
      BookIssue.find(filter)
        .populate('bookId', 'bookId title author isbn shelfNumber')
        .populate('departmentId', 'deptCode name')
        .populate('memberId')
        .populate('issuedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      BookIssue.countDocuments(filter),
    ]);

    // Check overdue on active issues
    const now = new Date();
    const enrichedIssues = issues.map((issue) => {
      let isOverdue = false;
      let overdueDays = 0;
      if (issue.status === 'Issued' && new Date(issue.dueDate) < now) {
        isOverdue = true;
        overdueDays = Math.ceil((now - new Date(issue.dueDate)) / (1000 * 60 * 60 * 24));
      }
      return {
        ...issue,
        isOverdue,
        overdueDays,
      };
    });

    res.json({
      success: true,
      count: enrichedIssues.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)) || 1,
      data: enrichedIssues,
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Get overdue issues across departments
// @route  GET /api/issues/overdue
// @access Private
export const getOverdueIssues = async (req, res, next) => {
  try {
    const { department } = req.query;
    const now = new Date();

    const filter = {
      status: { $in: ['Issued', 'Overdue'] },
      dueDate: { $lt: now },
    };

    if (department && department !== 'all') {
      filter.departmentId = department;
    }

    // Role scoping for students/faculty
    if (req.user?.role === 'student' && req.user?.memberRefId) {
      filter.memberType = 'Student';
      filter.memberId = req.user.memberRefId;
    } else if (req.user?.role === 'faculty' && req.user?.memberRefId) {
      filter.memberType = 'Faculty';
      filter.memberId = req.user.memberRefId;
    }

    const [settings, overdueIssues] = await Promise.all([
      Setting.findOne(),
      BookIssue.find(filter)
        .populate('bookId', 'bookId title author isbn shelfNumber')
        .populate('departmentId', 'deptCode name')
        .populate('memberId')
        .populate('issuedBy', 'name')
        .sort({ dueDate: 1 })
        .lean(),
    ]);

    const finePerDay = settings?.finePerDay || 2;

    const formattedOverdue = overdueIssues.map((issue) => {
      const daysOverdue = Math.max(1, Math.ceil((now - new Date(issue.dueDate)) / (1000 * 60 * 60 * 24)));
      const fineAmount = daysOverdue * finePerDay;

      return {
        ...issue,
        daysOverdue,
        finePerDay,
        fineAmount,
      };
    });

    res.json({
      success: true,
      count: formattedOverdue.length,
      data: formattedOverdue,
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Get single issue by ID
// @route  GET /api/issues/:id
// @access Private
export const getIssueById = async (req, res, next) => {
  try {
    const issue = await BookIssue.findById(req.params.id)
      .populate('bookId')
      .populate('departmentId', 'deptCode name')
      .populate('memberId')
      .populate('issuedBy', 'name email')
      .populate('returnDetails');

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue transaction not found.',
      });
    }

    res.json({
      success: true,
      data: issue,
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Borrow a book as the authenticated student or faculty member
// @route  POST /api/issues/request
// @access Student, Faculty
export const createBorrowRequest = async (req, res, next) => {
  try {
    const { bookId } = req.body;
    if (!['student', 'faculty'].includes(req.user?.role) || !req.user.memberRefId) {
      return res.status(403).json({ success: false, message: 'Only students and faculty can borrow books from the catalog.' });
    }
    if (!bookId) return res.status(400).json({ success: false, message: 'Book reference is required.' });

    const memberType = req.user.role === 'student' ? 'Student' : 'Faculty';
    const Member = memberType === 'Student' ? Student : Faculty;
    const member = await Member.findById(req.user.memberRefId);
    if (!member || member.status !== 'Active') {
      return res.status(400).json({ success: false, message: 'Your library membership is not active.' });
    }

    const [settings, book] = await Promise.all([
      Setting.findOne(),
      Book.findById(bookId).populate('departmentId', 'deptCode name'),
    ]);
    if (!book) return res.status(404).json({ success: false, message: 'Book not found.' });
    if (String(member.departmentId) !== String(book.departmentId?._id || book.departmentId)) {
      return res.status(403).json({ success: false, message: 'You can only borrow books from your department.' });
    }
    await refreshReservationQueue(book._id);
    if (book.availableQuantity <= 0) {
      return res.status(409).json({ success: false, message: 'This book is currently unavailable. Please reserve it instead.' });
    }

    const activeIssueFilter = {
      memberType,
      memberId: member._id,
      bookId: book._id,
      status: { $in: ['Issued', 'Overdue'] },
    };
    if (await BookIssue.findOne(activeIssueFilter)) {
      return res.status(409).json({ success: false, message: 'You already have this book on loan.' });
    }

    const memberReservation = await Reservation.findOne({
      userId: req.user._id,
      bookId: book._id,
      status: { $in: ['Pending', 'Ready for Pickup'] },
    });
    if (memberReservation?.status === 'Pending') {
      return res.status(409).json({ success: false, message: 'You already have a pending reservation for this book.' });
    }

    const readyReservations = await Reservation.find({ bookId: book._id, status: 'Ready for Pickup' });
    if (readyReservations.length && !readyReservations.some((reservation) => (
      String(reservation.userId) === String(req.user._id)
    ))) {
      return res.status(409).json({ success: false, message: 'This copy is reserved for another member.' });
    }

    const borrowingLimit = memberType === 'Student'
      ? settings?.studentBorrowingLimit || 3
      : settings?.facultyBorrowingLimit || 5;
    const activeLoansCount = await BookIssue.countDocuments({
      memberType,
      memberId: member._id,
      status: { $in: ['Issued', 'Overdue'] },
    });
    if (activeLoansCount >= borrowingLimit) {
      return res.status(400).json({ success: false, message: `You have reached your borrowing limit of ${borrowingLimit} books.` });
    }

    const issueDate = new Date();
    const maxDays = settings?.maxIssuePeriodDays || 14;
    const dueDate = new Date(issueDate.getTime() + maxDays * 24 * 60 * 60 * 1000);
    const issueNumber = `ISS-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;
    const issue = await BookIssue.create({
      issueNumber,
      memberType,
      memberId: member._id,
      bookId: book._id,
      activeLoanKey: `${memberType}:${member._id}:${book._id}`,
      departmentId: book.departmentId?._id || book.departmentId,
      issueDate,
      dueDate,
      status: 'Issued',
      issuedBy: req.user._id,
    });

    const inventoryUpdate = await Book.updateOne(
      { _id: book._id, availableQuantity: { $gt: 0 } },
      { $inc: { availableQuantity: -1 } }
    );
    if (!inventoryUpdate.modifiedCount) {
      await BookIssue.deleteOne({ _id: issue._id });
      return res.status(409).json({ success: false, message: 'This book is currently unavailable. Please reserve it instead.' });
    }

    await Book.updateOne(
      { _id: book._id, availableQuantity: 0 },
      { $set: { status: 'Unavailable' } }
    );
    await Book.updateOne(
      { _id: book._id, availableQuantity: { $gt: 0 }, status: 'Unavailable' },
      { $set: { status: 'Available' } }
    );

    if (memberReservation?.status === 'Ready for Pickup') {
      const fulfilled = await Reservation.updateOne(
        { _id: memberReservation._id, status: 'Ready for Pickup' },
        {
          $set: { status: 'Fulfilled', fulfilledIssueId: issue._id },
          $unset: { activeReservationKey: 1 },
        }
      );
      if (!fulfilled.modifiedCount) {
        await BookIssue.deleteOne({ _id: issue._id });
        await Book.updateOne(
          { _id: book._id, availableQuantity: { $lt: book.quantity } },
          { $inc: { availableQuantity: 1 }, $set: { status: 'Available' } }
        );
        return res.status(409).json({
          success: false,
          message: 'The reservation changed while the book was being issued. No issue was recorded; please retry.',
        });
      }
      await refreshReservationQueue(book._id);
    }

    emitEvent('book_updated', { bookId: book._id, availableQuantity: book.availableQuantity - 1 });
    emitEvent('issue_updated', {
      issueId: issue._id,
      userId: req.user._id,
      bookId: book._id,
      status: 'Issued',
    });
    if (memberReservation?.status === 'Ready for Pickup') {
      emitEvent('reservation_updated', {
        reservationId: memberReservation.reservationId,
        userId: req.user._id,
        bookId: book._id,
        status: 'Fulfilled',
      });
    }

    const data = await BookIssue.findById(issue._id)
      .populate('bookId', 'bookId title author isbn shelfNumber quantity availableQuantity price')
      .populate('departmentId', 'deptCode name');
    res.status(201).json({ success: true, message: `Book "${book.title}" borrowed successfully.`, data });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern?.activeLoanKey) {
      return res.status(409).json({ success: false, message: 'You already have this book on loan.' });
    }
    next(error);
  }
};
