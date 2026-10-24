import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validate } from '../../middleware/validate';
import { loginSchema, refreshTokenSchema } from './auth.schema';

const router = Router();

router.post('/login', validate(loginSchema), AuthController.login);
router.post('/refresh-token', validate(refreshTokenSchema), AuthController.refreshToken);

export default router;
