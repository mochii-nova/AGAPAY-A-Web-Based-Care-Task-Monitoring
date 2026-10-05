import { useNavigate } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();

  return (
    <nav>
      <b>AGAPAY</b>{' '}
      <button onClick={() => navigate('/dashboard')}>Dashboard</button>
      <button onClick={() => navigate('/tasks')}>Tasks</button>
      <button onClick={() => navigate('/handover')}>Handover</button>
      <button onClick={() => navigate('/')}>Log out</button>
    </nav>
  );
}