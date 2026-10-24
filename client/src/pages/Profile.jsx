import { Camera, Pencil, Phone } from 'lucide-react';
import { useProfile } from '../context/ProfileContext';
import { getShift, SHIFTS, shiftTime } from '../constants';
import { telHref } from '../utils/format';
import PageHeader from '../components/PageHeader';
import CardHeader from '../components/CardHeader';
import Avatar from '../components/Avatar';
import ChangePasswordForm from '../components/profile/ChangePasswordForm';

const longDate = (iso) => new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

// Where each part of the profile is saved right now
const SAVED_WHERE = [
  { item: 'Employee ID and role', where: 'Database', tone: 'completed', note: 'Read-only' },
  { item: 'Password', where: 'Database', tone: 'completed', note: 'Checked, but changing it needs the backend' },
  { item: 'Photo, name, phone, email, emergency contact', where: 'This computer only', tone: 'pending', note: 'Not shared with other devices yet' },
  { item: 'Shift, date hired, account status', where: 'Sample data', tone: 'skipped', note: 'Not in the database yet' },
];

export default function Profile() {
  const { profile, openPhoto, openEditProfile } = useProfile();
  const shift = SHIFTS.find((s) => s.apiValue === profile.shift) ?? getShift('morning');
  const roleLabel = profile.role === 'admin' ? 'Administrator' : 'Caregiver';
  const nameChanged = profile.name !== profile.registeredName;

  return (
    <div>
      <PageHeader title="My Profile" subtitle="Your account details, photo and password." />

      <div className="profile-layout">
        {/* Left: photo and details set by the administrator */}
        <aside className="card profile-id">
          <button type="button" className="profile-id__photo" onClick={openPhoto} aria-label="Change profile photo">
            <Avatar name={profile.name} photo={profile.photo} size={112} />
            <span className="profile-id__camera" aria-hidden="true"><Camera size={16} /></span>
          </button>
          <h2 className="profile-id__name">{profile.name}</h2>
          <p className="profile-id__role">{roleLabel}</p>
          <button type="button" className="btn btn--soft btn--sm" onClick={openPhoto}>
            <Camera size={16} aria-hidden="true" /> {profile.photo ? 'Change photo' : 'Add photo'}
          </button>

          <div className="profile-id__admin">
            <p className="small-label">Set by the administrator</p>
            <dl className="info-list">
              <div><dt>Employee ID</dt><dd>{profile.employeeId}</dd></div>
              <div><dt>Role</dt><dd>{roleLabel}</dd></div>
              <div><dt>Assigned shift</dt><dd>{shift.label}<small>{shiftTime(shift)}</small></dd></div>
              <div><dt>Date hired</dt><dd>{longDate(profile.dateHired)}</dd></div>
              <div>
                <dt>Account status</dt>
                <dd><span className="status-pill status-pill--completed">{profile.accountStatus}</span></dd>
              </div>
            </dl>
            <p className="field__hint">To change these, please ask the administrator.</p>
          </div>
        </aside>

        {/* Right: editable details, password, and where things are saved */}
        <div className="profile-main">
          <section className="card">
            <CardHeader title="Personal details">
              <button type="button" className="btn btn--soft btn--sm" onClick={openEditProfile}>
                <Pencil size={16} aria-hidden="true" /> Edit profile
              </button>
            </CardHeader>
            <dl className="info-grid">
              <div><dt>First name</dt><dd>{profile.firstName}</dd></div>
              <div><dt>Last name</dt><dd>{profile.lastName}</dd></div>
              <div><dt>Email</dt><dd>{profile.email}</dd></div>
              <div><dt>Phone number</dt><dd>{profile.phone}</dd></div>
            </dl>
            {nameChanged && (
              <p className="field__hint profile-note">
                Handovers still show the name you registered with ({profile.registeredName}) until the backend can save name changes.
              </p>
            )}

            <div className="profile-emergency">
              <p className="small-label">Emergency contact</p>
              <div className="emergency-row">
                <div>
                  <p className="emergency-row__name">{profile.emergencyContact.name}</p>
                  <p className="emergency-row__rel">{profile.emergencyContact.relationship}</p>
                </div>
                <a className="btn btn--outline btn--sm" href={telHref(profile.emergencyContact.phone)}>
                  <Phone size={16} aria-hidden="true" /> {profile.emergencyContact.phone}
                </a>
              </div>
            </div>
          </section>

          <ChangePasswordForm employeeId={profile.employeeId} />

          <section className="card">
            <CardHeader title="Where your details are saved" />
            <table className="saved-table">
              <thead>
                <tr><th scope="col">Details</th><th scope="col">Saved in</th><th scope="col">Note</th></tr>
              </thead>
              <tbody>
                {SAVED_WHERE.map((row) => (
                  <tr key={row.item}>
                    <td>{row.item}</td>
                    <td><span className={`status-pill status-pill--${row.tone}`}>{row.where}</span></td>
                    <td className="saved-table__note">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      </div>
    </div>
  );
}
