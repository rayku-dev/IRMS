import { Router } from 'express';
import { getSectionById, getSectionBySlug, getSectionByName, getSections, createSection, updateSection, deleteSection, listSectionTypes, createSectionType, updateSectionType, deleteSectionType } from '../controllers/sectionController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticate);

router.get('/', getSections);
router.get('/types', listSectionTypes);
router.get('/:id', getSectionById);
router.get('/by-slug/:slug', getSectionBySlug);
router.get('/by-name/:name', getSectionByName);

router.post('/', authorize(['admin']), createSection);
router.put('/:id', authorize(['admin']), updateSection);
router.delete('/:id', authorize(['admin']), deleteSection);

// Section Types
router.post('/types', authorize(['admin']), createSectionType);
router.put('/types/:id', authorize(['admin']), updateSectionType);
router.delete('/types/:id', authorize(['admin']), deleteSectionType);

export default router;
