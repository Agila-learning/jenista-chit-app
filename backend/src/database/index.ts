import mongoose from 'mongoose';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export const connectDatabase = async () => {
  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error: any) {
    logger.error('Error connecting to MongoDB Atlas:', error.message || error);
    logger.warn('⚠️ ACTION REQUIRED: In MongoDB Atlas > Network Access > click "Add IP Address" > select "Allow Access From Anywhere" (0.0.0.0/0).');
  }
};

