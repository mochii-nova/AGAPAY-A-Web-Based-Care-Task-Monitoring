import ImageSlot from '../ImageSlot';
import { images } from '../../assets/images';

// The four hand-written notes around the screenshot. `spot` places them (top/bottom, left/right).
const CLAIMS = [
  { spot: 'tl', text: 'Live task updates' },
  { spot: 'tr', text: 'Clear shift handovers' },
  { spot: 'bl', text: 'Better teamwork' },
  { spot: 'br', text: 'Calmer days' },
];

// Thin hand-drawn arrow pointing right. CSS turns it for each note.
function Arrow() {
  return (
    <svg className="claim__arrow" viewBox="0 0 120 50" aria-hidden="true">
      <path d="M4 34 C 34 8, 74 6, 110 22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M97 11 L 111 22 L 95 31" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function FeaturesSection() {
  return (
    <section id="features" className="section features">
      <div className="container">
        <header className="features__head">
          <p className="eyebrow">Features</p>
          <h2 className="section-title">Better care, shared together.</h2>
          <p className="features__sub">Everything a caregiver needs for the shift, in one calm place.</p>
        </header>

        <div className="features__stage">
          {/* A simple browser window around the dashboard screenshot */}
          <div className="browser">
            <div className="browser__bar" aria-hidden="true"><span /><span /><span /></div>
            <ImageSlot image={images.featuresLaptop} alt="The AGAPAY caregiver dashboard" className="browser__shot" />
          </div>
          {CLAIMS.map(({ spot, text }) => (
            <p key={spot} className={`claim claim--${spot}`}>
              <span>{text}</span>
              <Arrow />
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
