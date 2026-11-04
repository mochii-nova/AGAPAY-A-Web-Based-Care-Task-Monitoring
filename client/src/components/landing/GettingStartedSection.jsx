import { Link } from 'react-router-dom';

// "Getting started": three numbered steps in a row, then the two ways in
const STEPS = [
  { title: 'Create an account', text: 'Caregivers sign up with their name, email and Employee ID.' },
  { title: 'Wait for approval', text: 'An administrator checks and approves new accounts.' },
  { title: 'Sign in', text: 'Use your Employee ID and password, or Continue with Google.' },
];

export default function GettingStartedSection() {
  return (
    <section id="start" className="section start">
      <div className="container">
        <header className="section-head section-head--center">
          <p className="eyebrow">Getting started</p>
          <h2 className="section-title">Three steps to <span className="accent">your first shift.</span></h2>
        </header>

        <ol className="start__steps">
          {STEPS.map(({ title, text }, i) => (
            <li key={title} className="start__step">
              <span className="start__number" aria-hidden="true">{i + 1}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ol>

        <div className="start__actions">
          <Link to="/register" className="btn btn--primary btn--lg">Create account</Link>
          <Link to="/login" className="btn btn--outline btn--lg">Sign in</Link>
        </div>
      </div>
    </section>
  );
}
