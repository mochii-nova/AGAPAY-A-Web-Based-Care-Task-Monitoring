import { Link } from 'react-router-dom';
import Logo from '../Logo';

const TEAM = ['Aeron Supremido', 'Veronica Abalos', 'Gianem Austria', 'Princess Cruz', 'Alodia De Guzman', 'Charissa Panotes'];

// Light footer: logo + one line, Product links, the reference facility, the team; then the bottom line
export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__top">
        <div className="site-footer__brand">
          <Logo height={32} />
          <p>Care task monitoring and shift handover for care homes.</p>
        </div>

        <nav aria-labelledby="footer-product">
          <h2 id="footer-product" className="site-footer__title">Product</h2>
          <ul className="site-footer__list">
            <li><a href="#how" className="site-footer__link">How it works</a></li>
            <li><a href="#features" className="site-footer__link">Features</a></li>
            <li><Link to="/login" className="site-footer__link">Sign in</Link></li>
          </ul>
        </nav>

        <div>
          <h2 className="site-footer__title">Reference facility</h2>
          <address className="site-footer__list">
            <span>Orchid Care Home, Inc.</span>
            <span>301 Bolosan Old Road</span>
            <span>Dagupan City, Pangasinan</span>
          </address>
        </div>

        <div>
          <h2 className="site-footer__title">Team</h2>
          <ul className="site-footer__list">
            {TEAM.map((name) => <li key={name}>{name}</li>)}
          </ul>
        </div>
      </div>

      {/* Inside the container (not on it), so its line only spans the columns and keeps its top margin */}
      <div className="container">
        <div className="site-footer__bottom">
          <p>© 2026 AGAPAY. All rights reserved.</p>
          <p>CTRL + SIA + PRAY · BSIT, Universidad de Dagupan</p>
        </div>
      </div>
    </footer>
  );
}
