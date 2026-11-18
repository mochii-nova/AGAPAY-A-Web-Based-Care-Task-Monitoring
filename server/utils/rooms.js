// Rooms and beds, for queries that show a resident's room.
// A Private room shows as "101"; a bed in a Ward shows as "201 · Bed B2".
// The frontend shows it as "Room 101" / "Room 201 · Bed B2" without any change.

// Joins for a residents table with alias `r`
const ROOM_JOIN = (r = 'r') => `
  LEFT JOIN rooms rm ON rm.id = ${r}.room_id
  LEFT JOIN beds bd  ON bd.id = ${r}.bed_id`;

// The room label, as a column
const ROOM_LABEL = `CONCAT(rm.room_number, IF(bd.bed_code IS NULL, '', CONCAT(' · Bed ', bd.bed_code)))`;

module.exports = { ROOM_JOIN, ROOM_LABEL };