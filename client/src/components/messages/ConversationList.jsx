import Avatar from '../Avatar';
import { timeAgo } from '../../utils/format';

// Left column: one row per person, newest conversation first
export default function ConversationList({ title = 'Administrators', conversations, selectedId, myId, onSelect }) {
  return (
    <nav className="convo-pane" aria-label="Conversations">
      <p className="small-label convo-pane__title">{title}</p>
      <ul className="convo-list">
        {conversations.map(({ user, last, unread }) => {
          const preview = last ? `${last.senderId === myId ? 'You: ' : ''}${last.body}` : 'No messages yet';
          return (
            <li key={user.id}>
              <button
                type="button"
                className={`convo ${unread ? 'is-unread' : ''}`}
                aria-current={user.id === selectedId ? 'true' : undefined}
                onClick={() => onSelect(user.id)}
              >
                <Avatar name={user.name} size={40} />
                <span className="convo__main">
                  <span className="convo__line">
                    <strong className="convo__name">{user.name}</strong>
                    {last && <time dateTime={last.createdAt} className="convo__time">{timeAgo(last.createdAt)}</time>}
                  </span>
                  <span className="convo__line">
                    <small className="convo__preview">{preview}</small>
                    {unread > 0 && (
                      <span className="count-badge" aria-label={`${unread} unread`}>{unread}</span>
                    )}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
