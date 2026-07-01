import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Film, Clapperboard, DoorOpen, Armchair,
  Ticket, Search, Users, BarChart3, LogOut, Star
} from 'lucide-react';

export default function Sidebar() {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'OPERADOR'] },
    { path: '/cartelera', label: 'Cartelera', icon: Star, roles: ['ADMIN', 'OPERADOR'] },
    { path: '/peliculas', label: 'Películas', icon: Film, roles: ['ADMIN'] },
    { path: '/funciones', label: 'Funciones', icon: Clapperboard, roles: ['ADMIN'] },
    { path: '/salas', label: 'Salas', icon: DoorOpen, roles: ['ADMIN'] },
    { path: '/reservas', label: 'Reservar', icon: Armchair, roles: ['ADMIN', 'OPERADOR'] },
    { path: '/mis-reservas', label: 'Reservas', icon: Ticket, roles: ['ADMIN', 'OPERADOR'] },
    { path: '/consultas', label: 'Consultas', icon: Search, roles: ['ADMIN', 'OPERADOR'] },
    { path: '/usuarios', label: 'Usuarios', icon: Users, roles: ['ADMIN'] },
    { path: '/reportes', label: 'Reportes', icon: BarChart3, roles: ['ADMIN'] },
  ];

  const filteredItems = navItems.filter(item => item.roles.includes(user?.rol || ''));

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="logo-icon">🎬</div>
          <div className="logo-text">
            <span className="logo-title">CineStar</span>
            <span className="logo-subtitle">Barrio</span>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {filteredItems.map(item => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="user-card">
          <div className="user-avatar">
            {user?.nombre?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="user-info">
            <span className="user-name">{user?.nombre || 'Usuario'}</span>
            <span className="user-role">{user?.rol === 'ADMIN' ? 'Administrador' : 'Operador'}</span>
          </div>
        </div>
        <button className="btn-icon logout-btn" onClick={logout} title="Cerrar sesión">
          <LogOut size={18} />
        </button>
      </div>

      <style>{`
        .sidebar {
          width: var(--sidebar-width);
          height: 100vh;
          position: fixed;
          left: 0;
          top: 0;
          background: var(--bg-secondary);
          border-right: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          z-index: 100;
          overflow-y: auto;
        }

        .sidebar-header {
          padding: var(--space-5) var(--space-5);
          border-bottom: 1px solid var(--border-color);
        }

        .sidebar-logo {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }

        .logo-icon {
          font-size: 28px;
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
          border-radius: var(--radius-lg);
        }

        .logo-text {
          display: flex;
          flex-direction: column;
        }

        .logo-title {
          font-size: var(--font-size-lg);
          font-weight: 800;
          background: linear-gradient(135deg, var(--text-primary), var(--color-primary-light));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          line-height: 1.1;
        }

        .logo-subtitle {
          font-size: var(--font-size-xs);
          color: var(--text-muted);
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .sidebar-nav {
          flex: 1;
          padding: var(--space-4) var(--space-3);
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-3) var(--space-4);
          border-radius: var(--radius-md);
          font-size: var(--font-size-sm);
          font-weight: 500;
          color: var(--text-secondary);
          transition: all var(--transition-fast);
          text-decoration: none;
        }

        .nav-item:hover {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }

        .nav-item-active {
          background: rgba(37, 99, 235, 0.15);
          color: var(--color-primary-light);
          font-weight: 600;
        }

        .nav-item-active:hover {
          background: rgba(37, 99, 235, 0.2);
          color: var(--color-primary-light);
        }

        .sidebar-footer {
          padding: var(--space-4) var(--space-4);
          border-top: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-2);
        }

        .user-card {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          overflow: hidden;
        }

        .user-avatar {
          width: 36px;
          height: 36px;
          border-radius: var(--radius-full);
          background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: var(--font-size-sm);
          color: white;
          flex-shrink: 0;
        }

        .user-info {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .user-name {
          font-size: var(--font-size-sm);
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .user-role {
          font-size: var(--font-size-xs);
          color: var(--text-muted);
        }

        .logout-btn {
          color: var(--text-muted);
          flex-shrink: 0;
        }

        .logout-btn:hover {
          color: var(--color-danger);
          background: rgba(239, 68, 68, 0.1);
        }
      `}</style>
    </aside>
  );
}
