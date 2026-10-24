import { useMemo, useState } from 'react';
import useApiData from './useApiData';
import { sampleTasks } from '../data/sample';
import { normalizeTasks } from '../utils/tasks';
import { readExtras, writeExtras, mergeExtras } from '../data/taskExtras';

// All tasks from the backend, with skip reasons and notes added (see data/taskExtras.js).
// Used by the Dashboard, My Tasks and (later) Handover so they always agree.
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

  return { ...query, tasks, saveExtra };
}
