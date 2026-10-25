import Fine from '../models/Fine.js';
import BookIssue from '../models/BookIssue.js';
import Setting from '../models/Setting.js';
import { logAudit } from '../utils/logger.js';

// @desc   Get all fines with filters
// @route  GET /api/fines
// @access Private
export const getFines = async (req, res, next) => {
  try {
    const { paymentStatus, department, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (paymentStatus && paymentStatus !== 'all') {
      filter.paymentStatus = paymentStatus;
    }

    if (department && department !== 'all') {
      filter.departmentId = department;
    }

    // Role-based scoping: Students and Faculty view only their own fines
    if (req.user?.role === 'student' && req.user?.memberRefId) {
      filter.memberType = 'Student';
      filter.memberId = req.user.memberRefId;
    } else if (req.user?.role === 'faculty' && req.user?.memberRefId) {
      filter.memberType = 'Faculty';
      filter.memberId = req.user.memberRefId;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [fines, total, pendingSummary, paidSummary] = await Promise.all([
      Fine.find(filter)
        .populate('bookId', 'bookId title author')
        .populate('departmentId', 'deptCode name')
        .populate('memberId')
        .populate('issueId', 'issueNumber')
        .populate('receivedBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Fine.countDocuments(filter),
      // Aggregate pending fines
      Fine.aggregate([
        { $match: { ...filter, paymentStatus: { $in: ['Unpaid', 'Partially Paid', 'Pending'] } } },
        { $group: { _id: null, total: { $sum: '$fineAmount' }, count: { $sum: 1 } } },
      ]),
      // Aggregate paid fines
      Fine.aggregate([
        { $match: { ...filter, paymentStatus: 'Paid' } },
        { $group: { _id: null, total: { $sum: '$fineAmount' }, count: { $sum: 1 } } },
      ]),
    ]);

    let fineRows = fines.map((fine) => ({
      ...fine,
      paymentStatus: fine.paymentStatus === 'Pending' ? 'Unpaid' : fine.paymentStatus,
      paidAmount: fine.paidAmount || 0,
      remainingAmount: Math.max(0, fine.fineAmount - (fine.paidAmount || 0)),
    }));

    let responseTotal = total;
    let responseStats = {
      totalPendingAmount: pendingSummary[0]?.total || 0,
      pendingCount: pendingSummary[0]?.count || 0,
      totalPaidAmount: paidSummary[0]?.total || 0,
      paidCount: paidSummary[0]?.count || 0,
    };

    if (['student', 'faculty'].includes(req.user?.role) && req.user.memberRefId) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const [settings, activeIssues] = await Promise.all([
        Setting.findOne().lean(),
        BookIssue.find({
          memberType: req.user.role === 'student' ? 'Student' : 'Faculty',
          memberId: req.user.memberRefId,
          status: { $in: ['Issued', 'Overdue'] },
          dueDate: { $lt: todayStart },
        })
          .populate('bookId', 'bookId title author isbn')
          .populate('departmentId', 'deptCode name')
          .populate('memberId')
          .sort({ dueDate: 1 })
          .lean(),
      ]);
      const finePerDay = settings?.finePerDay ?? 5;
      const overdueRows = activeIssues.map((issue) => {
        const dueDate = new Date(issue.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        const overdueDays = Math.max(0, Math.floor((todayStart - dueDate) / (1000 * 60 * 60 * 24)));
        const fineAmount = overdueDays * finePerDay;
        return {
          _id: `accruing-${issue._id}`,
          issueId: { _id: issue._id, issueNumber: issue.issueNumber },
          bookId: issue.bookId,
          departmentId: issue.departmentId,
          memberId: issue.memberId,
          memberType: issue.memberType,
          dueDate: issue.dueDate,
          returnDate: null,
          overdueDays,
          finePerDay,
          fineAmount,
          paidAmount: 0,
          remainingAmount: fineAmount,
          paymentStatus: 'Unpaid',
          isAccruing: true,
        };
      });
      fineRows = [...fineRows, ...overdueRows];
      responseTotal += overdueRows.length;
      responseStats.totalPendingAmount += overdueRows.reduce((sum, row) => sum + row.remainingAmount, 0);
      responseStats.pendingCount += overdueRows.length;
    }

    res.json({
      success: true,
      count: fineRows.length,
      total: responseTotal,
      stats: responseStats,
      page: Number(page),
      pages: Math.ceil(responseTotal / Number(limit)) || 1,
      data: fineRows,
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Mark fine as paid
// @route  PUT /api/fines/:id/pay
// @access Admin, Librarian
export const payFine = async (req, res, next) => {
  try {
    const fine = await Fine.findById(req.params.id)
      .populate('bookId', 'title')
      .populate('memberId');

    if (!fine) {
      return res.status(404).json({
        success: false,
        message: 'Fine record not found.',
      });
    }

    const { amount, paymentMethod = 'Other', referenceNumber = '' } = req.body;
    const paymentAmount = Number(amount);
    const paidAmount = fine.paidAmount || 0;
    const remainingAmount = Math.max(0, fine.fineAmount - paidAmount);

    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Payment amount must be greater than zero.' });
    }

    if (paymentAmount > remainingAmount) {
      return res.status(400).json({ success: false, message: `Payment cannot exceed the remaining fine of ₹${remainingAmount}.` });
    }

    if (remainingAmount === 0) {
      return res.status(400).json({
        success: false,
        message: 'Fine has already been marked as paid.',
      });
    }

    fine.paidAmount = paidAmount + paymentAmount;
    fine.paymentStatus = fine.paidAmount >= fine.fineAmount ? 'Paid' : 'Partially Paid';
    fine.paymentDate = new Date();
    fine.paymentMethod = paymentMethod;
    fine.referenceNumber = referenceNumber.trim();
    fine.receivedBy = req.user?._id;
    await fine.save();

    const memberName = fine.memberId?.name || 'Member';

    await logAudit({
      userId: req.user?._id,
      userName: req.user?.name,
      userRole: req.user?.role,
      action: 'Fine Payment',
      description: `Collected payment of ₹${paymentAmount} from ${fine.memberType} ${memberName} for book "${fine.bookId?.title}".`,
      req,
    });

    res.json({
      success: true,
      message: `Payment of ₹${paymentAmount} recorded successfully.`,
      data: fine,
    });
  } catch (error) {
    next(error);
  }
};
