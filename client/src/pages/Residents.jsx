import PageHeader from '../components/PageHeader';
import ComingSoon from '../components/ComingSoon';

export default function Residents() {
  return (
    <div>
      <PageHeader title="My Residents" subtitle="The residents you care for." />
      <ComingSoon phase={6}>Resident cards, care needs and profiles.</ComingSoon>
    </div>
  );
}
