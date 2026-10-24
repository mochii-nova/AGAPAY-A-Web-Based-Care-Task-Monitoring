import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

// Title row of a card, with an optional "View all →" link on the right
export default function CardHeader({ icon: Icon, title, linkTo, linkLabel = 'View all', children }) {
  return (
    <header className="card__header">
      <h2 className="card__title">
        {Icon && <Icon size={20} aria-hidden="true" />}
        {title}
      </h2>
      {children}
      {linkTo && (
        <Link to={linkTo} className="card__link">
          {linkLabel} <ArrowRight size={16} aria-hidden="true" />
        </Link>
      )}
    </header>
  );
}
