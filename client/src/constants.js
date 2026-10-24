import { Bath, Footprints, Utensils, BedDouble, Stethoscope, Gamepad2 } from 'lucide-react';

// The 6 task categories. Used for task icons, resident care needs and the "All" filter dropdowns.
export const TASK_CATEGORIES = [
  { id: 'hygiene', label: 'Personal Hygiene', examples: 'Bath, brushing teeth, hair care', icon: Bath },
  { id: 'mobility', label: 'Mobility Assistance', examples: 'Exercise, walking, transferring rooms', icon: Footprints },
  { id: 'meal', label: 'Meal Assistance', examples: 'Eating, drinking', icon: Utensils },
  { id: 'rest', label: 'Rest & Sleep', examples: 'Nap, sleep preparation', icon: BedDouble },
  { id: 'medical', label: 'Medical Care', examples: 'Vitals, wound check, pills', icon: Stethoscope },
  { id: 'recreation', label: 'Recreation', examples: 'Leisure, social activities, crafts', icon: Gamepad2 },
];

export const getCategory = (id) => TASK_CATEGORIES.find((c) => c.id === id);

// Shift names and times. Change a time here and every page updates.
// `label` is what people see; `apiValue` is what the backend stores.
export const SHIFTS = [
  { id: 'morning', label: 'Morning', apiValue: 'Morning', start: '6:00 AM', end: '2:00 PM' },
  { id: 'noon', label: 'Noon', apiValue: 'Afternoon', start: '2:00 PM', end: '10:00 PM' },
  { id: 'night', label: 'Night', apiValue: 'Night', start: '10:00 PM', end: '6:00 AM' },
];

export const getShift = (id) => SHIFTS.find((s) => s.id === id);

// { start: '6:00 AM', end: '2:00 PM' } -> "6:00 AM – 2:00 PM"
export const shiftTime = (shift) => `${shift.start} – ${shift.end}`;

// "Afternoon" (from the backend) -> "Noon" (on screen)
export const shiftLabel = (apiValue) => SHIFTS.find((s) => s.apiValue === apiValue)?.label ?? apiValue;
