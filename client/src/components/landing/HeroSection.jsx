import { Link } from 'react-router-dom';
import heroPhoto from '../../assets/images/hero-home.webp';

// The hero, light and warm, inside the same container as the navbar and the sections below.
// Laptops: it fills the first screen; the text on the left (vertically centred) and the photo on the
// right, as tall as the hero, its left edge fading into the background. Never darkened or filtered.
// Phones and tablets: the photo on top, the text below.
// (hero-home.webp is home-new.png with its see-through side bars cropped off, at its own size, 1075 × 767.)
export default function HeroSection() {
  return (
    <section id="home" className="hero">
      <div className="container hero__inner">
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
        <img className="hero__photo" src={heroPhoto} alt="A smiling nurse hugging a happy older woman" />
      </div>
    </section>
  );
}
