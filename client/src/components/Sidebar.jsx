import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardList, CalendarDays, Users, FileText,
  Bell, Mail, LogOut, ChevronDown, UserPen, Camera, X, IdCard,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useHandovers } from '../context/HandoverContext';
import { useProfile } from '../context/ProfileContext';
import { useMessages } from '../context/MessagesContext';
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
  const { logout } = useAuth();
  const { unreadCount } = useNotifications();
  const { unreadCount: unreadMessages } = useMessages();
  const { handovers } = useHandovers();
  const { profile, openPhoto, openEditProfile } = useProfile();
  const { ref: menuRef, ...menu } = usePopover();

  // Handovers from other caregivers that nobody has marked as read yet
  const newHandovers = handovers.filter((h) => h.author?._id !== profile.id && !h.acknowledgedBy).length;
  const badges = { '/handover': newHandovers > 0 ? `${newHandovers} new` : null };

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
          <X size={20} />
        </button>
      </div>

      <div className="sidebar__profile">
        <button type="button" className="sidebar__avatar-btn" onClick={openPhoto} aria-label="Change profile photo">
          <Avatar name={profile.name} photo={profile.photo} size={72} />
          <span className="sidebar__avatar-edit" aria-hidden="true"><Camera size={14} /></span>
        </button>

        <div className="sidebar__menu" ref={menuRef}>
          {/* Name + arrow on one centred line, role underneath; the whole area opens the menu */}
          <button
            type="button"
            className="sidebar__name-btn"
            onClick={menu.toggle}
            aria-expanded={menu.open}
            aria-haspopup="menu"
          >
            <span className="sidebar__name-row">
              <strong>{profile.name}</strong>
              <ChevronDown size={16} aria-hidden="true" className={menu.open ? 'is-flipped' : ''} />
            </span>
            <small>{roleLabel}</small>
          </button>

          {menu.open && (
            <div className="popover sidebar__dropdown" role="menu">
              <button type="button" className="popover__item" role="menuitem" onClick={() => { menu.setOpen(false); openEditProfile(); }}>
                <UserPen size={18} /> Edit profile
              </button>
              <Link to="/profile" className="popover__item" role="menuitem" onClick={() => { menu.setOpen(false); onClose(); }}>
                <IdCard size={18} /> View my profile
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
                <Icon size={18} aria-hidden="true" /> {label}
                {badges[to] && <span className="count-badge">{badges[to]}</span>}
              </NavLink>
            ))}
          </div>
        ))}

        {/* Temporary until the Admin side is built */}
        {profile.role === 'admin' && (
          <div className="sidebar__group">
            <p className="sidebar__group-title">Admin</p>
            <NavLink to="/staff" className="sidebar__link" onClick={onClose}>
              <Users size={18} aria-hidden="true" /> Manage Staff
            </NavLink>
          </div>
        )}
      </nav>

      <div className="sidebar__bottom">
        <NavLink to="/notifications" className="sidebar__link" onClick={onClose}>
          <Bell size={18} aria-hidden="true" /> Notifications
          {unreadCount > 0 && <span className="count-badge">{unreadCount}</span>}
        </NavLink>
        <NavLink to="/messages" className="sidebar__link" onClick={onClose}>
          <Mail size={18} aria-hidden="true" /> Messages
          {unreadMessages > 0 && <span className="count-badge" aria-label={`${unreadMessages} unread`}>{unreadMessages}</span>}
        </NavLink>
        <button type="button" className="sidebar__link" onClick={handleLogout}>
          <LogOut size={18} aria-hidden="true" /> Sign out
        </button>
      </div>
    </aside>
  );
}
