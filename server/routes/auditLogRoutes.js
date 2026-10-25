import express from 'express';
import { getAuditLogs } from '../controllers/auditLogController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect, authorize('admin'));

router.get('/', getAuditLogs);

export default router;
