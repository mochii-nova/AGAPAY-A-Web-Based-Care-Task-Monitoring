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
    try {
      const [h, t] = await Promise.all([api.get('/handovers'), api.get('/tasks')]);
      setHandovers(h.data);
      setTasks(t.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load data. Is the server running?');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submitHandover = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/handovers', { shift, notes });
      setNotes('');
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not submit handover');
    }
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
      <div className="stats">
        <div className="stat done"><span>{doneCount}</span><small>Completed</small></div>
        <div className="stat pending"><span>{openCount}</span><small>Pending / Overdue</small></div>
      </div>

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
      {error && <p className="error">{error}</p>}
      <ul>
        {handovers.map((h) => (
          <li key={h._id} className="handover-item">
            [{h.shift}] by {h.author?.name} on {new Date(h.createdAt).toLocaleString()}<br />
            {h.notes}<br />
            {h.acknowledgedBy
              ? <span className="ack">Acknowledged by {h.acknowledgedBy.name}</span>
              : h.author?._id !== user.id && <button onClick={() => acknowledge(h._id)}>Acknowledge</button>}
          </li>
        ))}
      </ul>
    </div>
  );
}
