import { useState } from 'react';
import { CircleAlert, RefreshCw } from 'lucide-react';
import Modal from '../Modal';
import FormField from '../FormField';
import SelectField from '../SelectField';
import { useStaff } from '../../context/StaffContext';
import { useToast } from '../../context/ToastContext';
import { SHIFTS } from '../../constants';

const SHIFT_OPTIONS = [{ value: '', label: 'Not set' }, ...SHIFTS.map((s) => ({ value: s.apiValue, label: `${s.label} · ${s.start} – ${s.end}` }))];
const ROLE_OPTIONS = [
  { value: 'caregiver', label: 'Caregiver' },
  { value: 'admin', label: 'Administrator' },
];
const PHONE = /^09\d{9}$/;

// e.g. "agapay-4k7m2" : easy to read out loud, always has letters and numbers
function temporaryPassword() {
  const letters = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const random = (set) => set[crypto.getRandomValues(new Uint32Array(1))[0] % set.length];
  return `agapay-${random(digits)}${random(letters)}${random(digits)}${random(letters)}${random(digits)}`;
}

function validate(form, adding) {
  const errors = {};
  if (adding) {
    if (!form.firstName.trim()) errors.firstName = 'Please enter the first name.';
    if (!form.lastName.trim()) errors.lastName = 'Please enter the last name.';
    if (!/^[A-Za-z0-9-]{3,20}$/.test(form.username.trim())) errors.username = 'Use only letters, numbers and dashes, like CGV-2026-019.';
    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email)) errors.email = 'Please enter a valid email, like name@example.com.';
    if (form.phone.trim() && !PHONE.test(form.phone.replace(/[\s-]/g, ''))) errors.phone = 'Use 11 digits starting with 09.';
    if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) {
      errors.password = 'Use at least 8 characters with a letter and a number.';
    }
  }
  return errors;
}

// The form inside the pop-up: a new account (`person` empty) or the admin-set details of one
function StaffForm({ person, isMe, onClose }) {
  const adding = !person;
  const { create, update } = useStaff();
  const showToast = useToast();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    phone: '',
    password: adding ? temporaryPassword() : '',
    role: person?.role ?? 'caregiver',
    assignedShift: person?.assignedShift ?? '',
    dateHired: person?.dateHired ?? '',
    title: person?.title ?? '',
  });
  const [errors, setErrors] = useState({});
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: undefined });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const found = validate(form, adding);
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      document.getElementById(`staff-${first}`)?.focus();
      return;
    }
    setSaving(true);
    setSaveError('');
    const adminDetails = { assignedShift: form.assignedShift || null, dateHired: form.dateHired || null, title: form.title.trim() };
    try {
      if (adding) {
        const saved = await create({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          username: form.username.trim().toUpperCase(),
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
          password: form.password,
          role: form.role,
          ...adminDetails,
        });
        showToast(`Account created for ${saved.name}. They can sign in now.`);
      } else {
        await update(person.id, isMe ? adminDetails : { ...adminDetails, role: form.role });
        showToast(`Saved ${person.name}'s details.`);
      }
      onClose(true);
    } catch (err) {
      const message = err.response?.data?.message;
      if (err.response?.status === 409) {
        const field = /email/i.test(message ?? '') ? 'email' : 'username';
        setErrors({ [field]: message });
        document.getElementById(`staff-${field}`)?.focus();
      } else {
        setSaveError(err.response ? message || "Couldn't save. Please try again." : "Can't reach the server. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  const field = (name, label, props = {}) => (
    <FormField id={`staff-${name}`} name={name} label={label} value={form[name]} onChange={handleChange} error={errors[name]} {...props} />
  );
  const select = (name, label, options, props = {}) => (
    <SelectField id={`staff-${name}`} name={name} label={label} value={form[name]} onChange={handleChange} options={options} {...props} />
  );

  return (
    <form className="staff-form" onSubmit={handleSubmit} noValidate>
      {saveError && (
        <div className="alert alert--error" role="alert">
          <CircleAlert size={18} aria-hidden="true" />
          <span>{saveError}</span>
        </div>
      )}

      {adding && (
        <>
          <div className="form-grid">
            {field('firstName', 'First name', { placeholder: 'e.g. Mark', autoComplete: 'off' })}
            {field('lastName', 'Last name', { placeholder: 'e.g. Dela Cruz', autoComplete: 'off' })}
          </div>
          <div className="form-grid">
            {field('username', 'Employee ID', { placeholder: 'e.g. CGV-2026-019', autoComplete: 'off' })}
            {select('role', 'Role', ROLE_OPTIONS)}
          </div>
          <div className="form-grid">
            {field('email', 'Email', { type: 'email', required: false, placeholder: 'e.g. mark.delacruz@gmail.com', autoComplete: 'off' })}
            {field('phone', 'Phone number', { type: 'tel', required: false, placeholder: 'e.g. 0917 123 4567', autoComplete: 'off' })}
          </div>
        </>
      )}

      <div className="form-grid">
        {select('assignedShift', 'Assigned shift', SHIFT_OPTIONS)}
        {field('dateHired', 'Date hired', { type: 'date', required: false })}
      </div>
      <div className="form-grid">
        {field('title', 'Job title', { required: false, placeholder: 'e.g. Caregiver' })}
        {!adding && !isMe && select('role', 'Role', ROLE_OPTIONS)}
      </div>

      {adding && (
        <div className="staff-form__password">
          {field('password', 'Temporary password', {
            type: 'text',
            autoComplete: 'off',
            hint: 'Give this to them. They can change it in My profile after signing in.',
          })}
          <button type="button" className="btn btn--outline btn--sm" onClick={() => setForm({ ...form, password: temporaryPassword() })}>
            <RefreshCw size={16} aria-hidden="true" /> New password
          </button>
        </div>
      )}

      <div className="modal__footer modal__footer--inline">
        <button type="button" className="btn btn--outline" onClick={() => onClose(false)}>Cancel</button>
        <button type="submit" className="btn btn--primary" disabled={saving}>
          {saving ? 'Saving…' : adding ? 'Create account' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}

// Pop-up for "Add staff" (no `person`) and "Edit" (shift, date hired, title, role)
export default function StaffFormModal({ open, person, isMe, onClose }) {
  return (
    <Modal open={open} onClose={() => onClose(false)} title={person ? `Edit ${person.name}` : 'Add staff'} size="lg">
      {open && <StaffForm key={person?.id ?? 'new'} person={person} isMe={isMe} onClose={onClose} />}
    </Modal>
  );
}
