import { Router } from 'express';
import { uploadFile, getFiles, deleteFile, downloadFile, moveFile, getPublicLink, getPublicFileInfo, downloadPublicFile, downloadTemplate, uploadTemplate, updateFileMetadata, uploadFileVersion, getFileVersions, getComments, queueForDisposal } from '../controllers/fileController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = Router();

router.get('/info/:id', getPublicFileInfo);
router.get('/public/:token', downloadPublicFile);
router.get('/template/:name', downloadTemplate);

router.use(authenticate);

router.post('/template/:name', authorize(['admin']), upload.single('file'), uploadTemplate);
router.post('/upload', upload.single('file'), uploadFile);
router.get('/', getFiles);
router.get('/download/:id', downloadFile);
router.get('/:id/public-link', getPublicLink);
router.get('/:id/versions', getFileVersions);
router.post('/:id/versions', upload.single('file'), uploadFileVersion);
router.get('/:id/comments', getComments);
router.post('/:id/dispose', authorize(['admin']), queueForDisposal);
router.delete('/:id', authorize(['admin', 'user']), deleteFile);
router.put('/:id/move', moveFile);
router.put('/:id/metadata', updateFileMetadata);

export default router;
