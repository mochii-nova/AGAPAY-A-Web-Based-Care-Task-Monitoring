import { CalendarDays, X } from 'lucide-react';

// "Nov 19, 2026" from "2026-11-19" (read as a local date, so it never shifts a day)
const pretty = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// A date filter box with a small label above it. Empty: grey "Any date" with a calendar icon (phones show
// nothing in an empty date box on their own). Picked: "Nov 19, 2026" with a small × to clear it.
// The real date box sits underneath, so tapping anywhere still opens the phone's or browser's date picker.
// `value` / `onChange` use "YYYY-MM-DD" ('' = no date).
export default function DateFilter({ id, label, value, onChange, min, max }) {
  return (
    <div className="date-filter">
      <label htmlFor={id} className="date-filter__label">{label}</label>
      <span className={`date-filter__field ${value ? 'has-value' : ''}`}>
        <input
          id={id}
          type="date"
          className="field__input date-filter__input"
          value={value}
          min={min || undefined}
          max={max || undefined}
          onChange={(e) => onChange(e.target.value)}
          onClick={(e) => e.currentTarget.showPicker?.()}
        />
        <span className="date-filter__text" aria-hidden="true">
          <CalendarDays size={16} />
          {value ? pretty(value) : 'Any date'}
        </span>
        {value && (
          <button type="button" className="date-filter__clear" onClick={() => onChange('')} aria-label={`Clear the ${label} date`}>
            <X size={16} aria-hidden="true" />
          </button>
        )}
      </span>
    </div>
  );
}
