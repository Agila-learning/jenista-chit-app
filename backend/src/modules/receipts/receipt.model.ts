import mongoose, { Schema, Document } from 'mongoose';

export interface IReceipt extends Document {
  receiptNumber: string;
  paymentId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  chitGroupId: mongoose.Types.ObjectId;
  amount: number;
  paymentMethod: string;
  receiptDate: Date;
  generatedBy?: mongoose.Types.ObjectId;
  pdfS3Key?: string;
  status: 'ACTIVE' | 'CANCELLED';
  createdAt: Date;
  updatedAt: Date;
}

const ReceiptSchema: Schema = new Schema(
  {
    receiptNumber: { type: String, required: true, unique: true },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    chitGroupId: { type: Schema.Types.ObjectId, ref: 'ChitGroup', required: true },
    amount: { type: Number, required: true },
    paymentMethod: { type: String, required: true },
    receiptDate: { type: Date, default: Date.now },
    generatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    pdfS3Key: { type: String },
    status: { type: String, enum: ['ACTIVE', 'CANCELLED'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

ReceiptSchema.index({ paymentId: 1 });
ReceiptSchema.index({ customerId: 1 });

export const Receipt = mongoose.model<IReceipt>('Receipt', ReceiptSchema);
