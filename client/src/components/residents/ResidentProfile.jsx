import { Link } from 'react-router-dom';
import { Phone, ClipboardList, MessageSquareText, ArrowRight } from 'lucide-react';
import Avatar from '../Avatar';
import StatusPill from '../StatusPill';
import TaskCategoryIcon from '../TaskCategoryIcon';
import CareNeeds from './CareNeeds';
import { LoadingState, EmptyState } from '../StateMessage';
import { formatTime, telHref } from '../../utils/format';

const noteDate = (date) =>
  `${formatTime(date)}, ${new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

// Everything about one resident: details, emergency contact, today's tasks and recent notes.
// Used in the side panel (laptop) and in a pop-up (tablet / phone).
export default function ResidentProfile({ resident, tasks, tasksLoading, notes, onOpenTask, showName = true }) {
  const firstName = resident.name.split(' ')[0];

  return (
    <div className="resident-profile">
      <div className="resident-profile__identity">
        <Avatar name={resident.name} photo={resident.photo} size={60} />
        <div>
          {showName && <h2 className="resident-profile__name">{resident.name}</h2>}
          <p className="resident-profile__sub">
            Room {resident.room} · <span className="resident-card__id">{resident.id}</span>
          </p>
        </div>
      </div>

      <dl className="resident-profile__facts">
        <div><dt>Age</dt><dd>{resident.age} years old</dd></div>
        <div><dt>Gender</dt><dd>{resident.gender}</dd></div>
      </dl>

      <section className="profile-section">
        <h3 className="small-label">Emergency contact</h3>
        <div className="emergency-box">
          <div>
            <p className="emergency-box__name">{resident.emergencyContact.name}</p>
            <p className="emergency-box__rel">{resident.emergencyContact.relationship}</p>
          </div>
          <a className="btn btn--soft btn--sm" href={telHref(resident.emergencyContact.phone)}>
            <Phone size={16} aria-hidden="true" /> {resident.emergencyContact.phone}
          </a>
        </div>
      </section>

      <section className="profile-section">
        <h3 className="small-label">Care needs</h3>
        <CareNeeds needs={resident.careNeeds} />
        {resident.careNote && <p className="resident-profile__note">{resident.careNote}</p>}
      </section>

      <section className="profile-section">
        <div className="profile-section__head">
          <h3 className="small-label">Today's tasks</h3>
          <Link to={`/tasks?q=${encodeURIComponent(resident.name)}`} className="card__link">
            View all <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        {tasksLoading ? (
          <LoadingState label="Loading tasks…" />
        ) : tasks.length === 0 ? (
          <EmptyState icon={ClipboardList}>No tasks for {firstName} today.</EmptyState>
        ) : (
          <ul className="profile-tasks">
            {tasks.map((t) => (
              <li key={t._id}>
                <button type="button" className="profile-task" onClick={() => onOpenTask(t)}>
                  <TaskCategoryIcon category={t.category} size={16} />
                  <span className="profile-task__main">
                    <span>{t.task}</span>
                    <small>Due {formatTime(t.dueAt)}</small>
                  </span>
                  <StatusPill status={t.status} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="profile-section">
        <h3 className="small-label">Recent notes</h3>
        {notes.length === 0 ? (
          <EmptyState icon={MessageSquareText}>No recent notes about {firstName}.</EmptyState>
        ) : (
          <ul className="profile-notes">
            {notes.map((n) => (
              <li key={n.id} className="profile-note">
                <p className="profile-note__meta">
                  {n.source}
                  {n.author && ` · ${n.author}`} · {noteDate(n.time)}
                </p>
                <p className="profile-note__text">{n.text}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
