import express from 'express';
import {
  getFines,
  payFine,
} from '../controllers/fineController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getFines);
router.put('/:id/pay', authorize('admin', 'librarian'), payFine);

export default router;
