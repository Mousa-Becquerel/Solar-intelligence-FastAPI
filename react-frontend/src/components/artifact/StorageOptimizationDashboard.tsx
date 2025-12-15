/**
 * Storage Optimization Dashboard Component
 *
 * Modern, clean dashboard for storage optimization results
 * Uses the app's theme colors and Recharts for visualization
 */

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  Cell,
} from 'recharts';

// Theme colors matching the app's design system
const THEME = {
  // Primary colors (dark blue gradient)
  primary: {
    dark: '#0a1850',
    main: '#1e1b4b',
    light: '#312e81',
  },
  // Accent colors (gold/orange)
  accent: {
    main: '#E9A544',
    light: '#E8BF4F',
    dark: '#d69438',
  },
  // Semantic colors
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  // Chart colors (harmonious palette - solar + battery only)
  chart: {
    solar: '#E9A544',      // Gold for PV/Solar
    battery: '#10b981',    // Emerald for Battery
    demand: '#ef4444',     // Red for Demand
    grid: '#8b5cf6',       // Purple for Grid
    cashFlow: '#22c55e',   // Green for positive cash flow
    npv: '#3b82f6',        // Blue for NPV
    selfConsumed: '#10b981',
    exported: '#6366f1',
  },
  // Neutral colors
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
    900: '#111827',
  },
};

// Types for dashboard data (solar + battery only, wind removed)
interface OptimizedDesign {
  pv_size: number;
  battery_size: number;
  self_consumption_ratio: number;
  self_sufficiency_ratio: number;
  npv: number;
  pv_self_consumption: number;
  pv_export: number;
}

interface CashFlow {
  year: number;
  grid_savings: number;
  feed_in_revenue: number;
  operational_costs: number;
  battery_replacement: number;
  cash_flow: number;
  cumulative_npv: number;
}

interface DailyProfilePoint {
  hour: number;
  pv_generation: number;  // snake_case from backend
  demand: number;
  battery_charge: number;  // snake_case from backend
  grid_tariff: number;  // snake_case from backend
}

interface ExportTariffSample {
  hour: number;
  tariff: number;
}

export interface DashboardData {
  optimized_design: OptimizedDesign;
  cash_flows: CashFlow[];
  daily_profile_june: DailyProfilePoint[];
  daily_profile_december: DailyProfilePoint[];
  export_tariff_sample: ExportTariffSample[];
  strategy: string;
}

interface StorageOptimizationDashboardProps {
  data: DashboardData;
}

