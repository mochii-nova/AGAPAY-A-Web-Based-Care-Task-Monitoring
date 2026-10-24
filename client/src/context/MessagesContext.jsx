import { createContext, useContext, useState } from 'react';
import { useProfile } from './ProfileContext';
import { sampleConversations } from '../data/sample';
import { readMessages, writeMessages } from '../data/messageStore';

const MessagesContext = createContext();

export const MAX_MESSAGE = 1000;

// Conversations between the caregiver and the administrators, shared by the
// Messages page, the sidebar badge and the ✉ icon.
// TODO: replace the sample + browser store with the routes in MESSAGES-FOR-AERON.md
export function MessagesProvider({ children }) {
  const { profile } = useProfile();
  const myId = profile.id ?? 'me';
  const [store, setStore] = useState(() => readMessages(myId));

  const save = (next) => {
    if (!writeMessages(myId, next)) return false;
    setStore(next);
    return true;
  };

  const conversations = sampleConversations(myId)
    .map(({ user, messages }) => {
      const readUntil = store.readAt[user.id];
      const all = [...messages, ...(store.sent[user.id] ?? [])]
        .map((m) => (m.senderId === user.id && !m.readAt && readUntil && m.createdAt <= readUntil ? { ...m, readAt: readUntil } : m))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      return {
        user,
        messages: all,
        last: all.at(-1) ?? null,
        unread: all.filter((m) => m.senderId === user.id && !m.readAt).length,
      };
    })
    // Newest conversation first; ones without messages at the end
    .sort((a, b) => (b.last?.createdAt ?? '').localeCompare(a.last?.createdAt ?? ''));

  const unreadCount = conversations.reduce((sum, c) => sum + c.unread, 0);

  // Returns false if the browser couldn't save it
  const send = (otherId, body) => {
    const message = {
      id: `local-${Date.now()}`,
      senderId: myId,
      recipientId: otherId,
      body: body.trim().slice(0, MAX_MESSAGE),
      createdAt: new Date().toISOString(),
      readAt: null,
    };
    return save({ ...store, sent: { ...store.sent, [otherId]: [...(store.sent[otherId] ?? []), message] } });
  };

  const markRead = (otherId) => save({ ...store, readAt: { ...store.readAt, [otherId]: new Date().toISOString() } });

  return (
    <MessagesContext.Provider value={{ myId, conversations, unreadCount, send, markRead }}>
      {children}
    </MessagesContext.Provider>
  );
}

export const useMessages = () => useContext(MessagesContext);
