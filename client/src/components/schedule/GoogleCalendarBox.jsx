import { useEffect, useEffectEvent, useState } from 'react';
import { CalendarPlus, CalendarCheck, CircleAlert, ExternalLink, Globe, Link2 } from 'lucide-react';
import useGoogleCalendar from '../../hooks/useGoogleCalendar';
import { useToast } from '../../context/ToastContext';
import { googleCalendarLink } from '../../utils/shift';
import { sameOffsetAsManila, shiftStartIn, utcOffset } from '../../utils/googleCalendar';

// Google Calendar part of the day panel: connect, add this day's shift, and connection status.
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

  // No Client ID in client/.env: fall back to the simple "open Google Calendar" link
  if (!gcal.configured) {
    return shift ? (
      <a className="btn btn--soft gcal__btn" href={googleCalendarLink(shift, date)} target="_blank" rel="noopener noreferrer">
        <CalendarPlus size={16} aria-hidden="true" /> Add to Google Calendar
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    ) : null;
  }

  const connected = gcal.status === 'connected';

  return (
    <div className="gcal">
      {connected && shift && (saved ? (
        <>
          <p className="gcal__added">
            <CalendarCheck size={16} aria-hidden="true" /> In your Google Calendar
          </p>
          <a className="btn btn--outline gcal__btn" href={saved.htmlLink} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={16} aria-hidden="true" /> Open in Google Calendar
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </>
      ) : (
        <button type="button" className="btn btn--soft gcal__btn" onClick={add} disabled={busy === 'add' || saved === undefined}>
          <CalendarPlus size={16} aria-hidden="true" />
          {busy === 'add' ? 'Adding…' : saved === undefined ? 'Checking your calendar…' : 'Add to Google Calendar'}
        </button>
      ))}

      {connected && shift && !sameOffsetAsManila(gcal.calendarTz) && (
        <p className="gcal__tz">
          <Globe size={16} aria-hidden="true" />
          <span>
            Your Google Calendar uses {utcOffset(gcal.calendarTz)}, so this {shift.start} Manila shift shows there as{' '}
            <strong>{shiftStartIn(gcal.calendarTz, shift, date)}</strong>. To see Manila times, set Google Calendar →
            Settings → Time zone to (GMT+08:00) Philippine Time.
          </span>
        </p>
      )}

      {!connected && (
        <button type="button" className="btn btn--soft gcal__btn" onClick={connect} disabled={!gcal.ready || busy === 'connect'}>
          <Link2 size={16} aria-hidden="true" />
          {busy === 'connect'
            ? 'Waiting for Google…'
            : !gcal.ready && !gcal.loadError
              ? 'Loading Google…'
              : gcal.status === 'expired' ? 'Reconnect Google Calendar' : 'Connect Google Calendar'}
        </button>
      )}

      {(error || gcal.loadError) && (
        <p className="gcal__error" role="alert">
          <CircleAlert size={16} aria-hidden="true" /> {error || gcal.loadError.message}
        </p>
      )}

      <p className="gcal__status" aria-live="polite">
        {connected ? (
          <>
            Connected as <strong>{gcal.email || 'your Google account'}</strong> ·{' '}
            <button type="button" className="link-btn" onClick={() => { gcal.disconnect(); setError(''); }}>
              Disconnect
            </button>
          </>
        ) : gcal.status === 'expired' ? (
          <>The connection to <strong>{gcal.lastEmail}</strong> ended. Reconnect to add shifts.</>
        ) : (
          'Only your shift name and times are sent to Google, never resident details.'
        )}
      </p>
    </div>
  );
}
