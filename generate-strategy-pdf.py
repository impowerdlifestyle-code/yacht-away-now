#!/usr/bin/env python3
"""Generate Yacht Away Now #1 Ranking Strategy PDF"""

from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT
import os

OUTPUT = os.path.expanduser("~/yacht-away-now/Yacht-Away-1-Ranking-Strategy.pdf")

NAVY = HexColor("#0b1d2e")
GOLD = HexColor("#d4a853")
GOLD_DARK = HexColor("#b8912e")
WHITE = HexColor("#ffffff")
GRAY = HexColor("#666666")
LIGHT_BG = HexColor("#f8f6f0")

doc = SimpleDocTemplate(
    OUTPUT,
    pagesize=letter,
    topMargin=0.75*inch,
    bottomMargin=0.75*inch,
    leftMargin=0.85*inch,
    rightMargin=0.85*inch,
    title="Yacht Away Now — #1 Ranking Strategy",
    author="Nexus AI Agency",
)

styles = getSampleStyleSheet()

styles.add(ParagraphStyle(
    "CoverTitle", fontName="Helvetica-Bold", fontSize=28,
    textColor=NAVY, alignment=TA_CENTER, spaceAfter=12, leading=34
))
styles.add(ParagraphStyle(
    "CoverSub", fontName="Helvetica", fontSize=14,
    textColor=GOLD_DARK, alignment=TA_CENTER, spaceAfter=6
))
styles.add(ParagraphStyle(
    "H1", fontName="Helvetica-Bold", fontSize=20,
    textColor=NAVY, spaceBefore=24, spaceAfter=8, leading=26
))
styles.add(ParagraphStyle(
    "H2", fontName="Helvetica-Bold", fontSize=15,
    textColor=GOLD_DARK, spaceBefore=18, spaceAfter=6, leading=20
))
styles.add(ParagraphStyle(
    "H3", fontName="Helvetica-Bold", fontSize=12,
    textColor=NAVY, spaceBefore=12, spaceAfter=4
))
styles.add(ParagraphStyle(
    "Body", fontName="Helvetica", fontSize=10,
    textColor=HexColor("#333333"), spaceAfter=6, leading=15
))
styles.add(ParagraphStyle(
    "BulletCustom", fontName="Helvetica", fontSize=10,
    textColor=HexColor("#333333"), spaceAfter=4, leading=14,
    leftIndent=20, bulletIndent=8, bulletFontName="Helvetica"
))
styles.add(ParagraphStyle(
    "Footer", fontName="Helvetica", fontSize=8,
    textColor=GRAY, alignment=TA_CENTER
))

story = []

# ── COVER PAGE ──
story.append(Spacer(1, 2*inch))
story.append(Paragraph("YACHT AWAY NOW", styles["CoverTitle"]))
story.append(Spacer(1, 8))
story.append(HRFlowable(width="40%", thickness=2, color=GOLD, spaceAfter=12))
story.append(Paragraph("#1 Google Ranking Strategy", styles["CoverSub"]))
story.append(Spacer(1, 24))
story.append(Paragraph("Comprehensive SEO, Google Maps, Content & Authority Plan", styles["Body"]))
story.append(Paragraph("Prepared by Nexus AI Agency — March 2026", styles["Body"]))
story.append(PageBreak())

# ── TABLE OF CONTENTS ──
story.append(Paragraph("Table of Contents", styles["H1"]))
story.append(HRFlowable(width="100%", thickness=1, color=GOLD, spaceAfter=12))
toc_items = [
    "1. Executive Summary",
    "2. Google Business Profile Optimization",
    "3. Review Strategy — Path to 200+ Reviews",
    "4. Competitive Keyword Map",
    "5. Content Strategy — Pages to Build",
    "6. Blog Content Calendar",
    "7. Citation & Directory Strategy",
    "8. Backlink Acquisition Plan",
    "9. Technical SEO Checklist",
    "10. Weekly Action Plan",
    "11. Monthly KPIs & Tracking",
    "12. 90-Day Milestone Targets",
]
for item in toc_items:
    story.append(Paragraph(item, styles["Body"]))
story.append(PageBreak())

