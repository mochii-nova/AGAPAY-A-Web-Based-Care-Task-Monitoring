import { useEffect, useRef, useState } from 'react';
import { CircleAlert, RefreshCw } from 'lucide-react';
import { SkeletonRows, SkeletonCards, SkeletonBubbles, SkeletonCalendar } from './Skeleton';

const SHOW_AFTER = 500; // ms: data that arrives sooner shows straight away, with no skeleton flash
const FADE = 150; // ms: the content that replaces a skeleton fades in

// While a page loads for the first time: grey placeholder shapes in the layout of what's coming
// (`shape`: 'rows' for lists and tables, 'cards' for dashboards, 'bubbles' for a chat, 'calendar' for a
// schedule). They only appear if loading takes longer than half a second, and whatever replaces them
// fades in. Screen readers hear `label`. Quiet live refreshes and remembered data never show this.
export function LoadingState({ label = 'Loading…', shape = 'rows', rows, avatar, action }) {
  const [shown, setShown] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setShown(true), SHOW_AFTER);
    return () => clearTimeout(timer);
  }, []);

  // Once the skeleton has been seen, remember what was around it; when it goes, fade in what's new there
  useEffect(() => {
    if (!shown || !ref.current) return undefined;
    const around = [];
    for (let el = ref.current.parentElement; el; el = el.parentElement) around.push([el, new Set(el.children)]);
    return () => {
      requestAnimationFrame(() => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const still = around.find(([el]) => el.isConnected); // the nearest part of the page that stayed
        if (!still) return;
        const [el, before] = still;
        [...el.children]
          .filter((child) => !before.has(child))
          .forEach((child) => child.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: FADE, easing: 'ease-out' }));
      });
    };
  }, [shown]);

  return (
    <div ref={ref} className={`skeleton-wrap ${shown ? 'is-shown' : ''}`} role="status" aria-busy="true">
      <span className="sr-only">{label}</span>
      {shown && shape === 'cards' && <SkeletonCards />}
      {shown && shape === 'bubbles' && <SkeletonBubbles />}
      {shown && shape === 'calendar' && <SkeletonCalendar />}
      {shown && shape === 'rows' && <SkeletonRows rows={rows} avatar={avatar} action={action} />}
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
