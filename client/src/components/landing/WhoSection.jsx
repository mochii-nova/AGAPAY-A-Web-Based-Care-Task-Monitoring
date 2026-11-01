import { Check } from 'lucide-react';

// "Who uses AGAPAY": the two kinds of accounts, side by side, and a line for families
const GROUPS = [
  {
    title: 'Caregivers',
    items: ['See your shift and tasks for today', 'Mark tasks done or skipped', 'Read and write handovers'],
  },
  {
    title: 'Administrators',
    items: ['Approve new staff and manage residents', 'Plan shifts and assign tasks', 'Check handovers and reports'],
  },
];

export default function WhoSection() {
  return (
    <section id="who" className="section who">
      <div className="container">
        <header className="section-head section-head--center">
          <p className="eyebrow">Who uses AGAPAY</p>
          <h2 className="section-title">Made for the people who <span className="accent">give the care.</span></h2>
        </header>

        <ul className="who__grid">
          {GROUPS.map(({ title, items }) => (
            <li key={title} className="who__card">
              <h3>{title}</h3>
              <ul className="who__list">
                {items.map((item) => (
                  <li key={item}>
                    <Check size={18} aria-hidden="true" /> {item}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>

        <p className="who__note">
          Families and visitors don&apos;t need an account. Use the <a href="#contact">contact form</a> below.
        </p>
      </div>
    </section>
  );
}
