// ALL pictures used by AGAPAY are listed here, in one place.
//
// Right now every `src` is null, so the app shows a lavender box with the label.
// To use a real picture:
//   1. Put the file in this folder (client/src/assets/images/), e.g. logo.png
//   2. Add an import at the top:       import logo from './logo.png';
//   3. Set it as the src below:         logo: { src: logo, ... }
// The box keeps the same size, so the layout won't move.

export const images = {
  logo: {
    src: null,
    label: 'LOGO',
    file: 'logo.png',
    page: 'Website header, sidebar',
    size: '400 × 120 px, transparent PNG',
  },
  logoWhite: {
    src: null,
    label: 'LOGO (white)',
    file: 'logo-white.png',
    page: 'Footer, Sign In / Register side panel',
    size: '400 × 120 px, transparent PNG',
  },
  hero: {
    src: null,
    label: 'HERO PHOTO – caregiver with resident',
    file: 'hero.png',
    page: 'Home section',
    size: '900 × 1000 px, transparent PNG',
  },
  about: {
    src: null,
    label: 'ABOUT PHOTO – holding hands',
    file: 'about.jpg',
    page: 'About section',
    size: '1200 × 460 px',
  },
  featuresLaptop: {
    src: null,
    label: 'FEATURES LAPTOP SCREENSHOT',
    file: 'features-laptop.png',
    page: 'Features section',
    size: '1200 × 800 px, transparent PNG',
  },
  contact: {
    src: null,
    label: 'CONTACT PHOTO',
    file: 'contact.png',
    page: 'Contact section',
    size: '700 × 900 px, transparent PNG',
  },
  loginPanelLogo: {
    src: null,
    label: 'LOGIN SIDE PANEL LOGO',
    file: 'login-logo.png',
    page: 'Sign In and Register side panel',
    size: '520 × 140 px, transparent PNG',
  },
};
