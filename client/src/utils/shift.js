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

// Orchid Carehome is in the Philippines, so shift times are always Manila clock times
export const CAREHOME_TZ = 'Asia/Manila';

const pad = (n) => String(n).padStart(2, '0');

// The shift as Manila clock times, e.g. { start: '2026-10-25T06:00:00', end: '2026-10-25T14:00:00' }.
// Built from the day picked on the calendar, so it doesn't depend on this computer's time zone.
// The Night shift ends the next morning.
export function shiftManilaTimes(shift, date) {
  const d = new Date(date);
  const day = (plus) => {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + plus);
    return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
  };
  const clock = (label) => {
    const [, h, m, ampm] = label.match(/(\d+):(\d+)\s*(AM|PM)/i);
    return `${pad((Number(h) % 12) + (ampm.toUpperCase() === 'PM' ? 12 : 0))}:${m}:00`;
  };
  const start = clock(shift.start);
  const end = clock(shift.end);
  return { start: `${day(0)}T${start}`, end: `${day(end <= start ? 1 : 0)}T${end}` };
}

// What a shift looks like in Google Calendar. Only the shift is shared, never resident details.
// The Manila time is in the title too, so it's clear even in a calendar set to another time zone.
export const shiftEventText = (shift) => ({
  title: `AGAPAY – ${shift.label} Shift (${shift.start} – ${shift.end} PH time)`,
  details: `${shift.label} shift, ${shift.start} – ${shift.end} Philippine time (Asia/Manila).\nCaregiver shift at Orchid Carehome Inc. (from AGAPAY)`,
  location: 'Orchid Carehome Inc., Bolosan Old Road, Dagupan City',
});

// Link that opens Google Calendar with this shift filled in, ready to save.
// Used only when the Google connection isn't set up (no Client ID in client/.env).
export function googleCalendarLink(shift, date) {
  const { start, end } = shiftManilaTimes(shift, date);
  const { title, details, location } = shiftEventText(shift);
  const stamp = (iso) => iso.replace(/[-:]/g, ''); // '2026-10-25T06:00:00' -> '20261025T060000'
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${stamp(start)}/${stamp(end)}`,
    details,
    location,
    ctz: CAREHOME_TZ,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

// 95 -> "1 hr 35 min"
export function minutesToText(minutes) {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m} min`;
  return m % 60 === 0 ? `${m / 60} hr` : `${Math.floor(m / 60)} hr ${m % 60} min`;
}
