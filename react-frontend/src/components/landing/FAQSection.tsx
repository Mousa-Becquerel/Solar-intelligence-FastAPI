/**
 * FAQSection Component
 * FAQ accordion with one-at-a-time behavior
 */

import { useAccordion } from '../../hooks/landing/useAccordion';
import styles from './FAQSection.module.css';

const faqData = [
  {
    question: 'What data sources does Solar Intelligence use?',
    answer:
      'Our platform integrates multiple authoritative sources including the European PV DataHub, market research reports, and real-time pricing feeds from global solar markets. We maintain 50,000+ validated data points across many regions, covering market capacity, module prices, technology trends, and industry news.',
  },
  {
    question: 'How do the AI agents differ from ChatGPT or other general AI tools?',
    answer:
      'Our AI agents are domain-aware specialists trained on solar market intelligence with direct access to proprietary databases. They understand PV terms, units, and definitions, provide validated insights with presentation-grade visualizations, and include methodology notes and sources for traceability—capabilities that general AI tools cannot offer.',
  },
  {
    question: 'Can I export the analysis and charts for presentations?',
    answer:
      'Yes! All visualizations and analyses can be exported as images/PDF or data as XLS/CSV. Our professional slide templates auto-insert edited visuals and analyses with brand AI support for logo, fonts, and colour palette. Generate board-ready presentations with citations consolidated for traceability.',
  },
  {
    question: 'What regions and markets does the platform cover?',
    answer:
      'Our platform covers 38 regions globally, with comprehensive data for Europe (including all EU member states), North America, China, India, and emerging solar markets. We provide regional breakdowns for market capacity, pricing trends, policy updates, and technology adoption.',
  },
  {
    question: 'How frequently is the data updated?',
    answer:
      'Market data and pricing information are updated from our integrated feeds. Historical datasets and research reports are updated monthly, while news and policy updates are refreshed weekly. Our AI agents always work with the most current available data to ensure accurate analysis.',
  },
];

export function FAQSection() {
  const accordion = useAccordion(0);

  return (
    <section id="faq" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.grid}>
          <div className={styles.header}>
            <h2 className={styles.title}>
              Frequently Asked <span className={styles.titleAccent}>Questions</span>
            </h2>
            <p className={styles.subtitle}>
              Discover valuable information about our platform, AI agents, data sources, and more.
            </p>
          </div>

          <div className={styles.faqColumn}>
            <div className={styles.faqContainer}>
              {faqData.map((faq, index) => (
                <div key={index} className={accordion.isActive(index) ? styles.faqItemActive : styles.faqItem}>
                  <button className={styles.faqQuestion} onClick={() => accordion.toggleItem(index)}>
                    <span>{faq.question}</span>
                    <svg className={styles.faqIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                  </button>
                  <div className={styles.faqAnswer}>
                    <p>{faq.answer}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
