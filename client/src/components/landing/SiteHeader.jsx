import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Logo from '../Logo';
import { homeFor } from '../../utils/roles';

// Top menu of the website. Over the hero photo it is see-through with white text;
// once the hero has scrolled away it becomes the white floating bar.
// Links jump to each section of the page.
export default function SiteHeader({ sections, active }) {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const close = () => setMenuOpen(false);
  // Solid white bar after the hero, and while the phone menu is open (so it stays readable)
  const solid = scrolled || menuOpen;

  // Watch the hero: once it has scrolled up under the header, switch to the white bar
  useEffect(() => {
    const hero = document.getElementById('home');
    if (!hero) return;
    const observer = new IntersectionObserver(([entry]) => setScrolled(!entry.isIntersecting), {
      rootMargin: '-96px 0px 0px 0px',
    });
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  // The logo is a real link to "/"; on this page it glides back to the top instead of reloading
  const toTop = (e) => {
    e.preventDefault();
    close();
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    if (window.location.hash) window.history.replaceState(null, '', '/');
  };

  return (
    <header className={`site-header ${solid ? 'is-solid' : 'is-clear'}`}>
      <div className="container">
        <div className="site-header__bar">
          <a href="/" className="site-header__logo" aria-label="AGAPAY home" onClick={toTop}>
            <Logo tone={solid ? 'auto' : 'white'} height={32} />
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
                <Link to={homeFor(user)} className="btn btn--primary">Open dashboard</Link>
              ) : (
                <>
                  <Link to="/login" className="btn btn--outline site-header__signin">Sign in</Link>
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
