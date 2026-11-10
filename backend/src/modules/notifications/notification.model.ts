import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  customerId: mongoose.Types.ObjectId;
  type: 'PAYMENT_REMINDER' | 'PAYMENT_RECEIPT' | 'AUCTION_INVITE' | 'AUCTION_WINNER' | 'DIVIDEND_UPDATE' | 'KYC_STATUS';
  channel: 'SMS' | 'EMAIL' | 'WHATSAPP' | 'IN_APP';
  content: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  scheduledFor?: Date;
  sentAt?: Date;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema: Schema = new Schema(
  {
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    type: {
      type: String,
      enum: ['PAYMENT_REMINDER', 'PAYMENT_RECEIPT', 'AUCTION_INVITE', 'AUCTION_WINNER', 'DIVIDEND_UPDATE', 'KYC_STATUS'],
      required: true,
    },
    channel: {
      type: String,
      enum: ['SMS', 'EMAIL', 'WHATSAPP', 'IN_APP'],
      required: true,
    },
    content: { type: String, required: true },
    status: {
      type: String,
      enum: ['PENDING', 'SENT', 'FAILED'],
      default: 'PENDING',
    },
    scheduledFor: { type: Date },
    sentAt: { type: Date },
    retryCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

NotificationSchema.index({ customerId: 1, status: 1 });
NotificationSchema.index({ scheduledFor: 1, status: 1 });

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);

// Universal System Notification (for Mobile & Web real-time sync)
export interface ISystemNotification extends Document {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  targetRole: string;
  targetUserId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const SystemNotificationSchema: Schema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    timestamp: { type: String, default: () => new Date().toISOString() },
    isRead: { type: Boolean, default: false },
    targetRole: { type: String, default: 'ALL' },
    targetUserId: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

SystemNotificationSchema.index({ targetRole: 1, isRead: 1 });
SystemNotificationSchema.index({ targetUserId: 1 });

export const SystemNotificationModel = mongoose.model<ISystemNotification>(
  'SystemNotification',
  SystemNotificationSchema
);

