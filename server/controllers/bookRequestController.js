import BookRequest from '../models/BookRequest.js';
import Book from '../models/Book.js';
import Student from '../models/Student.js';
import Faculty from '../models/Faculty.js';
import BookIssue from '../models/BookIssue.js';
import Setting from '../models/Setting.js';
import { logAudit } from '../utils/logger.js';
import { createNotification } from '../utils/notify.js';
import { emitEvent } from '../utils/socket.js';

// @desc   Create a book request (Student/Faculty)
// @route  POST /api/book-requests
// @access Student, Faculty
export const createBookRequest = async (req, res, next) => {
  try {
    const { bookId } = req.body;

    if (!['student', 'faculty'].includes(req.user?.role) || !req.user.memberRefId) {
      return res.status(403).json({
        success: false,
        message: 'Only students and faculty members can submit book requests.',
      });
    }

    if (!bookId) {
      return res.status(400).json({
        success: false,
        message: 'Book ID reference is required.',
      });
    }

    const memberType = req.user.role === 'student' ? 'Student' : 'Faculty';
    const MemberModel = memberType === 'Student' ? Student : Faculty;
    const member = await MemberModel.findById(req.user.memberRefId);

    if (!member || member.status !== 'Active') {
      return res.status(400).json({
        success: false,
        message: 'Your library membership account is not active.',
      });
    }

    const book = await Book.findById(bookId).populate('departmentId', 'deptCode name');
    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found.',
      });
    }

    if (book.availableQuantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'This book is currently out of stock. Please use "Reserve Book" instead.',
      });
    }

    // Check duplicate active request
    const existingRequest = await BookRequest.findOne({
      userId: req.user._id,
      bookId: book._id,
      status: { $in: ['Pending Approval', 'Approved'] },
    });

    if (existingRequest) {
      return res.status(409).json({
        success: false,
        message: `You already have an active request (${existingRequest.status}) for "${book.title}".`,
      });
    }

    // Check duplicate active issue
    const existingIssue = await BookIssue.findOne({
      memberType,
      memberId: member._id,
      bookId: book._id,
      status: { $in: ['Issued', 'Overdue'] },
    });

    if (existingIssue) {
      return res.status(409).json({
        success: false,
        message: `You already currently have "${book.title}" issued on loan.`,
      });
    }

    // Check limit
    const settings = (await Setting.findOne()) || {};
    const limit = memberType === 'Student'
      ? settings.studentBorrowingLimit || 3
      : settings.facultyBorrowingLimit || 5;

    const activeIssuesCount = await BookIssue.countDocuments({
      memberType,
      memberId: member._id,
      status: { $in: ['Issued', 'Overdue'] },
    });

    const activeRequestsCount = await BookRequest.countDocuments({
      userId: req.user._id,
      status: { $in: ['Pending Approval', 'Approved'] },
    });

    if (activeIssuesCount + activeRequestsCount >= limit) {
      return res.status(400).json({
        success: false,
        message: `Borrowing limit reached. You can hold or request up to ${limit} books at a time.`,
      });
    }

    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.floor(Math.random() * 900 + 100);
    const requestId = `REQ-${timestamp}-${random}`;

    const request = await BookRequest.create({
      requestId,
      userId: req.user._id,
      memberType,
      memberId: member._id,
      bookId: book._id,
      departmentId: book.departmentId?._id || member.departmentId,
      status: 'Pending Approval',
    });

    const populatedRequest = await BookRequest.findById(request._id)
      .populate('bookId', 'bookId title author isbn availableQuantity quantity price departmentId')
      .populate('departmentId', 'deptCode name')
      .populate('userId', 'name email role');

    // Notify staff
    await createNotification({
      targetRole: 'all',
      title: 'New Book Request Pending',
      message: `${req.user.name} requested "${book.title}". Approval required.`,
      type: 'info',
      link: '/issues',
    });

    // Real-time broadcast
    emitEvent('request_updated', {
      requestId: request.requestId,
      userId: req.user._id,
      bookId: book._id,
      status: 'Pending Approval',
      request: populatedRequest,
    });
    emitEvent('book_updated', { bookId: book._id });

    res.status(201).json({
      success: true,
      message: `Request for "${book.title}" submitted successfully. Awaiting librarian approval.`,
      data: populatedRequest,
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Get logged-in user's requests
// @route  GET /api/book-requests/my
// @access Student, Faculty
export const getMyBookRequests = async (req, res, next) => {
  try {
    const requests = await BookRequest.find({ userId: req.user._id })
      .populate('bookId', 'bookId title author isbn availableQuantity quantity price departmentId')
      .populate('departmentId', 'deptCode name')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: requests.length,
      data: requests,
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Get all book requests with filters
// @route  GET /api/book-requests
// @access Admin, Librarian
export const getBookRequests = async (req, res, next) => {
  try {
    const { status, department, search, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (department && department !== 'all') {
      filter.departmentId = department;
    }

    if (search && search.trim()) {
      filter.$or = [
        { requestId: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [requests, total] = await Promise.all([
      BookRequest.find(filter)
        .populate('bookId', 'bookId title author isbn shelfNumber availableQuantity')
        .populate('departmentId', 'deptCode name')
        .populate('memberId')
        .populate('userId', 'name email role')
        .populate('approvedBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      BookRequest.countDocuments(filter),
    ]);

    res.json({
      success: true,
      count: requests.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)) || 1,
      data: requests,
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Approve a book request
// @route  PUT /api/book-requests/:id/approve
// @access Admin, Librarian
export const approveBookRequest = async (req, res, next) => {
  try {
    const request = await BookRequest.findById(req.params.id)
      .populate('bookId', 'title bookId availableQuantity')
      .populate('userId', 'name email');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Book request not found.',
      });
    }

    if (request.status !== 'Pending Approval') {
      return res.status(400).json({
        success: false,
        message: `Request cannot be approved because current status is "${request.status}".`,
      });
    }

    if (request.bookId.availableQuantity <= 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot approve request: Book "${request.bookId.title}" is out of stock.`,
      });
    }

    request.status = 'Approved';
    request.approvedAt = new Date();
    request.approvedBy = req.user._id;
    await request.save();

    await logAudit({
      userId: req.user?._id,
      userName: req.user?.name,
      userRole: req.user?.role,
      action: 'Approve Book Request',
      description: `Approved request ${request.requestId} for "${request.bookId?.title}" by ${request.userId?.name}.`,
      req,
    });

    await createNotification({
      recipientId: request.userId._id,
      title: 'Book Request Approved!',
      message: `Your request for "${request.bookId?.title}" has been approved. You can collect/issue it now.`,
      type: 'success',
      link: '/my-books',
    });

    emitEvent('request_updated', {
      requestId: request.requestId,
      userId: request.userId._id,
      bookId: request.bookId._id,
      status: 'Approved',
      request,
    });
    emitEvent('book_updated', { bookId: request.bookId._id });

    res.json({
      success: true,
      message: `Book request ${request.requestId} approved successfully.`,
      data: request,
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Reject a book request
// @route  PUT /api/book-requests/:id/reject
// @access Admin, Librarian
export const rejectBookRequest = async (req, res, next) => {
  try {
    const { reason = 'Request rejected by library administration' } = req.body;
    const request = await BookRequest.findById(req.params.id)
      .populate('bookId', 'title bookId')
      .populate('userId', 'name email');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Book request not found.',
      });
    }

    if (request.status !== 'Pending Approval') {
      return res.status(400).json({
        success: false,
        message: `Request cannot be rejected because current status is "${request.status}".`,
      });
    }

    request.status = 'Rejected';
    request.rejectedAt = new Date();
    request.approvedBy = req.user._id;
    request.rejectionReason = reason;
    await request.save();

    await logAudit({
      userId: req.user?._id,
      userName: req.user?.name,
      userRole: req.user?.role,
      action: 'Reject Book Request',
      description: `Rejected request ${request.requestId} for "${request.bookId?.title}" by ${request.userId?.name}. Reason: ${reason}`,
      req,
    });

    await createNotification({
      recipientId: request.userId._id,
      title: 'Book Request Declined',
      message: `Your request for "${request.bookId?.title}" was declined: ${reason}`,
      type: 'danger',
      link: '/my-books',
    });

    emitEvent('request_updated', {
      requestId: request.requestId,
      userId: request.userId._id,
      bookId: request.bookId._id,
      status: 'Rejected',
      request,
    });

    res.json({
      success: true,
      message: `Book request ${request.requestId} rejected.`,
      data: request,
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Cancel request (Student)
// @route  DELETE /api/book-requests/:id
// @access Student, Faculty
export const cancelBookRequest = async (req, res, next) => {
  try {
    const request = await BookRequest.findOne({
      _id: req.params.id,
      userId: req.user._id,
      status: { $in: ['Pending Approval', 'Approved'] },
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Active request not found.',
      });
    }

    request.status = 'Cancelled';
    await request.save();

    emitEvent('request_updated', {
      requestId: request.requestId,
      userId: req.user._id,
      bookId: request.bookId,
      status: 'Cancelled',
    });

    res.json({
      success: true,
      message: 'Book request cancelled successfully.',
    });
  } catch (error) {
    next(error);
  }
};
