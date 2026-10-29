// "How it works": the same three steps every shift, in three columns
const STEPS = [
  {
    step: '1 · Start of shift',
    title: 'Read the handover',
    text: 'See what the last shift passed on, which residents to watch, and your tasks for today.',
  },
  {
    step: '2 · During the shift',
    title: 'Record each task',
    text: 'Mark care tasks as done, or note why one was skipped. Overdue tasks stay on your list.',
  },
  {
    step: '3 · End of shift',
    title: 'Write the handover',
    text: 'Leave short notes for the next caregiver. They get them as soon as you submit.',
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how" className="section how">
      <div className="container">
        <header className="section-head">
          <p className="eyebrow">How it works</p>
          <h2 className="section-title">How a shift works in AGAPAY</h2>
          <p className="section-sub">The same three steps every shift, so nothing gets lost when caregivers change over.</p>
        </header>

        <ol className="how__steps">
          {STEPS.map(({ step, title, text }) => (
            <li key={step} className="how__step">
              <p className="how__label">{step}</p>
              <h3>{title}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
