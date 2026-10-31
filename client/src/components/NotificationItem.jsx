import { Link } from 'react-router-dom';
import NotificationIcon from './NotificationIcon';
import { timeAgo } from '../utils/format';

// One notification, like a school LMS: "TASK · 2 hr ago", a bold title, the details,
// "Due Nov 1, 3:00 PM (passed)" for tasks, and a small plum dot while unread.
// The whole row opens the related page. `n` comes from NotificationContext (already described).
export default function NotificationItem({ n, onOpen }) {
  return (
    <Link to={n.link || '/notifications'} className={`notif-item ${n.read ? '' : 'is-unread'}`} onClick={onOpen}>
      <NotificationIcon type={n.type} />
      <span className="notif-item__text">
        <span className="notif-item__meta">
          <span className="notif-item__type">{n.label}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={n.time}>{timeAgo(n.time)}</time>
        </span>
        <strong>{n.title}</strong>
        {n.details && <small>{n.details}</small>}
        {n.due && (
          <small className={`notif-item__due ${n.due.passed ? 'is-passed' : ''}`}>
            {n.due.text}{n.due.passed && ' (passed)'}
          </small>
        )}
      </span>
      {n.read ? <span className="unread-dot unread-dot--space" aria-hidden="true" /> : <span className="unread-dot" aria-label="Unread" />}
    </Link>
  );
}
