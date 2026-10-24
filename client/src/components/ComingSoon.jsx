import { Clock } from 'lucide-react';

// Temporary card for pages that are built in a later phase
export default function ComingSoon({ phase, children }) {
  return (
    <div className="card empty-state">
      <Clock size={32} aria-hidden="true" />
      <p><strong>This page is built in Phase {phase}.</strong></p>
      {children && <p>{children}</p>}
    </div>
  );
}
