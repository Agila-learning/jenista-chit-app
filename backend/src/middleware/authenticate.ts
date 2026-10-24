import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { ApiError } from '../common/ApiError';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    roleIds: string[];
  };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Unauthorized access', 'UNAUTHORIZED');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as { userId: string; roleIds: string[] };
    
    req.user = decoded;
    next();
  } catch (error) {
    next(new ApiError(401, 'Invalid or expired token', 'UNAUTHORIZED'));
  }
};
