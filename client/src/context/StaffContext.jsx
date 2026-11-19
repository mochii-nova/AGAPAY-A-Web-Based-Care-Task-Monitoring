import { createContext, useContext } from 'react';
import api from '../api';
import useApiData from '../hooks/useApiData';

const StaffContext = createContext(null);


// Every account (admins only), shared by the sidebar badge ("2 waiting for approval")
// and the Manage Staff page, so approving someone updates both at once.
// Each action saves to the backend, then puts the saved account in the list.
export function StaffProvider({ children }) {
  const query = useApiData('/users', { live: true }); // new sign-ups show up within 15 s
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

  // 'active' (approve / reactivate) | 'inactive' (deactivate an approved account)
  // | 'rejected' (reject a pending sign-up; `reason` is required and the applicant sees it)
  const setStatus = async (id, status, reason) => {
    const { data } = await api.patch(`/users/${id}/status`, { status, reason });
    put(data);
    return data;
  };

  const remove = async (id) => {
    await api.delete(`/users/${id}`);
    query.setData((list) => list.filter((u) => u.id !== id));
    query.reload({ silent: true }); // and fetch the list again quietly, so it matches the server
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
        remove,
      }}
    >
      {children}
    </StaffContext.Provider>
  );
}

// null for caregivers (the list is only loaded for administrators)
export const useStaff = () => useContext(StaffContext);
