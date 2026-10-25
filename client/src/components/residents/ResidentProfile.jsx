import { Link } from 'react-router-dom';
import { Phone, ClipboardList, MessageSquareText } from 'lucide-react';
import Avatar from '../Avatar';
import StatusPill from '../StatusPill';
import CareNeeds from './CareNeeds';
import { LoadingState, EmptyState } from '../StateMessage';
import { getCategory } from '../../constants';
import { RESIDENT_STATUS } from '../../utils/handover';
import { formatTime, telHref } from '../../utils/format';

// "Personal Hygiene" -> "Personal hygiene"
const sentence = (label) => label.charAt(0) + label.slice(1).toLowerCase();

// Everything about one resident: details, care needs, emergency contact, today's tasks and recent notes.
// Used in the side panel (laptop) and in a pop-up (tablet / phone).
// `status` = "watch" / "urgent" from the latest handover (if any).
export default function ResidentProfile({ resident, status, tasks, tasksLoading, notes, onOpenTask, showName = true }) {
  const firstName = resident.name.split(' ')[0];
  const flag = status && status !== 'normal' ? RESIDENT_STATUS[status] : null;

  return (
    <div className="resident-profile">
      <div className="resident-profile__identity">
        <Avatar name={resident.name} photo={resident.photo} size={68} />
        <div className="resident-profile__who">
          {showName && <h2 className="resident-profile__name">{resident.name}</h2>}
          <p className="resident-profile__sub">
            Room {resident.room} · {resident.id} · {resident.age} years old · {resident.gender}
          </p>
        </div>
        {flag && <span className={`status-pill status-pill--${flag.tone}`}>{flag.label}</span>}
      </div>

      <div className="resident-profile__columns">
        <section>
          <h3 className="small-label">Care needs</h3>
          <CareNeeds needs={resident.careNeeds} />
          {resident.careNote && <p className="resident-profile__note">{resident.careNote}</p>}
        </section>

        <section>
          <h3 className="small-label">Emergency contact</h3>
          <p className="resident-profile__contact">
            <strong>{resident.emergencyContact.name}</strong> · {resident.emergencyContact.relationship}
          </p>
          <a className="btn btn--outline btn--sm" href={telHref(resident.emergencyContact.phone)}>
            <Phone size={16} aria-hidden="true" /> {resident.emergencyContact.phone}
          </a>
        </section>
      </div>

      <section className="profile-section">
        <div className="profile-section__head">
          <h3 className="small-label">Today’s tasks</h3>
          <Link to={`/tasks?q=${encodeURIComponent(resident.name)}`} className="card__link">Open in My Tasks</Link>
        </div>
        {tasksLoading ? (
          <LoadingState label="Loading tasks…" />
        ) : tasks.length === 0 ? (
          <EmptyState icon={ClipboardList}>No tasks for {firstName} today.</EmptyState>
        ) : (
          <ul className="profile-tasks">
            {tasks.map((t) => (
              <li key={t._id} className="profile-task">
                <span className="profile-task__time">{formatTime(t.dueAt)}</span>
                <span className="profile-task__main">
                  <strong>{t.task}</strong>
                  {getCategory(t.category) && <small>{sentence(getCategory(t.category).label)}</small>}
                </span>
                <StatusPill status={t.status} />
                <button
                  type="button"
                  className="btn btn--outline btn--sm"
                  onClick={() => onOpenTask(t)}
                  aria-label={`View task: ${t.task}`}
                >
                  View
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="profile-section">
        {notes.length === 0 ? (
          <>
            <h3 className="small-label">Latest notes</h3>
            <EmptyState icon={MessageSquareText}>No recent notes about {firstName}.</EmptyState>
          </>
        ) : (
          <ul className="profile-notes">
            {notes.map((n, i) => (
              <li key={n.id} className="profile-note">
                <p className="small-label">{i === 0 ? `Latest note · ${n.source}` : n.source}</p>
                <p className="profile-note__text">{n.text}</p>
                <p className="signature profile-note__sign">
                  — {n.author ? `${n.author.split(' ')[0]}, ` : ''}{formatTime(n.time)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
