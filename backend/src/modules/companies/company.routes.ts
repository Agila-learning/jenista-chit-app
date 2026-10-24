import { Router } from 'express';
import { CompanyController } from './company.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

const router = Router();

router.use(authenticate);

router.post('/', authorize(['companies.manage']), CompanyController.createCompany);
router.get('/', authorize(['companies.read']), CompanyController.getCompanies);

export default router;
