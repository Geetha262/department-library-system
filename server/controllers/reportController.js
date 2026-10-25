import Department from '../models/Department.js';
import Book from '../models/Book.js';
import Student from '../models/Student.js';
import Faculty from '../models/Faculty.js';
import BookIssue from '../models/BookIssue.js';
import BookReturn from '../models/BookReturn.js';
import Fine from '../models/Fine.js';

// @desc   Dept-wise book inventory report
// @route  GET /api/reports/department-books
export const reportDeptBooks = async (req, res, next) => {
  try {
    const departments = await Department.find({ status: 'Active' }).lean();
    const rows = await Promise.all(departments.map(async (dept) => {
      const res = await Book.aggregate([
        { $match: { departmentId: dept._id } },
        { $group: { _id: null, totalQuantity: { $sum: '$quantity' }, availableQuantity: { $sum: '$availableQuantity' }, titles: { $sum: 1 } } }
      ]);
      const issuedCount = await BookIssue.countDocuments({ departmentId: dept._id, status: { $in: ['Issued', 'Overdue'] } });
      return {
        deptCode: dept.deptCode,
        name: dept.name,
        hodName: dept.hodName,
        totalTitles: res[0]?.titles || 0,
        totalCopies: res[0]?.totalQuantity || 0,
        available: res[0]?.availableQuantity || 0,
        issued: issuedCount,
      };
    }));
    res.json({ success: true, data: rows });
  } catch (error) { next(error); }
};

// @desc   Issue report
// @route  GET /api/reports/issues
export const reportIssues = async (req, res, next) => {
  try {
    const { department, startDate, endDate, memberType } = req.query;
    const filter = {};
    if (department && department !== 'all') filter.departmentId = department;
    if (memberType && memberType !== 'all') filter.memberType = memberType;
    if (startDate || endDate) {
      filter.issueDate = {};
      if (startDate) filter.issueDate.$gte = new Date(startDate);
      if (endDate) { const e = new Date(endDate); e.setHours(23,59,59); filter.issueDate.$lte = e; }
    }
    const issues = await BookIssue.find(filter)
      .populate('bookId', 'bookId title author isbn')
      .populate('departmentId', 'deptCode name')
      .populate('memberId')
      .populate('issuedBy', 'name')
      .sort({ issueDate: -1 })
      .limit(500)
      .lean();
    res.json({ success: true, count: issues.length, data: issues });
  } catch (error) { next(error); }
};

// @desc   Return report
// @route  GET /api/reports/returns
export const reportReturns = async (req, res, next) => {
  try {
    const { department, startDate, endDate } = req.query;
    const filter = {};
    if (department && department !== 'all') filter.departmentId = department;
    if (startDate || endDate) {
      filter.returnDate = {};
      if (startDate) filter.returnDate.$gte = new Date(startDate);
      if (endDate) { const e = new Date(endDate); e.setHours(23,59,59); filter.returnDate.$lte = e; }
    }
    const returns = await BookReturn.find(filter)
      .populate('bookId', 'bookId title author')
      .populate('departmentId', 'deptCode name')
      .populate('memberId')
      .populate('issueId', 'issueNumber issueDate dueDate')
      .sort({ returnDate: -1 })
      .limit(500)
      .lean();
    res.json({ success: true, count: returns.length, data: returns });
  } catch (error) { next(error); }
};

// @desc   Overdue report
// @route  GET /api/reports/overdue
export const reportOverdue = async (req, res, next) => {
  try {
    const { department } = req.query;
    const now = new Date();
    const filter = { status: { $in: ['Issued', 'Overdue'] }, dueDate: { $lt: now } };
    if (department && department !== 'all') filter.departmentId = department;
    const issues = await BookIssue.find(filter)
      .populate('bookId', 'bookId title author')
      .populate('departmentId', 'deptCode name')
      .populate('memberId')
      .sort({ dueDate: 1 })
      .lean();
    const finePerDay = (await import('../models/Setting.js').then(m => m.default.findOne()))?.finePerDay || 2;
    const data = issues.map(issue => {
      const days = Math.max(1, Math.ceil((now - new Date(issue.dueDate)) / 86400000));
      return { ...issue, daysOverdue: days, fineAmount: days * finePerDay };
    });
    res.json({ success: true, count: data.length, data });
  } catch (error) { next(error); }
};

// @desc   Fine report
// @route  GET /api/reports/fines
export const reportFines = async (req, res, next) => {
  try {
    const { department, paymentStatus } = req.query;
    const filter = {};
    if (department && department !== 'all') filter.departmentId = department;
    if (paymentStatus && paymentStatus !== 'all') filter.paymentStatus = paymentStatus;
    const fines = await Fine.find(filter)
      .populate('bookId', 'bookId title')
      .populate('departmentId', 'deptCode name')
      .populate('memberId')
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();
    const totalAmount = fines.reduce((s, f) => s + f.fineAmount, 0);
    const collectedAmount = fines.filter(f => f.paymentStatus === 'Paid').reduce((s, f) => s + f.fineAmount, 0);
    res.json({ success: true, count: fines.length, totalAmount, collectedAmount, data: fines });
  } catch (error) { next(error); }
};

// @desc   Dept-wise student report
// @route  GET /api/reports/department-students
export const reportDeptStudents = async (req, res, next) => {
  try {
    const departments = await Department.find({ status: 'Active' }).lean();
    const rows = await Promise.all(departments.map(async (dept) => {
      const [studentCount, facultyCount] = await Promise.all([
        Student.countDocuments({ departmentId: dept._id }),
        Faculty.countDocuments({ departmentId: dept._id }),
      ]);
      return { deptCode: dept.deptCode, name: dept.name, hodName: dept.hodName, studentCount, facultyCount };
    }));
    res.json({ success: true, data: rows });
  } catch (error) { next(error); }
};
