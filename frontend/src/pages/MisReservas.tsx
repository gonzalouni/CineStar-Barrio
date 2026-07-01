import { useState, useEffect } from 'react';
import api from '../api/client';
import toast from 'react-hot-toast';
import { Ticket, CheckCircle, XCircle, Eye } from 'lucide-react';

export default function MisReservas() {
  const [reservas, setReservas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReserva, setSelectedReserva] = useState<any>(null);
  const [filtroEstado, setFiltroEstado] = useState('');

  useEffect(() => { loadReservas(); }, [filtroEstado]);

  const loadReservas = async () => {
    try {
      const params = filtroEstado ? { estado: filtroEstado } : {};
      const res = await api.get('/reservas', { params });
      setReservas(res.data);
    } catch (e) { toast.error('Error al cargar reservas'); }
    finally { setLoading(false); }
  };

  const confirmarVenta = async (id: number) => {
    try {
      await api.put(`/reservas/${id}/confirmar`);
      toast.success('Venta confirmada');
      loadReservas();
    } catch (e: any) { toast.error(e.response?.data?.error || 'Error'); }
  };

  const cancelarReserva = async (id: number) => {
    const motivo = prompt('Motivo de cancelación (opcional):');
    try {
      await api.delete(`/reservas/${id}`, { data: { motivo: motivo || undefined } });
      toast.success('Reserva cancelada');
      loadReservas();
    } catch (e: any) { toast.error(e.response?.data?.error || 'Error'); }
  };

  const verDetalle = async (id: number) => {
    try {
      const res = await api.get(`/reservas/${id}`);
      setSelectedReserva(res.data);
    } catch (e) { toast.error('Error al cargar detalle'); }
  };

  const estadoBadge = (estado: string) => {
    switch (estado) {
      case 'VENDIDA': return 'badge-success';
      case 'RESERVADA': return 'badge-warning';
      case 'CANCELADA': return 'badge-danger';
      default: return 'badge-info';
    }
  };

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reservas y Ventas</h1>
          <p className="page-subtitle">Gestión de reservas existentes</p>
        </div>
      </div>

      <div className="filters-bar">
        <div className="form-group">
          <label className="form-label">Estado</label>
          <select className="form-select" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
            <option value="">Todos</option>
            <option value="RESERVADA">Reservada</option>
            <option value="VENDIDA">Vendida</option>
            <option value="CANCELADA">Cancelada</option>
          </select>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Película</th>
              <th>Sala</th>
              <th>Cliente</th>
              <th>Canal</th>
              <th>Estado</th>
              <th>Fecha</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {reservas.map(r => (
              <tr key={r.ID}>
                <td style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--color-primary-light)' }}>{r.CODIGO_BOLETO}</td>
                <td>{r.PELICULA_TITULO}</td>
                <td>{r.SALA_NOMBRE}</td>
                <td>{r.NOMBRE_CLIENTE}</td>
                <td><span className={`badge ${r.CANAL === 'TAQUILLA' ? 'badge-primary' : 'badge-info'}`}>{r.CANAL}</span></td>
                <td><span className={`badge ${estadoBadge(r.ESTADO)}`}>{r.ESTADO}</span></td>
                <td style={{ fontSize: 'var(--font-size-xs)' }}>{new Date(r.FECHA_RESERVA).toLocaleString('es-MX')}</td>
                <td>
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <button className="btn btn-icon" onClick={() => verDetalle(r.ID)} title="Ver detalle"><Eye size={16} /></button>
                    {r.ESTADO === 'RESERVADA' && (
                      <>
                        <button className="btn btn-icon" onClick={() => confirmarVenta(r.ID)} title="Confirmar venta" style={{ color: 'var(--color-success)' }}><CheckCircle size={16} /></button>
                        <button className="btn btn-icon" onClick={() => cancelarReserva(r.ID)} title="Cancelar" style={{ color: 'var(--color-danger)' }}><XCircle size={16} /></button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {reservas.length === 0 && (
              <tr><td colSpan={8} className="empty-state"><Ticket size={32} /><h3>No hay reservas</h3></td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {selectedReserva && (
        <div className="modal-overlay" onClick={() => setSelectedReserva(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Detalle de Reserva</h2>
              <button className="btn btn-icon" onClick={() => setSelectedReserva(null)}>×</button>
            </div>
            <div style={{ display: 'grid', gap: 'var(--space-3)', fontSize: 'var(--font-size-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Código:</span>
                <strong style={{ fontFamily: 'monospace' }}>{selectedReserva.CODIGO_BOLETO}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Película:</span>
                <strong>{selectedReserva.PELICULA_TITULO}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Sala:</span>
                <strong>{selectedReserva.SALA_NOMBRE}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Cliente:</span>
                <strong>{selectedReserva.NOMBRE_CLIENTE}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Canal:</span>
                <span className={`badge ${selectedReserva.CANAL === 'TAQUILLA' ? 'badge-primary' : 'badge-info'}`}>{selectedReserva.CANAL}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Estado:</span>
                <span className={`badge ${estadoBadge(selectedReserva.ESTADO)}`}>{selectedReserva.ESTADO}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Operador:</span>
                <strong>{selectedReserva.OPERADOR}</strong>
              </div>
              {selectedReserva.asientos && (
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Asientos:</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                    {selectedReserva.asientos.map((a: any, i: number) => (
                      <span key={i} className="selected-seat-tag">{a.FILA}{a.NUMERO}</span>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border-color)', marginTop: 'var(--space-2)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Total:</span>
                <strong style={{ fontSize: 'var(--font-size-xl)', color: 'var(--color-accent)' }}>
                  ${((selectedReserva.PRECIO || 0) * (selectedReserva.asientos?.length || 1)).toFixed(2)}
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
