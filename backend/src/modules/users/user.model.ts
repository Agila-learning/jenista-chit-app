import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  userCode: string;
  name: string;
  email?: string;
  phone: string;
  passwordHash: string;
  roleIds: mongoose.Types.ObjectId[];
  branchIds: mongoose.Types.ObjectId[];
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'LOCKED';
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    userCode: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, unique: true, sparse: true },
    phone: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    roleIds: [{ type: Schema.Types.ObjectId, ref: 'Role' }],
    branchIds: [{ type: Schema.Types.ObjectId, ref: 'Branch' }],
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'LOCKED'],
      default: 'ACTIVE',
    },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>('User', UserSchema);
