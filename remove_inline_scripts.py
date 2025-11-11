#!/usr/bin/env python3
"""
Remove inline scripts from landing.html
Replaces them with comments referencing the modular JS files
"""

import re

# Read the landing.html file
with open('templates/landing.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern to match script blocks (opening tag to closing tag)
# We'll replace each inline script block with a comment

# Remove D3 chart renderer script
content = re.sub(
    r'     <!-- ============================================\s+SIMPLIFIED D3 CHART RENDERER FOR LANDING PAGE\s+============================================ -->\s+<script>.*?</script>',
    '     <!-- D3 Chart Renderer - Now in landing-charts.js -->',
    content,
    flags=re.DOTALL
)

# Remove agent showcase animation script
content = re.sub(
    r'     <!-- ============================================\s+AGENT SHOWCASE ANIMATION\s+Click-to-advance stacked carousel with typewriter effect\s+============================================ -->\s+<script>.*?</script>',
    '     <!-- Agent Showcase Animation - Now in landing-showcase.js -->',
    content,
    flags=re.DOTALL
)

# Remove FAQ accordion script
content = re.sub(
    r'     <!-- ============================================\s+FAQ ACCORDION FUNCTIONALITY\s+============================================ -->\s+<script>.*?</script>',
    '     <!-- FAQ Accordion - Now in landing-faq.js -->',
    content,
    flags=re.DOTALL
)

# Remove contact widget script
content = re.sub(
    r'     <!-- ============================================\s+CONTACT WIDGET FUNCTIONALITY\s+============================================ -->\s+<script>.*?</script>',
    '     <!-- Contact Widget - Now in landing-contact.js -->',
    content,
    flags=re.DOTALL
)

# Write the cleaned content back
with open('templates/landing.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Successfully removed all inline scripts from landing.html")
print("✅ Replaced with comments referencing modular JS files")
