import { Link } from 'react-router-dom';
import { Check, CalendarDays, FileText } from 'lucide-react';
import ImageSlot from '../ImageSlot';
import { images } from '../../assets/images';
import { getShift, shiftTime } from '../../constants';

export default function HeroSection() {
  const morning = getShift('morning');

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

          {/* Small floating cards on the photo's edges */}
          <div className="float-badge float-badge--task" aria-hidden="true">
            <span className="float-badge__icon"><Check size={14} strokeWidth={3} /></span>
            Today’s task: completed
          </div>
          <div className="float-badge float-badge--shift" aria-hidden="true">
            <span className="float-badge__icon"><CalendarDays size={14} /></span>
            <span className="float-badge__stack">
              <small>{morning.label} shift</small>
              <strong>{shiftTime(morning)}</strong>
            </span>
          </div>
          <div className="float-badge float-badge--handover" aria-hidden="true">
            <span className="float-badge__icon"><FileText size={14} /></span>
            Shift handover: updated
          </div>
        </div>
      </div>
    </section>
  );
}
