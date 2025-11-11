/**
 * Landing Page - Agent Showcase Animation
 * Click-to-advance stacked carousel with typewriter effect
 */

// Sample chart data for showcase
const showcaseChartData = {
    1: {
        "data": [
            {"category": 2020, "series": "Centralised", "value": 150, "formatted_value": "150"},
            {"category": 2020, "series": "Distributed", "value": 635, "formatted_value": "635"},
            {"category": 2021, "series": "Centralised", "value": 54.03, "formatted_value": "54.0"},
            {"category": 2021, "series": "Distributed", "value": 890.22, "formatted_value": "890"},
            {"category": 2022, "series": "Centralised", "value": 355, "formatted_value": "355"},
            {"category": 2022, "series": "Distributed", "value": 2115, "formatted_value": "2.1k"},
            {"category": 2023, "series": "Centralised", "value": 924, "formatted_value": "924"},
            {"category": 2023, "series": "Distributed", "value": 4331, "formatted_value": "4.3k"},
            {"category": 2024, "series": "Centralised", "value": 2246, "formatted_value": "2.2k"},
            {"category": 2024, "series": "Distributed", "value": 4436, "formatted_value": "4.4k"}
        ],
        "plot_type": "stacked",
        "title": "Annual Market by Connection Type",
        "unit": "MW",
        "x_axis_label": "",
        "y_axis_label": "Capacity (MW)",
        "series_info": [
            {"name": "Centralised"},
            {"name": "Distributed"}
        ]
    },
    2: {
        "data": [
            {"category": 2022, "series": "China", "value": 0.18, "formatted_value": "$0.18"},
            {"category": 2023, "series": "China", "value": 0.12, "formatted_value": "$0.12"},
            {"category": 2024, "series": "China", "value": 0.09, "formatted_value": "$0.09"},
            {"category": 2022, "series": "India", "value": 0.24, "formatted_value": "$0.24"},
            {"category": 2023, "series": "India", "value": 0.19, "formatted_value": "$0.19"},
            {"category": 2024, "series": "India", "value": 0.15, "formatted_value": "$0.15"}
        ],
        "plot_type": "bar",
        "title": "Module Prices: China vs India",
        "unit": "$/W",
        "x_axis_label": "",
        "y_axis_label": "Price ($/W)",
        "series_info": [
            {"name": "China"},
            {"name": "India"}
        ]
    }
};

/**
 * Initialize the agent showcase carousel
 */
