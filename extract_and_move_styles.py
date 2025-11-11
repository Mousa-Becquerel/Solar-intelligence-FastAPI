#!/usr/bin/env python3
"""
Extract styles from landing.html <style> block and append to landing.css
Then remove the <style> block from landing.html
"""

import re

# Read landing.html
with open('templates/landing.html', 'r', encoding='utf-8') as f:
    html_content = f.read()

# Extract the <style> block content
style_match = re.search(r'    <style>(.*?)    </style>', html_content, flags=re.DOTALL)

if style_match:
    inline_styles = style_match.group(1).strip()

    # Read current landing.css
    with open('static/css/landing.css', 'r', encoding='utf-8') as f:
        css_content = f.read()

    # Append inline styles to landing.css with a header
    with open('static/css/landing.css', 'a', encoding='utf-8') as f:
        f.write('\n\n/* ============================================\n')
        f.write('   STYLES FROM INLINE <style> BLOCK\n')
        f.write('   Moved from landing.html for modularity\n')
        f.write('   ============================================ */\n\n')
        f.write(inline_styles)
        f.write('\n')

    print("✅ Appended inline styles to static/css/landing.css")

    # Now remove the <style> block from HTML
    html_content = re.sub(
        r'    <style>.*?    </style>\n',
        '',
        html_content,
        flags=re.DOTALL
    )

    with open('templates/landing.html', 'w', encoding='utf-8') as f:
        f.write(html_content)

    print("✅ Removed inline <style> block from landing.html")
    print("✅ All styles are now in static/css/landing.css")
else:
    print("❌ No <style> block found in landing.html")
