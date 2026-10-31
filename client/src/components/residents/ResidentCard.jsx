import Avatar from '../Avatar';
import CareNeeds from './CareNeeds';
import TodayLine from './TodayLine';

// One resident in the list: avatar on the left, then name + ID, room, a few care-need tags
// and the "Today" line (today's tasks by category). The whole card is a button that opens the profile.
export default function ResidentCard({ resident, todayTasks, selected, maxNeeds, onSelect }) {
  return (
    <button
      type="button"
      className="resident-card"
      aria-pressed={selected}
      aria-label={`${resident.name}, room ${resident.room}. Open profile`}
      onClick={() => onSelect(resident.residentCode)}
    >
      <Avatar name={resident.name} photo={resident.photo} size={44} />
      <span className="resident-card__body">
        <span className="resident-card__line">
          <strong className="resident-card__name">{resident.name}</strong>
          <span className="resident-card__id">{resident.residentCode}</span>
        </span>
        <span className="resident-card__line resident-card__meta">
          Room {resident.room}
          {todayTasks.length === 0 && ' · No tasks today'}
        </span>
        <CareNeeds needs={resident.careNeeds} max={maxNeeds} />
        <TodayLine tasks={todayTasks} short />
      </span>
    </button>
  );
}
