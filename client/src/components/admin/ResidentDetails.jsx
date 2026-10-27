import { ClipboardList, Phone } from 'lucide-react';
import Avatar from '../Avatar';
import StatusPill from '../StatusPill';
import CareNeeds from '../residents/CareNeeds';
import { LoadingState, EmptyState } from '../StateMessage';
import { SHIFTS, shiftLabel } from '../../constants';
import { RESIDENT_STATUS } from '../../utils/handover';
import { formatTime, telHref } from '../../utils/format';
import { shortDate, longDate } from '../../utils/staff';

// Everything about one resident, with the admin's actions.
// Used in the side panel (laptops) and in a pop-up (tablets and phones).
// `staff`: every account, to know each assigned caregiver's shift.
// `latest`: { handover, update } — the newest handover that mentions this resident, or null.
export default function ResidentDetails({ resident, staff, tasks, tasksLoading, latest, onEdit, onAssign, onDelete, showName = true }) {
  const firstName = resident.name.split(' ')[0];
  const contact = resident.emergencyContact ?? {};
  const notSet = <span className="profile-unset">Not set yet</span>;
  const flag = latest ? RESIDENT_STATUS[latest.update.status] : null;

  // Assigned caregivers by shift, so a gap ("No one yet") is easy to spot
  const shiftOf = (c) => staff.find((u) => u.id === c.id)?.assignedShift;
  const rows = SHIFTS.map((s) => ({ label: s.label, people: resident.caregivers.filter((c) => shiftOf(c) === s.apiValue) }));
  const noShift = resident.caregivers.filter((c) => !SHIFTS.some((s) => s.apiValue === shiftOf(c)));
  if (noShift.length) rows.push({ label: 'Shift not set', people: noShift });

  const handover = latest?.handover;
  const handoverDay = handover && shortDate(handover.shiftDate ? `${handover.shiftDate}T00:00` : handover.createdAt);

  return (
    <div className="resident-details">
      <div className="staff-details__identity">
        <Avatar name={resident.name} size={60} />
        <div className="resident-details__who">
          {showName && <h2 className="staff-details__name">{resident.name}</h2>}
          <p className="staff-details__sub">{resident.residentCode} · Room {resident.room}</p>
        </div>
        <button type="button" className="btn btn--soft" onClick={onEdit}>Edit</button>
      </div>

      <dl className="resident-facts">
        <div><dt className="small-label">Age</dt><dd>{resident.age != null ? `${resident.age} years old` : notSet}</dd></div>
        <div><dt className="small-label">Gender</dt><dd>{resident.gender || notSet}</dd></div>
        <div><dt className="small-label">Birth date</dt><dd>{resident.birthDate ? longDate(resident.birthDate) : notSet}</dd></div>
        <div>
          <dt className="small-label">Latest status</dt>
          <dd>{flag ? <span className={`status-pill status-pill--${flag.tone}`}>{flag.label}</span> : <span className="profile-unset">No updates yet</span>}</dd>
        </div>
      </dl>

      <section className="staff-details__section">
        <h3 className="small-label">Care needs</h3>
        {resident.careNeeds.length ? <CareNeeds needs={resident.careNeeds} /> : <p className="staff-details__empty">None added yet.</p>}
        {resident.careNote && (
          <p className="resident-details__note"><span>Special instructions:</span> {resident.careNote}</p>
        )}
      </section>

      <div className="resident-details__columns">
        <section className="staff-details__section">
          <h3 className="small-label">Assigned caregivers</h3>
          <dl className="info-list resident-details__list">
            {rows.map((r) => (
              <div key={r.label}>
                <dt>{r.label}</dt>
                <dd>{r.people.length ? r.people.map((p) => p.name).join(', ') : <span className="resident-details__gap">No one yet</span>}</dd>
              </div>
            ))}
          </dl>
          <button type="button" className="btn btn--outline resident-details__wide" onClick={onAssign}>Change caregivers</button>
        </section>

        <section className="staff-details__section">
          <h3 className="small-label">Emergency contact</h3>
          {contact.name || contact.phone ? (
            <dl className="info-list resident-details__list">
              <div><dt>Name</dt><dd>{contact.name || notSet}</dd></div>
              <div><dt>Relationship</dt><dd>{contact.relationship || notSet}</dd></div>
              <div>
                <dt>Phone</dt>
                <dd>
                  {contact.phone ? (
                    <a className="resident-details__phone" href={telHref(contact.phone)}>
                      <Phone size={14} aria-hidden="true" /> {contact.phone}
                    </a>
                  ) : notSet}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="staff-details__empty">Not added yet.</p>
          )}
        </section>
      </div>

      <section className="staff-details__section">
        {/* TODO (admin phase 3): "Open in Tasks & Care" and "Add task" once that page exists */}
        <h3 className="small-label">Today's tasks</h3>
        {tasksLoading ? (
          <LoadingState label="Loading tasks…" />
        ) : tasks.length === 0 ? (
          <EmptyState icon={ClipboardList}>No tasks for {firstName} today.</EmptyState>
        ) : (
          <ul className="resident-details__tasks">
            {tasks.map((t) => (
              <li key={t.id}>
                <span>
                  <strong>{t.task}</strong> · {formatTime(t.dueAt)}
                  {t.assignedToName ? ` · ${t.assignedToName}` : ' · Not assigned'}
                </span>
                <StatusPill status={t.status} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {handover && (
        <div className="resident-details__handover">
          <p className="small-label">
            Latest handover note · {shiftLabel(handover.shift)}, {handoverDay}
            {handover.author?.name && ` · ${handover.author.name}`}
          </p>
          <p>{latest.update.note || `${flag.label}. No note was written.`}</p>
        </div>
      )}

      <div className="staff-details__actions staff-details__actions--grid">
        <button type="button" className="btn btn--danger staff-details__wide" onClick={onDelete}>Delete resident</button>
      </div>
    </div>
  );
}
