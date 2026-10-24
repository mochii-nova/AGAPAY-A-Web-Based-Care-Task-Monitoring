import { Link } from 'react-router-dom';
import { Users, ChevronRight } from 'lucide-react';
import CardHeader from '../CardHeader';
import Avatar from '../Avatar';

// Residents I care for, with how many tasks each has today. Click a row to open the profile.
export default function ResidentsCard({ residents, tasks }) {
  return (
    <section className="card">
      <CardHeader icon={Users} title="My Residents" linkTo="/residents">
        <span className="sample-tag" title="Residents aren't in the database yet">Sample data</span>
      </CardHeader>

      <ul className="resident-rows">
        {residents.map((r) => {
          const count = tasks.filter((t) => t.resident === r.name).length;
          return (
            <li key={r.id}>
              <Link to={`/residents?open=${r.id}`} className="resident-row">
                <Avatar name={r.name} photo={r.photo} size={42} />
                <span className="resident-row__main">
                  <strong>{r.name}</strong>
                  <small>{count} {count === 1 ? 'task' : 'tasks'} today</small>
                </span>
                <span className="resident-row__room">Room {r.room}</span>
                <ChevronRight size={18} aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
