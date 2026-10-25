import Book from '../models/Book.js';
import Department from '../models/Department.js';
import BookIssue from '../models/BookIssue.js';
import { logAudit } from '../utils/logger.js';
import { createNotification } from '../utils/notify.js';

// @desc   Get books with search, department filter, category, and availability
// @route  GET /api/books
// @access Private/Public
export const getBooks = async (req, res, next) => {
  try {
    const { search, department, category, availability, sort, page = 1, limit = 50 } = req.query;
    const filter = {};

    // Department filtering
    if (department && department !== 'all') {
      // Check if department is an ObjectId or department code
      if (department.match(/^[0-9a-fA-F]{24}$/)) {
        filter.departmentId = department;
      } else {
        const deptDoc = await Department.findOne({ deptCode: department.toUpperCase() });
        if (deptDoc) {
          filter.departmentId = deptDoc._id;
        }
      }
    }

    // Category filter
    if (category && category !== 'all') {
      filter.category = category;
    }

    // Availability filter
    if (availability === 'available') {
      filter.availableQuantity = { $gt: 0 };
    } else if (availability === 'unavailable') {
      filter.availableQuantity = { $eq: 0 };
    }

    // Multi-attribute search (Title, Author, ISBN, Book ID, Category)
    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { author: { $regex: q, $options: 'i' } },
        { isbn: { $regex: q, $options: 'i' } },
        { bookId: { $regex: q, $options: 'i' } },
        { category: { $regex: q, $options: 'i' } },
      ];
    }

    // Sorting
    let sortOption = { createdAt: -1 };
    if (sort === 'title_asc') sortOption = { title: 1 };
    else if (sort === 'title_desc') sortOption = { title: -1 };
    else if (sort === 'newest') sortOption = { createdAt: -1 };
    else if (sort === 'oldest') sortOption = { createdAt: 1 };

    const skip = (Number(page) - 1) * Number(limit);

    const [books, total] = await Promise.all([
      Book.find(filter)
        .populate('departmentId', 'deptCode name hodName')
        .sort(sortOption)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Book.countDocuments(filter),
    ]);

    res.json({
      success: true,
      count: books.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)) || 1,
      data: books,
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Get single book by ID
// @route  GET /api/books/:id
// @access Private/Public
export const getBookById = async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.id).populate(
      'departmentId',
      'deptCode name hodName'
    );

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found.',
      });
    }

    res.json({
      success: true,
      data: book,
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Get distinct book categories
// @route  GET /api/books/categories
// @access Public
export const getCategories = async (req, res, next) => {
  try {
    const categories = await Book.distinct('category');
    res.json({
      success: true,
      data: categories.filter(Boolean).sort(),
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Create new book
// @route  POST /api/books
// @access Admin, Librarian
export const createBook = async (req, res, next) => {
  try {
    const {
      bookId,
      isbn,
      title,
      author,
      publisher,
      category,
      departmentId,
      edition,
      publicationYear,
      quantity,
      shelfNumber,
      price,
    } = req.body;

    if (!bookId || !isbn || !title || !author || !publisher || !category || !departmentId || !quantity || !shelfNumber) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all mandatory book fields including Department and Quantity.',
      });
    }

    // Verify Department exists
    const dept = await Department.findById(departmentId);
    if (!dept) {
      return res.status(400).json({
        success: false,
        message: 'The selected department does not exist.',
      });
    }

    // Check duplicate Book ID
    const existingId = await Book.findOne({ bookId: bookId.trim().toUpperCase() });
    if (existingId) {
      return res.status(400).json({
        success: false,
        message: `Book ID "${bookId.trim().toUpperCase()}" is already assigned to another book.`,
      });
    }

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 1) {
      return res.status(400).json({
        success: false,
        message: 'Book quantity must be at least 1.',
      });
    }

    const bookPrice = price === undefined || price === '' ? 0 : Number(price);
    if (!Number.isFinite(bookPrice) || bookPrice < 0) {
      return res.status(400).json({
        success: false,
        message: 'Book price must be a valid non-negative number.',
      });
    }

    const book = await Book.create({
      bookId: bookId.trim().toUpperCase(),
      isbn: isbn.trim(),
      title: title.trim(),
      author: author.trim(),
      publisher: publisher.trim(),
      category: category.trim(),
      departmentId,
      edition: edition?.trim() || '1st Edition',
      publicationYear: publicationYear ? parseInt(publicationYear, 10) : new Date().getFullYear(),
      quantity: qty,
      availableQuantity: qty,
      shelfNumber: shelfNumber.trim(),
      price: bookPrice,
      status: 'Available',
    });

    const populatedBook = await Book.findById(book._id).populate('departmentId', 'deptCode name');

    await logAudit({
      userId: req.user?._id,
      userName: req.user?.name,
      userRole: req.user?.role,
      action: 'Add Book',
      description: `Added book "${book.title}" (${book.bookId}) to ${dept.deptCode} department.`,
      req,
    });

    await createNotification({
      targetRole: 'all',
      title: 'New Book Added',
      message: `"${book.title}" by ${book.author} has been added to the ${dept.deptCode} department catalog.`,
      type: 'info',
      link: '/books',
    });

    res.status(201).json({
      success: true,
      message: 'Book added successfully.',
      data: populatedBook,
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Update book
// @route  PUT /api/books/:id
// @access Admin, Librarian
export const updateBook = async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found.',
      });
    }

    const {
      bookId,
      isbn,
      title,
      author,
      publisher,
      category,
      departmentId,
      edition,
      publicationYear,
      quantity,
      shelfNumber,
      price,
      status,
    } = req.body;

    if (bookId && bookId.trim().toUpperCase() !== book.bookId) {
      const existing = await Book.findOne({ bookId: bookId.trim().toUpperCase() });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Book ID "${bookId.trim().toUpperCase()}" is already in use.`,
        });
      }
      book.bookId = bookId.trim().toUpperCase();
    }

    if (departmentId && departmentId !== String(book.departmentId)) {
      const dept = await Department.findById(departmentId);
      if (!dept) {
        return res.status(400).json({
          success: false,
          message: 'Selected department does not exist.',
        });
      }
      book.departmentId = departmentId;
    }

    // Handle quantity changes safely
    if (quantity !== undefined) {
      const newQty = parseInt(quantity, 10);
      const diff = newQty - book.quantity;
      const newAvailable = book.availableQuantity + diff;

      if (newAvailable < 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot reduce total quantity to ${newQty}. Currently ${book.quantity - book.availableQuantity} copies are issued.`,
        });
      }

      book.quantity = newQty;
      book.availableQuantity = newAvailable;
    }

    if (isbn) book.isbn = isbn.trim();
    if (title) book.title = title.trim();
    if (author) book.author = author.trim();
    if (publisher) book.publisher = publisher.trim();
    if (category) book.category = category.trim();
    if (edition) book.edition = edition.trim();
    if (publicationYear) book.publicationYear = parseInt(publicationYear, 10);
    if (shelfNumber) book.shelfNumber = shelfNumber.trim();
    if (price !== undefined) {
      const bookPrice = Number(price);
      if (!Number.isFinite(bookPrice) || bookPrice < 0) {
        return res.status(400).json({
          success: false,
          message: 'Book price must be a valid non-negative number.',
        });
      }
      book.price = bookPrice;
    }

    if (status) {
      book.status = status;
    } else {
      book.status = book.availableQuantity > 0 ? 'Available' : 'Unavailable';
    }

    await book.save();

    const populatedBook = await Book.findById(book._id).populate('departmentId', 'deptCode name');

    await logAudit({
      userId: req.user?._id,
      userName: req.user?.name,
      userRole: req.user?.role,
      action: 'Update Book',
      description: `Updated book "${book.title}" (${book.bookId}).`,
      req,
    });

    res.json({
      success: true,
      message: 'Book updated successfully.',
      data: populatedBook,
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Delete book
// @route  DELETE /api/books/:id
// @access Admin only
export const deleteBook = async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found.',
      });
    }

    // Check if book currently has active issues
    const activeIssues = await BookIssue.countDocuments({
      bookId: book._id,
      status: { $in: ['Issued', 'Overdue'] },
    });

    if (activeIssues > 0) {
      return res.status(400).json({
        success: false,
        message: `Book cannot be deleted because ${activeIssues} copy(ies) are currently issued. Return all copies first.`,
      });
    }

    await book.deleteOne();

    await logAudit({
      userId: req.user?._id,
      userName: req.user?.name,
      userRole: req.user?.role,
      action: 'Delete Book',
      description: `Deleted book "${book.title}" (${book.bookId}).`,
      req,
    });

    res.json({
      success: true,
      message: `Book "${book.title}" deleted successfully.`,
    });
  } catch (error) {
    next(error);
  }
};
