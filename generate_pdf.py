from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.lib import colors
import re

OUTPUT = "/Users/ciaranwentz/yacht-away-now/partnership-proposal.pdf"
INPUT = "/Users/ciaranwentz/yacht-away-now/partnership-proposal.md"

doc = SimpleDocTemplate(
    OUTPUT,
    pagesize=letter,
    topMargin=0.75*inch,
    bottomMargin=0.75*inch,
    leftMargin=0.75*inch,
    rightMargin=0.75*inch
)

styles = getSampleStyleSheet()

navy = HexColor("#1a365d")
accent = HexColor("#2b6cb0")
light_bg = HexColor("#ebf8ff")
dark_text = HexColor("#1a202c")
gray_text = HexColor("#4a5568")

styles.add(ParagraphStyle(
    name='DocTitle',
    parent=styles['Title'],
    fontSize=24,
    textColor=navy,
    spaceAfter=6,
    alignment=TA_CENTER,
    fontName='Helvetica-Bold'
))

styles.add(ParagraphStyle(
    name='Subtitle',
    parent=styles['Normal'],
    fontSize=11,
    textColor=gray_text,
    alignment=TA_CENTER,
    spaceAfter=4,
))

styles.add(ParagraphStyle(
    name='H1',
    parent=styles['Heading1'],
    fontSize=16,
    textColor=navy,
    spaceBefore=20,
    spaceAfter=10,
    fontName='Helvetica-Bold'
))

styles.add(ParagraphStyle(
    name='H2',
    parent=styles['Heading2'],
    fontSize=13,
    textColor=accent,
    spaceBefore=14,
    spaceAfter=8,
    fontName='Helvetica-Bold'
))

styles.add(ParagraphStyle(
    name='H3',
    parent=styles['Heading3'],
    fontSize=11,
    textColor=dark_text,
    spaceBefore=10,
    spaceAfter=6,
    fontName='Helvetica-Bold'
))

styles.add(ParagraphStyle(
    name='Body',
    parent=styles['Normal'],
    fontSize=10,
    textColor=dark_text,
    spaceAfter=6,
    leading=14,
))

styles.add(ParagraphStyle(
    name='BulletCustom',
    parent=styles['Normal'],
    fontSize=10,
    textColor=dark_text,
    spaceAfter=4,
    leading=14,
    leftIndent=20,
    bulletIndent=8,
))

styles.add(ParagraphStyle(
    name='NumberedItem',
    parent=styles['Normal'],
    fontSize=10,
    textColor=dark_text,
    spaceAfter=4,
    leading=14,
    leftIndent=20,
))

styles.add(ParagraphStyle(
    name='CheckItem',
    parent=styles['Normal'],
    fontSize=10,
    textColor=dark_text,
    spaceAfter=4,
    leading=14,
    leftIndent=20,
))

def bold_inline(text):
    text = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', text)
    text = re.sub(r'__(.+?)__', r'<b>\1</b>', text)
    return text

def parse_table(lines):
    rows = []
    for line in lines:
        line = line.strip().strip('|')
        cells = [c.strip() for c in line.split('|')]
        rows.append(cells)
    if len(rows) >= 2 and all(re.match(r'^[-:]+$', c) for c in rows[1]):
        rows.pop(1)
    return rows

def make_table(rows):
    if not rows:
        return None
    max_cols = max(len(r) for r in rows)
    for r in rows:
        while len(r) < max_cols:
            r.append('')

    styled_rows = []
    for i, row in enumerate(rows):
        styled_row = []
        for cell in row:
            cell_text = bold_inline(cell)
            if i == 0:
                styled_row.append(Paragraph(cell_text, ParagraphStyle(
                    'TableHeader', parent=styles['Normal'],
                    fontSize=9, fontName='Helvetica-Bold',
                    textColor=colors.white, leading=12
                )))
            else:
                styled_row.append(Paragraph(cell_text, ParagraphStyle(
                    'TableCell', parent=styles['Normal'],
                    fontSize=9, textColor=dark_text, leading=12
                )))
        styled_rows.append(styled_row)

    available_width = letter[0] - 1.5*inch
    col_width = available_width / max_cols
    col_widths = [col_width] * max_cols

    t = Table(styled_rows, colWidths=col_widths, repeatRows=1)
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), navy),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, HexColor("#cbd5e0")),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 1), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 5),
    ]
    for i in range(1, len(styled_rows)):
        if i % 2 == 0:
            style_cmds.append(('BACKGROUND', (0, i), (-1, i), light_bg))

    t.setStyle(TableStyle(style_cmds))
    return t

with open(INPUT, 'r') as f:
    md_lines = f.readlines()

story = []
i = 0
while i < len(md_lines):
    line = md_lines[i].rstrip('\n')
    stripped = line.strip()

    if not stripped:
        i += 1
        continue

    if stripped == '---':
        story.append(HRFlowable(width="100%", thickness=1, color=HexColor("#e2e8f0"), spaceAfter=10, spaceBefore=10))
        i += 1
        continue

    if stripped.startswith('# ') and not stripped.startswith('## '):
        text = stripped[2:]
        story.append(Spacer(1, 10))
        story.append(Paragraph(bold_inline(text), styles['DocTitle']))
        i += 1
        continue

    if stripped.startswith('**Prepared by:**') or stripped.startswith('**Date:**') or stripped.startswith('**Version:**'):
        text = bold_inline(stripped)
        story.append(Paragraph(text, styles['Subtitle']))
        i += 1
        continue

    if stripped.startswith('#### '):
        text = stripped[5:]
        story.append(Paragraph(bold_inline(text), styles['H3']))
        i += 1
        continue

    if stripped.startswith('### '):
        text = stripped[4:]
        story.append(Paragraph(bold_inline(text), styles['H2']))
        i += 1
        continue

    if stripped.startswith('## '):
        text = stripped[3:]
        story.append(Paragraph(bold_inline(text), styles['H1']))
        i += 1
        continue

    if stripped.startswith('|') and '|' in stripped[1:]:
        table_lines = []
        while i < len(md_lines) and md_lines[i].strip().startswith('|'):
            table_lines.append(md_lines[i].strip())
            i += 1
        rows = parse_table(table_lines)
        t = make_table(rows)
        if t:
            story.append(t)
            story.append(Spacer(1, 8))
        continue

    if stripped.startswith('- [ ] '):
        text = stripped[6:]
        story.append(Paragraph(f"\u2610 {bold_inline(text)}", styles['CheckItem']))
        i += 1
        continue

    if stripped.startswith('- '):
        text = stripped[2:]
        story.append(Paragraph(f"\u2022 {bold_inline(text)}", styles['BulletCustom']))
        i += 1
        continue

    if re.match(r'^\d+\.', stripped):
        text = re.sub(r'^\d+\.\s*', '', stripped)
        num = re.match(r'^(\d+)\.', stripped).group(1)
        story.append(Paragraph(f"{num}. {bold_inline(text)}", styles['NumberedItem']))
        i += 1
        continue

    story.append(Paragraph(bold_inline(stripped), styles['Body']))
    i += 1

doc.build(story)
print(f"PDF generated: {OUTPUT}")
