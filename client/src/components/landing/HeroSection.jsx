import { Link } from 'react-router-dom';
import ImageSlot from '../ImageSlot';
import { images } from '../../assets/images';

export default function HeroSection() {
  return (
    <section id="home" className="hero">
      <div className="container hero__inner">
        <div className="hero__text">
          <p className="eyebrow">For the caregivers of Orchid Carehome</p>
          <h1 className="hero__title">
            Making caregiving easier, <span className="accent">one shift at a time.</span>
          </h1>
          <p className="hero__body">
            Keep track of each resident’s care, pass on what matters to the next shift, and always know what
            still needs attention.
          </p>
          <div className="hero__actions">
            <Link to="/login" className="btn btn--primary btn--lg">Sign in</Link>
            <a href="#features" className="btn btn--outline btn--lg">Learn more</a>
          </div>
          <p className="hand-note">Because every shift matters.</p>
        </div>

        <div className="hero__visual">
          <ImageSlot image={images.hero} className="hero__photo" />
        </div>
      </div>
    </section>
  );
}
