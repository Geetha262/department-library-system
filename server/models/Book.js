import mongoose from 'mongoose';

const bookSchema = new mongoose.Schema(
  {
    bookId: {
      type: String,
      required: [true, 'Book ID / Accession Number is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    isbn: {
      type: String,
      required: [true, 'ISBN is required'],
      trim: true,
    },
    title: {
      type: String,
      required: [true, 'Book title is required'],
      trim: true,
    },
    author: {
      type: String,
      required: [true, 'Author name is required'],
      trim: true,
    },
    publisher: {
      type: String,
      required: [true, 'Publisher is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Every book must belong to a Department'],
    },
    edition: {
      type: String,
      trim: true,
      default: '1st Edition',
    },
    publicationYear: {
      type: Number,
      default: new Date().getFullYear(),
    },
    quantity: {
      type: Number,
      required: [true, 'Total quantity is required'],
      min: [1, 'Quantity must be at least 1'],
    },
    availableQuantity: {
      type: Number,
      required: true,
      min: [0, 'Available quantity cannot be negative'],
    },
    shelfNumber: {
      type: String,
      required: [true, 'Shelf number is required'],
      trim: true,
    },
    price: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['Available', 'Unavailable', 'Maintenance'],
      default: 'Available',
    },
  },
  {
    timestamps: true,
  }
);

bookSchema.virtual('availabilityLabel').get(function () {
  if (this.availableQuantity <= 0) return 'Currently Unavailable';
  if (this.availableQuantity < this.quantity) return 'Partially Available';
  return 'Available';
});

bookSchema.set('toJSON', { virtuals: true });
bookSchema.set('toObject', { virtuals: true });

// Indexing for rapid multi-facet searching
bookSchema.index({ title: 'text', author: 'text', isbn: 'text', bookId: 'text' });
bookSchema.index({ departmentId: 1, status: 1 });

const Book = mongoose.model('Book', bookSchema);
export default Book;
