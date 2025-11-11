/**
 * Artifact Types
 *
 * Type definitions for the artifact panel system
 * Supports multiple content types: forms, charts, maps, documents, etc.
 */

import { ReactNode } from 'react';

/**
 * Supported artifact types
 */
export type ArtifactType =
  | 'contact'           // Contact form
  | 'chart'            // Interactive charts (Plotly, Recharts, etc.)
  | 'map'              // Maps (Leaflet, Mapbox, etc.)
  | 'document'         // Document viewer (PDF, markdown, etc.)
  | 'table'            // Data tables
  | 'code'             // Code viewer/editor
  | 'image'            // Image gallery
  | 'video'            // Video player
  | 'custom';          // Custom content

/**
 * Artifact metadata
 */
export interface ArtifactMetadata {
  title?: string;              // Optional title shown in panel
  subtitle?: string;           // Optional subtitle
  icon?: ReactNode;            // Optional icon
  actions?: ArtifactAction[];  // Optional action buttons
  allowResize?: boolean;       // Whether panel can be resized (default: true)
  defaultWidth?: number;       // Default width percentage (default: 40)
  minWidth?: number;           // Minimum width percentage (default: 25)
  maxWidth?: number;           // Maximum width percentage (default: 70)
}

/**
 * Action button in artifact panel
 */
export interface ArtifactAction {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}

/**
 * Complete artifact data
 */
export interface ArtifactData {
  type: ArtifactType;
  content: ReactNode;
  metadata?: ArtifactMetadata;
}
