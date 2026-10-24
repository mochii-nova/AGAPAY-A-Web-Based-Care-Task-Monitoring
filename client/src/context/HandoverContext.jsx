import { createContext, useContext } from 'react';
import api from '../api';
import useApiData from '../hooks/useApiData';
import { sampleHandovers } from '../data/sample';
import { parseHandovers } from '../utils/handover';

const HandoverContext = createContext();

// One shared list of handovers for the sidebar badge, Dashboard, Residents and Handover pages,
// so "Mark as Read" or a new handover updates everywhere at once.
export function HandoverProvider({ children }) {
  const query = useApiData('/handovers', { sample: sampleHandovers, transform: parseHandovers });

  const acknowledge = async (id) => {
    await api.patch(`/handovers/${id}/acknowledge`);
    query.reload({ silent: true });
  };

  // payload: { shift: 'Morning' | 'Afternoon' | 'Night', notes }
  const submit = async (payload) => {
    const { data } = await api.post('/handovers', payload);
    query.reload({ silent: true });
    return data;
  };

  return (
    <HandoverContext.Provider value={{ ...query, handovers: query.data ?? [], acknowledge, submit }}>
      {children}
    </HandoverContext.Provider>
  );
}

export const useHandovers = () => useContext(HandoverContext);
