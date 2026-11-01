import ImageSlot from '../ImageSlot';
import StatusPill from '../StatusPill';
import { images } from '../../assets/images';

// The sample cards below are static pictures of the app, not real data
const SAMPLE_TASKS = [
  { time: '6:30 AM', task: 'Vital signs', resident: 'Maria Santos', status: 'completed' },
  { time: '8:00 AM', task: 'Morning medication', resident: 'Remedios Garcia', status: 'pending' },
  { time: 'Yesterday', task: 'Wound dressing', resident: 'Juan Cruz', status: 'overdue' },
];

// Three things not mentioned anywhere else on the page
const MORE = [
  { title: 'Resident profiles', text: 'Each resident’s care needs and notes in one place.' },
  { title: 'Messages', text: 'Chat between caregivers and administrators, right inside AGAPAY.' },
  { title: 'Reports', text: 'See how many tasks were done each day, ready to print.' },
];

// Numbered markers on the dashboard screenshot, placed at the top-left corner of each card.
// x / y are percentages of the picture (1440 × 900), so they stay put when it scales.
// After retaking the screenshot: x = card's left edge ÷ 1440 × 100, y = card's top edge ÷ 900 × 100.
const MARKERS = [
  { n: 1, label: 'Your shift', x: 46.1, y: 20.1 },
  { n: 2, label: 'Today’s progress', x: 19.4, y: 20.1 },
  { n: 3, label: 'Handover from the last shift', x: 72.5, y: 20.1 },
];

// A sample of the My Tasks list: tabs, then three tasks with their status
function SampleTasks() {
  return (
    <figure className="sample-card" aria-label="Example of a caregiver's task list">
      <div aria-hidden="true">
        <div className="sample-tabs">
          <span className="sample-tab is-active">Today 10</span>
          <span className="sample-tab">Overdue 2</span>
          <span className="sample-tab">Done 4</span>
        </div>
        <ul className="sample-tasks">
          {SAMPLE_TASKS.map((t) => (
            <li key={t.task}>
              <span className="sample-tasks__time">{t.time}</span>
              <span className="sample-tasks__main">
                <strong>{t.task}</strong>
                <small>{t.resident}</small>
              </span>
              <StatusPill status={t.status} />
            </li>
          ))}
        </ul>
      </div>
    </figure>
  );
}

// A sample handover: who wrote it, the note, and what was passed on
function SampleHandover() {
  return (
    <figure className="sample-card sample-handover" aria-label="Example of a shift handover">
      <div aria-hidden="true">
        <div className="sample-handover__head">
          <span>
            <strong>Handover from Rosa Lim</strong>
            <small>Night shift → Morning shift · 5:52 AM</small>
          </span>
          <span className="status-pill status-pill--completed">Read</span>
        </div>
        <p className="sample-handover__note">
          Maria slept later than usual and ate a light dinner. Please watch her closely. Juan&apos;s wound dressing was not
          done, so it&apos;s passed on to you.
        </p>
        <div className="sample-handover__passed">
          <strong>Passed on to the next shift</strong>
          <span>Wound dressing · Juan Cruz</span>
          <span>Check appetite at lunch · Maria Santos</span>
        </div>
      </div>
    </figure>
  );
}

export default function FeaturesSection() {
  return (
    <section id="features" className="section features">
      <div className="container">
        <header className="section-head section-head--center">
          <p className="eyebrow">Features</p>
          <h2 className="section-title">Better care, <span className="accent">shared together.</span></h2>
          <p className="section-sub">Everything a caregiver needs for the shift, in one calm place.</p>
        </header>

        {/* Our real dashboard (light mode, real data) in a simple browser window,
            with numbered markers on three cards and a legend underneath */}
        <div className="browser">
          <div className="browser__bar" aria-hidden="true"><span /><span /><span /></div>
          <div className="browser__view">
            <ImageSlot image={images.featuresLaptop} alt="The AGAPAY caregiver dashboard" className="browser__shot" />
            {MARKERS.map(({ n, x, y }) => (
              <span key={n} className="shot-marker" style={{ left: `${x}%`, top: `${y}%` }} aria-hidden="true">{n}</span>
            ))}
          </div>
        </div>
        <ol className="shot-legend" aria-label="What the numbers show">
          {MARKERS.map(({ n, label }) => (
            <li key={n}><span className="shot-marker shot-marker--inline" aria-hidden="true">{n}</span> {label}</li>
          ))}
        </ol>

        <div className="feature-row">
          <div className="feature-row__text">
            <h3>Tasks that don&apos;t get lost</h3>
            <p>
              Each caregiver sees their own tasks for the shift, sorted by time. Anything not done moves to Overdue instead of
              disappearing.
            </p>
          </div>
          <SampleTasks />
        </div>

        <div className="feature-row feature-row--reverse">
          <div className="feature-row__text">
            <h3>Handovers the next shift can trust</h3>
            <p>
              Notes, residents to watch, and unfinished tasks go to the next caregiver in one place. Admins can see which
              handovers were read.
            </p>
          </div>
          <SampleHandover />
        </div>

        <ul className="feature-more">
          {MORE.map(({ title, text }) => (
            <li key={title}>
              <h3>{title}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
