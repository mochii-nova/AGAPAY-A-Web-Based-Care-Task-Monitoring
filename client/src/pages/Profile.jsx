import { Camera, Pencil } from 'lucide-react';
import { useProfile } from '../context/ProfileContext';
import { SHIFTS, shiftTime } from '../constants';
import PhoneNumber from '../components/PhoneNumber';
import PageHeader from '../components/PageHeader';
import CardHeader from '../components/CardHeader';
import Avatar from '../components/Avatar';
import ChangePasswordForm from '../components/profile/ChangePasswordForm';

// "2024-06-03" -> "June 3, 2024" (read as a calendar date, not a moment in time)
const longDate = (ymd) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};
const NOT_SET = 'Not set yet';
const orNotSet = (value) => value || <span className="profile-unset">{NOT_SET}</span>;

export default function Profile() {
  const { profile, openPhoto, openEditProfile } = useProfile();
  const shift = (profile.role !== 'admin' && SHIFTS.find((s) => s.apiValue === profile.shift)) || null;
  const roleLabel = profile.role === 'admin' ? 'Administrator' : 'Caregiver';
  const contact = profile.emergencyContact;

  return (
    <div>
      <PageHeader title="Profile" subtitle="Your details and password." />

      <div className="profile-layout">
        {/* Left: photo and details set by the administrator */}
        <aside className="card profile-id">
          <button
            type="button"
            className="profile-id__photo"
            onClick={openPhoto}
            aria-label={profile.photo ? 'Change profile photo' : 'Add profile photo'}
          >
            <Avatar name={profile.name} photo={profile.photo} size={120} />
            <span className="profile-id__camera" aria-hidden="true"><Camera size={16} /></span>
          </button>
          <h2 className="profile-id__name">{profile.name}</h2>
          <p className="profile-id__role">{roleLabel}{shift && ` · ${shift.label} shift`}</p>

          <div className="profile-id__admin">
            {/* Caregivers: these are set by an administrator. Administrators: just their account details. */}
            <p className="small-label">{profile.role === 'admin' ? 'Account details' : 'Set by the administrator'}</p>
            <dl className="info-list">
              <div><dt>Employee ID</dt><dd>{profile.employeeId}</dd></div>
              {/* Administrators don't work shifts */}
              {profile.role !== 'admin' && <div><dt>Usual shift</dt><dd>{shift ? shiftTime(shift) : orNotSet(null)}</dd></div>}
              <div><dt>Date hired</dt><dd>{profile.dateHired ? longDate(profile.dateHired) : orNotSet(null)}</dd></div>
              <div>
                <dt>Status</dt>
                <dd><span className="status-pill status-pill--completed">{profile.accountStatus}</span></dd>
              </div>
            </dl>
          </div>
        </aside>

        {/* Right: personal details (read-only here, changed with "Edit profile") and password */}
        <div className="profile-main">
          <section className="card">
            <CardHeader title="Personal details">
              <button type="button" className="btn btn--outline btn--sm" onClick={openEditProfile}>
                <Pencil size={16} aria-hidden="true" /> Edit profile
              </button>
            </CardHeader>
            <dl className="detail-rows">
              <div><dt>First name</dt><dd>{orNotSet(profile.firstName)}</dd></div>
              <div><dt>Last name</dt><dd>{orNotSet(profile.lastName)}</dd></div>
              <div><dt>Email</dt><dd>{orNotSet(profile.email)}</dd></div>
              <div><dt>Phone</dt><dd>{orNotSet(profile.phone)}</dd></div>
              <div>
                <dt>Emergency contact</dt>
                <dd>{contact.name ? `${contact.name}${contact.relationship ? ` · ${contact.relationship}` : ''}` : orNotSet(null)}</dd>
              </div>
              <div>
                <dt>Their phone</dt>
                <dd>
                  {contact.phone ? (
                    <PhoneNumber phone={contact.phone} label={`Call ${contact.name || 'emergency contact'}, ${contact.phone}`} />
                  ) : (
                    orNotSet(null)
                  )}
                </dd>
              </div>
            </dl>
          </section>

          <ChangePasswordForm employeeId={profile.employeeId} />
        </div>
      </div>
    </div>
  );
}
