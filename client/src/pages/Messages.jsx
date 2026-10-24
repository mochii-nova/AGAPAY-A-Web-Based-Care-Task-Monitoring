import { useEffect, useEffectEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMessages } from '../context/MessagesContext';
import useMediaQuery from '../hooks/useMediaQuery';
import PageHeader from '../components/PageHeader';
import ConversationList from '../components/messages/ConversationList';
import ChatView from '../components/messages/ChatView';
import '../styles/messages.css';

// Chat between the caregiver and the administrators.
// Laptops: list on the left, chat on the right. Phones: the list, then the chat on its own screen.
export default function Messages() {
  const { myId, conversations, markRead } = useMessages();
  const [searchParams, setSearchParams] = useSearchParams();
  const narrow = useMediaQuery('(max-width: 900px)');

  const wantedId = searchParams.get('with');
  const current = conversations.find((c) => c.user.id === wantedId) ?? (narrow ? null : conversations[0]);
  const open = (id) => setSearchParams({ with: id });

  // Opening a conversation marks its messages as read
  const readCurrent = useEffectEvent(() => markRead(current.user.id));
  useEffect(() => {
    if (current?.unread) readCurrent();
  }, [current?.user.id, current?.unread]);

  return (
    <div>
      <PageHeader
        title="Messages"
        titleExtra={<span className="sample-tag">Sample conversations</span>}
        subtitle="Message the administrators. Their replies show up here."
      />

      <div className={`card chat ${current ? 'has-chat' : ''}`}>
        {(!narrow || !current) && (
          <ConversationList conversations={conversations} selectedId={current?.user.id} myId={myId} onSelect={open} />
        )}
        {current && <ChatView key={current.user.id} conversation={current} onBack={narrow ? () => setSearchParams({}) : null} />}
      </div>
    </div>
  );
}
