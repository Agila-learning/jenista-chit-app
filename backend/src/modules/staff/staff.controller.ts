import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../users/user.model';
import { Role } from '../roles/role.model';
import { ApiError } from '../../common/ApiError';

export class StaffController {
  /**
   * List all staff members
   */
  static async getStaff(req: Request, res: Response, next: NextFunction) {
    try {
      // Find roles that map to staff/collection agent
      const staffRoles = await Role.find({
        code: { $in: ['STAFF', 'COLLECTION_AGENT', 'FIELD_STAFF', 'BRANCH_MANAGER'] },
      });
      const roleIds = staffRoles.map((r) => r._id);

      // Find users with these roles OR with userCode starting with STF / STAFF
      let query: any = {};
      if (roleIds.length > 0) {
        query = {
          $or: [
            { roleIds: { $in: roleIds } },
            { userCode: { $regex: '^(STF|STAFF)', $options: 'i' } },
          ],
        };
      } else {
        query = { userCode: { $regex: '^(STF|STAFF)', $options: 'i' } };
      }

      const staffList = await User.find(query)
        .select('-passwordHash')
        .populate('roleIds')
        .sort({ createdAt: -1 })
        .lean();

      const formatted = staffList.map((s: any) => {
        const roles = Array.isArray(s.roleIds) ? s.roleIds : [];
        const primaryRole = roles[0]?.code || (s.userCode?.startsWith('STF') ? 'STAFF' : 'STAFF');
        return {
          id: s._id,
          _id: s._id,
          userCode: s.userCode,
          name: s.name,
          phone: s.phone,
          email: s.email || '',
          role: primaryRole,
          roleName: roles[0]?.name || (primaryRole === 'COLLECTION_AGENT' ? 'Collection Agent' : 'Field Staff Member'),
          status: s.status || 'ACTIVE',
          lastLoginAt: s.lastLoginAt,
          createdAt: s.createdAt,
        };
      });

      res.status(200).json({ success: true, data: formatted });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new staff member
   */
  static async createStaff(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, phone, email, password, role = 'STAFF', userCode, status = 'ACTIVE' } = req.body;

      if (!name || !name.trim()) {
        throw new ApiError(400, 'Staff name is required', 'VALIDATION_ERROR');
      }
      if (!phone || !phone.trim()) {
        throw new ApiError(400, 'Phone / Mobile number is required', 'VALIDATION_ERROR');
      }
      if (!password || !password.trim()) {
        throw new ApiError(400, 'Password is required', 'VALIDATION_ERROR');
      }

      const cleanPhone = phone.trim();
      const cleanEmail = email ? email.trim().toLowerCase() : undefined;
      const targetRoleCode = (role || 'STAFF').trim().toUpperCase();

      // Check duplicate
      const duplicateConditions: any[] = [{ phone: cleanPhone }];
      if (cleanEmail) duplicateConditions.push({ email: cleanEmail });
      if (userCode) duplicateConditions.push({ userCode });

      const existing = await User.findOne({ $or: duplicateConditions });
      if (existing) {
        throw new ApiError(
          400,
          `A staff member or user with this phone or email already exists (${existing.userCode})`,
          'DUPLICATE_USER'
        );
      }

      // Find or create role
      let roleDoc = await Role.findOne({ code: targetRoleCode });
      if (!roleDoc) {
        roleDoc = await Role.create({
          code: targetRoleCode,
          name: targetRoleCode === 'COLLECTION_AGENT' ? 'Collection Agent' : 'Field Staff Member',
          permissions: ['customers.read', 'receipts.create', 'receipts.read'],
          status: 'ACTIVE',
        });
      }

      // Generate user code
      const generatedCode = userCode || `STF-${Math.floor(1000 + Math.random() * 9000)}`;

      // Hash password
      const passwordHash = await bcrypt.hash(password.trim(), 12);

      const newStaff = await User.create({
        userCode: generatedCode,
        name: name.trim(),
        email: cleanEmail,
        phone: cleanPhone,
        passwordHash,
        roleIds: [roleDoc._id],
        status: status || 'ACTIVE',
      });

      const userResponse: any = newStaff.toObject();
      delete userResponse.passwordHash;
      userResponse.role = targetRoleCode;

      res.status(201).json({
        success: true,
        message: 'Staff member created successfully',
        data: userResponse,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update staff member details
   */
  static async updateStaff(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { name, phone, email, password, role, status } = req.body;

      const staff = await User.findById(id);
      if (!staff) {
        throw new ApiError(404, 'Staff member not found', 'NOT_FOUND');
      }

      if (name) staff.name = name.trim();
      if (phone) staff.phone = phone.trim();
      if (email !== undefined) staff.email = email ? email.trim().toLowerCase() : undefined;
      if (status) staff.status = status;

      if (password && password.trim()) {
        staff.passwordHash = await bcrypt.hash(password.trim(), 12);
      }

      if (role) {
        const targetRoleCode = role.trim().toUpperCase();
        let roleDoc = await Role.findOne({ code: targetRoleCode });
        if (!roleDoc) {
          roleDoc = await Role.create({
            code: targetRoleCode,
            name: targetRoleCode === 'COLLECTION_AGENT' ? 'Collection Agent' : 'Field Staff Member',
            permissions: ['customers.read', 'receipts.create', 'receipts.read'],
            status: 'ACTIVE',
          });
        }
        staff.roleIds = [roleDoc._id as any];
      }

      await staff.save();

      const userResponse: any = staff.toObject();
      delete userResponse.passwordHash;

      res.status(200).json({
        success: true,
        message: 'Staff member updated successfully',
        data: userResponse,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete or remove staff member
   */
  static async deleteStaff(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const staff = await User.findByIdAndDelete(id);
      if (!staff) {
        throw new ApiError(404, 'Staff member not found', 'NOT_FOUND');
      }

      res.status(200).json({
        success: true,
        message: 'Staff member removed successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
