import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  House, ClipboardList, CalendarDays, UserRound, FileText, Users,
  Bell, Mail, LogOut, UserPen, Camera, X, IdCard,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useHandovers } from '../context/HandoverContext';
import { useProfile } from '../context/ProfileContext';
import { useMessages } from '../context/MessagesContext';
import { SHIFTS } from '../constants';
import usePopover from '../hooks/usePopover';
import Avatar from './Avatar';
import Logo from './Logo';
import markWhite from '../assets/images/agapay-mark-white.svg';

// Menu groups. Same on every caregiver page.
const NAV_GROUPS = [
  {
    title: 'Today',
    items: [
      { to: '/dashboard', label: 'Home', icon: House },
      { to: '/tasks', label: 'My Tasks', icon: ClipboardList },
      { to: '/schedule', label: 'My Schedule', icon: CalendarDays },
    ],
  },
  {
    title: 'Care',
    items: [
      { to: '/residents', label: 'My Residents', icon: UserRound },
      { to: '/handover', label: 'Handover', icon: FileText },
    ],
  },
];

// One menu link. When the sidebar is collapsed, only the icon shows and the label
// becomes a tooltip; a badge turns into a small dot.
function SideLink({ to, label, icon: Icon, badge, badgeLabel, tone, onClick }) {
  return (
    <NavLink to={to} className="sidebar__link" onClick={onClick} aria-label={badge ? `${label}, ${badgeLabel}` : label}>
      <Icon size={18} aria-hidden="true" />
      <span className="sidebar__label" aria-hidden="true">{label}</span>
      {badge && <span className={`count-badge ${tone === 'new' ? 'count-badge--new' : ''}`} aria-hidden="true">{badge}</span>}
    </NavLink>
  );
}

// Left navigation shared by every page inside the app.
// `collapsed` (laptops only): a narrow rail with icons; ☰ in the top bar switches it.
export default function Sidebar({ collapsed, onClose }) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { unreadCount } = useNotifications();
  const { unreadCount: unreadMessages } = useMessages();
  const { handovers } = useHandovers();
  const { profile, openPhoto, openEditProfile } = useProfile();
  const { ref: menuRef, ...menu } = usePopover();

  // Handovers from others that I haven't marked as read yet
  const newHandovers = handovers.filter((h) => h.author?._id !== profile.id && !h.readByMe).length;
  const badges = { '/handover': newHandovers > 0 ? { text: `${newHandovers} new`, label: `${newHandovers} new`, tone: 'new' } : null };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleLabel = profile.role === 'admin' ? 'Administrator' : 'Caregiver';
  const shiftLabel = SHIFTS.find((s) => s.apiValue === profile.shift)?.label;
  const closeMenu = () => menu.setOpen(false);

  return (
    <aside className={`sidebar ${collapsed ? 'is-rail' : ''}`} aria-label="Main menu">
      <div className="sidebar__top">
        <Link to="/dashboard" className="sidebar__logo" onClick={onClose} aria-label="AGAPAY home">
          {collapsed ? <img src={markWhite} alt="" className="sidebar__mark" /> : <Logo tone="white" height={32} />}
        </Link>
        <button type="button" className="icon-btn sidebar__close" onClick={onClose} aria-label="Close menu">
          <X size={20} />
        </button>
      </div>

      {/* Profile card: opens a small menu (edit profile, photo, view profile, sign out) */}
      <div className="sidebar__menu" ref={menuRef}>
        <button
          type="button"
          className="sidebar__profile"
          onClick={menu.toggle}
          aria-expanded={menu.open}
          aria-haspopup="menu"
          aria-label={`${profile.name}, ${roleLabel}. Open profile menu`}
        >
          <Avatar name={profile.name} photo={profile.photo} size={collapsed ? 36 : 40} />
          <span className="sidebar__who" aria-hidden="true">
            <strong>{profile.name}</strong>
            <small>{roleLabel}{shiftLabel && ` · ${shiftLabel}`}</small>
          </span>
        </button>

        {menu.open && (
          <div className="popover sidebar__dropdown" role="menu">
            <button type="button" className="popover__item" role="menuitem" onClick={() => { closeMenu(); openEditProfile(); }}>
              <UserPen size={18} /> Edit profile
            </button>
            <button type="button" className="popover__item" role="menuitem" onClick={() => { closeMenu(); openPhoto(); }}>
              <Camera size={18} /> Change photo
            </button>
            <Link to="/profile" className="popover__item" role="menuitem" onClick={() => { closeMenu(); onClose(); }}>
              <IdCard size={18} /> View my profile
            </Link>
            <button type="button" className="popover__item" role="menuitem" onClick={handleLogout}>
              <LogOut size={18} /> Sign out
            </button>
          </div>
        )}
      </div>

      <nav className="sidebar__nav">
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="sidebar__group">
            <p className="sidebar__group-title">{group.title}</p>
            {group.items.map((item) => (
              <SideLink
                key={item.to}
                {...item}
                badge={badges[item.to]?.text}
                badgeLabel={badges[item.to]?.label}
                tone={badges[item.to]?.tone}
                onClick={onClose}
              />
            ))}
          </div>
        ))}

        {/* Temporary until the Admin side is built */}
        {profile.role === 'admin' && (
          <div className="sidebar__group">
            <p className="sidebar__group-title">Admin</p>
            <SideLink to="/staff" label="Manage Staff" icon={Users} onClick={onClose} />
          </div>
        )}
      </nav>

      <div className="sidebar__bottom">
        <SideLink
          to="/messages"
          label="Messages"
          icon={Mail}
          badge={unreadMessages > 0 ? unreadMessages : null}
          badgeLabel={`${unreadMessages} unread`}
          onClick={onClose}
        />
        <SideLink
          to="/notifications"
          label="Notifications"
          icon={Bell}
          badge={unreadCount > 0 ? unreadCount : null}
          badgeLabel={`${unreadCount} unread`}
          onClick={onClose}
        />
        <button type="button" className="sidebar__link" onClick={handleLogout} aria-label="Sign out">
          <LogOut size={18} aria-hidden="true" />
          <span className="sidebar__label" aria-hidden="true">Sign out</span>
        </button>
      </div>
    </aside>
  );
}
