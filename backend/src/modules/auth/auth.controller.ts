import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';

export class AuthController {
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { identifier, password } = req.body;
      const result = await AuthService.login(identifier, password);
      
      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      const result = await AuthService.refreshToken(refreshToken);
      
      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
