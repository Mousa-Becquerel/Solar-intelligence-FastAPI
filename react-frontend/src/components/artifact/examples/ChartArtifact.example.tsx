/**
 * Chart Artifact Example
 *
 * Example of how to display interactive charts in the artifact panel
 * Can be used with Plotly, Recharts, Chart.js, etc.
 */

import { useUIStore } from '../../../stores';

// Example chart data
const sampleChartData = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
  datasets: [
    {
      label: 'PV Installations',
      data: [12, 19, 3, 5, 2],
    },
  ],
};

/**
 * Chart component (replace with your actual chart library)
 */
function ChartComponent({ data }: { data: any }) {
  return (
    <div style={{ padding: '2rem' }}>
      <h2 style={{ marginBottom: '1rem' }}>PV Installation Trends</h2>
      <div style={{
        background: '#f3f4f6',
        borderRadius: '8px',
        padding: '2rem',
        minHeight: '400px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <p style={{ color: '#64748b' }}>
          Chart would render here with data: {JSON.stringify(data)}
        </p>
        {/*
          Replace with actual chart library, e.g.:
          <Plot data={data.datasets} layout={{ title: data.title }} />
          or
          <ResponsiveContainer>
            <LineChart data={data}>
              <Line dataKey="value" />
            </LineChart>
          </ResponsiveContainer>
        */}
      </div>
    </div>
  );
}

/**
 * Example: How to open a chart artifact from your chat message handler
 */
export function openChartArtifact() {
  const { openArtifact } = useUIStore.getState();

  openArtifact(
    <ChartComponent data={sampleChartData} />,
    'chart'
  );
}

/**
 * Example: How to handle chart data from backend SSE stream
 */
export function handleChartFromStream(plotData: any) {
  const { openArtifact } = useUIStore.getState();

  // plotData comes from backend with structure:
  // { type: 'plot', data: [...], layout: {...} }

  openArtifact(
    <ChartComponent data={plotData} />,
    'chart'
  );
}
