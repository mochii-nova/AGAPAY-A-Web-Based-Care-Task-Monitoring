// Helpers for working out where we are in a shift

// Today's date at a time like "2:00 PM"
function atTime(base, label) {
  const [, h, m, ampm] = label.match(/(\d+):(\d+)\s*(AM|PM)/i);
  const date = new Date(base);
  date.setHours((Number(h) % 12) + (ampm.toUpperCase() === 'PM' ? 12 : 0), Number(m), 0, 0);
  return date;
}

// The start and end of the shift nearest to now. Handles the Night shift that ends the next morning.
export function shiftWindow(shift, now = new Date()) {
  const start = atTime(now, shift.start);
  const end = atTime(now, shift.end);
  if (end <= start) {
    if (now < end) start.setDate(start.getDate() - 1);
    else end.setDate(end.getDate() + 1);
  }
  return { start, end };
}

// 'upcoming' (not started yet), 'on' (happening now) or 'ended'
export function shiftPhase({ start, end }, now = new Date()) {
  if (now < start) return 'upcoming';
  if (now < end) return 'on';
  return 'ended';
}

// 95 -> "1 hr 35 min"
export function minutesToText(minutes) {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m} min`;
  return m % 60 === 0 ? `${m / 60} hr` : `${Math.floor(m / 60)} hr ${m % 60} min`;
}
