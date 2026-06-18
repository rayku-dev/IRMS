import { Router } from 'express';
import { getAuditLogs, getStats } from '../controllers/auditController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/stats', authenticate, authorize(['admin', 'user']), getStats);
router.get('/', authenticate, authorize(['admin']), getAuditLogs);

export default router;
