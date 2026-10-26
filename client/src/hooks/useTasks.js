import api from '../api';
import useApiData from './useApiData';
import { normalizeTask, normalizeTasks } from '../utils/tasks';

// The tasks assigned to me, from the backend.
// Used by the Dashboard, My Tasks, My Schedule and Handover so they always agree.
export default function useTasks() {
  const query = useApiData('/tasks?mine=1', { transform: normalizeTasks });

  // What the task pop-up calls when you press Save: complete, skip (with a reason),
  // undo (back to pending) and the note. Only what changed is sent.
  const updateTask = async (task, { status, reason, note }) => {
    const current = task.status === 'overdue' ? 'pending' : task.status;
    const body = {};
    if (status !== current || (status === 'skipped' && reason !== (task.skipReason ?? ''))) {
      body.status = status;
      if (status === 'skipped') body.reason = reason;
    }
    if (note !== (task.note ?? '')) body.note = note;
    if (Object.keys(body).length === 0) return;

    const { data } = await api.patch(`/tasks/${task._id}`, body);
    const saved = normalizeTask(data);
    query.setData((list) => list.map((t) => (t._id === saved._id ? saved : t)));
  };

  return { ...query, tasks: query.data ?? [], updateTask };
}
