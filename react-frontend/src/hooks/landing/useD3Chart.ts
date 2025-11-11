/**
 * useD3Chart Hook
 * Integrates D3.js chart rendering with React
 * Ported EXACTLY from static/js/landing-charts.js
 */

import { useEffect, type RefObject } from 'react';
import * as d3 from 'd3';
import type { PlotData } from '../../types/charts';

export function useD3Chart(ref: RefObject<HTMLDivElement>, data: PlotData | null) {
  useEffect(() => {
    if (!ref.current || !data) return;

    // Clear previous chart
    d3.select(ref.current).selectAll('*').remove();

    // Render chart
    renderShowcaseChart(ref.current, data);
  }, [ref, data]);
}

/**
 * Render a showcase chart using D3.js
 * Ported EXACTLY from landing-charts.js renderShowcaseChart function
 */
function renderShowcaseChart(container: HTMLElement, plotData: PlotData) {
  const containerSelection = d3.select(container);
  containerSelection.selectAll('*').remove();

  const margin = { top: 30, right: 30, bottom: 55, left: 60 };
  const width = 420 - margin.left - margin.right;
  const height = 220 - margin.top - margin.bottom;

  const svg = containerSelection
    .append('svg')
    .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')
    .style('width', '100%')
    .style('height', '100%')
    .style('font-family', 'Inter, sans-serif');

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  // Add subtle background
  g.append('rect')
    .attr('width', width)
    .attr('height', height)
    .attr('fill', '#fafafa')
    .attr('rx', 4);

  // Extract data
  const data = plotData.data;
  const categories = [...new Set(data.map((d) => d.category))];
  const series = plotData.series_info.map((s) => s.name);

  // Create scales
  const x = d3
    .scaleBand()
    .domain(categories.map(String))
    .range([0, width])
    .padding(0.35)
    .paddingOuter(0.2);

  const y = d3
    .scaleLinear()
    .domain([0, (d3.max(data, (d) => d.value) || 0) * 1.15])
    .nice()
    .range([height - 5, 5]);

  const color = d3
    .scaleOrdinal<string>()
    .domain(series)
    .range(['#E9A544', '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b']);

  // Add horizontal grid lines
  g.append('g')
    .attr('class', 'grid')
    .selectAll('line')
    .data(y.ticks(5))
    .join('line')
    .attr('x1', 0)
    .attr('x2', width)
    .attr('y1', (d) => y(d))
    .attr('y2', (d) => y(d))
    .attr('stroke', '#e5e7eb')
    .attr('stroke-width', 1)
    .attr('stroke-dasharray', '2,2');

  // Draw X axis
  const xAxis = g.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x).tickSize(0));

  xAxis.select('.domain').attr('stroke', '#d1d5db').attr('stroke-width', 1.5);

  xAxis.selectAll('text').style('font-size', '11px').style('font-weight', '500').style('fill', '#374151').attr('dy', '0.8em');

  // Draw Y axis
  const yAxis = g.append('g').call(d3.axisLeft(y).ticks(5).tickSize(0).tickPadding(8));

  yAxis.select('.domain').attr('stroke', '#d1d5db').attr('stroke-width', 1.5);

  yAxis.selectAll('text').style('font-size', '10px').style('font-weight', '500').style('fill', '#6b7280');

  // Y-axis label
  g.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('y', -45)
    .attr('x', -height / 2)
    .attr('text-anchor', 'middle')
    .style('font-size', '11px')
    .style('font-weight', '600')
    .style('fill', '#4b5563')
    .text(plotData.y_axis_label || '');

  if (plotData.plot_type === 'stacked') {
    // Stacked bar chart
    const stack = d3
      .stack<{ category: string | number }>()
      .keys(series)
      .value((d, key) => {
        const item = data.find((item) => String(item.category) === String(d.category) && item.series === key);
        return item ? item.value : 0;
      });

    const stackedData = stack(categories.map((cat) => ({ category: cat })));

    g.selectAll('g.series')
      .data(stackedData)
      .join('g')
      .attr('class', 'series')
      .attr('fill', (d) => color(d.key))
      .selectAll('rect')
      .data((d) => d)
      .join('rect')
      .attr('x', (d, i) => x(String(categories[i])) || 0)
      .attr('y', (d) => y(d[1]))
      .attr('height', (d) => y(d[0]) - y(d[1]))
      .attr('width', x.bandwidth())
      .attr('rx', 0)
      .style('transition', 'all 0.3s ease')
      .on('mouseover', function () {
        d3.select(this).style('opacity', 0.8).attr('transform', 'scale(1.02)');
      })
      .on('mouseout', function () {
        d3.select(this).style('opacity', 1).attr('transform', 'scale(1)');
      });
  } else {
    // Grouped bar chart
    const x1 = d3.scaleBand().domain(series).range([0, x.bandwidth()]).padding(0.1);

    categories.forEach((category) => {
      const categoryGroup = g.append('g').attr('transform', `translate(${x(String(category))},0)`);

      series.forEach((seriesName) => {
        const dataPoint = data.find((d) => String(d.category) === String(category) && d.series === seriesName);
        if (dataPoint) {
          categoryGroup
            .append('rect')
            .attr('x', x1(seriesName) || 0)
            .attr('y', y(dataPoint.value))
            .attr('width', x1.bandwidth())
            .attr('height', height - y(dataPoint.value))
            .attr('fill', color(seriesName))
            .attr('rx', 3)
            .style('transition', 'all 0.3s ease')
            .on('mouseover', function () {
              d3.select(this).style('opacity', 0.8).attr('transform', 'scale(1.05)');
            })
            .on('mouseout', function () {
              d3.select(this).style('opacity', 1).attr('transform', 'scale(1)');
            });
        }
      });
    });
  }

  // Add legend if multiple series
  if (series.length > 1) {
    const legend = svg
      .append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${margin.left}, ${height + margin.top + 35})`);

    const legendItems = legend
      .selectAll('.legend-item')
      .data(series)
      .join('g')
      .attr('class', 'legend-item')
      .attr('transform', (d, i) => `translate(${i * 100}, 0)`);

    legendItems.append('rect').attr('width', 12).attr('height', 12).attr('rx', 2).attr('fill', (d) => color(d));

    legendItems
      .append('text')
      .attr('x', 18)
      .attr('y', 9)
      .style('font-size', '10px')
      .style('font-weight', '500')
      .style('fill', '#4b5563')
      .text((d) => d);
  }
}
