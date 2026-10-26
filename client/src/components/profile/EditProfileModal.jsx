import { useState } from 'react';
import { Camera, CircleAlert } from 'lucide-react';
import Modal from '../Modal';
import Avatar from '../Avatar';
import FormField from '../FormField';
import { useProfile } from '../../context/ProfileContext';
import { useToast } from '../../context/ToastContext';

const RELATIONSHIPS = ['Spouse', 'Parent', 'Son', 'Daughter', 'Sibling', 'Relative', 'Friend', 'Other'];
const PHONE = /^09\d{9}$/;

// Returns an error message for each field that is filled in wrong
function validate(form) {
  const errors = {};
  if (!form.firstName.trim()) errors.firstName = 'Please enter your first name.';
  if (!form.lastName.trim()) errors.lastName = 'Please enter your last name.';
  if (!form.email.trim()) errors.email = 'Please enter your email.';
  else if (!/^\S+@\S+\.\S+$/.test(form.email)) errors.email = 'Please enter a valid email, like name@example.com.';
  if (!PHONE.test(form.phone.replace(/[\s-]/g, ''))) errors.phone = 'Use 11 digits starting with 09, like 0917 555 0123.';
  if (!form.ecName.trim()) errors.ecName = "Please enter your emergency contact's name.";
  if (!PHONE.test(form.ecPhone.replace(/[\s-]/g, ''))) errors.ecPhone = 'Use 11 digits starting with 09.';
  return errors;
}

function EditProfileForm({ onClose }) {
  const { profile, updateProfile, openPhoto } = useProfile();
  const showToast = useToast();
  const [form, setForm] = useState({
    firstName: profile.firstName,
    lastName: profile.lastName,
    email: profile.email,
    phone: profile.phone,
    ecName: profile.emergencyContact.name,
    ecRelationship: profile.emergencyContact.relationship || RELATIONSHIPS[0],
    ecPhone: profile.emergencyContact.phone,
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
    const found = validate(form);
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      document.getElementById(`profile-${first}`)?.focus();
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      await updateProfile({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        emergencyContact: { name: form.ecName.trim(), relationship: form.ecRelationship, phone: form.ecPhone.trim() },
      });
      showToast('Profile saved.');
      onClose();
    } catch (err) {
      const message = err.response?.data?.message;
      if (err.response?.status === 409) {
        // This email is already used by another account
        setErrors({ email: message });
        document.getElementById('profile-email')?.focus();
      } else {
        setSaveError(err.response ? message || "Couldn't save your changes. Please try again." : "Can't reach the server. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  const field = (name, label, props = {}) => (
    <FormField id={`profile-${name}`} name={name} label={label} value={form[name]} onChange={handleChange} error={errors[name]} {...props} />
  );

  return (
    <form className="edit-profile" onSubmit={handleSubmit} noValidate>
      {saveError && (
        <div className="alert alert--error" role="alert">
          <CircleAlert size={18} aria-hidden="true" />
          <span>{saveError}</span>
        </div>
      )}

      <div className="edit-profile__photo">
        <Avatar name={profile.name} photo={profile.photo} size={64} />
        <button type="button" className="btn btn--soft btn--sm" onClick={openPhoto}>
          <Camera size={16} aria-hidden="true" /> Change photo
        </button>
      </div>

      <fieldset className="edit-profile__group">
        <legend className="small-label">Personal details</legend>
        <div className="form-grid">
          {field('firstName', 'First name', { autoComplete: 'given-name' })}
          {field('lastName', 'Last name', { autoComplete: 'family-name' })}
        </div>
        <div className="form-grid">
          {field('email', 'Email', { type: 'email', autoComplete: 'email' })}
          {field('phone', 'Phone number', { type: 'tel', autoComplete: 'tel', placeholder: '09XX XXX XXXX' })}
        </div>
      </fieldset>

      <fieldset className="edit-profile__group">
        <legend className="small-label">Emergency contact</legend>
        {field('ecName', 'Full name')}
        <div className="form-grid">
          <div className="field">
            <label htmlFor="profile-ecRelationship" className="field__label">
              Relationship <span className="field__required" aria-hidden="true">*</span>
            </label>
            <select id="profile-ecRelationship" name="ecRelationship" className="field__input select" value={form.ecRelationship} onChange={handleChange}>
              {RELATIONSHIPS.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          {field('ecPhone', 'Phone number', { type: 'tel', placeholder: '09XX XXX XXXX' })}
        </div>
      </fieldset>

      <div className="modal__footer modal__footer--inline">
        <button type="button" className="btn btn--outline" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
      </div>
    </form>
  );
}

export default function EditProfileModal({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="Edit profile" size="lg">
      {open && <EditProfileForm onClose={onClose} />}
    </Modal>
  );
}
