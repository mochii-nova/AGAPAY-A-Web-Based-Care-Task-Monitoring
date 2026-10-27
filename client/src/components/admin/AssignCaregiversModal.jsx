import { useState } from 'react';
import { CircleAlert } from 'lucide-react';
import Modal from '../Modal';
import Avatar from '../Avatar';
import { SHIFTS } from '../../constants';

// The caregivers to choose from, grouped by their assigned shift ("Shift not set" last)
function groupByShift(caregivers) {
  const groups = SHIFTS.map((s) => ({ key: s.apiValue, title: `${s.label} shift`, people: caregivers.filter((c) => c.assignedShift === s.apiValue) }));
  groups.push({ key: 'none', title: 'Shift not set', people: caregivers.filter((c) => !SHIFTS.some((s) => s.apiValue === c.assignedShift)) });
  return groups.filter((g) => g.people.length);
}

function AssignForm({ resident, caregivers, residentCount, onSave, onClose }) {
  const [chosen, setChosen] = useState(() => resident.caregivers.map((c) => c.id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Active caregivers, plus anyone already assigned (so a deactivated one can be taken off)
  const options = caregivers.filter((c) => c.status === 'active' || chosen.includes(c.id));
  const toggle = (id) => setChosen(chosen.includes(id) ? chosen.filter((x) => x !== id) : [...chosen, id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave(chosen);
      onClose();
    } catch (err) {
      setError(err.response ? err.response.data?.message || "Couldn't save. Please try again." : "Can't reach the server. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="alert alert--error" role="alert">
          <CircleAlert size={18} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
      <p className="assign__intro">
        Assigned caregivers see {resident.name.split(' ')[0]} in My Residents and can write updates in their handovers.
      </p>

      {options.length === 0 ? (
        <p className="staff-details__empty">There are no active caregivers yet. Add or approve one in Manage Staff.</p>
      ) : (
        groupByShift(options).map((g) => (
          <fieldset key={g.key} className="assign__group">
            <legend className="small-label">{g.title}</legend>
            {g.people.map((c) => {
              const count = residentCount(c.id);
              return (
                <label key={c.id} className="assign__option">
                  <input type="checkbox" checked={chosen.includes(c.id)} onChange={() => toggle(c.id)} />
                  <Avatar name={c.name} photo={c.photoUrl} size={32} />
                  <span className="assign__who">
                    <strong>{c.name}</strong>
                    <small>
                      {c.status === 'active' ? `${count} ${count === 1 ? 'resident' : 'residents'}` : 'Deactivated'}
                    </small>
                  </span>
                </label>
              );
            })}
          </fieldset>
        ))
      )}

      <div className="modal__footer modal__footer--inline">
        <button type="button" className="btn btn--outline" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? 'Saving…' : 'Save caregivers'}</button>
      </div>
    </form>
  );
}

// Pop-up to choose who looks after a resident.
// `caregivers`: every caregiver account; residentCount(id): how many residents they have now;
// onSave(ids) saves to the backend and throws if it fails.
export default function AssignCaregiversModal({ resident, caregivers, residentCount, onSave, onClose }) {
  return (
    <Modal open={!!resident} onClose={onClose} title={resident ? `Caregivers for ${resident.name}` : ''}>
      {resident && (
        <AssignForm key={resident.id} resident={resident} caregivers={caregivers} residentCount={residentCount} onSave={onSave} onClose={onClose} />
      )}
    </Modal>
  );
}
