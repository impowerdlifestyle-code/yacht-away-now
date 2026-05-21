#!/usr/bin/env python3
"""
Add Vercel Web Analytics to all HTML files
"""
import os
import re
from pathlib import Path

# Vercel Analytics inline script for static HTML sites
ANALYTICS_SCRIPT = """<script>
  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
</script>
<script defer src="/_vercel/insights/script.js"></script>
"""

def add_analytics_to_html(file_path):
    """Add Vercel Analytics script to an HTML file if not already present"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check if analytics is already added
    if '_vercel/insights/script.js' in content or 'window.va' in content:
        print(f"✓ Skipping {file_path} - analytics already present")
        return False
    
    # Find the closing </body> tag and insert the analytics script before it
    if '</body>' in content:
        # Insert the analytics script right before </body>
        new_content = content.replace('</body>', f'{ANALYTICS_SCRIPT}</body>')
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        print(f"✓ Added analytics to {file_path}")
        return True
    else:
        print(f"✗ No </body> tag found in {file_path}")
        return False

def main():
    """Process all HTML files in the current directory"""
    html_files = list(Path('.').glob('*.html'))
    
    print(f"Found {len(html_files)} HTML files\n")
    
    modified_count = 0
    for html_file in sorted(html_files):
        if add_analytics_to_html(html_file):
            modified_count += 1
    
    print(f"\n✓ Modified {modified_count} files")

if __name__ == '__main__':
    main()
