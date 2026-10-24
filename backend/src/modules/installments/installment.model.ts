import mongoose, { Schema, Document } from 'mongoose';

export interface IInstallment extends Document {
  chitGroupId: mongoose.Types.ObjectId;
  chitMemberId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  cycleId: mongoose.Types.ObjectId;
  cycleNumber: number;
  dueDate: Date;
  dueAmount: number;
  paidAmount: number;
  pendingAmount: number;
  status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'WAIVED' | 'CANCELLED';
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InstallmentSchema: Schema = new Schema(
  {
    chitGroupId: { type: Schema.Types.ObjectId, ref: 'ChitGroup', required: true },
    chitMemberId: { type: Schema.Types.ObjectId, ref: 'ChitMember', required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    cycleId: { type: Schema.Types.ObjectId, ref: 'ChitCycle', required: true },
    cycleNumber: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    dueAmount: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    pendingAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'WAIVED', 'CANCELLED'],
      default: 'PENDING',
    },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

InstallmentSchema.index({ chitMemberId: 1, cycleId: 1 }, { unique: true });
InstallmentSchema.index({ customerId: 1 });
InstallmentSchema.index({ dueDate: 1 });
InstallmentSchema.index({ status: 1 });

export const Installment = mongoose.model<IInstallment>('Installment', InstallmentSchema);
