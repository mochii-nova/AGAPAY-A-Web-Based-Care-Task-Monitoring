// =====================================================================
//  SAMPLE DATA — NOT FROM THE DATABASE
//
//  The backend does not have residents, shifts, notifications, messages
//  or extra profile details yet. Pages read from this file until Aeron
//  adds those routes (see the backend request list). When a route exists,
//  replace the matching export here with an api.get(...) call.
// =====================================================================

import { getShift, shiftTime } from '../constants';

const minutesAgo = (n) => new Date(Date.now() - n * 60000).toISOString();
const hoursFromNow = (h) => new Date(Date.now() + h * 3600000).toISOString();

// Extra account details the backend's users table doesn't store yet.
// Real values from the logged-in user (name, username, role) always win.
export const sampleProfile = {
  name: 'Claire River',
  email: 'claire.river@example.com',
  employeeId: 'CGV-2026-017',
  phone: '0917 555 0123',
  shift: 'Morning',
  photo: null,
};

export const getProfile = (user) => ({ ...sampleProfile, ...user });

// Sample work roster: which shift I work on a day, as the backend value
// ('Morning' | 'Afternoon' | 'Night'), or null for a day off.
// Morning shift, Wednesdays off, and next Saturday moved to Noon
// (matches the "Your Saturday shift changed" sample notification).
export function sampleShiftOn(date) {
  const day = new Date(date);
  if (day.getDay() === 3) return null;
  const daysAway = Math.round((new Date(day).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000);
  if (day.getDay() === 6 && daysAway > 0 && daysAway <= 7) return 'Afternoon';
  return 'Morning';
}

export const sampleResidents = [
  {
    id: 'RP-2020-001',
    name: 'Maria Santos',
    room: '102',
    age: 72,
    gender: 'Female',
    careNeeds: ['hygiene', 'mobility', 'meal', 'recreation'],
    emergencyContact: { name: 'Ana Santos', relationship: 'Daughter', phone: '0919 775 2779' },
  },
  {
    id: 'RP-2022-018',
    name: 'Juan Cruz',
    room: '104',
    age: 80,
    gender: 'Male',
    careNeeds: ['meal', 'medical'],
    emergencyContact: { name: 'Pedro Cruz', relationship: 'Son', phone: '0918 234 5678' },
  },
  {
    id: 'RP-2019-003',
    name: 'Remedios Garcia',
    room: '106',
    age: 85,
    gender: 'Female',
    careNeeds: ['rest', 'meal', 'recreation'],
    emergencyContact: { name: 'Liza Garcia', relationship: 'Niece', phone: '0927 345 6789' },
  },
  {
    id: 'RP-2020-010',
    name: 'Andres Reyes',
    room: '108',
    age: 77,
    gender: 'Male',
    careNeeds: ['mobility', 'rest'],
    emergencyContact: { name: 'Carmen Reyes', relationship: 'Wife', phone: '0915 456 7890' },
  },
];

// ---------------------------------------------------------------------
//  PREVIEW ONLY: shown by useApiData when `npm run dev` can't reach the
//  backend. Same shape as GET /api/tasks and GET /api/handovers.
//  These are functions so the times are always around "now".
// ---------------------------------------------------------------------
const taskStatus = (t) => (t.done ? 'done' : new Date(t.dueAt) < new Date() ? 'overdue' : 'pending');

export const sampleTasks = () =>
  [
    { id: 101, task: 'Sponge Bath', resident: 'Maria Santos', dueAt: hoursFromNow(-3), done: true, doneAt: hoursFromNow(-2.8) },
    { id: 102, task: 'Morning Walk', resident: 'Maria Santos', dueAt: hoursFromNow(-1), done: false },
    { id: 103, task: 'Medication: Blood Pressure Pill', resident: 'Juan Cruz', dueAt: hoursFromNow(-0.5), done: true, doneAt: hoursFromNow(-0.4) },
    { id: 104, task: 'Lunch Feeding', resident: 'Juan Cruz', dueAt: hoursFromNow(0.75), done: false },
    { id: 105, task: 'Post-Lunch Nap', resident: 'Remedios Garcia', dueAt: hoursFromNow(1.5), done: false },
    { id: 106, task: 'Family Video Call', resident: 'Remedios Garcia', dueAt: hoursFromNow(2.5), done: false },
  ].map((t) => ({ ...t, _id: t.id, status: taskStatus(t) }));

export const sampleHandovers = () => [
  {
    _id: 201,
    id: 201,
    shift: 'Night',
    notes: 'Maria slept later than usual and ate a light dinner. Please watch her closely today. Hallway light near Room 106 is flickering.',
    createdAt: minutesAgo(600),
    author: { _id: 901, name: 'Rosa Lim', role: 'caregiver' },
    acknowledgedBy: null,
    acknowledgedAt: null,
  },
  {
    _id: 200,
    id: 200,
    shift: 'Afternoon',
    notes: 'All tasks done. Juan had a good appetite at dinner.',
    createdAt: minutesAgo(1080),
    author: { _id: 902, name: 'Mark Dela Cruz', role: 'caregiver' },
    acknowledgedBy: { _id: 903, name: 'Rosa Lim' },
    acknowledgedAt: minutesAgo(1000),
  },
];

// type: task | overdue | handover | schedule | message
export const sampleNotifications = [
  { id: 1, type: 'task', title: 'Lunch Feeding starts in 30 minutes', body: 'Juan Cruz · Room 104', time: minutesAgo(2), read: false, link: '/tasks' },
  { id: 2, type: 'overdue', title: 'Morning Walk is overdue', body: 'Maria Santos · was due 9:30 AM', time: minutesAgo(12), read: false, link: '/tasks' },
  { id: 3, type: 'message', title: 'Admin replied to your message', body: '"Yes, the supply order is coming tomorrow."', time: minutesAgo(180), read: true, link: '/messages' },
  { id: 4, type: 'handover', title: 'New handover from Night shift', body: '1 resident to watch closely', time: minutesAgo(480), read: false, link: '/handover' },
  { id: 5, type: 'schedule', title: 'Your Saturday shift changed', body: `Now Noon · ${shiftTime(getShift('noon'))}`, time: minutesAgo(1500), read: true, link: '/schedule' },
];
