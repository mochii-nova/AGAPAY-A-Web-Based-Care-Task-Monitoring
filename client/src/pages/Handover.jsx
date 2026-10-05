import { useState } from 'react';
import Navbar from '../components/Navbar';

export default function Handover() {
  const [shift, setShift] = useState('Morning');
  const [notes, setNotes] = useState('');
  const [handovers, setHandovers] = useState([]);

  const submitHandover = (e) => {
    e.preventDefault();
    setHandovers([...handovers, { id: Date.now(), shift, notes, acknowledged: false }]);
    setNotes('');
  };

  const acknowledge = (id) =>
    setHandovers(handovers.map((h) => (h.id === id ? { ...h, acknowledged: true } : h)));

  return (
    <div>
      <Navbar />
      <h1>Shift Handover</h1>

      <form onSubmit={submitHandover}>
        <select value={shift} onChange={(e) => setShift(e.target.value)}>
          <option>Morning</option>
          <option>Afternoon</option>
          <option>Night</option>
        </select><br />
        <textarea rows="5" placeholder="Handover notes" value={notes} onChange={(e) => setNotes(e.target.value)} required /><br />
        <button type="submit">Submit handover</button>
      </form>

      <h2>Received handovers</h2>
      <ul>
        {handovers.map((h) => (
          <li key={h.id}>
            [{h.shift}] {h.notes} - {h.acknowledged ? 'Acknowledged' : 'Not yet acknowledged'}{' '}
            {!h.acknowledged && <button onClick={() => acknowledge(h.id)}>Acknowledge</button>}
          </li>
        ))}
      </ul>
    </div>
  );
}