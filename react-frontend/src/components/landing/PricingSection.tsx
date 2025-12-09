/**
 * PricingSection Component
 * Pricing tiers display with Material Design 3 styling
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ContactWidget } from './ContactWidget';

interface PricingFeature {
  text: string;
  included: boolean;
}

interface PricingTier {
  name: string;
  tagline: string;
  price: string;
  period: string;
  features: PricingFeature[];
  buttonText: string;
  buttonAction: 'register' | 'contact' | 'upgrade';
  upgradeUrl?: string;
  highlighted?: boolean;
  popular?: boolean;
}

const pricingTiers: PricingTier[] = [
  {
    name: 'Scout',
    tagline: 'Explore the platform',
    price: '0',
    period: 'Free forever',
    features: [
      { text: '15 queries to try all agents', included: true },
      { text: 'Then 10 queries/day with Sam', included: true },
      { text: 'Basic chat functionality', included: true },
      { text: 'Data export', included: false },
    ],
    buttonText: 'Get Started',
    buttonAction: 'register',
  },
  {
    name: 'Analyst',
    tagline: 'For professionals',
    price: '99',
    period: 'per month',
    features: [
      { text: '6 AI Agents included', included: true },
      { text: 'Alex, Emma, Finn, Priya, Sam, Aniza', included: true },
      { text: 'Data & chart export (CSV, PNG)', included: true },
      { text: 'Email support', included: true },
    ],
    buttonText: 'Upgrade',
    buttonAction: 'upgrade',
    upgradeUrl: 'https://www.becquerelinstitute.eu/shop/solarintelligence-ai-monthly-subscription-70#attr=96',
  },
  {
    name: 'Strategist',
    tagline: 'Full access to all agents',
    price: '149',
    period: 'per month',
    features: [
      { text: 'All 8 AI Agents included', included: true },
      { text: 'Includes Nova & Nina', included: true },
      { text: '3x usage vs Analyst plan', included: true },
      { text: 'Priority data access', included: true },
      { text: 'Priority email support', included: true },
    ],
    buttonText: 'Upgrade',
    buttonAction: 'upgrade',
    upgradeUrl: 'https://www.becquerelinstitute.eu/shop/solarintelligence-ai-monthly-subscription-70#attr=97',
    highlighted: true,
    popular: true,
  },
  {
    name: 'Enterprise',
    tagline: 'For large teams',
    price: 'Custom',
    period: 'Contact us',
    features: [
      { text: 'All 8 AI Agents', included: true },
      { text: 'Custom integrations', included: true },
      { text: 'Dedicated account manager', included: true },
      { text: 'SLA & premium support', included: true },
    ],
    buttonText: 'Contact Sales',
    buttonAction: 'contact',
  },
];

export function PricingSection() {
  const navigate = useNavigate();
  const [isContactOpen, setIsContactOpen] = useState(false);

  const handleButtonClick = (tier: PricingTier) => {
    if (tier.buttonAction === 'register') {
      navigate('/register');
    } else if (tier.buttonAction === 'upgrade' && tier.upgradeUrl) {
      window.open(tier.upgradeUrl, '_blank', 'noopener,noreferrer');
    } else {
      // For 'contact' action, open contact modal
      setIsContactOpen(true);
    }
  };

  return (
    <section
      id="pricing"
      style={{
        padding: '6rem 0',
        background: 'linear-gradient(180deg, #060B5A 0%, #1e1b4b 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          maxWidth: '80rem',
          margin: '0 auto',
          padding: '0 2rem',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2
            style={{
              fontSize: '2.25rem',
              fontWeight: 400,
              marginBottom: '1rem',
              color: '#ffffff',
              fontFamily: "'Inter', 'Open Sans', sans-serif",
              letterSpacing: '-0.02em',
            }}
          >
            Simple, Transparent <span style={{ color: '#fbbf24', fontWeight: 600 }}>Pricing</span>
          </h2>
          <p
            style={{
              fontSize: '1rem',
              color: 'rgba(255, 255, 255, 0.7)',
              fontWeight: 300,
              lineHeight: 1.6,
              maxWidth: '600px',
              margin: '0 auto',
              fontFamily: "'Inter', 'Open Sans', sans-serif",
            }}
          >
            Choose the plan that fits your needs. All plans include access to our AI-powered solar
            intelligence platform.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div
          style={{
            display: 'grid',
            gap: '1.5rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          }}
        >
          {pricingTiers.map((tier, index) => (
            <div
              key={index}
              style={{
                background: tier.highlighted ? '#0a1850' : '#ffffff',
                borderRadius: '16px',
                padding: '1.75rem',
                display: 'flex',
                flexDirection: 'column',
                border: tier.highlighted ? '2px solid #fbbf24' : '1px solid rgba(10, 24, 80, 0.08)',
                position: 'relative',
                overflow: 'visible',
                transform: tier.highlighted ? 'scale(1.02)' : 'none',
              }}
            >
              {tier.popular && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#fbbf24',
                    color: '#0a1850',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '0.25rem 1rem',
                    borderRadius: '9999px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Most Popular
                </div>
              )}

              <div style={{ marginBottom: '1.25rem' }}>
                <h3
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 600,
                    color: tier.highlighted ? '#ffffff' : '#0a1850',
                    margin: '0 0 0.25rem 0',
                    fontFamily: "'Inter', 'Open Sans', sans-serif",
                  }}
                >
                  {tier.name}
                </h3>
                <p
                  style={{
                    fontSize: '0.875rem',
                    color: tier.highlighted ? 'rgba(255,255,255,0.7)' : '#64748b',
                    margin: 0,
                    fontWeight: 400,
                    fontFamily: "'Inter', 'Open Sans', sans-serif",
                  }}
                >
                  {tier.tagline}
                </p>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '0.125rem',
                  marginBottom: '0.25rem',
                }}
              >
                {tier.price !== 'Custom' ? (
                  <>
                    <span
                      style={{
                        fontSize: '1.25rem',
                        fontWeight: 500,
                        color: tier.highlighted ? '#ffffff' : '#0a1850',
                        fontFamily: "'Inter', 'Open Sans', sans-serif",
                      }}
                    >
                      €
                    </span>
                    <span
                      style={{
                        fontSize: '2.5rem',
                        fontWeight: 700,
                        color: tier.highlighted ? '#ffffff' : '#0a1850',
                        lineHeight: 1,
                        fontFamily: "'Inter', 'Open Sans', sans-serif",
                      }}
                    >
                      {tier.price}
                    </span>
                    <span
                      style={{
                        fontSize: '1rem',
                        fontWeight: 400,
                        color: tier.highlighted ? 'rgba(255,255,255,0.7)' : '#64748b',
                        marginLeft: '0.25rem',
                        fontFamily: "'Inter', 'Open Sans', sans-serif",
                      }}
                    >
                      / mo
                    </span>
                  </>
                ) : (
                  <span
                    style={{
                      fontSize: '2rem',
                      fontWeight: 600,
                      color: tier.highlighted ? '#ffffff' : '#0a1850',
                      fontFamily: "'Inter', 'Open Sans', sans-serif",
                    }}
                  >
                    {tier.price}
                  </span>
                )}
              </div>
              <p
                style={{
                  fontSize: '0.8125rem',
                  color: tier.highlighted ? 'rgba(255,255,255,0.6)' : '#94a3b8',
                  margin: '0 0 1.5rem 0',
                  fontWeight: 400,
                  fontFamily: "'Inter', 'Open Sans', sans-serif",
                }}
              >
                {tier.period}
              </p>

              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: '0 0 1.5rem 0',
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                {tier.features.map((feature, featureIndex) => (
                  <li
                    key={featureIndex}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.625rem',
                      fontSize: '0.875rem',
                      color: feature.included
                        ? tier.highlighted
                          ? 'rgba(255,255,255,0.9)'
                          : '#475569'
                        : tier.highlighted
                          ? 'rgba(255,255,255,0.4)'
                          : '#94a3b8',
                      fontFamily: "'Inter', 'Open Sans', sans-serif",
                      lineHeight: 1.4,
                    }}
                  >
                    <svg
                      style={{
                        width: '18px',
                        height: '18px',
                        flexShrink: 0,
                        marginTop: '1px',
                        color: feature.included ? '#22c55e' : '#cbd5e1',
                      }}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      {feature.included ? (
                        <polyline points="20 6 9 17 4 12" />
                      ) : (
                        <>
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </>
                      )}
                    </svg>
                    <span>{feature.text}</span>
                  </li>
                ))}
              </ul>

              <button
                style={{
                  width: '100%',
                  padding: '0.875rem 1.5rem',
                  borderRadius: '9999px',
                  fontSize: '0.9375rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontFamily: "'Inter', 'Open Sans', sans-serif",
                  border: tier.highlighted ? 'none' : '2px solid #0a1850',
                  background: tier.highlighted ? '#fbbf24' : 'transparent',
                  color: '#0a1850',
                  marginTop: 'auto',
                }}
                onClick={() => handleButtonClick(tier)}
                onMouseEnter={(e) => {
                  if (tier.highlighted) {
                    e.currentTarget.style.background = '#f59e0b';
                  } else {
                    e.currentTarget.style.background = '#0a1850';
                    e.currentTarget.style.color = '#ffffff';
                  }
                }}
                onMouseLeave={(e) => {
                  if (tier.highlighted) {
                    e.currentTarget.style.background = '#fbbf24';
                  } else {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#0a1850';
                  }
                }}
              >
                {tier.buttonText}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Contact Modal */}
      <ContactWidget isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
    </section>
  );
}

export default PricingSection;
