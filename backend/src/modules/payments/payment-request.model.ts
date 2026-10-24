import mongoose, { Schema, Document } from 'mongoose';

export interface IPaymentRequest extends Document {
  id: string;
  customerId: string;
  customerName: string;
  mobile: string;
  groupId: string;
  groupName?: string;
  ticketNumber?: string;
  amount: number;
  paymentMode: string;
  referenceNo: string;
  bankAccountId?: string;
  bankName?: string;
  paymentScreenshot?: string;
  screenshotUrl?: string;
  submittedAt: string;
  status: 'PENDING_VERIFICATION' | 'APPROVED' | 'REJECTED';
  remarks?: string;
  verifiedAt?: string;
  rejectedAt?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentRequestSchema: Schema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    customerId: { type: String, required: true },
    customerName: { type: String, required: true },
    mobile: { type: String },
    groupId: { type: String, required: true },
    groupName: { type: String },
    ticketNumber: { type: String },
    amount: { type: Number, required: true },
    paymentMode: { type: String, required: true },
    referenceNo: { type: String, required: true },
    bankAccountId: { type: String },
    bankName: { type: String },
    paymentScreenshot: { type: String },
    screenshotUrl: { type: String },
    submittedAt: { type: String, default: () => new Date().toISOString() },
    status: {
      type: String,
      enum: ['PENDING_VERIFICATION', 'APPROVED', 'REJECTED'],
      default: 'PENDING_VERIFICATION',
    },
    remarks: { type: String },
    verifiedAt: { type: String },
    rejectedAt: { type: String },
  },
  { timestamps: true }
);

PaymentRequestSchema.index({ id: 1 });
PaymentRequestSchema.index({ customerId: 1 });
PaymentRequestSchema.index({ status: 1 });

export const PaymentRequestModel = mongoose.model<IPaymentRequest>('PaymentRequest', PaymentRequestSchema);
