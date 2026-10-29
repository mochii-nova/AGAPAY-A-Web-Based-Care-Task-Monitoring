import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { CircleAlert } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../components/AuthLayout';
import FormField from '../components/FormField';
import Modal from '../components/Modal';
import { homeFor } from '../utils/roles';
// Web-sized copy of the original register-photo.jpg (kept in design-reference/)
import registerPhoto from '../assets/images/register-photo.webp';

const EMPTY = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  employeeId: '',
  password: '',
  confirm: '',
  agree: false,
};

// Returns an error message for each field that is filled in wrong
function validate(form) {
  const errors = {};
  if (!form.firstName.trim()) errors.firstName = 'Please enter your first name.';
  if (!form.lastName.trim()) errors.lastName = 'Please enter your last name.';
  if (!form.email.trim()) errors.email = 'Please enter your email.';
  else if (!/^\S+@\S+\.\S+$/.test(form.email)) errors.email = 'Please enter a valid email, like name@example.com.';
  if (!form.phone.trim()) errors.phone = 'Please enter your phone number.';
  else if (!/^09\d{9}$/.test(form.phone.replace(/[\s-]/g, ''))) errors.phone = 'Use 11 digits starting with 09, like 0917 555 0123.';
  if (!form.employeeId.trim()) errors.employeeId = 'Please enter your Employee ID.';
  else if (!/^[A-Za-z0-9-]{3,20}$/.test(form.employeeId.trim())) errors.employeeId = 'Use only letters, numbers and dashes, like CGV-2026-017.';
  if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) {
    errors.password = 'Use at least 8 characters with a letter and a number.';
  }
  if (!form.confirm) errors.confirm = 'Please type your password again.';
  else if (form.confirm !== form.password) errors.confirm = "The passwords don't match.";
  if (!form.agree) errors.agree = 'Please agree to the Terms and Conditions.';
  return errors;
}

// Caregiver sign-up. There is no account type choice: every new account is a caregiver.
export default function Register() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);

  if (user) return <Navigate to={homeFor(user)} replace />;

  const handleChange = (e) => {
    const { name, type, value, checked } = e.target;
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
    setErrors({ ...errors, [name]: undefined });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      document.getElementById(`reg-${Object.keys(found)[0]}`)?.focus();
      return;
    }

    // The backend's login name is the Employee ID. New accounts wait for an administrator to approve them.
    const username = form.employeeId.trim().toUpperCase();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        username,
        password: form.password,
      });
      navigate('/login', { state: { registered: true, username, message: data?.message } });
    } catch (err) {
      if (err.response?.status === 409) {
        // 409 = the Employee ID or the email already has an account; the message says which
        const field = /email/i.test(err.response.data?.message ?? '') ? 'email' : 'employeeId';
        setErrors({ [field]: err.response.data?.message || 'This Employee ID already has an account.' });
        document.getElementById(`reg-${field}`)?.focus();
      } else {
        setError(
          err.response
            ? err.response.data?.message || 'Could not create your account. Please try again.'
            : "Can't reach the server. Please check that the backend is running."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Shortcut so each field below is one short line
  const field = (name, label, props = {}) => (
    <FormField id={`reg-${name}`} name={name} label={label} value={form[name]} onChange={handleChange} error={errors[name]} {...props} />
  );

  return (
    <AuthLayout
      photo={registerPhoto}
      photoPosition="center top"
      photoPositionPhone="center 38%"
      panelTitle="Your role in better care"
      panelTitleSoft="starts here."
      panelText="Create your caregiver account. Once an administrator approves it, you can sign in and see your shift and tasks."
      wide
    >
      <h1 className="auth__title">Create your account</h1>
      <p className="auth__subtitle">For caregivers. An administrator reviews every new account.</p>

      {error && (
        <div className="alert alert--error" role="alert">
          <CircleAlert size={18} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="auth__form">
        <div className="form-grid">
          {field('firstName', 'First name', { placeholder: 'e.g. Juan', autoComplete: 'given-name' })}
          {field('lastName', 'Last name', { placeholder: 'e.g. Dela Cruz', autoComplete: 'family-name' })}
        </div>
        <div className="form-grid">
          {field('email', 'Email', { type: 'email', placeholder: 'e.g. juan.delacruz@gmail.com', autoComplete: 'email' })}
          {field('phone', 'Phone number', { type: 'tel', placeholder: 'e.g. 0917 123 4567', autoComplete: 'tel' })}
        </div>
        {field('employeeId', 'Employee ID', {
          placeholder: 'e.g. CGV-2026-017',
          hint: 'You’ll use this to sign in.',
          autoComplete: 'username',
        })}
        <div className="form-grid">
          {field('password', 'Password', {
            type: 'password',
            placeholder: 'At least 8 characters',
            autoComplete: 'new-password',
          })}
          {field('confirm', 'Confirm password', { type: 'password', placeholder: 'Type it again', autoComplete: 'new-password' })}
        </div>

        <div className="field">
          <div className="checkbox-row">
            <input
              type="checkbox"
              id="reg-agree"
              name="agree"
              checked={form.agree}
              onChange={handleChange}
              aria-invalid={!!errors.agree}
              aria-describedby={errors.agree ? 'reg-agree-error' : undefined}
            />
            <label htmlFor="reg-agree">I agree to the</label>
            <button type="button" className="link-btn" onClick={() => setTermsOpen(true)}>
              Terms and Conditions
            </button>
          </div>
          {errors.agree && <p id="reg-agree-error" className="field__error">{errors.agree}</p>}
        </div>

        <button type="submit" className="btn btn--primary auth__submit" disabled={loading}>
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="auth__switch">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>

      <Modal open={termsOpen} onClose={() => setTermsOpen(false)} title="Terms and Conditions"
        footer={
          <>
            <button type="button" className="btn btn--outline" onClick={() => setTermsOpen(false)}>Close</button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                setForm({ ...form, agree: true });
                setErrors({ ...errors, agree: undefined });
                setTermsOpen(false);
              }}
            >
              I agree
            </button>
          </>
        }
      >
        <ol className="terms-list">
          <li>AGAPAY is for authorized staff of the care home only.</li>
          <li>Keep your Employee ID and password private. Don't share your account.</li>
          <li>Resident information is confidential. Only view and record what you need for care.</li>
          <li>Record tasks and handovers truthfully and on time.</li>
          <li>AGAPAY helps organize care. It does not give medical advice or replace a nurse's or doctor's judgment.</li>
          <li>The administrator may review activity and may deactivate accounts that break these rules.</li>
        </ol>
      </Modal>
    </AuthLayout>
  );
}
