// Grey placeholder shapes shown while a page loads for the first time, in the same layout as the real
// content (instead of blank space or "Loading…"). A soft shimmer moves across them, except for people
// who ask their device for less motion. Styles: "Skeletons" in main.css.

// One shape: a bar by default; `circle` for an avatar
export function Skeleton({ width = '100%', height = 14, radius, circle = false, className = '' }) {
  return (
    <span
      className={`skeleton ${circle ? 'skeleton--circle' : ''} ${className}`}
      style={{ width: circle ? height : width, height, ...(radius != null && { borderRadius: radius }) }}
      aria-hidden="true"
    />
  );
}

// Lengths that vary a little from row to row, so it looks like real text
const WIDTHS = ['62%', '48%', '70%', '55%', '40%', '66%', '52%'];

// Rows of a list or table: (avatar) a title and a smaller line, and a pill on the right
export function SkeletonRows({ rows = 5, avatar = false, action = true }) {
  return (
    <ul className="skeleton-rows" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="skeleton-row">
          {avatar && <Skeleton circle height={36} />}
          <span className="skeleton-row__text">
            <Skeleton width={WIDTHS[i % WIDTHS.length]} height={14} />
            <Skeleton width={WIDTHS[(i + 3) % WIDTHS.length].replace(/\d+/, (n) => String(Math.round(n * 0.6)))} height={11} />
          </span>
          {action && <Skeleton width={72} height={28} radius={8} className="skeleton-row__action" />}
        </li>
      ))}
    </ul>
  );
}

// Card-shaped boxes, like a dashboard's cards
export function SkeletonCards({ count = 4 }) {
  return (
    <div className="skeleton-cards" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={`card skeleton-card ${i >= 2 ? 'skeleton-card--tall' : ''}`}>
          <Skeleton width="45%" height={16} />
          <Skeleton width="30%" height={28} />
          <Skeleton width="80%" height={11} />
          <Skeleton width="65%" height={11} />
        </div>
      ))}
    </div>
  );
}

// Chat bubbles, taking turns left and right
export function SkeletonBubbles({ count = 6 }) {
  return (
    <div className="skeleton-bubbles" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} width={WIDTHS[i % WIDTHS.length]} height={i % 3 === 1 ? 54 : 38} radius={16} className={i % 2 ? 'is-mine' : ''} />
      ))}
    </div>
  );
}

// A calendar's day cells (7 across)
export function SkeletonCalendar({ cells = 35 }) {
  return (
    <div className="skeleton-calendar" aria-hidden="true">
      {Array.from({ length: 7 }, (_, i) => <Skeleton key={`h${i}`} width="50%" height={10} className="skeleton-calendar__head" />)}
      {Array.from({ length: cells }, (_, i) => (
        <span key={i} className="skeleton-calendar__day">
          <Skeleton width={18} height={12} />
          {i % 3 !== 2 && <Skeleton width="70%" height={6} radius={6} />}
        </span>
      ))}
    </div>
  );
}
