// "Is the server still waking up?" The online server sleeps when nobody uses it, so the very first
// request after a while can take up to a minute. If the first requests of this visit are still waiting
// after 5 seconds, a small note says so (ServerWakeNote.jsx). Once any answer arrives, the server is awake
// and the note never shows again during this visit.
const SLOW_AFTER = 5000;

let awake = false;
let pending = 0;
let timer = null;
let slow = false;
const listeners = new Set();

const setSlow = (on) => {
  if (slow === on) return;
  slow = on;
  listeners.forEach((fn) => fn());
};

export const subscribeServerWake = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
export const isServerWaking = () => slow;

// Called by api.js for every request: returns a function to call once it has finished
export function trackRequest() {
  if (awake) return () => {};
  pending += 1;
  timer ??= setTimeout(() => setSlow(true), SLOW_AFTER);
  let done = false;
  return (answered) => {
    if (done) return;
    done = true;
    pending -= 1;
    if (answered) awake = true;
    if (awake || pending === 0) {
      clearTimeout(timer);
      timer = null;
      setSlow(false);
    }
  };
}
