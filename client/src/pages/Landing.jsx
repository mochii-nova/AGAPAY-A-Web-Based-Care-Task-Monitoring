import { useEffect, useState } from 'react';
import SiteHeader from '../components/landing/SiteHeader';
import HeroSection from '../components/landing/HeroSection';
import AboutSection from '../components/landing/AboutSection';
import FeaturesSection from '../components/landing/FeaturesSection';
import ContactSection from '../components/landing/ContactSection';
import SiteFooter from '../components/landing/SiteFooter';
import '../styles/landing.css';

const SECTIONS = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'features', label: 'Features' },
  { id: 'contact', label: 'Contact' },
];

// Which section is in the middle of the screen, so the menu can underline it
function useActiveSection() {
  const [active, setActive] = useState(SECTIONS[0].id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.isIntersecting && setActive(entry.target.id)),
      { rootMargin: '-45% 0px -50% 0px' }
    );
    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return active;
}

// The public website: one long page with Home, About, Features and Contact
export default function Landing() {
  const active = useActiveSection();

  // Opening the site at /#contact (or any section): the browser tries to jump before the page is
  // built, so jump once it is (the page's scroll-padding keeps the title below the header)
  useEffect(() => {
    const target = window.location.hash && document.getElementById(window.location.hash.slice(1));
    if (target) requestAnimationFrame(() => target.scrollIntoView());
  }, []);

  return (
    <div className="site">
      <SiteHeader sections={SECTIONS} active={active} />
      <main>
        <HeroSection />
        <AboutSection />
        <FeaturesSection />
        <ContactSection />
      </main>
      <SiteFooter />
    </div>
  );
}
