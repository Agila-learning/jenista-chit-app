import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { User } from './user.model';
import { ApiError } from '../../common/ApiError';

export class UserController {
  static async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { userCode, name, email, phone, password, roleIds, branchIds } = req.body;

      const existingUser = await User.findOne({ $or: [{ userCode }, { phone }, { email }] });
      if (existingUser) {
        throw new ApiError(400, 'User with code, phone, or email already exists', 'VALIDATION_ERROR');
      }

      const passwordHash = await bcrypt.hash(password, 12);

      const user = await User.create({
        userCode,
        name,
        email,
        phone,
        passwordHash,
        roleIds,
        branchIds,
      });

      const userResponse = user.toObject();
      delete (userResponse as any).passwordHash;

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: userResponse,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const users = await User.find().select('-passwordHash').populate('roleIds');
      res.status(200).json({
        success: true,
        data: users,
      });
    } catch (error) {
      next(error);
    }
  }
}
