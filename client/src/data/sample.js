// =====================================================================
//  SAMPLE DATA — NOT FROM THE DATABASE
//
//  The backend does not have residents, shifts, notifications, messages
//  or extra profile details yet. Pages read from this file until Aeron
//  adds those routes (see the backend request list). When a route exists,
//  replace the matching export here with an api.get(...) call.
// =====================================================================

import { getShift, shiftTime } from '../constants';

const minutesAgo =(n) => new Date(Date.now() - n * 60000).toISOString();

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

// type: task | overdue | handover | schedule | message
export const sampleNotifications = [
  { id: 1, type: 'task', title: 'Lunch Feeding starts in 30 minutes', body: 'Juan Cruz · Room 104', time: minutesAgo(2), read: false, link: '/tasks' },
  { id: 2, type: 'overdue', title: 'Morning Walk is overdue', body: 'Maria Santos · was due 9:30 AM', time: minutesAgo(12), read: false, link: '/tasks' },
  { id: 3, type: 'message', title: 'Admin replied to your message', body: '"Yes, the supply order is coming tomorrow."', time: minutesAgo(180), read: true, link: '/messages' },
  { id: 4, type: 'handover', title: 'New handover from Night shift', body: '1 resident to watch closely', time: minutesAgo(480), read: false, link: '/handover' },
  { id: 5, type: 'schedule', title: 'Your Saturday shift changed', body: `Now Noon · ${shiftTime(getShift('noon'))}`, time: minutesAgo(1500), read: true, link: '/schedule' },
];
