// Date helpers for the calendar. Weeks start on Sunday.

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

// First day of the month, n months away
export const addMonths = (date, n) => new Date(date.getFullYear(), date.getMonth() + n, 1);

export const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();

// A short text key for one calendar day, for grouping tasks by day
export const dayKey = (date) => new Date(date).toDateString();

export const startOfWeek = (date) => addDays(startOfDay(date), -new Date(date).getDay());

// The 7 days of the week that contains `date`
export const weekDays = (date) => Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(date), i));

// Every day shown in a month grid: full weeks, starting on the Sunday before the 1st
export function monthGrid(date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const weeks = Math.ceil((first.getDay() + daysInMonth) / 7);
  return Array.from({ length: weeks * 7 }, (_, i) => addDays(startOfWeek(first), i));
}

// "October 2026"
export const monthTitle = (date) => date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

// "Oct 18 – 24, 2026" (or "Oct 25 – Nov 1, 2026" across two months)
export function weekTitle(date) {
  const [first, last] = [weekDays(date)[0], weekDays(date)[6]];
  const month = (d) => d.toLocaleDateString('en-US', { month: 'short' });
  const end = first.getMonth() === last.getMonth() ? last.getDate() : `${month(last)} ${last.getDate()}`;
  return `${month(first)} ${first.getDate()} – ${end}, ${last.getFullYear()}`;
}

// "Saturday, Oct 24"
export const dayTitle = (date) => date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
