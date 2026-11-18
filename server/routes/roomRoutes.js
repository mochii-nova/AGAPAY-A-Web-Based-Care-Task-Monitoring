// Rooms and beds.
//   Private room: one resident, no beds.
//   Ward: several residents, one per bed (B1, B2, ...).
const express = require('express');
const pool = require('../db');
const { protect, allowRoles } = require('../middleware/authMiddleware');
const { clean } = require('../utils/users');

const router = express.Router();
router.use(protect);

const TYPES = ['private', 'ward'];
const MAX_BEDS = 20;
const byCode = (a, b) => a.bed_code.localeCompare(b.bed_code, undefined, { numeric: true });

// All rooms with their beds and who is in them
async function loadRooms(where = '', params = []) {
  const [rooms] = await pool.query(`SELECT * FROM rooms ${where} ORDER BY room_number`, params);
  if (rooms.length === 0) return [];
  const ids = rooms.map((r) => r.id);
  const [beds] = await pool.query('SELECT * FROM beds WHERE room_id IN (?)', [ids]);
  const [people] = await pool.query('SELECT id, name, room_id, bed_id FROM residents WHERE room_id IN (?)', [ids]);

  return rooms.map((room) => {
    const inRoom = people.filter((p) => p.room_id === room.id);
    const roomBeds = beds.filter((b) => b.room_id === room.id).sort(byCode);
    const capacity = room.room_type === 'private' ? 1 : roomBeds.length;
    return {
      id: room.id,
      _id: room.id,
      roomNumber: room.room_number,
      roomType: room.room_type,
      beds: roomBeds.map((b) => {
        const who = inRoom.find((p) => p.bed_id === b.id);
        return { id: b.id, bedCode: b.bed_code, resident: who ? { id: who.id, name: who.name } : null };
      }),
      residents: inRoom.map((p) => ({ id: p.id, name: p.name, bedId: p.bed_id })),
      capacity,
      free: Math.max(0, capacity - inRoom.length),
    };
  });
}
const loadRoom = async (id) => (await loadRooms('WHERE id = ?', [id]))[0];

// B1..Bn for a new ward
const bedRows = (roomId, from, count) => Array.from({ length: count }, (_, i) => [roomId, `B${from + i}`]);

// GET /api/rooms
router.get('/', async (req, res) => {
  res.json(await loadRooms());
});

// POST /api/rooms  (admin)  { roomNumber, roomType: 'private' | 'ward', bedCount }   bedCount: wards only
router.post('/', allowRoles('admin'), async (req, res) => {
  const roomNumber = clean(req.body.roomNumber, 10)?.toUpperCase();
  const roomType = req.body.roomType;
  const bedCount = Number(req.body.bedCount);
  if (!roomNumber) return res.status(400).json({ message: 'Please enter the room number.' });
  if (!TYPES.includes(roomType)) return res.status(400).json({ message: 'Room type must be Private or Ward.' });
  if (roomType === 'ward' && !(Number.isInteger(bedCount) && bedCount >= 2 && bedCount <= MAX_BEDS)) {
    return res.status(400).json({ message: `A ward needs 2 to ${MAX_BEDS} beds.` });
  }
  const [taken] = await pool.query('SELECT id FROM rooms WHERE room_number = ?', [roomNumber]);
  if (taken.length) return res.status(409).json({ message: `Room ${roomNumber} already exists.` });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query('INSERT INTO rooms (room_number, room_type) VALUES (?, ?)', [roomNumber, roomType]);
    if (roomType === 'ward') await conn.query('INSERT INTO beds (room_id, bed_code) VALUES ?', [bedRows(result.insertId, 1, bedCount)]);
    await conn.commit();
    await logAdmin(req, 'create', 'room', result.insertId,
      `Added room ${roomNumber} (${roomType === 'ward' ? `ward, ${bedCount} beds` : 'private'})`);
    res.status(201).json(await loadRoom(result.insertId));
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

// PATCH /api/rooms/:id  (admin)  { roomNumber }   Renames a room. (Its type is set when it's added.)
router.patch('/:id', allowRoles('admin'), async (req, res) => {
  const room = await loadRoom(req.params.id);
  if (!room) return res.status(404).json({ message: 'Room not found' });
  const roomNumber = clean(req.body.roomNumber, 10)?.toUpperCase();
  if (!roomNumber) return res.status(400).json({ message: 'Please enter the room number.' });
  const [taken] = await pool.query('SELECT id FROM rooms WHERE room_number = ? AND id <> ?', [roomNumber, room.id]);
  if (taken.length) return res.status(409).json({ message: `Room ${roomNumber} already exists.` });
  await pool.query('UPDATE rooms SET room_number = ? WHERE id = ?', [roomNumber, room.id]);
  if (roomNumber !== room.roomNumber) await logAdmin(req, 'update', 'room', room.id, `Renamed room ${room.roomNumber} to ${roomNumber}`);
  res.json(await loadRoom(room.id));
});

// DELETE /api/rooms/:id  (admin)   Only an empty room. Its beds go with it.
router.delete('/:id', allowRoles('admin'), async (req, res) => {
  const room = await loadRoom(req.params.id);
  if (!room) return res.status(404).json({ message: 'Room not found' });
  if (room.residents.length) {
    return res.status(409).json({ message: `Room ${room.roomNumber} still has residents. Move them to another room first.` });
  }
  await pool.query('DELETE FROM rooms WHERE id = ?', [room.id]);
  await logAdmin(req, 'delete', 'room', room.id, `Removed room ${room.roomNumber} (${room.roomType})`);
  res.json({ message: `Room ${room.roomNumber} removed` });
});

// POST /api/rooms/:id/beds  (admin)   Adds the next bed to a ward (B3 after B2)
router.post('/:id/beds', allowRoles('admin'), async (req, res) => {
  const room = await loadRoom(req.params.id);
  if (!room) return res.status(404).json({ message: 'Room not found' });
  if (room.roomType !== 'ward') return res.status(400).json({ message: 'Only a ward has beds.' });
  if (room.beds.length >= MAX_BEDS) return res.status(400).json({ message: `A ward can have at most ${MAX_BEDS} beds.` });
  const next = Math.max(0, ...room.beds.map((b) => Number(b.bedCode.replace(/\D/g, '')) || 0)) + 1;
  const [added] = await pool.query('INSERT INTO beds (room_id, bed_code) VALUES ?', [bedRows(room.id, next, 1)]);
  await logAdmin(req, 'create', 'bed', added.insertId, `Added bed B${next} to room ${room.roomNumber}`);
  res.status(201).json(await loadRoom(room.id));
});

// DELETE /api/rooms/:id/beds/:bedId  (admin)   Only a free bed, and a ward keeps at least 2
router.delete('/:id/beds/:bedId', allowRoles('admin'), async (req, res) => {
  const room = await loadRoom(req.params.id);
  if (!room) return res.status(404).json({ message: 'Room not found' });
  const bed = room.beds.find((b) => b.id === Number(req.params.bedId));
  if (!bed) return res.status(404).json({ message: 'Bed not found' });
  if (bed.resident) return res.status(409).json({ message: `${bed.resident.name} is in bed ${bed.bedCode}. Move them first.` });
  if (room.beds.length <= 2) return res.status(400).json({ message: 'A ward needs at least 2 beds.' });
  await pool.query('DELETE FROM beds WHERE id = ?', [bed.id]);
  await logAdmin(req, 'delete', 'bed', bed.id, `Removed bed ${bed.bedCode} from room ${room.roomNumber}`);
  res.json(await loadRoom(room.id));
});

module.exports = router;