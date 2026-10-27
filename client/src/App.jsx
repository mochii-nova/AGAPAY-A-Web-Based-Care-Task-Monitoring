import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Schedule from './pages/Schedule';
import Residents from './pages/Residents';
import Handover from './pages/Handover';
import Notifications from './pages/Notifications';
import Messages from './pages/Messages';
import Profile from './pages/Profile';
import ManageStaff from './pages/admin/ManageStaff';
import ManageResidents from './pages/admin/ManageResidents';
import TasksCare from './pages/admin/TasksCare';
import AdminSchedule from './pages/admin/AdminSchedule';
import HandoverMonitor from './pages/admin/HandoverMonitor';
import ContactMessages from './pages/admin/ContactMessages';
import AdminDashboard from './pages/admin/AdminDashboard';
import Reports from './pages/admin/Reports';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';
import { useAuth } from './context/AuthContext';
import { homeFor } from './utils/roles';

// An address that doesn't exist: back to your own Home (or the website when signed out)
function GoHome() {
  const { user } = useAuth();
  return <Navigate to={user ? homeFor(user) : '/'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Signed-in pages share the sidebar + top bar */}
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        {/* Caregivers only: these show your own tasks, residents and shifts */}
        <Route element={<ProtectedRoute roles={['caregiver']}><Outlet /></ProtectedRoute>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/residents" element={<Residents />} />
          <Route path="/handover" element={<Handover />} />
        </Route>

        {/* Everyone */}
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/profile" element={<Profile />} />

        {/* Administrators only */}
        <Route path="/admin" element={<ProtectedRoute roles={['admin']}><Outlet /></ProtectedRoute>}>
          <Route index element={<AdminDashboard />} />
          <Route path="staff" element={<ManageStaff />} />
          <Route path="residents" element={<ManageResidents />} />
          <Route path="tasks" element={<TasksCare />} />
          <Route path="schedule" element={<AdminSchedule />} />
          <Route path="handover" element={<HandoverMonitor />} />
          <Route path="contact" element={<ContactMessages />} />
          <Route path="reports" element={<Reports />} />
        </Route>
      </Route>

      <Route path="*" element={<GoHome />} />
    </Routes>
  );
}
