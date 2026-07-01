import { useState, useEffect } from 'react';
import api from '../api/client';
import toast from 'react-hot-toast';
import { Plus, Edit, UserCheck, UserX, Users, X } from 'lucide-react';

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ username: '', password: '', nombre_completo: '', rol: 'OPERADOR' as string });

  useEffect(() => { loadUsuarios(); }, []);

  const loadUsuarios = async () => {
    try {
      const res = await api.get('/usuarios');
      setUsuarios(res.data);
    } catch (e) { toast.error('Error al cargar usuarios'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/usuarios/${editingId}`, {
          nombre_completo: form.nombre_completo,
          rol: form.rol,
          password: form.password || undefined,
          activo: 1,
        });
        toast.success('Usuario actualizado');
      } else {
        await api.post('/usuarios', form);
        toast.success('Usuario creado');
      }
      setShowModal(false);
      resetForm();
      loadUsuarios();
    } catch (e: any) { toast.error(e.response?.data?.error || 'Error'); }
  };

  const toggleUsuario = async (id: number) => {
    try {
      await api.put(`/usuarios/${id}/toggle`);
      toast.success('Estado actualizado');
      loadUsuarios();
    } catch (e) { toast.error('Error'); }
  };

  const handleEdit = (u: any) => {
    setEditingId(u.ID);
    setForm({ username: u.USERNAME, password: '', nombre_completo: u.NOMBRE_COMPLETO, rol: u.ROL });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({ username: '', password: '', nombre_completo: '', rol: 'OPERADOR' });
  };

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Usuarios</h1>
          <p className="page-subtitle">Gestión de operadores y administradores</p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
          <Plus size={18} /> Nuevo Usuario
        </button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Nombre Completo</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map(u => (
              <tr key={u.ID}>
                <td style={{ fontWeight: 600 }}>{u.USERNAME}</td>
                <td>{u.NOMBRE_COMPLETO}</td>
                <td><span className={`badge ${u.ROL === 'ADMIN' ? 'badge-primary' : 'badge-info'}`}>{u.ROL === 'ADMIN' ? 'Administrador' : 'Operador'}</span></td>
                <td><span className={`badge ${u.ACTIVO ? 'badge-success' : 'badge-danger'}`}>{u.ACTIVO ? 'Activo' : 'Inactivo'}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <button className="btn btn-icon" onClick={() => handleEdit(u)} title="Editar"><Edit size={16} /></button>
                    <button className="btn btn-icon" onClick={() => toggleUsuario(u.ID)} title={u.ACTIVO ? 'Desactivar' : 'Activar'}
                      style={{ color: u.ACTIVO ? 'var(--color-danger)' : 'var(--color-success)' }}>
                      {u.ACTIVO ? <UserX size={16} /> : <UserCheck size={16} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingId ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
              <button className="btn btn-icon" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Usuario *</label>
                <input className="form-input" value={form.username} onChange={e => setForm({...form, username: e.target.value})} required disabled={!!editingId} />
              </div>
              <div className="form-group">
                <label className="form-label">{editingId ? 'Nueva Contraseña (dejar vacío para no cambiar)' : 'Contraseña *'}</label>
                <input className="form-input" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required={!editingId} />
              </div>
              <div className="form-group">
                <label className="form-label">Nombre Completo *</label>
                <input className="form-input" value={form.nombre_completo} onChange={e => setForm({...form, nombre_completo: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">Rol *</label>
                <select className="form-select" value={form.rol} onChange={e => setForm({...form, rol: e.target.value})}>
                  <option value="OPERADOR">Operador</option>
                  <option value="ADMIN">Administrador</option>
                </select>
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
