import app from './app';
import { connectDatabase } from './database';
import { env } from './config/env';
import { logger } from './utils/logger';

const startServer = async () => {
  try {
    await connectDatabase();
    
    app.listen(env.PORT, () => {
      logger.info(`Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
