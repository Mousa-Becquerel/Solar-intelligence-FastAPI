/**
 * Landing Page - FAQ Accordion Functionality
 */

/**
 * Initialize FAQ accordion
 */
function initFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');

        question.addEventListener('click', () => {
            // Check if this item is already active
            const isActive = item.classList.contains('active');

            // Close all items
            faqItems.forEach(otherItem => {
                otherItem.classList.remove('active');
            });

            // If the clicked item wasn't active, open it
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });

    // Open first item by default
    if (faqItems.length > 0) {
        faqItems[0].classList.add('active');
    }
}

// Initialize FAQ when page loads
document.addEventListener('DOMContentLoaded', initFAQ);

// Make function available globally
if (typeof window !== 'undefined') {
    window.initFAQ = initFAQ;
}
