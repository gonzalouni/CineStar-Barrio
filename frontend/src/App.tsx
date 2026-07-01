import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import AppLayout from './components/Layout/AppLayout';
import ProtectedRoute from './components/Layout/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Cartelera from './pages/Cartelera';
import Peliculas from './pages/Peliculas';
import Funciones from './pages/Funciones';
import Salas from './pages/Salas';
import ReservaAsientos from './pages/ReservaAsientos';
import MisReservas from './pages/MisReservas';
import Consultas from './pages/Consultas';
import Usuarios from './pages/Usuarios';
import Reportes from './pages/Reportes';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#1f2937',
              color: '#f9fafb',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              fontSize: '14px',
            },
            success: {
              iconTheme: { primary: '#10b981', secondary: '#f9fafb' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#f9fafb' },
            },
          }}
        />
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/cartelera" element={<Cartelera />} />
            <Route path="/peliculas" element={<ProtectedRoute requiredRole="ADMIN"><Peliculas /></ProtectedRoute>} />
            <Route path="/funciones" element={<ProtectedRoute requiredRole="ADMIN"><Funciones /></ProtectedRoute>} />
            <Route path="/salas" element={<ProtectedRoute requiredRole="ADMIN"><Salas /></ProtectedRoute>} />
            <Route path="/reservas" element={<ReservaAsientos />} />
            <Route path="/mis-reservas" element={<MisReservas />} />
            <Route path="/consultas" element={<Consultas />} />
            <Route path="/usuarios" element={<ProtectedRoute requiredRole="ADMIN"><Usuarios /></ProtectedRoute>} />
            <Route path="/reportes" element={<ProtectedRoute requiredRole="ADMIN"><Reportes /></ProtectedRoute>} />
          </Route>
          
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
