#!/usr/bin/env python3
"""Generate SEO Audit PDF Report for Yacht Away Now"""

from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor, black, white
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from datetime import datetime

# Colors
NAVY = HexColor('#0a1628')
GOLD = HexColor('#c9a84c')
SEAFOAM = HexColor('#4ecdc4')
DARK_BG = HexColor('#0f1d2e')
CREAM = HexColor('#f5f0e8')
GRAY = HexColor('#8899aa')
WHITE = HexColor('#ffffff')
GREEN = HexColor('#22c55e')
YELLOW = HexColor('#eab308')
RED = HexColor('#ef4444')

output_path = '/Users/ciaranwentz/Downloads/YachtAwayNow-SEO-Audit-2026-03-31.pdf'

doc = SimpleDocTemplate(
    output_path,
    pagesize=letter,
    topMargin=0.6*inch,
    bottomMargin=0.6*inch,
    leftMargin=0.75*inch,
    rightMargin=0.75*inch
)

styles = getSampleStyleSheet()

# Custom styles
styles.add(ParagraphStyle(
    'ReportTitle', parent=styles['Title'],
    fontSize=28, textColor=NAVY, spaceAfter=6,
    fontName='Helvetica-Bold', alignment=TA_CENTER
))
styles.add(ParagraphStyle(
    'ReportSubtitle', parent=styles['Normal'],
    fontSize=12, textColor=GRAY, spaceAfter=20,
    fontName='Helvetica', alignment=TA_CENTER
))
styles.add(ParagraphStyle(
    'SectionHead', parent=styles['Heading1'],
    fontSize=18, textColor=NAVY, spaceBefore=24, spaceAfter=12,
    fontName='Helvetica-Bold', borderWidth=0,
    borderPadding=0, borderColor=GOLD
))
styles.add(ParagraphStyle(
    'SubHead', parent=styles['Heading2'],
    fontSize=14, textColor=NAVY, spaceBefore=16, spaceAfter=8,
    fontName='Helvetica-Bold'
))
styles.add(ParagraphStyle(
    'BodyText2', parent=styles['Normal'],
    fontSize=10, textColor=HexColor('#333333'), spaceAfter=8,
    fontName='Helvetica', leading=14
))
styles.add(ParagraphStyle(
    'SmallGray', parent=styles['Normal'],
    fontSize=8, textColor=GRAY, spaceAfter=4,
    fontName='Helvetica'
))
styles.add(ParagraphStyle(
    'ScoreBig', parent=styles['Normal'],
    fontSize=48, textColor=NAVY, alignment=TA_CENTER,
    fontName='Helvetica-Bold', spaceAfter=4
))
styles.add(ParagraphStyle(
    'ScoreLabel', parent=styles['Normal'],
    fontSize=14, textColor=GREEN, alignment=TA_CENTER,
    fontName='Helvetica-Bold', spaceAfter=20
))
styles.add(ParagraphStyle(
    'BulletItem', parent=styles['Normal'],
    fontSize=10, textColor=HexColor('#333333'), spaceAfter=4,
    fontName='Helvetica', leading=14, leftIndent=20,
    bulletIndent=8, bulletFontName='Helvetica', bulletFontSize=10
))

elements = []

# --- COVER PAGE ---
elements.append(Spacer(1, 1.5*inch))
elements.append(Paragraph('SEO AUDIT REPORT', styles['ReportTitle']))
elements.append(Spacer(1, 8))
elements.append(HRFlowable(width='40%', thickness=2, color=GOLD, spaceAfter=12))
elements.append(Paragraph('Yacht Away Now', ParagraphStyle(
    'BizName', parent=styles['Normal'], fontSize=20, textColor=GOLD,
    fontName='Helvetica-Bold', alignment=TA_CENTER, spaceAfter=8
)))
elements.append(Paragraph('yachtawaynow.com', styles['ReportSubtitle']))
elements.append(Spacer(1, 0.5*inch))
elements.append(Paragraph('91 / 100', styles['ScoreBig']))
elements.append(Paragraph('EXCELLENT', styles['ScoreLabel']))
elements.append(Spacer(1, 0.3*inch))
elements.append(Paragraph('Prepared by Nexus AI Agency', ParagraphStyle(
    'Prep', parent=styles['Normal'], fontSize=11, textColor=GRAY,
    fontName='Helvetica', alignment=TA_CENTER, spaceAfter=4
)))
elements.append(Paragraph(f'March 31, 2026', ParagraphStyle(
    'Date', parent=styles['Normal'], fontSize=11, textColor=GRAY,
    fontName='Helvetica', alignment=TA_CENTER
)))
elements.append(Spacer(1, 0.5*inch))

