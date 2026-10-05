import Navbar from '../components/Navbar';

export default function Dashboard() {
  return (
    <div>
      <Navbar />
      <h1>Dashboard</h1>
      <p>Pending: 0 | Done: 0 | Overdue: 0</p>
      <h2>Today's care tasks</h2>
      <p>No tasks yet.</p>
    </div>
  );
}