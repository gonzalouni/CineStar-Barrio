import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { Star, Clock, MapPin } from 'lucide-react';

export default function Cartelera() {
  const [funciones, setFunciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { loadCartelera(); }, []);

  const loadCartelera = async () => {
    try {
      const res = await api.get('/consultas/cartelera');
      setFunciones(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  // Group by movie
  const movieMap = new Map<string, any[]>();
  funciones.forEach(f => {
    const key = f.TITULO;
    if (!movieMap.has(key)) movieMap.set(key, []);
    movieMap.get(key)!.push(f);
  });

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Cartelera</h1>
          <p className="page-subtitle">Películas y funciones disponibles</p>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 'var(--space-6)' }}>
        {Array.from(movieMap.entries()).map(([titulo, funcs]) => {
          const movie = funcs[0];
          return (
            <div key={titulo} className="glass-card" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-4)' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2)' }}>
                  <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800 }}>{titulo}</h2>
                  <span className="badge badge-info">{movie.CLASIFICACION}</span>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-2)' }}>
                  {movie.GENERO} · {movie.DURACION_MIN} min
                </p>
                {movie.SINOPSIS && (
                  <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)', lineHeight: 1.5 }}>
                    {movie.SINOPSIS?.substring(0, 200)}{movie.SINOPSIS?.length > 200 ? '...' : ''}
                  </p>
                )}
              </div>
              <div>
                <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 'var(--space-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Horarios disponibles
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
                  {funcs.map(f => (
                    <button
                      key={f.ID}
                      className="btn btn-secondary"
                      onClick={() => navigate('/reservas')}
                      style={{ flexDirection: 'column', alignItems: 'flex-start', padding: 'var(--space-3) var(--space-4)' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--font-size-sm)' }}>
                        <Clock size={14} />
                        {new Date(f.HORA_INICIO).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                        <MapPin size={12} />
                        {f.SALA_NOMBRE} · ${f.PRECIO}
                      </div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: f.CAPACIDAD - f.ASIENTOS_OCUPADOS > 10 ? 'var(--color-success-light)' : 'var(--color-warning)' }}>
                        {f.CAPACIDAD - f.ASIENTOS_OCUPADOS} disponibles
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}

        {funciones.length === 0 && (
          <div className="empty-state"><Star size={48} /><h3>No hay funciones en cartelera</h3></div>
        )}
      </div>
    </div>
  );
}
