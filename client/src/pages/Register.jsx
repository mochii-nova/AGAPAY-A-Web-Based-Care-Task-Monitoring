import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', username: '', password: '', role: 'caregiver' });
  const [error, setError] = useState('');

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/auth/register', form);
      alert('Registered! You can now log in.');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="auth-card">
      <h1>Register</h1>
      <form onSubmit={handleSubmit}>
        <label>Full name</label><br />
        <input name="name" value={form.name} onChange={handleChange} required /><br />

        <label>Username</label><br />
        <input name="username" value={form.username} onChange={handleChange} required /><br />

        <label>Password</label><br />
        <input type="password" name="password" value={form.password} onChange={handleChange} required /><br />

        <label>Register as</label><br />
        <select name="role" value={form.role} onChange={handleChange}>
          <option value="caregiver">Caregiver</option>
          <option value="admin">Admin</option>
        </select><br />

        {error && <p className="error">{error}</p>}
        <button type="submit">Register</button>
      </form>
      <button onClick={() => navigate('/login')}>Already have an account? Log in</button>
      <button onClick={() => navigate('/')}>Back</button>
    </div>
  );
}
