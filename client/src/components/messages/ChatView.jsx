import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { ChevronLeft, MessageSquare, Send, CircleAlert } from 'lucide-react';
import Avatar from '../Avatar';
import { LoadingState, ErrorState } from '../StateMessage';
import { useMessages, MAX_MESSAGE } from '../../context/MessagesContext';
import useApiData from '../../hooks/useApiData';
import { formatTime } from '../../utils/format';

const REFRESH = 15 * 1000; // replies show up while the chat is open

// "Today", "Yesterday" or "Fri, Oct 23"
function dayLabel(iso) {
  const day = new Date(iso).toDateString();
  const today = new Date();
  if (day === today.toDateString()) return 'Today';
  if (day === new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1).toDateString()) return 'Yesterday';
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// Right column: the messages with one person, and the box to write a new one.
// `initialDraft` fills in the box (e.g. a handover reminder); onSent() runs after a message is sent.
export default function ChatView({ conversation, initialDraft = '', onSent, onBack }) {
  const { myId, send, markRead } = useMessages();
  const { user } = conversation;
  const query = useApiData(`/messages/${user.id}`, { refreshEvery: REFRESH });
  const messages = query.data ?? [];
  const [draft, setDraft] = useState(initialDraft);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  // Always show the newest message
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages.length, query.status]);

  // A reply that arrives while the chat is open is read straight away
  const unreadFromThem = messages.some((m) => m.senderId === user.id && !m.readAt);
  const readNow = useEffectEvent(() => markRead(user.id));
  useEffect(() => {
    if (unreadFromThem) readNow();
  }, [unreadFromThem, messages.length]);

  const submit = async (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return setError('Type a message first.');
    if (sending) return undefined;
    setSending(true);
    setError('');
    try {
      const saved = await send(user.id, text);
      query.setData((list) => [...list, saved]);
      setDraft('');
      onSent?.();
    } catch (err) {
      setError(
        err.response
          ? err.response.data?.message || "Couldn't send your message. Please try again."
          : "Can't reach the server. Your message wasn't sent; please try again."
      );
    } finally {
      setSending(false);
    }
    return undefined;
  };

  // Enter sends, Shift + Enter starts a new line
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) submit(e);
  };

  const lastMine = messages.findLast((m) => m.senderId === myId);
  // "Caregiver · Night lead" (the job title is left out when it just repeats the role)
  const role = user.role === 'admin' ? 'Administrator' : 'Caregiver';
  const who = [role, user.title?.toLowerCase() === role.toLowerCase() ? null : user.title].filter(Boolean).join(' · ');

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
          <small>{who}</small>
        </div>
      </header>

      <div className="chat-log" ref={listRef} role="log" aria-live="polite" aria-label="Messages" tabIndex={0}>
        {query.status === 'loading' ? (
          <LoadingState label="Loading messages…" />
        ) : query.status === 'error' ? (
          <ErrorState message={query.error} onRetry={query.reload} />
        ) : messages.length === 0 ? (
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
                    {m === lastMine && <> · {m.readAt ? 'Seen' : 'Sent'}</>}
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
          <button type="submit" className="btn btn--primary composer__send" disabled={sending}>
            <Send size={16} aria-hidden="true" /> <span>{sending ? 'Sending…' : 'Send'}</span>
          </button>
        </div>
        {error && (
          <p className="field__error composer__error" role="alert">
            <CircleAlert size={14} aria-hidden="true" /> {error}
          </p>
        )}
        <p id="composer-note" className="local-note composer__note">Enter sends, Shift + Enter adds a new line.</p>
      </form>
    </section>
  );
}
