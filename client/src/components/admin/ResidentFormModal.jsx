import { useRef, useState } from 'react';
import { CircleAlert, Trash2 } from 'lucide-react';
import Modal from '../Modal';
import FormField from '../FormField';
import SelectField from '../SelectField';
import { TASK_CATEGORIES, relationshipOptions } from '../../constants';
import { isoDay } from '../../hooks/useShifts';
import useSaving from '../../hooks/useSaving';
import { sameText } from '../../utils/duplicates';
import DuplicateWarning from '../DuplicateWarning';

const GENDER_OPTIONS = [
  { value: '', label: 'Choose…' },
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

function validate(form, today, room) {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Please enter the full name.';
  if (!/^[A-Za-z0-9-]{3,20}$/.test(form.residentCode.trim())) errors.residentCode = 'Use only letters, numbers and dashes, like RP-2026-001.';
  if (!room) errors.roomId = 'Please choose a room.';
  else if (room.roomType === 'ward' && !form.bedId) errors.bedId = `Room ${room.roomNumber} is a ward. Please choose a bed.`;
  if (form.birthDate && form.birthDate > today) errors.birthDate = "The birth date can't be in the future.";
  if (form.contactPhone.trim() && !PHONE.test(form.contactPhone.replace(/[\s-]/g, ''))) errors.contactPhone = 'Use 11 digits starting with 09.';
  return errors;
}

// The form inside the pop-up: a new resident (`resident` empty) or changes to one
function ResidentForm({ resident, residents, suggestedCode, rooms, onSave, onClose, onDelete }) {
  const adding = !resident;
  const today = isoDay(new Date());
  const contact = resident?.emergencyContact ?? {};
  const [form, setForm] = useState({
    name: resident?.name ?? '',
    residentCode: resident?.residentCode ?? suggestedCode,
    roomId: resident?.roomId ? String(resident.roomId) : '',
    bedId: resident?.bedId ? String(resident.bedId) : '',
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
  const [saving, setSaving, startSaving] = useSaving();

  const handleChange = (e) => {
    const { name, value } = e.target;
    // A different room: choose the bed again
    setForm({ ...form, [name]: value, ...(name === 'roomId' && { bedId: '' }) });
    setErrors({ ...errors, [name]: undefined, ...(name === 'roomId' && { bedId: undefined }) });
  };

  // Rooms with space (and this resident's own room). A ward shows how many beds are free.
  const room = rooms.find((r) => String(r.id) === form.roomId);
  const roomOptions = [
    { value: '', label: rooms.length ? 'Choose a room' : 'No rooms yet: add one in Rooms & beds' },
    ...rooms
      .filter((r) => r.free > 0 || r.id === resident?.roomId)
      .map((r) => ({
        value: String(r.id),
        label: r.roomType === 'ward' ? `${r.roomNumber} · Ward (${r.free} of ${r.capacity} beds free)` : `${r.roomNumber} · Private room`,
      })),
  ];
  // Free beds in the chosen ward (and this resident's own bed)
  const bedOptions = [
    { value: '', label: 'Choose a bed' },
    ...(room?.beds ?? [])
      .filter((b) => !b.resident || b.resident.id === resident?.id)
      .map((b) => ({ value: String(b.id), label: `Bed ${b.bedCode}` })),
  ];

  const toggleNeed = (id) =>
    setForm({ ...form, careNeeds: form.careNeeds.includes(id) ? form.careNeeds.filter((n) => n !== id) : [...form.careNeeds, id] });

  // Duplicates: a Resident ID already used shows under the field straight away; a resident with the same
  // name asks first ("Add another one anyway?")
  const others = residents.filter((r) => r.id !== resident?.id);
  const codeOwner = others.find((r) => sameText(r.residentCode, form.residentCode));
  const codeError = codeOwner ? `${codeOwner.residentCode} is already used by ${codeOwner.name}. Please use another ID.` : undefined;
  const sameNamed = form.name.trim() && !sameText(form.name, resident?.name) ? others.find((r) => sameText(r.name, form.name)) : null;
  const [dupAsked, setDupAsked] = useState(false); // the warning is showing
  const dupOk = useRef(''); // the name "Add anyway" was pressed for

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const found = validate(form, today, room);
    if (codeError) found.residentCode = codeError;
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      document.getElementById(`resident-${first}`)?.focus();
      return;
    }
    if (sameNamed && !sameText(dupOk.current, form.name)) {
      setDupAsked(true);
      return;
    }
    setDupAsked(false);
    if (!startSaving()) return;
    setSaveError('');
    try {
      await onSave({
        name: form.name.trim(),
        residentCode: form.residentCode.trim().toUpperCase(),
        roomId: Number(form.roomId),
        bedId: room?.roomType === 'ward' ? Number(form.bedId) : null, // a private room has no bed
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

  // (a Resident ID already in use shows its message as soon as it's typed)
  const field = (name, label, props = {}) => (
    <FormField
      id={`resident-${name}`}
      name={name}
      label={label}
      value={form[name]}
      onChange={handleChange}
      error={name === 'residentCode' ? codeError ?? errors.residentCode : errors[name]}
      {...props}
    />
  );

  return (
    <form className="staff-form" onSubmit={handleSubmit} noValidate>
      {saveError && (
        <div className="alert alert--error" role="alert">
          <CircleAlert size={18} aria-hidden="true" />
          <span>{saveError}</span>
        </div>
      )}

      {field('name', 'Full name', { placeholder: 'e.g. Lourdes Bautista', autoComplete: 'off' })}
      <div className="form-grid">
        {field('residentCode', 'Resident ID', { placeholder: 'e.g. RP-2026-001', autoComplete: 'off' })}
        <SelectField
          id="resident-roomId"
          name="roomId"
          label="Room"
          required
          value={form.roomId}
          onChange={handleChange}
          options={roomOptions}
          error={errors.roomId}
          hint="Private: one resident. Ward: several residents, each in a bed."
        />
      </div>
      {room?.roomType === 'ward' && (
        <SelectField id="resident-bedId" name="bedId" label="Bed" required value={form.bedId} onChange={handleChange} options={bedOptions} error={errors.bedId} />
      )}
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
        {field('contactName', 'Full name', { required: false, placeholder: 'e.g. Liza Villanueva', autoComplete: 'off' })}
        <SelectField
          id="resident-contactRelationship"
          name="contactRelationship"
          label="Relationship"
          value={form.contactRelationship}
          onChange={handleChange}
          options={relationshipOptions(form.contactRelationship)}
        />
      </div>
      {field('contactPhone', 'Phone number', { type: 'tel', required: false, placeholder: 'e.g. 0917 123 4567', autoComplete: 'off' })}

      {dupAsked && sameNamed && (
        <DuplicateWarning
          confirmLabel={adding ? 'Add anyway' : 'Save anyway'}
          onCancel={() => setDupAsked(false)}
          onConfirm={() => {
            dupOk.current = form.name.trim();
            handleSubmit();
          }}
        >
          A resident named <strong>{sameNamed.name}</strong> already exists ({sameNamed.residentCode}, Room {sameNamed.room}).{' '}
          {adding ? 'Add another one anyway?' : 'Save with the same name anyway?'}
        </DuplicateWarning>
      )}

      <div className="modal__footer modal__footer--inline">
        {!adding && onDelete && (
          <button type="button" className="btn btn--danger" style={{ marginRight: 'auto' }} onClick={onDelete}>
            <Trash2 size={16} aria-hidden="true" /> Delete resident
          </button>
        )}
        <button type="button" className="btn btn--outline" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn--primary" disabled={saving} aria-busy={saving}>
          {saving ? 'Saving…' : adding ? 'Add resident' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}

// Pop-up for "Add resident" (no `resident`) and "Edit".
// onSave(fields) saves to the backend and throws if it fails. `residents`: everyone already loaded, to
// spot a Resident ID or name that's already used.
export default function ResidentFormModal({ open, resident, residents = [], suggestedCode, rooms = [], onSave, onClose, onDelete }) {
  return (
    <Modal open={open} onClose={onClose} title={resident ? `Edit ${resident.name}` : 'Add resident'} size="lg">
      {open && <ResidentForm key={resident?.id ?? 'new'} resident={resident} residents={residents} suggestedCode={suggestedCode} rooms={rooms} onSave={onSave} onClose={onClose} onDelete={onDelete} />}
    </Modal>
  );
}
