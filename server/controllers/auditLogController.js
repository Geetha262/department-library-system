import AuditLog from '../models/AuditLog.js';

// @desc   Get audit logs
// @route  GET /api/audit-logs
// @access Admin only
export const getAuditLogs = async (req, res, next) => {
  try {
    const { action, userRole, search, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (action && action !== 'all') filter.action = { $regex: action, $options: 'i' };
    if (userRole && userRole !== 'all') filter.userRole = userRole;
    if (search && search.trim()) {
      filter.$or = [
        { userName: { $regex: search.trim(), $options: 'i' } },
        { action: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } },
      ];
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      AuditLog.countDocuments(filter),
    ]);
    res.json({ success: true, count: logs.length, total, page: Number(page), pages: Math.ceil(total / Number(limit)) || 1, data: logs });
  } catch (error) { next(error); }
};
