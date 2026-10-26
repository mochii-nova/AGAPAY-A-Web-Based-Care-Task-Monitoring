import { createContext, useContext, useMemo } from 'react';
import api from '../api';
import useApiData from '../hooks/useApiData';
import { useAuth } from './AuthContext';
import { parseHandover, parseHandovers } from '../utils/handover';

const HandoverContext = createContext();

// One shared list of submitted handovers for the sidebar badge, Dashboard, Residents and
// Handover pages, so "Mark as read" or a new handover updates everywhere at once.
export function HandoverProvider({ children }) {
  const { user } = useAuth();
  const myId = user?.id;
  const transform = useMemo(() => (list) => parseHandovers(list, myId), [myId]);
  const query = useApiData('/handovers', { transform });

  // Adds my read receipt; the answer is the updated handover
  const acknowledge = async (id) => {
    const { data } = await api.patch(`/handovers/${id}/acknowledge`);
    const updated = parseHandover(data, myId);
    query.setData((list) => list.map((h) => (h._id === updated._id ? updated : h)));
  };

  // payload: { shift, shiftDate, summary, residents: [{ residentId, status, note }],
  //            tasks: [{ taskId, note }], otherNotes }. My saved draft becomes this handover.
  const submit = async (payload) => {
    const { data } = await api.post('/handovers', payload);
    query.reload({ silent: true });
    return data;
  };

  // My unfinished handover, saved in the database (same body as submit). One per caregiver.
  const saveDraft = async (payload) => (await api.put('/handovers/draft', payload)).data;

  return (
    <HandoverContext.Provider value={{ ...query, handovers: query.data ?? [], acknowledge, submit, saveDraft }}>
      {children}
    </HandoverContext.Provider>
  );
}

export const useHandovers = () => useContext(HandoverContext);
