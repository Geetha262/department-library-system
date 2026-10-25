import mongoose from 'mongoose';

const fineSchema = new mongoose.Schema(
  {
    issueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BookIssue',
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
      required: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    returnDate: {
      type: Date,
      default: Date.now,
    },
    overdueDays: {
      type: Number,
      required: true,
      min: 0,
    },
    fineAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: ['Unpaid', 'Partially Paid', 'Paid'],
      default: 'Unpaid',
    },
    paymentDate: {
      type: Date,
      default: null,
    },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'UPI', 'Card', 'Other', null],
      default: null,
    },
    referenceNumber: {
      type: String,
      trim: true,
      default: '',
    },
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

fineSchema.index({ memberId: 1, paymentStatus: 1 });
fineSchema.index({ departmentId: 1 });

fineSchema.virtual('remainingAmount').get(function () {
  return Math.max(0, this.fineAmount - (this.paidAmount || 0));
});

fineSchema.set('toJSON', { virtuals: true });
fineSchema.set('toObject', { virtuals: true });

const Fine = mongoose.model('Fine', fineSchema);
export default Fine;
