import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';

// Short answers to what visitors ask first.
// (Orchid Care Home is only our reference facility: AGAPAY is not affiliated with it.)
const QUESTIONS = [
  {
    q: 'Who can use AGAPAY?',
    a: 'Care home staff: caregivers and administrators. Families don’t need an account.',
  },
  {
    q: 'Is it free?',
    a: 'Yes. AGAPAY is a student project and costs nothing to use.',
  },
  {
    q: 'Is my data safe?',
    a: 'Only signed-in staff can see resident information, and pop-up notifications never show resident names. Please use test data only.',
  },
  {
    q: 'Is AGAPAY part of Orchid Care Home?',
    a: 'No. We studied Orchid Care Home, Inc. as a reference facility, but AGAPAY is not affiliated with it.',
  },
];

// One question: a real button that opens and closes its answer (Enter and Space work, and screen
// readers hear whether it's open)
function Question({ q, a }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <li className={`faq__item ${open ? 'is-open' : ''}`}>
      <h3 className="faq__q">
        <button type="button" className="faq__button" aria-expanded={open} aria-controls={`${id}-answer`} onClick={() => setOpen(!open)}>
          <span>{q}</span>
          <ChevronDown size={20} className="faq__chevron" aria-hidden="true" />
        </button>
      </h3>
      <div id={`${id}-answer`} className="faq__a" hidden={!open}>
        <p>{a}</p>
      </div>
    </li>
  );
}

export default function FaqSection() {
  return (
    <section id="faq" className="section faq">
      <div className="container">
        <header className="section-head section-head--center">
          <p className="eyebrow">Questions</p>
          <h2 className="section-title">Good to <span className="accent">know.</span></h2>
        </header>
        <ul className="faq__list">
          {QUESTIONS.map(({ q, a }) => <Question key={q} q={q} a={a} />)}
        </ul>
      </div>
    </section>
  );
}
