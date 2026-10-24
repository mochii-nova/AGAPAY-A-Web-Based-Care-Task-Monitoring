import { Link, useNavigate } from 'react-router-dom';
import { Menu, Bell, Mail, LogOut, Maximize2, CheckCheck, IdCard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { getProfile } from '../data/sample';
import { timeAgo } from '../utils/format';
import usePopover from '../hooks/usePopover';
import Avatar from './Avatar';
import NotificationIcon from './NotificationIcon';

// Lavender top bar: menu button, notifications, messages and the small profile menu
export default function Navbar({ onMenuClick }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const profile = getProfile(user);
  const { ref: bellRef, ...bell } = usePopover();
  const { ref: accountRef, ...account } = usePopover();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="topbar">
      <button type="button" className="icon-btn" onClick={onMenuClick} aria-label="Show or hide menu">
        <Menu size={24} />
      </button>

      <div className="topbar__actions">
        {/* Notifications */}
        <div className="popover-anchor" ref={bellRef}>
          <button
            type="button"
            className="icon-btn"
            onClick={bell.toggle}
            aria-expanded={bell.open}
            aria-label={`Notifications, ${unreadCount} unread`}
          >
            <Bell size={22} />
            {unreadCount > 0 && <span className="dot-badge" aria-hidden="true" />}
          </button>

          {bell.open && (
            <div className="popover notif-popover">
              <div className="popover__header">
                <strong>Notifications</strong>
                <div className="popover__header-actions">
                  {unreadCount > 0 && (
                    <button type="button" className="text-btn" onClick={markAllRead}>
                      <CheckCheck size={16} /> Mark all read
                    </button>
                  )}
                  <Link to="/notifications" className="icon-btn icon-btn--sm" onClick={() => bell.setOpen(false)} aria-label="Open full notifications page">
                    <Maximize2 size={16} />
                  </Link>
                </div>
              </div>

              <ul className="notif-list">
                {notifications.slice(0, 5).map((n) => (
                  <li key={n.id}>
                    <Link
                      to={n.link}
                      className={`notif-item ${n.read ? '' : 'is-unread'}`}
                      onClick={() => { markRead(n.id); bell.setOpen(false); }}
                    >
                      <NotificationIcon type={n.type} />
                      <span className="notif-item__text">
                        <strong>{n.title}</strong>
                        <small>{n.body}</small>
                        <time dateTime={n.time}>{timeAgo(n.time)}</time>
                      </span>
                      {!n.read && <span className="unread-dot" aria-label="Unread" />}
                    </Link>
                  </li>
                ))}
              </ul>

              <Link to="/notifications" className="popover__footer" onClick={() => bell.setOpen(false)}>
                View all notifications
              </Link>
            </div>
          )}
        </div>

        {/* Messages to the admin (built in Phase 9) */}
        <Link to="/messages" className="icon-btn" aria-label="Messages">
          <Mail size={22} />
        </Link>

        {/* Small account menu */}
        <div className="popover-anchor" ref={accountRef}>
          <button
            type="button"
            className="icon-btn topbar__avatar"
            onClick={account.toggle}
            aria-expanded={account.open}
            aria-label="Account menu"
          >
            <Avatar name={profile.name} photo={profile.photo} size={36} />
          </button>

          {account.open && (
            <div className="popover account-popover">
              <div className="account-popover__head">
                <Avatar name={profile.name} photo={profile.photo} size={44} />
                <div>
                  <strong>{profile.name}</strong>
                  <small>{profile.email}</small>
                </div>
              </div>
              <p className="account-popover__id">
                <IdCard size={16} aria-hidden="true" /> Employee ID: <strong>{profile.employeeId}</strong>
              </p>
              <button type="button" className="popover__item popover__item--danger" onClick={handleLogout}>
                <LogOut size={18} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
