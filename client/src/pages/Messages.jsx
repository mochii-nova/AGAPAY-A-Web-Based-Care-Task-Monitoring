import { useEffect, useEffectEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { useMessages } from '../context/MessagesContext';
import { useStaff } from '../context/StaffContext';
import useMediaQuery from '../hooks/useMediaQuery';
import PageHeader from '../components/PageHeader';
import ConversationList from '../components/messages/ConversationList';
import ChatView from '../components/messages/ChatView';
import { LoadingState, ErrorState, EmptyState } from '../components/StateMessage';
import '../styles/messages.css';

// "New message to…" dropdown: picking a person opens (or starts) the conversation with them
function NewMessagePicker({ id, people, onPick, className = '' }) {
  return (
    <>
      <label htmlFor={id} className="sr-only">New message to</label>
      <select id={id} className={`field__input select ${className}`} value="" onChange={(e) => e.target.value && onPick(e.target.value)}>
        <option value="">New message to…</option>
        {people.map((u) => <option key={u.id} value={u.id}>{u.name}{u.role === 'admin' ? ' (administrator)' : ''}</option>)}
      </select>
    </>
  );
}

// Chat between caregivers and the administrators.
// Laptops: list on the left, chat on the right. Phones: the list, then the chat on its own screen.
// Administrators can also start a conversation with anyone (the list only has people they've talked to);
// caregivers can write to every administrator. Both get "Start a new conversation" under the list.
export default function Messages() {
  const { myId, conversations: talkedTo, markRead, status, error, reload } = useMessages();
  const staff = useStaff(); // only for administrators
  const [searchParams, setSearchParams] = useSearchParams();
  const narrow = useMediaQuery('(max-width: 900px)');

  // ?with=<user id> opens that conversation (notifications link here like that);
  // ?text=… fills in the message box (the Handover page's "Remind" does that)
  const wantedId = searchParams.get('with');
  const prefill = searchParams.get('text') ?? '';

  // An administrator opening someone new: add them to the top of the list until the first message
  const newPerson =
    staff && wantedId && !talkedTo.some((c) => String(c.user.id) === wantedId)
      ? staff.staff.find((u) => String(u.id) === wantedId && u.status === 'active' && u.id !== myId)
      : null;
  const conversations = newPerson ? [{ user: newPerson, last: null, unread: 0 }, ...talkedTo] : talkedTo;
  const current = conversations.find((c) => String(c.user.id) === wantedId) ?? (narrow ? null : conversations[0]);
  const open = (id) => setSearchParams({ with: id });

  // Opening a conversation marks its messages as read
  const readCurrent = useEffectEvent(() => markRead(current.user.id));
  useEffect(() => {
    if (current?.unread) readCurrent();
  }, [current?.user.id, current?.unread]);

  // Everyone I could write to: administrators, everyone active; caregivers, every administrator
  // (the server already lists each administrator as a conversation, even with no messages yet)
  const others = staff
    ? staff.staff.filter((u) => u.status === 'active' && u.id !== myId).sort((a, b) => a.name.localeCompare(b.name))
    : talkedTo.map((c) => c.user).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div>
      <PageHeader
        title="Messages"
        subtitle={staff ? 'Message caregivers and other administrators.' : 'Message the administrators. Their replies show up here.'}
      >
        {staff && <NewMessagePicker id="message-new" people={others} onPick={open} className="messages__new" />}
      </PageHeader>

      {status === 'loading' && <div className="card"><LoadingState label="Loading your messages…" /></div>}
      {status === 'error' && <div className="card"><ErrorState message={error} onRetry={reload} /></div>}
      {status === 'ready' && conversations.length === 0 && (
        <div className="card">
          <EmptyState icon={MessageSquare}>
            {others.length ? 'No conversations yet. Choose someone to message.' : "There's no administrator to message yet."}
          </EmptyState>
          {others.length > 0 && (
            <div className="messages__start messages__start--empty">
              <NewMessagePicker id="message-new-empty" people={others} onPick={open} />
            </div>
          )}
        </div>
      )}

      {status === 'ready' && conversations.length > 0 && (
        <div className={`card chat ${current ? 'has-chat' : ''}`}>
          {(!narrow || !current) && (
            <ConversationList
              title={staff ? 'Conversations' : 'Administrators'}
              conversations={conversations}
              selectedId={current?.user.id}
              myId={myId}
              onSelect={open}
            >
              {others.length > 0 && (
                <div className="messages__start">
                  <p className="messages__start-title">Start a new conversation</p>
                  <NewMessagePicker id="message-new-list" people={others} onPick={open} />
                </div>
              )}
            </ConversationList>
          )}
          {current && (
            <ChatView
              key={`${current.user.id}-${prefill}`}
              conversation={current}
              initialDraft={String(current.user.id) === wantedId ? prefill : ''}
              // Once sent, drop ?text= so the reminder isn't filled in again
              onSent={prefill ? () => setSearchParams({ with: current.user.id }, { replace: true }) : undefined}
              onBack={narrow ? () => setSearchParams({}) : null}
            />
          )}
        </div>
      )}
    </div>
  );
}
