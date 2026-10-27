import mongoose, { Schema, Document } from 'mongoose';

export interface IChitPlan extends Document {
  planCode: string;
  planName: string;
  planType: 'FIXED' | 'AUCTION';
  description?: string;
  chitValue: number;
  memberCount: number;
  durationMonths: number;
  monthlyInstallment: number;
  startDate?: Date;
  endDate?: Date;
  configuration: any;
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  companyId: mongoose.Types.ObjectId;
  branchId?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ChitPlanSchema: Schema = new Schema(
  {
    planCode: { type: String, required: true, unique: true },
    planName: { type: String, required: true },
    planType: { type: String, enum: ['FIXED', 'AUCTION'], required: true },
    description: { type: String },
    chitValue: { type: Number, required: true },
    memberCount: { type: Number, required: true },
    durationMonths: { type: Number, required: true },
    monthlyInstallment: { type: Number, required: true },
    startDate: { type: Date },
    endDate: { type: Date },
    configuration: { type: Schema.Types.Mixed, required: true }, // Flexible rules config
    status: {
      type: String,
      enum: ['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED'],
      default: 'DRAFT',
    },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

ChitPlanSchema.index({ planType: 1 });
ChitPlanSchema.index({ status: 1 });

export const ChitPlan = mongoose.model<IChitPlan>('ChitPlan', ChitPlanSchema);
