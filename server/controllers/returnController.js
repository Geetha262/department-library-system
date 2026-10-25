import BookReturn from '../models/BookReturn.js';
import BookIssue from '../models/BookIssue.js';
import Book from '../models/Book.js';
import Student from '../models/Student.js';
import Faculty from '../models/Faculty.js';
import Fine from '../models/Fine.js';
import Setting from '../models/Setting.js';
import { refreshReservationQueue } from '../utils/reservationQueue.js';
import { logAudit } from '../utils/logger.js';
import { createNotification } from '../utils/notify.js';
import { emitEvent } from '../utils/socket.js';

const startOfDay = (date) => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
};

const overdueDaysBetween = (currentDate, dueDate) => Math.max(
  0,
  Math.floor((startOfDay(currentDate) - startOfDay(dueDate)) / (1000 * 60 * 60 * 24))
);

// @desc   Search active loan for return processing
// @route  GET /api/returns/search-loan
// @access Admin, Librarian
export const searchActiveLoan = async (req, res, next) => {
  try {
    const { query } = req.query;

    if (!query || !query.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a search term (Issue Number, Book ID, Register No, or Employee ID).',
      });
    }

    const q = query.trim().toUpperCase();

    // 1. Search by Issue Number directly
    let activeIssues = await BookIssue.find({
      issueNumber: q,
      status: { $in: ['Issued', 'Overdue'] },
    })
      .populate('bookId', 'bookId title author isbn shelfNumber')
      .populate('departmentId', 'deptCode name')
      .populate('memberId')
      .lean();

    // 2. If not found, search by Book ID / Accession No
    if (activeIssues.length === 0) {
      const book = await Book.findOne({ bookId: q });
      if (book) {
        activeIssues = await BookIssue.find({
          bookId: book._id,
          status: { $in: ['Issued', 'Overdue'] },
        })
          .populate('bookId', 'bookId title author isbn shelfNumber')
          .populate('departmentId', 'deptCode name')
          .populate('memberId')
          .lean();
      }
    }

    // 3. If not found, search by Student Register No
    if (activeIssues.length === 0) {
      const student = await Student.findOne({ registerNumber: q });
      if (student) {
        activeIssues = await BookIssue.find({
          memberType: 'Student',
          memberId: student._id,
          status: { $in: ['Issued', 'Overdue'] },
        })
          .populate('bookId', 'bookId title author isbn shelfNumber')
          .populate('departmentId', 'deptCode name')
          .populate('memberId')
          .lean();
      }
    }

    // 4. If not found, search by Faculty Employee ID
    if (activeIssues.length === 0) {
      const faculty = await Faculty.findOne({ employeeId: q });
      if (faculty) {
        activeIssues = await BookIssue.find({
          memberType: 'Faculty',
          memberId: faculty._id,
          status: { $in: ['Issued', 'Overdue'] },
        })
          .populate('bookId', 'bookId title author isbn shelfNumber')
          .populate('departmentId', 'deptCode name')
          .populate('memberId')
          .lean();
      }
    }

    if (activeIssues.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No active book loan found matching identifier "${query}".`,
      });
    }

    // Calculate dynamic fine estimates based on current system settings
    const settings = await Setting.findOne() || { finePerDay: 5 };
    const now = new Date();

    const results = activeIssues.map((issue) => {
      const dueDate = new Date(issue.dueDate);
      const isOverdue = startOfDay(now) > startOfDay(dueDate);
      const overdueDays = isOverdue ? overdueDaysBetween(now, dueDate) : 0;
      const fineAmount = overdueDays * (settings.finePerDay ?? 5);

      return {
        ...issue,
        returnDatePreview: now,
        isOverdue,
        overdueDays,
        finePerDay: settings.finePerDay ?? 5,
        fineAmount,
      };
    });

    res.json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Process Book Return
// @route  POST /api/returns
// @access Admin, Librarian
export const createReturn = async (req, res, next) => {
  try {
    const {
      issueId,
      returnDate = new Date(),
      remarks = 'Returned in good condition',
    } = req.body;

    if (!issueId) {
      return res.status(400).json({
        success: false,
        message: 'Issue transaction reference is required.',
      });
    }

    // 1. Fetch active issue
    const issue = await BookIssue.findById(issueId)
      .populate('bookId')
      .populate('departmentId', 'deptCode name')
      .populate('memberId');

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue transaction not found.',
      });
    }

    if (['student', 'faculty'].includes(req.user?.role)) {
      const expectedMemberType = req.user.role === 'student' ? 'Student' : 'Faculty';
      if (
        issue.memberType !== expectedMemberType
        || String(issue.memberId?._id || issue.memberId) !== String(req.user.memberRefId)
      ) {
        return res.status(403).json({ success: false, message: 'You can only return your own borrowed books.' });
      }
    }

    if (issue.status === 'Returned') {
      return res.status(400).json({
        success: false,
        message: 'This book has already been marked as returned.',
      });
    }

    // 2. Fetch System Settings for fine calculation
    let settings = await Setting.findOne();
    if (!settings) settings = await Setting.create({});

    const returnDateObj = new Date(returnDate);
    const dueDateObj = new Date(issue.dueDate);

    let overdueDays = 0;
    let fineAmount = 0;
    let fineRecord = null;

    // 3. Dynamic Fine Calculation
    if (startOfDay(returnDateObj) > startOfDay(dueDateObj)) {
      overdueDays = overdueDaysBetween(returnDateObj, dueDateObj);
      fineAmount = overdueDays * (settings.finePerDay || 2);

      fineRecord = await Fine.findOneAndUpdate(
        { issueId: issue._id },
        {
          $setOnInsert: {
            issueId: issue._id,
            memberType: issue.memberType,
            memberId: issue.memberId?._id || issue.memberId,
            bookId: issue.bookId?._id || issue.bookId,
            departmentId: issue.departmentId?._id || issue.departmentId,
            dueDate: dueDateObj,
          },
          $set: {
            returnDate: returnDateObj,
            overdueDays,
            fineAmount,
          },
        },
        { new: true, upsert: true }
      );
    }

    // 4. Create BookReturn record
    const bookReturn = await BookReturn.create({
      issueId: issue._id,
      bookId: issue.bookId?._id || issue.bookId,
      memberType: issue.memberType,
      memberId: issue.memberId?._id || issue.memberId,
      departmentId: issue.departmentId?._id || issue.departmentId,
      returnDate: returnDateObj,
      overdueDays,
      fineAmount,
      receivedBy: req.user?._id,
      remarks,
    });

    // Claim the active issue once so concurrent return requests cannot duplicate a return.
    const issueUpdate = await BookIssue.updateOne(
      { _id: issue._id, status: { $in: ['Issued', 'Overdue'] } },
      { $set: { status: 'Returned', returnDetails: bookReturn._id }, $unset: { activeLoanKey: 1 } }
    );
    if (!issueUpdate.modifiedCount) {
      await BookReturn.deleteOne({ _id: bookReturn._id });
      return res.status(409).json({ success: false, message: 'This book has already been marked as returned.' });
    }

    // Increment only when the returned copy will not exceed the catalog quantity.
    const book = await Book.findById(issue.bookId?._id || issue.bookId);
    if (book) {
      const inventoryUpdate = await Book.updateOne(
        { _id: book._id, availableQuantity: { $lt: book.quantity } },
        { $inc: { availableQuantity: 1 }, $set: { status: 'Available' } }
      );
      if (!inventoryUpdate.modifiedCount) {
        await BookIssue.updateOne(
          { _id: issue._id },
          {
            $set: {
              status: issue.status,
              returnDetails: null,
              activeLoanKey: `${issue.memberType}:${issue.memberId?._id || issue.memberId}:${issue.bookId?._id || issue.bookId}`,
            },
          }
        );
        await BookReturn.deleteOne({ _id: bookReturn._id });
        return res.status(409).json({ success: false, message: 'Book inventory is already at its recorded total.' });
      }

      await refreshReservationQueue(book._id);
      emitEvent('book_updated', { bookId: book._id });
    }

    // 7. Audit Log
    const memberName = issue.memberId?.name || 'Member';
    const memberIdString = issue.memberId?.registerNumber || issue.memberId?.employeeId || '';

    await logAudit({
      userId: req.user?._id,
      userName: req.user?.name,
      userRole: req.user?.role,
      action: 'Return Book',
      description: `Processed return for "${book?.title}" (${book?.bookId}) from ${issue.memberType} ${memberName} (${memberIdString}). Overdue: ${overdueDays} days. Fine: ₹${fineAmount}.`,
      req,
    });

    if (issue.memberId?.userId) {
      await createNotification({
        recipientId: issue.memberId.userId,
        title: 'Book Returned Successfully',
        message: `Your return for "${book?.title}" has been processed.`,
        type: 'success',
        link: '/dashboard',
      });

      if (fineAmount > 0) {
        await createNotification({
          recipientId: issue.memberId.userId,
          title: 'Fine Generated',
          message: `An overdue fine of ₹${fineAmount} (${overdueDays} days late) has been recorded for "${book?.title}". Please settle at the library desk.`,
          type: 'danger',
          link: '/fines',
        });
      }
    }

    res.status(201).json({
      success: true,
      message: `Book "${book?.title}" returned successfully.${overdueDays > 0 ? ` Overdue Fine: ₹${fineAmount} (${overdueDays} days @ ₹${settings.finePerDay}/day)` : ''}`,
      data: {
        returnRecord: bookReturn,
        fineRecord,
        overdueDays,
        fineAmount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Get all return transactions
// @route  GET /api/returns
// @access Private
export const getReturns = async (req, res, next) => {
  try {
    const { department, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (department && department !== 'all') {
      filter.departmentId = department;
    }

    // Role-based scoping for Student / Faculty
    if (req.user?.role === 'student' && req.user?.memberRefId) {
      filter.memberType = 'Student';
      filter.memberId = req.user.memberRefId;
    } else if (req.user?.role === 'faculty' && req.user?.memberRefId) {
      filter.memberType = 'Faculty';
      filter.memberId = req.user.memberRefId;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [returns, total] = await Promise.all([
      BookReturn.find(filter)
        .populate('bookId', 'bookId title author isbn')
        .populate('departmentId', 'deptCode name')
        .populate('memberId')
        .populate('receivedBy', 'name')
        .populate('issueId', 'issueNumber issueDate dueDate')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      BookReturn.countDocuments(filter),
    ]);

    res.json({
      success: true,
      count: returns.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)) || 1,
      data: returns,
    });
  } catch (error) {
    next(error);
  }
};
