import express from 'express';
import {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
} from '../controllers/studentController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(authorize('admin', 'librarian'), getStudents)
  .post(authorize('admin', 'librarian'), createStudent);

router.route('/:id')
  .get(getStudentById)
  .put(authorize('admin', 'librarian'), updateStudent)
  .delete(authorize('admin'), deleteStudent);

export default router;
