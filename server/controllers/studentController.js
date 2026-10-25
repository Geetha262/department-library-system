import Student from '../models/Student.js';
import User from '../models/User.js';
import Department from '../models/Department.js';
import BookIssue from '../models/BookIssue.js';
import Fine from '../models/Fine.js';
import { logAudit } from '../utils/logger.js';

// @desc   Get all students with search and filters
// @route  GET /api/students
// @access Admin, Librarian
export const getStudents = async (req, res, next) => {
  try {
    const { search, department, year, status, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (department && department !== 'all') {
      if (department.match(/^[0-9a-fA-F]{24}$/)) {
        filter.departmentId = department;
      } else {
        const dept = await Department.findOne({ deptCode: department.toUpperCase() });
        if (dept) filter.departmentId = dept._id;
      }
    }

    if (year && year !== 'all') {
      filter.year = parseInt(year, 10);
    }

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { registerNumber: { $regex: q, $options: 'i' } },
        { studentId: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [students, total] = await Promise.all([
      Student.find(filter)
        .populate('departmentId', 'deptCode name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Student.countDocuments(filter),
    ]);

    // Attach active loans count to each student
    const studentsWithLoans = await Promise.all(
      students.map(async (student) => {
        const activeLoansCount = await BookIssue.countDocuments({
          memberType: 'Student',
          memberId: student._id,
          status: { $in: ['Issued', 'Overdue'] },
        });
        return {
          ...student,
          activeLoansCount,
        };
      })
    );

    res.json({
      success: true,
      count: studentsWithLoans.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)) || 1,
      data: studentsWithLoans,
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Get single student by ID with borrowing history
// @route  GET /api/students/:id
// @access Private
export const getStudentById = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id).populate(
      'departmentId',
      'deptCode name hodName'
    );

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found.',
      });
    }

    // Fetch borrowing history
    const issues = await BookIssue.find({ memberType: 'Student', memberId: student._id })
      .populate('bookId', 'bookId title author isbn shelfNumber')
      .populate('departmentId', 'deptCode name')
      .populate('returnDetails')
      .sort({ createdAt: -1 });

    const activeIssues = issues.filter((i) => i.status === 'Issued' || i.status === 'Overdue');
    const returnedIssues = issues.filter((i) => i.status === 'Returned');

    // Fetch pending fines
    const fines = await Fine.find({
      memberType: 'Student',
      memberId: student._id,
      paymentStatus: { $in: ['Unpaid', 'Partially Paid', 'Pending'] },
    });
    const totalPendingFine = fines.reduce((sum, f) => sum + Math.max(0, f.fineAmount - (f.paidAmount || 0)), 0);

    res.json({
      success: true,
      data: {
        ...student.toObject(),
        activeIssues,
        returnedIssues,
        totalPendingFine,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Create student and linked user account
// @route  POST /api/students
// @access Admin, Librarian
export const createStudent = async (req, res, next) => {
  try {
    const {
      studentId,
      registerNumber,
      name,
      email,
      phone,
      departmentId,
      year,
      section,
      address,
      status,
      password,
    } = req.body;

    if (!registerNumber || !name || !email || !phone || !departmentId || !year || !section) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all mandatory fields: Register Number, Name, Email, Phone, Department, Year, Section.',
      });
    }

    const cleanRegNo = registerNumber.trim().toUpperCase();
    const cleanEmail = email.trim().toLowerCase();
    const cleanStudentId = studentId ? studentId.trim().toUpperCase() : `STU-${cleanRegNo}`;

    // Uniqueness checks
    const [existingReg, existingEmail, existingId] = await Promise.all([
      Student.findOne({ registerNumber: cleanRegNo }),
      Student.findOne({ email: cleanEmail }),
      Student.findOne({ studentId: cleanStudentId }),
    ]);

    if (existingReg) {
      return res.status(400).json({
        success: false,
        message: `Student with Register Number "${cleanRegNo}" already exists.`,
      });
    }

    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: `Student with Email "${cleanEmail}" already exists.`,
      });
    }

    if (existingId) {
      return res.status(400).json({
        success: false,
        message: `Student ID "${cleanStudentId}" is already taken.`,
      });
    }

    // Verify Department exists
    const dept = await Department.findById(departmentId);
    if (!dept) {
      return res.status(400).json({
        success: false,
        message: 'Selected department does not exist.',
      });
    }

    // Create student record
    const student = new Student({
      studentId: cleanStudentId,
      registerNumber: cleanRegNo,
      name: name.trim(),
      email: cleanEmail,
      phone: phone.trim(),
      departmentId,
      year: parseInt(year, 10),
      section: section.trim().toUpperCase(),
      address: address ? address.trim() : '',
      status: status || 'Active',
    });

    // Create linked login account for student
    let user = await User.findOne({ email: cleanEmail });
    if (!user) {
      user = new User({
        name: student.name,
        email: student.email,
        password: password || 'student123', // default student password
        role: 'student',
        departmentId: student.departmentId,
        memberRefId: student._id,
        memberModel: 'Student',
        status: student.status === 'Active' ? 'Active' : 'Inactive',
      });
      await user.save();
    }

    student.userId = user._id;
    await student.save();

    await logAudit({
      userId: req.user?._id,
      userName: req.user?.name,
      userRole: req.user?.role,
      action: 'Create Student',
      description: `Enrolled student ${student.name} (${student.registerNumber}) in ${dept.deptCode} department.`,
      req,
    });

    const populated = await Student.findById(student._id).populate('departmentId', 'deptCode name');

    res.status(201).json({
      success: true,
      message: `Student "${student.name}" registered successfully.`,
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Update student
// @route  PUT /api/students/:id
// @access Admin, Librarian
export const updateStudent = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found.',
      });
    }

    const {
      registerNumber,
      name,
      email,
      phone,
      departmentId,
      year,
      section,
      address,
      status,
    } = req.body;

    if (registerNumber && registerNumber.trim().toUpperCase() !== student.registerNumber) {
      const existing = await Student.findOne({ registerNumber: registerNumber.trim().toUpperCase() });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Register Number "${registerNumber.trim().toUpperCase()}" is already assigned.`,
        });
      }
      student.registerNumber = registerNumber.trim().toUpperCase();
    }

    if (email && email.trim().toLowerCase() !== student.email) {
      const existing = await Student.findOne({ email: email.trim().toLowerCase() });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Email "${email.trim().toLowerCase()}" is already registered.`,
        });
      }
      student.email = email.trim().toLowerCase();
    }

    if (departmentId && departmentId !== String(student.departmentId)) {
      const dept = await Department.findById(departmentId);
      if (!dept) {
        return res.status(400).json({
          success: false,
          message: 'Selected department does not exist.',
        });
      }
      student.departmentId = departmentId;
    }

    if (name) student.name = name.trim();
    if (phone) student.phone = phone.trim();
    if (year) student.year = parseInt(year, 10);
    if (section) student.section = section.trim().toUpperCase();
    if (address !== undefined) student.address = address.trim();
    if (status) student.status = status;

    await student.save();

    // Sync with linked User
    if (student.userId) {
      await User.findByIdAndUpdate(student.userId, {
        name: student.name,
        email: student.email,
        departmentId: student.departmentId,
        status: student.status === 'Active' ? 'Active' : 'Inactive',
      });
    }

    await logAudit({
      userId: req.user?._id,
      userName: req.user?.name,
      userRole: req.user?.role,
      action: 'Update Student',
      description: `Updated student record for ${student.name} (${student.registerNumber}).`,
      req,
    });

    const populated = await Student.findById(student._id).populate('departmentId', 'deptCode name');

    res.json({
      success: true,
      message: 'Student updated successfully.',
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Delete student
// @route  DELETE /api/students/:id
// @access Admin only
export const deleteStudent = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found.',
      });
    }

    // Safety checks: Active loans or unpaid fines
    const activeLoans = await BookIssue.countDocuments({
      memberType: 'Student',
      memberId: student._id,
      status: { $in: ['Issued', 'Overdue'] },
    });

    if (activeLoans > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete student. Student has ${activeLoans} active book loan(s) that must be returned first.`,
      });
    }

    const pendingFines = await Fine.countDocuments({
      memberType: 'Student',
      memberId: student._id,
      paymentStatus: { $in: ['Unpaid', 'Partially Paid', 'Pending'] },
    });

    if (pendingFines > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete student. Student has ${pendingFines} unpaid fine(s). Clear fines before deleting.`,
      });
    }

    // Delete linked User
    if (student.userId) {
      await User.findByIdAndDelete(student.userId);
    }

    await student.deleteOne();

    await logAudit({
      userId: req.user?._id,
      userName: req.user?.name,
      userRole: req.user?.role,
      action: 'Delete Student',
      description: `Deleted student ${student.name} (${student.registerNumber}).`,
      req,
    });

    res.json({
      success: true,
      message: `Student "${student.name}" deleted successfully.`,
    });
  } catch (error) {
    next(error);
  }
};
