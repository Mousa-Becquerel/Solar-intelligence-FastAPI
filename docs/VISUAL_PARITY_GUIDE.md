# Visual Parity Guide - React Migration

## Purpose
This document ensures 100% visual and UX parity between the Flask frontend and React migration. Every design token, animation, color, spacing, and interaction pattern is documented here to guarantee **we don't lose anything** during migration.

---

## Table of Contents
1. [Design Tokens & Variables](#design-tokens--variables)
2. [Color Palette](#color-palette)
3. [Typography System](#typography-system)
4. [Spacing & Layout](#spacing--layout)
5. [Component Styles](#component-styles)
6. [Animations & Transitions](#animations--transitions)
7. [Responsive Breakpoints](#responsive-breakpoints)
8. [Material Design 3 Implementation](#material-design-3-implementation)
9. [Validation Checklist](#validation-checklist)

---

## Design Tokens & Variables

### Source: `static/css/core/variables.css`

All CSS custom properties that must be preserved exactly:

```css
:root {
    /* Brand Colors */
    --becq-blue: #0a1850;
    --becq-gold: #fbbf24;
    --becq-gold-dark: #f59e42;
    --becq-white: #ffffff;
    --becq-accent-blue: #2563eb;

    /* Spacing System */
    --spacing-xs: 0.25rem;    /* 4px */
    --spacing-sm: 0.5rem;     /* 8px */
    --spacing-md: 1rem;       /* 16px */
    --spacing-lg: 1.5rem;     /* 24px */
    --spacing-xl: 2rem;       /* 32px */

    /* Border Radius */
    --radius-sm: 8px;
    --radius-md: 12px;
    --radius-lg: 16px;
    --radius-xl: 18px;

    /* Transitions */
    --transition-fast: 0.2s ease;
    --transition-normal: 0.3s ease;
    --transition-smooth: 0.3s cubic-bezier(0.4, 0, 0.2, 1);

    /* Shadows */
    --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.05);
    --shadow-md: 0 4px 8px rgba(0, 0, 0, 0.08);
    --shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.1);
    --shadow-gold: 0 4px 16px rgba(251, 191, 36, 0.25), 0 2px 8px rgba(0, 0, 0, 0.08);

    /* Z-Index Layers */
    --z-base: 1;
    --z-dropdown: 100;
    --z-sticky: 200;
    --z-modal: 1000;
    --z-tooltip: 2000;

    /* Layout-specific (Grid Architecture) */
    --sidebar-width: 280px;
    --artifact-width: 0px;
    --layout-transition: 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
```

### React/Tailwind Mapping

**CRITICAL**: Configure Tailwind to use these exact values:

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        'becq-blue': '#0a1850',
        'becq-gold': '#fbbf24',
        'becq-gold-dark': '#f59e42',
        'becq-accent-blue': '#2563eb',
      },
      spacing: {
        'xs': '0.25rem',
        'sm': '0.5rem',
        'md': '1rem',
        'lg': '1.5rem',
        'xl': '2rem',
      },
      borderRadius: {
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '18px',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      boxShadow: {
        'sm': '0 2px 4px rgba(0, 0, 0, 0.05)',
        'md': '0 4px 8px rgba(0, 0, 0, 0.08)',
        'lg': '0 8px 16px rgba(0, 0, 0, 0.1)',
        'gold': '0 4px 16px rgba(251, 191, 36, 0.25), 0 2px 8px rgba(0, 0, 0, 0.08)',
      },
      zIndex: {
        'base': 1,
        'dropdown': 100,
        'sticky': 200,
        'modal': 1000,
        'tooltip': 2000,
      },
    },
  },
}
```

---

## Color Palette

### Complete Color System

#### Primary Brand Colors
- **BECQ Blue** (`#0a1850`) - Primary brand color, headers, navigation
- **BECQ Gold** (`#fbbf24`) - User messages, CTAs, highlights
- **BECQ Gold Dark** (`#f59e42`) - Hover states, active states
- **BECQ White** (`#ffffff`) - Bot messages, surfaces, backgrounds
- **BECQ Accent Blue** (`#2563eb`) - Links, interactive elements

#### Material Design 3 Colors (Flat Design)
- **MD Chat Primary**: `#5C6BC0` (Material Indigo)
- **MD Chat Surface**: `#f8fafc` (Light gray surface)
- **MD Chat On-Surface**: `#1e293b` (Dark text)
- **MD Chat On-Surface Variant**: `#64748b` (Secondary text)

#### Material Design 3 Extended Palette
```css
/* Gold tones (flat - no gradients) */
--md-gold: #FFB74D;           /* Material Gold */
--md-gold-dark: #FFA726;      /* Dark Material Gold */

/* Indigo tones (flat - no gradients) */
--md-indigo: #5C6BC0;         /* Material Indigo */
--md-indigo-light: #7986CB;   /* Light Material Indigo */

/* Surface colors */
--md-surface: #F5F5F5;        /* Gray surface - sidebar */
--md-surface-white: #ffffff;  /* White surface - main content */

/* Text colors */
--md-text-navy: #1e3a8a;      /* Navy blue text */
--md-text-secondary: #64748b; /* Secondary gray text */
--md-text-dark: #1e293b;      /* Primary dark text */
```

#### Usage Rules
1. **User Messages**: Always `--becq-gold` (#fbbf24) background, `#1e293b` text
2. **Bot Messages**: Always white background, `#1e293b` text
3. **Sidebar**: `#F5F5F5` (MD3 flat gray)
4. **Artifact Header**: `#FFB74D` (MD3 flat gold) with white text
5. **Interactive Elements**: `#5C6BC0` (Material Indigo) with MD3 state layers

---

## Typography System

### Font Families
**Primary**: `'Inter', 'Open Sans', Arial, sans-serif`

### Font Sizes & Weights

#### Headings
```css
.welcome-title {
    font-size: 3rem;              /* 48px */
    font-weight: 400;             /* Light weight */
    letter-spacing: -0.025em;
    line-height: 1.2;
    color: #1e3a8a;               /* Navy blue */
}

.welcome-subtitle {
    font-size: 1.125rem;          /* 18px */
    font-weight: 300;             /* Extra light */
    letter-spacing: -0.01em;
    line-height: 1.65;
    color: #1e3a8a;
}

.artifact-title {
    font-size: 1.5rem;            /* 24px */
    font-weight: 700;             /* Bold */
    letter-spacing: -0.01em;
    color: white;
}

.agents-sidebar__title {
    font-size: 1.125rem;          /* 18px */
    font-weight: 500;             /* Medium */
    letter-spacing: -0.02em;
    color: #1e3a8a;
}
```

#### Body Text
```css
.user-message {
    font-weight: 400;             /* Regular - MD3 */
    font-size: 0.9375rem;         /* 15px */
    letter-spacing: -0.01em;
    line-height: 1.6;
}

.bot-message {
    font-weight: 300;             /* Light - MD3 */
    font-size: 0.9375rem;         /* 15px */
    letter-spacing: -0.01em;
    line-height: 1.6;
}

.loading-text {
    font-size: 0.8125rem;         /* 13px */
    font-weight: 300;
    letter-spacing: -0.005em;
    line-height: 1.5;
    color: #6b7280;
}
```

### React Implementation

```typescript
// theme.ts
export const typography = {
  fontFamily: {
    primary: "'Inter', 'Open Sans', Arial, sans-serif",
  },
  fontSize: {
    welcomeTitle: '3rem',
    welcomeSubtitle: '1.125rem',
    artifactTitle: '1.5rem',
    sidebarTitle: '1.125rem',
    message: '0.9375rem',
    loading: '0.8125rem',
  },
  fontWeight: {
    light: 300,
    regular: 400,
    medium: 500,
    bold: 700,
  },
  letterSpacing: {
    tight: '-0.025em',
    normal: '-0.01em',
    wide: '-0.005em',
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.6,
    loose: 1.65,
  },
};
```

---

## Spacing & Layout

### CSS Grid Architecture

**CRITICAL**: The app uses a pure CSS Grid 3-zone layout. This MUST be preserved exactly.

#### Grid Structure
```css
.main-layout {
    display: grid;
    grid-template-columns: var(--sidebar-width) 1fr var(--artifact-width);
    grid-template-rows: 1fr;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
    transition: grid-template-columns var(--layout-transition);
}
```

#### Zone Definitions
1. **Sidebar Panel** (`grid-column: 1`)
   - Default width: 280px
   - Collapsed width: 72px
   - Background: `#F5F5F5`
   - No fixed positioning - grid controlled

2. **Chat Panel** (`grid-column: 2`)
   - Width: Flexible (`1fr`)
   - Background: `#ffffff`
   - Flex column: header + scrollable messages + fixed input

3. **Artifact Panel** (`grid-column: 3`)
   - Default width: 0px (hidden)
   - Open width: 40% of viewport
   - White background with padding
   - Transition: `opacity 0.3s ease`

#### Layout States

```css
/* State: Sidebar collapsed */
.main-layout[data-sidebar-expanded="false"] {
    --sidebar-width: 72px;
}

/* State: Sidebar expanded */
.main-layout[data-sidebar-expanded="true"] {
    --sidebar-width: 280px;
}

/* State: Artifact open */
.main-layout[data-artifact-open="true"] {
    --artifact-width: 40%;
}
```

#### React Implementation

```typescript
// Layout state management
const [sidebarExpanded, setSidebarExpanded] = useState(true);
const [artifactOpen, setArtifactOpen] = useState(false);

// CSS-in-JS or styled-components
const MainLayout = styled.div<{ sidebarExpanded: boolean; artifactOpen: boolean }>`
  display: grid;
  grid-template-columns: ${props =>
    props.sidebarExpanded ? '280px' : '72px'
  } 1fr ${props =>
    props.artifactOpen ? '40%' : '0px'
  };
  grid-template-rows: 1fr;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  transition: grid-template-columns 0.4s cubic-bezier(0.4, 0, 0.2, 1);
`;
```

---

## Component Styles

### Sidebar Component

#### Expand Button (Critical - Perfectly Centered)
```css
.sidebar-expand-btn {
    width: 40px;
    height: 40px;
    border: none;                                   /* MD3 flat - no borders */
    background: white;
    color: #5C6BC0;                                 /* Material Indigo */
    cursor: pointer;
    border-radius: 12px;                            /* MD3 medium */
    box-shadow: none;                               /* MD3 flat - no shadows */
    margin: 0 auto;                                 /* Centered when collapsed */
    transition: background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Hover state - MD3 state layer */
.sidebar-expand-btn:hover {
    background: #E8EAF6;                            /* Light indigo on hover */
    box-shadow: none;                               /* No lift effect */
}

/* Active state - MD3 pressed */
.sidebar-expand-btn:active {
    transform: none;                                /* No press animation */
    box-shadow: none;
}
```

#### Conversation Items
```css
.conversation-item {
    background: white;
    border: none;                                   /* MD3 flat */
    border-radius: 12px;                            /* MD3 medium */
    padding: 0.75rem;
    cursor: pointer;
    transition: background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    color: #64748b;
}

.conversation-item:hover {
    background: rgba(92, 107, 192, 0.08);           /* MD3 8% state layer */
}

.conversation-item.active {
    background: #E8EAF6;                            /* Light indigo */
    color: #5C6BC0;                                 /* Material Indigo text */
}
```

### Chat Messages

#### User Message (Gold)
```css
.user-message {
    background: #FFB74D;                            /* Flat Material Gold */
    color: #1e293b;
    border-bottom-right-radius: 6px;                /* Reduced radius for tail */
    border: none;
    font-family: 'Inter', 'Open Sans', Arial, sans-serif;
    font-weight: 400;                               /* MD3 body weight */
    font-size: 0.9375rem;
    letter-spacing: -0.01em;
    line-height: 1.6;
    padding: 12px 16px;
    margin-left: auto;                              /* Right-aligned */
    margin-right: 0;
    align-self: flex-end;
    box-shadow: none;                               /* MD3 flat - no shadows */
    max-width: 85%;
    animation: messageAppear 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}
```

#### Bot Message (White)
```css
.bot-message {
    background: white;                              /* Flat white - MD3 */
    color: #1e293b;
    border-bottom-left-radius: 6px;                 /* Reduced radius for tail */
    font-family: 'Inter', 'Open Sans', Arial, sans-serif;
    font-weight: 300;                               /* MD3 body light weight */
    font-size: 0.9375rem;
    letter-spacing: -0.01em;
    line-height: 1.6;
    padding: 12px 16px;
    margin-left: 0;                                 /* Left-aligned */
    margin-right: auto;
    align-self: flex-start;
    box-shadow: none;                               /* MD3 flat - no shadows */
    border: 1px solid rgba(0, 0, 0, 0.05);          /* Subtle border */
    max-width: 85%;
    animation: messageAppear 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}
```

### Artifact Panel

#### Header (Gold with White Text)
```css
.artifact-header {
    padding: 0.875rem 2rem;
    background: #FFB74D;                            /* Flat Material Gold - MD3 */
    border-bottom: none;                            /* MD3 flat - no borders */
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.artifact-title {
    font-size: 1.5rem;
    font-weight: 700;                               /* MD3 bold weight */
    color: white;                                   /* White text on gold background */
    letter-spacing: -0.01em;
}

.artifact-close-btn {
    background: transparent;
    border: none;
    border-radius: 50%;                             /* MD3 circular */
    width: 32px;
    height: 32px;
    color: white;                                   /* White icon on gold background */
    transition: background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.artifact-close-btn:hover {
    background: rgba(255, 255, 255, 0.12);          /* MD3 state layer on dark bg */
}
```

### Loading Spinner

#### MD3 Flat Dots Animation
```css
.loading-spinner {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    height: 40px;
}

.loading-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    animation: dotPulse 1.4s ease-in-out infinite;
}

/* MD3 Indigo dots (flat - no gradients) */
.loading-dot:nth-child(1) {
    background: #5C6BC0;                            /* Material Indigo */
    animation-delay: 0s;
}

.loading-dot:nth-child(2) {
    background: #7986CB;                            /* Light Material Indigo */
    animation-delay: 0.2s;
}

/* MD3 Gold dots (flat - no gradients) */
.loading-dot:nth-child(3) {
    background: #FFB74D;                            /* Material Gold */
    animation-delay: 0.4s;
}

.loading-dot:nth-child(4) {
    background: #FFA726;                            /* Dark Material Gold */
    animation-delay: 0.6s;
}
```

---

## Animations & Transitions

### Message Appear Animation
```css
@keyframes messageAppear {
    from {
        opacity: 0;
        transform: translateY(15px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.message {
    animation: messageAppear 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}
```

### Dot Pulse Animation (MD3 Flat)
```css
@keyframes dotPulse {
    0%, 80%, 100% {
        transform: scale(0.6) translateY(0);
        opacity: 0.4;                               /* Subtle opacity change */
    }
    40% {
        transform: scale(1) translateY(-8px);       /* Less dramatic scale */
        opacity: 1;
        box-shadow: none;                           /* MD3 flat - no shadows */
    }
}
```

### Layout Transitions
```css
/* Sidebar toggle transition */
.main-layout {
    transition: grid-template-columns 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Artifact panel fade-in */
.artifact-panel {
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s ease;
}

.main-layout[data-artifact-open="true"] .artifact-panel {
    opacity: 1;
    pointer-events: auto;
}
```

### Button Hover Transitions
```css
/* MD3 state layer transitions */
button {
    transition: background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
}

/* State layer pseudo-element */
button::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: currentColor;
    opacity: 0;
    transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

button:hover::before {
    opacity: 0.08;                                  /* MD3 hover state */
}

button:active::before {
    opacity: 0.12;                                  /* MD3 pressed state */
}
```

### React Implementation

```typescript
// Framer Motion variants for message animation
const messageVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1],
    }
  }
};

// Usage in component
<motion.div
  className="message user-message"
  variants={messageVariants}
  initial="hidden"
  animate="visible"
>
  {content}
</motion.div>
```

---

## Responsive Breakpoints

### Breakpoint System
```css
/* Mobile - Force sidebar collapsed, full-width artifact */
@media (max-width: 768px) {
    .main-layout {
        --sidebar-width: 60px;                      /* Always collapsed */
    }

    .artifact-panel {
        width: 100%;
        display: none;                              /* Hidden by default */
    }

    .main-layout[data-artifact-open="true"] .artifact-panel {
        display: flex;                              /* Show when opened */
    }
}

/* Tablet - Artifact becomes overlay */
@media (max-width: 1200px) {
    .main-layout[data-artifact-open="true"] {
        --artifact-width: 0px;                      /* Force 0 in grid */
    }

    .artifact-panel {
        position: fixed;                            /* Becomes overlay */
        top: 0;
        right: 0;
        bottom: 0;
        width: 50%;
        min-width: 400px;
        max-width: 600px;
        z-index: 1000;
        transform: translateX(100%);                /* Slide from right */
        transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .main-layout[data-artifact-open="true"] .artifact-panel {
        transform: translateX(0);
    }

    /* Backdrop overlay */
    .main-layout::after {
        content: '';
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
        z-index: 999;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s ease;
    }

    .main-layout[data-artifact-open="true"]::after {
        opacity: 1;
        pointer-events: auto;
    }
}

/* Very small mobile */
@media (max-width: 480px) {
    .main-layout {
        --sidebar-width: 50px;
    }
}
```

### React Implementation

```typescript
// hooks/useResponsive.ts
export const useResponsive = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      setIsTablet(window.innerWidth <= 1200 && window.innerWidth > 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return { isMobile, isTablet };
};
```

---

## Material Design 3 Implementation

### Key MD3 Principles Applied

1. **Flat Design - No Elevation/Shadows**
   - All components use `box-shadow: none`
   - No 3D effects, gradients, or depth
   - Clean, minimal aesthetic

2. **State Layers**
   - Hover: 8% opacity overlay (`rgba(color, 0.08)`)
   - Focus: 12% opacity overlay (`rgba(color, 0.12)`)
   - Pressed: 12% opacity overlay (`rgba(color, 0.12)`)

3. **Shape Tokens**
   ```css
   --md-sys-shape-corner-none: 0px;
   --md-sys-shape-corner-extra-small: 4px;
   --md-sys-shape-corner-small: 8px;
   --md-sys-shape-corner-medium: 12px;
   --md-sys-shape-corner-large: 16px;
   --md-sys-shape-corner-extra-large: 28px;
   --md-sys-shape-corner-full: 9999px;
   ```

4. **Color Roles**
   - **Primary**: `#5C6BC0` (Material Indigo)
   - **Secondary**: `#FFB74D` (Material Gold)
   - **Surface**: `#F5F5F5` (Flat gray)
   - **On-Surface**: `#1e293b` (Dark text)
   - **On-Primary**: `#ffffff` (White text on colored bg)

5. **Typography Scale**
   - Display: 3rem (48px), weight 400
   - Headline: 1.5rem (24px), weight 700
   - Title: 1.125rem (18px), weight 500
   - Body: 0.9375rem (15px), weight 300-400
   - Label: 0.8125rem (13px), weight 300

### React + Material UI v6 Configuration

```typescript
// theme/muiTheme.ts
import { createTheme } from '@mui/material/styles';

export const muiTheme = createTheme({
  palette: {
    primary: {
      main: '#5C6BC0',              // Material Indigo
      light: '#7986CB',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#FFB74D',              // Material Gold
      dark: '#FFA726',
      contrastText: '#ffffff',
    },
    background: {
      default: '#ffffff',
      paper: '#F5F5F5',
    },
    text: {
      primary: '#1e293b',
      secondary: '#64748b',
    },
  },
  shape: {
    borderRadius: 12,               // MD3 medium
  },
  typography: {
    fontFamily: "'Inter', 'Open Sans', Arial, sans-serif",
    h1: {
      fontSize: '3rem',
      fontWeight: 400,
      letterSpacing: '-0.025em',
      lineHeight: 1.2,
      color: '#1e3a8a',
    },
    h2: {
      fontSize: '1.5rem',
      fontWeight: 700,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontSize: '1.125rem',
      fontWeight: 500,
      letterSpacing: '-0.02em',
    },
    body1: {
      fontSize: '0.9375rem',
      fontWeight: 400,
      letterSpacing: '-0.01em',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.9375rem',
      fontWeight: 300,
      letterSpacing: '-0.01em',
      lineHeight: 1.6,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
      },
    },
  },
});
```

---

## Validation Checklist

### Pre-Migration Preparation
- [ ] Document all CSS files and their dependencies
- [ ] Take screenshots of every page at 3 viewport sizes (mobile, tablet, desktop)
- [ ] Record video of all animations and transitions
- [ ] Export all CSS custom properties to JSON
- [ ] Create style comparison matrix

### During Migration
- [ ] Use exact same color values (hex codes must match)
- [ ] Preserve all font sizes, weights, and letter-spacing
- [ ] Maintain exact spacing values (padding, margin, gap)
- [ ] Keep identical border-radius values
- [ ] Use same animation timing functions and durations
- [ ] Preserve z-index hierarchy
- [ ] Maintain responsive breakpoints
- [ ] Keep CSS Grid layout structure
- [ ] Preserve Material Design 3 state layers
- [ ] Maintain flat design (no shadows/gradients)

### Post-Migration Testing

#### Visual Regression Testing
```bash
# Install Playwright for visual regression
npm install -D @playwright/test

# Run visual comparison tests
npx playwright test visual-regression.spec.ts
```

#### Component-by-Component Validation
For each component:
1. **Screenshot Comparison**
   - Side-by-side: Flask vs React
   - Pixel-perfect diff using Percy or Chromatic
   - Test all states: default, hover, active, disabled

2. **Animation Verification**
   - Record both versions at 60fps
   - Compare timing, easing, and smoothness
   - Validate CSS keyframes match exactly

3. **Responsive Testing**
   - Test at: 375px, 768px, 1024px, 1440px, 1920px
   - Verify breakpoint transitions
   - Check overlay behavior on tablet/mobile

4. **Interaction Testing**
   - Click all buttons
   - Hover all interactive elements
   - Test keyboard navigation
   - Verify focus states

### Automated Validation Script

```typescript
// scripts/validateVisualParity.ts
import { chromium } from '@playwright/test';

const REFERENCE_URLS = {
  flask: 'http://localhost:5000',
  react: 'http://localhost:5173',
};

const PAGES_TO_TEST = [
  '/',
  '/login',
  '/agents',
  '/chat',
];

const VIEWPORTS = [
  { width: 375, height: 667, name: 'mobile' },
  { width: 768, height: 1024, name: 'tablet' },
  { width: 1440, height: 900, name: 'desktop' },
];

async function captureScreenshots() {
  const browser = await chromium.launch();

  for (const page of PAGES_TO_TEST) {
    for (const viewport of VIEWPORTS) {
      const context = await browser.newContext({ viewport });
      const browserPage = await context.newPage();

      // Capture Flask version
      await browserPage.goto(`${REFERENCE_URLS.flask}${page}`);
      await browserPage.screenshot({
        path: `./screenshots/flask/${viewport.name}${page.replace(/\//g, '-')}.png`,
        fullPage: true
      });

      // Capture React version
      await browserPage.goto(`${REFERENCE_URLS.react}${page}`);
      await browserPage.screenshot({
        path: `./screenshots/react/${viewport.name}${page.replace(/\//g, '-')}.png`,
        fullPage: true
      });

      await context.close();
    }
  }

  await browser.close();
  console.log('✓ Screenshots captured for comparison');
}

captureScreenshots();
```

### CSS Property Comparison

```typescript
// scripts/compareCSSProperties.ts
const CRITICAL_PROPERTIES = [
  'color',
  'background-color',
  'font-size',
  'font-weight',
  'padding',
  'margin',
  'border-radius',
  'box-shadow',
  'transition',
  'animation',
];

async function compareStyles(flaskElement: Element, reactElement: Element) {
  const flaskStyles = window.getComputedStyle(flaskElement);
  const reactStyles = window.getComputedStyle(reactElement);

  const differences: string[] = [];

  for (const prop of CRITICAL_PROPERTIES) {
    const flaskValue = flaskStyles.getPropertyValue(prop);
    const reactValue = reactStyles.getPropertyValue(prop);

    if (flaskValue !== reactValue) {
      differences.push(`${prop}: Flask="${flaskValue}" vs React="${reactValue}"`);
    }
  }

  return differences;
}
```

---

## Critical Success Metrics

### 1. Visual Metrics
- **Color Match**: 100% (all hex codes identical)
- **Typography Match**: 100% (font-size, weight, spacing)
- **Spacing Match**: 100% (padding, margin, gap)
- **Animation Match**: 100% (duration, timing function)

### 2. Layout Metrics
- **Grid Structure**: Exact 3-zone layout preserved
- **Responsive Behavior**: Identical breakpoints
- **Aspect Ratios**: Maintained across viewports
- **Overflow Handling**: Same scrolling behavior

### 3. Interaction Metrics
- **Hover States**: Pixel-perfect match
- **Click Feedback**: Same timing and animation
- **Loading States**: Identical spinner and progress
- **Error States**: Same visual treatment

### 4. Performance Metrics
- **Animation FPS**: 60fps maintained
- **Layout Shift**: Zero (CLS = 0)
- **Transition Smoothness**: Same cubic-bezier curves
- **Render Time**: ≤ Flask render time

---

## Known Edge Cases

### 1. Browser Differences
- **Safari**: Test backdrop-filter blur
- **Firefox**: Verify flexbox min-height: 0
- **Edge**: Check CSS Grid compatibility

### 2. Font Rendering
- **Windows**: ClearType rendering differences
- **macOS**: Retina display font smoothing
- **Linux**: Font hinting variations

### 3. Animation Performance
- **Mobile Safari**: Will-change property usage
- **Chrome**: GPU acceleration with transform: translateZ(0)
- **Firefox**: Backface-visibility: hidden

---

## Migration Sign-Off Criteria

Before considering the React migration complete:

1. **Visual Audit Pass**
   - [ ] All components pixel-perfect match
   - [ ] All colors use exact hex codes
   - [ ] All fonts match size/weight/spacing
   - [ ] All animations have correct timing

2. **Functionality Audit Pass**
   - [ ] All interactions work identically
   - [ ] All hover states behave the same
   - [ ] All transitions smooth and correct
   - [ ] All responsive breakpoints match

3. **Performance Audit Pass**
   - [ ] 60fps animations maintained
   - [ ] Zero layout shift (CLS = 0)
   - [ ] Load time ≤ Flask version
   - [ ] Bundle size optimized

4. **User Acceptance**
   - [ ] Internal team review passed
   - [ ] Beta user testing passed
   - [ ] No visual regression reports
   - [ ] Positive feedback on UI/UX

---

## Conclusion

This guide ensures **zero visual or UX loss** during the React migration. Every design token, color, spacing value, animation, and interaction pattern is documented to guarantee 100% parity.

**Golden Rule**: When in doubt, always reference the Flask implementation and match it exactly. This is a technology upgrade, not a redesign.
