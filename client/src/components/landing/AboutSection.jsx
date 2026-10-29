import ImageSlot from '../ImageSlot';
import { images } from '../../assets/images';

// Three label / value rows under the paragraph.
// (Orchid Care Home is only our reference facility: never say we built AGAPAY with or for its caregivers.)
const FACTS = [
  { label: 'Made for', value: 'Caregivers and administrators' },
  { label: 'Reference facility', value: 'Orchid Care Home, Inc., Dagupan City' },
  { label: 'Built by', value: 'CTRL + SIA + PRAY, Universidad de Dagupan' },
];

export default function AboutSection() {
  return (
    <section id="about" className="section about">
      <div className="container about__grid">
        <ImageSlot image={images.about} alt="A smiling caregiver talking with an elderly resident" className="about__photo" />

        <div className="about__text">
          <p className="eyebrow">About AGAPAY</p>
          <h2 className="section-title">Care is better when it&apos;s shared.</h2>
          <p className="about__body">
            <strong>Agapay</strong> means to walk alongside someone. Our app helps caregivers organize the day, record each
            task, and pass on what matters, so no resident&apos;s care falls through the cracks between shifts.
          </p>
          <dl className="about__facts">
            {FACTS.map(({ label, value }) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
