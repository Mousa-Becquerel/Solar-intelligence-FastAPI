/**
 * Optimization Results Panel
 *
 * Displays a list of optimization/simulation results and allows user to select one.
 * When multiple results are available, shows a list view similar to Claude's artifacts.
 * Clicking on a result shows its full dashboard.
 */

import { useState } from 'react';
import StorageOptimizationDashboard from './StorageOptimizationDashboard';
import type { DashboardData } from './StorageOptimizationDashboard';

// Theme colors matching the app's design
const THEME = {
  primary: {
    dark: '#0a1850',
    main: '#1e1b4b',
    light: '#312e81',
  },
  accent: {
    main: '#E9A544',
    light: '#E8BF4F',
  },
  success: '#10b981',
  neutral: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
  },
};

interface OptimizationResult {
  label: string;
  data: DashboardData;
}

interface OptimizationResultsPanelProps {
  results: OptimizationResult[];
}

// Icon components
const ChartIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 20V10M12 20V4M6 20v-6" />
  </svg>
);

const DownloadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7,10 12,15 17,10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const BackIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="15,18 9,12 15,6" />
  </svg>
);

export default function OptimizationResultsPanel({ results }: OptimizationResultsPanelProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // If only one result, show dashboard directly (no list view)
  if (results.length === 1) {
    return <StorageOptimizationDashboard data={results[0].data} />;
  }

  // If a result is selected, show its dashboard with back button
  if (selectedIndex !== null) {
    const selectedResult = results[selectedIndex];
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Back button header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '16px 24px',
            background: '#ffffff',
            borderBottom: `1px solid ${THEME.neutral[200]}`,
          }}
        >
          <button
            onClick={() => setSelectedIndex(null)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: THEME.neutral[100],
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              color: THEME.neutral[700],
              fontSize: '14px',
              fontWeight: 500,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = THEME.neutral[200];
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = THEME.neutral[100];
            }}
          >
            <BackIcon />
            Back to Results
          </button>
          <span style={{ color: THEME.neutral[500], fontSize: '14px' }}>
            {selectedResult.label}
          </span>
        </div>
        {/* Dashboard content */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          <StorageOptimizationDashboard data={selectedResult.data} />
        </div>
      </div>
    );
  }

  // Show list of results
  return (
    <div
      style={{
        padding: '24px',
        background: THEME.neutral[50],
        minHeight: '100%',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: `linear-gradient(135deg, ${THEME.primary.dark} 0%, ${THEME.primary.main} 50%, ${THEME.primary.light} 100%)`,
          borderRadius: '16px',
          padding: '20px 24px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 10px 40px rgba(10, 24, 80, 0.3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: THEME.accent.main,
            }}
          >
            <ChartIcon />
          </div>
          <div>
            <h2 style={{ margin: 0, color: 'white', fontSize: '18px', fontWeight: 600 }}>
              Optimization Results
            </h2>
            <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>
              {results.length} configurations generated
            </p>
          </div>
        </div>
      </div>

      {/* Results list */}
      <div
        style={{
          background: 'white',
          borderRadius: '12px',
          border: `1px solid ${THEME.neutral[200]}`,
          overflow: 'hidden',
        }}
      >
        {/* List header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            borderBottom: `1px solid ${THEME.neutral[100]}`,
          }}
        >
          <span style={{ fontSize: '14px', fontWeight: 600, color: THEME.neutral[700] }}>
            Results
          </span>
        </div>

        {/* Results items */}
        {results.map((result, index) => {
          const design = result.data.optimized_design;
          const npv = design?.npv || 0;
          const selfSufficiency = (design?.self_sufficiency_ratio || 0) * 100;

          return (
            <div
              key={index}
              onClick={() => setSelectedIndex(index)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: index < results.length - 1 ? `1px solid ${THEME.neutral[100]}` : 'none',
                cursor: 'pointer',
                transition: 'background 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = THEME.neutral[50];
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                {/* Document icon */}
                <div
                  style={{
                    width: '40px',
                    height: '48px',
                    background: THEME.neutral[100],
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: THEME.neutral[500],
                    position: 'relative',
                  }}
                >
                  <svg width="20" height="24" viewBox="0 0 20 24" fill="none">
                    <path
                      d="M2 4C2 2.89543 2.89543 2 4 2H12L18 8V20C18 21.1046 17.1046 22 16 22H4C2.89543 22 2 21.1046 2 20V4Z"
                      fill={THEME.neutral[200]}
                      stroke={THEME.neutral[400]}
                      strokeWidth="1"
                    />
                    <path d="M12 2V8H18" fill={THEME.neutral[100]} stroke={THEME.neutral[400]} strokeWidth="1"/>
                    <rect x="5" y="12" width="10" height="1.5" rx="0.75" fill={THEME.neutral[400]}/>
                    <rect x="5" y="15" width="7" height="1.5" rx="0.75" fill={THEME.neutral[400]}/>
                  </svg>
                  {/* Strategy badge */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '-4px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: result.data.strategy === 'economic' ? '#dbeafe' : '#dcfce7',
                      color: result.data.strategy === 'economic' ? '#1e40af' : '#166534',
                      fontSize: '7px',
                      fontWeight: 700,
                      padding: '2px 4px',
                      borderRadius: '3px',
                      whiteSpace: 'nowrap',
                      textTransform: 'uppercase',
                      letterSpacing: '0.3px',
                    }}
                  >
                    {result.data.strategy === 'economic' ? 'NPV' : result.data.strategy === 'simulation' ? 'SIM' : 'SC'}
                  </div>
                </div>

                {/* Result info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: 500,
                      color: THEME.neutral[800],
                      marginBottom: '4px',
                    }}
                  >
                    {result.label}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: '16px',
                      fontSize: '12px',
                      color: THEME.neutral[500],
                    }}
                  >
                    <span>
                      NPV: <span style={{ color: npv >= 0 ? THEME.success : '#ef4444', fontWeight: 500 }}>
                        €{npv.toLocaleString('de-DE', { maximumFractionDigits: 0 })}
                      </span>
                    </span>
                    <span>
                      Self-Sufficiency: <span style={{ color: THEME.neutral[700], fontWeight: 500 }}>
                        {selfSufficiency.toFixed(1)}%
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Download icon placeholder */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Could implement download functionality here
                }}
                style={{
                  padding: '8px',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  color: THEME.neutral[400],
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = THEME.neutral[100];
                  e.currentTarget.style.color = THEME.neutral[600];
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = THEME.neutral[400];
                }}
                title="Download results"
              >
                <DownloadIcon />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
