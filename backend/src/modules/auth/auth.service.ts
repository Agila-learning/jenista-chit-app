import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../users/user.model';
import { env } from '../../config/env';
import { ApiError } from '../../common/ApiError';

export class AuthService {
  static async login(identifier: string, password: string) {
    // identifier can be email or phone
    const user = await User.findOne({
      $or: [{ email: identifier }, { phone: identifier }],
    }).populate('roleIds');

    if (!user) {
      throw new ApiError(401, 'Invalid credentials', 'UNAUTHORIZED');
    }

    if (user.status !== 'ACTIVE') {
      throw new ApiError(403, `Account is ${user.status.toLowerCase()}`, 'ACCOUNT_DISABLED');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new ApiError(401, 'Invalid credentials', 'UNAUTHORIZED');
    }

    user.lastLoginAt = new Date();
    await user.save();

    const accessToken = jwt.sign(
      { userId: user._id, roleIds: user.roleIds },
      env.JWT_ACCESS_SECRET as string,
      { expiresIn: env.JWT_ACCESS_EXPIRES as any }
    );

    const refreshToken = jwt.sign(
      { userId: user._id },
      env.JWT_REFRESH_SECRET as string,
      { expiresIn: env.JWT_REFRESH_EXPIRES as any }
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        userCode: user.userCode,
        name: user.name,
        email: user.email,
        phone: user.phone,
        status: user.status,
        roles: user.roleIds
      },
    };
  }

  static async refreshToken(token: string) {
    try {
      const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as { userId: string };
      const user = await User.findById(decoded.userId).populate('roleIds');
      
      if (!user || user.status !== 'ACTIVE') {
        throw new ApiError(401, 'Invalid refresh token', 'UNAUTHORIZED');
      }

      const accessToken = jwt.sign(
        { userId: user._id, roleIds: user.roleIds },
        env.JWT_ACCESS_SECRET as string,
        { expiresIn: env.JWT_ACCESS_EXPIRES as any }
      );

      return { accessToken };
    } catch (error) {
      throw new ApiError(401, 'Invalid or expired refresh token', 'UNAUTHORIZED');
    }
  }
}
