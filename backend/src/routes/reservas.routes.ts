import { Router } from 'express';
import { ReservasController } from '../controllers/reservas.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, ReservasController.getAll);
router.get('/:id', authenticate, ReservasController.getById);
router.post('/', authenticate, ReservasController.create);
router.put('/:id/confirmar', authenticate, ReservasController.confirmar);
router.delete('/:id', authenticate, ReservasController.cancel);

export default router;
