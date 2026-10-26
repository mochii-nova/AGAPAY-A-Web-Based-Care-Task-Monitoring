// Helpers for staff accounts (admin pages)

export const roleLabel = (person) => (person.role === 'admin' ? 'Administrator' : 'Caregiver');

// Account status as a label + status-pill tone
export const STATUS_LABEL = {
  active: { label: 'Active', tone: 'completed' },
  pending: { label: 'Pending approval', tone: 'pending' },
  inactive: { label: 'Deactivated', tone: 'skipped' },
};

// "Oct 24"
export const shortDate = (value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

// "2024-06-03" -> "June 3, 2024" (a calendar date, not a moment in time)
export function longDate(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}
