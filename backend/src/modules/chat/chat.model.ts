import mongoose, { Schema, Document } from 'mongoose';

export interface IChatAttachment {
  uri: string;
  type: 'IMAGE' | 'DOCUMENT' | 'RECEIPT';
  name?: string;
  size?: number;
  mimeType?: string;
  base64?: string;
}

export interface IChatMessage extends Document {
  conversationId: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  senderId: string;
  senderName: string;
  senderRole: 'CUSTOMER' | 'ADMIN' | 'STAFF';
  text: string;
  attachment?: IChatAttachment;
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
    text: { type: String, default: '' },
    attachment: {
      uri: { type: String },
      type: { type: String, enum: ['IMAGE', 'DOCUMENT', 'RECEIPT'] },
      name: { type: String },
      size: { type: Number },
      mimeType: { type: String },
      base64: { type: String },
    },
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

// --- Story Model for Jenista Chits Stories ---
export interface IStoryViewer {
  viewerId: string;
  viewerName: string;
  viewerRole: string;
  viewerPhone?: string;
  viewedAt: Date;
}

export interface IStory extends Document {
  customId?: string;
  authorId: string;
  authorName: string;
  authorRole: 'ADMIN' | 'SUPER_ADMIN';
  category: 'AUCTION_RESULT' | 'NEW_SCHEME' | 'DIVIDEND' | 'NOTICE' | 'CELEBRATION';
  title: string;
  caption: string;
  mediaUrl?: string;
  viewers: string[];
  viewersList: IStoryViewer[];
  viewCount: number;
  gradient?: string[];
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const StorySchema: Schema = new Schema(
  {
    customId: { type: String, index: true },
    authorId: { type: String, required: true },
    authorName: { type: String, required: true, default: 'Admin Desk' },
    authorRole: { type: String, default: 'ADMIN' },
    category: {
      type: String,
      enum: ['AUCTION_RESULT', 'NEW_SCHEME', 'DIVIDEND', 'NOTICE', 'CELEBRATION'],
      default: 'NOTICE',
    },
    title: { type: String, required: true },
    caption: { type: String, default: '' },
    mediaUrl: { type: String, default: '' },
    viewers: [{ type: String }],
    viewersList: [
      {
        viewerId: { type: String, required: true },
        viewerName: { type: String, default: 'Member' },
        viewerRole: { type: String, default: 'CUSTOMER' },
        viewerPhone: { type: String, default: '' },
        viewedAt: { type: Date, default: Date.now },
      },
    ],
    viewCount: { type: Number, default: 0 },
    gradient: [{ type: String }],
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      index: { expires: 0 },
    },
  },
  { timestamps: true }
);

export const StoryModel = mongoose.model<IStory>('Story', StorySchema);


