import mongoose, { Schema, Document } from 'mongoose';

export interface IWithdrawalRequest extends Document {
  id: string;
  customerId: string;
  customerName: string;
  mobile?: string;
  groupId: string;
  groupName?: string;
  ticketNumber?: string;
  chitValue?: number;
  eligibleAmount: number;
  payoutMethod: string;
  payoutDetails: {
    bankName?: string;
    accountNumber?: string;
    ifsc?: string;
    accountHolderName?: string;
    upiId?: string;
  };
  requestedAt: string;
  status: 'PENDING_ADMIN_DISBURSAL' | 'DISBURSED' | 'REJECTED';
  disbursedAt?: string;
  disbursedRef?: string;
  disbursedAmount?: number;
  disbursedMode?: string;
  customerAcknowledged?: boolean;
  customerAcknowledgedAt?: string;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WithdrawalRequestSchema: Schema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    customerId: { type: String, required: false },
    customerName: { type: String, required: false },
    mobile: { type: String },
    groupId: { type: String, required: false },
    groupName: { type: String },
    ticketNumber: { type: String },
    chitValue: { type: Number, default: 100000 },
    eligibleAmount: { type: Number, required: true },
    payoutMethod: { type: String, default: 'Bank Transfer' },
    payoutDetails: {
      bankName: { type: String },
      accountNumber: { type: String },
      ifsc: { type: String },
      accountHolderName: { type: String },
      upiId: { type: String },
    },
    requestedAt: { type: String, default: () => new Date().toISOString() },
    status: {
      type: String,
      default: 'PENDING_ADMIN_DISBURSAL',
    },
    disbursedAt: { type: String },
    disbursedRef: { type: String },
    disbursedAmount: { type: Number },
    disbursedMode: { type: String },
    customerAcknowledged: { type: Boolean, default: false },
    customerAcknowledgedAt: { type: String },
    remarks: { type: String },
  },
  { timestamps: true }
);

WithdrawalRequestSchema.index({ id: 1 });
WithdrawalRequestSchema.index({ customerId: 1 });
WithdrawalRequestSchema.index({ status: 1 });

export const WithdrawalRequestModel = mongoose.model<IWithdrawalRequest>('WithdrawalRequest', WithdrawalRequestSchema);
