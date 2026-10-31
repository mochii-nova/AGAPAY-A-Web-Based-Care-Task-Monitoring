import { Search } from 'lucide-react';
import Avatar from '../Avatar';
import { timeAgo } from '../../utils/format';

const matches = (name, q) => name.toLowerCase().includes(q);

// Left column: "Search people" on top, then one row per conversation (newest first).
// While typing, it also lists everyone else you may write to, under "Start a new chat".
export default function ConversationList({ title = 'Administrators', conversations, people, search, onSearch, selectedId, myId, onSelect }) {
  const q = search.trim().toLowerCase();
  const shown = q ? conversations.filter((c) => matches(c.user.name, q)) : conversations;
  const talking = new Set(conversations.map((c) => c.user.id));
  const newPeople = q ? people.filter((u) => !talking.has(u.id) && matches(u.name, q)) : [];

  return (
    <nav className="convo-pane" aria-label="Conversations">
      <div className="search-box convo-pane__search">
        <Search size={18} aria-hidden="true" />
        <label htmlFor="people-search" className="sr-only">Search people</label>
        <input
          id="people-search"
          type="search"
          className="field__input"
          placeholder="Search people"
          autoComplete="off"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && onSearch('')}
        />
      </div>

      {conversations.length === 0 && !q ? (
        <p className="convo-pane__empty">No conversations yet. Search for someone to message.</p>
      ) : (
        <>
          {(shown.length > 0 || !q) && <p className="small-label convo-pane__title">{title}</p>}
          <ul className="convo-list">
            {shown.map(({ user, last, unread }) => {
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
                        {/* Unread: a small plum dot (and the name in bold) */}
                        {unread > 0 && <span className="convo__dot" aria-label={`${unread} unread`} />}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {newPeople.length > 0 && (
        <>
          <p className="small-label convo-pane__title convo-pane__title--new">Start a new chat</p>
          <ul className="convo-list">
            {newPeople.map((u) => (
              <li key={u.id}>
                <button type="button" className="convo convo--person" onClick={() => onSelect(u.id)}>
                  <Avatar name={u.name} size={36} />
                  <span className="convo__main">
                    <strong className="convo__name">{u.name}</strong>
                    <small className="convo__preview">{u.role === 'admin' ? 'Administrator' : 'Caregiver'}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {q && shown.length === 0 && newPeople.length === 0 && (
        <p className="convo-pane__empty">No one called “{search.trim()}”.</p>
      )}
    </nav>
  );
}
