import { Router } from 'express';
import { CustomerController } from './customer.controller';

const router = Router();

// Public route for customer registration
router.post('/', CustomerController.createCustomer);

// Public route for customer login
router.post('/login', CustomerController.customerLogin);

// Customer list (allows filtering by status, search, etc.)
router.get('/', CustomerController.getCustomers);

// Update customer status or details (e.g. approve / reject / modify)
router.patch('/:id/status', CustomerController.updateCustomerStatus);
router.patch('/:id', CustomerController.updateCustomerStatus);

export default router;
