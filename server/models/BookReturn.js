import mongoose from 'mongoose';

const bookReturnSchema = new mongoose.Schema(
  {
    issueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BookIssue',
      required: [true, 'Issue reference is required'],
      unique: true,
    },
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      required: [true, 'Book reference is required'],
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
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
    },
    returnDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
    overdueDays: {
      type: Number,
      default: 0,
      min: 0,
    },
    fineAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    remarks: {
      type: String,
      trim: true,
      default: 'Returned in good condition',
    },
  },
  {
    timestamps: true,
  }
);

const BookReturn = mongoose.model('BookReturn', bookReturnSchema);
export default BookReturn;
