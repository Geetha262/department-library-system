import Book from '../models/Book.js';
import Reservation from '../models/Reservation.js';
import Setting from '../models/Setting.js';
import { createNotification } from './notify.js';
import { emitEvent } from './socket.js';

export const refreshReservationQueue = async (bookId) => {
  const now = new Date();
  const expiryFilter = {
    status: 'Ready for Pickup',
    expiresAt: { $lte: now },
  };
  if (bookId) expiryFilter.bookId = bookId;

  const expiredReservations = await Reservation.find(expiryFilter)
    .select('_id reservationId userId bookId')
    .lean();
  const affectedBooks = new Set();

  for (const reservation of expiredReservations) {
    const result = await Reservation.updateOne(
      { _id: reservation._id, status: 'Ready for Pickup', expiresAt: { $lte: now } },
      { $set: { status: 'Expired' }, $unset: { activeReservationKey: 1 } }
    );
    if (!result.modifiedCount) continue;

    const targetBookId = String(reservation.bookId);
    affectedBooks.add(targetBookId);
    emitEvent('reservation_updated', {
      reservationId: reservation.reservationId,
      userId: reservation.userId,
      bookId: reservation.bookId,
      status: 'Expired',
    });
  }

  if (bookId) affectedBooks.add(String(bookId));

  const settings = await Setting.findOne().select('reservationExpiryHours').lean();
  const expiryHours = settings?.reservationExpiryHours || 48;

  for (const targetBookId of affectedBooks) {
    const book = await Book.findById(targetBookId).select('title availableQuantity');
    if (!book || book.availableQuantity <= 0) continue;

    const readyCount = await Reservation.countDocuments({
      bookId: targetBookId,
      status: 'Ready for Pickup',
      expiresAt: { $gt: new Date() },
    });
    let openCopies = Math.max(0, book.availableQuantity - readyCount);

    while (openCopies > 0) {
      const nextReservation = await Reservation.findOneAndUpdate(
        { bookId: targetBookId, status: 'Pending' },
        {
          $set: {
            status: 'Ready for Pickup',
            readyAt: new Date(),
            expiresAt: new Date(Date.now() + expiryHours * 60 * 60 * 1000),
          },
        },
        { new: true, sort: { reservedAt: 1, createdAt: 1, _id: 1 } }
      );
      if (!nextReservation) break;

      await createNotification({
        recipientId: nextReservation.userId,
        title: 'Reserved Book Ready for Pickup!',
        message: `A copy of "${book.title}" is ready for pickup. Please collect it before ${nextReservation.expiresAt.toLocaleString()}.`,
        type: 'success',
        link: '/my-reservations',
      });
      emitEvent('reservation_updated', {
        reservationId: nextReservation.reservationId,
        userId: nextReservation.userId,
        bookId: targetBookId,
        status: 'Ready for Pickup',
        reservation: nextReservation,
      });
      openCopies -= 1;
    }

    const pendingReservations = await Reservation.find({
      bookId: targetBookId,
      status: 'Pending',
    }).sort({ reservedAt: 1, createdAt: 1, _id: 1 });
    for (let index = 0; index < pendingReservations.length; index += 1) {
      if (pendingReservations[index].queuePosition !== index + 1) {
        await Reservation.updateOne(
          { _id: pendingReservations[index]._id, status: 'Pending' },
          { $set: { queuePosition: index + 1 } }
        );
      }
    }
  }
};
