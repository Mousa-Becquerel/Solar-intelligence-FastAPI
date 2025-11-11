/**
 * Theme Configuration - Exact Match to Flask Frontend
 *
 * This file contains all design tokens from the Flask frontend
 * to ensure 100% visual parity in the React migration.
 *
 * Usage:
 * - Import this theme in your styled-components ThemeProvider
 * - Use with CSS-in-JS solutions (emotion, styled-components)
 * - Reference in TypeScript components for type safety
 */

export const theme = {
  // ========================================
  // COLORS - Brand & Material Design 3
  // ========================================
  colors: {
    brand: {
      blue: '#0a1850',
      gold: '#fbbf24',
      goldDark: '#f59e42',
      white: '#ffffff',
      accentBlue: '#2563eb',
    },

    materialDesign: {
      indigo: '#5C6BC0',
      indigoLight: '#7986CB',
      gold: '#FFB74D',
      goldDark: '#FFA726',
      surface: '#F5F5F5',
      surfaceWhite: '#ffffff',
    },

    text: {
      navy: '#1e3a8a',
      secondary: '#64748b',
      dark: '#1e293b',
      light: '#6b7280',
    },

    chat: {
      primary: '#5C6BC0',
      surface: '#f8fafc',
      onSurface: '#1e293b',
      onSurfaceVariant: '#64748b',
    },

    // Semantic colors
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
  },

  // ========================================
  // SPACING SYSTEM
  // ========================================
  spacing: {
    xs: '0.25rem',    // 4px
    sm: '0.5rem',     // 8px
    md: '1rem',       // 16px
    lg: '1.5rem',     // 24px
    xl: '2rem',       // 32px
    '2xl': '2.5rem',  // 40px
    '3xl': '3rem',    // 48px
  },

  // ========================================
  // BORDER RADIUS
  // ========================================
  borderRadius: {
    none: '0px',
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '18px',
    xxl: '28px',
    full: '9999px',
  },

  // ========================================
  // SHADOWS
  // ========================================
  shadows: {
    none: 'none',
    sm: '0 2px 4px rgba(0, 0, 0, 0.05)',
    md: '0 4px 8px rgba(0, 0, 0, 0.08)',
    lg: '0 8px 16px rgba(0, 0, 0, 0.1)',
    gold: '0 4px 16px rgba(251, 191, 36, 0.25), 0 2px 8px rgba(0, 0, 0, 0.08)',

    // Material Design 3 Elevation
    md1: '0px 1px 2px 0px rgba(0, 0, 0, 0.30), 0px 1px 3px 1px rgba(0, 0, 0, 0.15)',
    md2: '0px 1px 2px 0px rgba(0, 0, 0, 0.30), 0px 2px 6px 2px rgba(0, 0, 0, 0.15)',
    md3: '0px 1px 3px 0px rgba(0, 0, 0, 0.30), 0px 4px 8px 3px rgba(0, 0, 0, 0.15)',
    md4: '0px 2px 3px 0px rgba(0, 0, 0, 0.30), 0px 6px 10px 4px rgba(0, 0, 0, 0.15)',
    md5: '0px 4px 4px 0px rgba(0, 0, 0, 0.30), 0px 8px 12px 6px rgba(0, 0, 0, 0.15)',
  },

  // ========================================
  // Z-INDEX LAYERS
  // ========================================
  zIndex: {
    base: 1,
    dropdown: 100,
    sticky: 200,
    modal: 1000,
    tooltip: 2000,
  },

  // ========================================
  // TRANSITIONS
  // ========================================
  transitions: {
    duration: {
      fast: '200ms',
      normal: '300ms',
      layout: '400ms',
      slow: '600ms',
    },
    timing: {
      ease: 'ease',
      easeIn: 'ease-in',
      easeOut: 'ease-out',
      easeInOut: 'ease-in-out',
      smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
      md3: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },

  // ========================================
  // TYPOGRAPHY
  // ========================================
  typography: {
    fontFamily: {
      primary: "'Inter', 'Open Sans', Arial, sans-serif",
    },

    fontSize: {
      // Welcome messages
      welcomeTitle: '3rem',           // 48px
      welcomeSubtitle: '1.125rem',    // 18px

      // Artifact
      artifactTitle: '1.5rem',        // 24px

      // Sidebar
      sidebarTitle: '1.125rem',       // 18px
      sidebarSubtitle: '0.8125rem',   // 13px

      // Messages
      message: '0.9375rem',           // 15px

      // Loading
      loading: '0.8125rem',           // 13px

      // Standard sizes
      xs: '0.75rem',                  // 12px
      sm: '0.875rem',                 // 14px
      base: '1rem',                   // 16px
      lg: '1.125rem',                 // 18px
      xl: '1.25rem',                  // 20px
      '2xl': '1.5rem',                // 24px
      '3xl': '1.875rem',              // 30px
      '4xl': '2.25rem',               // 36px
      '5xl': '3rem',                  // 48px
    },

    fontWeight: {
      light: 300,
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },

    letterSpacing: {
      tight: '-0.025em',
      normal: '-0.01em',
      wide: '-0.005em',
      wider: '-0.02em',
    },

    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.6,
      loose: 1.65,
    },
  },

  // ========================================
  // LAYOUT - Grid Architecture
  // ========================================
  layout: {
    sidebar: {
      expanded: '280px',
      collapsed: '72px',
      mobile: '60px',
      mobileSmall: '50px',
    },
    artifact: {
      open: '40%',
      closed: '0px',
    },
    maxWidth: {
      content: '1400px',
      message: '800px',
    },
  },

  // ========================================
  // RESPONSIVE BREAKPOINTS
  // ========================================
  breakpoints: {
    mobile: '480px',
    tablet: '768px',
    desktop: '1024px',
    wide: '1200px',
    ultrawide: '1440px',
  },

  // ========================================
  // MATERIAL DESIGN 3 - State Layers
  // ========================================
  md3: {
    stateLayer: {
      hover: 'rgba(0, 0, 0, 0.08)',
      focus: 'rgba(0, 0, 0, 0.12)',
      pressed: 'rgba(0, 0, 0, 0.12)',
      dragged: 'rgba(0, 0, 0, 0.16)',
    },
    opacity: {
      hover: 0.08,
      focus: 0.12,
      pressed: 0.12,
      dragged: 0.16,
    },
  },

  // ========================================
  // ANIMATIONS
  // ========================================
  animations: {
    messageAppear: {
      from: {
        opacity: 0,
        transform: 'translateY(15px)',
      },
      to: {
        opacity: 1,
        transform: 'translateY(0)',
      },
    },
    dotPulse: {
      '0%, 80%, 100%': {
        transform: 'scale(0.6) translateY(0)',
        opacity: 0.4,
      },
      '40%': {
        transform: 'scale(1) translateY(-8px)',
        opacity: 1,
      },
    },
  },

  // ========================================
  // SCROLLBAR STYLING
  // ========================================
  scrollbar: {
    width: '4px',
    track: 'transparent',
    thumb: 'rgba(0, 0, 0, 0.05)',
    thumbHover: 'rgba(0, 0, 0, 0.15)',
  },
} as const;

