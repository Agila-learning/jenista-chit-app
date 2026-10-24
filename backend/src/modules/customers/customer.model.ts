import mongoose, { Schema, Document } from 'mongoose';

export interface ICustomer extends Document {
  customerCode: string;
  fullName: string;
  phone: string;
  alternatePhone?: string;
  email?: string;
  passwordHash?: string;
  dateOfBirth?: Date;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  photo?: string;
  address: string;
  occupation?: string;
  branchId: mongoose.Types.ObjectId;
  assignedAgentId?: mongoose.Types.ObjectId;
  kycStatus: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';
  nominee?: {
    name: string;
    relationship: string;
    phone: string;
    address: string;
  };
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING_APPROVAL' | 'REJECTED';
  chits?: any[];
  pending?: number;
  totalPaid?: number;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema: Schema = new Schema(
  {
    customerCode: { type: String, unique: true },
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    alternatePhone: { type: String },
    email: { type: String },
    passwordHash: { type: String },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ['MALE', 'FEMALE', 'OTHER'] },
    photo: { type: String },
    address: { type: String },
    occupation: { type: String },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch' },
    assignedAgentId: { type: Schema.Types.ObjectId, ref: 'User' },
    kycStatus: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED'],
      default: 'PENDING',
    },
    nominee: {
      name: { type: String },
      relationship: { type: String },
      phone: { type: String },
      address: { type: String },
    },
    status: { 
      type: String, 
      enum: ['ACTIVE', 'INACTIVE', 'PENDING_APPROVAL', 'REJECTED'], 
      default: 'PENDING_APPROVAL' 
    },
    chits: { type: Array, default: [] },
    pending: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

CustomerSchema.index({ phone: 1 });
CustomerSchema.index({ branchId: 1 });
CustomerSchema.index({ status: 1 });

export const Customer = mongoose.model<ICustomer>('Customer', CustomerSchema);
