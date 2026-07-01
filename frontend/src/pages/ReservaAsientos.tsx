import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import toast from 'react-hot-toast';
import SeatMap from '../components/SeatMap/SeatMap';
import { Armchair, Ticket, X, Phone, Monitor } from 'lucide-react';

export default function ReservaAsientos() {
  const navigate = useNavigate();
  const [funciones, setFunciones] = useState<any[]>([]);
  const [selectedFuncion, setSelectedFuncion] = useState<any>(null);
  const [seats, setSeats] = useState<any[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [resumen, setResumen] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingSeats, setLoadingSeats] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form
  const [nombreCliente, setNombreCliente] = useState('');
  const [telefonoCliente, setTelefonoCliente] = useState('');
  const [canal, setCanal] = useState<'TAQUILLA' | 'TELEFONICA'>('TAQUILLA');

  useEffect(() => { loadFunciones(); }, []);

  const loadFunciones = async () => {
    try {
      const res = await api.get('/consultas/cartelera');
      setFunciones(res.data);
    } catch (e) { toast.error('Error al cargar funciones'); }
    finally { setLoading(false); }
  };

  const selectFuncion = async (funcion: any) => {
    setSelectedFuncion(funcion);
    setSelectedSeats([]);
    setLoadingSeats(true);
    try {
      const res = await api.get(`/funciones/${funcion.ID}/asientos`);
      setSeats(res.data.asientos);
      setResumen(res.data.resumen);
    } catch (e) { toast.error('Error al cargar asientos'); }
    finally { setLoadingSeats(false); }
  };

  const handleSeatClick = (seatId: number) => {
    setSelectedSeats(prev => 
      prev.includes(seatId) 
        ? prev.filter(id => id !== seatId)
        : [...prev, seatId]
    );
  };

  const getSelectedSeatLabels = () => {
    return selectedSeats.map(id => {
      const seat = seats.find(s => s.ID === id);
      return seat ? `${seat.FILA}${seat.NUMERO}` : '';
    }).filter(Boolean);
  };

  const handleReservar = async () => {
    if (!nombreCliente.trim()) {
      toast.error('El nombre del cliente es requerido');
      return;
    }
    if (selectedSeats.length === 0) {
      toast.error('Seleccione al menos un asiento');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/reservas', {
        funcion_id: selectedFuncion.ID,
        asiento_ids: selectedSeats,
        nombre_cliente: nombreCliente,
        telefono_cliente: telefonoCliente || undefined,
        canal,
      });

      toast.success(`¡Reserva creada! Código: ${res.data.codigo_boleto}`, { duration: 5000 });
      
      // Reload seats
      setSelectedSeats([]);
      setNombreCliente('');
      setTelefonoCliente('');
      selectFuncion(selectedFuncion);
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Error al crear reserva');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reservar Asientos</h1>
          <p className="page-subtitle">Seleccione una función y los asientos deseados</p>
        </div>
      </div>

      {/* Step 1: Select function */}
      {!selectedFuncion && (
        <div>
          <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--space-4)', color: 'var(--text-secondary)' }}>
            Funciones Disponibles
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-4)' }}>
            {funciones.map(f => (
              <div
                key={f.ID}
                className="glass-card"
                style={{ cursor: 'pointer', transition: 'all var(--transition-base)' }}
                onClick={() => selectFuncion(f)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)' }}>
                  <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 700 }}>{f.TITULO}</h3>
                  <span className="badge badge-info">{f.CLASIFICACION}</span>
                </div>
                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                  <span>🏢 {f.SALA_NOMBRE}</span>
                  <span>📅 {new Date(f.FECHA).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                  <span>🕐 {new Date(f.HORA_INICIO).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} — {new Date(f.HORA_FIN).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-2)' }}>
                    <span style={{ fontWeight: 700, color: 'var(--color-accent)' }}>${f.PRECIO?.toFixed(2)}</span>
                    <span style={{ color: f.CAPACIDAD - f.ASIENTOS_OCUPADOS > 10 ? 'var(--color-success-light)' : 'var(--color-warning)' }}>
                      {f.CAPACIDAD - f.ASIENTOS_OCUPADOS} disponibles
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {funciones.length === 0 && (
              <div className="empty-state"><Armchair size={48} /><h3>No hay funciones disponibles</h3></div>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Seat map + reservation form */}
      {selectedFuncion && (
        <div>
          {/* Function info bar */}
          <div className="glass-card" style={{ marginBottom: 'var(--space-6)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => { setSelectedFuncion(null); setSelectedSeats([]); }}>
                ← Volver
              </button>
              <div>
                <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>{selectedFuncion.TITULO}</h2>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                  {selectedFuncion.SALA_NOMBRE} · {new Date(selectedFuncion.FECHA).toLocaleDateString('es-MX')} · {new Date(selectedFuncion.HORA_INICIO).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
            {resumen && (
              <div style={{ display: 'flex', gap: 'var(--space-6)' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, color: 'var(--color-success-light)' }}>{resumen.disponibles}</div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Disponibles</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, color: 'var(--color-danger-light)' }}>{resumen.ocupados + resumen.reservados}</div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Ocupados</div>
                </div>
              </div>
            )}
          </div>

          <div className="reservation-layout">
            {/* Seat Map */}
            <div>
              {loadingSeats ? (
                <div className="loading-spinner"><div className="spinner"></div></div>
              ) : (
                <SeatMap 
                  seats={seats}
                  selectedSeats={selectedSeats}
                  onSeatClick={handleSeatClick}
                />
              )}
            </div>

            {/* Reservation Panel */}
            <div className="reservation-panel">
              <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
                <Ticket size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
                Datos de Reserva
              </h3>

              {/* Selected seats */}
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <label className="form-label">Asientos Seleccionados ({selectedSeats.length})</label>
                {selectedSeats.length > 0 ? (
                  <div className="selected-seats-list">
                    {getSelectedSeatLabels().map((label, i) => (
                      <span key={i} className="selected-seat-tag">
                        {label}
                        <button onClick={() => handleSeatClick(selectedSeats[i])}>×</button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    Haga clic en los asientos del mapa para seleccionarlos
                  </p>
                )}
              </div>

              {/* Canal */}
              <div className="form-group">
                <label className="form-label">Canal de venta *</label>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <button
                    type="button"
                    className={`btn ${canal === 'TAQUILLA' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setCanal('TAQUILLA')}
                    style={{ flex: 1 }}
                  >
                    <Monitor size={16} /> Taquilla
                  </button>
                  <button
                    type="button"
                    className={`btn ${canal === 'TELEFONICA' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setCanal('TELEFONICA')}
                    style={{ flex: 1 }}
                  >
                    <Phone size={16} /> Telefónica
                  </button>
                </div>
              </div>

              {/* Client info */}
              <div className="form-group">
                <label className="form-label">Nombre del Cliente *</label>
                <input className="form-input" placeholder="Nombre completo" value={nombreCliente} onChange={e => setNombreCliente(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Teléfono (opcional)</label>
                <input className="form-input" placeholder="Teléfono de contacto" value={telefonoCliente} onChange={e => setTelefonoCliente(e.target.value)} />
              </div>

              {/* Total */}
              {selectedSeats.length > 0 && (
                <div style={{ padding: 'var(--space-4)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                      {selectedSeats.length} asiento(s) × ${selectedFuncion.PRECIO?.toFixed(2)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700, fontSize: 'var(--font-size-lg)' }}>Total</span>
                    <span style={{ fontWeight: 800, fontSize: 'var(--font-size-xl)', color: 'var(--color-accent)' }}>
                      ${(selectedSeats.length * (selectedFuncion.PRECIO || 0)).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Submit */}
              <button 
                className="btn btn-success btn-lg"
                style={{ width: '100%' }}
                onClick={handleReservar}
                disabled={submitting || selectedSeats.length === 0 || !nombreCliente.trim()}
              >
                {submitting ? (
                  <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }} />
                ) : (
                  <>
                    <Ticket size={18} />
                    Confirmar Reserva
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
