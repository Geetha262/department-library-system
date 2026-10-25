import express from 'express';
import { getSettings, updateSettings } from '../controllers/settingController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
const router = express.Router();
router.use(protect);
router.get('/', getSettings);
router.put('/', authorize('admin'), updateSettings);
export default router;
