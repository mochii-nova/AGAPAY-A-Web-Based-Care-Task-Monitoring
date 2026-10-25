import ImageSlot from '../ImageSlot';
import { images } from '../../assets/images';

const CARDS = [
  { title: 'Care tasks', text: 'See what was assigned, what is done, and what still needs doing.' },
  { title: 'Shift handovers', text: 'Leave clear notes so the next caregiver knows where you stopped.' },
  { title: 'Care schedules', text: 'Check your shift and the day’s activities at a glance.' },
  { title: 'Alerts and calendar', text: 'Get reminders for tasks and add your shifts to Google Calendar.' },
];

export default function AboutSection() {
  return (
    <section id="about" className="section about">
      <div className="container">
        <div className="about__head">
          <div>
            <p className="eyebrow">About AGAPAY</p>
            <h2 className="section-title">Care is better when it’s shared.</h2>
          </div>
          <p className="about__body">
            <strong>Agapay</strong> means to walk alongside someone. Our app helps caregivers organize the day,
            record each task, and pass on what matters, so no resident’s care falls through the cracks between
            shifts.
          </p>
        </div>

        <div className="about__grid">
          <ImageSlot image={images.about} className="about__photo" />
          <ul className="about__cards">
            {CARDS.map(({ title, text }) => (
              <li key={title} className="about-card">
                <h3>{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