# Score trend
trend_data = [
    ['Audit', '#1', '#2', '#3', '#4', '#5 (Final)'],
    ['Score', '68', '82', '90', '88', '91'],
    ['Status', 'Fair', 'Good', 'Excellent', 'Good', 'Excellent'],
]
trend_table = Table(trend_data, colWidths=[1.2*inch, 0.9*inch, 0.9*inch, 0.9*inch, 0.9*inch, 1.2*inch])
trend_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), NAVY),
    ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, -1), 9),
    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#dddddd')),
    ('BACKGROUND', (5, 1), (5, 1), HexColor('#f0fdf4')),
    ('FONTNAME', (5, 1), (5, 1), 'Helvetica-Bold'),
    ('ROWHEIGHT', (0, 0), (-1, -1), 24),
]))
elements.append(trend_table)

elements.append(PageBreak())

# --- SITE STATISTICS ---
elements.append(Paragraph('Site Statistics', styles['SectionHead']))

stats_data = [
    ['Metric', 'Value'],
    ['Total Pages', '42 (41 indexable + 1 noindex)'],
    ['Blog Posts', '12'],
    ['Service/Occasion Pages', '16'],
    ['Location Pages', '4'],
    ['Destination Pages', '2'],
    ['Seasonal/Event Pages', '3'],
    ['Sitemap URLs', '41'],
    ['Total Word Count', '~61,500'],
    ['Avg Blog Post Length', '2,191 words'],
    ['Google Reviews', '65 (5.0 stars)'],
    ['Schema Types Used', '16+'],
]
stats_table = Table(stats_data, colWidths=[3*inch, 4*inch])
stats_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), NAVY),
    ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, -1), 10),
    ('ALIGN', (0, 0), (0, -1), 'LEFT'),
    ('ALIGN', (1, 0), (1, -1), 'LEFT'),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#dddddd')),
    ('ROWHEIGHT', (0, 0), (-1, -1), 22),
    ('BACKGROUND', (0, 1), (-1, -1), WHITE),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, HexColor('#f8f9fa')]),
]))
elements.append(stats_table)
elements.append(Spacer(1, 20))

# --- CATEGORY BREAKDOWN ---
elements.append(Paragraph('Category Breakdown', styles['SectionHead']))

cat_data = [
    ['Category', 'Score', 'Weight', 'Weighted', 'Status'],
    ['Crawlability & Indexation', '94', '30', '28.2', 'Excellent'],
    ['Technical Foundations', '90', '25', '22.5', 'Excellent'],
    ['On-Page Optimization', '93', '20', '18.6', 'Excellent'],
    ['Content Quality & E-E-A-T', '86', '15', '12.9', 'Good'],
    ['Authority & Trust', '88', '10', '8.8', 'Good'],
    ['TOTAL', '91', '100', '91.0', 'Excellent'],
]
cat_table = Table(cat_data, colWidths=[2.5*inch, 0.8*inch, 0.8*inch, 1*inch, 1.2*inch])
cat_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), NAVY),
    ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
    ('BACKGROUND', (0, -1), (-1, -1), HexColor('#f0fdf4')),
    ('FONTSIZE', (0, 0), (-1, -1), 10),
    ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#dddddd')),
    ('ROWHEIGHT', (0, 0), (-1, -1), 24),
    ('BACKGROUND', (0, 1), (-1, -2), WHITE),
    ('ROWBACKGROUNDS', (0, 1), (-1, -2), [WHITE, HexColor('#f8f9fa')]),
]))
elements.append(cat_table)

elements.append(PageBreak())

# --- WHAT'S WORKING WELL ---
elements.append(Paragraph("What's Working Well", styles['SectionHead']))

