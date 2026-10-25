import express from 'express';
import { getWishlist } from '../controllers/wishlistController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect, authorize('student', 'faculty'));
router.get('/', getWishlist);

export default router;