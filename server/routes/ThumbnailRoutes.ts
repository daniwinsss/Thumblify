import express from 'express';
import { deleteThumbnail, generateThumbnail, testCloudinaryConfig } from '../controllers/ThumbnailController';
import protect from '../middlewares/auth';

const ThumbnailRouter = express.Router();

ThumbnailRouter.post('/generate',protect, generateThumbnail);
ThumbnailRouter.delete('/delete/:id',protect, deleteThumbnail);
ThumbnailRouter.get('/test-cloudinary', testCloudinaryConfig); // Test endpoint (no auth needed for debugging)

export default ThumbnailRouter;
