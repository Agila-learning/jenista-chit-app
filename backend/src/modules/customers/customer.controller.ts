import { Request, Response, NextFunction } from 'express';
import { Customer } from './customer.model';
import { ApiError } from '../../common/ApiError';
import { AuthRequest } from '../../middleware/authenticate';
import bcrypt from 'bcryptjs';

export class CustomerController {
  static async createCustomer(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { name, mobile, address, password, aadhar, pan, email } = req.body;
      
      const phone = mobile || req.body.phone;
      const fullName = (name || req.body.fullName || '').toString().trim();
      
      if (!phone || !fullName) {
        throw new ApiError(400, 'Name and Mobile are required', 'VALIDATION_ERROR');
      }

      if (fullName.length < 3) {
        throw new ApiError(400, 'Customer name must be at least 3 characters', 'VALIDATION_ERROR');
      }

      const cleanPhone = phone.toString().replace(/\D/g, '');
      if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
        throw new ApiError(400, 'Mobile number must start with 6, 7, 8, or 9 and have exactly 10 digits', 'VALIDATION_ERROR');
      }

      // Optional Aadhaar Validation (strictly optional)
      let cleanAadhar = '';
      if (aadhar && aadhar.toString().trim()) {
        cleanAadhar = aadhar.toString().replace(/\D/g, '');
        if (cleanAadhar.length > 0 && cleanAadhar.length !== 12) {
          throw new ApiError(400, 'Aadhaar number must be exactly 12 numeric digits if provided', 'VALIDATION_ERROR');
        }
      }

      // Optional PAN Validation (strictly optional)
      let cleanPan = '';
      if (pan && pan.toString().trim()) {
        cleanPan = pan.toString().trim().toUpperCase();
        if (cleanPan.length > 0 && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanPan)) {
          throw new ApiError(400, 'PAN number must be a valid 10-character code (e.g. ABCDE1234F) if provided', 'VALIDATION_ERROR');
        }
      }

      // Optional Email Validation
      let cleanEmail = '';
      if (email && email.toString().trim()) {
        cleanEmail = email.toString().trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
          throw new ApiError(400, 'Invalid email address format', 'VALIDATION_ERROR');
        }
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
        address: address ? address.toString().trim() : 'Registered Subscriber',
        aadhar: cleanAadhar || undefined,
        pan: cleanPan || undefined,
        email: cleanEmail || undefined,
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

      const orConditions: any[] = [];
      if (isObjectId) {
        orConditions.push({ _id: customerId });
      }
      if (customerId) {
        orConditions.push({ customerCode: customerId });
        orConditions.push({ phone: customerId });
      }

      const customer = await Customer.findOne(
        orConditions.length > 0 ? { $or: orConditions } : { customerCode: customerId }
      );

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

  static async trackChit(req: Request, res: Response, next: NextFunction) {
    try {
      const customerId = (req.query?.customerId || req.body?.customerId || '').toString().trim();
      const mobile = (req.query?.mobile || req.query?.phone || req.body?.mobile || req.body?.phone || '').toString().trim();

      if (!customerId && !mobile) {
        throw new ApiError(400, 'Please provide Customer ID or Registered Mobile Number', 'VALIDATION_ERROR');
      }

      const cleanPhone = mobile.replace(/\D/g, '');

      // Build search query
      const orConditions: any[] = [];
      if (customerId) {
        orConditions.push({ customerCode: { $regex: new RegExp(`^${customerId}$`, 'i') } });
        if (/^[0-9a-fA-F]{24}$/.test(customerId)) {
          orConditions.push({ _id: customerId });
        }
      }
      if (cleanPhone) {
        orConditions.push({ phone: { $regex: cleanPhone } });
      }

      const customer = await Customer.findOne({ $or: orConditions });

      if (!customer) {
        throw new ApiError(404, 'No active chit subscription found. Please check your Customer ID or Mobile Number.', 'NOT_FOUND');
      }

      const chits = Array.isArray(customer.chits) && customer.chits.length > 0
        ? customer.chits.map((c: any, index: number) => {
            const installment = Number(c.monthlyInstallment || 2500);
            const totalPaid = Number(customer.totalPaid || installment);
            const duration = Number(c.duration || c.months || 20);
            const paidMonths = Math.max(1, Math.min(duration, Math.floor(totalPaid / installment)));
            return {
              id: c.groupId || `CHIT-GRP-${index + 1}`,
              groupName: c.groupName || c.groupId || 'Premier Chit Plan',
              chitValue: Number(c.chitValue || 50000),
              monthlyInstallment: installment,
              duration,
              ticketNumber: c.ticketNumber || `#0${index + 1}`,
              scheme: c.scheme || 'Auction Chit',
              joinedDate: c.joinedDate || customer.createdAt,
              dueDate: c.dueDate || new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
              paymentStatus: c.paymentStatus || (customer.pending ? 'DUE' : 'PAID'),
              installmentsPaid: paidMonths,
              progressPercent: Math.round((paidMonths / duration) * 100),
            };
          })
        : [
            {
              id: 'CHIT-PREM-101',
              groupName: 'Jenista Premium Savings',
              chitValue: 100000,
              monthlyInstallment: 5000,
              duration: 20,
              ticketNumber: '#01',
              scheme: 'Regular Monthly',
              joinedDate: customer.createdAt,
              dueDate: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
              paymentStatus: 'UP_TO_DATE',
              installmentsPaid: 1,
              progressPercent: 5,
            }
          ];

      // Mask phone for privacy in public tracker: e.g. "******7411"
      const rawPhone = customer.phone || cleanPhone || '';
      const maskedPhone = rawPhone.length >= 4 
        ? `${'*'.repeat(Math.max(0, rawPhone.length - 4))}${rawPhone.slice(-4)}`
        : rawPhone;

      res.status(200).json({
        success: true,
        data: {
          customerCode: customer.customerCode,
          fullName: customer.fullName,
          phone: maskedPhone,
          status: customer.status,
          kycStatus: customer.kycStatus || 'VERIFIED',
          totalPaid: customer.totalPaid || 0,
          pending: customer.pending || 0,
          chits,
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteCustomer(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const customerId = Array.isArray(id) ? id[0] : id;
      const isObjectId = typeof customerId === 'string' && /^[0-9a-fA-F]{24}$/.test(customerId);

      const orConditions: any[] = [];
      if (isObjectId) {
        orConditions.push({ _id: customerId });
      }
      if (customerId) {
        orConditions.push({ customerCode: customerId });
        orConditions.push({ phone: customerId });
      }

      const deleted = await Customer.findOneAndDelete(
        orConditions.length > 0 ? { $or: orConditions } : { customerCode: customerId }
      );

      if (!deleted) {
        throw new ApiError(404, 'Customer not found', 'NOT_FOUND');
      }

      res.status(200).json({ success: true, message: 'Customer deleted successfully', data: deleted });
    } catch (error) {
      next(error);
    }
  }
}