# ── 1. EXECUTIVE SUMMARY ──
story.append(Paragraph("1. Executive Summary", styles["H1"]))
story.append(HRFlowable(width="100%", thickness=1, color=GOLD, spaceAfter=12))
story.append(Paragraph(
    "Yacht Away Now is a luxury private yacht charter company based in St. Petersburg, FL, operating a 52ft Marquis Flybridge yacht for up to 13 guests. The company has strong foundations — 57+ five-star Google reviews, a well-built website, and service pages targeting key locations.",
    styles["Body"]
))
story.append(Paragraph(
    "This strategy document outlines the complete plan to achieve #1 rankings on Google Maps and organic search for competitive yacht charter keywords across the Tampa Bay area. The plan covers Google Business Profile optimization, review acceleration, keyword targeting, content creation, citation building, and backlink acquisition.",
    styles["Body"]
))
story.append(Paragraph("Current Strengths", styles["H2"]))
for b in [
    "57+ five-star Google reviews (strong social proof)",
    "Well-structured website with location pages (St. Pete, Tampa, Clearwater)",
    "Service-specific pages (bachelorette, birthday, corporate, sunset)",
    "Blog content started (4 posts)",
    "Strong schema markup (LocalBusiness, Service, BreadcrumbList, FAQPage)",
    "AI-powered chat concierge with booking capability",
]:
    story.append(Paragraph(f"• {b}", styles["BulletCustom"]))

story.append(Paragraph("Key Gaps to Close", styles["H2"]))
for b in [
    "Missing high-volume keyword pages (boat rental, party boat, yacht rental)",
    "No TripAdvisor, GetMyBoat, Boatsetter, or wedding platform listings",
    "Google Business Profile needs weekly posts and more photos",
    "Review velocity needs to increase — target 100 by Q2, 200 by year-end",
    "No backlink strategy in place",
    "Missing destination pages (Egmont Key, Shell Key, Sarasota)",
]:
    story.append(Paragraph(f"• {b}", styles["BulletCustom"]))
story.append(PageBreak())

# ── 2. GOOGLE BUSINESS PROFILE ──
story.append(Paragraph("2. Google Business Profile Optimization", styles["H1"]))
story.append(HRFlowable(width="100%", thickness=1, color=GOLD, spaceAfter=12))
story.append(Paragraph(
    "Google Maps rankings are driven by 3 factors: Relevance, Distance, and Prominence. Here's how to maximize each.",
    styles["Body"]
))

story.append(Paragraph("Profile Completeness (Do Immediately)", styles["H2"]))
data = [
    ["Action", "Status", "Priority"],
    ["Verify GBP is 100% complete", "Check", "Critical"],
    ["Primary category: Yacht Charter", "Set", "Critical"],
    ["Secondary: Boat Tour Agency, Boat Rental", "Add", "Critical"],
    ["Add all 6 services with descriptions + pricing", "Add", "Critical"],
    ["Upload 30+ high-quality photos", "Add", "Critical"],
    ["Add booking link (Book button)", "Add", "High"],
    ["Set hours: Daily 8am-10pm", "Verify", "High"],
    ["Add complete business description (750 chars)", "Write", "High"],
    ["Enable messaging", "Check", "Medium"],
    ["Add LGBTQ+ friendly, credit cards attributes", "Add", "Medium"],
]
t = Table(data, colWidths=[3.5*inch, 1.2*inch, 1*inch])
t.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), NAVY),
    ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTSIZE", (0, 0), (-1, -1), 9),
    ("ALIGN", (1, 0), (-1, -1), "CENTER"),
    ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#dddddd")),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LIGHT_BG]),
    ("TOPPADDING", (0, 0), (-1, -1), 6),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
]))
story.append(t)

story.append(Paragraph("Weekly Google Posts", styles["H2"]))
story.append(Paragraph(
    "Post 2x per week minimum. Google rewards active profiles with higher Maps placement.",
    styles["Body"]
))
for b in [
    "Monday: Photo from weekend charter + 2-sentence caption",
    "Thursday: Weekend availability + weather forecast + sunset time",
    "Monthly: Seasonal promo (holiday cruises, storm season deals)",
    "Monthly: Customer spotlight (with permission)",
]:
    story.append(Paragraph(f"• {b}", styles["BulletCustom"]))

