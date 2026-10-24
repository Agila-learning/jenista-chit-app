import mongoose, { Schema, Document } from 'mongoose';

export interface ILedger extends Document {
  transactionId: string;
  date: Date;
  accountType: 'COMPANY_CASH' | 'BRANCH_CASH' | 'BANK_ACCOUNT' | 'CHIT_GROUP' | 'CUSTOMER' | 'COMMISSION' | 'EXPENSE';
  entityId?: mongoose.Types.ObjectId; // Customer ID, Group ID, Branch ID, etc.
  referenceType: 'PAYMENT' | 'PAYOUT' | 'DIVIDEND' | 'COMMISSION' | 'FEE' | 'EXPENSE' | 'TRANSFER';
  referenceId: mongoose.Types.ObjectId; // Payment ID, Payout ID, etc.
  debit: number;
  credit: number;
  balance: number;
  description?: string;
  branchId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const LedgerSchema: Schema = new Schema(
  {
    transactionId: { type: String, required: true, unique: true },
    date: { type: Date, default: Date.now, required: true },
    accountType: {
      type: String,
      enum: ['COMPANY_CASH', 'BRANCH_CASH', 'BANK_ACCOUNT', 'CHIT_GROUP', 'CUSTOMER', 'COMMISSION', 'EXPENSE'],
      required: true,
    },
    entityId: { type: Schema.Types.ObjectId },
    referenceType: {
      type: String,
      enum: ['PAYMENT', 'PAYOUT', 'DIVIDEND', 'COMMISSION', 'FEE', 'EXPENSE', 'TRANSFER'],
      required: true,
    },
    referenceId: { type: Schema.Types.ObjectId, required: true },
    debit: { type: Number, default: 0 },
    credit: { type: Number, default: 0 },
    balance: { type: Number, required: true }, // Running balance logic needed
    description: { type: String },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

LedgerSchema.index({ accountType: 1, entityId: 1 });
LedgerSchema.index({ referenceType: 1, referenceId: 1 });
LedgerSchema.index({ date: 1 });

export const Ledger = mongoose.model<ILedger>('Ledger', LedgerSchema);
