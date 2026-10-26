import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { homeFor } from '../utils/roles';

// Signed-in pages. With `roles`, only those roles may open it; anyone else goes to their own Home
// (a caregiver who types an /admin address goes back to /dashboard, and an admin to /admin).
export default function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user)} replace />;

  return children;
}
