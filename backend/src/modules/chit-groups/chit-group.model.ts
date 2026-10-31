import mongoose, { Schema, Document } from 'mongoose';

export interface IChitGroup extends Document {
  groupCode: string;
  groupName: string;
  planId?: mongoose.Types.ObjectId;
  planType?: string;
  chitValue: number;
  memberCount: number;
  durationMonths: number;
  monthlyInstallment: number;
  startDate?: Date;
  endDate?: Date;
  currentCycle: number;
  branchId?: mongoose.Types.ObjectId;
  status: string;
  planSnapshot?: any;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ChitGroupSchema: Schema = new Schema(
  {
    groupCode: { type: String, required: true, unique: true },
    groupName: { type: String, required: true },
    planId: { type: Schema.Types.ObjectId, ref: 'ChitPlan', required: false },
    planType: { type: String, required: false, default: 'AUCTION' },
    chitValue: { type: Number, required: true },
    memberCount: { type: Number, required: false, default: 20 },
    durationMonths: { type: Number, required: false, default: 20 },
    monthlyInstallment: { type: Number, required: false, default: 5000 },
    startDate: { type: Date },
    endDate: { type: Date },
    currentCycle: { type: Number, default: 0 },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: false },
    status: {
      type: String,
      default: 'ACTIVE',
    },
    planSnapshot: { type: Schema.Types.Mixed, required: false, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: false },
  },
  { timestamps: true }
);

ChitGroupSchema.index({ planId: 1 });
ChitGroupSchema.index({ branchId: 1 });
ChitGroupSchema.index({ status: 1 });

export const ChitGroup = mongoose.model<IChitGroup>('ChitGroup', ChitGroupSchema);
