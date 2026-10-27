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

// Chat between caregivers and the administrators.
// Laptops: list on the left, chat on the right. Phones: the list, then the chat on its own screen.
// Administrators can also start a conversation with anyone (the list only has people they've talked to).
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

  // Administrators: everyone active they could write to
  const others = staff ? staff.staff.filter((u) => u.status === 'active' && u.id !== myId).sort((a, b) => a.name.localeCompare(b.name)) : [];

  return (
    <div>
      <PageHeader
        title="Messages"
        subtitle={staff ? 'Message caregivers and other administrators.' : 'Message the administrators. Their replies show up here.'}
      >
        {staff && (
          <>
            <label htmlFor="message-new" className="sr-only">New message to</label>
            <select id="message-new" className="field__input select messages__new" value="" onChange={(e) => e.target.value && open(e.target.value)}>
              <option value="">New message to…</option>
              {others.map((u) => <option key={u.id} value={u.id}>{u.name}{u.role === 'admin' ? ' (administrator)' : ''}</option>)}
            </select>
          </>
        )}
      </PageHeader>

      {status === 'loading' && <div className="card"><LoadingState label="Loading your messages…" /></div>}
      {status === 'error' && <div className="card"><ErrorState message={error} onRetry={reload} /></div>}
      {status === 'ready' && conversations.length === 0 && (
        <div className="card">
          <EmptyState icon={MessageSquare}>
            {staff ? 'No conversations yet. Choose someone in "New message to…" to start one.' : "There's no administrator to message yet."}
          </EmptyState>
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
            />
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