story.append(Paragraph("Q&A Section (Pre-populate)", styles["H2"]))
for b in [
    '"How many guests can you accommodate?" → Up to 13 guests',
    '"What\'s the minimum charter time?" → 4-hour minimum',
    '"Do you go to the Bahamas?" → Yes, multi-day adventures available',
    '"Can I bring my own food and drinks?" → Yes, BYOB policy',
    '"Where do you depart from?" → St. Petersburg, FL',
    '"Do you offer sunset cruises?" → Yes, our most popular charter',
    '"Is a captain included?" → Yes, professional captain and crew included',
    '"What about bad weather?" → We monitor conditions and reschedule if needed',
]:
    story.append(Paragraph(f"• {b}", styles["BulletCustom"]))
story.append(PageBreak())

# ── 3. REVIEW STRATEGY ──
story.append(Paragraph("3. Review Strategy — Path to 200+ Reviews", styles["H1"]))
story.append(HRFlowable(width="100%", thickness=1, color=GOLD, spaceAfter=12))
story.append(Paragraph(
    "Reviews are the #1 ranking factor for Google Maps. You're at 57 — strong, but competitors with 150+ will outrank you. Here's the acceleration plan.",
    styles["Body"]
))

story.append(Paragraph("Review Collection Process", styles["H2"]))
for b in [
    "Within 2 hours of charter completion, text the booking contact your Google review link",
    "Use direct link: https://share.google/7e44SLfCM74VXYfe2",
    'Personalize the ask: "We loved having you aboard! Would you mind leaving a quick Google review?"',
    'Ask them to mention specifics: "sunset cruise," "bachelorette," "Tampa Bay" — keyword-rich reviews boost Maps',
    "Respond to EVERY review within 24 hours — personalized, not templated",
    "Never offer incentives for reviews (violates Google TOS)",
]:
    story.append(Paragraph(f"• {b}", styles["BulletCustom"]))

story.append(Paragraph("Milestone Targets", styles["H2"]))
data = [
    ["Milestone", "Target Date", "Reviews Needed"],
    ["75 reviews", "April 2026", "18 more"],
    ["100 reviews", "June 2026", "43 more"],
    ["150 reviews", "September 2026", "93 more"],
    ["200 reviews", "December 2026", "143 more"],
]
t = Table(data, colWidths=[2*inch, 2*inch, 1.7*inch])
t.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), NAVY),
    ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTSIZE", (0, 0), (-1, -1), 9),
    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
    ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#dddddd")),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LIGHT_BG]),
    ("TOPPADDING", (0, 0), (-1, -1), 6),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
]))
story.append(t)
story.append(PageBreak())

# ── 4. KEYWORD MAP ──
story.append(Paragraph("4. Competitive Keyword Map", styles["H1"]))
story.append(HRFlowable(width="100%", thickness=1, color=GOLD, spaceAfter=12))

story.append(Paragraph("Currently Targeting (Existing Pages)", styles["H2"]))
data = [
    ["Keyword", "Page", "Est. Monthly Searches"],
    ["yacht charter st petersburg fl", "yacht-charter-st-petersburg", "300-500"],
    ["yacht charter tampa", "yacht-charter-tampa", "400-600"],
    ["yacht charter clearwater", "yacht-charter-clearwater", "200-300"],
    ["sunset cruise st petersburg", "sunset-cruise-st-petersburg", "500-800"],
    ["bachelorette party yacht charter", "bachelorette-party-yacht-charter", "300-500"],
    ["birthday yacht charter", "birthday-yacht-charter", "200-300"],
    ["corporate yacht charter", "corporate-yacht-charter", "100-200"],
]
t = Table(data, colWidths=[2.5*inch, 2.2*inch, 1.3*inch])
t.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), NAVY),
    ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTSIZE", (0, 0), (-1, -1), 8),
    ("ALIGN", (2, 0), (2, -1), "CENTER"),
    ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#dddddd")),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LIGHT_BG]),
    ("TOPPADDING", (0, 0), (-1, -1), 5),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
]))
story.append(t)

