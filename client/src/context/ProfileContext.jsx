import { createContext, useContext, useState } from 'react';
import { useAuth } from './AuthContext';
import { sampleProfile } from '../data/sample';
import { readProfile, writeProfile } from '../data/profileStore';
import PhotoModal from '../components/profile/PhotoModal';
import EditProfileModal from '../components/profile/EditProfileModal';
import '../styles/profile.css'; // the pop-ups can open on any page

const ProfileContext = createContext();

// Combines the logged-in user (real), details saved in this browser, and sample admin details
function buildProfile(user, saved) {
  const [registeredFirst = '', ...rest] = (user?.name ?? sampleProfile.name).split(' ');
  const firstName = saved.firstName ?? registeredFirst;
  const lastName = saved.lastName ?? rest.join(' ');
  return {
    // From the backend
    id: user?.id,
    role: user?.role ?? 'caregiver',
    registeredName: user?.name ?? sampleProfile.name,
    employeeId: user?.username ?? sampleProfile.employeeId,
    // Saved in this browser (falls back to sample values)
    firstName,
    lastName,
    name: `${firstName} ${lastName}`.trim(),
    email: saved.email ?? sampleProfile.email,
    phone: saved.phone ?? sampleProfile.phone,
    emergencyContact: saved.emergencyContact ?? sampleProfile.emergencyContact,
    photo: saved.photo ?? null,
    // Set by the administrator (sample until the backend has them)
    shift: sampleProfile.shift,
    dateHired: sampleProfile.dateHired,
    accountStatus: sampleProfile.accountStatus,
  };
}

// The signed-in person's profile, shared by the sidebar, top bar and pages.
// Also owns the "Change photo" and "Edit profile" pop-ups so any page can open them.
export function ProfileProvider({ children }) {
  const { user } = useAuth();
  const [saved, setSaved] = useState(() => readProfile(user?.id));
  // Separate, so the photo pop-up can open on top of Edit profile without losing your typing
  const [photoOpen, setPhotoOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const profile = buildProfile(user, saved);

  // Returns false if the browser couldn't store it
  const updateProfile = (changes) => {
    const next = { ...saved, ...changes };
    if (!writeProfile(user?.id, next)) return false;
    setSaved(next);
    return true;
  };

  return (
    <ProfileContext.Provider
      value={{ profile, updateProfile, openPhoto: () => setPhotoOpen(true), openEditProfile: () => setEditOpen(true) }}
    >
      {children}
      <EditProfileModal open={editOpen} onClose={() => setEditOpen(false)} />
      <PhotoModal open={photoOpen} onClose={() => setPhotoOpen(false)} />
    </ProfileContext.Provider>
  );
}

export const useProfile = () => useContext(ProfileContext);
