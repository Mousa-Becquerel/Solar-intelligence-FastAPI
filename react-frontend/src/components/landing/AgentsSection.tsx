/**
 * AgentsSection Component
 * Introduces the AI agents and their capabilities
 */

import styles from './AgentsSection.module.css';

const agents = [
  {
    id: 'alex',
    name: 'Alex',
    subtitle: 'Market Analysis',
    description: 'Analyzes global solar trends, capacity data, and regional insights with interactive visualizations.',
    tags: ['Market Trends', 'Capacity Data', 'Regional Insights'],
    icon: (
      <svg className={styles.iconSvg} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
  },
  {
    id: 'maya',
    name: 'Maya',
    subtitle: 'Price Analysis',
    description: 'Tracks module pricing, cost breakdowns, and technology comparisons with validated DataHub data.',
    tags: ['Module Prices', 'Cost Analysis', 'Tech Comparison'],
    icon: (
      <svg className={styles.iconSvg} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
        />
      </svg>
    ),
  },
  {
    id: 'luna',
    name: 'Luna',
    subtitle: 'News Analysis',
    description: 'Analyzes solar industry news, policy updates, and market developments from reliable sources.',
    tags: ['Industry News', 'Policy Updates', 'Market Trends'],
    icon: (
      <svg className={styles.iconSvg} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H15"
        />
      </svg>
    ),
  },
  {
    id: 'nova',
    name: 'Nova',
    subtitle: 'Digitalization',
    description: 'Expert in digitalization and AI integration across the PV value chain with Industry 4.0 insights.',
    tags: ['Industry 4.0', 'AI Integration', 'Automation'],
    icon: (
      <svg className={styles.iconSvg} fill="currentColor" viewBox="0 0 20 20">
        <path d="M13 7H7v6h6V7z"></path>
        <path
          fillRule="evenodd"
          d="M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h2a2 2 0 012 2v2h1a1 1 0 110 2h-1v2h1a1 1 0 110 2h-1v2a2 2 0 01-2 2h-2v1a1 1 0 11-2 0v-1H9v1a1 1 0 11-2 0v-1H5a2 2 0 01-2-2v-2H2a1 1 0 110-2h1V9H2a1 1 0 010-2h1V5a2 2 0 012-2h2V2zM5 5h10v10H5V5z"
          clipRule="evenodd"
        ></path>
      </svg>
    ),
  },
];

export function AgentsSection() {
  return (
    <section id="agents" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h3 className={styles.title}>
            Our <span className={styles.accent}>AI Agents</span>
          </h3>
          <p className={styles.subtitle}>Specialized assistants for solar market intelligence</p>
        </div>

        <div className={styles.grid}>
          {agents.map((agent) => (
            <div key={agent.id} className={`${styles.card} ${styles[`${agent.id}Card`]}`}>
              <div className={styles.cardHeader}>
                <div className={styles.icon}>{agent.icon}</div>
                <div>
                  <h4 className={styles.agentName}>{agent.name}</h4>
                  <p className={styles.agentSubtitle}>{agent.subtitle}</p>
                </div>
              </div>

              <p className={styles.description}>{agent.description}</p>

              <a href="/login" className={styles.exploreBtn}>
                <span>Explore</span>
                <svg className={styles.btnIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
