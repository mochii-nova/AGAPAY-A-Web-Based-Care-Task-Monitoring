// One shared timer that tells every live screen to refresh its data quietly:
// every 15 seconds, and straight away when you come back to the tab or window.
// It pauses while the tab is hidden, and runs only while something is listening.
// Many tab/window events in a row (focus + visibilitychange) count as one refresh.

const EVERY = 15 * 1000;
const MIN_GAP = 2 * 1000; // never refresh twice within 2 seconds

const listeners = new Set();
let timer = null;
let last = 0;

function tick() {
  if (document.visibilityState !== 'visible') return;
  const now = Date.now();
  if (now - last < MIN_GAP) return;
  last = now;
  listeners.forEach((refresh) => refresh());
}

function start() {
  if (!timer && document.visibilityState === 'visible') timer = setInterval(tick, EVERY);
}

function stop() {
  clearInterval(timer);
  timer = null;
}

// Back on the tab: refresh now and count 15 seconds from here. Hidden: pause.
function onVisibility() {
  if (document.visibilityState === 'visible') {
    stop();
    tick();
    start();
  } else {
    stop();
  }
}

// Back in this window (e.g. from another browser)
function onFocus() {
  tick();
}

// Calls `refresh` on every shared tick; returns the function that stops it
export function onLiveRefresh(refresh) {
  listeners.add(refresh);
  if (listeners.size === 1) {
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);
    start();
  }
  return () => {
    listeners.delete(refresh);
    if (listeners.size === 0) {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
    }
  };
}
