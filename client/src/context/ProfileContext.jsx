import { createContext, useContext, useState } from 'react';
import api from '../api';
import { useAuth } from './AuthContext';
import PhotoModal from '../components/profile/PhotoModal';
import EditProfileModal from '../components/profile/EditProfileModal';
import '../styles/profile.css'; // the pop-ups can open on any page

const ProfileContext = createContext();

const capitalize = (word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : '');

// The signed-in user from the backend, in the shape the pages use.
// Shift, date hired, title and status are set by an administrator.
function buildProfile(user) {
  const firstName = user?.firstName ?? '';
  const lastName = user?.lastName ?? '';
  return {
    id: user?.id,
    role: user?.role ?? 'caregiver',
    employeeId: user?.employeeId ?? user?.username ?? '',
    firstName,
    lastName,
    name: user?.name ?? `${firstName} ${lastName}`.trim(),
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    emergencyContact: {
      name: user?.emergencyContact?.name ?? '',
      relationship: user?.emergencyContact?.relationship ?? '',
      phone: user?.emergencyContact?.phone ?? '',
    },
    photo: user?.photoUrl ?? null,
    shift: user?.assignedShift ?? null, // 'Morning' | 'Afternoon' | 'Night'
    dateHired: user?.dateHired ?? null,
    accountStatus: capitalize(user?.status ?? 'active'),
  };
}

// "data:image/jpeg;base64,..." -> a file the backend can receive
async function dataUrlToFile(dataUrl) {
  const blob = await (await fetch(dataUrl)).blob();
  return new File([blob], 'photo.jpg', { type: blob.type || 'image/jpeg' });
}

// The signed-in person's profile, shared by the sidebar, top bar and pages.
// Also owns the "Change photo" and "Edit profile" pop-ups so any page can open them.
export function ProfileProvider({ children }) {
  const { user, updateUser } = useAuth();
  // Separate, so the photo pop-up can open on top of Edit profile without losing your typing
  const [photoOpen, setPhotoOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const profile = buildProfile(user);

  // Saves name, email, phone and emergency contact. Throws with the backend's reason.
  const updateProfile = async (changes) => {
    const { data } = await api.patch('/users/me', changes);
    updateUser(data);
  };

  // A square photo as a data URL, or null to go back to initials. Throws with the backend's reason.
  const updatePhoto = async (photo) => {
    if (photo) {
      const form = new FormData();
      form.append('photo', await dataUrlToFile(photo));
      const { data } = await api.post('/users/me/photo', form);
      updateUser({ ...user, photoUrl: data.photoUrl });
    } else {
      await api.delete('/users/me/photo');
      updateUser({ ...user, photoUrl: null });
    }
  };

  return (
    <ProfileContext.Provider
      value={{ profile, updateProfile, updatePhoto, openPhoto: () => setPhotoOpen(true), openEditProfile: () => setEditOpen(true) }}
    >
      {children}
      <EditProfileModal open={editOpen} onClose={() => setEditOpen(false)} />
      <PhotoModal open={photoOpen} onClose={() => setPhotoOpen(false)} />
    </ProfileContext.Provider>
  );
}

export const useProfile = () => useContext(ProfileContext);
