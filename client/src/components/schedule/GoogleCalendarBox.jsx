import { useEffect, useEffectEvent, useState } from 'react';
import { CalendarCheck, CalendarDays, CalendarPlus, CircleAlert, ExternalLink, Globe, Unlink } from 'lucide-react';
import useGoogleCalendar from '../../hooks/useGoogleCalendar';
import { useToast } from '../../context/ToastContext';
import { googleCalendarLink } from '../../utils/shift';
import { sameOffsetAsManila, shiftStartIn, utcOffset } from '../../utils/googleCalendar';

// Google Calendar in the day panel: a header (icon + "Google Calendar", and a "Connected" pill), one
// short line, then the buttons in one row: "Add this shift" (or "Added", which opens it) and
// "Disconnect"; when not connected, one full-width "Connect Google Calendar". Problems show below only
// when they happen.
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
  const account = gcal.email || 'your Google account';

  // The pill on the right of the header, and the buttons that fit right now
  let pill = null; // { text, tone }
  let main = null;
  if (!gcal.configured) {
    // No Client ID in client/.env: the simple "open Google Calendar" link
    if (shift) {
      main = (
        <a className="btn btn--primary" href={googleCalendarLink(shift, date)} target="_blank" rel="noopener noreferrer">
          <CalendarPlus size={18} aria-hidden="true" /> Add this shift<span className="sr-only"> to Google Calendar (opens in a new tab)</span>
        </a>
      );
    }
  } else if (connected) {
    pill = { text: 'Connected', tone: 'on' };
    if (shift && saved) {
      main = (
        <a className="btn btn--outline" href={saved.htmlLink} target="_blank" rel="noopener noreferrer" title="Open this shift in Google Calendar">
          <CalendarCheck size={18} aria-hidden="true" /> Added<span className="sr-only">. Open it in Google Calendar (opens in a new tab)</span>
          <ExternalLink size={14} aria-hidden="true" />
        </a>
      );
    } else if (shift) {
      main = (
        <button type="button" className="btn btn--primary" onClick={add} disabled={busy === 'add' || saved === undefined}>
          <CalendarPlus size={18} aria-hidden="true" /> {busy === 'add' ? 'Adding…' : saved === undefined ? 'Checking…' : 'Add this shift'}
        </button>
      );
    }
  } else {
    pill = { text: gcal.status === 'expired' ? 'Disconnected' : 'Not connected', tone: 'off' };
    // One full-width button
    main = (
      <button type="button" className="btn btn--primary" onClick={connect} disabled={!gcal.ready || busy === 'connect'} aria-describedby="gcal-privacy">
        <CalendarDays size={18} aria-hidden="true" />
        {busy === 'connect'
          ? 'Waiting…'
          : !gcal.ready && !gcal.loadError
            ? 'Loading…'
            : gcal.status === 'expired' ? 'Reconnect Google Calendar' : 'Connect Google Calendar'}
      </button>
    );
  }

  return (
    <div className="gcal" title={connected ? `Connected as ${account}. ${privacy}` : privacy}>
      {/* Header: icon + name on the left, the connection pill on the right */}
      <div className="gcal__head">
        <h3 className="gcal__title">
          <CalendarDays size={18} aria-hidden="true" /> Google Calendar
        </h3>
        {pill && <span className={`gcal__pill gcal__pill--${pill.tone}`} aria-live="polite">{pill.text}</span>}
      </div>
      <p className="gcal__intro">Add your shifts to your Google Calendar.</p>
      <span id="gcal-privacy" hidden>{privacy}</span>

      {/* Buttons in one row, sharing the width evenly */}
      {(main || connected) && (
        <div className="gcal__actions">
          {main}
          {connected && (
            <button
              type="button"
              className="btn btn--outline"
              onClick={() => { gcal.disconnect(); setError(''); }}
              aria-label={`Disconnect Google Calendar (${account})`}
              title={`Disconnect Google Calendar (${account})`}
            >
              <Unlink size={18} aria-hidden="true" /> Disconnect
            </button>
          )}
        </div>
      )}

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
