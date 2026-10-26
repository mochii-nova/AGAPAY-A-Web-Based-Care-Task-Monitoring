import { createContext, useContext } from 'react';
import api from '../api';
import useApiData from '../hooks/useApiData';
import { useAuth } from './AuthContext';

const MessagesContext = createContext();

export const MAX_MESSAGE = 1000;
const REFRESH = 30 * 1000; // new messages and unread counts show up within half a minute

// [{ user, lastMessage, unreadCount }] from the backend -> [{ user, last, unread }]
const toConversations = (list) => list.map((c) => ({ user: c.user, last: c.lastMessage, unread: c.unreadCount }));

// My conversations with the administrators (newest first), shared by the
// Messages page, the sidebar badge and the ✉ icon. The messages themselves load in ChatView.
export function MessagesProvider({ children }) {
  const { user } = useAuth();
  const query = useApiData('/messages/conversations', { transform: toConversations, refreshEvery: REFRESH });
  const conversations = query.data ?? [];
  const unreadCount = conversations.reduce((sum, c) => sum + c.unread, 0);

  const update = (otherId, change) =>
    query.setData((list) => list.map((c) => (c.user.id === otherId ? { ...c, ...change(c) } : c)));

  // Sends a message; resolves to the saved message, or throws with the backend's reason
  const send = async (otherId, body) => {
    const { data } = await api.post(`/messages/${otherId}`, { body: body.trim().slice(0, MAX_MESSAGE) });
    update(otherId, () => ({ last: data }));
    return data;
  };

  // Opening a conversation marks what they sent me as read
  const markRead = async (otherId) => {
    update(otherId, () => ({ unread: 0 }));
    await api.patch(`/messages/${otherId}/read`).catch(() => query.reload({ silent: true }));
  };

  return (
    <MessagesContext.Provider
      value={{ myId: user?.id, conversations, unreadCount, send, markRead, status: query.status, error: query.error, reload: query.reload }}
    >
      {children}
    </MessagesContext.Provider>
  );
}

export const useMessages = () => useContext(MessagesContext);