working_well = [
    'Perfect canonical tag implementation on every page',
    'All titles under 60 characters — zero SERP truncation',
    'Unique title and meta description on every page',
    'Exactly one H1 per indexable page',
    'Zero missing image alt text across entire site',
    '16+ schema types deployed (LocalBusiness, FAQPage, Article, Product, Service, etc.)',
    'BreadcrumbList schema on every page',
    'SpeakableSpecification on key pages (voice search ready)',
    'WebP images with JPG fallback via <picture> elements',
    'Explicit width/height on every image — prevents CLS',
    'Hero image preloaded with fetchpriority="high"',
    'Non-blocking font loading (preload + onload swap)',
    'Comprehensive security headers (HSTS, CSP, X-Frame-Options)',
    'Image caching at 1 year immutable',
    'Clean URLs — no .html extensions, no trailing slashes',
    '301 redirect for consolidated Tampa pages (eliminated cannibalization)',
    'AI crawler strategy — search bots allowed, training bots blocked',
    'llms.txt present for AI discoverability',
    'Static HTML — zero JavaScript rendering dependency',
    'Visible author bylines on all 12 blog posts',
    'Blog dates staggered naturally across March 2026',
    'Blog cross-linking on newer posts (3 related links each)',
    'Event pages integrated into footer site-wide',
    'Blog in main navigation across all pages',
    'Consistent NAP (Name, Address, Phone) everywhere',
    '65 five-star Google reviews with AggregateRating schema',
    'Transparent pricing — major trust signal vs competitors',
    'FAQ page with 22 questions (comprehensive coverage)',
    '12 blog posts averaging 2,191 words — exceptional content depth',
    '42 total pages / ~61,500 words — strongest content footprint in local market',
]

for item in working_well:
    elements.append(Paragraph(f'<bullet>&bull;</bullet> {item}', styles['BulletItem']))

elements.append(PageBreak())

# --- ISSUES FOUND ---
elements.append(Paragraph('Issues Found', styles['SectionHead']))
elements.append(Paragraph('Ordered by priority. Total: 25 issues (0 critical blockers, 4 high, 10 medium, 11 low).', styles['BodyText2']))
elements.append(Spacer(1, 10))

# High priority issues
elements.append(Paragraph('High Priority', styles['SubHead']))

high_issues = [
    ['#', 'Issue', 'Category', 'Deduction'],
    ['15', '"Captain Jason" in review quotes on 13 pages (real review text — cannot alter)', 'E-E-A-T', '-5'],
    ['2', 'First 4 blog posts have zero blog-to-blog cross-links', 'Crawlability', '-3'],
    ['5', 'Canvas particle animation runs on every page (mobile perf)', 'Technical', '-3'],
    ['6', 'No critical CSS inlining; 50KB stylesheet blocks render', 'Technical', '-3'],
]
high_table = Table(high_issues, colWidths=[0.4*inch, 3.8*inch, 1.2*inch, 0.8*inch])
high_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), HexColor('#dc2626')),
    ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, -1), 9),
    ('ALIGN', (0, 0), (0, -1), 'CENTER'),
    ('ALIGN', (3, 0), (3, -1), 'CENTER'),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#dddddd')),
    ('ROWHEIGHT', (0, 0), (-1, -1), 28),
    ('BACKGROUND', (0, 1), (-1, -1), WHITE),
]))
elements.append(high_table)
elements.append(Spacer(1, 16))

# Medium priority
elements.append(Paragraph('Medium Priority', styles['SubHead']))

