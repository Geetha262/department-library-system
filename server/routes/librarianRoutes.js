import express from 'express';
import {
  getLibrarians,
  createLibrarian,
  updateLibrarian,
  deleteLibrarian,
} from '../controllers/librarianController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect, authorize('admin'));

router.route('/')
  .get(getLibrarians)
  .post(createLibrarian);

router.route('/:id')
  .put(updateLibrarian)
  .delete(deleteLibrarian);

export default router;
