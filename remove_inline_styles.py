#!/usr/bin/env python3
"""
Remove the inline <style> block from landing.html
The styles are already in landing.css
"""

import re

# Read the landing.html file
with open('templates/landing.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the entire <style> block in the head section
content = re.sub(
    r'    <style>.*?    </style>\n',
    '',
    content,
    flags=re.DOTALL
)

# Write the cleaned content back
with open('templates/landing.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Successfully removed inline <style> block from landing.html")
print("✅ All styles are now in static/css/landing.css")
