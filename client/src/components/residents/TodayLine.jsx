import { getCategory } from '../../constants';

// Status words, most urgent first
const ORDER = ['overdue', 'pending', 'completed', 'skipped'];
const WORD = { overdue: 'overdue', pending: 'pending', completed: 'done', skipped: 'skipped' };

// "Today  Meals ● done   Medical care ● 1 overdue ● 1 pending": one item per task category in today's
// tasks, in the order they're due. Nothing at all when there are no tasks today.
// Uses only <span>s, so it can sit inside a card that is a button.
// `short`: the short category words of the list cards.
export default function TodayLine({ tasks, short = false }) {
  if (!tasks.length) return null;

  const groups = [];
  [...tasks]
    .sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt))
    .forEach((t) => {
      const key = t.category ?? 'other';
      let group = groups.find((g) => g.key === key);
      if (!group) {
        group = { key, counts: {}, total: 0 };
        groups.push(group);
      }
      group.counts[t.status] = (group.counts[t.status] ?? 0) + 1;
      group.total += 1;
    });

  return (
    <span className="today-line">
      <span className="today-line__label">Today</span>
      {groups.map((g) => {
        const category = getCategory(g.key);
        return (
          <span key={g.key} className="today-line__item">
            <span className="today-line__name">{category ? (short ? category.short : category.label) : 'Other'}</span>
            {ORDER.filter((s) => g.counts[s]).map((s) => (
              <span key={s} className={`status-pill status-pill--${s}`}>
                {g.total > 1 ? `${g.counts[s]} ` : ''}{WORD[s]}
              </span>
            ))}
          </span>
        );
      })}
    </span>
  );
}
