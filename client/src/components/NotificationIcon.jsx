import { ClipboardList, TriangleAlert, FileText, CalendarDays, MessageSquare } from 'lucide-react';

const ICONS = {
  task: ClipboardList,
  overdue: TriangleAlert,
  handover: FileText,
  schedule: CalendarDays,
  message: MessageSquare,
};

// Round icon in front of each notification, coloured by its type
export default function NotificationIcon({ type }) {
  const Icon = ICONS[type] ?? ClipboardList;
  return (
    <span className={`notif-icon notif-icon--${type}`} aria-hidden="true">
      <Icon size={18} />
    </span>
  );
}
