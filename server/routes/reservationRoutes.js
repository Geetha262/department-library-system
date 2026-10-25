import express from 'express';
import {
  cancelReservation,
  getMyReservations,
  getReservationById,
  getReservations,
} from '../controllers/reservationController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.get('/', authorize('admin', 'librarian'), getReservations);
router.get('/my', authorize('student', 'faculty'), getMyReservations);
router.get('/:id', authorize('admin', 'librarian', 'student', 'faculty'), getReservationById);
router.patch('/:id/cancel', authorize('admin', 'librarian', 'student', 'faculty'), cancelReservation);
router.delete('/:id', authorize('admin', 'librarian', 'student', 'faculty'), cancelReservation);

export default router;