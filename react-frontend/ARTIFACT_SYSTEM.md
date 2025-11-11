# Artifact Panel System Documentation

## Overview

The artifact panel is a **flexible, resizable side panel** that displays rich content alongside the chat interface. It supports multiple content types: forms, charts, maps, documents, tables, and custom components.

## Architecture

### Key Components

1. **UI Store** (`src/stores/uiStore.ts`)
   - Global state management with Zustand
   - Stores: `artifactOpen`, `artifactContent`, `artifactType`
   - Actions: `openArtifact()`, `closeArtifact()`, `toggleArtifact()`

2. **Main Layout** (`src/components/layout/MainLayout.tsx`)
   - CSS Grid 3-column layout: Sidebar | Chat | Artifact
   - Handles panel resizing (25%-70% width)
   - Renders dynamic content from store

3. **Chat Header** (`src/components/chat/ChatHeader.tsx`)
   - Reopen button (visible when content exists but panel is closed)

4. **Chat Page** (`src/pages/ChatPage.tsx`)
   - Manages artifact lifecycle
   - Closes panel on navigation

## Current Implementation Status

### ✅ What's Working

- **Flexible Content System**: Accepts any React component/element
- **Type Categorization**: `artifactType` string for different content types
- **Resize Functionality**: Drag-to-resize with smooth performance
- **Reopen Capability**: Button to restore closed panel
- **Clean State Management**: Global Zustand store
- **No Persistence**: Artifact state doesn't persist (good for dynamic content)
- **CSS Grid Layout**: Responsive, performant 3-zone layout

### 🎯 Clean & Flexible Design

The implementation is **intentionally simple and flexible**:

```typescript
// Store interface
interface UIState {
  artifactContent: any | null;  // ✅ Accepts ANY React content
  artifactType: string | null;  // ✅ Flexible type system
}

// Rendering
{artifactContent}  // ✅ Direct JSX rendering
```

## Usage Examples

### 1. Contact Form (Current)

```typescript
import { useUIStore } from '../stores';
import ContactForm from '../components/artifact/ContactForm';

const { openArtifact } = useUIStore();

// Open contact form
openArtifact(
  <ContactForm onSuccess={handleSuccess} />,
  'contact'
);
```

### 2. Interactive Chart

```typescript
import { useUIStore } from '../stores';
import { Plot } from 'react-plotly.js';

const { openArtifact } = useUIStore();

// Open chart from backend plot data
const handlePlotData = (plotData) => {
  openArtifact(
    <Plot
      data={plotData.data}
      layout={plotData.layout}
      style={{ width: '100%', height: '100%' }}
    />,
    'chart'
  );
};

// In your SSE stream handler:
case 'plot':
  handlePlotData(parsed.content);
  break;
```

### 3. Interactive Map

```typescript
import { useUIStore } from '../stores';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';

const { openArtifact } = useUIStore();

const MapComponent = ({ locations }) => (
  <MapContainer center={[51.505, -0.09]} zoom={5} style={{ height: '100%' }}>
    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
    {locations.map((loc) => (
      <Marker key={loc.id} position={[loc.lat, loc.lng]} />
    ))}
  </MapContainer>
);

// Open map
openArtifact(
  <MapComponent locations={solarInstallations} />,
  'map'
);
```

### 4. Document Viewer

```typescript
import { useUIStore } from '../stores';
import { Document, Page } from 'react-pdf';

const { openArtifact } = useUIStore();

const PDFViewer = ({ url }) => (
  <div style={{ padding: '1rem', height: '100%', overflowY: 'auto' }}>
    <Document file={url}>
      <Page pageNumber={1} />
    </Document>
  </div>
);

// Open PDF document
openArtifact(
  <PDFViewer url="/path/to/report.pdf" />,
  'document'
);
```

### 5. Data Table

