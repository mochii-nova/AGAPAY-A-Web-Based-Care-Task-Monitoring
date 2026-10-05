import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav>
      <b>AGAPAY</b> | {user?.name} ({user?.role}){' '}
      <button onClick={() => navigate('/dashboard')}>Dashboard</button>
      <button onClick={() => navigate('/tasks')}>Tasks</button>
      <button onClick={() => navigate('/handover')}>Handover</button>
      <button onClick={handleLogout}>Log out</button>
    </nav>
  );
}