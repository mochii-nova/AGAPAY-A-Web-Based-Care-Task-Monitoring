// Who sees which side of AGAPAY

export const isAdmin = (user) => user?.role === 'admin';

// Where someone lands after signing in (and when they open a page that isn't theirs)
export const homeFor = (user) => (isAdmin(user) ? '/admin' : '/dashboard');

// Notifications are written with caregiver links ("/handover", "/tasks?open=12").
// For an administrator, the same thing lives on the admin side.
const ADMIN_LINKS = [
  ['/handover', '/admin/handovers'],
  ['/tasks', '/admin/tasks'],
  ['/schedule', '/admin/schedule'],
  ['/residents', '/admin/residents'],
  ['/dashboard', '/admin'],
];

export function linkFor(user, link) {
  if (!link || !isAdmin(user)) return link;
  const match = ADMIN_LINKS.find(([from]) => link === from || link.startsWith(`${from}?`) || link.startsWith(`${from}/`));
  return match ? match[1] + link.slice(match[0].length) : link;
}
