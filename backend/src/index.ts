import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { initDatabase, closeDatabase } from './config/database';
import { seedUsers } from './config/seed';
import { errorHandler } from './middleware/errorHandler';

// Routes
import authRoutes from './routes/auth.routes';
import peliculasRoutes from './routes/peliculas.routes';
import salasRoutes from './routes/salas.routes';
import funcionesRoutes from './routes/funciones.routes';
import reservasRoutes from './routes/reservas.routes';
import consultasRoutes from './routes/consultas.routes';
import reportesRoutes from './routes/reportes.routes';
import usuariosRoutes from './routes/usuarios.routes';

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://frontend:5173'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/peliculas', peliculasRoutes);
app.use('/api/salas', salasRoutes);
app.use('/api/funciones', funcionesRoutes);
app.use('/api/reservas', reservasRoutes);
app.use('/api/consultas', consultasRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/usuarios', usuariosRoutes);

// Error handler
app.use(errorHandler);

// Start server
async function start() {
  try {
    console.log('🎬 CineStar Barrio — Backend API');
    console.log('================================');
    
    // Initialize database connection pools
    await initDatabase();
    
    // Seed default users if needed
    await seedUsers();
    
    app.listen(env.PORT, () => {
      console.log(`🚀 Server running on port ${env.PORT}`);
      console.log(`📡 API: http://localhost:${env.PORT}/api`);
      console.log(`🏥 Health: http://localhost:${env.PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  await closeDatabase();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await closeDatabase();
  process.exit(0);
});

start();
