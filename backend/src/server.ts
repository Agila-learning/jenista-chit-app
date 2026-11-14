import app from './app';
import { connectDatabase } from './database';
import { env } from './config/env';
import { logger } from './utils/logger';
import { initFirebase } from './config/firebase';

const startServer = async () => {
  try {
    initFirebase();
    app.listen(env.PORT, '0.0.0.0', () => {
      logger.info(`Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
    });

    await connectDatabase();
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
