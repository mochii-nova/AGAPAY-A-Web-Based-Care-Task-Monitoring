import { ClipboardList } from 'lucide-react';
import { getCategory } from '../constants';

// Small icon for a task category (or a clipboard if the category is unknown)
export default function TaskCategoryIcon({ category, size = 18 }) {
  const found = getCategory(category);
  const Icon = found?.icon ?? ClipboardList;
  return (
    <span className="task-icon" title={found?.label}>
      <Icon size={size} aria-hidden="true" />
    </span>
  );
}
