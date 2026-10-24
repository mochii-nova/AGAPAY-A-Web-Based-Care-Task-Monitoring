import { Link } from 'react-router-dom';
import { ArrowLeft, Heart } from 'lucide-react';
import ImageSlot from './ImageSlot';
import { images } from '../assets/images';
import '../styles/auth.css';

// Two-column frame for Sign In and Register: navy panel on the left, form on the right
export default function AuthLayout({ panelTitle, panelContent, children }) {
  return (
    <div className="auth">
      <aside className="auth__panel">
        <div className="auth__panel-inner">
          <ImageSlot image={images.loginPanelLogo} alt="AGAPAY" className="auth__logo" />
          <h2 className="auth__panel-title">{panelTitle}</h2>
          <div className="auth__panel-content">{panelContent}</div>
        </div>
        <p className="auth__made-with">
          Made with <Heart size={16} fill="currentColor" className="auth__heart" aria-hidden="true" />
          <span className="sr-only">love</span> for Caregivers
        </p>
      </aside>

      <main className="auth__main">
        <Link to="/" className="auth__back">
          <ArrowLeft size={18} aria-hidden="true" /> Back to home
        </Link>
        <div className="auth__form-area">{children}</div>
      </main>
    </div>
  );
}
