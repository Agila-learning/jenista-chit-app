import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../common/ApiError';
import { logger } from '../utils/logger';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error(err);

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errorCode: err.errorCode,
      errors: err.errors || [],
    });
  }

  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errorCode: 'VALIDATION_ERROR',
      errors: err.errors,
    });
  }

  res.status(500).json({
    success: false,
    message: 'Internal server error',
    errorCode: 'INTERNAL_SERVER_ERROR',
    errors: [],
  });
};