function initAgentShowcase() {
    const cards = document.querySelectorAll('.agent-showcase-card');

    if (cards.length === 0) return; // Exit if no cards (mobile view)

    let currentIndex = 0;
    let autoRotateInterval;
    const autoRotateDuration = 8000; // Auto-rotate every 8 seconds
    const pauseDuration = 10000; // Pause for 10 seconds after manual interaction
    let currentAnimation = null; // Track current animation

    // Store original text content for each card
    const cardData = [];
    cards.forEach((card, idx) => {
        const userMessageWrapper = card.querySelector('.user-message-wrapper');
        const agentResponseWrapper = card.querySelector('.agent-response-wrapper');
        const userMessage = userMessageWrapper ? userMessageWrapper.querySelector('.user-message') : null;
        const agentResponse = agentResponseWrapper ? agentResponseWrapper.querySelector('.agent-response') : null;
        const agentChart = card.querySelector('.agent-response-chart');
        const chartContainer = card.querySelector('.interactive-chart-container');
        const agentStatus = card.querySelector('.agent-status');

        cardData.push({
            userText: userMessage ? userMessage.textContent.trim() : '',
            agentText: agentResponse ? agentResponse.textContent.trim() : '',
            hasChart: !!chartContainer,
            chartContainer: chartContainer,
            chartData: showcaseChartData[idx + 1] || null,
            chartElement: agentChart,
            statusElement: agentStatus,
            userElement: userMessage,
            agentElement: agentResponse
        });

    });

    // Now clear initial content after cardData is built
    cardData.forEach((data, idx) => {
        if (data.userElement) data.userElement.textContent = '';
        if (data.agentElement) data.agentElement.textContent = '';
        // Only hide chart initially if card has text response
        if (data.chartElement && data.agentText) {
            data.chartElement.style.display = 'none';
        }
    });

    /**
     * Typewriter effect - clean implementation
     * @param {HTMLElement} element - Element to type text into
     * @param {string} text - Text to type
     * @param {number} speed - Typing speed in milliseconds
     * @returns {Promise} Promise that resolves when typing is complete
     */
    function typeText(element, text, speed = 30) {
        return new Promise((resolve) => {
            // Clear element and start fresh
            element.textContent = '';
            let index = 0;
            let intervalId = null;

            // Add cursor
            const cursor = document.createElement('span');
            cursor.className = 'typing-cursor';
            element.appendChild(cursor);

            intervalId = setInterval(() => {
                // Check if cursor is still in the DOM
                if (!cursor.parentNode || cursor.parentNode !== element) {
                    clearInterval(intervalId);
                    resolve();
                    return;
                }

                if (index < text.length) {
                    try {
                        // Insert character before cursor
                        const textNode = document.createTextNode(text[index]);
                        element.insertBefore(textNode, cursor);
                        index++;
                    } catch (error) {
                        // If insertion fails, stop the animation
                        clearInterval(intervalId);
                        resolve();
                    }
                } else {
                    clearInterval(intervalId);
                    // Remove cursor after a brief pause
                    setTimeout(() => {
                        if (cursor.parentNode === element) {
                            cursor.remove();
                        }
                        resolve();
                    }, 500);
                }
            }, speed);
        });
    }

    /**
     * Animate card content when it becomes visible
     * @param {number} index - Index of the card to animate
     */
    async function animateCard(index) {
        const data = cardData[index];
        if (!data) return;

        // Store this animation as current
        const thisAnimation = {};
        currentAnimation = thisAnimation;

        // Update status to "Searching..." or similar
        if (data.statusElement) {
            data.statusElement.textContent = 'Searching...';
        }

        // Type user message
        if (data.userElement && data.userText) {
            await typeText(data.userElement, data.userText, 40);
            if (currentAnimation !== thisAnimation) return; // Animation cancelled
        }

        // Small delay between user message and agent response
        await new Promise(resolve => setTimeout(resolve, 300));
        if (currentAnimation !== thisAnimation) return; // Animation cancelled

        // Update status to show agent is responding
        if (data.statusElement) {
            if (data.hasChart) {
                data.statusElement.textContent = 'Generating visualization...';
            } else {
                data.statusElement.textContent = 'Responding...';
            }
        }

        // Type agent response if exists
        if (data.agentElement && data.agentText) {
            await typeText(data.agentElement, data.agentText, 25);
            if (currentAnimation !== thisAnimation) return; // Animation cancelled
        }

        // Show chart with fade-in animation if exists
        if (data.hasChart && data.chartElement && data.chartContainer && data.chartData) {
            await new Promise(resolve => setTimeout(resolve, 300));
            if (currentAnimation !== thisAnimation) return; // Animation cancelled

            data.chartElement.style.display = 'flex';
            data.chartElement.classList.add('chart-fade-in');

            // Render D3 chart using simplified renderer
            await new Promise(resolve => setTimeout(resolve, 200));
            if (currentAnimation !== thisAnimation) return; // Animation cancelled

            try {
                // renderShowcaseChart is available globally from landing-charts.js
                if (typeof window.renderShowcaseChart === 'function') {
                    window.renderShowcaseChart(data.chartContainer.id, data.chartData);
                }
            } catch (error) {
                console.error('Error rendering chart:', error);
            }
        }

        // Update status to complete (only if animation wasn't cancelled)
        if (currentAnimation === thisAnimation && data.statusElement) {
            data.statusElement.textContent = 'Complete';
        }
    }

    /**
     * Reset card content
     * @param {number} index - Index of the card to reset
     */
    function resetCard(index) {
        // Cancel any ongoing animation
        currentAnimation = null;

        const data = cardData[index];
        if (!data) return;

        if (data.userElement) data.userElement.textContent = '';
        if (data.agentElement) data.agentElement.textContent = '';
        if (data.chartElement) {
            data.chartElement.style.display = 'none';
            data.chartElement.classList.remove('chart-fade-in');
        }
        if (data.chartContainer) {
            data.chartContainer.innerHTML = '';
        }
        if (data.statusElement) data.statusElement.textContent = 'Idle';
    }

    /**
     * Update card positions based on current index
     */
    function updateCardPositions() {
        cards.forEach((card, index) => {
            // Calculate relative position from current index
            let position = (index - currentIndex + cards.length) % cards.length;

            const oldPosition = card.getAttribute('data-position');

            // Set data-position attribute for CSS transitions
            if (position === 0) {
                card.setAttribute('data-position', '0'); // Front

                // Animate content when card becomes front
                if (oldPosition !== '0') {
                    resetCard(index);
                    // Small delay before starting animation
                    setTimeout(() => animateCard(index), 600);
                }
            } else if (position === 1) {
                card.setAttribute('data-position', '1'); // Second
            } else if (position === 2) {
                card.setAttribute('data-position', '2'); // Third
            } else {
                card.setAttribute('data-position', '-1'); // Hidden
            }
        });
    }

    /**
     * Navigate to next card
     */
    function nextCard() {
        currentIndex = (currentIndex + 1) % cards.length;
        updateCardPositions();
    }

    /**
     * Start auto-rotation
     */
    function startAutoRotate() {
        stopAutoRotate(); // Clear any existing interval
        autoRotateInterval = setInterval(nextCard, autoRotateDuration);
    }

    /**
     * Stop auto-rotation
     */
    function stopAutoRotate() {
        if (autoRotateInterval) {
            clearInterval(autoRotateInterval);
            autoRotateInterval = null;
        }
    }

    /**
     * Handle manual interaction (pauses auto-rotation temporarily)
     * @param {Function} callback - Function to call for the interaction
     */
    function handleManualInteraction(callback) {
        stopAutoRotate();
        callback();
        // Resume auto-rotation after pause duration
        setTimeout(startAutoRotate, pauseDuration);
    }

    // Add click/tap listeners to cards
    cards.forEach(card => {
        card.addEventListener('click', () => {
            // Only advance if clicking the front card
            if (card.getAttribute('data-position') === '0') {
                handleManualInteraction(nextCard);
            }
        });
    });

    // Initialize positions and start first card animation
    updateCardPositions();
    animateCard(0); // Start animation for first card
    startAutoRotate();
}

// Initialize showcase when page loads
document.addEventListener('DOMContentLoaded', initAgentShowcase);

// Make function available globally
if (typeof window !== 'undefined') {
    window.initAgentShowcase = initAgentShowcase;
}
