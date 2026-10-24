import mongoose, { Schema, Document } from 'mongoose';

export interface IBranch extends Document {
  branchCode: string;
  branchName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  managerId?: mongoose.Types.ObjectId;
  status: 'ACTIVE' | 'INACTIVE';
  companyId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const BranchSchema: Schema = new Schema(
  {
    branchCode: { type: String, required: true, unique: true },
    branchName: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    district: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    managerId: { type: Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  },
  { timestamps: true }
);

export const Branch = mongoose.model<IBranch>('Branch', BranchSchema);
