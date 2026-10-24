import ImageSlot from '../ImageSlot';
import { images } from '../../assets/images';

const CARDS = [
  { number: '01', title: 'Care Tasks', text: 'Track assigned, completed, pending, and skipped activities.' },
  { number: '02', title: 'Shift Handovers', text: 'Pass important notes and unfinished tasks to the next caregiver.' },
  { number: '03', title: 'Care Schedules', text: 'View assigned shifts and scheduled care activities.' },
  { number: '04', title: 'Alerts & Calendar', text: 'Get push notifications for tasks and handovers, and sync your shifts with Google Calendar.' },
];

export default function AboutSection() {
  return (
    <section id="about" className="section about">
      <div className="container">
        <h2 className="section-title">Comprehensive Care Platform</h2>

        <div className="about__grid">
          <div className="about__intro">
            <p className="about__tagline">Care is better when it's shared.</p>
            <p className="about__body">
              AGAPAY helps caregivers organize daily responsibilities, track care activities, and share important
              updates across shifts. So the next caregiver knows what has been done and what still needs attention.
            </p>
            <ImageSlot image={images.about} className="about__photo" />
          </div>

          <ul className="about__cards">
            {CARDS.map((card) => (
              <li key={card.number} className="about-card">
                <span className="about-card__number" aria-hidden="true">{card.number}</span>
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
