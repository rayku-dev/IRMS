import { Router } from 'express';
import { uploadFile, getFiles, deleteFile, downloadFile, moveFile } from '../controllers/fileController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = Router();

router.use(authenticate);

router.post('/upload', upload.single('file'), uploadFile);
router.get('/', getFiles);
router.get('/download/:id', downloadFile);
router.delete('/:id', authorize(['admin']), deleteFile);
router.put('/:id/move', moveFile);

export default router;
