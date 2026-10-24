import mongoose from 'mongoose';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export const connectDatabase = async () => {
  try {
    const conn = await mongoose.connect(env.MONGODB_URI);
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error('Error connecting to MongoDB', error);
    process.exit(1);
  }
};
