import { useState } from 'react';
import { CircleAlert, Plus, Trash2 } from 'lucide-react';
import api from '../../api';
import Modal from '../Modal';
import FormField from '../FormField';
import SelectField from '../SelectField';
import useSaving from '../../hooks/useSaving';

const TYPE_OPTIONS = [
  { value: 'private', label: 'Private (1 resident)' },
  { value: 'ward', label: 'Ward (several residents, by bed)' },
];

const errorText = (err) =>
  err.response ? err.response.data?.message || "Couldn't save. Please try again." : "Can't reach the server. Please try again.";

// "Rooms & beds": add Private rooms and Wards, add or remove ward beds, remove empty rooms.
// `onChanged()` reloads the rooms list after every change.
export default function RoomsModal({ open, rooms, onChanged, onClose }) {
  const [form, setForm] = useState({ roomNumber: '', roomType: 'private', bedCount: '4' });
  const [error, setError] = useState('');
  const [saving, setSaving, startSaving] = useSaving();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // Runs one change, shows the server's message if it fails, then reloads the list
  const run = async (request) => {
    if (!startSaving()) return false;
    setError('');
    try {
      await request();
      await onChanged();
      return true;
    } catch (err) {
      setError(errorText(err));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const addRoom = async (e) => {
    e.preventDefault();
    if (!form.roomNumber.trim()) {
      setError('Please enter the room number.');
      return;
    }
    const added = await run(() =>
      api.post('/rooms', {
        roomNumber: form.roomNumber.trim(),
        roomType: form.roomType,
        bedCount: form.roomType === 'ward' ? Number(form.bedCount) : undefined,
      })
    );
    if (added) setForm({ ...form, roomNumber: '' });
  };

  return (
    <Modal open={open} onClose={onClose} title="Rooms & beds" size="lg">
      {error && (
        <div className="alert alert--error" role="alert">
          <CircleAlert size={18} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <form className="rooms-add" onSubmit={addRoom} noValidate>
        <h3 className="small-label">Add a room</h3>
        <div className="form-grid">
          <FormField id="room-number" name="roomNumber" label="Room number" value={form.roomNumber} onChange={handleChange} placeholder="e.g. 201" autoComplete="off" />
          <SelectField id="room-type" name="roomType" label="Room type" value={form.roomType} onChange={handleChange} options={TYPE_OPTIONS} />
        </div>
        {form.roomType === 'ward' && (
          <FormField
            id="room-beds"
            name="bedCount"
            label="Number of beds"
            type="number"
            min={2}
            max={20}
            value={form.bedCount}
            onChange={handleChange}
            hint="The beds are named B1, B2, B3… You can add or remove beds later."
          />
        )}
        <button type="submit" className="btn btn--primary" disabled={saving}>
          <Plus size={18} aria-hidden="true" /> {saving ? 'Saving…' : 'Add room'}
        </button>
      </form>

      <h3 className="small-label rooms-list__title">All rooms ({rooms.length})</h3>
      {rooms.length === 0 ? (
        <p className="staff-details__empty">No rooms yet. Add the first one above.</p>
      ) : (
        <ul className="rooms-list">
          {rooms.map((room) => (
            <li key={room.id} className="rooms-list__item">
              <div className="rooms-list__head">
                <div>
                  <strong>Room {room.roomNumber}</strong>{' '}
                  <span className={`status-pill status-pill--${room.roomType === 'ward' ? 'pending' : 'completed'}`}>
                    {room.roomType === 'ward' ? 'Ward' : 'Private'}
                  </span>
                  <small className="rooms-list__sub">
                    {room.roomType === 'ward'
                      ? `${room.free} of ${room.capacity} beds free`
                      : room.residents[0]?.name ?? 'Free'}
                  </small>
                </div>
                <div className="rooms-list__actions">
                  {room.roomType === 'ward' && (
                    <button type="button" className="btn btn--sm btn--outline" disabled={saving} onClick={() => run(() => api.post(`/rooms/${room.id}/beds`))}>
                      <Plus size={16} aria-hidden="true" /> Bed
                    </button>
                  )}
                  {room.residents.length === 0 && (
                    <button
                      type="button"
                      className="btn btn--sm btn--danger"
                      disabled={saving}
                      aria-label={`Remove room ${room.roomNumber}`}
                      onClick={() => run(() => api.delete(`/rooms/${room.id}`))}
                    >
                      <Trash2 size={16} aria-hidden="true" /> Remove
                    </button>
                  )}
                </div>
              </div>
              {room.roomType === 'ward' && (
                <ul className="tag-list rooms-list__beds">
                  {room.beds.map((bed) => (
                    <li key={bed.id}>
                      {bed.bedCode} · {bed.resident ? bed.resident.name : 'free'}
                      {!bed.resident && room.beds.length > 2 && (
                        <button
                          type="button"
                          className="rooms-list__remove-bed"
                          disabled={saving}
                          aria-label={`Remove bed ${bed.bedCode} from room ${room.roomNumber}`}
                          onClick={() => run(() => api.delete(`/rooms/${room.id}/beds/${bed.id}`))}
                        >
                          ×
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}