```typescript
import { useUIStore } from '../stores';
import { DataGrid } from '@mui/x-data-grid';

const { openArtifact } = useUIStore();

const TableComponent = ({ data, columns }) => (
  <div style={{ height: '100%', padding: '1rem' }}>
    <h2>Market Data</h2>
    <DataGrid
      rows={data}
      columns={columns}
      pageSize={10}
      checkboxSelection
    />
  </div>
);

// Open data table
openArtifact(
  <TableComponent data={marketData} columns={tableColumns} />,
  'table'
);
```

## Integration with Chat Streaming

### Handling Different Content Types from Backend

```typescript
// In ChatContainer.tsx - SSE stream handler

const handleMouseMove = (moveEvent: MouseEvent) => {
  const lines = chunk.split('\n');

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const parsed = JSON.parse(data);

      switch (parsed.type) {
        case 'plot':
          // Open chart artifact
          openArtifact(
            <ChartComponent data={parsed.content} />,
            'chart'
          );
          break;

        case 'map':
          // Open map artifact
          openArtifact(
            <MapComponent locations={parsed.content} />,
            'map'
          );
          break;

        case 'document':
          // Open document viewer
          openArtifact(
            <DocumentViewer url={parsed.content.url} />,
            'document'
          );
          break;

        case 'approval_request':
          // Open contact form
          openArtifact(
            <ContactForm />,
            'contact'
          );
          break;
      }
    }
  }
};
```

## Best Practices

### 1. Component Composition

Create dedicated artifact components for reusability:

```typescript
// src/components/artifact/ChartArtifact.tsx
export function ChartArtifact({ data, title }) {
  return (
    <div style={{ padding: '2rem', height: '100%' }}>
      <h2>{title}</h2>
      <Plot data={data} layout={{ height: '100%' }} />
    </div>
  );
}

// Usage
openArtifact(
  <ChartArtifact data={plotData} title="PV Capacity Trends" />,
  'chart'
);
```

### 2. Responsive Design

Ensure your artifact components work at different widths (25%-70%):

```typescript
<div style={{
  padding: '1.5rem',
  height: '100%',
  overflowY: 'auto',  // Allow scrolling if needed
  display: 'flex',
  flexDirection: 'column',
}}>
  {/* Your content */}
</div>
```

### 3. Handle Panel Closure

Components should gracefully handle being unmounted:

```typescript
useEffect(() => {
  // Setup
  const subscription = data$.subscribe(update);

  // Cleanup when panel closes
  return () => {
    subscription.unsubscribe();
  };
}, []);
```

### 4. Type Safety (Optional)

For better TypeScript support, use the artifact types:

```typescript
import type { ArtifactType } from '../types/artifacts';

function openTypedArtifact(content: ReactNode, type: ArtifactType) {
  const { openArtifact } = useUIStore.getState();
  openArtifact(content, type);
}
```

## Styling Guidelines

### Container

```css
.artifact-container {
  padding: 1.5rem;
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}
```

### Header Section

```css
.artifact-header {
  padding-bottom: 1rem;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 1.5rem;
}
```

### Content Section

```css
.artifact-content {
  flex: 1;
  overflow-y: auto;
}
```

## Future Enhancements (Optional)

The current system is flexible enough to add these without major refactoring:

1. **Multiple Artifacts**: Stack multiple artifacts with tabs
2. **Artifact History**: Navigate back/forward through artifacts
3. **Full-Screen Mode**: Expand artifact to fill entire screen
4. **Artifact Templates**: Pre-built templates for common types
5. **Keyboard Shortcuts**: `Cmd+B` to toggle panel, etc.
6. **Persist State**: Save artifact state between sessions (optional)

## Summary

✅ **The artifact system is CLEAN and READY** for multiple content types:

- ✅ Flexible content system (accepts any React component)
- ✅ Type categorization system
- ✅ Resize functionality (25%-70%)
- ✅ Reopen capability
- ✅ Clean state management
- ✅ Easy to extend

**No major refactoring needed** - just create your artifact components and call `openArtifact()` with the appropriate content!
