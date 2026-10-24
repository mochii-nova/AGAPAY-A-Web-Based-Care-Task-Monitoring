import PageHeader from '../components/PageHeader';
import ComingSoon from '../components/ComingSoon';

export default function Profile() {
  return (
    <div>
      <PageHeader title="My Profile" subtitle="Your account details and photo." />
      <ComingSoon phase={8}>Profile photo upload, Edit Profile form and password change.</ComingSoon>
    </div>
  );
}
