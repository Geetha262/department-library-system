import mongoose from 'mongoose';

const bookIssueSchema = new mongoose.Schema(
  {
    issueNumber: {
      type: String,
      required: [true, 'Issue Number is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    memberType: {
      type: String,
      enum: ['Student', 'Faculty'],
      required: [true, 'Member type is required'],
    },
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Member reference is required'],
      refPath: 'memberType',
    },
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      required: [true, 'Book reference is required'],
    },
    activeLoanKey: {
      type: String,
      select: false,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department reference is required'],
    },
    issueDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
    },
    status: {
      type: String,
      enum: ['Issued', 'Returned', 'Overdue'],
      default: 'Issued',
    },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    returnDetails: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BookReturn',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

bookIssueSchema.index({ memberId: 1, status: 1 });
bookIssueSchema.index({ bookId: 1, status: 1 });
bookIssueSchema.index({ departmentId: 1, status: 1 });
bookIssueSchema.index({ activeLoanKey: 1 }, { unique: true, sparse: true });

const BookIssue = mongoose.model('BookIssue', bookIssueSchema);
export default BookIssue;
