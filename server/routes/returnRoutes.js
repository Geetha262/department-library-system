import express from 'express';
import {
  searchActiveLoan,
  createReturn,
  getReturns,
} from '../controllers/returnController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/search-loan', authorize('admin', 'librarian'), searchActiveLoan);

router.route('/')
  .get(getReturns)
  .post(authorize('admin', 'librarian', 'student', 'faculty'), createReturn);

export default router;