// ========================================
// TYPE EXPORTS
// ========================================
export type Theme = typeof theme;

export type ThemeColors = typeof theme.colors;
export type ThemeSpacing = typeof theme.spacing;
export type ThemeTypography = typeof theme.typography;
export type ThemeLayout = typeof theme.layout;
export type ThemeBreakpoints = typeof theme.breakpoints;

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Get color value from theme
 * @example getColor('brand.gold') // '#fbbf24'
 */
export function getColor(path: string, themeObj = theme): string {
  const keys = path.split('.');
  let value: any = themeObj.colors;

  for (const key of keys) {
    value = value?.[key];
  }

  return typeof value === 'string' ? value : '';
}

/**
 * Get spacing value from theme
 * @example getSpacing('md') // '1rem'
 */
export function getSpacing(size: keyof typeof theme.spacing): string {
  return theme.spacing[size];
}

/**
 * Media query helper
 * @example mediaQuery('tablet') // '@media (max-width: 768px)'
 */
export function mediaQuery(breakpoint: keyof typeof theme.breakpoints): string {
  return `@media (max-width: ${theme.breakpoints[breakpoint]})`;
}

/**
 * Generate MD3 state layer CSS
 * @example md3StateLayer('#5C6BC0') // Returns CSS object
 */
export function md3StateLayer(color: string) {
  return {
    position: 'relative' as const,
    overflow: 'hidden' as const,
    '&::before': {
      content: '""',
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: color,
      opacity: 0,
      transition: `opacity ${theme.transitions.duration.fast} ${theme.transitions.timing.md3}`,
      pointerEvents: 'none' as const,
    },
    '&:hover::before': {
      opacity: theme.md3.opacity.hover,
    },
    '&:focus::before': {
      opacity: theme.md3.opacity.focus,
    },
    '&:active::before': {
      opacity: theme.md3.opacity.pressed,
    },
  };
}

