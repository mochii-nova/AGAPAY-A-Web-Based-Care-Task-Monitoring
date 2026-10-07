import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function Handover() {
  const { user } = useAuth();
  const [shift, setShift] = useState('Morning');
  const [notes, setNotes] = useState('');
  const [handovers, setHandovers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState('');

  const load = async () => {
    const [h, t] = await Promise.all([api.get('/handovers'), api.get('/tasks')]);
    setHandovers(h.data);
    setTasks(t.data);
  };

  useEffect(() => {
    load();
  }, []);

  const submitHandover = async (e) => {
    e.preventDefault();
    await api.post('/handovers', { shift, notes });
    setNotes('');
    load();
  };

  const acknowledge = async (id) => {
    setError('');
    try {
      await api.patch(`/handovers/${id}/acknowledge`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed');
    }
  };

  const doneCount = tasks.filter((t) => t.status === 'done').length;
  const openCount = tasks.length - doneCount;

  return (
    <div>
      <Navbar />
      <h1>Shift Handover</h1>

      <h2>Summary of tasks</h2>
      <p>Completed: {doneCount} | Pending/Overdue: {openCount}</p>

      <h2>Write handover</h2>
      <form onSubmit={submitHandover}>
        <select value={shift} onChange={(e) => setShift(e.target.value)}>
          <option>Morning</option>
          <option>Afternoon</option>
          <option>Night</option>
        </select><br />
        <textarea rows="5" placeholder="Handover notes" value={notes} onChange={(e) => setNotes(e.target.value)} required /><br />
        <button type="submit">Submit handover</button>
      </form>

      <h2>Handovers</h2>
      {error && <p>{error}</p>}
      <ul>
        {handovers.map((h) => (
          <li key={h._id}>
            [{h.shift}] by {h.author?.name} on {new Date(h.createdAt).toLocaleString()}<br />
            {h.notes}<br />
            {h.acknowledgedBy
              ? `Acknowledged by ${h.acknowledgedBy.name}`
              : h.author?._id !== user.id && <button onClick={() => acknowledge(h._id)}>Acknowledge</button>}
          </li>
        ))}
      </ul>
    </div>
  );
}