import { Router } from 'express';
import { FuncionesController } from '../controllers/funciones.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';

const router = Router();

router.get('/', authenticate, FuncionesController.getAll);
router.get('/:id', authenticate, FuncionesController.getById);
router.get('/:id/asientos', authenticate, FuncionesController.getAsientosStatus);
router.post('/', authenticate, authorize('ADMIN'), FuncionesController.create);
router.put('/:id', authenticate, authorize('ADMIN'), FuncionesController.update);
router.delete('/:id', authenticate, authorize('ADMIN'), FuncionesController.delete);

export default router;
