import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Logo from '../Logo';

// Top menu of the website: a floating bar that stays visible while scrolling.
// Links jump to each section of the page.
export default function SiteHeader({ sections, active }) {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const close = () => setMenuOpen(false);

  // Once the Home section has scrolled away, the bar gets a soft shadow and gets a little shorter
  useEffect(() => {
    const hero = document.getElementById('home');
    if (!hero) return;
    const observer = new IntersectionObserver(([entry]) => setScrolled(!entry.isIntersecting), {
      rootMargin: '-120px 0px 0px 0px',
    });
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  return (
    <header className={`site-header ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="container">
        <div className="site-header__bar">
          <a href="#home" className="site-header__logo" aria-label="AGAPAY, back to top" onClick={close}>
            <Logo height={32} />
          </a>

          <button
            type="button"
            className="icon-btn site-header__toggle"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
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
                <Link to="/dashboard" className="btn btn--primary">Open dashboard</Link>
              ) : (
                <>
                  <Link to="/login" className="btn btn--outline">Sign in</Link>
                  <Link to="/register" className="btn btn--primary">Get started</Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
