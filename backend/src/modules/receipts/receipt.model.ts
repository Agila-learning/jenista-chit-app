import mongoose, { Schema, Document } from 'mongoose';

export interface IReceipt extends Document {
  receiptNumber: string;
  paymentId?: mongoose.Types.ObjectId;
  customerId?: string;
  customerName?: string;
  chitGroupId?: string;
  groupName?: string;
  amount: number;
  paymentMethod: string;
  referenceNo?: string;
  executive?: string;
  generatedBy?: string;
  receiptDate: Date;
  status: 'ACTIVE' | 'CANCELLED';
  createdAt: Date;
  updatedAt: Date;
}

const ReceiptSchema: Schema = new Schema(
  {
    receiptNumber: { type: String, required: true, unique: true },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', required: false },
    customerId: { type: String, required: false },
    customerName: { type: String, required: false },
    chitGroupId: { type: String, required: false },
    groupName: { type: String, required: false },
    amount: { type: Number, required: true },
    paymentMethod: { type: String, required: true, default: 'CASH' },
    referenceNo: { type: String, default: '' },
    executive: { type: String, default: '' },
    generatedBy: { type: String, default: '' },
    receiptDate: { type: Date, default: Date.now },
    status: { type: String, enum: ['ACTIVE', 'CANCELLED'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

ReceiptSchema.index({ receiptNumber: 1 });
ReceiptSchema.index({ customerId: 1 });
ReceiptSchema.index({ receiptDate: -1 });

export const Receipt = mongoose.model<IReceipt>('Receipt', ReceiptSchema);
