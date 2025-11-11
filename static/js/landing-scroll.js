/**
 * Landing Page - Smooth Scroll and Navigation Effects
 */

/**
 * Custom smooth scrolling for navigation links with slower animation
 * @param {HTMLElement} target - Element to scroll to
 * @param {number} duration - Duration of scroll animation in milliseconds
 */
function smoothScrollTo(target, duration = 2000) {
    const targetPosition = target.offsetTop - (document.querySelector('nav')?.offsetHeight || 0) - 20;
    const startPosition = window.pageYOffset;
    const distance = targetPosition - startPosition;
    let startTime = null;

    function easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function animation(currentTime) {
        if (startTime === null) startTime = currentTime;
        const timeElapsed = currentTime - startTime;
        const progress = Math.min(timeElapsed / duration, 1);
        const ease = easeInOutCubic(progress);

        window.scrollTo(0, startPosition + (distance * ease));

        if (timeElapsed < duration) {
            requestAnimationFrame(animation);
        }
    }

    requestAnimationFrame(animation);
}

/**
 * Initialize smooth scrolling for anchor links
 */
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href === '#' || href === '') return; // Skip empty or just # links

            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                smoothScrollTo(target, 2000); // 2000ms = 2 seconds for very smooth, slow scroll
            }
        });
    });
}

/**
 * Add scroll effect to navigation (sticky nav on scroll)
 */
function initNavigationEffect() {
    window.addEventListener('scroll', function() {
        const nav = document.querySelector('nav');
        if (!nav) return;

        if (window.scrollY > 100) {
            nav.style.position = 'fixed';
            nav.style.top = '0';
            nav.style.left = '0';
            nav.style.right = '0';
            nav.style.background = 'rgba(0, 10, 85, 0.95)';
            nav.style.backdropFilter = 'blur(20px)';
            nav.style.borderBottom = '1px solid rgba(233, 165, 68, 0.1)';
            nav.style.transition = 'all 0.3s ease';
            nav.style.zIndex = '100';
        } else {
            nav.style.position = 'relative';
            nav.style.background = 'transparent';
            nav.style.backdropFilter = 'none';
            nav.style.borderBottom = 'none';
        }
    });
}

/**
 * Ensure page is scrollable
 */
function ensureScrollable() {
    document.body.style.overflowY = 'auto';
    document.documentElement.style.overflowY = 'auto';
}

/**
 * Initialize all scroll-related functionality
 */
function initScroll() {
    initSmoothScroll();
    initNavigationEffect();
    ensureScrollable();
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', initScroll);

// Make functions available globally
if (typeof window !== 'undefined') {
    window.smoothScrollTo = smoothScrollTo;
    window.initSmoothScroll = initSmoothScroll;
    window.initNavigationEffect = initNavigationEffect;
    window.initScroll = initScroll;
}
