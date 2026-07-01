import { useState, useEffect } from 'react';
import api from '../api/client';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, Film, X } from 'lucide-react';

export default function Peliculas() {
  const [peliculas, setPeliculas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ titulo: '', duracion_min: '', clasificacion: 'PG-13', sinopsis: '', genero: '', poster_url: '' });

  useEffect(() => { loadPeliculas(); }, []);

  const loadPeliculas = async () => {
    try {
      const res = await api.get('/peliculas');
      setPeliculas(res.data);
    } catch (e) { toast.error('Error al cargar películas'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = { ...form, duracion_min: parseInt(form.duracion_min) };
      if (editingId) {
        await api.put(`/peliculas/${editingId}`, data);
        toast.success('Película actualizada');
      } else {
        await api.post('/peliculas', data);
        toast.success('Película creada');
      }
      setShowModal(false);
      resetForm();
      loadPeliculas();
    } catch (e: any) { toast.error(e.response?.data?.error || 'Error'); }
  };

  const handleEdit = (p: any) => {
    setEditingId(p.ID);
    setForm({ titulo: p.TITULO, duracion_min: String(p.DURACION_MIN), clasificacion: p.CLASIFICACION, sinopsis: p.SINOPSIS || '', genero: p.GENERO, poster_url: p.POSTER_URL || '' });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Desactivar esta película?')) return;
    try {
      await api.delete(`/peliculas/${id}`);
      toast.success('Película desactivada');
      loadPeliculas();
    } catch (e) { toast.error('Error al desactivar'); }
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({ titulo: '', duracion_min: '', clasificacion: 'PG-13', sinopsis: '', genero: '', poster_url: '' });
  };

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Películas</h1>
          <p className="page-subtitle">Gestión del catálogo de películas</p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
          <Plus size={18} /> Nueva Película
        </button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Título</th>
              <th>Género</th>
              <th>Duración</th>
              <th>Clasificación</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {peliculas.map(p => (
              <tr key={p.ID}>
                <td style={{ fontWeight: 600 }}>{p.TITULO}</td>
                <td>{p.GENERO}</td>
                <td>{p.DURACION_MIN} min</td>
                <td><span className="badge badge-info">{p.CLASIFICACION}</span></td>
                <td>
                  <span className={`badge ${p.ACTIVO ? 'badge-success' : 'badge-danger'}`}>
                    {p.ACTIVO ? 'Activa' : 'Inactiva'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <button className="btn btn-icon" onClick={() => handleEdit(p)}><Edit size={16} /></button>
                    <button className="btn btn-icon" onClick={() => handleDelete(p.ID)}><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {peliculas.length === 0 && (
              <tr><td colSpan={6} className="empty-state"><Film size={32} /><h3>No hay películas registradas</h3></td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingId ? 'Editar Película' : 'Nueva Película'}</h2>
              <button className="btn btn-icon" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Título *</label>
                <input className="form-input" value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Duración (min) *</label>
                  <input className="form-input" type="number" min="1" value={form.duracion_min} onChange={e => setForm({...form, duracion_min: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Clasificación *</label>
                  <select className="form-select" value={form.clasificacion} onChange={e => setForm({...form, clasificacion: e.target.value})}>
                    {['G','PG','PG-13','R','NC-17','TE','TP','A','B','B15','C','D'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Género *</label>
                <input className="form-input" value={form.genero} onChange={e => setForm({...form, genero: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">Sinopsis</label>
                <textarea className="form-textarea" value={form.sinopsis} onChange={e => setForm({...form, sinopsis: e.target.value})} />
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
