import { useId } from 'react';
import { BellRing, CircleAlert, CircleCheck, Info, Send } from 'lucide-react';
import { usePush } from '../context/PushContext';

const ICONS = { success: CircleCheck, info: Info, warning: CircleAlert, error: CircleAlert };

function Message({ tone, text }) {
  const Icon = ICONS[tone] ?? Info;
  return (
    <div className={`alert alert--${tone}`} role={tone === 'error' || tone === 'warning' ? 'alert' : 'status'}>
      <Icon size={18} aria-hidden="true" />
      <span>{text}</span>
    </div>
  );
}

// "Allow notifications" switch. `compact` = the small version in the bell dropdown.
// The full version (Notifications page) also has the test button and its messages.
export default function PushToggle({ compact = false }) {
  const push = usePush();
  const id = useId();
  // The dropdown has room for one line, so a fresh message replaces the status there
  const line = compact && push.notice ? push.notice : push.status;

  const row = (
    <div className="push-toggle__row">
      <BellRing size={compact ? 18 : 20} aria-hidden="true" className="push-toggle__icon" />
      <div className="push-toggle__text">
        <span id={`${id}-label`} className="push-toggle__label">Allow notifications</span>
        {(compact || line.tone === 'muted') && (
          <small id={`${id}-status`} className={`push-toggle__status push-toggle__status--${line.tone}`} aria-live="polite">
            {line.text}
          </small>
        )}
      </div>
      <button
        type="button"
        role="switch"
        className="switch"
        aria-checked={push.on}
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-status`}
        disabled={push.disabled}
        onClick={push.toggle}
      >
        <span className="switch__track" aria-hidden="true" />
      </button>
    </div>
  );

  if (compact) return <div className="push-toggle push-toggle--compact">{row}</div>;

  return (
    <div className="push-toggle">
      {row}
      {push.status.tone !== 'muted' && (
        <div id={`${id}-status`}>
          <Message {...push.status} />
        </div>
      )}
      {push.notice && <Message {...push.notice} />}
      <div className="push-toggle__actions">
        <p className="field__hint">
          Pop-ups never show resident names or health details, because they can appear on a locked screen.
        </p>
        <button type="button" className="btn btn--outline btn--sm" onClick={push.sendTest} disabled={!push.canTest || push.busy}>
          <Send size={16} aria-hidden="true" /> Send test notification
        </button>
      </div>
    </div>
  );
}
