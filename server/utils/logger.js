import AuditLog from '../models/AuditLog.js';

export const logAudit = async ({
  userId = null,
  userName = 'System',
  userRole = 'system',
  action,
  description,
  ipAddress = '127.0.0.1',
  metadata = {},
  req = null,
}) => {
  try {
    const finalUserId = userId || req?.user?._id || null;
    const finalUserName = userName !== 'System' ? userName : (req?.user?.name || 'System');
    const finalUserRole = userRole !== 'system' ? userRole : (req?.user?.role || 'system');
    const finalIp = ipAddress !== '127.0.0.1' ? ipAddress : (req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || '127.0.0.1');

    await AuditLog.create({
      userId: finalUserId,
      userName: finalUserName,
      userRole: finalUserRole,
      action,
      description,
      ipAddress: finalIp,
      metadata,
    });
  } catch (err) {
    console.error(`[AuditLog Error] Failed to write audit log: ${err.message}`);
  }
};
