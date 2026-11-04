// Shift times, always in Philippine time (Asia/Manila, UTC+8, no daylight saving).
// The database stores Morning / Afternoon / Night. The screens call Afternoon "Noon".
const SHIFTS = ['Morning', 'Afternoon', 'Night'];
const SHIFT_LABEL = { Morning: 'Morning', Afternoon: 'Noon', Night: 'Night' };
const START_HOUR = { Morning: 6, Afternoon: 14, Night: 22 };
const MANILA_OFFSET_MS = 8 * 3600 * 1000;

const isShift = (s) => SHIFTS.includes(s);
const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(`${s}T00:00:00Z`));

// 'YYYY-MM-DD' plus n days
const addDays = (ymd, n) => new Date(Date.parse(`${ymd}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

// When a shift starts and ends, as real moments in time
function shiftTimes(shiftDate, shift) {
  const start = new Date(Date.parse(`${shiftDate}T00:00:00Z`) - MANILA_OFFSET_MS + START_HOUR[shift] * 3600000);
  return { startsAt: start.toISOString(), endsAt: new Date(start.getTime() + 8 * 3600000).toISOString() };
}

// The shift happening at a given moment. A Night shift that started at 10 PM
// keeps the date it started on, even after midnight.
function shiftAt(when = new Date()) {
  const manila = new Date(when.getTime() + MANILA_OFFSET_MS);
  const hour = manila.getUTCHours();
  const today = manila.toISOString().slice(0, 10);
  if (hour >= 6 && hour < 14) return { shift: 'Morning', shiftDate: today };
  if (hour >= 14 && hour < 22) return { shift: 'Afternoon', shiftDate: today };
  return { shift: 'Night', shiftDate: hour < 6 ? addDays(today, -1) : today };
}

// The shift right after the given one
function nextShift(shift, shiftDate) {
  if (shift === 'Morning') return { shift: 'Afternoon', shiftDate };
  if (shift === 'Afternoon') return { shift: 'Night', shiftDate };
  return { shift: 'Morning', shiftDate: addDays(shiftDate, 1) };
}

module.exports = { SHIFTS, SHIFT_LABEL, isShift, isDate, addDays, shiftTimes, shiftAt, nextShift };
