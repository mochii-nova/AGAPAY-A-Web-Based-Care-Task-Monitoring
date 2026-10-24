import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardList, CalendarDays, Users, FileText,
  Bell, Mail, LogOut, ChevronDown, UserPen, Camera, X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { getProfile } from '../data/sample';
import usePopover from '../hooks/usePopover';
import ImageSlot from './ImageSlot';
import Avatar from './Avatar';
import { images } from '../assets/images';

// Menu groups. Same on every caregiver page.
const NAV_GROUPS = [
  { items: [{ to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }] },
  {
    title: 'Daily workflow',
    items: [
      { to: '/tasks', label: 'My Tasks', icon: ClipboardList },
      { to: '/schedule', label: 'My Schedule', icon: CalendarDays },
    ],
  },
  {
    title: 'Care & handover',
    items: [
      { to: '/residents', label: 'My Residents', icon: Users },
      { to: '/handover', label: 'Handover', icon: FileText },
    ],
  },
];

// Left navigation shared by every page inside the app
export default function Sidebar({ onClose }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const profile = getProfile(user);
  const { ref: menuRef, ...menu } = usePopover();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleLabel = profile.role === 'admin' ? 'Administrator' : 'Caregiver';

  return (
    <aside className="sidebar" aria-label="Main menu">
      <div className="sidebar__top">
        <Link to="/dashboard" className="sidebar__logo" onClick={onClose}>
          <ImageSlot image={images.logoWhite} alt="AGAPAY" style={{ width: 150, height: 44 }} />
        </Link>
        <button type="button" className="icon-btn sidebar__close" onClick={onClose} aria-label="Close menu">
          <X size={22} />
        </button>
      </div>

      <div className="sidebar__profile">
        {/* Phase 8: this opens the photo upload */}
        <Link to="/profile" className="sidebar__avatar-btn" onClick={onClose} aria-label="Change profile photo">
          <Avatar name={profile.name} photo={profile.photo} size={84} />
          <span className="sidebar__avatar-edit" aria-hidden="true"><Camera size={14} /></span>
        </Link>

        <div className="sidebar__menu" ref={menuRef}>
          <button
            type="button"
            className="sidebar__name-btn"
            onClick={menu.toggle}
            aria-expanded={menu.open}
            aria-haspopup="menu"
          >
            <span>
              <strong>{profile.name}</strong>
              <small>{roleLabel}</small>
            </span>
            <ChevronDown size={18} className={menu.open ? 'is-flipped' : ''} />
          </button>

          {menu.open && (
            <div className="popover sidebar__dropdown" role="menu">
              {/* Phase 8: this opens the Edit Profile form */}
              <Link to="/profile" className="popover__item" role="menuitem" onClick={onClose}>
                <UserPen size={18} /> Edit profile
              </Link>
              <button type="button" className="popover__item" role="menuitem" onClick={handleLogout}>
                <LogOut size={18} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      <nav className="sidebar__nav">
        {NAV_GROUPS.map((group, i) => (
          <div key={i} className="sidebar__group">
            {group.title && <p className="sidebar__group-title">{group.title}</p>}
            {group.items.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className="sidebar__link" onClick={onClose}>
                <Icon size={20} aria-hidden="true" /> {label}
              </NavLink>
            ))}
          </div>
        ))}

        {/* Temporary until the Admin side is built */}
        {profile.role === 'admin' && (
          <div className="sidebar__group">
            <p className="sidebar__group-title">Admin</p>
            <NavLink to="/staff" className="sidebar__link" onClick={onClose}>
              <Users size={20} aria-hidden="true" /> Manage Staff
            </NavLink>
          </div>
        )}
      </nav>

      <div className="sidebar__bottom">
        <NavLink to="/notifications" className="sidebar__link" onClick={onClose}>
          <Bell size={20} aria-hidden="true" /> Notifications
          {unreadCount > 0 && <span className="count-badge">{unreadCount}</span>}
        </NavLink>
        <NavLink to="/messages" className="sidebar__link" onClick={onClose}>
          <Mail size={20} aria-hidden="true" /> Messages
        </NavLink>
        <button type="button" className="sidebar__link" onClick={handleLogout}>
          <LogOut size={20} aria-hidden="true" /> Sign out
        </button>
      </div>
    </aside>
  );
}
