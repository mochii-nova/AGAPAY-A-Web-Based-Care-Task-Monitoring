import { percent } from '../../utils/reports';

// Bars: the share of each day's due tasks marked Completed (one series, so no legend;
// the card title names it). Hover or focus a bar for the numbers; the table below has them all.
// days: [{ ymd, short: 'Tue 27', long: 'Tue, Oct 27', stats }]
export default function CompletionChart({ days }) {
  // Many days: label every few so they don't collide
  const every = days.length > 16 ? 5 : days.length > 10 ? 2 : 1;

  return (
    <div className="bar-chart" role="group" aria-label="Completion by day">
      <div className="bar-chart__plot">
        {days.map((d) => {
          const { rate, completed, due, skipped, notDone } = d.stats;
          const tip = due
            ? `${d.long}: ${completed} of ${due} done (${percent(rate)}) · ${skipped} skipped · ${notDone} not done`
            : `${d.long}: no tasks due`;
          return (
            <div key={d.ymd} className="bar-chart__col" tabIndex={0} aria-label={tip} data-tip={tip}>
              {rate != null && (
                <>
                  {/* Short ranges label every bar; longer ones only the lowest and highest day */}
                  {d.labelled && <span className="bar-chart__value" aria-hidden="true">{percent(rate)}</span>}
                  <span className="bar-chart__bar" style={{ height: `${Math.max(rate, 1)}%` }} aria-hidden="true" />
                </>
              )}
              {rate == null && <span className="bar-chart__none" aria-hidden="true">–</span>}
            </div>
          );
        })}
      </div>
      <div className="bar-chart__axis" aria-hidden="true">
        {days.map((d, i) => (
          <span key={d.ymd}>{i % every === 0 || i === days.length - 1 ? d.short : ''}</span>
        ))}
      </div>
    </div>
  );
}
