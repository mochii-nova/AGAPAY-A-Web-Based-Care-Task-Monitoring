import logo from '../assets/images/agapay-logo.svg';
import logoWhite from '../assets/images/agapay-logo-white.svg';

// The AGAPAY logo.
// tone="auto": dark logo on light pages, switches to the white logo in dark mode.
// tone="white": always white (for the navy sidebar, footer and Sign In panel).
export default function Logo({ tone = 'auto', height = 34, className = '' }) {
  const style = { height };
  if (tone === 'white') {
    return <img src={logoWhite} alt="AGAPAY" className={`logo ${className}`} style={style} />;
  }
  return (
    <span className={`logo logo--auto ${className}`}>
      <img src={logo} alt="AGAPAY" className="logo__light" style={style} />
      <img src={logoWhite} alt="" aria-hidden="true" className="logo__dark" style={style} />
    </span>
  );
}
