import { useState, useEffect } from 'react';
import api from '../api/client';
import toast from 'react-hot-toast';
import { DoorOpen } from 'lucide-react';

export default function Salas() {
  const [salas, setSalas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadSalas(); }, []);

  const loadSalas = async () => {
    try {
      const res = await api.get('/salas');
      setSalas(res.data);
    } catch (e) { toast.error('Error al cargar salas'); }
    finally { setLoading(false); }
  };

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Salas</h1>
          <p className="page-subtitle">Configuración de salas del cine</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-4)' }}>
        {salas.map(s => (
          <div key={s.ID} className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
              <div className="stat-icon stat-icon-blue"><DoorOpen size={24} /></div>
              <div>
                <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>{s.NOMBRE}</h3>
                <span className={`badge ${s.ACTIVO ? 'badge-success' : 'badge-danger'}`}>
                  {s.ACTIVO ? 'Activa' : 'Inactiva'}
                </span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <div style={{ textAlign: 'center', padding: 'var(--space-3)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800 }}>{s.CAPACIDAD}</div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Asientos</div>
              </div>
              <div style={{ textAlign: 'center', padding: 'var(--space-3)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800 }}>9</div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Filas</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