story.append(Paragraph("New Pages Being Built (High-Value Keywords)", styles["H2"]))
data = [
    ["Keyword", "New Page", "Est. Monthly Searches"],
    ["private boat charter tampa bay", "private-boat-charter-tampa-bay", "400-600"],
    ["party boat st petersburg", "party-boat-st-petersburg", "500-800"],
    ["yacht rental tampa", "yacht-rental-tampa", "300-500"],
    ["anniversary cruise tampa bay", "anniversary-cruise-tampa-bay", "100-200"],
    ["yacht charter sarasota", "yacht-charter-sarasota", "200-300"],
    ["egmont key boat charter", "egmont-key-boat-charter", "100-200"],
    ["shell key boat trip st pete", "shell-key-boat-trip", "100-200"],
]
t = Table(data, colWidths=[2.5*inch, 2.2*inch, 1.3*inch])
t.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), GOLD_DARK),
    ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTSIZE", (0, 0), (-1, -1), 8),
    ("ALIGN", (2, 0), (2, -1), "CENTER"),
    ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#dddddd")),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LIGHT_BG]),
    ("TOPPADDING", (0, 0), (-1, -1), 5),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
]))
story.append(t)

story.append(Paragraph("Future Keyword Opportunities", styles["H2"]))
data = [
    ["Keyword", "Type", "Est. Monthly Searches"],
    ["boat rental st petersburg fl", "Service page", "800-1,200"],
    ["private yacht rental st pete", "Service page", "200-400"],
    ["sunset boat tour tampa bay", "Blog post", "300-500"],
    ["proposal yacht charter st pete", "Service page", "50-100"],
    ["new years eve yacht charter tampa", "Seasonal blog", "100-200"],
    ["4th of july boat party tampa bay", "Seasonal blog", "100-200"],
    ["BYOB boat cruise st petersburg", "Blog post", "100-200"],
]
t = Table(data, colWidths=[2.5*inch, 1.5*inch, 1.3*inch])
t.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), NAVY),
    ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTSIZE", (0, 0), (-1, -1), 8),
    ("ALIGN", (1, 0), (-1, -1), "CENTER"),
    ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#dddddd")),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LIGHT_BG]),
    ("TOPPADDING", (0, 0), (-1, -1), 5),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
]))
story.append(t)
story.append(PageBreak())

# ── 5. CONTENT STRATEGY ──
story.append(Paragraph("5. Content Strategy — Pages to Build", styles["H1"]))
story.append(HRFlowable(width="100%", thickness=1, color=GOLD, spaceAfter=12))

story.append(Paragraph("Service Pages (Build in April 2026)", styles["H2"]))
for b in [
    "private-boat-charter-tampa-bay — targets 'private boat charter tampa bay', 'boat charter tampa bay'",
    "party-boat-st-petersburg — targets 'party boat st pete', 'party boat rental st petersburg'",
    "yacht-rental-tampa — targets 'yacht rental tampa', 'boat rental tampa bay'",
    "anniversary-cruise-tampa-bay — targets 'anniversary cruise', 'romantic boat cruise tampa'",
    "yacht-charter-sarasota — targets 'sarasota yacht charter', 'sarasota boat charter'",
]:
    story.append(Paragraph(f"• {b}", styles["BulletCustom"]))

story.append(Paragraph("Destination Pages (Build in April 2026)", styles["H2"]))
for b in [
    "egmont-key-boat-charter — targets 'egmont key boat trip', 'egmont key charter'",
    "shell-key-boat-trip — targets 'shell key boat trip st pete', 'shell key boat charter'",
]:
    story.append(Paragraph(f"• {b}", styles["BulletCustom"]))

story.append(Paragraph("Future Pages (Build May-June 2026)", styles["H2"]))
for b in [
    "boat-rental-st-petersburg — highest volume keyword (~1,000/mo)",
    "proposal-yacht-charter — niche but high-intent",
    "fishing-and-cruising-charter — if fishing is ever offered",
]:
    story.append(Paragraph(f"• {b}", styles["BulletCustom"]))
story.append(PageBreak())

# ── 6. BLOG CALENDAR ──
story.append(Paragraph("6. Blog Content Calendar", styles["H1"]))
story.append(HRFlowable(width="100%", thickness=1, color=GOLD, spaceAfter=12))
story.append(Paragraph(
    "Publish 2 blog posts per month. Each post targets a specific long-tail keyword cluster and includes internal links to service/location pages.",
    styles["Body"]
))

