import mongoose, { Schema, Document } from 'mongoose';

export interface IAuction extends Document {
  auctionNumber: string;
  chitGroupId: mongoose.Types.ObjectId;
  cycleId: mongoose.Types.ObjectId;
  scheduledDate: Date;
  scheduledTime?: string;
  status: 'SCHEDULED' | 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'FINALIZED' | 'CANCELLED';
  totalChitValue: number;
  minimumBid: number;
  maximumBid: number;
  winnerRule: string;
  winningBid?: number;
  winnerMemberId?: mongoose.Types.ObjectId;
  prizeAmount?: number;
  commissionAmount?: number;
  dividendAmount?: number;
  conductedBy?: mongoose.Types.ObjectId;
  finalizedBy?: mongoose.Types.ObjectId;
  finalizedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AuctionSchema: Schema = new Schema(
  {
    auctionNumber: { type: String, required: true, unique: true },
    chitGroupId: { type: Schema.Types.ObjectId, ref: 'ChitGroup', required: true },
    cycleId: { type: Schema.Types.ObjectId, ref: 'ChitCycle', required: true },
    scheduledDate: { type: Date, required: true },
    scheduledTime: { type: String },
    status: {
      type: String,
      enum: ['SCHEDULED', 'OPEN', 'IN_PROGRESS', 'COMPLETED', 'FINALIZED', 'CANCELLED'],
      default: 'SCHEDULED',
    },
    totalChitValue: { type: Number, required: true },
    minimumBid: { type: Number, required: true },
    maximumBid: { type: Number, required: true },
    winnerRule: { type: String, required: true },
    winningBid: { type: Number },
    winnerMemberId: { type: Schema.Types.ObjectId, ref: 'ChitMember' },
    prizeAmount: { type: Number },
    commissionAmount: { type: Number },
    dividendAmount: { type: Number },
    conductedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    finalizedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    finalizedAt: { type: Date },
  },
  { timestamps: true }
);

AuctionSchema.index({ chitGroupId: 1, cycleId: 1 }, { unique: true });
AuctionSchema.index({ status: 1 });
AuctionSchema.index({ scheduledDate: 1 });

export const Auction = mongoose.model<IAuction>('Auction', AuctionSchema);
