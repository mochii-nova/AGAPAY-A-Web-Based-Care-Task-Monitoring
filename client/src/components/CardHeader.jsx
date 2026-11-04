import { Link } from 'react-router-dom';

// Title row of a card, with at most one quiet link on the right (e.g. "View all").
// (Older pages still pass an `icon`; the new look keeps card titles text-only.)
export default function CardHeader({ title, linkTo, linkLabel = 'View all', children }) {
  return (
    <header className="card__header">
      <h2 className="card__title">{title}</h2>
      {children}
      {linkTo && (
        <Link to={linkTo} className="card__link">
          {linkLabel}
        </Link>
      )}
    </header>
  );
}
