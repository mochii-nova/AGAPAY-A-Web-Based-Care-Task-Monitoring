import useApiData from './useApiData';
import { normalizeTasks } from '../utils/tasks';

// Every open overdue task, on any day (the backend's status=overdue: still pending and past its time),
// oldest first. The admin dashboard and Tasks & Care both use this, so their "Overdue" numbers agree.
const byDue = (list) => normalizeTasks(list).sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));

export default function useOverdueTasks() {
  const query = useApiData('/tasks?status=overdue', { transform: byDue, live: true });
  return { ...query, overdue: query.data ?? [] };
}
