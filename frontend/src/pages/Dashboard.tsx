import { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Film, Clapperboard, Ticket, TrendingUp } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const res = await api.get('/reportes/dashboard');
      setStats(res.data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading-spinner"><div className="spinner"></div></div>;
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Bienvenido, {user?.nombre || 'Usuario'} — {new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
        <div className="stat-card">
          <div className="stat-icon stat-icon-blue"><Clapperboard size={24} /></div>
          <div className="stat-info">
            <h3>{stats?.funciones_hoy || 0}</h3>
            <p>Funciones Hoy</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-green"><Ticket size={24} /></div>
          <div className="stat-info">
            <h3>{stats?.reservas_hoy?.VENDIDAS || 0}</h3>
            <p>Ventas Hoy</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-amber"><Film size={24} /></div>
          <div className="stat-info">
            <h3>{stats?.peliculas_activas || 0}</h3>
            <p>Películas Activas</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-red"><TrendingUp size={24} /></div>
          <div className="stat-info">
            <h3>{stats?.ocupacion_promedio || 0}%</h3>
            <p>Ocupación Promedio</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
        <div className="glass-card">
          <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
            Resumen de Reservas Hoy
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-4)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--color-success-light)' }}>
                {stats?.reservas_hoy?.VENDIDAS || 0}
              </div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Vendidas</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--color-accent-light)' }}>
                {stats?.reservas_hoy?.RESERVADAS || 0}
              </div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Reservadas</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--color-danger-light)' }}>
                {stats?.reservas_hoy?.CANCELADAS || 0}
              </div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Canceladas</div>
            </div>
          </div>
        </div>

        <div className="glass-card">
          <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
            Información Rápida
          </h2>
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Total transacciones hoy</span>
              <strong style={{ color: 'var(--text-primary)' }}>{stats?.reservas_hoy?.TOTAL || 0}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Salas activas</span>
              <strong style={{ color: 'var(--text-primary)' }}>3</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Capacidad total</span>
              <strong style={{ color: 'var(--text-primary)' }}>300 asientos</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
