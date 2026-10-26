import { Link } from 'react-router-dom';
import Avatar from '../Avatar';
import { RESIDENT_STATUS } from '../../utils/handover';

// A row of small resident cards. "Watch" / "Urgent" comes from the latest handover.
export default function ResidentsCard({ residents, statusOf }) {
  return (
    <section className="dash-residents" aria-labelledby="dash-residents-title">
      <header className="dash-residents__head">
        <h2 id="dash-residents-title">My residents</h2>
        <Link to="/residents" className="card__link">See all</Link>
      </header>

      <ul className="resident-tiles">
        {residents.map((r) => {
          const status = statusOf(r.name);
          return (
            <li key={r.id}>
              {/* The resident code (RP-2020-001), so the link works on the Residents page */}
              <Link to={`/residents?open=${r.residentCode ?? r.id}`} className="resident-tile">
                <Avatar name={r.name} photo={r.photo} size={40} />
                <span className="resident-tile__main">
                  <strong>{r.name}</strong>
                  <small>Room {r.room}</small>
                </span>
                {status && status !== 'normal' && (
                  <span className={`status-pill status-pill--${RESIDENT_STATUS[status].tone}`}>
                    {status === 'watch' ? 'Watch' : RESIDENT_STATUS[status].label}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
