import mongoose from 'mongoose';

const bookRequestSchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      required: true,
      unique: true,
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
      required: true,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    approvedAt: {
      type: Date,
    },
    rejectedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    issuedAt: {
      type: Date,
    },
    issueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BookIssue',
    },
    status: {
      type: String,
      enum: ['Pending Approval', 'Approved', 'Rejected', 'Issued', 'Cancelled', 'Expired'],
      default: 'Pending Approval',
    },
  },
  {
    timestamps: true,
  }
);

bookRequestSchema.index({ userId: 1, bookId: 1, status: 1 });
bookRequestSchema.index({ bookId: 1, status: 1 });
bookRequestSchema.index({ departmentId: 1, status: 1 });

const BookRequest = mongoose.model('BookRequest', bookRequestSchema);
export default BookRequest;
