import { useState } from 'react';
import { Upload, CircleAlert } from 'lucide-react';
import Modal from '../Modal';
import Avatar from '../Avatar';
import { useProfile } from '../../context/ProfileContext';
import { useToast } from '../../context/ToastContext';
import { squarePhoto } from '../../utils/image';

const MAX_MB = 5;

// Pick a photo, see the preview, then save it (or remove the current one)
function PhotoForm({ onClose }) {
  const { profile, updatePhoto } = useProfile();
  const showToast = useToast();
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    e.target.value = ''; // so choosing the same file again still works
    if (!file) return;
    setError('');
    if (!file.type.startsWith('image/')) return setError('Please choose an image file (JPG or PNG).');
    if (file.size > MAX_MB * 1024 * 1024) return setError(`That photo is too big. Please choose one under ${MAX_MB} MB.`);
    setBusy(true);
    try {
      setPreview(await squarePhoto(file));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const save = async (photo, message) => {
    setSaving(true);
    setError('');
    try {
      await updatePhoto(photo);
      showToast(message);
      onClose();
    } catch (err) {
      setError(err.response ? err.response.data?.message || "Couldn't save the photo. Please try again." : "Can't reach the server. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="photo-form">
      <div className="photo-form__preview">
        <Avatar name={profile.name} photo={preview ?? profile.photo} size={140} />
        <p className="photo-form__caption">{preview ? 'Preview: not saved yet' : profile.photo ? 'Current photo' : 'No photo yet'}</p>
      </div>

      {error && (
        <div className="alert alert--error" role="alert">
          <CircleAlert size={18} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <label className="btn btn--soft photo-form__choose">
        <Upload size={18} aria-hidden="true" />
        {busy ? 'Opening…' : preview ? 'Choose a different photo' : 'Choose a photo'}
        <input type="file" accept="image/*" onChange={handleFile} className="sr-only" />
      </label>
      <p className="field__hint photo-form__hint">JPG or PNG, up to {MAX_MB} MB. It will be cropped to a square.</p>

      <div className="modal__footer modal__footer--inline">
        {profile.photo && !preview && (
          <button type="button" className="btn btn--outline photo-form__remove" disabled={saving} onClick={() => save(null, 'Photo removed.')}>
            Remove photo
          </button>
        )}
        <button type="button" className="btn btn--outline" onClick={onClose}>Cancel</button>
        <button type="button" className="btn btn--primary" disabled={!preview || saving} onClick={() => save(preview, 'Profile photo saved.')}>
          {saving ? 'Saving…' : 'Save photo'}
        </button>
      </div>
    </div>
  );
}

export default function PhotoModal({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="Profile photo" size="sm">
      {open && <PhotoForm onClose={onClose} />}
    </Modal>
  );
}
