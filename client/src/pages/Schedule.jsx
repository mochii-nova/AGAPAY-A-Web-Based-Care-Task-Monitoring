import PageHeader from '../components/PageHeader';
import ComingSoon from '../components/ComingSoon';

export default function Schedule() {
  return (
    <div>
      <PageHeader title="My Schedule" subtitle="Your shifts and care activities." />
      <ComingSoon phase={5}>Week and month calendar with status filters and Google Calendar.</ComingSoon>
    </div>
  );
}
