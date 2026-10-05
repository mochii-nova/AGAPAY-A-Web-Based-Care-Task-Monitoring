import { useState } from 'react';
import Navbar from '../components/Navbar';

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [resident, setResident] = useState('');
  const [task, setTask] = useState('');
  const [dueTime, setDueTime] = useState('');

  const addTask = (e) => {
    e.preventDefault();
    setTasks([...tasks, { id: Date.now(), resident, task, dueTime, done: false }]);
    setResident(''); setTask(''); setDueTime('');
  };

  const markDone = (id) =>
    setTasks(tasks.map((t) => (t.id === id ? { ...t, done: true } : t)));

  return (
    <div>
      <Navbar />
      <h1>Care Tasks</h1>

      <form onSubmit={addTask}>
        <input placeholder="Resident" value={resident} onChange={(e) => setResident(e.target.value)} required />
        <input placeholder="Task" value={task} onChange={(e) => setTask(e.target.value)} required />
        <input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} required />
        <button type="submit">Add task</button>
      </form>

      <ul>
        {tasks.map((t) => (
          <li key={t.id}>
            {t.resident} - {t.task} ({t.dueTime}) - {t.done ? 'Done' : 'Pending'}{' '}
            {!t.done && <button onClick={() => markDone(t.id)}>Mark done</button>}
          </li>
        ))}
      </ul>
    </div>
  );
}