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
