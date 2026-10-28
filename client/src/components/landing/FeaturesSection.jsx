import ImageSlot from '../ImageSlot';
import { images } from '../../assets/images';

// The four cards under the screenshot: title + one line
const FEATURES = [
  { title: 'Live task updates', text: 'See what’s done, pending or late on every shift.' },
  { title: 'Clear shift handovers', text: 'Pass on residents to watch and unfinished tasks.' },
  { title: 'Better teamwork', text: 'Caregivers and administrators message in one place.' },
  { title: 'Calmer days', text: 'Know your shifts ahead and add them to Google Calendar.' },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="section features">
      <div className="container">
        <header className="features__head">
          <p className="eyebrow">Features</p>
          <h2 className="section-title">Better care, shared together.</h2>
          <p className="features__sub">Everything a caregiver needs for the shift, in one calm place.</p>
        </header>

        {/* A simple browser window around the dashboard screenshot */}
        <div className="browser">
          <div className="browser__bar" aria-hidden="true"><span /><span /><span /></div>
          <ImageSlot image={images.featuresLaptop} alt="The AGAPAY caregiver dashboard" className="browser__shot" />
        </div>

        <ul className="feature-cards">
          {FEATURES.map(({ title, text }) => (
            <li key={title} className="feature-card">
              <h3>{title}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
