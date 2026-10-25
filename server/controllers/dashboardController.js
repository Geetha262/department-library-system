import Department from '../models/Department.js';
import Book from '../models/Book.js';
import Student from '../models/Student.js';
import Faculty from '../models/Faculty.js';
import BookIssue from '../models/BookIssue.js';
import BookReturn from '../models/BookReturn.js';
import Fine from '../models/Fine.js';
import Setting from '../models/Setting.js';

// @desc   Get full system dashboard stats
// @route  GET /api/dashboard/stats
// @access Private
export const getDashboardStats = async (req, res, next) => {
  try {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    // System-wide counts
    const [
      totalDepartments,
      totalBookTitles,
      totalStudents,
      totalFaculty,
      totalIssued,
      totalReturned,
      totalOverdue,
      totalPendingFines,
      settings,
    ] = await Promise.all([
      Department.countDocuments({ status: 'Active' }),
      Book.countDocuments(),
      Student.countDocuments({ status: 'Active' }),
      Faculty.countDocuments({ status: 'Active' }),
      BookIssue.countDocuments({ status: 'Issued' }),
      BookReturn.countDocuments(),
      BookIssue.countDocuments({ status: { $in: ['Issued', 'Overdue'] }, dueDate: { $lt: todayStart } }),
      Fine.aggregate([
        { $match: { paymentStatus: { $in: ['Unpaid', 'Partially Paid', 'Pending'] } } },
        { $project: { remaining: { $subtract: ['$fineAmount', { $ifNull: ['$paidAmount', 0] }] } } },
        { $group: { _id: null, total: { $sum: '$remaining' } } },
      ]),
      Setting.findOne(),
    ]);

    // Total book copies
    const bookCopyStats = await Book.aggregate([
      { $group: { _id: null, totalQuantity: { $sum: '$quantity' }, availableQuantity: { $sum: '$availableQuantity' } } }
    ]);
    const totalCopies = bookCopyStats[0]?.totalQuantity || 0;
    const availableCopies = bookCopyStats[0]?.availableQuantity || 0;

    // Department-wise stats for chart
    const departments = await Department.find({ status: 'Active' }).lean();
    const deptStats = await Promise.all(
      departments.map(async (dept) => {
        const [bookRes, studentCount, facultyCount, issuedCount] = await Promise.all([
          Book.aggregate([
            { $match: { departmentId: dept._id } },
            { $group: { _id: null, totalQuantity: { $sum: '$quantity' }, availableQuantity: { $sum: '$availableQuantity' }, titles: { $sum: 1 } } }
          ]),
          Student.countDocuments({ departmentId: dept._id, status: 'Active' }),
          Faculty.countDocuments({ departmentId: dept._id, status: 'Active' }),
          BookIssue.countDocuments({ departmentId: dept._id, status: { $in: ['Issued', 'Overdue'] } }),
        ]);
        const totalBooks = bookRes[0]?.totalQuantity || 0;
        const availableBooks = bookRes[0]?.availableQuantity || 0;
        return {
          deptCode: dept.deptCode,
          name: dept.name,
          totalBooks,
          availableBooks,
          issuedBooks: Math.max(0, totalBooks - availableBooks),
          studentCount,
          facultyCount,
          issuedCount,
        };
      })
    );

    // Monthly issue/return data for last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const [monthlyIssues, monthlyReturns] = await Promise.all([
      BookIssue.aggregate([
        { $match: { issueDate: { $gte: sixMonthsAgo } } },
        { $group: { _id: { year: { $year: '$issueDate' }, month: { $month: '$issueDate' } }, count: { $sum: 1 } } },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),
      BookReturn.aggregate([
        { $match: { returnDate: { $gte: sixMonthsAgo } } },
        { $group: { _id: { year: { $year: '$returnDate' }, month: { $month: '$returnDate' } }, count: { $sum: 1 } } },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ])
    ]);

    // Format monthly data into labels
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const issueEntry = monthlyIssues.find(e => e._id.year === year && e._id.month === month);
      const returnEntry = monthlyReturns.find(e => e._id.year === year && e._id.month === month);
      monthlyData.push({
        month: monthNames[month - 1],
        year,
        issues: issueEntry?.count || 0,
        returns: returnEntry?.count || 0,
      });
    }

    res.json({
      success: true,
      data: {
        summary: {
          totalDepartments,
          totalBookTitles,
          totalCopies,
          availableCopies,
          issuedCopies: Math.max(0, totalCopies - availableCopies),
          totalStudents,
          totalFaculty,
          totalIssued,
          totalReturned,
          totalOverdue,
          totalPendingFines: totalPendingFines[0]?.total || 0,
        },
        deptStats,
        monthlyData,
        settings: {
          finePerDay: settings?.finePerDay || 2,
          studentBorrowingLimit: settings?.studentBorrowingLimit || 3,
          facultyBorrowingLimit: settings?.facultyBorrowingLimit || 5,
          maxIssuePeriodDays: settings?.maxIssuePeriodDays || 14,
        }
      }
    });
  } catch (error) {
    next(error);
  }
};
