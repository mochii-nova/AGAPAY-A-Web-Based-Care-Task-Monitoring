import ImageSlot from '../ImageSlot';
import StatusPill from '../StatusPill';
import { images } from '../../assets/images';

// The sample cards below are static pictures of the app with made-up people (never names from our data)
const SAMPLE_TASKS = [
  { time: '6:30 AM', task: 'Vital signs', resident: 'Felisa Navarro', status: 'completed' },
  { time: '8:00 AM', task: 'Morning medication', resident: 'Ramon Aquino', status: 'pending' },
  { time: 'Yesterday', task: 'Wound dressing', resident: 'Corazon Ocampo', status: 'overdue' },
];

// Three things not mentioned anywhere else on the page
const MORE = [
  { title: 'Resident profiles', text: 'Each resident’s care needs and notes in one place.' },
  { title: 'Messages', text: 'Chat between caregivers and administrators, right inside AGAPAY.' },
  { title: 'Reports', text: 'See how many tasks were done each day, ready to print.' },
];

// Labels around the dashboard screenshot, joined to their spot by a thin line (a labelled diagram).
// `at` = the spot on the picture in its own pixels (1440 × 900); `row` = the label's height, in % of the
// picture's height (the same three rows on both sides). The picture is 72% wide and centred, so a
// spot's x in the diagram is 14 + 72 × (x ÷ 1440) %. After retaking the screenshot, update `at`.
const SHOT_LEFT = 14; // % of the diagram, left of the picture
const SHOT_WIDTH = 72;
const CALLOUTS = [
  { side: 'left', label: 'Your menu', at: [215, 250], row: 22 },
  { side: 'left', label: 'Today’s progress', at: [283, 330], row: 42 },
  { side: 'left', label: 'Up next', at: [283, 560], row: 62 },
  { side: 'right', label: 'Read this first', at: [1395, 217], row: 22 },
  { side: 'right', label: 'Handover from the last shift', at: [1395, 330], row: 42 },
  { side: 'right', label: 'Residents to watch', at: [1395, 560], row: 62 },
];
const LABEL_EDGE = { left: 12.5, right: 87.5 }; // where the lines leave the labels (% of the diagram)
const ELBOW = 2; // the short angled piece at the end of each line (% of the diagram's width)

// In % of the diagram: the spot, and the line (straight across from the label, then a short angle in)
const calloutGeometry = ({ side, at: [x, y], row }) => {
  const tx = SHOT_LEFT + (SHOT_WIDTH * x) / 1440;
  const ty = (100 * y) / 900;
  const start = LABEL_EDGE[side];
  const elbow = side === 'left' ? tx - ELBOW : tx + ELBOW;
  return { tx, ty, points: `${start},${row} ${elbow},${row} ${tx},${ty}` };
};

// Under 1100px wide the labels are replaced by this one line under the picture
const SHOT_LIST = ['Your menu', 'Read this first', 'Today’s progress', 'Your shift', 'Handover', 'Up next'];

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
            <strong>Handover from Ben Tolentino</strong>
            <small>Night shift → Morning shift · 5:52 AM</small>
          </span>
          <span className="status-pill status-pill--completed">Read</span>
        </div>
        <p className="sample-handover__note">
          Felisa slept later than usual and ate a light dinner. Please watch her closely. Corazon&apos;s wound dressing was not
          done, so it&apos;s passed on to you.
        </p>
        <div className="sample-handover__passed">
          <strong>Passed on to the next shift</strong>
          <span>Wound dressing · Corazon Ocampo</span>
          <span>Check appetite at lunch · Felisa Navarro</span>
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
      </div>

      {/* The dashboard (light mode, made-up data) in a simple browser window, with labels on both
          sides joined by thin lines. Wider than the text, so the labels have room. The labels are
          decoration (the picture's alt text describes it); under 1100px a one-line list replaces them. */}
      <div className="shot-diagram">
        <div className="browser">
          <div className="browser__bar" aria-hidden="true"><span /><span /><span /></div>
          <ImageSlot
            image={images.featuresLaptop}
            alt="The AGAPAY caregiver dashboard: the menu, a Start here card, today's progress, the shift, the handover from the last shift, the next tasks and residents to watch"
            className="browser__shot"
          />
        </div>

        {/* Lines, dots and labels share one layer the size of the picture (so % stay right as it scales) */}
        <div className="shot-callouts" aria-hidden="true">
          <svg className="shot-callouts__lines" viewBox="0 0 100 100" preserveAspectRatio="none">
            {CALLOUTS.map((c) => (
              <polyline key={c.label} points={calloutGeometry(c).points} vectorEffect="non-scaling-stroke" />
            ))}
          </svg>
          {CALLOUTS.map((c) => {
            const { tx, ty } = calloutGeometry(c);
            return <span key={c.label} className="shot-callouts__dot" style={{ left: `${tx}%`, top: `${ty}%` }} />;
          })}
          {CALLOUTS.map(({ side, label, row }) => (
            <span key={label} className={`shot-callouts__label shot-callouts__label--${side}`} style={{ top: `${row}%` }}>
              {label}
            </span>
          ))}
        </div>

        <p className="shot-list">
          {SHOT_LIST.map((item, i) => (
            <span key={item}>{i > 0 && ' · '}<span className="shot-list__item">{item}</span></span>
          ))}
        </p>
      </div>

      <div className="container">
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
