// The shape the React app gets for a user. `_id` and `id` are both kept.
// Never includes the password hash.

// First / last name: the saved columns, or a best guess from the full name
// for accounts made before those columns existed.
function splitName(u) {
  if (u.first_name || u.last_name) return { firstName: u.first_name ?? '', lastName: u.last_name ?? '' };
  const parts = String(u.name ?? '').trim().split(/\s+/);
  return { firstName: parts.length > 1 ? parts.slice(0, -1).join(' ') : parts[0] ?? '', lastName: parts.length > 1 ? parts.at(-1) : '' };
}

// Photos are saved as /uploads/photos/x.jpg. The frontend runs on another port,
// so it gets the full address.
function photoAddress(req, path) {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  const base = process.env.PUBLIC_URL || (req ? `${req.protocol}://${req.get('host')}` : '');
  return `${base}${path}`;
}

// Short version: lists, login, handovers
const publicUser = (u, req) => ({
  _id: u.id,
  id: u.id,
  name: u.name,
  username: u.username,
  role: u.role,
  status: u.status,
  title: u.title ?? null,
  photoUrl: photoAddress(req, u.photo_url),
});

// Everything: My Profile and the admin's staff details
const fullUser = (u, req) => ({
  ...publicUser(u, req),
  ...splitName(u),
  employeeId: u.username,
  email: u.email ?? null,
  phone: u.phone ?? null,
  emergencyContact: {
    name: u.emergency_name ?? null,
    relationship: u.emergency_relationship ?? null,
    phone: u.emergency_phone ?? null,
  },
  assignedShift: u.assigned_shift ?? null,
  dateHired: u.date_hired ?? null,
  createdAt: u.created_at ?? null,
});

// 8+ characters with at least one letter and one number
const strongPassword = (p) => typeof p === 'string' && p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p);
const PASSWORD_RULE = 'Password must be at least 8 characters with a letter and a number.';

const validEmail = (e) => typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 120;

// '' or undefined -> null, otherwise trimmed and cut to a max length
const clean = (value, max) => {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  return s ? s.slice(0, max) : null;
};

module.exports = { publicUser, fullUser, photoAddress, strongPassword, PASSWORD_RULE, validEmail, clean };
