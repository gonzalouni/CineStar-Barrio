import { useState } from 'react';
import api from '../api/client';
import toast from 'react-hot-toast';
import { BarChart3, Download, TrendingUp, TrendingDown, XCircle } from 'lucide-react';

export default function Reportes() {
  const [tab, setTab] = useState<'ocupacion' | 'ventas' | 'cancelaciones' | 'ranking'>('ocupacion');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  const loadReport = async (tipo: string) => {
    setLoading(true);
    try {
      const params: any = {};
      if (fechaDesde) params.fecha_desde = fechaDesde;
      if (fechaHasta) params.fecha_hasta = fechaHasta;
      
      const res = await api.get(`/reportes/${tipo}`, { params });
      setData(res.data);
    } catch (e) { toast.error('Error al cargar reporte'); }
    finally { setLoading(false); }
  };

  const exportReport = async (formato: 'csv' | 'pdf') => {
    try {
      const params: any = { formato };
      if (fechaDesde) params.fecha_desde = fechaDesde;
      if (fechaHasta) params.fecha_hasta = fechaHasta;

      const res = await api.get(`/reportes/exportar/${tab}`, { 
        params, 
        responseType: 'blob' 
      });
      
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `reporte_${tab}.${formato}`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success(`Reporte exportado en ${formato.toUpperCase()}`);
    } catch (e) { toast.error('Error al exportar'); }
  };

  const tabs = [
    { id: 'ocupacion', label: 'Ocupación', icon: BarChart3 },
    { id: 'ventas', label: 'Ventas', icon: TrendingUp },
    { id: 'cancelaciones', label: 'Cancelaciones', icon: XCircle },
    { id: 'ranking', label: 'Ranking', icon: TrendingDown },
  ];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reportes</h1>
          <p className="page-subtitle">Análisis y control de gestión</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button className="btn btn-secondary" onClick={() => exportReport('csv')}>
            <Download size={16} /> CSV
          </button>
          <button className="btn btn-primary" onClick={() => exportReport('pdf')}>
            <Download size={16} /> PDF
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-6)' }}>
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} className={`btn ${tab === t.id ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setTab(t.id as any); setData([]); }}>
              <Icon size={16} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="form-group">
          <label className="form-label">Desde</label>
          <input className="form-input" type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Hasta</label>
          <input className="form-input" type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={() => loadReport(tab)} disabled={loading}>
          Generar Reporte
        </button>
      </div>

      {loading && <div className="loading-spinner"><div className="spinner"></div></div>}

      {/* Results */}
      {data.length > 0 && (
        <div className="table-container" style={{ marginTop: 'var(--space-4)' }}>
          <table>
            <thead>
              <tr>
                {Object.keys(data[0]).map(key => (
                  <th key={key}>{key.replace(/_/g, ' ')}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i}>
                  {Object.values(row).map((val: any, j) => (
                    <td key={j}>
                      {typeof val === 'number' && String(Object.keys(row)[j]).includes('PORCENTAJE')
                        ? `${val}%`
                        : typeof val === 'number' && String(Object.keys(row)[j]).includes('INGRESO')
                        ? `$${val.toFixed(2)}`
                        : val != null ? String(val) : '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data.length === 0 && !loading && (
        <div className="empty-state" style={{ marginTop: 'var(--space-8)' }}>
          <BarChart3 size={48} />
          <h3>Seleccione las fechas y genere un reporte</h3>
        </div>
      )}
    </div>
  );
}
