import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, MessageSquare, Send, CircleAlert } from 'lucide-react';
import Avatar from '../Avatar';
import { useMessages, MAX_MESSAGE } from '../../context/MessagesContext';
import { formatTime } from '../../utils/format';

// "Today", "Yesterday" or "Fri, Oct 23"
function dayLabel(iso) {
  const day = new Date(iso).toDateString();
  const today = new Date();
  if (day === today.toDateString()) return 'Today';
  if (day === new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1).toDateString()) return 'Yesterday';
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// Right column: the messages with one administrator, and the box to write a new one
export default function ChatView({ conversation, onBack }) {
  const { myId, send } = useMessages();
  const { user, messages } = conversation;
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const listRef = useRef(null);

  // Always show the newest message
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages.length]);

  const submit = (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return setError('Type a message first.');
    if (!send(user.id, text)) return setError("Couldn't save your message on this computer. Please try again.");
    setDraft('');
    setError('');
  };

  // Enter sends, Shift + Enter starts a new line
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) submit(e);
  };

  const lastMine = messages.findLast((m) => m.senderId === myId);

  return (
    <section className="chat-pane" aria-label={`Conversation with ${user.name}`}>
      <header className="chat-pane__head">
        {onBack && (
          <button type="button" className="icon-btn" onClick={onBack} aria-label="Back to conversations">
            <ChevronLeft size={20} />
          </button>
        )}
        <Avatar name={user.name} size={40} />
        <div className="chat-pane__who">
          <h2>{user.name}</h2>
          <small>Administrator · {user.title}</small>
        </div>
      </header>

      <div className="chat-log" ref={listRef} role="log" aria-live="polite" aria-label="Messages" tabIndex={0}>
        {messages.length === 0 ? (
          <div className="chat-empty">
            <MessageSquare size={28} aria-hidden="true" />
            <p>No messages yet. Write to {user.name.split(' ')[0]} below.</p>
          </div>
        ) : (
          messages.map((m, i) => {
            const mine = m.senderId === myId;
            const newDay = i === 0 || dayLabel(m.createdAt) !== dayLabel(messages[i - 1].createdAt);
            return (
              <div key={m.id} className="chat-item">
                {newDay && <p className="chat-day"><span>{dayLabel(m.createdAt)}</span></p>}
                <div className={`bubble-row ${mine ? 'bubble-row--mine' : ''}`}>
                  <div className="bubble">
                    <span className="sr-only">{mine ? 'You' : user.name}: </span>
                    <p>{m.body}</p>
                  </div>
                  <small className="bubble__meta">
                    <time dateTime={m.createdAt}>{formatTime(m.createdAt)}</time>
                    {m === lastMine && (
                      <> · {m.id.startsWith('local-') ? 'Saved on this computer only' : m.readAt ? 'Seen' : 'Sent'}</>
                    )}
                  </small>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form className="composer" onSubmit={submit} noValidate>
        <label htmlFor="message-box" className="sr-only">Message to {user.name}</label>
        <div className="composer__row">
          <textarea
            id="message-box"
            className="field__input composer__input"
            rows={1}
            maxLength={MAX_MESSAGE}
            placeholder={`Write to ${user.name.split(' ')[0]}…`}
            value={draft}
            onChange={(e) => { setDraft(e.target.value); setError(''); }}
            onKeyDown={handleKeyDown}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby="composer-note"
          />
          <button type="submit" className="btn btn--primary composer__send">
            <Send size={16} aria-hidden="true" /> <span>Send</span>
          </button>
        </div>
        {error && (
          <p className="field__error composer__error" role="alert">
            <CircleAlert size={14} aria-hidden="true" /> {error}
          </p>
        )}
        <p id="composer-note" className="local-note composer__note">
          Sample data: messages you send are saved on this computer only and don’t reach the administrators yet.
          Enter sends, Shift + Enter adds a new line.
        </p>
      </form>
    </section>
  );
}