data = [
    ["Month", "Post 1", "Post 2"],
    ["Apr 2026", "How Much Does a Yacht Charter Cost in Tampa Bay?", "Top 10 Things to Do on Tampa Bay by Boat"],
    ["May 2026", "Egmont Key by Private Yacht: Complete Guide", "BYOB Boat Cruises in St. Petersburg FL"],
    ["Jun 2026", "Best Bachelorette Party Ideas in St. Pete (2026)", "Boat Rental vs Yacht Charter: What's the Difference?"],
    ["Jul 2026", "4th of July on a Yacht: Tampa Bay Guide", "Best Sunset Spots in Tampa Bay from the Water"],
    ["Aug 2026", "Planning a Proposal on a Yacht in Tampa Bay", "Shell Key by Boat: Everything You Need to Know"],
    ["Sep 2026", "Corporate Team Building on a Yacht", "Fall Boating Season in Tampa Bay: What to Expect"],
    ["Oct 2026", "Anniversary Cruise Ideas in Tampa Bay", "Sarasota by Yacht: Siesta Key & Longboat Key Guide"],
    ["Nov 2026", "Thanksgiving Weekend Yacht Charters", "Best Winter Boat Trips in Florida"],
    ["Dec 2026", "New Year's Eve Yacht Party Tampa Bay", "Year in Review: Best Charters of 2026"],
]
t = Table(data, colWidths=[1*inch, 2.5*inch, 2.5*inch])
t.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), NAVY),
    ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTSIZE", (0, 0), (-1, -1), 8),
    ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#dddddd")),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LIGHT_BG]),
    ("TOPPADDING", (0, 0), (-1, -1), 5),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
]))
story.append(t)
story.append(PageBreak())

# ── 7. CITATION STRATEGY ──
story.append(Paragraph("7. Citation & Directory Strategy", styles["H1"]))
story.append(HRFlowable(width="100%", thickness=1, color=GOLD, spaceAfter=12))
story.append(Paragraph(
    "List the business on these platforms with IDENTICAL Name, Address, and Phone (NAP). Inconsistencies hurt Maps rankings.",
    styles["Body"]
))

data = [
    ["Platform", "Priority", "Impact", "Status"],
    ["Google Business Profile", "Critical", "Highest", "Active"],
    ["TripAdvisor", "Critical", "Highest", "NOT LISTED"],
    ["GetMyBoat", "Critical", "High", "NOT LISTED"],
    ["Boatsetter", "Critical", "High", "NOT LISTED"],
    ["Yelp", "High", "High", "Check"],
    ["The Knot", "High", "High", "NOT LISTED"],
    ["WeddingWire", "High", "High", "NOT LISTED"],
    ["Facebook Business", "High", "Medium", "Active"],
    ["Apple Maps", "High", "Medium", "Check"],
    ["Bing Places", "Medium", "Medium", "Check"],
    ["Click&Boat", "Medium", "Medium", "NOT LISTED"],
    ["BBB", "Medium", "Medium", "Check"],
    ["Thumbtack", "Medium", "Low", "Check"],
    ["YellowPages", "Low", "Low", "Check"],
    ["Foursquare", "Low", "Low", "Check"],
]
t = Table(data, colWidths=[1.8*inch, 1.2*inch, 1.2*inch, 1.5*inch])
t.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), NAVY),
    ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTSIZE", (0, 0), (-1, -1), 8),
    ("ALIGN", (1, 0), (-1, -1), "CENTER"),
    ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#dddddd")),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LIGHT_BG]),
    ("TOPPADDING", (0, 0), (-1, -1), 5),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
]))
story.append(t)
story.append(PageBreak())

# ── 8. BACKLINK PLAN ──
story.append(Paragraph("8. Backlink Acquisition Plan", styles["H1"]))
story.append(HRFlowable(width="100%", thickness=1, color=GOLD, spaceAfter=12))

story.append(Paragraph("Easy Backlinks (Do First)", styles["H2"]))
for b in [
    "St. Petersburg Chamber of Commerce — join and get listed",
    "Visit St. Pete/Clearwater tourism site — submit for inclusion",
    "Tampa Bay tourism directories — apply for listing",
    "GetMyBoat & Boatsetter — marketplace listings = dofollow backlinks",
    "TripAdvisor — listing creates authoritative backlink",
    "The Knot & WeddingWire — wedding directory backlinks",
]:
    story.append(Paragraph(f"• {b}", styles["BulletCustom"]))

