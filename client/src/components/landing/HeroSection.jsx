import { Link } from 'react-router-dom';
import heroPhoto from '../../assets/images/hero-bg.webp';

// The hero: one big rounded photo with an even dark layer over it, and everything centred on top.
// (hero-bg.webp is a web-sized copy of the original hero-bg.png, which is kept in design-reference/:
// about 52 KB instead of 4 MB, with the PNG's transparent border trimmed off so no frame shows.)
export default function HeroSection() {
  return (
    <section id="home" className="hero" style={{ '--hero-photo': `url(${heroPhoto})` }}>
      <div className="hero__content">
        <h1 className="hero__title">
          <span className="hero__line">Making caregiving easier,</span>{' '}
          <span className="hero__line hero__line--soft">one shift at a time.</span>
        </h1>
        <p className="hero__body">
          AGAPAY is a web app that helps care home staff track daily care tasks and hand over clearly from one shift to the next.
        </p>
        <div className="hero__actions">
          <Link to="/login" className="btn btn--primary btn--lg">Sign in</Link>
          <a href="#how" className="btn btn--lg hero__ghost">See how it works</a>
        </div>
      </div>
    </section>
  );
}
