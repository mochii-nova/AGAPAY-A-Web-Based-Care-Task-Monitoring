import Avatar from '../Avatar';
import CareNeeds from './CareNeeds';

// One resident in the list: avatar on the left, then name + ID, room + tasks today,
// and a few care-need tags. The whole card is a button that opens the profile.
export default function ResidentCard({ resident, todayTasks, selected, maxNeeds, onSelect }) {
  const overdue = todayTasks.filter((t) => t.status === 'overdue').length;

  return (
    <button
      type="button"
      className="resident-card"
      aria-pressed={selected}
      aria-label={`${resident.name}, room ${resident.room}. Open profile`}
      onClick={() => onSelect(resident.id)}
    >
      <Avatar name={resident.name} photo={resident.photo} size={44} />
      <span className="resident-card__body">
        <span className="resident-card__line">
          <strong className="resident-card__name">{resident.name}</strong>
          <span className="resident-card__id">{resident.id}</span>
        </span>
        <span className="resident-card__line resident-card__meta">
          Room {resident.room} · {todayTasks.length} {todayTasks.length === 1 ? 'task' : 'tasks'} today
          {overdue > 0 && <span className="status-pill status-pill--overdue">{overdue} overdue</span>}
        </span>
        <CareNeeds needs={resident.careNeeds} max={maxNeeds} />
      </span>
    </button>
  );
}
