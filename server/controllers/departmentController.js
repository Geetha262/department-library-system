import Department from '../models/Department.js';
import Book from '../models/Book.js';
import Student from '../models/Student.js';
import Faculty from '../models/Faculty.js';
import BookIssue from '../models/BookIssue.js';
import { logAudit } from '../utils/logger.js';

// @desc   Get all departments with calculated statistics
// @route  GET /api/departments
// @access Private/Public
export const getDepartments = async (req, res, next) => {
  try {
    const { search, status } = req.query;
    const filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        { deptCode: { $regex: search.trim(), $options: 'i' } },
        { name: { $regex: search.trim(), $options: 'i' } },
        { hodName: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const departments = await Department.find(filter).sort({ deptCode: 1 }).lean();

    // Calculate dynamic stats for each department
    const departmentsWithStats = await Promise.all(
      departments.map(async (dept) => {
        // Aggregate books metrics
        const bookStats = await Book.aggregate([
          { $match: { departmentId: dept._id } },
          {
            $group: {
              _id: null,
              totalQuantity: { $sum: '$quantity' },
              availableQuantity: { $sum: '$availableQuantity' },
              totalTitles: { $sum: 1 },
            },
          },
        ]);

        const totalBooks = bookStats[0]?.totalQuantity || 0;
        const availableBooks = bookStats[0]?.availableQuantity || 0;
        const issuedBooks = Math.max(0, totalBooks - availableBooks);
        const bookTitles = bookStats[0]?.totalTitles || 0;

        // Student and faculty counts
        const [studentCount, facultyCount] = await Promise.all([
          Student.countDocuments({ departmentId: dept._id, status: 'Active' }),
          Faculty.countDocuments({ departmentId: dept._id, status: 'Active' }),
        ]);

        return {
          ...dept,
          stats: {
            totalTitles: bookTitles,
            totalBooks,
            availableBooks,
            issuedBooks,
            studentCount,
            facultyCount,
          },
        };
      })
    );

    res.json({
      success: true,
      count: departmentsWithStats.length,
      data: departmentsWithStats,
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Get single department by ID with stats
// @route  GET /api/departments/:id
// @access Private/Public
export const getDepartmentById = async (req, res, next) => {
  try {
    const dept = await Department.findById(req.params.id).lean();

    if (!dept) {
      return res.status(404).json({
        success: false,
        message: 'Department not found.',
      });
    }

    const bookStats = await Book.aggregate([
      { $match: { departmentId: dept._id } },
      {
        $group: {
          _id: null,
          totalQuantity: { $sum: '$quantity' },
          availableQuantity: { $sum: '$availableQuantity' },
          totalTitles: { $sum: 1 },
        },
      },
    ]);

    const totalBooks = bookStats[0]?.totalQuantity || 0;
    const availableBooks = bookStats[0]?.availableQuantity || 0;
    const issuedBooks = Math.max(0, totalBooks - availableBooks);
    const bookTitles = bookStats[0]?.totalTitles || 0;

    const [studentCount, facultyCount] = await Promise.all([
      Student.countDocuments({ departmentId: dept._id }),
      Faculty.countDocuments({ departmentId: dept._id }),
    ]);

    res.json({
      success: true,
      data: {
        ...dept,
        stats: {
          totalTitles: bookTitles,
          totalBooks,
          availableBooks,
          issuedBooks,
          studentCount,
          facultyCount,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Create new department
// @route  POST /api/departments
// @access Admin only
export const createDepartment = async (req, res, next) => {
  try {
    const { deptCode, name, hodName, description, status } = req.body;

    if (!deptCode || !name || !hodName) {
      return res.status(400).json({
        success: false,
        message: 'Please provide Department Code, Department Name, and HOD Name.',
      });
    }

    const cleanCode = deptCode.trim().toUpperCase();
    const existing = await Department.findOne({ deptCode: cleanCode });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Department with code "${cleanCode}" already exists.`,
      });
    }

    const department = await Department.create({
      deptCode: cleanCode,
      name: name.trim(),
      hodName: hodName.trim(),
      description: description ? description.trim() : '',
      status: status || 'Active',
    });

    await logAudit({
      userId: req.user?._id,
      userName: req.user?.name,
      userRole: req.user?.role,
      action: 'Create Department',
      description: `Created department ${department.deptCode} - ${department.name}.`,
      req,
    });

    res.status(201).json({
      success: true,
      message: `Department ${department.deptCode} created successfully.`,
      data: department,
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Update department
// @route  PUT /api/departments/:id
// @access Admin only
export const updateDepartment = async (req, res, next) => {
  try {
    const { deptCode, name, hodName, description, status } = req.body;
    const department = await Department.findById(req.params.id);

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found.',
      });
    }

    if (deptCode && deptCode.trim().toUpperCase() !== department.deptCode) {
      const existing = await Department.findOne({ deptCode: deptCode.trim().toUpperCase() });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Department code "${deptCode.trim().toUpperCase()}" is already in use.`,
        });
      }
      department.deptCode = deptCode.trim().toUpperCase();
    }

    if (name) department.name = name.trim();
    if (hodName) department.hodName = hodName.trim();
    if (description !== undefined) department.description = description.trim();
    if (status) department.status = status;

    await department.save();

    await logAudit({
      userId: req.user?._id,
      userName: req.user?.name,
      userRole: req.user?.role,
      action: 'Update Department',
      description: `Updated department ${department.deptCode}.`,
      req,
    });

    res.json({
      success: true,
      message: `Department ${department.deptCode} updated successfully.`,
      data: department,
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Delete department
// @route  DELETE /api/departments/:id
// @access Admin only
export const deleteDepartment = async (req, res, next) => {
  try {
    const department = await Department.findById(req.params.id);

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found.',
      });
    }

    // Safety checks: Cannot delete if books or members are assigned
    const [booksCount, studentsCount, facultyCount] = await Promise.all([
      Book.countDocuments({ departmentId: department._id }),
      Student.countDocuments({ departmentId: department._id }),
      Faculty.countDocuments({ departmentId: department._id }),
    ]);

    if (booksCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Department cannot be deleted because ${booksCount} book(s) are assigned to it. Remove or reassign books first.`,
      });
    }

    if (studentsCount > 0 || facultyCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Department cannot be deleted because ${studentsCount} student(s) and ${facultyCount} faculty member(s) belong to it.`,
      });
    }

    await department.deleteOne();

    await logAudit({
      userId: req.user?._id,
      userName: req.user?.name,
      userRole: req.user?.role,
      action: 'Delete Department',
      description: `Deleted department ${department.deptCode} (${department.name}).`,
      req,
    });

    res.json({
      success: true,
      message: `Department ${department.deptCode} deleted successfully.`,
    });
  } catch (error) {
    next(error);
  }
};
