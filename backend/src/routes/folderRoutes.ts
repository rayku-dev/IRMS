import { Router } from 'express';
import { createFolder, getFolderById, updateFolder, deleteFolder, getFolders, getPublicFolderInfo, queueArchiveFolder, queueDisposeFolder, permanentlyDisposeFolder } from '../controllers/folderController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/info/:id', getPublicFolderInfo);

router.use(authenticate);

router.get('/', getFolders);
router.post('/', authorize(['admin']), createFolder);
router.get('/:id', getFolderById);
router.put('/:id', authorize(['admin', 'user']), updateFolder);
router.delete('/:id', authorize(['admin', 'user']), deleteFolder);
router.post('/:id/queue-archive', authorize(['admin', 'user']), queueArchiveFolder);
router.post('/:id/queue-disposal', authorize(['admin', 'user']), queueDisposeFolder);
router.delete('/:id/permanently-dispose', authorize(['admin']), permanentlyDisposeFolder);

export default router;
