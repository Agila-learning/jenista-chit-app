import { Router } from 'express';
import { ChitMemberController } from './chit-member.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.post('/', authorize(['chits.create']), ChitMemberController.addMember);
router.get('/', authorize(['chits.read']), ChitMemberController.getMembersByGroup);

export default router;
