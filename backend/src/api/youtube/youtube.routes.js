import express from 'express';
import * as youtubeController from './youtube.controller.js';
import authenticate from '../../middleware/auth.js';

const router = express.Router();

// All YouTube routes require authentication
router.use(authenticate);

router.post('/upload', youtubeController.uploadVideo);
router.get('/videos', youtubeController.listVideos);
router.put('/videos/:videoId', youtubeController.updateVideo);
router.delete('/videos/:videoId', youtubeController.deleteVideo);
router.get('/videos/:videoId/analyze', youtubeController.analyzeVideo);
router.get('/videos/:videoId/analytics', youtubeController.getVideoAnalyticsMetrics);

// Comment routes
router.get('/comments', youtubeController.listComments); // e.g., /comments?videoId=some_id
router.put('/comments/:commentId', youtubeController.updateComment);

export default router;
