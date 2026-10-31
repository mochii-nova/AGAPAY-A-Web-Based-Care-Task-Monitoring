import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Logo from './Logo';
import Modal from './Modal';
import '../styles/auth.css';

// Two-column frame for Sign In and Register: a rounded photo panel on the left (white logo on top,
// welcome text and the team credit at the bottom), the form on the cream on the right, with a small
// footer (copyright + Privacy) under it.
// photo = an imported image; photoPosition = which part of the photo stays in view when it is cropped
// (photoPositionPhone = the same for the short banner on phones).
export default function AuthLayout({
  photo, photoPosition = 'center', photoPositionPhone = photoPosition, panelTitle, panelTitleSoft, panelText, wide = false, children,
}) {
  const [privacyOpen, setPrivacyOpen] = useState(false);

  return (
    <div className="auth">
      <aside
        className="auth__panel"
        style={{
          '--auth-photo': `url(${photo})`,
          '--auth-photo-position': photoPosition,
          '--auth-photo-position-phone': photoPositionPhone,
        }}
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
          <p className="auth__credit">Developed by CTRL + SIA + PRAY · Universidad de Dagupan</p>
        </div>
      </aside>

      <main className="auth__main">
        <div className={`auth__form-area${wide ? ' auth__form-area--wide' : ''}`}>
          <Link to="/" className="auth__back">
            <ArrowLeft size={16} aria-hidden="true" /> Back to home
          </Link>
          {children}
          <footer className="auth__footer">
            <span>© 2026 AGAPAY · CTRL + SIA + PRAY</span>
            <button type="button" className="link-btn auth__privacy" onClick={() => setPrivacyOpen(true)}>Privacy</button>
          </footer>
        </div>
      </main>

      <Modal open={privacyOpen} onClose={() => setPrivacyOpen(false)} title="Privacy" size="sm"
        footer={<button type="button" className="btn btn--primary" onClick={() => setPrivacyOpen(false)}>Got it</button>}
      >
        <p>AGAPAY is a student project. Use test data only; don&apos;t enter real resident or health information.</p>
      </Modal>
    </div>
  );
}
