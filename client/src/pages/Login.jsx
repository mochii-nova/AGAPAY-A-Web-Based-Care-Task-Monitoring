import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { CircleAlert, CircleCheck, Phone, Mail } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../components/AuthLayout';
import FormField from '../components/FormField';
import Modal from '../components/Modal';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login } = useAuth();

  // Register sends people here with their Employee ID after creating an account
  const justRegistered = location.state?.registered;
  // api.js sends people here with ?expired=1 when their login token runs out
  const sessionExpired = new URLSearchParams(location.search).has('expired');
  const [username, setUsername] = useState(location.state?.username ?? '');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  // Already signed in? Go straight to the dashboard.
  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const found = {};
    if (!username.trim()) found.username = 'Please enter your Employee ID.';
    if (!password) found.password = 'Please enter your password.';
    setFieldErrors(found);
    if (Object.keys(found).length > 0) return;

    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { username: username.trim(), password });
      login(data);
      navigate('/dashboard');
    } catch (err) {
      setError(
        err.response
          ? err.response.data?.message || 'Sign in failed. Please try again.'
          : "Can't reach the server. Please check that the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      panelTitle="Welcome back"
      panelContent={
        <p className="auth__panel-text">
          Log in to access today's care schedules, handover logs, and resident updates for Orchid Carehome Inc.
        </p>
      }
    >
      <h1 className="auth__title">Sign in to AGAPAY</h1>
      <p className="auth__subtitle">Enter your facility credentials to continue</p>

      {justRegistered && !error && (
        <div className="alert alert--success" role="status">
          <CircleCheck size={18} aria-hidden="true" />
          <span>Your account was created. You can now sign in.</span>
        </div>
      )}

      {sessionExpired && !justRegistered && !error && (
        <div className="alert alert--info" role="status">
          <CircleAlert size={18} aria-hidden="true" />
          <span>Your session has ended. Please sign in again.</span>
        </div>
      )}

      {error && (
        <div className="alert alert--error" role="alert">
          <CircleAlert size={18} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="auth__form">
        <FormField
          id="login-username"
          label="Employee ID"
          placeholder="e.g., CGV-2026-017"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          error={fieldErrors.username}
        />
        <FormField
          id="login-password"
          label="Password"
          type="password"
          placeholder="Enter your password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
        />

        <div className="auth__row-end">
          <button type="button" className="link-btn" onClick={() => setForgotOpen(true)}>
            Forgot password?
          </button>
        </div>

        <button type="submit" className="btn btn--primary auth__submit" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>

      <p className="auth__switch">
        New caregiver? <Link to="/register">Create an account</Link>
      </p>

      <Modal open={forgotOpen} onClose={() => setForgotOpen(false)} title="Forgot your password?" size="sm"
        footer={<button type="button" className="btn btn--primary" onClick={() => setForgotOpen(false)}>Got it</button>}
      >
        <p>For your security, passwords are reset by the facility administrator.</p>
        <p>Please contact the administrator and tell them your Employee ID:</p>
        <ul className="contact-lines">
          <li><Phone size={18} aria-hidden="true" /> <a href="tel:+63755290256">(075) 529 0256</a></li>
          <li><Mail size={18} aria-hidden="true" /> <a href="mailto:ctrlsiapray@gmail.com">ctrlsiapray@gmail.com</a></li>
        </ul>
      </Modal>
    </AuthLayout>
  );
}
