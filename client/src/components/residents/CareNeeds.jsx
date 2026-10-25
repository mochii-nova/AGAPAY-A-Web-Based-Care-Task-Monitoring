import { getCategory } from '../../constants';

// Short words for the compact list cards
const SHORT = {
  hygiene: 'Hygiene',
  mobility: 'Mobility',
  meal: 'Meals',
  medical: 'Medical care',
  rest: 'Rest',
  recreation: 'Recreation',
};

// "Personal Hygiene" -> "Personal hygiene" (sentence case for the profile)
const sentence = (label) => label.charAt(0) + label.slice(1).toLowerCase();

// Small text tags for a resident's care needs (uses the 6 task categories).
// With `max` (list cards), only the first few are shown in short words, followed by "+2".
export default function CareNeeds({ needs, max }) {
  const known = needs.filter(getCategory);
  const shown = max ? known.slice(0, max) : known;
  const hidden = known.length - shown.length;

  return (
    <ul
      className={`care-needs ${max ? 'care-needs--one-row' : ''}`}
      aria-label={`Care needs: ${known.map((id) => getCategory(id).label).join(', ')}`}
    >
      {shown.map((id) => (
        <li key={id} className="care-need" aria-hidden={max ? 'true' : undefined}>
          {max ? SHORT[id] ?? getCategory(id).label : sentence(getCategory(id).label)}
        </li>
      ))}
      {hidden > 0 && (
        <li className="care-need care-need--more" aria-hidden="true">+{hidden}</li>
      )}
    </ul>
  );
}
