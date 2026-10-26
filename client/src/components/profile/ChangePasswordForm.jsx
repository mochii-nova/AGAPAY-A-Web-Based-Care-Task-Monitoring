import { useState } from 'react';
import { CircleAlert, CircleCheck } from 'lucide-react';
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

// Change password: the backend checks the current one and saves the new one
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
      await api.patch('/users/me/password', { currentPassword: form.current, newPassword: form.next });
      setResult({ tone: 'success', text: 'Your password was changed. Use the new one next time you sign in.' });
      setForm(EMPTY);
    } catch (err) {
      const message = err.response?.data?.message;
      if (err.response?.status === 400 && /current password/i.test(message ?? '')) {
        setErrors({ current: 'Your current password is incorrect.' });
        document.getElementById('pw-current')?.focus();
      } else {
        setResult({
          tone: 'error',
          text: err.response ? message || "Couldn't change your password. Please try again." : "Can't reach the server. Please check that the backend is running.",
        });
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
          {result.tone === 'error' ? <CircleAlert size={18} aria-hidden="true" /> : <CircleCheck size={18} aria-hidden="true" />}
          <span>{result.text}</span>
        </div>
      )}
      <form onSubmit={handleSubmit} noValidate className="password-form">
        {/* Hidden, so password managers know which account this password belongs to */}
        <input type="text" name="username" autoComplete="username" value={employeeId} readOnly hidden />
        {field('current', 'Current password', { autoComplete: 'current-password', placeholder: 'Your current password' })}
        <div className="form-grid">
          {field('next', 'New password', {
            autoComplete: 'new-password',
            placeholder: 'At least 8 characters',
            hint: 'Use at least one letter and one number.',
          })}
          {field('confirm', 'Confirm new password', { autoComplete: 'new-password', placeholder: 'Type it again' })}
        </div>
        <div className="password-form__actions">
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {busy ? 'Saving…' : 'Update password'}
          </button>
        </div>
      </form>
    </section>
  );
}
