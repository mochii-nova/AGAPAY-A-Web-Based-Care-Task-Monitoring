import useApiData from './useApiData';
import { SHIFTS } from '../constants';

// Who works the shift right after mine, from GET /api/shifts/next (names only).
// `current`: { shift, shiftDate } from useShifts().currentShift(now), or null on a day off.
// Gives { shift, shiftDate, names } once the server answers, else null: also when the route
// doesn't exist yet or fails, so the "next caregiver" line just doesn't show (never an error).
// names = [] means the route works and nobody is scheduled.
export default function useNextShift(current) {
  const path = current ? `/shifts/next?shift=${current.shift.apiValue}&shiftDate=${current.shiftDate}` : null;
  const { data, status } = useApiData(path, { live: true });
  const shift = SHIFTS.find((s) => s.apiValue === data?.shift); // "Afternoon" -> Noon
  if (status !== 'ready' || !shift || !Array.isArray(data.staff)) return null;
  return { shift, shiftDate: data.shiftDate, names: data.staff.map((p) => p.name) };
}
