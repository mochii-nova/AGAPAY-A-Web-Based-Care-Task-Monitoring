import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import NotificationIcon from '../components/NotificationIcon';
import PushToggle from '../components/PushToggle';
import { LoadingState, ErrorState } from '../components/StateMessage';
import { useNotifications } from '../context/NotificationContext';
import { timeAgo } from '../utils/format';

// Full-page version of the bell dropdown
export default function Notifications() {
  const { notifications, unreadCount, markRead, markAllRead, status, error, reload } = useNotifications();
  const [filter, setFilter] = useState('all');

  const shown = filter === 'unread' ? notifications.filter((n) => !n.read) : notifications;

  return (
    <div>
      <PageHeader title="Notifications" subtitle="Task reminders, handovers, schedule changes and messages.">
        <button type="button" className="btn btn--outline" onClick={markAllRead} disabled={unreadCount === 0}>
          <Check size={18} aria-hidden="true" /> Mark all as read
        </button>
      </PageHeader>

      <section className="card notif-settings" aria-label="Pop-up notifications">
        <PushToggle />
      </section>

      <div className="card notif-card">
        <div className="tabs tabs--flat notif-card__tabs" role="tablist">
          <button type="button" role="tab" aria-selected={filter === 'all'} className="tab" onClick={() => setFilter('all')}>
            All <span className="tab__count">{notifications.length}</span>
          </button>
          <button type="button" role="tab" aria-selected={filter === 'unread'} className="tab" onClick={() => setFilter('unread')}>
            Unread <span className="tab__count">{unreadCount}</span>
          </button>
        </div>

        {status === 'loading' ? (
          <LoadingState label="Loading notifications…" />
        ) : status === 'error' ? (
          <ErrorState message={error} onRetry={reload} />
        ) : shown.length === 0 ? (
          <p className="empty-text">
            {filter === 'unread' ? "You're all caught up. No unread notifications." : 'No notifications yet.'}
          </p>
        ) : (
          <ul className="notif-list notif-list--page">
            {shown.map((n) => (
              <li key={n.id}>
                <Link to={n.link || '/notifications'} className={`notif-item ${n.read ? '' : 'is-unread'}`} onClick={() => markRead(n.id)}>
                  <NotificationIcon type={n.type} />
                  <span className="notif-item__text">
                    <strong>{n.title}</strong>
                    <small>{n.body}</small>
                  </span>
                  <time dateTime={n.time} className="notif-item__time">{timeAgo(n.time)}</time>
                  {n.read ? <span className="unread-dot unread-dot--space" aria-hidden="true" /> : <span className="unread-dot" aria-label="Unread" />}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
