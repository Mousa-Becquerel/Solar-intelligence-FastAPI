/**
 * WaitlistPage Component
 * Ported from templates/waitlist.html
 */

import { useState, FormEvent, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api';
import styles from './WaitlistPage.module.css';

interface AgentOption {
  value: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

const agentOptions: AgentOption[] = [
  {
    value: 'market',
    name: 'Market',
    description: 'Market analysis, trends and forecasts',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18"/>
        <path d="m19 9-5 5-4-4-3 3"/>
      </svg>
    ),
  },
  {
    value: 'price',
    name: 'Price',
    description: 'Price analytics & forecasts',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23"/>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    ),
  },
  {
    value: 'om',
    name: 'O&M',
    description: 'Operations & maintenance',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
      </svg>
    ),
  },
  {
    value: 'design',
    name: 'Design',
    description: 'System design & optimization',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
    ),
  },
  {
    value: 'news',
    name: 'News',
    description: 'Industry news & updates',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/>
        <path d="M18 14h-8"/>
        <path d="M15 18h-5"/>
        <path d="M10 6h8v4h-8V6Z"/>
      </svg>
    ),
  },
  {
    value: 'forecasting',
    name: 'Forecasting',
    description: 'Energy forecasting',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
      </svg>
    ),
  },
  {
    value: 'permitting',
    name: 'Permitting',
    description: 'Regulatory & compliance',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="9" y1="15" x2="15" y2="15"/>
        <line x1="9" y1="11" x2="15" y2="11"/>
      </svg>
    ),
  },
  {
    value: 'technology',
    name: 'Technology Knowledge',
    description: 'Technical expertise & insights',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
        <line x1="10" y1="10" x2="16" y2="10"/>
        <line x1="10" y1="14" x2="16" y2="14"/>
      </svg>
    ),
  },
];

const rotatingTexts = [
  'Next-generation AI for the photovoltaic market.',
  'Intelligent solar insights at your fingertips.',
  'Expert-level analysis. AI-powered efficiency.',
  'Transforming solar data into actionable intelligence.',
];

export function WaitlistPage() {
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [rotatingTextIndex, setRotatingTextIndex] = useState(0);
  const [isTextVisible, setIsTextVisible] = useState(true);

  // Rotating text effect
  useEffect(() => {
    const interval = setInterval(() => {
      setIsTextVisible(false);

      setTimeout(() => {
        setRotatingTextIndex((prevIndex) => (prevIndex + 1) % rotatingTexts.length);
        setIsTextVisible(true);
      }, 600);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const handleNextStep = (e: FormEvent) => {
    e.preventDefault();
    if (!email) {
      setMessage({ type: 'error', text: 'Please enter your email address.' });
      return;
    }
    setMessage(null);
    setCurrentStep(2);
  };

  const handleBackStep = () => {
    setCurrentStep(1);
    setMessage(null);
  };

  const toggleAgent = (agentValue: string) => {
    setSelectedAgents((prev) =>
      prev.includes(agentValue)
        ? prev.filter((a) => a !== agentValue)
        : [...prev, agentValue]
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      await apiClient.joinWaitlist(email, selectedAgents);
      setMessage({
        type: 'success',
        text: '✓ Thank you! We\'ll notify you at launch.',
      });
      // Reset form
      setEmail('');
      setSelectedAgents([]);
      setCurrentStep(1);
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Something went wrong. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.logoContainer}>
          <div className={styles.logo}>
            <div className={styles.logoWithSubtitle}>
              <img src="/logos/new_logo.svg" alt="Solar Intelligence" className={styles.logoImage} />
              <p className={styles.taglineSub}>Powered by Becquerel Institute</p>
            </div>
            <p className={styles.taglineMain}>Reliable solar insights. In seconds.</p>
          </div>
        </div>
        <div className={styles.headerActions}>
          <a href="#waitlist-form" className={styles.getAccessBtn}>Get Early Access</a>
          <Link to="/" className={styles.adminAccessLink}>Admin Access</Link>
        </div>
      </header>

      {/* Main Content */}
      <main className={styles.main}>
        <div className={styles.content}>
          <h1 className={styles.title}>
            <span className={`${styles.rotatingText} ${isTextVisible ? styles.visible : ''}`}>
              {rotatingTexts[rotatingTextIndex]}
            </span>
          </h1>
          <p className={styles.subtitle}>
            The first true fusion of AI agents and solar expertise.
          </p>
          <p className={styles.cta}>Be among the first to test Solarintelligence.ai for free!</p>

          {/* Messages */}
          {message && (
            <div className={message.type === 'error' ? styles.errorMessage : styles.successMessage}>
              <span>{message.text}</span>
            </div>
          )}

          {/* Waitlist Form */}
          <form id="waitlist-form" onSubmit={currentStep === 1 ? handleNextStep : handleSubmit} className={styles.form}>
            {/* Step 1: Email Input */}
            {currentStep === 1 && (
              <div className={styles.formStep}>
                <div className={styles.formGroup}>
                  <input
                    type="email"
                    id="waitlist-email"
                    name="email"
                    placeholder="Enter your email address..."
                    required
                    autoComplete="off"
                    className={styles.emailInput}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoFocus
                    disabled={isLoading}
                  />
                  <button type="submit" className={styles.submitBtn} disabled={isLoading}>
                    <span>Next</span>
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Agent Selection */}
            {currentStep === 2 && (
              <div className={styles.formStep}>
                <p className={styles.agentSelectionTitle}>Which agents interest you?</p>
                <p className={styles.agentSelectionSubtitle}>Select all that apply</p>

                <div className={styles.agentsGrid}>
                  {agentOptions.map((agent) => (
                    <label key={agent.value} className={styles.agentCard}>
                      <input
                        type="checkbox"
                        name="agents"
                        value={agent.value}
                        checked={selectedAgents.includes(agent.value)}
                        onChange={() => toggleAgent(agent.value)}
                      />
                      <div className={styles.agentCardContent}>
                        <div className={styles.agentIcon}>{agent.icon}</div>
                        <div className={styles.agentName}>{agent.name}</div>
                        <div className={styles.agentDescription}>{agent.description}</div>
                      </div>
                    </label>
                  ))}
                </div>

                <div className={styles.formActions}>
                  <button type="button" className={styles.backBtn} onClick={handleBackStep} disabled={isLoading}>
                    <span>← Back</span>
                  </button>
                  <button type="submit" className={styles.submitBtn} disabled={isLoading}>
                    <span>{isLoading ? 'Joining...' : 'Join Waitlist'}</span>
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <p>&copy; 2025 Solar Intelligence. Powered by <a href="https://www.becquerelinstitute.eu/" target="_blank" rel="noopener noreferrer">Becquerel Institute</a>.</p>
        <div className={styles.footerLinks}>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
        </div>
      </footer>
    </div>
  );
}

export default WaitlistPage;
