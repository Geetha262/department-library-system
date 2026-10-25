import Setting from '../models/Setting.js';
import { logAudit } from '../utils/logger.js';

// @desc   Get system settings
// @route  GET /api/settings
// @access Private
export const getSettings = async (req, res, next) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      settings = await Setting.create({});
    }
    res.json({ success: true, data: settings });
  } catch (error) { next(error); }
};

// @desc   Update system settings
// @route  PUT /api/settings
// @access Admin only
export const updateSettings = async (req, res, next) => {
  try {
    const {
      libraryName, finePerDay, studentBorrowingLimit,
      facultyBorrowingLimit, maxIssuePeriodDays,
      contactEmail, contactPhone, address,
    } = req.body;

    let settings = await Setting.findOne();
    if (!settings) settings = new Setting({});

    if (libraryName) settings.libraryName = libraryName;
    if (finePerDay !== undefined) settings.finePerDay = parseFloat(finePerDay);
    if (studentBorrowingLimit !== undefined) settings.studentBorrowingLimit = parseInt(studentBorrowingLimit, 10);
    if (facultyBorrowingLimit !== undefined) settings.facultyBorrowingLimit = parseInt(facultyBorrowingLimit, 10);
    if (maxIssuePeriodDays !== undefined) settings.maxIssuePeriodDays = parseInt(maxIssuePeriodDays, 10);
    if (contactEmail) settings.contactEmail = contactEmail;
    if (contactPhone) settings.contactPhone = contactPhone;
    if (address) settings.address = address;

    await settings.save();

    await logAudit({
      userId: req.user?._id,
      userName: req.user?.name,
      userRole: req.user?.role,
      action: 'Update Settings',
      description: `System settings updated: Fine/day=₹${settings.finePerDay}, Student limit=${settings.studentBorrowingLimit}, Faculty limit=${settings.facultyBorrowingLimit}, Max days=${settings.maxIssuePeriodDays}.`,
      req,
    });

    res.json({ success: true, message: 'Settings updated successfully.', data: settings });
  } catch (error) { next(error); }
};
