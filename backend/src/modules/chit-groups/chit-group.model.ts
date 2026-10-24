import mongoose, { Schema, Document } from 'mongoose';

export interface IChitGroup extends Document {
  groupCode: string;
  groupName: string;
  planId: mongoose.Types.ObjectId;
  planType: 'FIXED' | 'AUCTION';
  chitValue: number;
  memberCount: number;
  durationMonths: number;
  monthlyInstallment: number;
  startDate?: Date;
  endDate?: Date;
  currentCycle: number;
  branchId: mongoose.Types.ObjectId;
  status: 'DRAFT' | 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'SUSPENDED' | 'CANCELLED';
  planSnapshot: any; // Important: Historical version of the plan configuration
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ChitGroupSchema: Schema = new Schema(
  {
    groupCode: { type: String, required: true, unique: true },
    groupName: { type: String, required: true },
    planId: { type: Schema.Types.ObjectId, ref: 'ChitPlan', required: true },
    planType: { type: String, enum: ['FIXED', 'AUCTION'], required: true },
    chitValue: { type: Number, required: true },
    memberCount: { type: Number, required: true },
    durationMonths: { type: Number, required: true },
    monthlyInstallment: { type: Number, required: true },
    startDate: { type: Date },
    endDate: { type: Date },
    currentCycle: { type: Number, default: 0 },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    status: {
      type: String,
      enum: ['DRAFT', 'UPCOMING', 'ACTIVE', 'COMPLETED', 'SUSPENDED', 'CANCELLED'],
      default: 'DRAFT',
    },
    planSnapshot: { type: Schema.Types.Mixed, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

ChitGroupSchema.index({ groupCode: 1 });
ChitGroupSchema.index({ planId: 1 });
ChitGroupSchema.index({ branchId: 1 });
ChitGroupSchema.index({ status: 1 });

export const ChitGroup = mongoose.model<IChitGroup>('ChitGroup', ChitGroupSchema);
