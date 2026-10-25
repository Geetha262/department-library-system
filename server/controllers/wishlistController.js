import Book from '../models/Book.js';
import Wishlist from '../models/Wishlist.js';

export const getWishlist = async (req, res, next) => {
  try {
    const wishlist = await Wishlist.find({ userId: req.user._id })
      .populate('bookId', 'bookId title author category quantity availableQuantity price departmentId')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: wishlist });
  } catch (error) {
    next(error);
  }
};

export const addToWishlist = async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.bookId).select('_id');
    if (!book) return res.status(404).json({ success: false, message: 'Book not found.' });

    const existing = await Wishlist.findOne({ userId: req.user._id, bookId: book._id });
    if (existing) return res.status(409).json({ success: false, message: 'Book is already in your wishlist.', data: existing });

    const wishlistItem = await Wishlist.create({ userId: req.user._id, bookId: book._id });
    res.status(201).json({ success: true, message: 'Book added to wishlist.', data: wishlistItem });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'Book is already in your wishlist.' });
    }
    next(error);
  }
};

export const removeFromWishlist = async (req, res, next) => {
  try {
    const item = await Wishlist.findOneAndDelete({ userId: req.user._id, bookId: req.params.bookId });
    if (!item) return res.status(404).json({ success: false, message: 'Book is not in your wishlist.' });
    res.json({ success: true, message: 'Book removed from wishlist.' });
  } catch (error) {
    next(error);
  }
};