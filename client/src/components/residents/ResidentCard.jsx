import Avatar from '../Avatar';
import CareNeeds from './CareNeeds';
import TodayLine from './TodayLine';
import { RESIDENT_STATUS } from '../../utils/handover';

// One resident in the list: avatar on the left, then the name with their condition in the top-right
// corner, ID + room, a few care-need tags and the "Today" line (today's tasks by category).
// `status`: normal / watch / urgent from the latest handover (none: no badge).
// The whole card is a button that opens the profile.
export default function ResidentCard({ resident, status, todayTasks, selected, maxNeeds, onSelect }) {
  const flag = status ? RESIDENT_STATUS[status] : null;
  return (
    <button
      type="button"
      className="resident-card"
      aria-pressed={selected}
      aria-label={`${resident.name}, room ${resident.room}${flag ? `, ${flag.label}` : ''}. Open profile`}
      onClick={() => onSelect(resident.residentCode)}
    >
      <Avatar name={resident.name} photo={resident.photo} size={44} />
      <span className="resident-card__body">
        <span className="resident-card__line">
          <strong className="resident-card__name">{resident.name}</strong>
          {flag && <span className={`status-pill status-pill--${flag.tone} resident-card__status`}>{flag.label}</span>}
        </span>
        <span className="resident-card__line resident-card__meta">
          {resident.residentCode} · Room {resident.room}
          {todayTasks.length === 0 && ' · No tasks today'}
        </span>
        <CareNeeds needs={resident.careNeeds} max={maxNeeds} />
        <TodayLine tasks={todayTasks} short />
      </span>
    </button>
  );
}
