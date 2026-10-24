const LABELS = {
  completed: 'Completed',
  pending: 'Pending',
  overdue: 'Overdue',
  skipped: 'Skipped',
};

// The backend calls a finished task "done"; on screen we say "Completed"
const ALIASES = { done: 'completed' };

// Coloured status label. Always shows the text, never colour alone.
export default function StatusPill({ status }) {
  const key = ALIASES[status] ?? status;
  return <span className={`status-pill status-pill--${key}`}>{LABELS[key] ?? status}</span>;
}
