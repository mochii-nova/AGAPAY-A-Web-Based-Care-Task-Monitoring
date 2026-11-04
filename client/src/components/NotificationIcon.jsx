import { ClipboardCheck, Clock, FileText, CalendarDays, Mail, UserPlus } from 'lucide-react';

const ICONS = {
  task: ClipboardCheck,
  overdue: Clock,
  handover: FileText,
  schedule: CalendarDays,
  message: Mail,
  signup: UserPlus,
};

// Icon in a soft round circle in front of each notification
export default function NotificationIcon({ type }) {
  const Icon = ICONS[type] ?? ClipboardCheck;
  return (
    <span className={`notif-icon notif-icon--${type}`} aria-hidden="true">
      <Icon size={18} />
    </span>
  );
}
