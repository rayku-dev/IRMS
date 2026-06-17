import { Router } from 'express';
import { uploadFile, getFiles, deleteFile, downloadFile, moveFile, getPublicLink, downloadPublicFile, downloadTemplate, uploadTemplate } from '../controllers/fileController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = Router();

router.get('/public/:token', downloadPublicFile);
router.get('/template/:name', downloadTemplate);

router.use(authenticate);

router.post('/template/:name', authorize(['admin']), upload.single('file'), uploadTemplate);
router.post('/upload', upload.single('file'), uploadFile);
router.get('/', getFiles);
router.get('/download/:id', downloadFile);
router.get('/:id/public-link', getPublicLink);
router.delete('/:id', authorize(['admin']), deleteFile);
router.put('/:id/move', moveFile);

export default router;
