import { useState } from 'react';
import { CircleAlert, Copy, Check } from 'lucide-react';
import Modal from '../Modal';
import { useStaff } from '../../context/StaffContext';

// "Forgot password": confirm, then show the temporary password once so the admin can pass it on
function ResetPassword({ person, onClose }) {
  const { resetPassword } = useStaff();
  const [password, setPassword] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const firstName = person.name.split(' ')[0];

  const reset = async () => {
    setBusy(true);
    setError('');
    try {
      setPassword(await resetPassword(person.id));
    } catch (err) {
      setError(err.response ? err.response.data?.message || "Couldn't reset the password." : "Can't reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
    } catch {
      // Copying can be blocked; the password is still on screen to read out
    }
  };

  if (password) {
    return (
      <>
        <p>Give this temporary password to {firstName}. It replaces their old password straight away.</p>
        <div className="temp-password">
          <code>{password}</code>
          <button type="button" className="btn btn--outline btn--sm" onClick={copy}>
            {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />} {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <p className="field__hint">After signing in, {firstName} can choose a new password in My profile. This password won't be shown again.</p>
        <div className="modal__footer modal__footer--inline">
          <button type="button" className="btn btn--primary" onClick={onClose}>Done</button>
        </div>
      </>
    );
  }

  return (
    <>
      {error && (
        <div className="alert alert--error" role="alert">
          <CircleAlert size={18} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
      <p>
        {person.name}'s current password will stop working, and you'll get a temporary one to give them.
      </p>
      <div className="modal__footer modal__footer--inline">
        <button type="button" className="btn btn--outline" onClick={onClose} disabled={busy}>Cancel</button>
        <button type="button" className="btn btn--primary" onClick={reset} disabled={busy}>
          {busy ? 'Resetting…' : 'Reset password'}
        </button>
      </div>
    </>
  );
}

export default function ResetPasswordModal({ person, onClose }) {
  return (
    <Modal open={!!person} onClose={onClose} title="Reset password" size="sm">
      {person && <ResetPassword key={person.id} person={person} onClose={onClose} />}
    </Modal>
  );
}