med_issues = [
    ['#', 'Issue', 'Category', 'Deduction'],
    ['14', 'First 4 blog posts missing datePublished in blog index schema', 'On-Page', '-2'],
    ['11', '3 meta descriptions exceed 160 chars (by 2-4 chars)', 'On-Page', '-2'],
    ['12', 'Heading hierarchy skip (H1→H3) on contact + team pages', 'On-Page', '-2'],
    ['16', 'Team page thin at 318 words', 'Content', '-3'],
    ['19', 'Only 3 unique review samples in homepage schema', 'E-E-A-T', '-2'],
    ['21', 'No Yelp, TripAdvisor, or YouTube in sameAs schema', 'Authority', '-4'],
    ['22', 'No YouTube channel linked', 'Authority', '-3'],
]
med_table = Table(med_issues, colWidths=[0.4*inch, 3.8*inch, 1.2*inch, 0.8*inch])
med_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), HexColor('#ea580c')),
    ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, -1), 9),
    ('ALIGN', (0, 0), (0, -1), 'CENTER'),
    ('ALIGN', (3, 0), (3, -1), 'CENTER'),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#dddddd')),
    ('ROWHEIGHT', (0, 0), (-1, -1), 28),
    ('BACKGROUND', (0, 1), (-1, -1), WHITE),
]))
elements.append(med_table)
elements.append(Spacer(1, 16))

# Low priority
elements.append(Paragraph('Low Priority', styles['SubHead']))

low_issues = [
    ['#', 'Issue', 'Deduction'],
    ['1', 'competitive-analysis.html orphan page (noindex, non-issue)', '-1'],
    ['4', 'All sitemap lastmod dates identical', '-1'],
    ['7', 'gtag.js parser cost at top of head', '-1'],
    ['8', 'CSP allows unsafe-inline', '-1'],
    ['13', 'Two blog posts share March 20 date', '-1'],
    ['17', 'Pricing page thin at 561 words', '-2'],
    ['18', 'Contact page thin at 329 words', '-1'],
    ['23', 'No BBB/Chamber/marine association citations', '-2'],
    ['24', 'No IndexNow protocol for Bing', '-1'],
    ['25', 'Social proof links lack engagement context', '-2'],
]
low_table = Table(low_issues, colWidths=[0.4*inch, 4.6*inch, 0.8*inch])
low_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), HexColor('#ca8a04')),
    ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, -1), 9),
    ('ALIGN', (0, 0), (0, -1), 'CENTER'),
    ('ALIGN', (2, 0), (2, -1), 'CENTER'),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#dddddd')),
    ('ROWHEIGHT', (0, 0), (-1, -1), 22),
    ('BACKGROUND', (0, 1), (-1, -1), WHITE),
]))
elements.append(low_table)

elements.append(PageBreak())

# --- ACTION PLAN ---
elements.append(Paragraph('Prioritized Action Plan', styles['SectionHead']))

elements.append(Paragraph('Quick Wins (This Week)', styles['SubHead']))
quick_wins = [
    'Replace "Captain Jason" review with one mentioning Captain Josh on 13 pages',
    'Add cross-links to first 4 blog posts (2-3 related links each)',
    'Add datePublished/author to first 4 blog entries in blog index schema',
    'Fix duplicate March 20 date — change one to March 19 or 22',
    'Trim 3 meta descriptions by 2-4 characters',
    'Add H2 headings before H3 content on contact.html and team.html',
]
for item in quick_wins:
    elements.append(Paragraph(f'<bullet>&bull;</bullet> {item}', styles['BulletItem']))

elements.append(Spacer(1, 12))
elements.append(Paragraph('Content Expansion (Next 2 Weeks)', styles['SubHead']))
content_items = [
    'Expand team.html to 600+ words with certifications and detailed bios',
    'Add 5-8 diverse review samples to homepage schema',
    'Add Yelp, TripAdvisor, YouTube links to sameAs once profiles are active',
    'Expand pricing page with 200+ words of context and value explanation',
]
for item in content_items:
    elements.append(Paragraph(f'<bullet>&bull;</bullet> {item}', styles['BulletItem']))

elements.append(Spacer(1, 12))
elements.append(Paragraph('Technical Polish (Next Month)', styles['SubHead']))
tech_items = [
    'Implement critical CSS inlining for above-the-fold content',
    'Disable canvas particle animation on mobile devices',
    'Set accurate per-page lastmod dates in sitemap',
    'Implement IndexNow for Bing instant indexing',
    'Tighten CSP by replacing unsafe-inline with nonces',
]
for item in tech_items:
    elements.append(Paragraph(f'<bullet>&bull;</bullet> {item}', styles['BulletItem']))

