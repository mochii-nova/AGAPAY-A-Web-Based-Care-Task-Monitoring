import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ImageSlot from '../ImageSlot';
import { images } from '../../assets/images';

// Top menu of the website. Links jump to each section of the page.
export default function SiteHeader({ sections, active }) {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const close = () => setMenuOpen(false);

  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <a href="#home" className="site-header__logo" aria-label="AGAPAY, back to top" onClick={close}>
          <ImageSlot image={images.logo} alt="AGAPAY" style={{ width: 180, height: 52 }} />
        </a>

        <button
          type="button"
          className="icon-btn site-header__toggle"
          onClick={() => setMenuOpen((o) => !o)}
          aria-expanded={menuOpen}
          aria-controls="site-menu"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        >
          {menuOpen ? <X size={26} /> : <Menu size={26} />}
        </button>

        <div id="site-menu" className={`site-header__menu ${menuOpen ? 'is-open' : ''}`}>
          <nav aria-label="Website sections">
            <ul className="site-nav">
              {sections.map(({ id, label }) => (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    className={`site-nav__link ${active === id ? 'is-active' : ''}`}
                    aria-current={active === id ? 'location' : undefined}
                    onClick={close}
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="site-header__cta">
            {user ? (
              <Link to="/dashboard" className="btn btn--primary">Open Dashboard</Link>
            ) : (
              <>
                <Link to="/login" className="btn btn--outline">Sign in</Link>
                <Link to="/register" className="btn btn--primary">Get Started</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
