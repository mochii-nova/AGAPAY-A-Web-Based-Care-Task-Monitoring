import { useSyncExternalStore } from 'react';
import { LoaderCircle } from 'lucide-react';
import { isServerWaking, subscribeServerWake } from '../utils/serverWake';

// A small note at the bottom of the screen while the online server wakes up (first visit after a
// while: the first answer takes more than 5 seconds). It goes away as soon as the server answers.
export default function ServerWakeNote() {
  const waking = useSyncExternalStore(subscribeServerWake, isServerWaking);
  return (
    <div className="wake-note-slot" role="status" aria-live="polite">
      {waking && (
        <p className="wake-note">
          <LoaderCircle size={16} className="spin" aria-hidden="true" />
          Waking up the server… this can take up to a minute the first time.
        </p>
      )}
    </div>
  );
}
