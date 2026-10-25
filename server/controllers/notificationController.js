import Notification from '../models/Notification.js';

// @desc   Get notifications for current user
// @route  GET /api/notifications
// @access Private
export const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    const filter = {
      $or: [
        { recipientId: userId },
        { recipientId: null, targetRole: 'all' },
        { recipientId: null, targetRole: userRole },
      ],
    };

    const [notifications, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).limit(30).lean(),
      Notification.countDocuments({ ...filter, isRead: false }),
    ]);

    res.json({
      success: true,
      unreadCount,
      count: notifications.length,
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Mark notification as read
// @route  PUT /api/notifications/:id/read
// @access Private
export const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found.',
      });
    }

    res.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Mark all notifications as read
// @route  PUT /api/notifications/mark-all-read
// @access Private
export const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    const filter = {
      $or: [
        { recipientId: userId },
        { recipientId: null, targetRole: 'all' },
        { recipientId: null, targetRole: userRole },
      ],
      isRead: false,
    };

    await Notification.updateMany(filter, { isRead: true });

    res.json({
      success: true,
      message: 'All notifications marked as read.',
    });
  } catch (error) {
    next(error);
  }
};
