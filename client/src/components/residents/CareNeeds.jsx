import { getCategory } from '../../constants';

// Small labels with icons for a resident's care needs (uses the 6 task categories).
// With `max`, only the first few are shown in one row, followed by "+2 more".
export default function CareNeeds({ needs, max }) {
  const known = needs.filter(getCategory);
  const shown = max ? known.slice(0, max) : known;
  const hidden = known.length - shown.length;

  return (
    <ul
      className={`care-needs ${max ? 'care-needs--one-row' : ''}`}
      aria-label={`Care needs: ${known.map((id) => getCategory(id).label).join(', ')}`}
    >
      {shown.map((id) => {
        const { icon: Icon, label } = getCategory(id);
        return (
          <li key={id} className="care-need" aria-hidden={max ? 'true' : undefined}>
            <Icon size={14} aria-hidden="true" />
            <span>{label}</span>
          </li>
        );
      })}
      {hidden > 0 && (
        <li className="care-need care-need--more" aria-hidden="true">+{hidden} more</li>
      )}
    </ul>
  );
}
