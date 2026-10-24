import PageHeader from '../components/PageHeader';
import ComingSoon from '../components/ComingSoon';

export default function Messages() {
  return (
    <div>
      <PageHeader title="Messages" subtitle="Send a message to the administrator." />
      <ComingSoon phase={9}>Chat between you and the administrator.</ComingSoon>
    </div>
  );
}
