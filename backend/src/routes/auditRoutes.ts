import { Router } from 'express';
import { getAuditLogs, getStats, getDisposals } from '../controllers/auditController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize(['admin']), getAuditLogs);
router.get('/disposals', authorize(['admin']), getDisposals);
router.get('/stats', authorize(['admin', 'user']), getStats);

export default router;
