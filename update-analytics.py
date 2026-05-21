#!/usr/bin/env python3
import os
import re
from pathlib import Path

# Pattern to find and replace
old_pattern = r'<script src="/app\.js" defer></script>\s*<script>\s*window\.va = window\.va \|\| function \(\) \{ \(window\.vaq = window\.vaq \|\| \[\]\)\.push\(arguments\); \};\s*</script>'
new_text = '<script src="/app.js" defer></script>\n<script src="/analytics-bundle.js" defer></script>'

# Find all HTML files
html_files = list(Path('.').rglob('*.html'))

updated_count = 0
for html_file in html_files:
    try:
        with open(html_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Replace the pattern
        new_content = re.sub(old_pattern, new_text, content)
        
        if new_content != content:
            with open(html_file, 'w', encoding='utf-8') as f:
                f.write(new_content)
            updated_count += 1
            print(f"Updated: {html_file}")
    except Exception as e:
        print(f"Error processing {html_file}: {e}")

print(f"\nTotal files updated: {updated_count}")
