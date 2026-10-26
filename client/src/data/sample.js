// =====================================================================
//  SAMPLE DATA — NOT FROM THE DATABASE
//
//  Tasks, residents, shifts and handovers now come from the backend.
//  What is left here (profile details, notifications and messages) is
//  replaced by the real routes in the next phase.
// =====================================================================

import { getShift, shiftTime } from '../constants';

const minutesAgo = (n) => new Date(Date.now() - n * 60000).toISOString();

// Default account details the backend's users table doesn't store yet.
// context/ProfileContext.jsx combines these with the logged-in user and anything saved in the browser.
export const sampleProfile = {
  name: 'Claire River',
  email: 'claire.river@example.com',
  employeeId: 'CGV-2026-017',
  phone: '0917 555 0123',
  emergencyContact: { name: 'Mark River', relationship: 'Spouse', phone: '0918 555 0456' },
  // Set by the administrator (not in the database yet)
  shift: 'Morning',
  dateHired: '2024-06-03',
  accountStatus: 'Active',
  photo: null,
};

// type: task | overdue | handover | schedule | message
export const sampleNotifications = [
  { id: 1, type: 'task', title: 'Lunch Feeding starts in 30 minutes', body: 'Juan Cruz · Room 104', time: minutesAgo(2), read: false, link: '/tasks' },
  { id: 2, type: 'overdue', title: 'Morning Walk is overdue', body: 'Maria Santos · was due 9:30 AM', time: minutesAgo(12), read: false, link: '/tasks' },
  { id: 3, type: 'message', title: 'Admin replied to your message', body: '"Yes, the supply order is coming tomorrow."', time: minutesAgo(180), read: true, link: '/messages?with=admin-1' },
  { id: 4, type: 'handover', title: 'New handover from Night shift', body: '1 resident to watch closely', time: minutesAgo(480), read: false, link: '/handover' },
  { id: 5, type: 'schedule', title: 'Your Saturday shift changed', body: `Now Noon · ${shiftTime(getShift('noon'))}`, time: minutesAgo(1500), read: true, link: '/schedule' },
];

// Messages between the signed-in caregiver and the administrators.
// Same shape the backend will send (see design-reference/MESSAGES-FOR-AERON.md):
// { user: { id, name, role, title }, messages: [{ id, senderId, recipientId, body, createdAt, readAt }] }
export const sampleAdmins = [
  { id: 'admin-1', name: 'Liza Navarro', role: 'admin', title: 'Head of Care' },
  { id: 'admin-2', name: 'Daniel Ramos', role: 'admin', title: 'Scheduling' },
  { id: 'admin-3', name: 'Grace Villanueva', role: 'admin', title: 'Night Supervisor' },
];

export function sampleConversations(myId) {
  const msg = (id, from, to, body, ago, read = true) => ({
    id, senderId: from, recipientId: to, body, createdAt: minutesAgo(ago), readAt: read ? minutesAgo(ago - 1) : null,
  });
  const [liza, daniel, grace] = sampleAdmins;
  return [
    {
      user: liza,
      messages: [
        msg('s1', myId, liza.id, 'Hello Ma’am, we’re running low on adult wipes and size M gloves on the 1st floor.', 1500),
        msg('s2', liza.id, myId, 'Thanks for letting me know, Claire. I’ll add them to this week’s supply order.', 1490),
        msg('s3', myId, liza.id, 'Hi Ma’am, just checking: will the supply order arrive this week?', 200),
        msg('s4', liza.id, myId, 'Yes, the supply order is coming tomorrow.', 180),
      ],
    },
    {
      user: daniel,
      messages: [
        msg('s5', daniel.id, myId, 'Hi Claire, can you cover the Noon shift this Saturday? Rosa asked for the day off.', 1560),
        msg('s6', myId, daniel.id, 'Yes, I can cover it.', 1540),
        msg('s7', daniel.id, myId, 'Thank you! I’ve updated the schedule.', 1530),
        msg('s8', daniel.id, myId, 'Reminder: staff meeting on Monday at 1:30 PM in the training room.', 40, false),
        msg('s9', daniel.id, myId, 'Please bring your updated health certificate if you haven’t submitted it yet.', 38, false),
      ],
    },
    { user: grace, messages: [] },
  ];
}
