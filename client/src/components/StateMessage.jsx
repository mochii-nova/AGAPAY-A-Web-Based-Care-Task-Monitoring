import { LoaderCircle, CircleAlert, RefreshCw } from 'lucide-react';

// "Loading…" with a spinning icon
export function LoadingState({ label = 'Loading…' }) {
  return (
    <div className="state-msg" role="status">
      <LoaderCircle size={20} className="spin" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

// Error message with a "Try again" button
export function ErrorState({ message, onRetry }) {
  return (
    <div className="state-msg state-msg--error" role="alert">
      <CircleAlert size={20} aria-hidden="true" />
      <span>{message}</span>
      {onRetry && (
        <button type="button" className="btn btn--outline btn--sm" onClick={onRetry}>
          <RefreshCw size={16} aria-hidden="true" /> Try again
        </button>
      )}
    </div>
  );
}

// Nothing matches a search: No residents match "Room 102". [Clear search]
export function NoMatchState({ icon: Icon, what, query, onClear }) {
  return (
    <div className="state-msg" role="status">
      {Icon && <Icon size={20} aria-hidden="true" />}
      <span>No {what} match “{query.trim()}”.</span>
      <button type="button" className="btn btn--outline btn--sm" onClick={onClear}>Clear search</button>
    </div>
  );
}

// Friendly message when there's nothing to show
export function EmptyState({ icon: Icon, children }) {
  return (
    <div className="state-msg">
      {Icon && <Icon size={20} aria-hidden="true" />}
      <span>{children}</span>
    </div>
  );
}
