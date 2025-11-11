/**
 * Landing Page - Main Entry Point
 * Initializes all landing page modules
 *
 * This file orchestrates all landing page functionality:
 * - Smooth scrolling and navigation effects
 * - Agent showcase carousel with animations
 * - FAQ accordion
 * - Contact widget/modal
 * - D3.js chart rendering
 */

// Note: These scripts are loaded via <script> tags in landing.html
// They make functions available globally via window object

/**
 * Initialize all landing page functionality
 */
function initLandingPage() {
    console.log('🚀 Initializing Solar Intelligence Landing Page...');

    // Initialize smooth scroll and navigation effects
    if (typeof window.initScroll === 'function') {
        window.initScroll();
        console.log('✅ Smooth scroll initialized');
    }

    // Initialize agent showcase carousel
    if (typeof window.initAgentShowcase === 'function') {
        window.initAgentShowcase();
        console.log('✅ Agent showcase initialized');
    }

    // Initialize FAQ accordion
    if (typeof window.initFAQ === 'function') {
        window.initFAQ();
        console.log('✅ FAQ accordion initialized');
    }

    // Initialize contact widget
    if (typeof window.initContactWidget === 'function') {
        window.initContactWidget();
        console.log('✅ Contact widget initialized');
    }

    console.log('✨ Landing page initialization complete!');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLandingPage);
} else {
    // DOM is already loaded
    initLandingPage();
}

// Make init function available globally
if (typeof window !== 'undefined') {
    window.initLandingPage = initLandingPage;
}
