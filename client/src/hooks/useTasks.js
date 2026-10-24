import { useMemo, useState } from 'react';
import api from '../api';
import useApiData from './useApiData';
import { sampleTasks } from '../data/sample';
import { normalizeTasks } from '../utils/tasks';
import { readExtras, writeExtras, mergeExtras } from '../data/taskExtras';

// All tasks from the backend, with skip reasons and notes added (see data/taskExtras.js).
// Used by the Dashboard, My Tasks, My Schedule and Handover so they always agree.
export default function useTasks() {
  const query = useApiData('/tasks', { sample: sampleTasks, transform: normalizeTasks });
  const [extras, setExtras] = useState(readExtras);

  const tasks = useMemo(
    () => (query.data ?? []).map((t) => mergeExtras(t, extras[t._id])),
    [query.data, extras]
  );

  // Save (or with null, remove) the extra details for one task
  const saveExtra = (taskId, value) => {
    setExtras((prev) => {
      const next = { ...prev };
      if (value) next[taskId] = value;
      else delete next[taskId];
      writeExtras(next);
      return next;
    });
  };

  // What the task pop-up calls when you press Save.
  // "Completed" goes to the backend; skip reasons and notes stay in this browser for now.
  const updateTask = async (task, { status, reason, note }) => {
    if (status === 'completed' && task.status !== 'completed') {
      await api.patch(`/tasks/${task._id}/done`);
      query.reload({ silent: true });
    }
    saveExtra(task._id, status === 'skipped' ? { skipped: true, reason, note } : note ? { note } : null);
  };

  return { ...query, tasks, updateTask };
}
