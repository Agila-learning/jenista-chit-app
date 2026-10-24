import mongoose, { Schema, Document as MongooseDocument } from 'mongoose';

export interface IDocument extends MongooseDocument {
  entityType: 'CUSTOMER' | 'CHIT_GROUP' | 'USER' | 'COMPANY';
  entityId: mongoose.Types.ObjectId;
  documentType: 'ID_PROOF' | 'ADDRESS_PROOF' | 'INCOME_PROOF' | 'PHOTO' | 'AGREEMENT' | 'RECEIPT' | 'OTHER';
  documentName: string;
  s3Key: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  status: 'UPLOADED' | 'VERIFIED' | 'REJECTED';
  uploadedBy: mongoose.Types.ObjectId;
  verifiedBy?: mongoose.Types.ObjectId;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DocumentSchema: Schema = new Schema(
  {
    entityType: {
      type: String,
      enum: ['CUSTOMER', 'CHIT_GROUP', 'USER', 'COMPANY'],
      required: true,
    },
    entityId: { type: Schema.Types.ObjectId, required: true },
    documentType: {
      type: String,
      enum: ['ID_PROOF', 'ADDRESS_PROOF', 'INCOME_PROOF', 'PHOTO', 'AGREEMENT', 'RECEIPT', 'OTHER'],
      required: true,
    },
    documentName: { type: String, required: true },
    s3Key: { type: String, required: true, unique: true },
    originalFilename: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    status: {
      type: String,
      enum: ['UPLOADED', 'VERIFIED', 'REJECTED'],
      default: 'UPLOADED',
    },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: { type: Date },
  },
  { timestamps: true }
);

DocumentSchema.index({ entityType: 1, entityId: 1 });
DocumentSchema.index({ status: 1 });

export const AppDocument = mongoose.model<IDocument>('Document', DocumentSchema);
