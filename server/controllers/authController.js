import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Student from '../models/Student.js';
import Faculty from '../models/Faculty.js';
import Department from '../models/Department.js';
import { logAudit } from '../utils/logger.js';

// Helper to sign JWT
const signToken = (id, role) => {
  return jwt.sign(
    { id, role },
    process.env.JWT_SECRET || 'super_secret_jwt_key_department_library_system_2025',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// @desc   Login user (Admin, Librarian, Student, Faculty)
// @route  POST /api/auth/login
// @access Public
export const login = async (req, res, next) => {
  try {
    const { identifier, password, role } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both user identifier (Email or ID) and password.',
      });
    }

    const cleanIdentifier = identifier.trim();

    // Find user by email first
    let user = await User.findOne({ email: cleanIdentifier.toLowerCase() }).populate(
      'departmentId',
      'deptCode name hodName'
    );

    // If not found by email, check if identifier is a Student Register Number or Faculty Employee ID
    if (!user) {
      const student = await Student.findOne({ registerNumber: cleanIdentifier.toUpperCase() });
      if (student && student.userId) {
        user = await User.findById(student.userId).populate(
          'departmentId',
          'deptCode name hodName'
        );
      } else {
        const faculty = await Faculty.findOne({ employeeId: cleanIdentifier.toUpperCase() });
        if (faculty && faculty.userId) {
          user = await User.findById(faculty.userId).populate(
            'departmentId',
            'deptCode name hodName'
          );
        }
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid login credentials.',
      });
    }

    // Role validation if user explicitly selected a role on login form
    if (role && user.role !== role.toLowerCase()) {
      return res.status(401).json({
        success: false,
        message: `Account is registered as "${user.role}", not as "${role}". Please select the correct role.`,
      });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid login credentials.',
      });
    }

    if (user.status === 'Inactive') {
      return res.status(403).json({
        success: false,
        message: 'Your account is deactivated. Please contact the administrator.',
      });
    }

    // Generate JWT
    const token = signToken(user._id, user.role);

    // Fetch member details if Student or Faculty
    let memberDetails = null;
    if (user.role === 'student' && user.memberRefId) {
      memberDetails = await Student.findById(user.memberRefId).populate('departmentId', 'deptCode name');
    } else if (user.role === 'faculty' && user.memberRefId) {
      memberDetails = await Faculty.findById(user.memberRefId).populate('departmentId', 'deptCode name');
    }

    // Log audit
    await logAudit({
      userId: user._id,
      userName: user.name,
      userRole: user.role,
      action: 'User Login',
      description: `${user.name} (${user.role.toUpperCase()}) logged in successfully.`,
      req,
    });

    res.json({
      success: true,
      message: 'Logged in successfully.',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.departmentId,
        memberDetails,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Get current logged-in user profile
// @route  GET /api/auth/me
// @access Private
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('departmentId', 'deptCode name hodName');

    let memberDetails = null;
    if (user.role === 'student' && user.memberRefId) {
      memberDetails = await Student.findById(user.memberRefId).populate('departmentId', 'deptCode name');
    } else if (user.role === 'faculty' && user.memberRefId) {
      memberDetails = await Faculty.findById(user.memberRefId).populate('departmentId', 'deptCode name');
    }

    res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.departmentId,
        memberDetails,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Logout user
// @route  POST /api/auth/logout
// @access Private
export const logout = async (req, res, next) => {
  try {
    if (req.user) {
      await logAudit({
        userId: req.user._id,
        userName: req.user.name,
        userRole: req.user.role,
        action: 'User Logout',
        description: `${req.user.name} logged out.`,
        req,
      });
    }

    res.json({
      success: true,
      message: 'Logged out successfully.',
    });
  } catch (error) {
    next(error);
  }
};
