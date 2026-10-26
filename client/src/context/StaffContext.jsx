import { createContext, useContext } from 'react';
import api from '../api';
import useApiData from '../hooks/useApiData';

const StaffContext = createContext(null);

const REFRESH = 60 * 1000; // new sign-ups show up within a minute

// Every account (admins only), shared by the sidebar badge ("2 waiting for approval")
// and the Manage Staff page, so approving someone updates both at once.
// Each action saves to the backend, then puts the saved account in the list.
export function StaffProvider({ children }) {
  const query = useApiData('/users', { refreshEvery: REFRESH });
  const staff = query.data ?? [];

  const put = (saved) =>
    query.setData((list) => (list.some((u) => u.id === saved.id) ? list.map((u) => (u.id === saved.id ? saved : u)) : [...list, saved]));

  // { firstName, lastName, username, password, role, email, phone, assignedShift, dateHired, title }
  const create = async (account) => {
    const { data } = await api.post('/users', account);
    put(data);
    return data;
  };

  // { assignedShift, dateHired, title, role }
  const update = async (id, changes) => {
    const { data } = await api.patch(`/users/${id}`, changes);
    put(data);
    return data;
  };

  // 'active' (approve / reactivate) | 'inactive' (deactivate / decline)
  const setStatus = async (id, status) => {
    const { data } = await api.patch(`/users/${id}/status`, { status });
    put(data);
    return data;
  };

  // Resolves to the temporary password to give to the person
  const resetPassword = async (id) => (await api.post(`/users/${id}/reset-password`)).data.temporaryPassword;

  return (
    <StaffContext.Provider
      value={{
        ...query,
        staff,
        pendingCount: staff.filter((u) => u.status === 'pending').length,
        create,
        update,
        setStatus,
        resetPassword,
      }}
    >
      {children}
    </StaffContext.Provider>
  );
}

// null for caregivers (the list is only loaded for administrators)
export const useStaff = () => useContext(StaffContext);
