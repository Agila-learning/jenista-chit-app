import mongoose, { Schema, Document } from 'mongoose';

export interface ICompanyExpense extends Document {
  expenseNumber: string;
  branchId: mongoose.Types.ObjectId;
  amount: number;
  category: string;
  date: Date;
  description: string;
  status: 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED';
  approvedBy?: mongoose.Types.ObjectId;
  paymentMethod?: string;
  reference?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CompanyExpenseSchema: Schema = new Schema(
  {
    expenseNumber: { type: String, required: true, unique: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    amount: { type: Number, required: true },
    category: { type: String, required: true },
    date: { type: Date, required: true },
    description: { type: String, required: true },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'PAID', 'REJECTED'],
      default: 'PENDING',
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    paymentMethod: { type: String },
    reference: { type: String },
  },
  { timestamps: true }
);

CompanyExpenseSchema.index({ branchId: 1, date: 1 });

export const CompanyExpense = mongoose.model<ICompanyExpense>('CompanyExpense', CompanyExpenseSchema);
