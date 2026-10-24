import mongoose, { Schema, Document } from 'mongoose';

export interface IChitMember extends Document {
  chitGroupId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  ticketNumber: number;
  joiningDate: Date;
  installmentAmount: number;
  agentId?: mongoose.Types.ObjectId;
  status: 'ACTIVE' | 'INACTIVE' | 'COMPLETED' | 'DEFAULTED' | 'CANCELLED';
  totalPaid: number;
  totalDue: number;
  totalPending: number;
  overdueAmount: number;
  prizeTaken: boolean;
  prizeCycleId?: mongoose.Types.ObjectId;
  securityStatus?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ChitMemberSchema: Schema = new Schema(
  {
    chitGroupId: { type: Schema.Types.ObjectId, ref: 'ChitGroup', required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    ticketNumber: { type: Number, required: true },
    joiningDate: { type: Date, default: Date.now },
    installmentAmount: { type: Number, required: true },
    agentId: { type: Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'COMPLETED', 'DEFAULTED', 'CANCELLED'],
      default: 'ACTIVE',
    },
    totalPaid: { type: Number, default: 0 },
    totalDue: { type: Number, default: 0 },
    totalPending: { type: Number, default: 0 },
    overdueAmount: { type: Number, default: 0 },
    prizeTaken: { type: Boolean, default: false },
    prizeCycleId: { type: Schema.Types.ObjectId, ref: 'ChitCycle' },
    securityStatus: { type: String },
  },
  { timestamps: true }
);

ChitMemberSchema.index({ chitGroupId: 1, ticketNumber: 1 }, { unique: true });
ChitMemberSchema.index({ customerId: 1 });
ChitMemberSchema.index({ agentId: 1 });

export const ChitMember = mongoose.model<IChitMember>('ChitMember', ChitMemberSchema);
