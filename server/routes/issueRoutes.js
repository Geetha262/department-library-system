import express from 'express';
import {
  createIssue,
  getIssues,
  getOverdueIssues,
  getIssueById,
  createBorrowRequest,
} from '../controllers/issueController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getIssues)
  .post(authorize('admin', 'librarian'), createIssue);

router.get('/overdue', getOverdueIssues);

router.post('/request', authorize('student', 'faculty'), createBorrowRequest);

router.get('/:id', getIssueById);

export default router;
