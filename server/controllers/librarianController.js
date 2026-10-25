import User from '../models/User.js';
import { logAudit } from '../utils/logger.js';

// @desc   Get all librarians
// @route  GET /api/librarians
// @access Admin only
export const getLibrarians = async (req, res, next) => {
  try {
    const { search, status } = req.query;
    const filter = { role: 'librarian' };

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (search && search.trim()) {
      filter.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { email: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const librarians = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      count: librarians.length,
      data: librarians,
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Create new librarian
// @route  POST /api/librarians
// @access Admin only
export const createLibrarian = async (req, res, next) => {
  try {
    const { name, email, password, status = 'Active' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required.',
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `User with email "${cleanEmail}" already exists.`,
      });
    }

    const librarian = new User({
      name: name.trim(),
      email: cleanEmail,
      password: password.trim(),
      role: 'librarian',
      status: status || 'Active',
    });

    await librarian.save();

    await logAudit({
      userId: req.user?._id,
      userName: req.user?.name,
      userRole: req.user?.role,
      action: 'Create Librarian',
      description: `Created librarian account for ${librarian.name} (${librarian.email}).`,
      req,
    });

    res.status(201).json({
      success: true,
      message: `Librarian "${librarian.name}" registered successfully.`,
      data: {
        _id: librarian._id,
        name: librarian.name,
        email: librarian.email,
        role: librarian.role,
        status: librarian.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Update librarian
// @route  PUT /api/librarians/:id
// @access Admin only
export const updateLibrarian = async (req, res, next) => {
  try {
    const librarian = await User.findOne({ _id: req.params.id, role: 'librarian' });

    if (!librarian) {
      return res.status(404).json({
        success: false,
        message: 'Librarian not found.',
      });
    }

    const { name, email, password, status } = req.body;

    if (email && email.trim().toLowerCase() !== librarian.email) {
      const existing = await User.findOne({ email: email.trim().toLowerCase() });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Email "${email.trim().toLowerCase()}" is already in use.`,
        });
      }
      librarian.email = email.trim().toLowerCase();
    }

    if (name) librarian.name = name.trim();
    if (status) librarian.status = status;
    if (password && password.trim().length >= 6) {
      librarian.password = password.trim();
    }

    await librarian.save();

    await logAudit({
      userId: req.user?._id,
      userName: req.user?.name,
      userRole: req.user?.role,
      action: 'Update Librarian',
      description: `Updated librarian profile for ${librarian.name} (${librarian.email}).`,
      req,
    });

    res.json({
      success: true,
      message: `Librarian "${librarian.name}" updated successfully.`,
      data: {
        _id: librarian._id,
        name: librarian.name,
        email: librarian.email,
        role: librarian.role,
        status: librarian.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Delete librarian
// @route  DELETE /api/librarians/:id
// @access Admin only
export const deleteLibrarian = async (req, res, next) => {
  try {
    if (String(req.user?._id) === String(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account.',
      });
    }

    const librarian = await User.findOne({ _id: req.params.id, role: 'librarian' });

    if (!librarian) {
      return res.status(404).json({
        success: false,
        message: 'Librarian not found.',
      });
    }

    await librarian.deleteOne();

    await logAudit({
      userId: req.user?._id,
      userName: req.user?.name,
      userRole: req.user?.role,
      action: 'Delete Librarian',
      description: `Deleted librarian ${librarian.name} (${librarian.email}).`,
      req,
    });

    res.json({
      success: true,
      message: `Librarian "${librarian.name}" deleted successfully.`,
    });
  } catch (error) {
    next(error);
  }
};
