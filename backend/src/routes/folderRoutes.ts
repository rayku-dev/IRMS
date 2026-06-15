import { Router } from 'express';
import { createFolder, getFolderById, updateFolder, deleteFolder } from '../controllers/folderController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticate);

router.post('/', authorize(['admin']), createFolder);
router.get('/:id', getFolderById);
router.put('/:id', authorize(['admin']), updateFolder);
router.delete('/:id', authorize(['admin']), deleteFolder);

export default router;
