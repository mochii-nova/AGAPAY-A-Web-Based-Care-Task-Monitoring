import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCheck } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import NotificationIcon from '../components/NotificationIcon';
import CardHeader from '../components/CardHeader';
import PushToggle from '../components/PushToggle';
import { useNotifications } from '../context/NotificationContext';
import { timeAgo } from '../utils/format';

// Full-page version of the bell dropdown
export default function Notifications() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [filter, setFilter] = useState('all');

  const shown = filter === 'unread' ? notifications.filter((n) => !n.read) : notifications;

  return (
    <div>
      <PageHeader title="Notifications" subtitle="Task reminders, handovers, schedule changes and messages.">
        <button type="button" className="btn btn--soft" onClick={markAllRead} disabled={unreadCount === 0}>
          <CheckCheck size={18} /> Mark all as read
        </button>
      </PageHeader>

      <section className="card notif-settings">
        <CardHeader title="Pop-up notifications" />
        <PushToggle />
      </section>

      <div className="tabs" role="tablist">
        <button type="button" role="tab" aria-selected={filter === 'all'} className="tab" onClick={() => setFilter('all')}>
          All ({notifications.length})
        </button>
        <button type="button" role="tab" aria-selected={filter === 'unread'} className="tab" onClick={() => setFilter('unread')}>
          Unread ({unreadCount})
        </button>
      </div>

      <div className="card">
        {shown.length === 0 ? (
          <p className="empty-text">You're all caught up. No unread notifications.</p>
        ) : (
          <ul className="notif-list notif-list--page">
            {shown.map((n) => (
              <li key={n.id}>
                <Link to={n.link} className={`notif-item ${n.read ? '' : 'is-unread'}`} onClick={() => markRead(n.id)}>
                  <NotificationIcon type={n.type} />
                  <span className="notif-item__text">
                    <strong>{n.title}</strong>
                    <small>{n.body}</small>
                  </span>
                  <time dateTime={n.time} className="notif-item__time">{timeAgo(n.time)}</time>
                  {!n.read && <span className="unread-dot" aria-label="Unread" />}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
