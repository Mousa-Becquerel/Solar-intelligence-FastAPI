/**
 * LandingPage Component
 * Main landing page that integrates all sections
 */

import { useState } from 'react';
import { Navigation } from '../../components/landing/Navigation';
import { HeroSection } from '../../components/landing/HeroSection';
import { FeatureHighlightSection } from '../../components/landing/FeatureHighlightSection';
import { AgentsSection } from '../../components/landing/AgentsSection';
import { WorkflowSection } from '../../components/landing/WorkflowSection';
import { ComparisonSection } from '../../components/landing/ComparisonSection';
import { FAQSection } from '../../components/landing/FAQSection';
import { Footer } from '../../components/landing/Footer';
import { ContactWidget } from '../../components/landing/ContactWidget';
import { useSmoothScroll } from '../../hooks/landing/useSmoothScroll';
import styles from './LandingPage.module.css';

export function LandingPage() {
  const [isContactOpen, setIsContactOpen] = useState(false);

  // Initialize smooth scrolling
  useSmoothScroll();

  return (
    <div className={styles.page}>
      <Navigation onContactClick={() => setIsContactOpen(true)} />
      <HeroSection />
      <FeatureHighlightSection />
      <AgentsSection />
      <WorkflowSection />
      <ComparisonSection />
      <FAQSection />
      <Footer onContactClick={() => setIsContactOpen(true)} />
      <ContactWidget isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
    </div>
  );
}
