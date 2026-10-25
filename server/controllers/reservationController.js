import mongoose from 'mongoose';
import Book from '../models/Book.js';
import Faculty from '../models/Faculty.js';
import Reservation from '../models/Reservation.js';
import Student from '../models/Student.js';
import { logAudit } from '../utils/logger.js';
import { emitEvent } from '../utils/socket.js';
import { refreshReservationQueue } from '../utils/reservationQueue.js';

const memberRoles = ['student', 'faculty'];
const activeStatuses = ['Pending', 'Ready for Pickup'];
const getMemberType = (role) => (role === 'student' ? 'Student' : 'Faculty');

export const syncQueuePositions = async (bookId) => {
  const pendingReservations = await Reservation.find({
    bookId,
    status: 'Pending',
  }).sort({ reservedAt: 1, createdAt: 1, _id: 1 });

  for (let index = 0; index < pendingReservations.length; index += 1) {
    const reservation = pendingReservations[index];
    const queuePosition = index + 1;
    if (reservation.queuePosition !== queuePosition) {
      reservation.queuePosition = queuePosition;
      await reservation.save();
    }
  }
};

export const createReservation = async (req, res, next) => {
  try {
    const bookId = req.params.bookId || req.body.bookId;

    if (!memberRoles.includes(req.user.role) || !req.user.memberRefId) {
      return res.status(403).json({
        success: false,
        message: 'Only registered students and faculty members can reserve books.',
      });
    }
    if (!bookId || !mongoose.isValidObjectId(bookId)) {
      return res.status(400).json({ success: false, message: 'A valid book ID is required.' });
    }

    const memberType = getMemberType(req.user.role);
    const Member = memberType === 'Student' ? Student : Faculty;
    const member = await Member.findById(req.user.memberRefId).select('_id status departmentId');
    if (!member || member.status !== 'Active') {
      return res.status(403).json({
        success: false,
        message: 'An active student or faculty membership is required to reserve books.',
      });
    }

    await refreshReservationQueue(bookId);

    const book = await Book.findById(bookId).populate('departmentId', 'deptCode name');
    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found.' });
    }
    if (String(member.departmentId) !== String(book.departmentId?._id || book.departmentId)) {
      return res.status(403).json({
        success: false,
        message: 'You can only reserve books from your department.',
      });
    }
    if (book.availableQuantity > 0) {
      return res.status(409).json({
        success: false,
        message: 'This book is currently available. Use the existing book request or borrowing process instead.',
      });
    }

    const existing = await Reservation.findOne({
      userId: req.user._id,
      bookId: book._id,
      status: { $in: activeStatuses },
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `You already have an active reservation (Status: "${existing.status}", Position #${existing.queuePosition || 1}) for "${book.title}".`,
        data: existing,
      });
    }

    const queuePosition = (await Reservation.countDocuments({
      bookId: book._id,
      status: 'Pending',
    })) + 1;
    const reservationId = `RES-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;

    const reservation = await Reservation.create({
      reservationId,
      userId: req.user._id,
      memberType,
      memberId: member._id,
      bookId: book._id,
      departmentId: book.departmentId?._id || book.departmentId,
      queuePosition,
      activeReservationKey: `${req.user._id}:${book._id}`,
      status: 'Pending',
      reservedAt: new Date(),
    });

    await syncQueuePositions(book._id);
    const data = await Reservation.findById(reservation._id)
      .populate('bookId', 'bookId title author availableQuantity quantity price departmentId')
      .populate('departmentId', 'deptCode name');
    const finalQueuePosition = data.queuePosition || queuePosition;

    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'Reserve Book',
      description: `Reserved book "${book.title}" (${book.bookId}). Queue Position #${finalQueuePosition}.`,
      req,
    });
    emitEvent('reservation_updated', {
      reservationId: reservation.reservationId,
      userId: req.user._id,
      bookId: book._id,
      status: 'Pending',
      queuePosition: finalQueuePosition,
      reservation: data,
    });

    return res.status(201).json({
      success: true,
      message: `Book "${book.title}" reserved successfully. You are position #${data.queuePosition} in queue.`,
      data,
    });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern?.activeReservationKey) {
      return res.status(409).json({
        success: false,
        message: 'You already have an active reservation for this book.',
      });
    }
    return next(error);
  }
};

