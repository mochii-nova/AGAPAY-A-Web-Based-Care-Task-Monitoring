// GET /api/admin-logs  (admin)   The admin activity log, newest first.
//   ?adminId=3        only this administrator
//   ?targetType=staff only staff / resident / room / bed / shift / task / contact
//   ?from=2026-11-01&to=2026-11-30   only these days
//   ?search=jessa     words in the details
const express = require('express');
const pool = require('../db');
const { protect, allowRoles } = require('../middleware/authMiddleware');
const { isDate } = require('../utils/shifts');

const router = express.Router();
router.use(protect, allowRoles('admin'));

const TYPES = ['staff', 'resident', 'room', 'bed', 'shift', 'task', 'contact'];

router.get('/', async (req, res) => {
  const where = [];
  const params = [];
  if (req.query.adminId) {
    where.push('admin_id = ?');
    params.push(Number(req.query.adminId));
  }
  if (TYPES.includes(req.query.targetType)) {
    where.push('target_type = ?');
    params.push(req.query.targetType);
  }
  if (isDate(req.query.from)) {
    where.push('created_at >= ?');
    params.push(`${req.query.from} 00:00:00`);
  }
  if (isDate(req.query.to)) {
    where.push('created_at < DATE_ADD(?, INTERVAL 1 DAY)');
    params.push(req.query.to);
  }
  if (req.query.search) {
    where.push('(details LIKE ? OR admin_name LIKE ?)');
    const like = `%${String(req.query.search).slice(0, 60)}%`;
    params.push(like, like);
  }

  const [rows] = await pool.query(
    `SELECT * FROM admin_logs ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY created_at DESC, id DESC LIMIT 300`,
    params
  );
  res.json(
    rows.map((r) => ({
      id: r.id,
      adminId: r.admin_id,
      adminName: r.admin_name,
      action: r.action,
      targetType: r.target_type,
      targetId: r.target_id,
      details: r.details,
      createdAt: r.created_at,
    }))
  );
});

module.exports = router;