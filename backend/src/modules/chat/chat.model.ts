import mongoose, { Schema, Document } from 'mongoose';

export interface IChatMessage extends Document {
  conversationId: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  senderId: string;
  senderName: string;
  senderRole: 'CUSTOMER' | 'ADMIN' | 'STAFF';
  text: string;
  status: 'SENT' | 'DELIVERED' | 'READ';
  createdAt: Date;
  updatedAt: Date;
}

const ChatMessageSchema: Schema = new Schema(
  {
    conversationId: { type: String, required: true, index: true },
    customerId: { type: String, required: true, index: true },
    customerName: { type: String, required: true },
    customerPhone: { type: String, default: '' },
    senderId: { type: String, required: true },
    senderName: { type: String, required: true },
    senderRole: {
      type: String,
      enum: ['CUSTOMER', 'ADMIN', 'STAFF'],
      required: true,
      default: 'CUSTOMER',
    },
    text: { type: String, required: true },
    status: {
      type: String,
      enum: ['SENT', 'DELIVERED', 'READ'],
      default: 'SENT',
    },
  },
  { timestamps: true }
);

ChatMessageSchema.index({ conversationId: 1, createdAt: 1 });

export const ChatMessage = mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema);

