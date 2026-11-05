import mongoose, { Schema, Document } from 'mongoose';

export interface IAnnouncement extends Document {
  id: string;
  title: string;
  content: string;
  category: 'FESTIVAL_OFFER' | 'AUCTION_RESULT' | 'PRIZE_WINNER' | 'GENERAL';
  author: string;
  publishedAt: Date;
  targetRole: 'ALL' | 'CUSTOMER' | 'STAFF' | 'ADMIN';
  pinned?: boolean;
  priority?: 'NORMAL' | 'HIGH' | 'URGENT';
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

const AnnouncementSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    category: {
      type: String,
      enum: ['FESTIVAL_OFFER', 'AUCTION_RESULT', 'PRIZE_WINNER', 'GENERAL'],
      default: 'GENERAL',
    },
    author: { type: String, default: 'Administrator' },
    publishedAt: { type: Date, default: Date.now },
    targetRole: {
      type: String,
      enum: ['ALL', 'CUSTOMER', 'STAFF', 'ADMIN'],
      default: 'ALL',
    },
    pinned: { type: Boolean, default: false },
    priority: { type: String, enum: ['NORMAL', 'HIGH', 'URGENT'], default: 'NORMAL' },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

AnnouncementSchema.index({ publishedAt: -1 });

export const AnnouncementModel = mongoose.model<IAnnouncement>('Announcement', AnnouncementSchema);

