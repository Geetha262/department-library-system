import Faculty from '../models/Faculty.js';
import User from '../models/User.js';
import Department from '../models/Department.js';
import BookIssue from '../models/BookIssue.js';
import Fine from '../models/Fine.js';
import { logAudit } from '../utils/logger.js';

// @desc   Get all faculty with search and filters
// @route  GET /api/faculty
// @access Admin, Librarian
export const getFaculty = async (req, res, next) => {
  try {
    const { search, department, status, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (department && department !== 'all') {
      if (department.match(/^[0-9a-fA-F]{24}$/)) {
        filter.departmentId = department;
      } else {
        const dept = await Department.findOne({ deptCode: department.toUpperCase() });
        if (dept) filter.departmentId = dept._id;
      }
    }

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { employeeId: { $regex: q, $options: 'i' } },
        { facultyId: { $regex: q, $options: 'i' } },
        { designation: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [facultyList, total] = await Promise.all([
      Faculty.find(filter)
        .populate('departmentId', 'deptCode name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Faculty.countDocuments(filter),
    ]);

    // Attach active loans count to each faculty member
    const facultyWithLoans = await Promise.all(
      facultyList.map(async (faculty) => {
        const activeLoansCount = await BookIssue.countDocuments({
          memberType: 'Faculty',
          memberId: faculty._id,
          status: { $in: ['Issued', 'Overdue'] },
        });
        return {
          ...faculty,
          activeLoansCount,
        };
      })
    );

    res.json({
      success: true,
      count: facultyWithLoans.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)) || 1,
      data: facultyWithLoans,
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Get single faculty by ID with borrowing history
// @route  GET /api/faculty/:id
// @access Private
export const getFacultyById = async (req, res, next) => {
  try {
    const faculty = await Faculty.findById(req.params.id).populate(
      'departmentId',
      'deptCode name hodName'
    );

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: 'Faculty member not found.',
      });
    }

    // Fetch borrowing history
    const issues = await BookIssue.find({ memberType: 'Faculty', memberId: faculty._id })
      .populate('bookId', 'bookId title author isbn shelfNumber')
      .populate('departmentId', 'deptCode name')
      .populate('returnDetails')
      .sort({ createdAt: -1 });

    const activeIssues = issues.filter((i) => i.status === 'Issued' || i.status === 'Overdue');
    const returnedIssues = issues.filter((i) => i.status === 'Returned');

    // Fetch pending fines
    const fines = await Fine.find({
      memberType: 'Faculty',
      memberId: faculty._id,
      paymentStatus: { $in: ['Unpaid', 'Partially Paid', 'Pending'] },
    });
    const totalPendingFine = fines.reduce((sum, f) => sum + Math.max(0, f.fineAmount - (f.paidAmount || 0)), 0);

    res.json({
      success: true,
      data: {
        ...faculty.toObject(),
        activeIssues,
        returnedIssues,
        totalPendingFine,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Create faculty and linked user account
// @route  POST /api/faculty
// @access Admin, Librarian
export const createFaculty = async (req, res, next) => {
  try {
    const {
      facultyId,
      employeeId,
      name,
      email,
      phone,
      departmentId,
      designation,
      status,
      password,
    } = req.body;

    if (!employeeId || !name || !email || !phone || !departmentId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide Employee ID, Name, Email, Phone, and Department.',
      });
    }

    const cleanEmpId = employeeId.trim().toUpperCase();
    const cleanEmail = email.trim().toLowerCase();
    const cleanFacultyId = facultyId ? facultyId.trim().toUpperCase() : `FAC-${cleanEmpId}`;

    // Uniqueness checks
    const [existingEmp, existingEmail, existingId] = await Promise.all([
      Faculty.findOne({ employeeId: cleanEmpId }),
      Faculty.findOne({ email: cleanEmail }),
      Faculty.findOne({ facultyId: cleanFacultyId }),
    ]);

    if (existingEmp) {
      return res.status(400).json({
        success: false,
        message: `Faculty with Employee ID "${cleanEmpId}" already exists.`,
      });
    }

    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: `Faculty with Email "${cleanEmail}" already exists.`,
      });
    }

    if (existingId) {
      return res.status(400).json({
        success: false,
        message: `Faculty ID "${cleanFacultyId}" is already taken.`,
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

    // Create faculty record
    const faculty = new Faculty({
      facultyId: cleanFacultyId,
      employeeId: cleanEmpId,
      name: name.trim(),
      email: cleanEmail,
      phone: phone.trim(),
      departmentId,
      designation: designation?.trim() || 'Assistant Professor',
      status: status || 'Active',
    });

    // Create linked login account for faculty
    let user = await User.findOne({ email: cleanEmail });
    if (!user) {
      user = new User({
        name: faculty.name,
        email: faculty.email,
        password: password || 'faculty123', // default faculty password
        role: 'faculty',
        departmentId: faculty.departmentId,
        memberRefId: faculty._id,
        memberModel: 'Faculty',
        status: faculty.status === 'Active' ? 'Active' : 'Inactive',
      });
      await user.save();
    }

    faculty.userId = user._id;
    await faculty.save();

    await logAudit({
      userId: req.user?._id,
      userName: req.user?.name,
      userRole: req.user?.role,
      action: 'Create Faculty',
      description: `Registered faculty ${faculty.name} (${faculty.employeeId}) in ${dept.deptCode} department.`,
      req,
    });

    const populated = await Faculty.findById(faculty._id).populate('departmentId', 'deptCode name');

    res.status(201).json({
      success: true,
      message: `Faculty "${faculty.name}" registered successfully.`,
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Update faculty
// @route  PUT /api/faculty/:id
// @access Admin, Librarian
export const updateFaculty = async (req, res, next) => {
  try {
    const faculty = await Faculty.findById(req.params.id);

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: 'Faculty member not found.',
      });
    }

    const {
      employeeId,
      name,
      email,
      phone,
      departmentId,
      designation,
      status,
    } = req.body;

    if (employeeId && employeeId.trim().toUpperCase() !== faculty.employeeId) {
      const existing = await Faculty.findOne({ employeeId: employeeId.trim().toUpperCase() });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Employee ID "${employeeId.trim().toUpperCase()}" is already in use.`,
        });
      }
      faculty.employeeId = employeeId.trim().toUpperCase();
    }

    if (email && email.trim().toLowerCase() !== faculty.email) {
      const existing = await Faculty.findOne({ email: email.trim().toLowerCase() });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Email "${email.trim().toLowerCase()}" is already registered.`,
        });
      }
      faculty.email = email.trim().toLowerCase();
    }

    if (departmentId && departmentId !== String(faculty.departmentId)) {
      const dept = await Department.findById(departmentId);
      if (!dept) {
        return res.status(400).json({
          success: false,
          message: 'Selected department does not exist.',
        });
      }
      faculty.departmentId = departmentId;
    }

    if (name) faculty.name = name.trim();
    if (phone) faculty.phone = phone.trim();
    if (designation) faculty.designation = designation.trim();
    if (status) faculty.status = status;

    await faculty.save();

    // Sync with linked User
    if (faculty.userId) {
      await User.findByIdAndUpdate(faculty.userId, {
        name: faculty.name,
        email: faculty.email,
        departmentId: faculty.departmentId,
        status: faculty.status === 'Active' ? 'Active' : 'Inactive',
      });
    }

    await logAudit({
      userId: req.user?._id,
      userName: req.user?.name,
      userRole: req.user?.role,
      action: 'Update Faculty',
      description: `Updated faculty record for ${faculty.name} (${faculty.employeeId}).`,
      req,
    });

    const populated = await Faculty.findById(faculty._id).populate('departmentId', 'deptCode name');

    res.json({
      success: true,
      message: 'Faculty updated successfully.',
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Delete faculty
// @route  DELETE /api/faculty/:id
// @access Admin only
export const deleteFaculty = async (req, res, next) => {
  try {
    const faculty = await Faculty.findById(req.params.id);

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: 'Faculty member not found.',
      });
    }

    // Safety checks: Active loans or unpaid fines
    const activeLoans = await BookIssue.countDocuments({
      memberType: 'Faculty',
      memberId: faculty._id,
      status: { $in: ['Issued', 'Overdue'] },
    });

    if (activeLoans > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete faculty member. Member has ${activeLoans} active book loan(s) that must be returned first.`,
      });
    }

    const pendingFines = await Fine.countDocuments({
      memberType: 'Faculty',
      memberId: faculty._id,
      paymentStatus: 'Pending',
    });

    if (pendingFines > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete faculty member. Member has ${pendingFines} unpaid fine(s). Clear fines before deleting.`,
      });
    }

    // Delete linked User
    if (faculty.userId) {
      await User.findByIdAndDelete(faculty.userId);
    }

    await faculty.deleteOne();

    await logAudit({
      userId: req.user?._id,
      userName: req.user?.name,
      userRole: req.user?.role,
      action: 'Delete Faculty',
      description: `Deleted faculty ${faculty.name} (${faculty.employeeId}).`,
      req,
    });

    res.json({
      success: true,
      message: `Faculty member "${faculty.name}" deleted successfully.`,
    });
  } catch (error) {
    next(error);
  }
};
