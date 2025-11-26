/**
 * Plot Message Component
 *
 * Renders interactive D3 charts exactly like Flask version
 * Uses the same chart-utils.js library for 100% visual parity
 */

import { useEffect, useRef } from 'react';

interface PlotData {
  plot_type: string;
  title: string;
  x_axis_label?: string;
  y_axis_label?: string;
  unit?: string;
  data: any[];
  series_info?: Record<string, any>;
  description?: string;
}

interface PlotMessageProps {
  plotData: PlotData;
}

// Declare global renderD3Chart function from chart-utils.js
declare global {
  interface Window {
    renderD3Chart: (containerId: string, plotData: any) => void;
    d3: any;
  }
}

export default function PlotMessage({ plotData }: PlotMessageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const plotId = useRef(`plot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const renderAttemptedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || !plotData) {
      return;
    }

    renderAttemptedRef.current = false;

    // Wait for D3 and renderD3Chart to be available
    const renderChart = () => {
      if (renderAttemptedRef.current) {
        return; // Prevent duplicate renders
      }

      if (!containerRef.current) {
        return;
      }

      // Check if container has proper dimensions
      const rect = containerRef.current.getBoundingClientRect();

      // Log full parent chain for debugging width constraints
      let elem = containerRef.current.parentElement;
      let depth = 0;
      while (elem && depth < 5) {
        const parentRect = elem.getBoundingClientRect();
        const styles = window.getComputedStyle(elem);
        elem = elem.parentElement;
        depth++;
      }

      if (rect.width < 200) {
        console.warn(`⚠️ [PlotMessage] Container too narrow (${rect.width}px), waiting for proper sizing...`);
        return; // Don't render yet, wait for ResizeObserver to trigger
      }

      if (typeof window.d3 === 'undefined') {
        console.error('❌ D3.js not loaded');
        if (containerRef.current) {
          containerRef.current.innerHTML =
            '<div style="padding: 2rem; text-align: center; color: #ef4444; background: #fef2f2; border-radius: 8px;">D3.js library is required for interactive charts. Please refresh the page.</div>';
        }
        return;
      }

      if (typeof window.renderD3Chart !== 'function') {
        console.error('❌ renderD3Chart function not found');
        if (containerRef.current) {
          containerRef.current.innerHTML =
            '<div style="padding: 2rem; text-align: center; color: #ef4444; background: #fef2f2; border-radius: 8px;">Chart rendering function not available. Please refresh the page.</div>';
        }
        return;
      }

      if (!plotData.data || !Array.isArray(plotData.data) || plotData.data.length === 0) {
        console.error('❌ Invalid plot data:', plotData);
        if (containerRef.current) {
          containerRef.current.innerHTML =
            '<div style="padding: 2rem; text-align: center; color: #ef4444; background: #fef2f2; border-radius: 8px;">Plot data is corrupted or incomplete. The chart cannot be rendered.</div>';
        }
        return;
      }

      renderAttemptedRef.current = true;

      try {
        window.renderD3Chart(plotId.current, plotData);
      } catch (error) {
        console.error('❌ Error rendering D3 chart:', error);
        if (containerRef.current) {
          containerRef.current.innerHTML = `<div style="padding: 2rem; text-align: center; color: #ef4444; background: #fef2f2; border-radius: 8px;">Error rendering chart: ${error instanceof Error ? error.message : 'Unknown error'}<br><br>Check console for details.</div>`;
        }
      }
    };

    // Use ResizeObserver to detect when container is properly sized
    resizeObserverRef.current = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        if (width >= 200 && !renderAttemptedRef.current) {
          renderChart();
        }
      }
    });

    if (containerRef.current) {
      resizeObserverRef.current.observe(containerRef.current);
    }

    // Also try to render after a delay as fallback
    const timer = setTimeout(renderChart, 500);

    return () => {
      clearTimeout(timer);
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, [plotData]);

  if (!plotData || !plotData.data || plotData.data.length === 0) {
    return (
      <div
        style={{
          padding: '2rem',
          textAlign: 'center',
          color: '#ef4444',
          background: '#fef2f2',
          borderRadius: '8px',
          border: '1px solid #fecaca',
          marginTop: '0.5rem',
        }}
      >
        ⚠️ Plot data is missing or incomplete
      </div>
    );
  }

  return (
    <div
      style={{
        marginTop: '0.5rem',
      }}
    >
      {/* D3 Chart Container - styled exactly like Flask */}
      <div
        ref={containerRef}
        id={plotId.current}
        className="interactive-chart-container"
        style={{
          width: '100%',
          minHeight: '600px',
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          position: 'relative',
        }}
      />

      {/* Description/Commentary - styled exactly like Flask */}
      {plotData.description && (
        <div
          style={{
            marginTop: '1rem',
            padding: '1rem',
            background: '#f9fafb',
            borderLeft: '3px solid #EB8F47',
            borderRadius: '4px',
            fontSize: '0.9rem',
            lineHeight: '1.6',
            color: '#374151',
          }}
        >
          {plotData.description}
        </div>
      )}
    </div>
  );
}