export const getMyReservations = async (req, res, next) => {
  try {
    await refreshReservationQueue();
    const reservations = await Reservation.find({ userId: req.user._id })
      .populate('bookId', 'bookId title author availableQuantity quantity price departmentId')
      .populate('departmentId', 'deptCode name')
      .sort({ reservedAt: -1, createdAt: -1 });

    return res.json({ success: true, count: reservations.length, data: reservations });
  } catch (error) {
    return next(error);
  }
};

export const getReservations = async (req, res, next) => {
  try {
    await refreshReservationQueue();
    const { status, department, bookId } = req.query;
    const filter = {};

    if (status && status !== 'all') {
      if (!Reservation.schema.path('status').enumValues.includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid reservation status filter.' });
      }
      filter.status = status;
    }
    if (department && department !== 'all') {
      if (!mongoose.isValidObjectId(department)) {
        return res.status(400).json({ success: false, message: 'Invalid department ID.' });
      }
      filter.departmentId = department;
    }
    if (bookId) {
      if (!mongoose.isValidObjectId(bookId)) {
        return res.status(400).json({ success: false, message: 'Invalid book ID.' });
      }
      filter.bookId = bookId;
    }

    const reservations = await Reservation.find(filter)
      .populate('bookId', 'bookId title author availableQuantity quantity departmentId')
      .populate('departmentId', 'deptCode name')
      .populate('memberId', 'name registerNumber employeeId')
      .populate('userId', 'name email role')
      .sort({ reservedAt: 1, queuePosition: 1 });

    return res.json({ success: true, count: reservations.length, data: reservations });
  } catch (error) {
    return next(error);
  }
};

export const getReservationById = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid reservation ID.' });
    }
    await refreshReservationQueue();
    const filter = { _id: req.params.id };
    if (!['admin', 'librarian'].includes(req.user.role)) filter.userId = req.user._id;

    const reservation = await Reservation.findOne(filter)
      .populate('bookId', 'bookId title author availableQuantity quantity departmentId')
      .populate('departmentId', 'deptCode name')
      .populate('fulfilledIssueId', 'issueNumber issueDate dueDate');
    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Reservation not found.' });
    }
    return res.json({ success: true, data: reservation });
  } catch (error) {
    return next(error);
  }
};

export const cancelReservation = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid reservation ID.' });
    }
    await refreshReservationQueue();
    const isStaff = ['admin', 'librarian'].includes(req.user.role);
    const filter = isStaff
      ? { _id: req.params.id }
      : { _id: req.params.id, userId: req.user._id };
    const reservation = await Reservation.findOne(filter).populate('bookId', 'title');
    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Reservation not found.' });
    }
    if (!activeStatuses.includes(reservation.status)) {
      return res.status(409).json({
        success: false,
        message: `A reservation with status "${reservation.status}" cannot be cancelled.`,
      });
    }

    const reason = req.body?.reason;
    if (reason !== undefined && (typeof reason !== 'string' || reason.trim().length > 500)) {
      return res.status(400).json({ success: false, message: 'Cancellation reason must be 500 characters or fewer.' });
    }
    const targetBookId = reservation.bookId?._id || reservation.bookId;
    const update = await Reservation.updateOne(
      { _id: reservation._id, status: { $in: activeStatuses } },
      {
        $set: {
          status: 'Cancelled',
          cancelledAt: new Date(),
          cancelledBy: req.user._id,
          ...(reason?.trim() ? { cancellationReason: reason.trim() } : {}),
        },
        $unset: { activeReservationKey: 1 },
      }
    );
    if (!update.modifiedCount) {
      return res.status(409).json({ success: false, message: 'This reservation has already changed and can no longer be cancelled.' });
    }

    await syncQueuePositions(targetBookId);
    await refreshReservationQueue(targetBookId);
    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'Cancel Reservation',
      description: `Cancelled reservation ${reservation.reservationId} for "${reservation.bookId?.title || 'a book'}".`,
      req,
    });
    emitEvent('reservation_updated', {
      reservationId: reservation.reservationId,
      userId: reservation.userId,
      bookId: targetBookId,
      status: 'Cancelled',
    });

    return res.json({ success: true, message: 'Reservation cancelled successfully.' });
  } catch (error) {
    return next(error);
  }
};
