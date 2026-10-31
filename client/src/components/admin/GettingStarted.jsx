import { CircleCheck, Circle } from 'lucide-react';
import CardHeader from '../CardHeader';

// "Getting started" on the admin dashboard: the five things that set AGAPAY up, each ticked from real
// data. steps: [{ key, title, text, done, action: { label, onClick } }]. "Hide" puts it away for good;
// the dashboard drops it by itself once every step is done.
export default function GettingStarted({ steps, onHide }) {
  const done = steps.filter((s) => s.done).length;
  return (
    <section className="card getting-started" aria-labelledby="getting-started-title">
      <div className="getting-started__head">
        <div>
          <h2 id="getting-started-title" className="card__title">Getting started</h2>
          <p className="getting-started__count">{done} of {steps.length} done</p>
        </div>
        <button type="button" className="link-btn" onClick={onHide}>Hide</button>
      </div>
      <div
        className="getting-started__bar"
        role="progressbar"
        aria-label="Setup progress"
        aria-valuemin={0}
        aria-valuemax={steps.length}
        aria-valuenow={done}
        aria-valuetext={`${done} of ${steps.length} done`}
      >
        <span style={{ width: `${(done / steps.length) * 100}%` }} />
      </div>
      <ol className="getting-started__list">
        {steps.map((s) => (
          <li key={s.key} className={s.done ? 'is-done' : ''}>
            {s.done
              ? <CircleCheck size={22} className="getting-started__mark" aria-hidden="true" />
              : <Circle size={22} className="getting-started__mark" aria-hidden="true" />}
            <span className="getting-started__text">
              <strong>{s.title}<span className="sr-only">{s.done ? ' (done)' : ' (not done yet)'}</span></strong>
              <small>{s.text}</small>
            </span>
            {s.done ? (
              <span className="getting-started__done">Done</span>
            ) : (
              <button type="button" className="btn btn--outline btn--sm btn--row" onClick={s.action.onClick}>{s.action.label}</button>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

// Hidden for good once this administrator presses "Hide" (in this browser)
export const gettingStartedKey = (userId) => `agapay.gettingStartedHidden.${userId}`;
