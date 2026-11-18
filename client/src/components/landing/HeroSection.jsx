import { Link } from 'react-router-dom';
import heroPhoto from '../../assets/images/hero-home.webp';

// The hero: full screen, with the floating navbar on top. The sharp photo (mirrored) is on the right and
// fades gently into a blurred copy of itself that fills the rest; a soft warm shade sits only behind the
// text. The faces are never blurred or darkened. The text column starts on the navbar logo's line.
// (hero-home.webp is home-new.png with its see-through side bars cropped off, at its own size, 1075 × 767.)
export default function HeroSection() {
  return (
    <section id="home" className="hero">
      {/* a blurred, darker copy of the same photo behind everything (decoration only) */}
      <img className="hero__backdrop" src={heroPhoto} alt="" aria-hidden="true" />
      <img className="hero__photo" src={heroPhoto} alt="A smiling nurse hugging a happy older woman" />
      <div className="container hero__inner">
        <div className="hero__content">
          <h1 className="hero__title">
            <span className="hero__line">Making caregiving</span>{' '}
            <span className="hero__line">easier,</span>{' '}
            <span className="hero__line hero__line--soft">one shift at a time.</span>
          </h1>
          <p className="hero__body">
            AGAPAY is a web app that helps care home staff track daily care tasks and hand over clearly from one shift to the next.
          </p>
          <div className="hero__actions">
            <Link to="/login" className="btn btn--lg hero__signin">Sign in</Link>
            <a href="#how" className="btn btn--lg hero__white">See how it works</a>
          </div>
        </div>
      </div>
    </section>
  );
}
