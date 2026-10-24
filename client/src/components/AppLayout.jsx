import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { HandoverProvider } from '../context/HandoverContext';
import { ProfileProvider } from '../context/ProfileContext';
import { PushProvider } from '../context/PushContext';
import { MessagesProvider } from '../context/MessagesContext';

const isSmallScreen = () => window.matchMedia('(max-width: 900px)').matches;

// Frame around every logged-in page: sidebar on the left, top bar, then the page itself
export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false); // big screens: hide the sidebar
  const [mobileOpen, setMobileOpen] = useState(false); // small screens: slide the sidebar in

  const toggleMenu = () => (isSmallScreen() ? setMobileOpen((o) => !o) : setCollapsed((c) => !c));
  const closeMobile = () => setMobileOpen(false);

  return (
    <ProfileProvider>
      <HandoverProvider>
        <PushProvider>
          <MessagesProvider>
            <div className={`app-layout ${collapsed ? 'is-collapsed' : ''} ${mobileOpen ? 'is-mobile-open' : ''}`}>
              <Sidebar onClose={closeMobile} />
              {mobileOpen && <div className="sidebar-backdrop" onClick={closeMobile} aria-hidden="true" />}

              <div className="app-body">
                <Navbar onMenuClick={toggleMenu} />
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
