import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Film, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(username, password);
      toast.success('¡Bienvenido a CineStar Barrio!');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container animate-slide-up">
        <div className="login-logo">
          <div className="login-logo-icon">🎬</div>
          <h1 className="login-title">CineStar Barrio</h1>
          <p className="login-subtitle">Sistema de Gestión de Reservas</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label" htmlFor="username">Usuario</label>
            <input
              id="username"
              type="text"
              className="form-input"
              placeholder="Ingrese su usuario"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Contraseña</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Ingrese su contraseña"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{ paddingRight: '44px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary btn-lg" 
            style={{ width: '100%', marginTop: 'var(--space-4)' }}
            disabled={loading}
          >
            {loading ? (
              <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }} />
            ) : (
              <>
                <Film size={18} />
                Iniciar Sesión
              </>
            )}
          </button>
        </form>

        <div className="login-hint">
          <p>Demo: <strong>admin</strong> / <strong>admin123</strong></p>
          <p>Operador: <strong>operador1</strong> / <strong>operador123</strong></p>
        </div>
      </div>

      <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-4);
          background: 
            radial-gradient(ellipse at 30% 20%, rgba(37, 99, 235, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 70% 80%, rgba(245, 158, 11, 0.1) 0%, transparent 50%),
            var(--bg-primary);
        }

        .login-container {
          width: 100%;
          max-width: 420px;
          background: var(--bg-glass);
          backdrop-filter: blur(16px);
          border: 1px solid var(--bg-glass-border);
          border-radius: var(--radius-2xl);
          padding: var(--space-10);
        }

        .login-logo {
          text-align: center;
          margin-bottom: var(--space-8);
        }

        .login-logo-icon {
          font-size: 48px;
          width: 80px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto var(--space-4);
          background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
          border-radius: var(--radius-xl);
          box-shadow: 0 8px 32px var(--color-primary-glow);
        }

        .login-title {
          font-size: var(--font-size-3xl);
          font-weight: 800;
          background: linear-gradient(135deg, var(--text-primary), var(--color-primary-light));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .login-subtitle {
          color: var(--text-secondary);
          font-size: var(--font-size-sm);
          margin-top: var(--space-1);
        }

        .login-form {
          margin-bottom: var(--space-6);
        }

        .login-hint {
          text-align: center;
          padding-top: var(--space-4);
          border-top: 1px solid var(--border-color);
        }

        .login-hint p {
          font-size: var(--font-size-xs);
          color: var(--text-muted);
          margin-bottom: var(--space-1);
        }

        .login-hint strong {
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
}
