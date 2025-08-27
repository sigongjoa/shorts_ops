import express from 'express';
import * as docsController from './docs.controller.js';
import authenticate from '../../middleware/auth.js';

const router = express.Router();

// All Docs routes require authentication
router.use(authenticate);

router.post('/', docsController.createDocument);
router.get('/:documentId', docsController.getDocumentContent);
router.post('/:documentId/batchUpdate', docsController.batchUpdateDocument);

export default router;
