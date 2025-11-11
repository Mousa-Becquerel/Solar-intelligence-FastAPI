/**
 * Showcase Chart Data
 * Sample data for agent showcase carousel charts
 */

import type { ShowcaseChartData } from '../types/charts';

export const showcaseChartData: ShowcaseChartData = {
  1: {
    data: [
      { category: 2020, series: 'Centralised', value: 150, formatted_value: '150' },
      { category: 2020, series: 'Distributed', value: 635, formatted_value: '635' },
      { category: 2021, series: 'Centralised', value: 54.03, formatted_value: '54.0' },
      { category: 2021, series: 'Distributed', value: 890.22, formatted_value: '890' },
      { category: 2022, series: 'Centralised', value: 355, formatted_value: '355' },
      { category: 2022, series: 'Distributed', value: 2115, formatted_value: '2.1k' },
      { category: 2023, series: 'Centralised', value: 924, formatted_value: '924' },
      { category: 2023, series: 'Distributed', value: 4331, formatted_value: '4.3k' },
      { category: 2024, series: 'Centralised', value: 2246, formatted_value: '2.2k' },
      { category: 2024, series: 'Distributed', value: 4436, formatted_value: '4.4k' },
    ],
    plot_type: 'stacked',
    title: 'Annual Market by Connection Type',
    unit: 'MW',
    x_axis_label: '',
    y_axis_label: 'Capacity (MW)',
    series_info: [{ name: 'Centralised' }, { name: 'Distributed' }],
  },
  2: {
    data: [
      { category: 2022, series: 'China', value: 0.18, formatted_value: '$0.18' },
      { category: 2023, series: 'China', value: 0.12, formatted_value: '$0.12' },
      { category: 2024, series: 'China', value: 0.09, formatted_value: '$0.09' },
      { category: 2022, series: 'India', value: 0.24, formatted_value: '$0.24' },
      { category: 2023, series: 'India', value: 0.19, formatted_value: '$0.19' },
      { category: 2024, series: 'India', value: 0.15, formatted_value: '$0.15' },
    ],
    plot_type: 'bar',
    title: 'Module Prices: China vs India',
    unit: '$/W',
    x_axis_label: '',
    y_axis_label: 'Price ($/W)',
    series_info: [{ name: 'China' }, { name: 'India' }],
  },
};
