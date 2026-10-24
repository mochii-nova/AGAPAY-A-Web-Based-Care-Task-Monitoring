import { Link } from 'react-router-dom';
import { Check, CalendarDays, FileText, Sun } from 'lucide-react';
import ImageSlot from '../ImageSlot';
import { images } from '../../assets/images';
import { getShift, shiftTime } from '../../constants';

export default function HeroSection() {
  const morning = getShift('morning');

  return (
    <section id="home" className="hero">
      <svg className="hero__waves" viewBox="0 0 1440 420" preserveAspectRatio="none" aria-hidden="true">
        <path className="hero__wave--back" d="M0 170 C 320 40, 640 300, 1000 190 S 1440 120, 1440 120 V 420 H 0 Z" />
        <path className="hero__wave--front" d="M0 300 C 300 220, 620 380, 980 300 S 1440 250, 1440 250 V 420 H 0 Z" />
      </svg>

      <div className="container hero__inner">
        <div className="hero__text">
          <h1 className="hero__title">
            Making <span className="accent">Caregiving</span> Easier, One <span className="accent">Shift</span> at a Time
          </h1>
          <p className="hero__lead">Organize. Connect. Care.</p>
          <p className="hero__body">
            Stay organized, informed, and connected with the tools you need to manage daily care, share
            important updates, and ensure a smooth transition from one shift to the next.
          </p>
          <div className="hero__actions">
            <Link to="/login" className="btn btn--primary btn--lg">Sign in</Link>
            <a href="#features" className="btn btn--outline btn--lg">Learn More</a>
          </div>
        </div>

        <div className="hero__visual">
          <ImageSlot image={images.hero} className="hero__photo" />

          {/* Little floating cards on top of the photo */}
          <div className="float-badge float-badge--task" aria-hidden="true">
            <span className="float-badge__icon float-badge__icon--green"><Check size={16} strokeWidth={3} /></span>
            Today's Task: Completed
          </div>
          <div className="float-badge float-badge--shift" aria-hidden="true">
            <span className="float-badge__icon float-badge__icon--red"><CalendarDays size={18} /></span>
            <span className="float-badge__stack">
              <small>{morning.label} Shift <Sun size={13} /></small>
              <strong>{shiftTime(morning)}</strong>
            </span>
          </div>
          <div className="float-badge float-badge--handover" aria-hidden="true">
            <span className="float-badge__icon float-badge__icon--navy"><FileText size={16} /></span>
            Shift Handover: Updated
          </div>
        </div>
      </div>
    </section>
  );
}
