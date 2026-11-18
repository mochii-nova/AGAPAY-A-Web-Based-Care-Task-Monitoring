// The shape the React app gets for a user. `_id` and `id` are both kept.
// Never includes the password hash.

function displayName(u) {
  const middle = u.middle_name ? `${u.middle_name.trim()[0]}.` : '';
  return [u.first_name, middle, u.last_name].filter(Boolean).join(' ');
}

// The same full name, built inside a SQL query. `t` is the users table's alias, e.g. NAME_SQL('u')
const NAME_SQL = (t) =>
  `CONCAT_WS(' ', ${t}.first_name, IF(${t}.middle_name IS NULL OR ${t}.middle_name = '', NULL, CONCAT(LEFT(${t}.middle_name, 1), '.')), NULLIF(${t}.last_name, ''))`;

// Sorting people A-Z in SQL
const NAME_ORDER = (t) => `${t}.first_name, ${t}.last_name`;

// Why an account can't sign in, or null if it can
function blockedMessage(u) {
  if (u.status === 'pending') return 'Your account is waiting for approval.';
  if (u.status === 'rejected') {
    const reason = u.rejection_reason ? `: ${u.rejection_reason.replace(/[.!?]*$/, '.')}` : '.';
    return `Your sign-up was not approved${reason} Please contact the administrator.`;
  }
  if (u.status !== 'active') return 'Your account is inactive.';
  return null;
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
  name: displayName(u),
  username: u.username,
  role: u.role,
  status: u.status,
  title: u.title ?? null,
  photoUrl: photoAddress(req, u.photo_url),
});

// Everything: My Profile and the admin's staff details
const fullUser = (u, req) => ({
  ...publicUser(u, req),
  firstName: u.first_name ?? '',
  middleName: u.middle_name ?? '',
  lastName: u.last_name ?? '',
  rejectionReason: u.rejection_reason ?? null,
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

module.exports = { displayName, NAME_SQL, NAME_ORDER, blockedMessage, publicUser, fullUser, photoAddress, strongPassword, PASSWORD_RULE, validEmail, clean };