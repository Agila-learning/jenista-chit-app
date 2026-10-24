import { Router } from 'express';
import { DocumentController } from './document.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

const router = Router();

router.use(authenticate);

router.post('/', authorize(['documents.create']), DocumentController.uploadDocumentMetadata);
router.get('/:entityType/:entityId', authorize(['documents.read']), DocumentController.getDocumentsByEntity);
router.patch('/:id/verify', authorize(['documents.verify']), DocumentController.verifyDocument);

export default router;
