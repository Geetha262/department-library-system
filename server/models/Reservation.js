import mongoose from 'mongoose';

const reservationSchema = new mongoose.Schema(
  {
    reservationId: {
      type: String,
      trim: true,
      uppercase: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    memberType: {
      type: String,
      enum: ['Student', 'Faculty'],
      required: true,
    },
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'memberType',
    },
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      required: true,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
    },
    activeReservationKey: {
      type: String,
      select: false,
    },
    reservedAt: {
      type: Date,
      default: Date.now,
    },
    readyAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    status: {
      type: String,
      enum: ['Pending', 'Ready for Pickup', 'Fulfilled', 'Cancelled', 'Expired'],
      default: 'Pending',
    },
    fulfilledIssueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BookIssue',
    },
    cancelledAt: {
      type: Date,
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    cancellationReason: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    queuePosition: {
      type: Number,
      min: 1,
    },
  },
  { timestamps: true }
);

reservationSchema.index({ userId: 1, bookId: 1, status: 1 });
reservationSchema.index({ bookId: 1, status: 1, reservedAt: 1 });
reservationSchema.index({ reservationId: 1 }, { unique: true, sparse: true });
reservationSchema.index({ activeReservationKey: 1 }, { unique: true, sparse: true });

const Reservation = mongoose.model('Reservation', reservationSchema);
export default Reservation;