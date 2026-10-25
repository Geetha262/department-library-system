import express from 'express';
import {
  getBooks,
  getBookById,
  getCategories,
  createBook,
  updateBook,
  deleteBook,
} from '../controllers/bookController.js';
import { createReservation } from '../controllers/reservationController.js';
import { addToWishlist, removeFromWishlist } from '../controllers/wishlistController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(getBooks)
  .post(protect, authorize('admin', 'librarian'), createBook);

router.get('/categories', getCategories);

router.post('/:bookId/reserve', protect, authorize('student', 'faculty'), createReservation);
router.post('/:bookId/wishlist', protect, authorize('student', 'faculty'), addToWishlist);
router.delete('/:bookId/wishlist', protect, authorize('student', 'faculty'), removeFromWishlist);

router.route('/:id')
  .get(getBookById)
  .put(protect, authorize('admin', 'librarian'), updateBook)
  .delete(protect, authorize('admin'), deleteBook);

export default router;
