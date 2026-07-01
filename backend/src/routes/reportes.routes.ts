import { Router } from 'express';
import { ReportesController } from '../controllers/reportes.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';

const router = Router();

router.get('/dashboard', authenticate, ReportesController.getDashboard);
router.get('/ocupacion', authenticate, authorize('ADMIN'), ReportesController.getOcupacion);
router.get('/ventas', authenticate, authorize('ADMIN'), ReportesController.getVentas);
router.get('/cancelaciones', authenticate, authorize('ADMIN'), ReportesController.getCancelaciones);
router.get('/ranking', authenticate, authorize('ADMIN'), ReportesController.getRanking);
router.get('/exportar/:tipo', authenticate, authorize('ADMIN'), ReportesController.exportar);

export default router;
