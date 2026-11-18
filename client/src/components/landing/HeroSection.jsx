import { Link } from 'react-router-dom';
import heroPhoto from '../../assets/images/hero-warm.webp';

// The hero: one big rounded photo, kept bright. It is only darkened behind the text:
// on laptops a gradient on the left (the faces are on the right), on phones and tablets the photo sits
// at the top and fades into a deep ink colour at the bottom, where the text is.
// (hero-warm.webp is a web-sized copy of hero_new.png, which is not committed.)
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
          <Link to="/login" className="btn btn--lg hero__signin">Sign in</Link>
          <a href="#how" className="btn btn--lg hero__white">See how it works</a>
        </div>
      </div>
    </section>
  );
}
