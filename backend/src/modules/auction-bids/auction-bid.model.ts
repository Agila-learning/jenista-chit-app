import mongoose, { Schema, Document } from 'mongoose';

export interface IAuctionBid extends Document {
  auctionId: mongoose.Types.ObjectId;
  chitGroupId: mongoose.Types.ObjectId;
  memberId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  bidAmount: number;
  submittedAt: Date;
  submittedBy: mongoose.Types.ObjectId;
  status: 'VALID' | 'WINNING' | 'REJECTED' | 'CANCELLED';
  createdAt: Date;
  updatedAt: Date;
}

const AuctionBidSchema: Schema = new Schema(
  {
    auctionId: { type: Schema.Types.ObjectId, ref: 'Auction', required: true },
    chitGroupId: { type: Schema.Types.ObjectId, ref: 'ChitGroup', required: true },
    memberId: { type: Schema.Types.ObjectId, ref: 'ChitMember', required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    bidAmount: { type: Number, required: true },
    submittedAt: { type: Date, default: Date.now },
    submittedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['VALID', 'WINNING', 'REJECTED', 'CANCELLED'],
      default: 'VALID',
    },
  },
  { timestamps: true }
);

AuctionBidSchema.index({ auctionId: 1, memberId: 1 });
AuctionBidSchema.index({ bidAmount: -1 });

export const AuctionBid = mongoose.model<IAuctionBid>('AuctionBid', AuctionBidSchema);
