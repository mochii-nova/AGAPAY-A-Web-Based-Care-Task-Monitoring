import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Logo from './Logo';
import '../styles/auth.css';

// Two-column frame for Sign In and Register: a rounded photo panel on the left (white logo on top,
// welcome text at the bottom), the form on the cream on the right.
// photo = an imported image; photoPosition = which part of the photo stays in view when it is cropped.
export default function AuthLayout({ photo, photoPosition = 'center', panelTitle, panelTitleSoft, panelText, wide = false, children }) {
  return (
    <div className="auth">
      <aside
        className="auth__panel"
        style={{ '--auth-photo': `url(${photo})`, '--auth-photo-position': photoPosition }}
      >
        <Link to="/" className="auth__logo-link" aria-label="AGAPAY home">
          <Logo tone="white" height={40} className="auth__logo" />
        </Link>
        <div className="auth__panel-text">
          <h2 className="auth__panel-title">
            <span className="auth__panel-line">{panelTitle}</span>{' '}
            <span className="auth__panel-line auth__panel-line--soft">{panelTitleSoft}</span>
          </h2>
          <p>{panelText}</p>
        </div>
      </aside>

      <main className="auth__main">
        <div className={`auth__form-area${wide ? ' auth__form-area--wide' : ''}`}>
          <Link to="/" className="auth__back">
            <ArrowLeft size={16} aria-hidden="true" /> Back to home
          </Link>
          {children}
        </div>
      </main>
    </div>
  );
}
