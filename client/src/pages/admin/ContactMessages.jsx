import { useState } from 'react';
import { Inbox, Mail, Check } from 'lucide-react';
import api from '../../api';
import { useToast } from '../../context/ToastContext';
import useApiData from '../../hooks/useApiData';
import { formatTime } from '../../utils/format';
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

// Messages sent from the website's "Get in touch" form. Reply by email, then mark them handled.
export default function ContactMessages() {
  const query = useApiData('/contact', { refreshEvery: 60 * 1000 });
  const messages = query.data ?? [];
  const showToast = useToast();
  const [tab, setTab] = useState('new');
  const [busyId, setBusyId] = useState(null);

  const counts = Object.fromEntries(TABS.map((t) => [t.id, messages.filter(t.match).length]));
  const shown = messages.filter(TABS.find((t) => t.id === tab).match);

  const markHandled = async (m) => {
    setBusyId(m.id);
    try {
      await api.patch(`/contact/${m.id}/handled`);
      query.setData((list) => list.map((x) => (x.id === m.id ? { ...x, handled: true } : x)));
      showToast(`Marked ${m.name}'s message as handled.`);
    } catch (err) {
      showToast(err.response ? err.response.data?.message || "Couldn't save. Please try again." : "Can't reach the server. Please try again.", 'error');
    } finally {
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
                const reply = `mailto:${m.email}?subject=${encodeURIComponent(`Re: ${subject || 'Your message to Orchid Carehome'}`)}`;
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
                      <a className="btn btn--soft btn--sm" href={reply}>
                        <Mail size={16} aria-hidden="true" /> Reply by email
                      </a>
                      {!m.handled && (
                        <button type="button" className="btn btn--outline btn--sm" disabled={busyId === m.id} onClick={() => markHandled(m)}>
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
