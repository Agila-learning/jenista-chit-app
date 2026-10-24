import mongoose, { Schema, Document } from 'mongoose';

export interface IPayment extends Document {
  paymentNumber: string;
  customerId: mongoose.Types.ObjectId;
  chitGroupId: mongoose.Types.ObjectId;
  chitMemberId: mongoose.Types.ObjectId;
  installmentId?: mongoose.Types.ObjectId;
  amount: number;
  paymentMethod: 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CARD' | 'ONLINE_GATEWAY' | 'OTHER';
  transactionReference?: string;
  gatewayReference?: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'REFUNDED' | 'REVERSED';
  paymentDate: Date;
  collectedBy?: mongoose.Types.ObjectId;
  verifiedBy?: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  notes?: string;
  idempotencyKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema: Schema = new Schema(
  {
    paymentNumber: { type: String, required: true, unique: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    chitGroupId: { type: Schema.Types.ObjectId, ref: 'ChitGroup', required: true },
    chitMemberId: { type: Schema.Types.ObjectId, ref: 'ChitMember', required: true },
    installmentId: { type: Schema.Types.ObjectId, ref: 'Installment' },
    amount: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: ['CASH', 'UPI', 'BANK_TRANSFER', 'CARD', 'ONLINE_GATEWAY', 'OTHER'],
      required: true,
    },
    transactionReference: { type: String },
    gatewayReference: { type: String },
    status: {
      type: String,
      enum: ['PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED', 'REVERSED'],
      default: 'PENDING',
    },
    paymentDate: { type: Date, default: Date.now },
    collectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    notes: { type: String },
    idempotencyKey: { type: String, unique: true, sparse: true },
  },
  { timestamps: true }
);

PaymentSchema.index({ paymentNumber: 1 });
PaymentSchema.index({ transactionReference: 1 });
PaymentSchema.index({ customerId: 1 });
PaymentSchema.index({ chitGroupId: 1 });
PaymentSchema.index({ paymentDate: 1 });

export const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);
