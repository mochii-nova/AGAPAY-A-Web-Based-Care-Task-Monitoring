// ALL pictures used by AGAPAY are listed here, in one place.
//
// Right now every `src` is null, so the app shows a lavender box with the label.
// To use a real picture:
//   1. Put the file in this folder (client/src/assets/images/), e.g. logo.png
//   2. Add an import at the top:       import logo from './logo.png';
//   3. Set it as the src below:         logo: { src: logo, ... }
// The box keeps the same size, so the layout won't move.
// `size` = the file to make (2× the size on screen, so it's sharp on phones).
// The full list with details is in design-reference/IMAGE-PLACEHOLDERS.md.
// (The logo is real now: agapay-logo*.svg in this folder, shown by components/Logo.jsx.)
// The Features screenshot is real too: Claire River's dashboard (light mode, real data), 1440 × 900.
// So is the About photo (about-caregiver.jpg). The hero photo is imported by HeroSection.jsx,
// and the Sign In / Register photos (signin-photo.webp, register-photo.webp) by Login.jsx and Register.jsx.

import featuresDashboard from './features-dashboard.webp';
import aboutCaregiver from './about-caregiver.jpg';
// Web-sized copy of the original contact-photo.jpg (kept in design-reference/)
import contactPhoto from './contact-photo.webp';

export const images = {
  hero: {
    src: null,
    label: 'Photo: a caregiver smiling while helping an elderly resident walk',
    file: 'hero.jpg',
    page: 'Home section',
    size: '1100 × 1100 px (square), JPG',
  },
  about: {
    src: aboutCaregiver,
    label: 'Photo: a caregiver smiling with an elderly resident',
    file: 'about-caregiver.jpg',
    page: 'About section (left of the text, about 420 px tall)',
    size: '748 × 749 px, JPG',
  },
  featuresLaptop: {
    src: featuresDashboard,
    label: 'Screenshot: the AGAPAY dashboard',
    file: 'features-dashboard.webp',
    page: 'Features section (inside the browser window)',
    size: '1440 × 900 px (16 : 10), WebP',
  },
  contact: {
    src: contactPhoto,
    label: 'A caregiver and a resident laughing together',
    file: 'contact-photo.webp',
    page: 'Contact section (under the contact details)',
    size: '736 × 396 px, WebP',
  },
};
