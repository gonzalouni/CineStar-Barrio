import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function AppLayout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{
        flex: 1,
        marginLeft: 'var(--sidebar-width)',
        padding: 'var(--space-8)',
        minHeight: '100vh',
        overflow: 'auto',
      }}>
        <Outlet />
      </main>
    </div>
  );
}
