import { RESIDENT_STATUS } from '../../utils/handover';

// The content of one submitted handover: residents to watch, passed-on and skipped tasks, other notes.
// Handovers written before this page existed only have plain text, so that is shown instead.
export default function HandoverView({ handover }) {
  const { data, text } = handover;
  if (!data) return <p className="handover-text">{text}</p>;

  const flagged = data.residents.filter((r) => r.status !== 'normal');
  const normal = data.residents.filter((r) => r.status === 'normal');
  const skipped = data.tasks.filter((t) => t.status === 'skipped');
  const { summary } = data;

  return (
    <div className="handover-view">
      {flagged.length > 0 && (
        <div className="hv-block">
          <h4 className="small-label">Residents to watch</h4>
          <ul className="hv-list">
            {flagged.map((r) => (
              <li key={r.name}>
                <span className="hv-line">
                  <span className={`status-pill status-pill--${RESIDENT_STATUS[r.status].tone}`}>
                    {RESIDENT_STATUS[r.status].label}
                  </span>
                  <strong>{r.name}</strong>
                  {r.room && <span className="hv-muted">Room {r.room}</span>}
                </span>
                <p>{r.note}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
      {normal.length > 0 && <p className="hv-muted">No changes: {normal.map((r) => r.name).join(', ')}</p>}

      {data.passOn.length > 0 && (
        <div className="hv-block">
          <h4 className="small-label">Passed on to the next shift</h4>
          <ul className="hv-list">
            {data.passOn.map((p) => (
              <li key={p.taskId}>
                <span className="hv-line">
                  <strong>{p.task}</strong>
                  <span className="hv-muted">{p.resident}</span>
                </span>
                {p.note && <p>{p.note}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {skipped.length > 0 && (
        <div className="hv-block">
          <h4 className="small-label">Skipped</h4>
          <ul className="hv-list">
            {skipped.map((t) => (
              <li key={t.id}>
                <span className="hv-line">
                  <strong>{t.task}</strong>
                  <span className="hv-muted">{t.resident}</span>
                </span>
                {t.reason && <p>Reason: {t.reason}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.other && (
        <div className="hv-block">
          <h4 className="small-label">Other notes</h4>
          <p className="hv-other">{data.other}</p>
        </div>
      )}

      <p className="hv-muted hv-summary">
        Tasks this shift: {summary.completed} completed, {summary.notFinished} not finished, {summary.skipped} skipped
      </p>
    </div>
  );
}
