/**
 * Landing Page
 * Main marketing/landing page for Solar Intelligence
 * 100% visual parity with templates/landing.html
 */

import { useEffect } from 'react';
import HeroSection from '../components/landing/HeroSection';
import FeatureHighlight from '../components/landing/FeatureHighlight';
import AgentsSection from '../components/landing/AgentsSection';
import WorkflowSection from '../components/landing/WorkflowSection';
import ComparisonSection from '../components/landing/ComparisonSection';
import FAQSection from '../components/landing/FAQSection';
import Footer from '../components/landing/Footer';
import ContactWidget from '../components/landing/ContactWidget';
import '../styles/landing.css';

export default function LandingPage() {
  useEffect(() => {
    // Apply landing page specific body styles
    document.body.style.fontFamily = "'Inter', sans-serif";
    document.body.style.background = `
      radial-gradient(circle at 20% 30%, rgba(251, 191, 36, 0.15) 0%, transparent 50%),
      radial-gradient(circle at 80% 70%, rgba(139, 92, 246, 0.12) 0%, transparent 50%),
      radial-gradient(circle at 50% 50%, rgba(4, 11, 89, 0.4) 0%, transparent 70%),
      linear-gradient(135deg, #0a1850 0%, #1e1b4b 30%, #312e81 60%, #3730a3 100%)
    `;
    document.body.style.backgroundSize = '100% 100%, 100% 100%, 100% 100%, 100% 100%';
    document.body.style.backgroundAttachment = 'scroll';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.overflowX = 'hidden';

    // Cleanup on unmount
    return () => {
      document.body.style.fontFamily = '';
      document.body.style.background = '';
      document.body.style.backgroundSize = '';
      document.body.style.backgroundAttachment = '';
      document.body.style.margin = '';
      document.body.style.padding = '';
      document.body.style.overflowX = '';
    };
  }, []);

  return (
    <div className="landing-page">
      <HeroSection />
      <FeatureHighlight />
      <AgentsSection />
      <WorkflowSection />
      <ComparisonSection />
      <FAQSection />
      <Footer />
      <ContactWidget />
    </div>
  );
}
