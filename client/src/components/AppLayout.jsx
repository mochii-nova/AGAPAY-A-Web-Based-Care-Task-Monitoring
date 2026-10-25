import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import useMediaQuery from '../hooks/useMediaQuery';
import { HandoverProvider } from '../context/HandoverContext';
import { ProfileProvider } from '../context/ProfileContext';
import { PushProvider } from '../context/PushContext';
import { MessagesProvider } from '../context/MessagesContext';

const RAIL_KEY = 'agapay.sidebar';

// Remembers whether the sidebar was collapsed to the icon rail (only a convenience)
const readRail = () => {
  try {
    return localStorage.getItem(RAIL_KEY) === 'rail';
  } catch {
    return false;
  }
};
const saveRail = (rail) => {
  try {
    if (rail) localStorage.setItem(RAIL_KEY, 'rail');
    else localStorage.removeItem(RAIL_KEY);
  } catch {
    // Fine to forget
  }
};

// Frame around every logged-in page: sidebar on the left, top bar, then the page itself
export default function AppLayout() {
  const small = useMediaQuery('(max-width: 900px)');
  const [collapsed, setCollapsed] = useState(readRail); // laptops: icon rail instead of the full sidebar
  const [mobileOpen, setMobileOpen] = useState(false); // tablets and phones: slide the sidebar in

  const toggleMenu = () => {
    if (small) return setMobileOpen((o) => !o);
    setCollapsed((c) => {
      saveRail(!c);
      return !c;
    });
  };
  const closeMobile = () => setMobileOpen(false);
  const rail = collapsed && !small; // the slide-in drawer always shows the full menu

  return (
    <ProfileProvider>
      <HandoverProvider>
        <PushProvider>
          <MessagesProvider>
            <div className={`app-layout ${rail ? 'is-collapsed' : ''} ${mobileOpen ? 'is-mobile-open' : ''}`}>
              <Sidebar collapsed={rail} onClose={closeMobile} />
              {mobileOpen && <div className="sidebar-backdrop" onClick={closeMobile} aria-hidden="true" />}

              <div className="app-body">
                <Navbar onMenuClick={toggleMenu} menuExpanded={small ? mobileOpen : !rail} />
                <main className="app-main">
                  <Outlet />
                </main>
              </div>
            </div>
          </MessagesProvider>
        </PushProvider>
      </HandoverProvider>
    </ProfileProvider>
  );
}
