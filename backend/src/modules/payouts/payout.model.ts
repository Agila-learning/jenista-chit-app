import mongoose, { Schema, Document } from 'mongoose';

export interface IPayout extends Document {
  payoutNumber: string;
  customerId: mongoose.Types.ObjectId;
  chitGroupId: mongoose.Types.ObjectId;
  chitMemberId: mongoose.Types.ObjectId;
  cycleId: mongoose.Types.ObjectId;
  auctionId?: mongoose.Types.ObjectId;
  planType: 'FIXED' | 'AUCTION';
  grossAmount: number;
  deductions: number;
  netAmount: number;
  paymentMethod?: string;
  bankReference?: string;
  status: 'PENDING' | 'APPROVED' | 'PROCESSING' | 'PAID' | 'FAILED' | 'CANCELLED';
  approvedBy?: mongoose.Types.ObjectId;
  processedBy?: mongoose.Types.ObjectId;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PayoutSchema: Schema = new Schema(
  {
    payoutNumber: { type: String, required: true, unique: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    chitGroupId: { type: Schema.Types.ObjectId, ref: 'ChitGroup', required: true },
    chitMemberId: { type: Schema.Types.ObjectId, ref: 'ChitMember', required: true },
    cycleId: { type: Schema.Types.ObjectId, ref: 'ChitCycle', required: true },
    auctionId: { type: Schema.Types.ObjectId, ref: 'Auction' },
    planType: { type: String, enum: ['FIXED', 'AUCTION'], required: true },
    grossAmount: { type: Number, required: true },
    deductions: { type: Number, default: 0 },
    netAmount: { type: Number, required: true },
    paymentMethod: { type: String },
    bankReference: { type: String },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED'],
      default: 'PENDING',
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    processedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

PayoutSchema.index({ chitGroupId: 1, cycleId: 1 });

export const Payout = mongoose.model<IPayout>('Payout', PayoutSchema);
