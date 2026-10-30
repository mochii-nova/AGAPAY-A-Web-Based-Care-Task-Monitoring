import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { CircleAlert, CircleCheck, Phone, Mail } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../components/AuthLayout';
import FormField from '../components/FormField';
import Modal from '../components/Modal';
import GoogleButton from '../components/GoogleButton';
import { homeFor } from '../utils/roles';
// Web-sized copy of the original signin-photo.jpg (kept in design-reference/)
import signinPhoto from '../assets/images/signin-photo.webp';

// Why api.js signed the person out (e.g. "Your account is inactive."), shown once
function readSignedOutReason() {
  try {
    const reason = sessionStorage.getItem('agapay.signedOut');
    sessionStorage.removeItem('agapay.signedOut');
    return reason;
  } catch {
    return null;
  }
}

export default function Login() {
  const location = useLocation();
  const { user, login } = useAuth();

  // Register sends people here with their Employee ID and the backend's "waiting for approval" message
  const justRegistered = location.state?.registered;
  // api.js sends people here with ?expired=1 when their session ends,
  // and saves the reason when the account was deactivated
  const sessionExpired = new URLSearchParams(location.search).has('expired');
  const [signedOutReason] = useState(readSignedOutReason);
  const [username, setUsername] = useState(location.state?.username ?? '');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState(null); // { tone, text }
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  // Already signed in? Go straight to your Home (admins to the admin side).
  if (user) return <Navigate to={homeFor(user)} replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const found = {};
    if (!username.trim()) found.username = 'Please enter your Employee ID or email.';
    if (!password) found.password = 'Please enter your password.';
    setFieldErrors(found);
    if (Object.keys(found).length > 0) return;

    await signIn(() => api.post('/auth/login', { username: username.trim(), password }));
  };

  // Google gave us a signed ID token; the backend checks it and matches the email to an approved account
  const handleGoogle = (accessToken) => {
    if (loading) return;
    setError(null);
    setFieldErrors({});
    signIn(() => api.post('/auth/google', { accessToken }));
  };

  // Shared by both ways of signing in
  const signIn = async (request) => {
    setLoading(true);
    try {
      const { data } = await request();
      // Signing in is enough: the "already signed in" line above then takes them to their Home.
      // (Navigating here as well made two redirects at once, which left the admin side blank.)
      login(data);
    } catch (err) {
      const status = err.response?.status;
      const message = err.response?.data?.message;
      // 403 = the account is waiting for approval (info), inactive, or not linked to Google (error)
      const waiting = status === 403 && /approval/i.test(message ?? '');
      setError({
        tone: waiting ? 'info' : 'error',
        text: err.response
          ? message || 'Sign in failed. Please try again.'
          : "Can't reach the server. Please check that the backend is running.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      photo={signinPhoto}
      panelTitle="Welcome back."
      panelTitleSoft="Today’s care is waiting."
      panelText="See your shift, your tasks and the latest handover."
    >
      <h1 className="auth__title">Sign in</h1>
      <p className="auth__subtitle">Use your Employee ID or email and your password.</p>

      {justRegistered && !error && (
        <div className="alert alert--success" role="status">
          <CircleCheck size={18} aria-hidden="true" />
          <span>
            {location.state?.message ?? 'Account created. An administrator needs to approve it before you can sign in.'}
          </span>
        </div>
      )}

      {sessionExpired && !justRegistered && !error && (
        <div className={`alert alert--${signedOutReason ? 'error' : 'info'}`} role="status">
          <CircleAlert size={18} aria-hidden="true" />
          <span>{signedOutReason ? `You were signed out. ${signedOutReason}` : 'Your session has ended. Please sign in again.'}</span>
        </div>
      )}

      {error && (
        <div className={`alert alert--${error.tone}`} role={error.tone === 'error' ? 'alert' : 'status'}>
          <CircleAlert size={18} aria-hidden="true" />
          <span>{error.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="auth__form">
        <FormField
          id="login-username"
          label="Employee ID or email"
          placeholder="e.g. CGV-2026-017"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          error={fieldErrors.username}
        />
        <FormField
          id="login-password"
          label="Password"
          type="password"
          placeholder="Your password"
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
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      {/* Second way in. The Employee ID + password form above stays the main one and the backup. */}
      <GoogleButton
        onToken={handleGoogle}
        onError={(text) => setError({ tone: 'error', text })}
        disabled={loading}
      />

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
