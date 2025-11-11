/**
 * Chart Data Type Definitions
 * Types for D3 chart rendering in the landing page
 */

export type DataPoint = {
  category: number | string;
  series: string;
  value: number;
  formatted_value: string;
};

export type SeriesInfo = {
  name: string;
};

export type PlotType = 'stacked' | 'bar' | 'grouped';

export type PlotData = {
  data: DataPoint[];
  plot_type: PlotType;
  title: string;
  unit: string;
  x_axis_label: string;
  y_axis_label: string;
  series_info: SeriesInfo[];
};

export type ShowcaseChartData = {
  [key: number]: PlotData;
};
