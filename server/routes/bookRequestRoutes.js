import express from 'express';
import {
  createBookRequest,
  getMyBookRequests,
  getBookRequests,
  approveBookRequest,
  rejectBookRequest,
  cancelBookRequest,
} from '../controllers/bookRequestController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.post('/', authorize('student', 'faculty'), createBookRequest);
router.get('/my', authorize('student', 'faculty'), getMyBookRequests);
router.delete('/:id', authorize('student', 'faculty'), cancelBookRequest);

router.get('/', authorize('admin', 'librarian'), getBookRequests);
router.put('/:id/approve', authorize('admin', 'librarian'), approveBookRequest);
router.put('/:id/reject', authorize('admin', 'librarian'), rejectBookRequest);

export default router;
