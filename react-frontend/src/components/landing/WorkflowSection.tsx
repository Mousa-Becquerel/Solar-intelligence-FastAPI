/**
 * WorkflowSection Component
 * Explains the user workflow in 4 steps
 */

import styles from './WorkflowSection.module.css';

const workflowSteps = [
  {
    id: 1,
    title: 'Ask',
    description: 'Ask in natural language: specify market, metric, and timeframe in one sentence',
    icon: (
      <svg className={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    features: [
      'Domain-aware queries (PV terms, units, definitions)',
      'Prompt templates for common tasks',
      'Smart filters (country, segment, technology)',
      'Saved/reproducible prompts',
    ],
  },
  {
    id: 2,
    title: 'Visualise',
    description: 'Generate presentation-grade charts and tables instantly',
    icon: (
      <svg className={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
    features: [
      'Auto-build time series, bar/stacked, pie chart comparisons',
      'Natural-language styling edits',
      'Annotations, callouts, and source captions',
      'One-click switch between chart and table',
    ],
  },
  {
    id: 3,
    title: 'Analyse',
    description: 'Agents provide additional insights and context to the numbers',
    icon: (
      <svg className={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
        />
      </svg>
    ),
    features: [
      'Policy and macro-insights from verified sources',
      'Scenarios and sensitivity (base/high/low)',
      'Segmentation logic by country/segment/technology',
      'Methodology notes and data-readiness indicators',
    ],
  },
  {
    id: 4,
    title: 'Deliver',
    description: 'Deliver board-ready slides and files, brand-aligned, in one click',
    icon: (
      <svg className={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
        />
      </svg>
    ),
    features: [
      'Professional slide templates with auto-insert visuals',
      'Brand AI support (logo, fonts, colour palette)',
      'Export charts as images/PDF and data as XLS/CSV',
      'Citations consolidated for traceability',
    ],
  },
];

export function WorkflowSection() {
  return (
    <section id="workflow" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            How it works: <span className={styles.accent}>from prompt to impact</span>
          </h2>
        </div>

        <div className={styles.grid}>
          {workflowSteps.map((step, index) => (
            <>
              <div key={step.id} className={styles.card} data-step={step.id}>
                <div className={styles.badge}>{String(step.id).padStart(2, '0')}</div>
                <div className={styles.iconContainer}>{step.icon}</div>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.description}>{step.description}</p>

                <div className={styles.features}>
                  <strong className={styles.featuresTitle}>Key features:</strong>
                  <ul className={styles.featuresList}>
                    {step.features.map((feature, idx) => (
                      <li key={idx} className={styles.featureItem}>
                        <span className={styles.bullet}>•</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Arrow between steps (hidden on mobile) */}
              {index < workflowSteps.length - 1 && (
                <div className={styles.arrow}>
                  <svg className={styles.arrowIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              )}
            </>
          ))}
        </div>
      </div>
    </section>
  );
}
