import { Request, Response, NextFunction } from 'express';
import { AppDocument } from './document.model';
import { AuthRequest } from '../../middleware/authenticate';
import { ApiError } from '../../common/ApiError';

export class DocumentController {
  static async uploadDocumentMetadata(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // In a real flow, you'd upload to S3 here or accept an S3 key from a pre-signed URL upload
      const { entityType, entityId, documentType, documentName, s3Key, originalFilename, mimeType, size } = req.body;
      const doc = await AppDocument.create({
        entityType,
        entityId,
        documentType,
        documentName,
        s3Key,
        originalFilename,
        mimeType,
        size,
        uploadedBy: req.user!.userId,
      });

      res.status(201).json({ success: true, data: doc });
    } catch (error) {
      next(error);
    }
  }

  static async getDocumentsByEntity(req: Request, res: Response, next: NextFunction) {
    try {
      const { entityType, entityId } = req.params;
      const filter: any = { entityType, entityId: entityId as string };
      const docs = await AppDocument.find(filter);
      res.status(200).json({ success: true, data: docs });
    } catch (error) {
      next(error);
    }
  }
  static async verifyDocument(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status } = req.body; // VERIFIED or REJECTED

      if (!['VERIFIED', 'REJECTED'].includes(status)) {
        throw new ApiError(400, 'Invalid status', 'VALIDATION_ERROR');
      }

      const doc = await AppDocument.findByIdAndUpdate(
        id,
        {
          status,
          verifiedBy: req.user!.userId,
          verifiedAt: new Date()
        },
        { new: true }
      );

      if (!doc) throw new ApiError(404, 'Document not found', 'NOT_FOUND');

      res.status(200).json({ success: true, data: doc });
    } catch (error) {
      next(error);
    }
  }
}
