import { useCallback } from 'react';
import useApiData from './useApiData';
import { SHIFTS } from '../constants';

// 2026-10-27 for a date, in this computer's time zone (the backend's shift dates are Philippine dates)
export const isoDay = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// My shifts between two dates, from the roster the administrator set.
// shiftOn(date) gives that day's shift (from constants.js) or null for a day off.
export default function useShifts(from, to) {
  const query = useApiData(`/shifts?from=${isoDay(from)}&to=${isoDay(to)}`);
  const list = query.data;

  const shiftOn = useCallback(
    (date) => {
      const entry = list?.find((s) => s.shiftDate === isoDay(date));
      return SHIFTS.find((s) => s.apiValue === entry?.shift) ?? null;
    },
    [list]
  );

  return { ...query, shiftOn };
}
