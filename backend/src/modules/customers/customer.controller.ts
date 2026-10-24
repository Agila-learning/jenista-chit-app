import { Request, Response, NextFunction } from 'express';
import { Customer } from './customer.model';
import { ApiError } from '../../common/ApiError';
import { AuthRequest } from '../../middleware/authenticate';
import bcrypt from 'bcryptjs';

export class CustomerController {
  static async createCustomer(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { name, mobile, address, password } = req.body;
      
      const phone = mobile || req.body.phone;
      const fullName = name || req.body.fullName;
      
      if (!phone || !fullName) {
        throw new ApiError(400, 'Name and Mobile are required', 'VALIDATION_ERROR');
      }

      const cleanPhone = phone.toString().replace(/\D/g, '');
      if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
        throw new ApiError(400, 'Mobile number must start with 6, 7, 8, or 9 and have exactly 10 digits', 'VALIDATION_ERROR');
      }

      const existing = await Customer.findOne({ phone: cleanPhone });
      if (existing) {
        throw new ApiError(409, 'Already registered sign in to continue', 'CUSTOMER_EXISTS');
      }

      let passwordHash;
      if (password) {
        passwordHash = await bcrypt.hash(password, 10);
      }

      const customerCode = req.body.customerCode || `TC-${Math.floor(Math.random() * 90000) + 10000}`;

      const customer = await Customer.create({
        ...req.body,
        customerCode,
        fullName,
        phone: cleanPhone,
        address: address || req.body.address,
        passwordHash,
        createdBy: req.user?.userId,
      });
      res.status(201).json({ success: true, data: customer });
    } catch (error) {
      next(error);
    }
  }

  static async getCustomers(req: Request, res: Response, next: NextFunction) {
    try {
      const { branchId, assignedAgentId, search, status } = req.query;
      
      const filter: any = {};
      if (branchId) filter.branchId = branchId;
      if (assignedAgentId) filter.assignedAgentId = assignedAgentId;
      if (status) {
        if (status === 'PENDING_APPROVAL' || status === 'PENDING') {
          filter.$or = [{ status: 'PENDING_APPROVAL' }, { status: 'PENDING' }];
        } else {
          filter.status = status;
        }
      }
      
      if (search) {
        filter.$or = [
          { fullName: { $regex: search, $options: 'i' } },
          { customerCode: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
        ];
      }

      const customers = await Customer.find(filter)
        .populate('branchId', 'branchName branchCode')
        .populate('assignedAgentId', 'name phone')
        .sort({ createdAt: -1 });
        
      res.status(200).json({ success: true, data: customers });
    } catch (error) {
      next(error);
    }
  }

  static async updateCustomerStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status, fullName, phone, address, name, mobile } = req.body;

      if (status && !['ACTIVE', 'INACTIVE', 'PENDING_APPROVAL', 'REJECTED'].includes(status)) {
        throw new ApiError(400, 'Invalid customer status', 'VALIDATION_ERROR');
      }

      const customerId = Array.isArray(id) ? id[0] : id;
      const isObjectId = typeof customerId === 'string' && /^[0-9a-fA-F]{24}$/.test(customerId);

      const customer = await Customer.findOne({
        $or: [{ ...(isObjectId ? { _id: customerId } : {}) }, { customerCode: customerId }].filter(Boolean)
      });

      if (!customer) {
        throw new ApiError(404, 'Customer not found', 'NOT_FOUND');
      }

      if (status) {
        customer.status = status as any;
        if (status === 'ACTIVE') {
          customer.kycStatus = 'VERIFIED';
        }
      }
      if (fullName || name) customer.fullName = fullName || name;
      if (phone || mobile) customer.phone = phone || mobile;
      if (address) customer.address = address;
      if (req.body.chits) customer.chits = req.body.chits;
      if (req.body.pending !== undefined) customer.pending = req.body.pending;
      if (req.body.totalPaid !== undefined) customer.totalPaid = req.body.totalPaid;
      if (req.body.password) {
        customer.passwordHash = await bcrypt.hash(req.body.password, 10);
      }

      await customer.save();

      res.status(200).json({ success: true, message: `Customer updated successfully`, data: customer });
    } catch (error) {
      next(error);
    }
  }

  static async customerLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const { identifier, password } = req.body;
      const phone = identifier;

      const customer = await Customer.findOne({
        $or: [{ phone }, { customerCode: identifier }]
      });

      if (!customer) {
        throw new ApiError(401, 'Customer not found with these credentials', 'UNAUTHORIZED');
      }

      if (customer.status === 'PENDING_APPROVAL') {
        throw new ApiError(403, 'Your account is pending admin approval', 'ACCOUNT_PENDING');
      }

      if (customer.status === 'REJECTED') {
        throw new ApiError(403, 'Your account registration was rejected', 'ACCOUNT_REJECTED');
      }

      if (customer.status === 'INACTIVE') {
        throw new ApiError(403, 'Your account has been deactivated by administrator. Please contact your branch.', 'ACCOUNT_DEACTIVATED');
      }

      if (customer.passwordHash) {
        const isMatch = await bcrypt.compare(password, customer.passwordHash);
        if (!isMatch) {
          throw new ApiError(401, 'Invalid password', 'UNAUTHORIZED');
        }
      }

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          token: `customer-token-${customer.customerCode}`,
          user: {
            id: customer.customerCode,
            mongoId: customer._id,
            name: customer.fullName,
            phone: customer.phone,
            role: 'CUSTOMER',
            address: customer.address,
            status: customer.status,
            permissions: ['customer.read']
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
}
