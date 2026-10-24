import ImageSlot from '../ImageSlot';
import { images } from '../../assets/images';

// The four hand-written notes around the laptop. `spot` places them (top/bottom, left/right).
const CLAIMS = [
  { spot: 'tl', text: 'Live task updates' },
  { spot: 'tr', text: 'Digital shift handovers' },
  { spot: 'bl', text: 'Better teamwork' },
  { spot: 'br', text: 'Smoother operations' },
];

// Hand-drawn style arrow pointing right. CSS turns it for each note.
function Arrow() {
  return (
    <svg className="claim__arrow" viewBox="0 0 120 50" aria-hidden="true">
      <path d="M4 34 C 34 8, 74 6, 110 22" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M96 10 L 111 22 L 94 32" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function FeaturesSection() {
  return (
    <section id="features" className="section features">
      <h2 className="sr-only">Features</h2>
      <p className="features__bg-word" aria-hidden="true">together</p>

      <div className="container">
        <div className="features__stage">
          <ImageSlot
            image={images.featuresLaptop}
            alt="The AGAPAY caregiver dashboard on a laptop"
            className="features__laptop"
          />
          {CLAIMS.map(({ spot, text }) => (
            <p key={spot} className={`claim claim--${spot}`}>
              <span>{text}</span>
              <Arrow />
            </p>
          ))}
        </div>

        <p className="features__caption">Better Care, Shared Together.</p>
      </div>
    </section>
  );
}
