import { Request, Response, NextFunction } from 'express';
import { Company } from './company.model';
import { ApiError } from '../../common/ApiError';

export class CompanyController {
  static async createCompany(req: Request, res: Response, next: NextFunction) {
    try {
      const existing = await Company.findOne({ companyCode: req.body.companyCode });
      if (existing) {
        throw new ApiError(400, 'Company code already exists', 'VALIDATION_ERROR');
      }

      const company = await Company.create(req.body);
      res.status(201).json({ success: true, data: company });
    } catch (error) {
      next(error);
    }
  }

  static async getCompanies(req: Request, res: Response, next: NextFunction) {
    try {
      const companies = await Company.find();
      res.status(200).json({ success: true, data: companies });
    } catch (error) {
      next(error);
    }
  }
}
