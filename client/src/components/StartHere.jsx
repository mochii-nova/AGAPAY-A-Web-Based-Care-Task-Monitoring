import { Link } from 'react-router-dom';
import { ArrowRight, CircleCheck, Compass } from 'lucide-react';

// The "Start here" card under each dashboard's greeting: the one thing that matters most right now.
// `text`: a short sentence; `action`: { label, to } for the single plum button, or null when there is
// nothing to do (then a calm check mark instead of the compass).
export default function StartHere({ text, action }) {
  const Icon = action ? Compass : CircleCheck;
  return (
    <section className={`card start-here ${action ? '' : 'start-here--calm'}`} aria-labelledby="start-here-title">
      <span className="start-here__icon" aria-hidden="true"><Icon size={20} /></span>
      <div className="start-here__text">
        <h2 id="start-here-title" className="small-label">Start here</h2>
        <p>{text}</p>
      </div>
      {action && (
        <Link to={action.to} className="btn btn--primary start-here__btn">
          {action.label} <ArrowRight size={18} aria-hidden="true" />
        </Link>
      )}
    </section>
  );
}
