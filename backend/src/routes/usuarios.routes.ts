import { Router } from 'express';
import { UsuariosController } from '../controllers/usuarios.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';

const router = Router();

router.get('/', authenticate, authorize('ADMIN'), UsuariosController.getAll);
router.post('/', authenticate, authorize('ADMIN'), UsuariosController.create);
router.put('/:id', authenticate, authorize('ADMIN'), UsuariosController.update);
router.put('/:id/toggle', authenticate, authorize('ADMIN'), UsuariosController.toggle);

export default router;
