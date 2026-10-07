import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import api from '../api';

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [resident, setResident] = useState('');
  const [task, setTask] = useState('');
  const [dueAt, setDueAt] = useState('');

  const loadTasks = async () => {
    const { data } = await api.get('/tasks');
    setTasks(data);
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const addTask = async (e) => {
    e.preventDefault();
    await api.post('/tasks', { resident, task, dueAt });
    setResident(''); setTask(''); setDueAt('');
    loadTasks();
  };

  const markDone = async (id) => {
    await api.patch(`/tasks/${id}/done`);
    loadTasks();
  };

  return (
    <div>
      <Navbar />
      <h1>Care Tasks</h1>

      <form onSubmit={addTask}>
        <input placeholder="Resident" value={resident} onChange={(e) => setResident(e.target.value)} required />
        <input placeholder="Task" value={task} onChange={(e) => setTask(e.target.value)} required />
        <input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} required />
        <button type="submit">Add task</button>
      </form>

      <ul>
        {tasks.map((t) => (
          <li key={t._id}>
            {t.resident} - {t.task} (due {new Date(t.dueAt).toLocaleString()}) - <b>{t.status.toUpperCase()}</b>{' '}
            {!t.done && <button onClick={() => markDone(t._id)}>Mark done</button>}
          </li>
        ))}
      </ul>
    </div>
  );
}