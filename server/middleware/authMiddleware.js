const jwt = require('jsonwebtoken');
const pool = require('../db');
const { displayName, blockedMessage } = require('../utils/users');

// Must be logged in with an active account.
// The account is looked up on every request, so if an admin deactivates someone
// or changes their role, it takes effect right away (not when the token expires).
exports.protect = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not logged in' });
  }

  let payload;
  try {
    payload = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

    const [[user]] = await pool.query(
    'SELECT id, first_name, middle_name, last_name, role, status, rejection_reason FROM users WHERE id = ?',
    [payload.id]
  );
  if (!user) return res.status(401).json({ message: 'This account no longer exists.' });
  const blocked = blockedMessage(user);
  if (blocked) return res.status(401).json({ message: blocked });

  req.user = { id: user.id, name: displayName(user), role: user.role };
  next();
};

// Must have one of the given roles
exports.allowRoles = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied' });
  }
  next();
};
