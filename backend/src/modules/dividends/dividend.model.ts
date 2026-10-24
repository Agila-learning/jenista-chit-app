import mongoose, { Schema, Document } from 'mongoose';

export interface IDividend extends Document {
  dividendNumber: string;
  chitGroupId: mongoose.Types.ObjectId;
  cycleId: mongoose.Types.ObjectId;
  auctionId: mongoose.Types.ObjectId;
  memberId: mongoose.Types.ObjectId;
  amount: number;
  status: 'PENDING' | 'DISTRIBUTED' | 'ADJUSTED';
  distributedAt?: Date;
  creditedToInstallmentId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const DividendSchema: Schema = new Schema(
  {
    dividendNumber: { type: String, required: true, unique: true },
    chitGroupId: { type: Schema.Types.ObjectId, ref: 'ChitGroup', required: true },
    cycleId: { type: Schema.Types.ObjectId, ref: 'ChitCycle', required: true },
    auctionId: { type: Schema.Types.ObjectId, ref: 'Auction', required: true },
    memberId: { type: Schema.Types.ObjectId, ref: 'ChitMember', required: true },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['PENDING', 'DISTRIBUTED', 'ADJUSTED'],
      default: 'PENDING',
    },
    distributedAt: { type: Date },
    creditedToInstallmentId: { type: Schema.Types.ObjectId, ref: 'Installment' },
  },
  { timestamps: true }
);

DividendSchema.index({ chitGroupId: 1, cycleId: 1 });
DividendSchema.index({ memberId: 1 });

export const Dividend = mongoose.model<IDividend>('Dividend', DividendSchema);
