import { Router } from 'express';
import { PeliculasController } from '../controllers/peliculas.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';

const router = Router();

router.get('/', authenticate, PeliculasController.getAll);
router.get('/:id', authenticate, PeliculasController.getById);
router.post('/', authenticate, authorize('ADMIN'), PeliculasController.create);
router.put('/:id', authenticate, authorize('ADMIN'), PeliculasController.update);
router.delete('/:id', authenticate, authorize('ADMIN'), PeliculasController.delete);

export default router;
