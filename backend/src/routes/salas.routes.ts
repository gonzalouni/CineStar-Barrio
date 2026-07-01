import { Router } from 'express';
import { SalasController } from '../controllers/salas.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';

const router = Router();

router.get('/', authenticate, SalasController.getAll);
router.get('/:id', authenticate, SalasController.getById);
router.get('/:id/asientos', authenticate, SalasController.getAsientos);
router.post('/', authenticate, authorize('ADMIN'), SalasController.create);
router.put('/:id', authenticate, authorize('ADMIN'), SalasController.update);

export default router;