story.append(Paragraph("Earned Backlinks (Pitch Monthly)", styles["H2"]))
for b in [
    "Local Tampa Bay bloggers — pitch 'best things to do in St. Pete' articles",
    "Wedding/event blogs — pitch as 'best bachelorette party ideas in Tampa Bay'",
    "Travel publications — pitch unique Gulf Coast yacht experience story",
    "Local news stations (Bay News 9, WTSP) — pitch charter tourism angle",
    "Boating magazines — pitch the Marquis Flybridge or a unique route",
    "University event planners — pitch corporate/graduation charters",
]:
    story.append(Paragraph(f"• {b}", styles["BulletCustom"]))

story.append(Paragraph("Linkable Content Assets (Create)", styles["H2"]))
for b in [
    '"The Complete Guide to Tampa Bay by Boat" — comprehensive, linkable resource (2,000+ words)',
    '"Average Cost of Yacht Charters in Florida" — data people cite and link to',
    '"Tampa Bay Boating Map" — interactive or infographic with routes, islands, distances',
    '"Best Beaches Accessible Only by Boat in Tampa Bay" — shareable list post',
]:
    story.append(Paragraph(f"• {b}", styles["BulletCustom"]))
story.append(PageBreak())

# ── 9. TECHNICAL SEO ──
story.append(Paragraph("9. Technical SEO Checklist", styles["H1"]))
story.append(HRFlowable(width="100%", thickness=1, color=GOLD, spaceAfter=12))

data = [
    ["Item", "Status", "Notes"],
    ["HTTPS everywhere", "Done", "Vercel handles SSL"],
    ["Mobile responsive", "Done", "All breakpoints covered"],
    ["Page speed < 2.5s LCP", "Good", "Static site, fast loading"],
    ["Schema: LocalBusiness", "Done", "On all pages"],
    ["Schema: BreadcrumbList", "Done", "On all pages"],
    ["Schema: FAQPage", "Done", "On FAQ page"],
    ["Schema: Service", "Check", "May need on service pages"],
    ["Canonical tags", "Done", "Self-referencing on all pages"],
    ["XML Sitemap", "Update", "Add new pages"],
    ["Robots.txt", "Done", "Properly configured"],
    ["Security headers (CSP, HSTS)", "Done", "In vercel.json"],
    ["Image optimization (WebP)", "Done", "All images converted"],
    ["Lazy loading images", "Done", "loading=lazy on all"],
    ["Alt text on all images", "Done", "Descriptive alt text"],
    ["Internal linking", "Improve", "Cross-link new pages"],
    ["og:image on all pages", "Done", "Social sharing optimized"],
]
t = Table(data, colWidths=[2.2*inch, 1*inch, 2.5*inch])
t.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), NAVY),
    ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTSIZE", (0, 0), (-1, -1), 8),
    ("ALIGN", (1, 0), (1, -1), "CENTER"),
    ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#dddddd")),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LIGHT_BG]),
    ("TOPPADDING", (0, 0), (-1, -1), 5),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
]))
story.append(t)
story.append(PageBreak())

# ── 10. WEEKLY ACTION PLAN ──
story.append(Paragraph("10. Weekly Action Plan", styles["H1"]))
story.append(HRFlowable(width="100%", thickness=1, color=GOLD, spaceAfter=12))

data = [
    ["Day", "Action", "Time"],
    ["Monday", "Post Google Business update (weekend charter photo)", "15 min"],
    ["Monday", "Respond to any new Google reviews", "10 min"],
    ["Tuesday", "Send review request texts to last week's guests", "15 min"],
    ["Wednesday", "Share charter photo on Instagram + Facebook", "10 min"],
    ["Thursday", "Post Google Business update (weekend availability)", "15 min"],
    ["Thursday", "Check and respond to chat/email inquiries", "15 min"],
    ["Friday", "Upload 2-3 new photos to Google Business Profile", "10 min"],
    ["Saturday", "Take photos/video during charters for content", "During charter"],
    ["Bi-weekly", "Publish 1 blog post", "2 hours"],
    ["Monthly", "Pitch 1-2 local publications for backlinks", "1 hour"],
    ["Monthly", "Check citation accuracy across all platforms", "30 min"],
]
t = Table(data, colWidths=[1.2*inch, 3.5*inch, 1*inch])
t.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), NAVY),
    ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTSIZE", (0, 0), (-1, -1), 8),
    ("ALIGN", (2, 0), (2, -1), "CENTER"),
    ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#dddddd")),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LIGHT_BG]),
    ("TOPPADDING", (0, 0), (-1, -1), 5),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
]))
story.append(t)
story.append(PageBreak())

