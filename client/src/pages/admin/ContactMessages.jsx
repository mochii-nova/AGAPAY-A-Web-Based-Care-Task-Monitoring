import { useEffect, useRef, useState } from 'react';
import { Inbox, Mail, Check, Copy } from 'lucide-react';
import api from '../../api';
import { useToast } from '../../context/ToastContext';
import useApiData from '../../hooks/useApiData';
import { formatTime } from '../../utils/format';
import { copyText } from '../../utils/clipboard';
import PageHeader from '../../components/PageHeader';
import { LoadingState, ErrorState, EmptyState } from '../../components/StateMessage';
import '../../styles/tasks.css';
import '../../styles/admin.css';

const TABS = [
  { id: 'new', label: 'New', match: (m) => !m.handled },
  { id: 'handled', label: 'Handled', match: (m) => m.handled },
  { id: 'all', label: 'All', match: () => true },
];

const when = (date) =>
  `${new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}, ${formatTime(date)}`;

// The website form puts "Subject: …" on the first line; show it as the title
function split(text) {
  const match = text.match(/^Subject:\s*(.+)\n+([\s\S]*)$/);
  return match ? { subject: match[1].trim(), body: match[2].trim() } : { subject: '', body: text };
}

const QUOTE_LENGTH = 300; // the start of their message, quoted under the reply

// Gmail's "new message" page in the browser, with the address, "Re: <subject>" and a short quote of
// their message filled in. (A mailto: link does nothing on a laptop without an email app.)
function gmailReplyLink(m, subject, body) {
  const short = body.length > QUOTE_LENGTH ? `${body.slice(0, QUOTE_LENGTH).trimEnd()}…` : body;
  const quote = short.split('\n').map((line) => `> ${line}`).join('\n');
  const text = `Hi ${m.name.split(' ')[0]},\n\n\n\nOn ${when(m.createdAt)}, you wrote:\n${quote}`;
  const params = [
    ['view', 'cm'],
    ['fs', '1'],
    ['to', m.email],
    ['su', `Re: ${subject || 'Your message to Orchid Carehome'}`],
    ['body', text],
  ];
  return `https://mail.google.com/mail/?${params.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}`;
}

// Messages sent from the website's "Get in touch" form. Reply by email, then mark them handled.
export default function ContactMessages() {
  const query = useApiData('/contact', { refreshEvery: 60 * 1000 });
  const messages = query.data ?? [];
  const showToast = useToast();
  const [tab, setTab] = useState('new');
  const [busyId, setBusyId] = useState(null);
  const saving = useRef(new Set()); // messages being marked right now
  const [copiedId, setCopiedId] = useState(null); // "Copied" shows on that message's button for 2 s

  useEffect(() => {
    if (!copiedId) return undefined;
    const timer = setTimeout(() => setCopiedId(null), 2000);
    return () => clearTimeout(timer);
  }, [copiedId]);

  const copyEmail = async (m) => {
    if (await copyText(m.email)) setCopiedId(m.id);
    else showToast("Couldn't copy. Select the address and copy it instead.", 'error');
  };

  const counts = Object.fromEntries(TABS.map((t) => [t.id, messages.filter(t.match).length]));
  const shown = messages.filter(TABS.find((t) => t.id === tab).match);

  const markHandled = async (m) => {
    // A double-click is ignored while this message is being saved
    if (saving.current.has(m.id)) return;
    saving.current.add(m.id);
    setBusyId(m.id);
    try {
      await api.patch(`/contact/${m.id}/handled`);
      query.setData((list) => list.map((x) => (x.id === m.id ? { ...x, handled: true } : x)));
      showToast(`Marked ${m.name}'s message as handled.`);
    } catch (err) {
      showToast(err.response ? err.response.data?.message || "Couldn't save. Please try again." : "Can't reach the server. Please try again.", 'error');
    } finally {
      saving.current.delete(m.id);
      setBusyId(null);
    }
  };

  return (
    <div>
      <PageHeader title="Contact messages" subtitle="Messages from the website's contact form. Reply by email, then mark them as handled." />

      <div className="card tasks-card contact-card">
        <div className="tasks-toolbar">
          <div className="tabs tabs--flat" role="tablist" aria-label="Filter messages">
            {TABS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                role="tab"
                id={`ctab-${id}`}
                aria-selected={tab === id}
                aria-controls="contact-panel"
                className="tab"
                onClick={() => setTab(id)}
              >
                {label} <span className="tab__count">{counts[id]}</span>
              </button>
            ))}
          </div>
        </div>

        <section id="contact-panel" role="tabpanel" aria-labelledby={`ctab-${tab}`}>
          {query.status === 'loading' && <LoadingState label="Loading messages…" />}
          {query.status === 'error' && <ErrorState message={query.error} onRetry={query.reload} />}
          {query.status === 'ready' && shown.length === 0 && (
            <EmptyState icon={Inbox}>{tab === 'new' ? 'No new messages. You’re all caught up.' : 'No messages here yet.'}</EmptyState>
          )}
          {query.status === 'ready' && shown.length > 0 && (
            <ul className="contact-list">
              {shown.map((m) => {
                const { subject, body } = split(m.message);
                const reply = gmailReplyLink(m, subject, body);
                return (
                  <li key={m.id} className="contact-item">
                    <div className="contact-item__head">
                      <div>
                        <strong>{m.name}</strong>
                        <a href={`mailto:${m.email}`} className="contact-item__email">{m.email}</a>
                      </div>
                      <div className="contact-item__meta">
                        <span>{when(m.createdAt)}</span>
                        <span className={`status-pill status-pill--${m.handled ? 'completed' : 'pending'}`}>{m.handled ? 'Handled' : 'New'}</span>
                      </div>
                    </div>
                    {subject && <p className="contact-item__subject">{subject}</p>}
                    <p className="contact-item__body">{body}</p>
                    <div className="contact-item__actions">
                      <a
                        className="btn btn--outline btn--sm btn--row"
                        href={reply}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Reply to ${m.name} by email (opens Gmail in a new tab)`}
                      >
                        <Mail size={16} aria-hidden="true" /> Reply by email
                      </a>
                      <button
                        type="button"
                        className="btn btn--outline btn--sm btn--row"
                        onClick={() => copyEmail(m)}
                        aria-label={copiedId === m.id ? `Copied ${m.email}` : `Copy ${m.email}`}
                      >
                        {copiedId === m.id ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
                        <span aria-live="polite">{copiedId === m.id ? 'Copied' : 'Copy email'}</span>
                      </button>
                      {!m.handled && (
                        <button type="button" className="btn btn--outline btn--sm btn--row" disabled={busyId === m.id} onClick={() => markHandled(m)}>
                          <Check size={16} aria-hidden="true" /> {busyId === m.id ? 'Saving…' : 'Mark as handled'}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
