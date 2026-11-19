import { CircleAlert, RefreshCw } from 'lucide-react';
import { SkeletonRows, SkeletonCards, SkeletonBubbles, SkeletonCalendar } from './Skeleton';

// While a page loads for the first time: grey placeholder shapes in the layout of what's coming
// (`shape`: 'rows' for lists and tables, 'cards' for dashboards, 'bubbles' for a chat, 'calendar' for a
// schedule). Screen readers hear `label`. Quiet live refreshes never show this again.
export function LoadingState({ label = 'Loading…', shape = 'rows', rows, avatar, action }) {
  return (
    <div className="skeleton-wrap" role="status" aria-busy="true">
      <span className="sr-only">{label}</span>
      {shape === 'cards' && <SkeletonCards />}
      {shape === 'bubbles' && <SkeletonBubbles />}
      {shape === 'calendar' && <SkeletonCalendar />}
      {shape === 'rows' && <SkeletonRows rows={rows} avatar={avatar} action={action} />}
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
