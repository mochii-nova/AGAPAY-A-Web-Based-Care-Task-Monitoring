import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();
  return (
    <div>
      <h1>AGAPAY</h1>
      <p>Care Task Monitoring and Shift Handover System for Orchid Care Home, Inc.</p>
      <button onClick={() => navigate('/login')}>Log in</button>
    </div>
  );
}