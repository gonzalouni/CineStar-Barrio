import { useState, useEffect } from 'react';
import api from '../api/client';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, Clapperboard, X } from 'lucide-react';

export default function Funciones() {
  const [funciones, setFunciones] = useState<any[]>([]);
  const [peliculas, setPeliculas] = useState<any[]>([]);
  const [salas, setSalas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ pelicula_id: '', sala_id: '', fecha: '', hora_inicio: '', hora_fin: '', precio: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [func, pel, sal] = await Promise.all([
        api.get('/funciones'),
        api.get('/peliculas'),
        api.get('/salas'),
      ]);
      setFunciones(func.data);
      setPeliculas(pel.data.filter((p: any) => p.ACTIVO));
      setSalas(sal.data.filter((s: any) => s.ACTIVO));
    } catch (e) { toast.error('Error al cargar datos'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        pelicula_id: parseInt(form.pelicula_id),
        sala_id: parseInt(form.sala_id),
        fecha: form.fecha,
        hora_inicio: form.hora_inicio,
        hora_fin: form.hora_fin,
        precio: parseFloat(form.precio),
      };

      if (editingId) {
        await api.put(`/funciones/${editingId}`, data);
        toast.success('Función actualizada');
      } else {
        await api.post('/funciones', data);
        toast.success('Función creada');
      }
      setShowModal(false);
      resetForm();
      loadData();
    } catch (e: any) { toast.error(e.response?.data?.error || 'Error'); }
  };

  const handleEdit = (f: any) => {
    setEditingId(f.ID);
    const fecha = f.FECHA ? new Date(f.FECHA).toISOString().slice(0, 10) : '';
    const horaInicio = f.HORA_INICIO ? new Date(f.HORA_INICIO).toTimeString().slice(0, 5) : '';
    const horaFin = f.HORA_FIN ? new Date(f.HORA_FIN).toTimeString().slice(0, 5) : '';
    setForm({ pelicula_id: String(f.PELICULA_ID), sala_id: String(f.SALA_ID), fecha, hora_inicio: horaInicio, hora_fin: horaFin, precio: String(f.PRECIO) });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Cancelar esta función?')) return;
    try {
      await api.delete(`/funciones/${id}`);
      toast.success('Función cancelada');
      loadData();
    } catch (e: any) { toast.error(e.response?.data?.error || 'Error'); }
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({ pelicula_id: '', sala_id: '', fecha: '', hora_inicio: '', hora_fin: '', precio: '' });
  };

  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('es-MX') : '';
  const formatTime = (d: string) => d ? new Date(d).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '';

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Funciones</h1>
          <p className="page-subtitle">Programación de proyecciones</p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
          <Plus size={18} /> Nueva Función
        </button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Película</th>
              <th>Sala</th>
              <th>Fecha</th>
              <th>Horario</th>
              <th>Precio</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {funciones.map(f => (
              <tr key={f.ID}>
                <td style={{ fontWeight: 600 }}>{f.PELICULA_TITULO}</td>
                <td>{f.SALA_NOMBRE}</td>
                <td>{formatDate(f.FECHA)}</td>
                <td>{formatTime(f.HORA_INICIO)} — {formatTime(f.HORA_FIN)}</td>
                <td>${f.PRECIO?.toFixed(2)}</td>
                <td>
                  <span className={`badge ${f.ESTADO === 'PROGRAMADA' ? 'badge-success' : f.ESTADO === 'CANCELADA' ? 'badge-danger' : 'badge-warning'}`}>
                    {f.ESTADO}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    {f.ESTADO === 'PROGRAMADA' && (
                      <>
                        <button className="btn btn-icon" onClick={() => handleEdit(f)}><Edit size={16} /></button>
                        <button className="btn btn-icon" onClick={() => handleDelete(f.ID)}><Trash2 size={16} /></button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {funciones.length === 0 && (
              <tr><td colSpan={7} className="empty-state"><Clapperboard size={32} /><h3>No hay funciones programadas</h3></td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingId ? 'Editar Función' : 'Nueva Función'}</h2>
              <button className="btn btn-icon" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Película *</label>
                <select className="form-select" value={form.pelicula_id} onChange={e => setForm({...form, pelicula_id: e.target.value})} required>
                  <option value="">Seleccione una película</option>
                  {peliculas.map(p => <option key={p.ID} value={p.ID}>{p.TITULO} ({p.DURACION_MIN} min)</option>)}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Sala *</label>
                  <select className="form-select" value={form.sala_id} onChange={e => setForm({...form, sala_id: e.target.value})} required>
                    <option value="">Seleccione una sala</option>
                    {salas.map(s => <option key={s.ID} value={s.ID}>{s.NOMBRE} ({s.CAPACIDAD} asientos)</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Fecha *</label>
                  <input className="form-input" type="date" value={form.fecha} onChange={e => setForm({...form, fecha: e.target.value})} required />
                </div>
              </div>
              <div className="form-row-3">
                <div className="form-group">
                  <label className="form-label">Hora Inicio *</label>
                  <input className="form-input" type="time" value={form.hora_inicio} onChange={e => setForm({...form, hora_inicio: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Hora Fin *</label>
                  <input className="form-input" type="time" value={form.hora_fin} onChange={e => setForm({...form, hora_fin: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Precio *</label>
                  <input className="form-input" type="number" min="0" step="0.01" value={form.precio} onChange={e => setForm({...form, precio: e.target.value})} required />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">{editingId ? 'Actualizar' : 'Crear'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
