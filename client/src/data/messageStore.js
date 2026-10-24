// =====================================================================
//  TEMPORARY: messages the backend can't store yet
//
//  There is no messages table or route yet (see design-reference/
//  MESSAGES-FOR-AERON.md). Until Aeron adds them, messages you send and
//  which conversations you've read are kept in this browser only
//  (localStorage), one entry per user. Nothing reaches the admins.
// =====================================================================

const keyFor = (userId) => `agapay.messages.${userId ?? 'guest'}`;

// { sent: { [otherUserId]: [message] }, readAt: { [otherUserId]: isoTime } }
export function readMessages(userId) {
  try {
    const saved = JSON.parse(localStorage.getItem(keyFor(userId)));
    return { sent: saved?.sent ?? {}, readAt: saved?.readAt ?? {} };
  } catch {
    return { sent: {}, readAt: {} };
  }
}

export function writeMessages(userId, data) {
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}
