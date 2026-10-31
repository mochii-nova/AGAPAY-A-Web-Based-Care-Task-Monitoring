import { useEffect, useEffectEvent, useState } from 'react';
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

// Chat between caregivers and the administrators, Messenger-style.
// Laptops: list on the left, chat on the right. Phones: the list, then the chat on its own screen.
// "Search people" at the top of the list finds conversations and anyone you may start a chat with
// (administrators: all active staff; caregivers: the administrators).
export default function Messages() {
  const { myId, conversations: fromServer, markRead, status, error, reload } = useMessages();
  const staff = useStaff(); // only for administrators

  // Profile photos: the conversation list from the server has no photos yet, so administrators get them
  // from the staff list they already load. (Caregivers see initials until the server adds `photoUrl`.)
  const photoOf = new Map((staff?.staff ?? []).map((u) => [u.id, u.photoUrl]));
  const talkedTo = fromServer.map((c) =>
    c.user.photoUrl || !photoOf.get(c.user.id) ? c : { ...c, user: { ...c.user, photoUrl: photoOf.get(c.user.id) } }
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const narrow = useMediaQuery('(max-width: 900px)');

  // ?with=<user id> opens that conversation (notifications link here like that);
  // ?text=… fills in the message box (the Handover page's "Remind" does that)
  const wantedId = searchParams.get('with');
  const prefill = searchParams.get('text') ?? '';

  // Everyone I may write to (the server already lists each administrator as a caregiver's conversation)
  const people = staff
    ? staff.staff.filter((u) => u.status === 'active' && u.id !== myId).sort((a, b) => a.name.localeCompare(b.name))
    : talkedTo.map((c) => c.user).sort((a, b) => a.name.localeCompare(b.name));

  // Opening someone new: add them to the top of the list until the first message
  const newPerson = wantedId && !talkedTo.some((c) => String(c.user.id) === wantedId)
    ? people.find((u) => String(u.id) === wantedId)
    : null;
  const conversations = newPerson ? [{ user: newPerson, last: null, unread: 0 }, ...talkedTo] : talkedTo;
  const current = conversations.find((c) => String(c.user.id) === wantedId) ?? (narrow ? null : conversations[0]);
  const open = (id) => {
    setSearch('');
    setSearchParams({ with: id });
  };

  // Opening a conversation marks its messages as read
  const readCurrent = useEffectEvent(() => markRead(current.user.id));
  useEffect(() => {
    if (current?.unread) readCurrent();
  }, [current?.user.id, current?.unread]);

  return (
    <div>
      <PageHeader
        title="Messages"
        subtitle={staff ? 'Message caregivers and other administrators.' : 'Message the administrators. Their replies show up here.'}
      />

      {status === 'loading' && <div className="card"><LoadingState label="Loading your messages…" /></div>}
      {status === 'error' && <div className="card"><ErrorState message={error} onRetry={reload} /></div>}
      {status === 'ready' && people.length === 0 && conversations.length === 0 && (
        <div className="card">
          <EmptyState icon={MessageSquare}>There&apos;s no one to message yet.</EmptyState>
        </div>
      )}

      {status === 'ready' && (people.length > 0 || conversations.length > 0) && (
        <div className={`card chat ${current ? 'has-chat' : ''}`}>
          {(!narrow || !current) && (
            <ConversationList
              title={staff ? 'Conversations' : 'Administrators'}
              conversations={conversations}
              people={people}
              search={search}
              onSearch={setSearch}
              selectedId={current?.user.id}
              myId={myId}
              onSelect={open}
            />
          )}
          {current ? (
            <ChatView
              key={`${current.user.id}-${prefill}`}
              conversation={current}
              initialDraft={String(current.user.id) === wantedId ? prefill : ''}
              // Once sent, drop ?text= so the reminder isn't filled in again
              onSent={prefill ? () => setSearchParams({ with: current.user.id }, { replace: true }) : undefined}
              onBack={narrow ? () => setSearchParams({}) : null}
            />
          ) : (
            !narrow && (
              <div className="chat-pane chat-pane--none">
                <div className="chat-empty">
                  <MessageSquare size={28} aria-hidden="true" />
                  <p>Search for someone on the left to start a chat.</p>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
