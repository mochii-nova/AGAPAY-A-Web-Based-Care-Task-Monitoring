import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import api from '../api';

export default function Dashboard() {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    api.get('/tasks').then(({ data }) => setTasks(data));
  }, []);

  const count = (status) => tasks.filter((t) => t.status === status).length;
  const overdue = tasks.filter((t) => t.status === 'overdue');

  return (
    <div>
      <Navbar />
      <h1>Dashboard</h1>
      <p>Pending: {count('pending')} | Done: {count('done')} | Overdue: {count('overdue')}</p>

      <h2>Tasks needing attention</h2>
      {overdue.length === 0 ? (
        <p>No overdue tasks.</p>
      ) : (
        <ul>
          {overdue.map((t) => (
            <li key={t._id}>
              {t.resident} - {t.task} (was due {new Date(t.dueAt).toLocaleString()})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}