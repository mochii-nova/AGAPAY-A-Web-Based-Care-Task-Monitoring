// Web Push, the browser half. The backend half (VAPID keys, saving subscriptions, sending)
// is Aeron's: see design-reference/WEB-PUSH-FOR-AERON.md for the routes used here.
import api from '../api';

export const PUSH_MESSAGES = {
  unsupported: "This browser can't show AGAPAY notifications. Please use Chrome or Edge on a computer or Android phone.",
  insecure: 'Notifications only work on a secure address (https:// or localhost).',
  denied:
    'Notifications are blocked for AGAPAY. Click the lock (or settings) icon next to the address bar, set Notifications to Allow, then reload the page.',
  dismissed: 'You closed the question without choosing. Click the switch again and choose Allow.',
  backend:
    "Notifications are on in this browser, but the AGAPAY server can't send them yet. Use “Send test notification” to see how they will look.",
  server: "Couldn't connect notifications to the AGAPAY server. Please try again later.",
  worker: "Couldn't start notifications in this browser. Reload the page and try again.",
};

export class PushError extends Error {
  constructor(code) {
    super(PUSH_MESSAGES[code] ?? PUSH_MESSAGES.server);
    this.code = code;
  }
}

// 'ok', 'unsupported' or 'insecure'
export function pushSupport() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported';
  if (!window.isSecureContext) return 'insecure';
  return 'ok';
}

export const permission = () => (pushSupport() === 'ok' ? Notification.permission : 'default');

export async function registerWorker() {
  try {
    await navigator.serviceWorker.register('/sw.js');
    return await navigator.serviceWorker.ready;
  } catch {
    throw new PushError('worker');
  }
}

// The backend's public VAPID key turned into the bytes the browser wants
function keyBytes(base64) {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}
const sameBytes = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

// "Backend not ready" = the push routes don't exist yet (404) or the server isn't running
const serverError = (err) => new PushError(!err.response || err.response.status === 404 ? 'backend' : 'server');

// Subscribes this browser and saves the subscription on the backend (POST /api/push/subscribe)
export async function connectToServer() {
  const registration = await registerWorker();
  let publicKey;
  try {
    ({ publicKey } = (await api.get('/push/public-key')).data);
  } catch (err) {
    throw serverError(err);
  }
  if (!publicKey) throw new PushError('backend'); // route exists but the keys aren't in server/.env yet

  const key = keyBytes(publicKey);
  let subscription = await registration.pushManager.getSubscription();
  // A subscription made with different keys can't be reused
  const current = subscription?.options?.applicationServerKey;
  if (current && !sameBytes(new Uint8Array(current), key)) {
    await subscription.unsubscribe();
    subscription = null;
  }
  try {
    subscription ??= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
  } catch {
    throw new PushError(Notification.permission === 'denied' ? 'denied' : 'worker');
  }

  try {
    await api.post('/push/subscribe', subscription.toJSON());
  } catch (err) {
    throw serverError(err);
  }
}

// Stops pushes to this browser: tells the backend (if it can) and removes the subscription.
// Uses plain fetch so a failure never triggers the "session expired" sign-out, and so it
// still finishes while signing out (the login token is passed in because it's being removed).
export async function disconnectFromServer(token = localStorage.getItem('token')) {
  if (pushSupport() !== 'ok') return;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  await fetch(`${api.defaults.baseURL}/push/unsubscribe`, {
    method: 'POST',
    keepalive: true,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  }).catch(() => {});
  await subscription.unsubscribe().catch(() => {});
}

// Asks the backend to send a real push (POST /api/push/test)
export const sendServerTest = () => api.post('/push/test');

// A pop-up made right here in the browser, to check the design before the backend is ready.
// Goes through the service worker, so clicking it behaves exactly like a real one.
export async function showLocalTest() {
  const registration = await registerWorker();
  await registration.showNotification('AGAPAY notifications are on', {
    body: 'This is a test. Real alerts will tell you about overdue tasks and new handovers.',
    tag: 'test',
    renotify: true,
    data: { url: '/notifications' },
  });
}
