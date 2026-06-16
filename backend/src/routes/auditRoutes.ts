import { Router } from 'express';
import { getAuditLogs, createAuditLog } from '../controllers/auditController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticate);

router.get('/', getAuditLogs);
router.post('/', createAuditLog);

export default router;
