/**
 * Landing Page - Contact Widget Functionality
 */

/**
 * Open contact widget
 */
function openContactWidget() {
    const widget = document.getElementById('contactWidget');
    if (widget) {
        widget.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }
}

/**
 * Close contact widget
 */
function closeContactWidget() {
    const widget = document.getElementById('contactWidget');
    if (widget) {
        widget.classList.remove('active');
        document.body.style.overflow = ''; // Restore scrolling
    }
}

/**
 * Initialize contact widget
 */
function initContactWidget() {
    const widget = document.getElementById('contactWidget');
    const form = document.getElementById('contactWidgetForm');

    if (!widget || !form) return;

    // Close widget when clicking outside
    widget.addEventListener('click', function(e) {
        if (e.target === this) {
            closeContactWidget();
        }
    });

    // Handle form submission
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const formData = new FormData(this);
        const submitButton = this.querySelector('.widget-submit-button');
        const originalText = submitButton.innerHTML;

        // Show loading state
        submitButton.disabled = true;
        submitButton.innerHTML = '<span>Sending...</span>';

        try {
            const response = await fetch('/submit-contact', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                // Replace form with success message
                const formContainer = document.querySelector('.contact-widget-content');
                formContainer.innerHTML = `
                    <div style="text-align: center; padding: 3rem 2rem;">
                        <div style="width: 64px; height: 64px; background: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem;">
                            <svg width="32" height="32" fill="none" stroke="white" stroke-width="3" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path>
                            </svg>
                        </div>
                        <h3 style="font-size: 1.5rem; font-weight: 600; color: #000A55; margin-bottom: 1rem;">Message Sent!</h3>
                        <p style="font-size: 1rem; color: #6b7280; margin-bottom: 2rem;">Thank you for your message! We will get back to you soon.</p>
                        <button onclick="closeContactWidget()" style="padding: 0.75rem 2rem; background: #2563eb; color: white; border: none; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer;">Close</button>
                    </div>
                `;
            } else {
                alert('An error occurred. Please try again.');
                submitButton.disabled = false;
                submitButton.innerHTML = originalText;
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Network error. Please try again.');
            submitButton.disabled = false;
            submitButton.innerHTML = originalText;
        }
    });

    // Close on Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeContactWidget();
        }
    });
}

// Initialize contact widget when page loads
document.addEventListener('DOMContentLoaded', initContactWidget);

// Make functions available globally
if (typeof window !== 'undefined') {
    window.openContactWidget = openContactWidget;
    window.closeContactWidget = closeContactWidget;
    window.initContactWidget = initContactWidget;
}
