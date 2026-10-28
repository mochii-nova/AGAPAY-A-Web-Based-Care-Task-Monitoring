import { useEffect, useEffectEvent, useState } from 'react';
import { CalendarDays, CalendarPlus, CalendarCheck, CircleAlert, ExternalLink, Globe, Link2, Unlink } from 'lucide-react';
import useGoogleCalendar from '../../hooks/useGoogleCalendar';
import { useToast } from '../../context/ToastContext';
import { googleCalendarLink } from '../../utils/shift';
import { sameOffsetAsManila, shiftStartIn, utcOffset } from '../../utils/googleCalendar';

// Google Calendar in the day panel, as one compact line: "Google Calendar · Connected" plus the
// action that fits (Connect / Reconnect / Add shift / Added). Problems show underneath only when they happen.
// `shift` is null on a day off (then only the connection is shown).
export default function GoogleCalendarBox({ shift, date }) {
  const gcal = useGoogleCalendar();
  const showToast = useToast();
  const [busy, setBusy] = useState(''); // 'connect' | 'add'
  // The message belongs to the day it happened on, so picking another day clears it
  const dayId = date.toDateString();
  const [message, setMessage] = useState({ dayId, text: '' });
  const error = message.dayId === dayId ? message.text : '';
  const setError = (text) => setMessage({ dayId, text });

  const saved = shift ? gcal.savedEvent(shift, date) : null;
  const needsCheck = gcal.status === 'connected' && shift && saved === undefined;

  // Once connected, look up whether this day's shift is already in the calendar
  const check = useEffectEvent(() => gcal.checkShift(shift, date).catch((err) => setError(err.message)));
  useEffect(() => {
    if (needsCheck) check();
  }, [needsCheck, dayId]);

  const run = async (kind, fn) => {
    setBusy(kind);
    setError('');
    try {
      await fn();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  const connect = () =>
    run('connect', async () => {
      await gcal.connect();
      showToast('Google Calendar connected.');
    });

  const add = () =>
    run('add', async () => {
      const { existed } = await gcal.addShift(shift, date);
      showToast(existed ? 'This shift is already in your Google Calendar.' : `${shift.label} shift added to your Google Calendar.`);
    });

  const connected = gcal.status === 'connected';
  const privacy = 'Only your shift name and times are sent to Google, never resident details.';

  // One line: "Google Calendar · Connected" and the one action that fits right now
  let status;
  let action = null;
  if (!gcal.configured) {
    // No Client ID in client/.env: the simple "open Google Calendar" link
    status = 'Add your shift';
    if (shift) {
      action = (
        <a className="btn btn--soft btn--sm" href={googleCalendarLink(shift, date)} target="_blank" rel="noopener noreferrer">
          <CalendarPlus size={16} aria-hidden="true" /> Add<span className="sr-only"> this shift to Google Calendar (opens in a new tab)</span>
        </a>
      );
    }
  } else if (connected) {
    status = 'Connected';
    if (shift && saved) {
      action = (
        <a className="btn btn--outline btn--sm" href={saved.htmlLink} target="_blank" rel="noopener noreferrer">
          <CalendarCheck size={16} aria-hidden="true" /> Added<span className="sr-only">. Open it in Google Calendar (opens in a new tab)</span>
          <ExternalLink size={14} aria-hidden="true" />
        </a>
      );
    } else if (shift) {
      action = (
        <button type="button" className="btn btn--soft btn--sm" onClick={add} disabled={busy === 'add' || saved === undefined}>
          <CalendarPlus size={16} aria-hidden="true" />
          {busy === 'add' ? 'Adding…' : saved === undefined ? 'Checking…' : 'Add shift'}
        </button>
      );
    }
  } else {
    status = gcal.status === 'expired' ? 'Disconnected' : 'Not connected';
    action = (
      <button type="button" className="btn btn--soft btn--sm" onClick={connect} disabled={!gcal.ready || busy === 'connect'} aria-describedby="gcal-privacy">
        <Link2 size={16} aria-hidden="true" />
        {busy === 'connect' ? 'Waiting…' : !gcal.ready && !gcal.loadError ? 'Loading…' : gcal.status === 'expired' ? 'Reconnect' : 'Connect'}
      </button>
    );
  }

  return (
    <div className="gcal">
      <div className="gcal__line" title={connected ? `Connected as ${gcal.email || 'your Google account'}. ${privacy}` : privacy}>
        <CalendarDays size={18} aria-hidden="true" className="gcal__icon" />
        <p className="gcal__status" aria-live="polite">
          <strong>Google Calendar</strong>
          <span className="sr-only"> · </span>
          <span className={`gcal__state ${connected ? 'is-on' : ''}`}>{status}</span>
        </p>
        <span id="gcal-privacy" hidden>{privacy}</span>
        <span className="gcal__actions">
          {action}
          {connected && (
            <button
              type="button"
              className="icon-btn icon-btn--sm"
              onClick={() => { gcal.disconnect(); setError(''); }}
              aria-label={`Disconnect Google Calendar (${gcal.email || 'your Google account'})`}
              title="Disconnect"
            >
              <Unlink size={16} />
            </button>
          )}
        </span>
      </div>

      {/* Only when there is something to fix */}
      {connected && shift && !sameOffsetAsManila(gcal.calendarTz) && (
        <p className="gcal__tz">
          <Globe size={16} aria-hidden="true" />
          <span>
            Your Google Calendar uses {utcOffset(gcal.calendarTz)}, so this {shift.start} Manila shift shows there as{' '}
            <strong>{shiftStartIn(gcal.calendarTz, shift, date)}</strong>. Set its time zone to (GMT+08:00) Philippine Time to see Manila times.
          </span>
        </p>
      )}
      {(error || gcal.loadError) && (
        <p className="gcal__error" role="alert">
          <CircleAlert size={16} aria-hidden="true" /> {error || gcal.loadError.message}
        </p>
      )}
    </div>
  );
}