/**
 * Scrollbar styling helper
 */
export const scrollbarStyle = {
  scrollbarWidth: 'thin' as const,
  '&::-webkit-scrollbar': {
    width: theme.scrollbar.width,
    height: theme.scrollbar.width,
  },
  '&::-webkit-scrollbar-track': {
    background: theme.scrollbar.track,
  },
  '&::-webkit-scrollbar-thumb': {
    background: theme.scrollbar.thumb,
    borderRadius: '2px',
  },
  '&::-webkit-scrollbar-thumb:hover': {
    background: theme.scrollbar.thumbHover,
  },
};

// ========================================
// STYLED-COMPONENTS INTEGRATION
// ========================================

/**
 * Example usage with styled-components:
 *
 * import styled from 'styled-components';
 * import { theme, md3StateLayer, scrollbarStyle } from './theme';
 *
 * const Button = styled.button`
 *   background: ${theme.colors.brand.gold};
 *   color: ${theme.colors.text.dark};
 *   padding: ${theme.spacing.md} ${theme.spacing.lg};
 *   border-radius: ${theme.borderRadius.md};
 *   font-family: ${theme.typography.fontFamily.primary};
 *   font-size: ${theme.typography.fontSize.base};
 *   transition: background ${theme.transitions.duration.fast} ${theme.transitions.timing.smooth};
 *   ${md3StateLayer(theme.colors.materialDesign.indigo)}
 * `;
 *
 * const Container = styled.div`
 *   overflow-y: auto;
 *   ${scrollbarStyle}
 * `;
 */

// ========================================
// CSS-IN-JS EXAMPLES
// ========================================

export const exampleStyles = {
  // User message (gold bubble)
  userMessage: {
    background: theme.colors.brand.gold,
    color: theme.colors.text.dark,
    borderRadius: theme.borderRadius.lg,
    borderBottomRightRadius: '6px',
    padding: '12px 16px',
    fontFamily: theme.typography.fontFamily.primary,
    fontSize: theme.typography.fontSize.message,
    fontWeight: theme.typography.fontWeight.regular,
    letterSpacing: theme.typography.letterSpacing.normal,
    lineHeight: theme.typography.lineHeight.relaxed,
    maxWidth: '85%',
    marginLeft: 'auto',
    marginRight: 0,
    boxShadow: theme.shadows.none,
  },

  // Bot message (white bubble)
  botMessage: {
    background: theme.colors.brand.white,
    color: theme.colors.text.dark,
    borderRadius: theme.borderRadius.lg,
    borderBottomLeftRadius: '6px',
    padding: '12px 16px',
    fontFamily: theme.typography.fontFamily.primary,
    fontSize: theme.typography.fontSize.message,
    fontWeight: theme.typography.fontWeight.light,
    letterSpacing: theme.typography.letterSpacing.normal,
    lineHeight: theme.typography.lineHeight.relaxed,
    maxWidth: '85%',
    marginLeft: 0,
    marginRight: 'auto',
    boxShadow: theme.shadows.none,
    border: '1px solid rgba(0, 0, 0, 0.05)',
  },

  // Sidebar (MD3 flat gray)
  sidebar: {
    background: theme.colors.materialDesign.surface,
    width: theme.layout.sidebar.expanded,
    height: '100vh',
    borderTopRightRadius: theme.borderRadius.lg,
    borderBottomRightRadius: theme.borderRadius.lg,
    transition: `width ${theme.transitions.duration.layout} ${theme.transitions.timing.md3}`,
  },

  // Artifact header (MD3 flat gold)
  artifactHeader: {
    background: theme.colors.materialDesign.gold,
    color: theme.colors.brand.white,
    padding: '0.875rem 2rem',
    borderBottom: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // Loading spinner
  loadingDot: {
    width: '12px',
    height: '12px',
    borderRadius: theme.borderRadius.full,
    animation: 'dotPulse 1.4s ease-in-out infinite',
  },

  // Expand button (MD3 flat)
  expandButton: {
    width: '40px',
    height: '40px',
    border: 'none',
    background: theme.colors.brand.white,
    color: theme.colors.materialDesign.indigo,
    borderRadius: theme.borderRadius.md,
    cursor: 'pointer',
    boxShadow: theme.shadows.none,
    transition: `background ${theme.transitions.duration.normal} ${theme.transitions.timing.md3}`,
    '&:hover': {
      background: '#E8EAF6', // Light indigo
    },
  },
};

export default theme;
