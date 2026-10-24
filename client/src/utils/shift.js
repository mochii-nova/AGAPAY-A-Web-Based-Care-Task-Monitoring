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

// Start and end of a shift that begins on `date` (the Night shift ends the next morning)
export function shiftOnDate(shift, date) {
  const start = atTime(date, shift.start);
  const end = atTime(date, shift.end);
  if (end <= start) end.setDate(end.getDate() + 1);
  return { start, end };
}

// Which shift a task's time falls in, e.g. 9:30 AM -> Morning. `shifts` is SHIFTS from constants.
export function shiftOfTime(shifts, date) {
  const time = new Date(date);
  const minutes = time.getHours() * 60 + time.getMinutes();
  const toMinutes = (label) => {
    const d = atTime(time, label);
    return d.getHours() * 60 + d.getMinutes();
  };
  return shifts.find((s) => {
    const start = toMinutes(s.start);
    const end = toMinutes(s.end);
    return start < end ? minutes >= start && minutes < end : minutes >= start || minutes < end;
  });
}

// Link that opens Google Calendar with this shift filled in, ready to save.
// Only the shift is shared, never resident details.
export function googleCalendarLink(shift, date) {
  const { start, end } = shiftOnDate(shift, date);
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `AGAPAY – ${shift.label} Shift`,
    dates: `${stamp(start)}/${stamp(end)}`,
    details: 'Caregiver shift at Orchid Carehome Inc. (from AGAPAY)',
    location: 'Orchid Carehome Inc., Bolosan Old Road, Dagupan City',
    ctz: 'Asia/Manila',
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

// 95 -> "1 hr 35 min"
export function minutesToText(minutes) {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m} min`;
  return m % 60 === 0 ? `${m / 60} hr` : `${Math.floor(m / 60)} hr ${m % 60} min`;
}
