/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // ========================================
      // BRAND COLORS - Exact Match to Flask
      // ========================================
      colors: {
        // Primary Brand Colors
        'becq-blue': '#0a1850',
        'becq-gold': '#fbbf24',
        'becq-gold-dark': '#f59e42',
        'becq-white': '#ffffff',
        'becq-accent-blue': '#2563eb',

        // Material Design 3 Colors
        'md-indigo': '#5C6BC0',
        'md-indigo-light': '#7986CB',
        'md-gold': '#FFB74D',
        'md-gold-dark': '#FFA726',
        'md-surface': '#F5F5F5',
        'md-surface-white': '#ffffff',

        // Text Colors
        'md-text-navy': '#1e3a8a',
        'md-text-secondary': '#64748b',
        'md-text-dark': '#1e293b',

        // Chat Interface Colors
        'chat-primary': '#5C6BC0',
        'chat-surface': '#f8fafc',
        'chat-on-surface': '#1e293b',
        'chat-on-surface-variant': '#64748b',
      },

      // ========================================
      // SPACING SYSTEM - Exact Match
      // ========================================
      spacing: {
        'xs': '0.25rem',    // 4px
        'sm': '0.5rem',     // 8px
        'md': '1rem',       // 16px
        'lg': '1.5rem',     // 24px
        'xl': '2rem',       // 32px
      },

      // ========================================
      // BORDER RADIUS - Exact Match
      // ========================================
      borderRadius: {
        'none': '0px',
        'xs': '4px',
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '18px',
        'xxl': '28px',
        'full': '9999px',
      },

      // ========================================
      // BOX SHADOWS - Exact Match
      // ========================================
      boxShadow: {
        'sm': '0 2px 4px rgba(0, 0, 0, 0.05)',
        'md': '0 4px 8px rgba(0, 0, 0, 0.08)',
        'lg': '0 8px 16px rgba(0, 0, 0, 0.1)',
        'gold': '0 4px 16px rgba(251, 191, 36, 0.25), 0 2px 8px rgba(0, 0, 0, 0.08)',

        // Material Design 3 Elevation Tokens
        'md-1': '0px 1px 2px 0px rgba(0, 0, 0, 0.30), 0px 1px 3px 1px rgba(0, 0, 0, 0.15)',
        'md-2': '0px 1px 2px 0px rgba(0, 0, 0, 0.30), 0px 2px 6px 2px rgba(0, 0, 0, 0.15)',
        'md-3': '0px 1px 3px 0px rgba(0, 0, 0, 0.30), 0px 4px 8px 3px rgba(0, 0, 0, 0.15)',
        'md-4': '0px 2px 3px 0px rgba(0, 0, 0, 0.30), 0px 6px 10px 4px rgba(0, 0, 0, 0.15)',
        'md-5': '0px 4px 4px 0px rgba(0, 0, 0, 0.30), 0px 8px 12px 6px rgba(0, 0, 0, 0.15)',

        // Override defaults to have no shadow (MD3 flat design)
        'none': 'none',
      },

      // ========================================
      // Z-INDEX LAYERS - Exact Match
      // ========================================
      zIndex: {
        'base': 1,
        'dropdown': 100,
        'sticky': 200,
        'modal': 1000,
        'tooltip': 2000,
      },

      // ========================================
      // TRANSITIONS - Exact Match
      // ========================================
      transitionTimingFunction: {
        'fast': 'ease',
        'normal': 'ease',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'md3': 'cubic-bezier(0.4, 0, 0.2, 1)', // Material Design 3 easing
      },
      transitionDuration: {
        'fast': '200ms',
        'normal': '300ms',
        'layout': '400ms',
      },

      // ========================================
      // TYPOGRAPHY - Exact Match
      // ========================================
      fontFamily: {
        'primary': ["'Inter'", "'Open Sans'", 'Arial', 'sans-serif'],
      },
      fontSize: {
        // Welcome messages
        'welcome-title': ['3rem', { lineHeight: '1.2', letterSpacing: '-0.025em', fontWeight: '400' }],
        'welcome-subtitle': ['1.125rem', { lineHeight: '1.65', letterSpacing: '-0.01em', fontWeight: '300' }],

        // Artifact
        'artifact-title': ['1.5rem', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '700' }],

        // Sidebar
        'sidebar-title': ['1.125rem', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '500' }],
        'sidebar-subtitle': ['0.8125rem', { lineHeight: '1.5', letterSpacing: '-0.01em', fontWeight: '300' }],

        // Messages
        'message': ['0.9375rem', { lineHeight: '1.6', letterSpacing: '-0.01em' }],
        'message-user': ['0.9375rem', { lineHeight: '1.6', letterSpacing: '-0.01em', fontWeight: '400' }],
        'message-bot': ['0.9375rem', { lineHeight: '1.6', letterSpacing: '-0.01em', fontWeight: '300' }],

        // Loading
        'loading': ['0.8125rem', { lineHeight: '1.5', letterSpacing: '-0.005em', fontWeight: '300' }],
      },
      fontWeight: {
        'light': '300',
        'regular': '400',
        'medium': '500',
        'bold': '700',
      },
      letterSpacing: {
        'tight': '-0.025em',
        'normal': '-0.01em',
        'wide': '-0.005em',
        'wider': '-0.02em',
      },
      lineHeight: {
        'tight': '1.2',
        'normal': '1.5',
        'relaxed': '1.6',
        'loose': '1.65',
      },

      // ========================================
      // LAYOUT - Grid Architecture Values
      // ========================================
      width: {
        'sidebar-expanded': '280px',
        'sidebar-collapsed': '72px',
        'sidebar-mobile': '60px',
        'sidebar-mobile-sm': '50px',
        'artifact-open': '40%',
      },
      height: {
        'full-viewport': '100vh',
      },

      // ========================================
      // ANIMATIONS - Custom Keyframes
      // ========================================
      keyframes: {
        messageAppear: {
          'from': {
            opacity: '0',
            transform: 'translateY(15px)',
          },
          'to': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        dotPulse: {
          '0%, 80%, 100%': {
            transform: 'scale(0.6) translateY(0)',
            opacity: '0.4',
          },
          '40%': {
            transform: 'scale(1) translateY(-8px)',
            opacity: '1',
          },
        },
        dotPulseMobile: {
          '0%, 80%, 100%': {
            transform: 'scale(0.6) translateY(0)',
            opacity: '0.4',
          },
          '40%': {
            transform: 'scale(1) translateY(-6px)',
            opacity: '1',
          },
        },
        pulseStep: {
          '0%, 100%': {
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
          },
          '50%': {
            boxShadow: '0 4px 20px rgba(37, 99, 235, 0.5)',
          },
        },
      },
      animation: {
        'message-appear': 'messageAppear 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'dot-pulse': 'dotPulse 1.4s ease-in-out infinite',
        'dot-pulse-mobile': 'dotPulseMobile 1.4s ease-in-out infinite',
        'pulse-step': 'pulseStep 2s ease-in-out infinite',
      },

      // ========================================
      // BACKDROP BLUR - For Overlays
      // ========================================
      backdropBlur: {
        'xs': '2px',
        'sm': '4px',
        'md': '8px',
      },

      // ========================================
      // OPACITY - MD3 State Layers
      // ========================================
      opacity: {
        'md-hover': '0.08',
        'md-focus': '0.12',
        'md-pressed': '0.12',
      },
    },
  },
  plugins: [
    // Plugin for Material Design 3 state layers
    function({ addUtilities }) {
      const mdStateLayer = {
        '.md-state-layer': {
          position: 'relative',
          overflow: 'hidden',
        },
        '.md-state-layer::before': {
          content: '""',
          position: 'absolute',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          background: 'currentColor',
          opacity: '0',
          transition: 'opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          pointerEvents: 'none',
        },
        '.md-state-layer:hover::before': {
          opacity: '0.08',
        },
        '.md-state-layer:focus::before': {
          opacity: '0.12',
        },
        '.md-state-layer:active::before': {
          opacity: '0.12',
        },
      };
      addUtilities(mdStateLayer);
    },

    // Plugin for scrollbar styling
    function({ addUtilities }) {
      const scrollbarUtilities = {
        '.scrollbar-thin': {
          scrollbarWidth: 'thin',
        },
        '.scrollbar-thin::-webkit-scrollbar': {
          width: '4px',
          height: '4px',
        },
        '.scrollbar-thin::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        '.scrollbar-thin::-webkit-scrollbar-thumb': {
          background: 'rgba(0, 0, 0, 0.05)',
          borderRadius: '2px',
        },
        '.scrollbar-thin::-webkit-scrollbar-thumb:hover': {
          background: 'rgba(0, 0, 0, 0.15)',
        },
      };
      addUtilities(scrollbarUtilities);
    },
  ],
};
