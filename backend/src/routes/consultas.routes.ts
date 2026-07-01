import { Router } from 'express';
import { ConsultasController } from '../controllers/consultas.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';

const router = Router();

router.get('/cartelera', authenticate, ConsultasController.getCartelera);
router.get('/boleto/:codigo', authenticate, ConsultasController.getByBoleto);
router.get('/historial', authenticate, ConsultasController.getHistorial);
router.get('/disponibilidad/:funcionId', authenticate, ConsultasController.getDisponibilidad);
router.get('/log', authenticate, authorize('ADMIN'), ConsultasController.getLog);

export default router;
