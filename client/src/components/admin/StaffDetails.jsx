import { UserCheck } from 'lucide-react';
import Avatar from '../Avatar';
import { SHIFTS, shiftTime } from '../../constants';
import { shortDate, longDate, roleLabel, STATUS_LABEL } from '../../utils/staff';

const TODAY_TONES = [
  ['completed', 'completed'],
  ['overdue', 'overdue'],
  ['pending', 'pending'],
  ['skipped', 'skipped'],
];

// Everything about one account, with the admin's actions.
// Used in the side panel (laptops) and in a pop-up (tablets and phones).
export default function StaffDetails({ person, isMe, todayTasks, residents, onEdit, onReset, onStatus, showName = true }) {
  const shift = SHIFTS.find((s) => s.apiValue === person.assignedShift);
  const contact = person.emergencyContact ?? {};
  const status = STATUS_LABEL[person.status];
  const counts = TODAY_TONES.map(([key, tone]) => [tone, todayTasks.filter((t) => t.status === key).length]).filter(([, n]) => n > 0);
  const notSet = <span className="profile-unset">Not set yet</span>;

  return (
    <div className="staff-details">
      <div className="staff-details__identity">
        <Avatar name={person.name} photo={person.photoUrl} size={60} />
        <div>
          {showName && <h2 className="staff-details__name">{person.name}</h2>}
          <p className="staff-details__sub">{person.employeeId} · {roleLabel(person)}{isMe && ' · you'}</p>
          <span className={`status-pill status-pill--${status.tone}`}>{status.label}</span>
        </div>
      </div>

      {person.status === 'pending' && (
        <div className="staff-details__pending">
          <p>
            Signed up on {shortDate(person.createdAt)}. {person.name.split(' ')[0]} can't sign in until you approve the account.
          </p>
          <div className="staff-details__actions">
            <button type="button" className="btn btn--primary" onClick={() => onStatus('active')}>
              <UserCheck size={18} aria-hidden="true" /> Approve
            </button>
            <button type="button" className="btn btn--danger" onClick={() => onStatus('inactive')}>Decline</button>
          </div>
        </div>
      )}

      <dl className="info-list staff-details__list">
        <div><dt>Shift</dt><dd>{shift ? `${shift.label} · ${shiftTime(shift)}` : notSet}</dd></div>
        <div><dt>Phone</dt><dd>{person.phone || notSet}</dd></div>
        <div><dt>Email</dt><dd className="staff-details__email">{person.email || notSet}</dd></div>
        <div><dt>Date hired</dt><dd>{person.dateHired ? longDate(person.dateHired) : notSet}</dd></div>
        <div><dt>Job title</dt><dd>{person.title || notSet}</dd></div>
        <div>
          <dt>Emergency contact</dt>
          <dd>
            {contact.name ? (
              <>
                {contact.name}
                {contact.phone && <small className="staff-details__line">{contact.phone}</small>}
              </>
            ) : (
              notSet
            )}
          </dd>
        </div>
      </dl>

      {person.role === 'caregiver' && person.status !== 'pending' && (
        <>
          <section className="staff-details__section">
            <h3 className="small-label">Assigned residents</h3>
            {residents.length ? (
              <ul className="tag-list">
                {residents.map((r) => <li key={r.id}>{r.name} · {r.room}</li>)}
              </ul>
            ) : (
              <p className="staff-details__empty">No residents assigned yet.</p>
            )}
          </section>
          <section className="staff-details__section">
            <h3 className="small-label">Today</h3>
            {counts.length ? (
              <ul className="staff-details__today">
                {counts.map(([tone, n]) => <li key={tone} className={`status-pill status-pill--${tone}`}>{n} {tone}</li>)}
              </ul>
            ) : (
              <p className="staff-details__empty">No tasks today.</p>
            )}
          </section>
        </>
      )}

      {person.status !== 'pending' && (
        <div className="staff-details__actions staff-details__actions--grid">
          <button type="button" className="btn btn--soft" onClick={onEdit}>Edit</button>
          {!isMe && <button type="button" className="btn btn--outline" onClick={onReset}>Reset password</button>}
          {!isMe && person.status === 'active' && (
            <button type="button" className="btn btn--danger staff-details__wide" onClick={() => onStatus('inactive')}>Deactivate account</button>
          )}
          {!isMe && person.status === 'inactive' && (
            <button type="button" className="btn btn--outline staff-details__wide" onClick={() => onStatus('active')}>Reactivate account</button>
          )}
        </div>
      )}
    </div>
  );
}
