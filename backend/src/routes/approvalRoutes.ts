import express from 'express';
import { getPendingApprovals, approveRequest, rejectRequest } from '../controllers/approvalController.js';
import { protect, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// All approval routes are protected and require admin role
router.use(protect);
router.use(requireAdmin);

router.get('/pending', getPendingApprovals);
router.post('/:id/approve', approveRequest);
router.post('/:id/reject', rejectRequest);

export default router;