# ── 11. KPIs ──
story.append(Paragraph("11. Monthly KPIs & Tracking", styles["H1"]))
story.append(HRFlowable(width="100%", thickness=1, color=GOLD, spaceAfter=12))

data = [
    ["KPI", "Current", "30-Day Target", "90-Day Target"],
    ["Google Reviews", "57", "65+", "100+"],
    ["Google Maps Position (primary keyword)", "TBD", "Top 5", "Top 3"],
    ["Monthly Website Visitors", "TBD", "+25%", "+100%"],
    ["Monthly Booking Inquiries", "TBD", "+20%", "+50%"],
    ["Citation Listings", "~3", "10+", "15+"],
    ["Blog Posts Published", "4", "6", "10"],
    ["Google Business Posts", "0", "8+", "24+"],
    ["Backlinks Acquired", "TBD", "5+", "15+"],
    ["Pages Indexed", "~20", "28+", "35+"],
]
t = Table(data, colWidths=[2.2*inch, 1*inch, 1.2*inch, 1.2*inch])
t.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), NAVY),
    ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTSIZE", (0, 0), (-1, -1), 8),
    ("ALIGN", (1, 0), (-1, -1), "CENTER"),
    ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#dddddd")),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LIGHT_BG]),
    ("TOPPADDING", (0, 0), (-1, -1), 5),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
]))
story.append(t)
story.append(PageBreak())

# ── 12. 90-DAY MILESTONES ──
story.append(Paragraph("12. 90-Day Milestone Targets", styles["H1"]))
story.append(HRFlowable(width="100%", thickness=1, color=GOLD, spaceAfter=12))

story.append(Paragraph("Days 1-30: Foundation", styles["H2"]))
for b in [
    "GBP 100% complete with 30+ photos and weekly posts started",
    "Listed on TripAdvisor, GetMyBoat, Boatsetter, The Knot, WeddingWire",
    "7 new service/location pages live (being built now)",
    "Review velocity: 2-3 new reviews per week",
    "2 new blog posts published",
    "Citation audit complete — NAP consistent across all platforms",
]:
    story.append(Paragraph(f"✓ {b}", styles["BulletCustom"]))

story.append(Paragraph("Days 31-60: Growth", styles["H2"]))
for b in [
    "75+ Google reviews reached",
    "4 more blog posts published (8 total additional)",
    "Backlink outreach: 3-5 local publications pitched",
    "Chamber of Commerce membership + listing",
    "Visit St. Pete/Clearwater tourism listing submitted",
    "Google Maps position tracking established",
]:
    story.append(Paragraph(f"✓ {b}", styles["BulletCustom"]))

story.append(Paragraph("Days 61-90: Dominance", styles["H2"]))
for b in [
    "100+ Google reviews milestone",
    "Top 3 Maps position for 'yacht charter st petersburg'",
    "10+ blog posts total, targeting 15+ keyword clusters",
    "15+ citation listings live and consistent",
    "10+ quality backlinks acquired",
    "Organic traffic up 50-100% from baseline",
    "Booking inquiries measurably increased",
]:
    story.append(Paragraph(f"✓ {b}", styles["BulletCustom"]))

story.append(Spacer(1, 36))
story.append(HRFlowable(width="100%", thickness=2, color=GOLD, spaceAfter=16))
story.append(Paragraph(
    "Prepared by Nexus AI Agency for Yacht Away Now — March 2026",
    styles["Footer"]
))
story.append(Paragraph(
    "Questions? Contact ciaran@nexus-ai.agency",
    styles["Footer"]
))

doc.build(story)
print(f"PDF generated: {OUTPUT}")
