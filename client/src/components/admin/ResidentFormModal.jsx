import { useState } from 'react';
import { CircleAlert } from 'lucide-react';
import Modal from '../Modal';
import FormField from '../FormField';
import SelectField from '../SelectField';
import { TASK_CATEGORIES } from '../../constants';
import { isoDay } from '../../hooks/useShifts';

const GENDER_OPTIONS = [
  { value: '', label: 'Not set' },
  { value: 'Female', label: 'Female' },
  { value: 'Male', label: 'Male' },
];
const PHONE = /^09\d{9}$/;

// The next free Resident ID for this year, e.g. "RP-2026-005"
export function nextResidentCode(residents, year = new Date().getFullYear()) {
  const pattern = new RegExp(`^RP-${year}-(\\d+)$`);
  const used = residents.map((r) => Number(r.residentCode.match(pattern)?.[1] ?? 0));
  return `RP-${year}-${String(Math.max(0, ...used) + 1).padStart(3, '0')}`;
}

function validate(form, today) {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Please enter the full name.';
  if (!/^[A-Za-z0-9-]{3,20}$/.test(form.residentCode.trim())) errors.residentCode = 'Use only letters, numbers and dashes, like RP-2026-001.';
  if (!form.room.trim()) errors.room = 'Please enter the room.';
  if (form.birthDate && form.birthDate > today) errors.birthDate = "The birth date can't be in the future.";
  if (form.contactPhone.trim() && !PHONE.test(form.contactPhone.replace(/[\s-]/g, ''))) errors.contactPhone = 'Use 11 digits starting with 09.';
  return errors;
}

// The form inside the pop-up: a new resident (`resident` empty) or changes to one
function ResidentForm({ resident, suggestedCode, onSave, onClose }) {
  const adding = !resident;
  const today = isoDay(new Date());
  const contact = resident?.emergencyContact ?? {};
  const [form, setForm] = useState({
    name: resident?.name ?? '',
    residentCode: resident?.residentCode ?? suggestedCode,
    room: resident?.room ?? '',
    birthDate: resident?.birthDate ?? '',
    gender: resident?.gender ?? '',
    careNeeds: resident?.careNeeds ?? [],
    careNote: resident?.careNote ?? '',
    contactName: contact.name ?? '',
    contactRelationship: contact.relationship ?? '',
    contactPhone: contact.phone ?? '',
  });
  const [errors, setErrors] = useState({});
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: undefined });
  };

  const toggleNeed = (id) =>
    setForm({ ...form, careNeeds: form.careNeeds.includes(id) ? form.careNeeds.filter((n) => n !== id) : [...form.careNeeds, id] });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const found = validate(form, today);
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      document.getElementById(`resident-${first}`)?.focus();
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      await onSave({
        name: form.name.trim(),
        residentCode: form.residentCode.trim().toUpperCase(),
        room: form.room.trim(),
        birthDate: form.birthDate || null,
        gender: form.gender || null,
        // Same order as everywhere else
        careNeeds: TASK_CATEGORIES.map((c) => c.id).filter((id) => form.careNeeds.includes(id)),
        careNote: form.careNote.trim(),
        emergencyContact: {
          name: form.contactName.trim(),
          relationship: form.contactRelationship.trim(),
          phone: form.contactPhone.trim(),
        },
      });
      onClose();
    } catch (err) {
      const message = err.response?.data?.message;
      if (err.response?.status === 409) {
        setErrors({ residentCode: message });
        document.getElementById('resident-residentCode')?.focus();
      } else {
        setSaveError(err.response ? message || "Couldn't save. Please try again." : "Can't reach the server. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  const field = (name, label, props = {}) => (
    <FormField id={`resident-${name}`} name={name} label={label} value={form[name]} onChange={handleChange} error={errors[name]} {...props} />
  );

  return (
    <form className="staff-form" onSubmit={handleSubmit} noValidate>
      {saveError && (
        <div className="alert alert--error" role="alert">
          <CircleAlert size={18} aria-hidden="true" />
          <span>{saveError}</span>
        </div>
      )}

      {field('name', 'Full name', { placeholder: 'e.g. Maria Santos', autoComplete: 'off' })}
      <div className="form-grid">
        {field('residentCode', 'Resident ID', { placeholder: 'e.g. RP-2026-001', autoComplete: 'off' })}
        {field('room', 'Room', { placeholder: 'e.g. 102', autoComplete: 'off' })}
      </div>
      <div className="form-grid">
        {field('birthDate', 'Birth date', { type: 'date', required: false, max: today })}
        <SelectField id="resident-gender" name="gender" label="Gender" value={form.gender} onChange={handleChange} options={GENDER_OPTIONS} />
      </div>

      <fieldset className="field need-picker">
        <legend className="field__label">Care needs</legend>
        <div className="need-picker__options">
          {TASK_CATEGORIES.map((c) => (
            <label key={c.id} className="need-picker__option">
              <input type="checkbox" checked={form.careNeeds.includes(c.id)} onChange={() => toggleNeed(c.id)} />
              <c.icon size={16} aria-hidden="true" />
              {c.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="field">
        <label htmlFor="resident-careNote" className="field__label">Special instructions</label>
        <textarea
          id="resident-careNote"
          name="careNote"
          className="field__input"
          rows={3}
          maxLength={2000}
          placeholder="e.g. Uses a walker. Soft diet."
          value={form.careNote}
          onChange={handleChange}
        />
      </div>

      <h3 className="small-label resident-form__group">Emergency contact</h3>
      <div className="form-grid">
        {field('contactName', 'Name', { required: false, placeholder: 'e.g. Liza Santos-Uy', autoComplete: 'off' })}
        {field('contactRelationship', 'Relationship', { required: false, placeholder: 'e.g. Daughter', autoComplete: 'off' })}
      </div>
      {field('contactPhone', 'Phone number', { type: 'tel', required: false, placeholder: 'e.g. 0917 123 4567', autoComplete: 'off' })}

      <div className="modal__footer modal__footer--inline">
        <button type="button" className="btn btn--outline" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn--primary" disabled={saving}>
          {saving ? 'Saving…' : adding ? 'Add resident' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}

// Pop-up for "Add resident" (no `resident`) and "Edit".
// onSave(fields) saves to the backend and throws if it fails.
export default function ResidentFormModal({ open, resident, suggestedCode, onSave, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title={resident ? `Edit ${resident.name}` : 'Add resident'} size="lg">
      {open && <ResidentForm key={resident?.id ?? 'new'} resident={resident} suggestedCode={suggestedCode} onSave={onSave} onClose={onClose} />}
    </Modal>
  );
}
