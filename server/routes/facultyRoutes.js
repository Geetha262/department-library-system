import express from 'express';
import {
  getFaculty,
  getFacultyById,
  createFaculty,
  updateFaculty,
  deleteFaculty,
} from '../controllers/facultyController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(authorize('admin', 'librarian'), getFaculty)
  .post(authorize('admin', 'librarian'), createFaculty);

router.route('/:id')
  .get(getFacultyById)
  .put(authorize('admin', 'librarian'), updateFaculty)
  .delete(authorize('admin'), deleteFaculty);

export default router;
