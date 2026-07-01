import { useState } from 'react';
import api from '../api/client';
import toast from 'react-hot-toast';
import { Search, Ticket } from 'lucide-react';

export default function Consultas() {
  const [codigo, setCodigo] = useState('');
  const [clienteName, setClienteName] = useState('');
  const [resultado, setResultado] = useState<any>(null);
  const [historial, setHistorial] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'boleto' | 'historial'>('boleto');

  const buscarBoleto = async () => {
    if (!codigo.trim()) return;
    setLoading(true);
    try {
      const res = await api.get(`/consultas/boleto/${codigo}`);
      setResultado(res.data);
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Boleto no encontrado');
      setResultado(null);
    } finally { setLoading(false); }
  };

  const buscarHistorial = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (clienteName) params.cliente = clienteName;
      const res = await api.get('/consultas/historial', { params });
      setHistorial(res.data);
    } catch (e) { toast.error('Error al buscar'); }
    finally { setLoading(false); }
  };

  const estadoBadge = (estado: string) => {
    switch (estado) {
      case 'VENDIDA': return 'badge-success';
      case 'RESERVADA': return 'badge-warning';
      case 'CANCELADA': return 'badge-danger';
      default: return 'badge-info';
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Consultas</h1>
          <p className="page-subtitle">Buscar boletos e historial de reservas</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-6)' }}>
        <button className={`btn ${tab === 'boleto' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('boleto')}>
          <Ticket size={16} /> Buscar Boleto
        </button>
        <button className={`btn ${tab === 'historial' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('historial')}>
          <Search size={16} /> Historial
        </button>
      </div>

      {tab === 'boleto' && (
        <div>
          <div className="filters-bar">
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Código de Boleto</label>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <input className="form-input" placeholder="Ej: CS-20240701-AB12C" value={codigo} onChange={e => setCodigo(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && buscarBoleto()} />
                <button className="btn btn-primary" onClick={buscarBoleto} disabled={loading}>
                  <Search size={16} /> Buscar
                </button>
              </div>
            </div>
          </div>

          {resultado && (
            <div className="glass-card" style={{ marginTop: 'var(--space-4)' }}>
              <h3 style={{ fontWeight: 700, marginBottom: 'var(--space-4)' }}>Resultado</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', fontSize: 'var(--font-size-sm)' }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Código:</span> <strong style={{ fontFamily: 'monospace' }}>{resultado.CODIGO_BOLETO}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Estado:</span> <span className={`badge ${estadoBadge(resultado.ESTADO)}`}>{resultado.ESTADO}</span></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Película:</span> <strong>{resultado.PELICULA_TITULO}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Sala:</span> <strong>{resultado.SALA_NOMBRE}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Cliente:</span> <strong>{resultado.NOMBRE_CLIENTE}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Canal:</span> <span className={`badge ${resultado.CANAL === 'TAQUILLA' ? 'badge-primary' : 'badge-info'}`}>{resultado.CANAL}</span></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Operador:</span> <strong>{resultado.OPERADOR}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Precio:</span> <strong style={{ color: 'var(--color-accent)' }}>${resultado.PRECIO?.toFixed(2)}</strong></div>
              </div>
              {resultado.asientos && resultado.asientos.length > 0 && (
                <div style={{ marginTop: 'var(--space-4)' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>Asientos:</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                    {resultado.asientos.map((a: any, i: number) => (
                      <span key={i} className="selected-seat-tag">{a.FILA}{a.NUMERO}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'historial' && (
        <div>
          <div className="filters-bar">
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Nombre del Cliente</label>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <input className="form-input" placeholder="Buscar por nombre..." value={clienteName} onChange={e => setClienteName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && buscarHistorial()} />
                <button className="btn btn-primary" onClick={buscarHistorial} disabled={loading}>
                  <Search size={16} /> Buscar
                </button>
              </div>
            </div>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr><th>Código</th><th>Película</th><th>Sala</th><th>Cliente</th><th>Canal</th><th>Estado</th><th>Fecha</th></tr>
              </thead>
              <tbody>
                {historial.map(h => (
                  <tr key={h.ID}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{h.CODIGO_BOLETO}</td>
                    <td>{h.PELICULA_TITULO}</td><td>{h.SALA_NOMBRE}</td>
                    <td>{h.NOMBRE_CLIENTE}</td>
                    <td><span className={`badge ${h.CANAL === 'TAQUILLA' ? 'badge-primary' : 'badge-info'}`}>{h.CANAL}</span></td>
                    <td><span className={`badge ${estadoBadge(h.ESTADO)}`}>{h.ESTADO}</span></td>
                    <td style={{ fontSize: 'var(--font-size-xs)' }}>{new Date(h.FECHA_RESERVA).toLocaleString('es-MX')}</td>
                  </tr>
                ))}
                {historial.length === 0 && (
                  <tr><td colSpan={7} className="empty-state"><Search size={32} /><h3>Realice una búsqueda</h3></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
