import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Temporary: goes straight to dashboard. Real login comes in the next step.
    navigate('/dashboard');
  };

  return (
    <div>
      <h1>Log in</h1>
      <form onSubmit={handleSubmit}>
        <label>Username</label><br />
        <input value={username} onChange={(e) => setUsername(e.target.value)} /><br />
        <label>Password</label><br />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /><br />
        <button type="submit">Log in</button>
      </form>
      <button onClick={() => navigate('/')}>Back</button>
    </div>
  );
}