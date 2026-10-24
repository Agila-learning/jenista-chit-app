import mongoose, { Schema, Document } from 'mongoose';

export interface IChitCycle extends Document {
  chitGroupId: mongoose.Types.ObjectId;
  cycleNumber: number;
  dueDate: Date;
  auctionDate?: Date;
  expectedCollection: number;
  actualCollection: number;
  pendingCollection: number;
  planType: 'FIXED' | 'AUCTION';
  auctionId?: mongoose.Types.ObjectId;
  status: 'UPCOMING' | 'COLLECTION_OPEN' | 'AUCTION_SCHEDULED' | 'AUCTION_IN_PROGRESS' | 'AUCTION_COMPLETED' | 'PAYOUT_PENDING' | 'CLOSED';
  createdAt: Date;
  updatedAt: Date;
}

const ChitCycleSchema: Schema = new Schema(
  {
    chitGroupId: { type: Schema.Types.ObjectId, ref: 'ChitGroup', required: true },
    cycleNumber: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    auctionDate: { type: Date },
    expectedCollection: { type: Number, default: 0 },
    actualCollection: { type: Number, default: 0 },
    pendingCollection: { type: Number, default: 0 },
    planType: { type: String, enum: ['FIXED', 'AUCTION'], required: true },
    auctionId: { type: Schema.Types.ObjectId, ref: 'Auction' },
    status: {
      type: String,
      enum: [
        'UPCOMING',
        'COLLECTION_OPEN',
        'AUCTION_SCHEDULED',
        'AUCTION_IN_PROGRESS',
        'AUCTION_COMPLETED',
        'PAYOUT_PENDING',
        'CLOSED',
      ],
      default: 'UPCOMING',
    },
  },
  { timestamps: true }
);

ChitCycleSchema.index({ chitGroupId: 1, cycleNumber: 1 }, { unique: true });

export const ChitCycle = mongoose.model<IChitCycle>('ChitCycle', ChitCycleSchema);
