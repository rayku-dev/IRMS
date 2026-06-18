import express from 'express';
import { getPendingApprovals, approveRequest, rejectRequest } from '../controllers/approvalController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// All approval routes are protected and require admin role
router.use(authenticate);
router.use(authorize(['admin']));

router.get('/pending', getPendingApprovals);
router.post('/:id/approve', approveRequest);
router.post('/:id/reject', rejectRequest);

export default router;