// Custom tooltip component for modern look
const CustomTooltip = ({ active, payload, label, formatter }: any) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.98)',
          border: 'none',
          borderRadius: '12px',
          padding: '12px 16px',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <p style={{ margin: 0, fontWeight: 600, color: THEME.neutral[800], marginBottom: '8px' }}>
          {label}
        </p>
        {payload.map((entry: any, index: number) => (
          <p
            key={index}
            style={{
              margin: '4px 0',
              fontSize: '13px',
              color: entry.color,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: entry.color,
                display: 'inline-block',
              }}
            />
            <span style={{ color: THEME.neutral[600] }}>{entry.name}:</span>
            <span style={{ fontWeight: 600, color: THEME.neutral[800] }}>
              {formatter ? formatter(entry.value) : entry.value}
            </span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Stat card component
const StatCard = ({
  label,
  value,
  unit,
  color,
  icon,
  subtitle,
}: {
  label: string;
  value: string;
  unit: string;
  color: string;
  icon: React.ReactNode;
  subtitle?: string;
}) => (
  <div
    style={{
      background: 'white',
      borderRadius: '16px',
      padding: '20px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '16px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
      border: `1px solid ${THEME.neutral[100]}`,
      transition: 'all 0.2s ease',
    }}
  >
    <div
      style={{
        width: '48px',
        height: '48px',
        borderRadius: '12px',
        background: `linear-gradient(135deg, ${color}20, ${color}10)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: color,
        flexShrink: 0,
      }}
    >
      {icon}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <p
        style={{
          margin: 0,
          fontSize: '13px',
          color: THEME.neutral[500],
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        {label}
      </p>
      <p
        style={{
          margin: '4px 0 0',
          fontSize: '24px',
          fontWeight: 700,
          color: color,
          display: 'flex',
          alignItems: 'baseline',
          gap: '4px',
        }}
      >
        {value}
        <span style={{ fontSize: '14px', fontWeight: 500, color: THEME.neutral[400] }}>{unit}</span>
      </p>
      {subtitle && (
        <p style={{ margin: '4px 0 0', fontSize: '12px', color: THEME.neutral[400] }}>{subtitle}</p>
      )}
    </div>
  </div>
);

// Chart card wrapper
const ChartCard = ({
  title,
  children,
  subtitle,
}: {
  title: string;
  children: React.ReactNode;
  subtitle?: string;
}) => (
  <div
    style={{
      background: 'white',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
      border: `1px solid ${THEME.neutral[100]}`,
    }}
  >
    <div style={{ marginBottom: '20px' }}>
      <h4
        style={{
          margin: 0,
          fontSize: '16px',
          fontWeight: 600,
          color: THEME.neutral[800],
        }}
      >
        {title}
      </h4>
      {subtitle && (
        <p style={{ margin: '4px 0 0', fontSize: '13px', color: THEME.neutral[500] }}>{subtitle}</p>
      )}
    </div>
    {children}
  </div>
);

// Icons as SVG components
const SolarIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </svg>
);

const BatteryIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="1" y="6" width="18" height="12" rx="2" ry="2" />
    <line x1="23" y1="13" x2="23" y2="11" />
    <rect x="4" y="9" width="6" height="6" fill="currentColor" opacity="0.3" />
  </svg>
);

const ChartIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 20V10M12 20V4M6 20v-6" />
  </svg>
);

const TrendUpIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23,6 13.5,15.5 8.5,10.5 1,18" />
    <polyline points="17,6 23,6 23,12" />
  </svg>
);

const PercentIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="19" y1="5" x2="5" y2="19" />
    <circle cx="6.5" cy="6.5" r="2.5" />
    <circle cx="17.5" cy="17.5" r="2.5" />
  </svg>
);

export default function StorageOptimizationDashboard({ data }: StorageOptimizationDashboardProps) {
  const { optimized_design, cash_flows, daily_profile_june, daily_profile_december, export_tariff_sample, strategy } =
    data;

  // Transform cash flow data for charts
  const cashFlowChartData = useMemo(() => {
    return cash_flows.map((cf) => ({
      year: `Y${cf.year}`,
      cashFlow: cf.cash_flow,
      cumulativeNPV: cf.cumulative_npv,
      gridSavings: cf.grid_savings,
      feedInRevenue: cf.feed_in_revenue,
      operationalCosts: -Math.abs(cf.operational_costs),
      batteryReplacement: -Math.abs(cf.battery_replacement),
    }));
  }, [cash_flows]);

  // Generation mix data (solar only)
  const generationMixData = useMemo(() => {
    return [
      {
        name: 'Solar PV',
        selfConsumption: optimized_design?.pv_self_consumption || 0,
        exported: optimized_design?.pv_export || 0,
      },
    ];
  }, [optimized_design]);

  // Strategy display name
  const strategyDisplayName = useMemo(() => {
    switch (strategy) {
      case 'self_consumption':
        return 'Self-Consumption Optimized';
      case 'economic':
        return 'NPV Optimized';
      case 'simulation':
        return 'Custom Simulation';
      default:
        return strategy;
    }
  }, [strategy]);

  const formatCurrency = (value: number) => `€${value.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  const formatEnergy = (value: number) => `${value.toFixed(1)} kWh`;

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
          borderRadius: '20px',
          padding: '24px 28px',
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
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={THEME.accent.main} strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          </div>
          <div>
            <h2 style={{ margin: 0, color: 'white', fontSize: '20px', fontWeight: 600 }}>
              Storage Optimization Results
            </h2>
            <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>
              {strategyDisplayName}
            </p>
          </div>
        </div>
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            padding: '8px 16px',
          }}
        >
          <span style={{ color: THEME.accent.main, fontWeight: 600, fontSize: '14px' }}>
            20-Year Analysis
          </span>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <StatCard
          label="Solar PV"
          value={(optimized_design?.pv_size ?? 0).toFixed(1)}
          unit="kWp"
          color={THEME.chart.solar}
          icon={<SolarIcon />}
        />
        <StatCard
          label="Battery Storage"
          value={(optimized_design?.battery_size ?? 0).toFixed(1)}
          unit="kWh"
          color={THEME.chart.battery}
          icon={<BatteryIcon />}
        />
        <StatCard
          label="Net Present Value"
          value={formatCurrency(optimized_design?.npv ?? 0)}
          unit=""
          color={(optimized_design?.npv ?? 0) >= 0 ? THEME.success : THEME.error}
          icon={<TrendUpIcon />}
        />
        <StatCard
          label="Self-Consumption"
          value={((optimized_design?.self_consumption_ratio ?? 0) * 100).toFixed(1)}
          unit="%"
          color={THEME.chart.solar}
          icon={<PercentIcon />}
          subtitle="of generation used on-site"
        />
        <StatCard
          label="Self-Sufficiency"
          value={((optimized_design?.self_sufficiency_ratio ?? 0) * 100).toFixed(1)}
          unit="%"
          color={THEME.success}
          icon={<ChartIcon />}
          subtitle="of demand met by self-generation"
        />
      </div>

      {/* Charts Row 1: Financial */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px', marginBottom: '20px' }}>
        <ChartCard title="Annual Cash Flow" subtitle="Net cash flow per year">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={cashFlowChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={THEME.neutral[200]} vertical={false} />
              <XAxis
                dataKey="year"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: THEME.neutral[500] }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: THEME.neutral[500] }}
                tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                content={<CustomTooltip formatter={(v: number) => formatCurrency(v)} />}
              />
              <Bar
                dataKey="cashFlow"
                name="Cash Flow"
                radius={[6, 6, 0, 0]}
              >
                {cashFlowChartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.cashFlow >= 0 ? THEME.chart.cashFlow : THEME.error}
                    opacity={0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Cumulative NPV" subtitle="Running total net present value">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={cashFlowChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="npvGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={THEME.chart.npv} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={THEME.chart.npv} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={THEME.neutral[200]} vertical={false} />
              <XAxis
                dataKey="year"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: THEME.neutral[500] }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: THEME.neutral[500] }}
                tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                content={<CustomTooltip formatter={(v: number) => formatCurrency(v)} />}
              />
              <Area
                type="monotone"
                dataKey="cumulativeNPV"
                name="Cumulative NPV"
                stroke={THEME.chart.npv}
                strokeWidth={3}
                fill="url(#npvGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts Row 2: Daily Profiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px', marginBottom: '20px' }}>
        {daily_profile_june && daily_profile_june.length > 0 && (
          <ChartCard title="Daily Profile - Summer (June)" subtitle="Typical summer day energy flow">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={daily_profile_june} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={THEME.neutral[200]} vertical={false} />
                <XAxis
                  dataKey="hour"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: THEME.neutral[500] }}
                  tickFormatter={(h) => `${h}:00`}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: THEME.neutral[500] }}
                />
                <Tooltip
                  content={<CustomTooltip formatter={(v: number) => `${v.toFixed(2)} kW`} />}
                />
                <Legend
                  wrapperStyle={{ paddingTop: '10px' }}
                  iconType="circle"
                  iconSize={8}
                />
                <Line type="monotone" dataKey="pv_generation" name="Solar" stroke={THEME.chart.solar} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="demand" name="Demand" stroke={THEME.chart.demand} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="battery_charge" name="Battery" stroke={THEME.chart.battery} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {daily_profile_december && daily_profile_december.length > 0 && (
          <ChartCard title="Daily Profile - Winter (December)" subtitle="Typical winter day energy flow">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={daily_profile_december} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={THEME.neutral[200]} vertical={false} />
                <XAxis
                  dataKey="hour"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: THEME.neutral[500] }}
                  tickFormatter={(h) => `${h}:00`}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: THEME.neutral[500] }}
                />
                <Tooltip
                  content={<CustomTooltip formatter={(v: number) => `${v.toFixed(2)} kW`} />}
                />
                <Legend
                  wrapperStyle={{ paddingTop: '10px' }}
                  iconType="circle"
                  iconSize={8}
                />
                <Line type="monotone" dataKey="pv_generation" name="Solar" stroke={THEME.chart.solar} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="demand" name="Demand" stroke={THEME.chart.demand} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="battery_charge" name="Battery" stroke={THEME.chart.battery} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>

      {/* Charts Row 3: Generation Mix */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px', marginBottom: '20px' }}>
        <ChartCard title="Energy Generation Mix" subtitle="Self-consumed vs exported energy">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={generationMixData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={THEME.neutral[200]} horizontal={false} />
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: THEME.neutral[500] }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <YAxis
                dataKey="name"
                type="category"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 13, fill: THEME.neutral[700], fontWeight: 500 }}
                width={80}
              />
              <Tooltip
                content={<CustomTooltip formatter={(v: number) => formatEnergy(v)} />}
              />
              <Legend
                wrapperStyle={{ paddingTop: '10px' }}
                iconType="circle"
                iconSize={8}
              />
              <Bar dataKey="selfConsumption" name="Self-Consumed" stackId="a" fill={THEME.chart.selfConsumed} radius={[0, 0, 0, 0]} />
              <Bar dataKey="exported" name="Exported" stackId="a" fill={THEME.chart.exported} radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {export_tariff_sample && export_tariff_sample.length > 0 && (
          <ChartCard title="Grid Export Tariff" subtitle="Hourly export price variation">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={export_tariff_sample} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="tariffGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={THEME.chart.grid} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={THEME.chart.grid} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={THEME.neutral[200]} vertical={false} />
                <XAxis
                  dataKey="hour"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: THEME.neutral[500] }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: THEME.neutral[500] }}
                  tickFormatter={(value) => `€${value.toFixed(2)}`}
                />
                <Tooltip
                  content={<CustomTooltip formatter={(v: number) => `€${v.toFixed(3)}/kWh`} />}
                />
                <Area
                  type="monotone"
                  dataKey="tariff"
                  name="Export Tariff"
                  stroke={THEME.chart.grid}
                  strokeWidth={2}
                  fill="url(#tariffGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>

      {/* Financial Breakdown Table */}
      <ChartCard title="Detailed Financial Breakdown" subtitle="Year-by-year cash flow analysis">
        <div style={{ overflowX: 'auto', marginTop: '8px' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'separate',
              borderSpacing: 0,
              fontSize: '13px',
            }}
          >
            <thead>
              <tr>
                {['Year', 'Grid Savings', 'Feed-in Revenue', 'O&M Costs', 'Battery Repl.', 'Net Cash Flow', 'Cumulative NPV'].map(
                  (header, i) => (
                    <th
                      key={header}
                      style={{
                        padding: '12px 16px',
                        textAlign: i === 0 ? 'center' : 'right',
                        fontWeight: 600,
                        color: THEME.neutral[600],
                        borderBottom: `2px solid ${THEME.neutral[200]}`,
                        background: THEME.neutral[50],
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {header}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {cash_flows.map((cf, index) => (
                <tr
                  key={cf.year}
                  style={{
                    background: index % 2 === 0 ? 'white' : THEME.neutral[50],
                  }}
                >
                  <td
                    style={{
                      padding: '10px 16px',
                      textAlign: 'center',
                      fontWeight: 600,
                      color: THEME.primary.main,
                    }}
                  >
                    {cf.year}
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', color: THEME.success }}>
                    {formatCurrency(cf.grid_savings)}
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', color: THEME.success }}>
                    {formatCurrency(cf.feed_in_revenue)}
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', color: THEME.error }}>
                    -{formatCurrency(Math.abs(cf.operational_costs))}
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', color: cf.battery_replacement > 0 ? THEME.error : THEME.neutral[400] }}>
                    {cf.battery_replacement > 0 ? `-${formatCurrency(cf.battery_replacement)}` : '—'}
                  </td>
                  <td
                    style={{
                      padding: '10px 16px',
                      textAlign: 'right',
                      fontWeight: 600,
                      color: cf.cash_flow >= 0 ? THEME.success : THEME.error,
                    }}
                  >
                    {cf.cash_flow >= 0 ? '' : '-'}{formatCurrency(Math.abs(cf.cash_flow))}
                  </td>
                  <td
                    style={{
                      padding: '10px 16px',
                      textAlign: 'right',
                      fontWeight: 600,
                      color: cf.cumulative_npv >= 0 ? THEME.chart.npv : THEME.error,
                    }}
                  >
                    {cf.cumulative_npv >= 0 ? '' : '-'}{formatCurrency(Math.abs(cf.cumulative_npv))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}
