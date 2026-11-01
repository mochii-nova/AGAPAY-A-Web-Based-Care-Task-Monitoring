import { useEffect, useState } from 'react';
import SiteHeader from '../components/landing/SiteHeader';
import HeroSection from '../components/landing/HeroSection';
import HowItWorksSection from '../components/landing/HowItWorksSection';
import WhoSection from '../components/landing/WhoSection';
import FeaturesSection from '../components/landing/FeaturesSection';
import GettingStartedSection from '../components/landing/GettingStartedSection';
import AboutSection from '../components/landing/AboutSection';
import FaqSection from '../components/landing/FaqSection';
import ContactSection from '../components/landing/ContactSection';
import SiteFooter from '../components/landing/SiteFooter';
import '../styles/landing.css';

// The menu (the hero, id "home", is reached with the logo; "Who uses AGAPAY" and the FAQ from the page
// and the footer)
const SECTIONS = [
  { id: 'how', label: 'How it works' },
  { id: 'features', label: 'Features' },
  { id: 'start', label: 'Getting started' },
  { id: 'about', label: 'About' },
  { id: 'contact', label: 'Contact' },
];
// Every section, top to bottom (for knowing which one is on screen)
const ALL_SECTIONS = ['home', 'how', 'who', 'features', 'start', 'about', 'faq', 'contact'];

// Which section is in the middle of the screen, so the menu can highlight it
// (none over the hero, nor over a section that isn't in the menu)
function useActiveSection() {
  const [active, setActive] = useState(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.isIntersecting && setActive(entry.target.id === 'home' ? null : entry.target.id)),
      { rootMargin: '-45% 0px -50% 0px' }
    );
    ALL_SECTIONS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return active;
}

// The public website: one long page. Order: hero, How it works, Who uses AGAPAY, Features,
// Getting started, About, Questions, Contact, footer. Each section says something new.
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
        <HowItWorksSection />
        <WhoSection />
        <FeaturesSection />
        <GettingStartedSection />
        <AboutSection />
        <FaqSection />
        <ContactSection />
      </main>
      <SiteFooter />
    </div>
  );
}
