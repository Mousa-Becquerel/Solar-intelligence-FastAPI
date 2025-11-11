/**
 * ShowcaseChart Component
 * D3.js chart for agent showcase cards
 */

import { useRef, useEffect } from 'react';
import { useD3Chart } from '../../hooks/landing/useD3Chart';
import type { PlotData } from '../../types/charts';
import styles from './ShowcaseChart.module.css';

interface ShowcaseChartProps {
  data: PlotData;
}

export function ShowcaseChart({ data }: ShowcaseChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  useD3Chart(chartRef, data);

  return (
    <div className={styles.chartContainer}>
      <div ref={chartRef} className={styles.chart} />
    </div>
  );
}
