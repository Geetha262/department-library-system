import Notification from '../models/Notification.js';

export const createNotification = async ({
  recipientId = null,
  targetRole = 'all',
  title,
  message,
  type = 'info',
  link = '',
}) => {
  try {
    const notification = await Notification.create({
      recipientId,
      targetRole,
      title,
      message,
      type,
      link,
    });
    return notification;
  } catch (err) {
    console.error(`[Notification Error] Failed to create notification: ${err.message}`);
  }
};
