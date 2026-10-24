import { useState } from 'react';
import { CircleAlert, Info } from 'lucide-react';
import api from '../../api';
import FormField from '../FormField';
import CardHeader from '../CardHeader';

const EMPTY = { current: '', next: '', confirm: '' };

function validate(form) {
  const errors = {};
  if (!form.current) errors.current = 'Please enter your current password.';
  if (form.next.length < 8 || !/[A-Za-z]/.test(form.next) || !/\d/.test(form.next)) {
    errors.next = 'Use at least 8 characters with a letter and a number.';
  } else if (form.next === form.current) {
    errors.next = 'Your new password must be different from your current one.';
  }
  if (!form.confirm) errors.confirm = 'Please type your new password again.';
  else if (form.confirm !== form.next) errors.confirm = "The new passwords don't match.";
  return errors;
}

// Change password. The backend can check the current password (with the login route),
// but it has no route to save a new one yet, so nothing is changed and the form says so.
export default function ChangePasswordForm({ employeeId }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [result, setResult] = useState(null); // { tone, text }
  const [busy, setBusy] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: undefined });
    setResult(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      document.getElementById(`pw-${first}`)?.focus();
      return;
    }

    setBusy(true);
    try {
      await api.post('/auth/login', { username: employeeId, password: form.current });
      // TODO: call PATCH /api/users/me/password once the backend has it
      setResult({
        tone: 'info',
        text: 'Your current password is correct, but changing passwords isn’t available yet. Your password has not been changed.',
      });
      setForm(EMPTY);
    } catch (err) {
      if (err.response?.status === 401) {
        setErrors({ current: 'Your current password is incorrect.' });
        document.getElementById('pw-current')?.focus();
      } else {
        setResult({ tone: 'error', text: "Can't reach the server. Please check that the backend is running." });
      }
    } finally {
      setBusy(false);
    }
  };

  const field = (name, label, props) => (
    <FormField id={`pw-${name}`} name={name} label={label} type="password" value={form[name]} onChange={handleChange} error={errors[name]} {...props} />
  );

  return (
    <section className="card">
      <CardHeader title="Change password" />
      {result && (
        <div className={`alert alert--${result.tone}`} role={result.tone === 'error' ? 'alert' : 'status'}>
          {result.tone === 'error' ? <CircleAlert size={18} aria-hidden="true" /> : <Info size={18} aria-hidden="true" />}
          <span>{result.text}</span>
        </div>
      )}
      <form onSubmit={handleSubmit} noValidate className="password-form">
        {field('current', 'Current password', { autoComplete: 'current-password' })}
        <div className="form-grid">
          {field('next', 'New password', { autoComplete: 'new-password', hint: 'At least 8 characters, with a letter and a number.' })}
          {field('confirm', 'Confirm new password', { autoComplete: 'new-password' })}
        </div>
        <div className="password-form__actions">
          <button type="submit" className="btn btn--soft" disabled={busy}>
            {busy ? 'Checking…' : 'Change password'}
          </button>
        </div>
      </form>
    </section>
  );
}