elements.append(Spacer(1, 12))
elements.append(Paragraph('Authority Building (Ongoing)', styles['SubHead']))
auth_items = [
    'List on TripAdvisor (free) — competitors are already there',
    'List on WeddingWire — competitor has 97 reviews',
    'Launch YouTube channel with 5 initial videos',
    'Register with BBB and local Chamber of Commerce',
    'Target 100+ Google reviews by month 6 via automated request sequence',
]
for item in auth_items:
    elements.append(Paragraph(f'<bullet>&bull;</bullet> {item}', styles['BulletItem']))

elements.append(PageBreak())

# --- KPI TARGETS ---
elements.append(Paragraph('12-Month KPI Targets', styles['SectionHead']))

kpi_data = [
    ['Metric', 'Current', '3 Month', '6 Month', '12 Month'],
    ['SEO Score', '91/100', '93+', '95+', '95+'],
    ['Indexed Pages', '9*', '40+', '45+', '55+'],
    ['Organic Sessions/mo', '~50', '500+', '2,000+', '5,000+'],
    ['Google Reviews', '65', '90+', '130+', '200+'],
    ['Blog Posts', '12', '16', '24', '40+'],
    ['Keywords Top 10', '~0', '8+', '15+', '30+'],
    ['Domain Authority', '~5', '12+', '18+', '28+'],
    ['Backlinks', '~10', '35+', '70+', '140+'],
]
kpi_table = Table(kpi_data, colWidths=[1.8*inch, 1.1*inch, 1.1*inch, 1.1*inch, 1.1*inch])
kpi_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), NAVY),
    ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, -1), 10),
    ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#dddddd')),
    ('ROWHEIGHT', (0, 0), (-1, -1), 24),
    ('BACKGROUND', (0, 1), (-1, -1), WHITE),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, HexColor('#f8f9fa')]),
]))
elements.append(kpi_table)
elements.append(Paragraph('* 41 pages submitted for indexing; 9 confirmed indexed as of audit date.', styles['SmallGray']))

elements.append(Spacer(1, 30))

# --- COMPETITIVE POSITION ---
elements.append(Paragraph('Competitive Position', styles['SectionHead']))

comp_data = [
    ['Competitor', 'Pages', 'Reviews', 'Schema', 'Pricing Visible'],
    ['Yacht Away Now', '42', '65 (5.0)', 'Best in class', 'Yes'],
    ['Tampa Bay Yacht Charter', '12-15', '97 (WW)', 'None', '$950/2hr'],
    ['Sunburst Yacht Charters', '20+', '52 (5.0)', 'Organization', 'Hidden'],
    ['Kokomo Charters', '20+', '67 (FB)', 'Comprehensive', 'Hidden'],
    ['Florida Yacht Life', '15-20', 'Claims 99%', 'LocalBusiness', '$299-$15K'],
    ['Ultimate YachtLife', '10', '~5', 'None', 'Hidden'],
]
comp_table = Table(comp_data, colWidths=[1.8*inch, 0.8*inch, 1.1*inch, 1.3*inch, 1.2*inch])
comp_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), NAVY),
    ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('BACKGROUND', (0, 1), (-1, 1), HexColor('#f0fdf4')),
    ('FONTNAME', (0, 1), (-1, 1), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, -1), 9),
    ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#dddddd')),
    ('ROWHEIGHT', (0, 0), (-1, -1), 22),
]))
elements.append(comp_table)

elements.append(Spacer(1, 30))

# --- FOOTER ---
elements.append(HRFlowable(width='100%', thickness=1, color=GOLD, spaceAfter=12))
elements.append(Paragraph('Prepared by Nexus AI Agency for Yacht Away Now', ParagraphStyle(
    'Footer1', parent=styles['Normal'], fontSize=10, textColor=GRAY,
    fontName='Helvetica', alignment=TA_CENTER, spaceAfter=4
)))
elements.append(Paragraph('voreli.ai | ciaran@voreli.ai', ParagraphStyle(
    'Footer2', parent=styles['Normal'], fontSize=9, textColor=GRAY,
    fontName='Helvetica', alignment=TA_CENTER
)))

# Build PDF
doc.build(elements)
print(f'PDF generated: {output_path}')
