import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Logo from './Logo';
import ImageSlot from './ImageSlot';
import { images } from '../assets/images';
import '../styles/auth.css';

// Two-column frame for Sign In and Register: navy panel on the left (logo, photo, a short warm line),
// form on the right. The same panel on both pages.
export default function AuthLayout({ panelTitle, panelText, children }) {
  return (
    <div className="auth">
      <aside className="auth__panel">
        <Link to="/" className="auth__logo-link" aria-label="AGAPAY home">
          <Logo tone="white" height={40} className="auth__logo" />
        </Link>
        <ImageSlot image={images.authPanel} className="auth__photo" />
        <div className="auth__panel-text">
          <h2 className="auth__panel-title">{panelTitle}</h2>
          <p>{panelText}</p>
        </div>
      </aside>

      <main className="auth__main">
        <div className="auth__form-area">
          <Link to="/" className="auth__back">
            <ArrowLeft size={16} aria-hidden="true" /> Back to home
          </Link>
          {children}
        </div>
      </main>
    </div>
  );
}
