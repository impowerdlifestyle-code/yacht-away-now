const POSTS = [
  {
    summary: "Yacht Wedding vs Traditional Venue — Save 60-85% 💍\n\nAn intimate yacht wedding on Tampa Bay costs $3,000-$6,000 total — compared to $15,000-$35,000 for a traditional venue.\n\nYour ceremony on the flybridge with a Gulf Coast sunset backdrop. 52ft Marquis Flybridge, up to 13 guests, professional captain and crew.\n\nRead our full 2026 cost comparison on the blog!",
    url: "https://www.yachtawaynow.com/blog/yacht-wedding-vs-venue-cost-comparison",
    action: "LEARN_MORE"
  },
  {
    summary: "Planning a Bachelorette in St. Pete? Here's Your 3-Day Itinerary 🥂\n\nDay 1: Beach Drive dinner + rooftop cocktails at The Birchwood\nDay 2: Private sunset yacht cruise with your crew\nDay 3: Brunch + beach\n\nThe 5-hour sunset cruise ($2,500 split 10 ways = $250/person) is the highlight every bride remembers.\n\nRead the full itinerary on our blog!",
    url: "https://www.yachtawaynow.com/blog/bachelorette-yacht-itinerary-st-pete",
    action: "LEARN_MORE"
  },
  {
    summary: "Yacht Charter Near Treasure Island FL 🏝️\n\nPrivate luxury yacht charters departing near Treasure Island. Cruise past Johns Pass, stop at sandbars, watch the sunset over the Gulf.\n\n52ft Marquis Flybridge, 3 decks, Starlink WiFi, premium stereo. Up to 13 guests, BYOB welcome.\n\nWeekend packages from $2,000 all-inclusive!",
    url: "https://www.yachtawaynow.com/yacht-charter-treasure-island",
    action: "BOOK"
  },
  {
    summary: "How Much Does a Yacht Charter Actually Cost? \ud83d\udcb0\n\nNo call-for-quote games. Our 2026 Tampa Bay pricing:\n\n\u2705 Weekdays $500/hr \u00b7 Weekends $600/hr\n\u2705 All-inclusive: captain, crew, fuel, ice\n\u2705 4-hour minimum \u00b7 up to 13 guests\n\nSplit 13 ways, a weekend charter is ~$185/person.\n\nFull pricing breakdown on the blog!",
    url: "https://www.yachtawaynow.com/blog/how-much-does-a-yacht-charter-cost-tampa-bay",
    action: "LEARN_MORE"
  },
  {
    summary: "First Yacht Charter? Here's Exactly How It Works \u2693\n\nWhere to park, when to board, who picks the route, and yes \u2014 how tipping works.\n\nWe wrote the step-by-step guide for first-timers, from booking to the golden-hour ride home. No license or experience needed \u2014 our USCG-licensed captain handles everything.\n\nRead the first-timer's guide!",
    url: "https://www.yachtawaynow.com/blog/first-yacht-charter-what-to-expect",
    action: "LEARN_MORE"
  },
  {
    summary: "Two Islands. One Perfect Day. \ud83c\udfdd\ufe0f\n\nEgmont Key: fort ruins, an 1858 lighthouse, and snorkeling over submerged batteries.\nShell Key: the best shelling sandbar on the Gulf Coast.\n\nBoth in one 6-8 hour private charter from St. Pete \u2014 the exact itinerary our captains run is on the blog.\n\nPlan your island day!",
    url: "https://www.yachtawaynow.com/blog/shell-key-egmont-key-day-trip",
    action: "LEARN_MORE"
  },
  {
    summary: "When's the Best Month to Charter in Tampa Bay? \ud83c\udf24\ufe0f\n\nOur captains' honest answer: April, May \u2014 and October, the local's favorite. Summer? Book mornings or sunset cruises and let the 3pm storm have the mid-afternoon.\n\nWe published the full month-by-month weather guide: water temps, seas, and the truth about hurricane season.\n\nFind your month!",
    url: "https://www.yachtawaynow.com/blog/tampa-bay-boating-weather-by-month",
    action: "LEARN_MORE"
  },
  {
    summary: "The Best Date Night in St. Pete Isn't a Restaurant \ud83c\udf05\n\nA private 52ft yacht, golden hour off Pass-a-Grille, your playlist, your favorite bottle (BYOB), and a crew that handles everything else.\n\nWeekday evenings from $2,000 all-inclusive for the entire yacht. Anniversaries and proposals are our specialty \u2014 we're undefeated.\n\nPlan your night on the water!",
    url: "https://www.yachtawaynow.com/blog/date-night-on-the-water-st-petersburg",
    action: "BOOK"
  },
  {
    summary: "How Many People Fit on a Yacht Charter? \ud83d\udc65\n\nOur 52ft Marquis hosts up to 13 guests across 3 decks \u2014 and yes, kids count toward the limit (it's federal law, and any operator who'll \"squeeze in extras\" is one to avoid).\n\nBigger group? Add Sly Fox for 19 total cruising side by side.\n\nRead the group size guide!",
    url: "https://www.yachtawaynow.com/blog/how-many-people-fit-on-a-yacht-charter",
    action: "LEARN_MORE"
  },
  {
    summary: "Beat the Florida Heat \u2600\ufe0f Morning & Sunset Charters\n\nSummer on Tampa Bay has a rhythm: gorgeous mornings, a brief 3pm storm, then a washed-clean golden evening.\n\nSo we run with it \u2014 morning sandbar swims in 88\u00b0 Gulf water, or the 5-hour sunset cruise ($3,000 all-inclusive) when the sky puts on its show.\n\nBook your summer slot!",
    url: "https://www.yachtawaynow.com/sunset-cruise-st-petersburg",
    action: "BOOK"
  },
  {
    summary: "Meet Sly Fox \ud83e\udd8a Our 3-Stateroom Luxury Yacht\n\nBuilt for couples' escapes and small-group cruising: up to 6 guests, three private staterooms, optional private chef, and multi-day Gulf Coast itineraries from $5,000.\n\n$650/hr weekdays \u00b7 $750/hr weekends \u00b7 all-inclusive.\n\nThe intimate side of Yacht Away Now. Book Sly Fox!",
    url: "https://www.yachtawaynow.com/sly-fox",
    action: "BOOK"
  },
  {
    summary: "Best Boat Charter Companies in St. Pete — 2026 Guide ⭐\n\nWe compared pricing, vessels, reviews, and amenities across the top charter companies in St. Petersburg.\n\nSee how Yacht Away Now's 52ft Marquis Flybridge, 137 five-star reviews, and transparent pricing stack up against the competition.\n\nRead the full comparison!",
    url: "https://www.yachtawaynow.com/blog/best-boat-charter-companies-st-petersburg",
    action: "LEARN_MORE"
  },
  {
    summary: "Indian Rocks Beach Yacht Charter — Gulf Coast Escape 🌅\n\nPrivate yacht charters serving Indian Rocks Beach, Belleair Beach, and Indian Shores. Cruise the calm Intracoastal Waterway, visit Caladesi Island, and watch the sunset from our flybridge.\n\nAll-inclusive weekend packages from $2,000. Captain, crew, and fuel included.\n\nBook your Gulf Coast escape!",
    url: "https://www.yachtawaynow.com/yacht-charter-indian-rocks-beach",
    action: "BOOK"
  },
  {
    summary: "Family Yacht Charter — Kids Welcome Aboard! 👨‍👩‍👧‍👦\n\nA private yacht charter is the ultimate family day on Tampa Bay. Swim at sandbars, spot dolphins, explore islands — all from a 52ft yacht with professional captain and crew.\n\nLife jackets for all ages. BYOB welcome. Up to 13 guests.\n\nBook your family adventure today!",
    url: "https://www.yachtawaynow.com/family-yacht-charter",
    action: "BOOK"
  },
  {
    summary: "Corporate Team Building on a Yacht — Tampa Bay 🤝\n\nSkip the conference room. Host your next corporate event on a private luxury yacht.\n\nThree decks of meeting and socializing space, premium stereo, Starlink WiFi, full galley kitchen, and a professional crew.\n\nWeekend packages from $2,000 all-inclusive. Up to 13 guests.",
    url: "https://www.yachtawaynow.com/corporate-yacht-charter",
    action: "BOOK"
  },
  {
    summary: "137 Five-Star Google Reviews ⭐⭐⭐⭐⭐\n\n\"An absolutely unforgettable experience. The yacht is wonderful — spacious, fully equipped, comfortable. Such a smooth ride.\"\n\nThank you to all our guests who have made us the top-rated yacht charter in St. Petersburg!\n\nRead all 137 reviews and book your charter today.",
    url: "https://www.yachtawaynow.com/about",
    action: "LEARN_MORE"
  },
  {
    summary: "Egmont Key Boat Charter — History Meets Paradise 🏝️\n\nExplore Civil War-era Fort Dade ruins, snorkel crystal-clear waters, and walk untouched beaches — all accessible only by boat.\n\nOur 52ft Marquis Flybridge anchors right at the island. Combine with Shell Key for a full-day island-hopping adventure.\n\nBook your Egmont Key trip!",
    url: "https://www.yachtawaynow.com/egmont-key-boat-charter",
    action: "BOOK"
  },
  {
    summary: "Sunset Cruise St. Petersburg — Golden Hour on the Water 🌅\n\nWatch the sky turn gold and pink from the flybridge of a private 52ft yacht. Pass the Skyway Bridge, Pass-a-Grille, and Shell Key.\n\n5-hour sunset cruise: $2,500 all-inclusive (2:30-7:30pm). Captain, crew, fuel included.\n\nThe most popular charter we offer. Book early!",
    url: "https://www.yachtawaynow.com/sunset-cruise-st-petersburg",
    action: "BOOK"
  },
  {
    summary: "What to Bring on a Yacht Charter — Packing Guide ☀️\n\nPlanning your first yacht charter? Here's what to pack:\n✅ Reef-safe sunscreen & hat\n✅ Swimsuit & towel\n✅ Food & drinks (BYOB — no glass!)\n✅ Waterproof phone case\n✅ Change of clothes\n❌ No shoes inside the yacht\n\nRead the full packing guide on our blog!",
    url: "https://www.yachtawaynow.com/blog/what-to-bring-on-a-yacht-charter",
    action: "LEARN_MORE"
  },
  {
    summary: "Birthday Yacht Charter — Celebrate on the Water 🎂\n\nMake your next birthday unforgettable aboard a private 52ft luxury yacht. 3 decks, premium Bluetooth stereo, Starlink WiFi, swim platform.\n\nBring your own cake, drinks, and decorations. Up to 13 guests. All-inclusive weekend packages from $2,000.\n\nBook your birthday charter!",
    url: "https://www.yachtawaynow.com/birthday-yacht-charter",
    action: "BOOK"
  },
  {
    summary: "Rent a Yacht in St. Petersburg, FL ⚓\n\nLooking to rent a yacht in St. Pete? Yacht Away Now is a private, fully-crewed yacht rental — step aboard and we handle the rest.\n\n💰 Weekday rentals from $500/hour (4-hour minimum, all-inclusive)\n⛵ 52ft Marquis Flybridge, up to 13 guests\n🧑‍✈️ USCG-licensed captain & crew included — no boating license needed\n\nDeparts right from downtown St. Petersburg. Reserve your date!",
    url: "https://www.yachtawaynow.com/yacht-charter-st-petersburg",
    action: "BOOK"
  },
  {
    summary: "Can You Rent a Yacht for a Day in St. Pete? 🏝️\n\nYes! Rent our 52ft Marquis Flybridge for a full day on Tampa Bay — island-hop to Shell Key & Egmont Key, anchor at a sandbar, or chase the sunset.\n\nEvery rental is captained, so no license or experience required. BYOB welcome, up to 13 guests.\n\nDeparting from our private St. Petersburg marina. Book your day on the water!",
    url: "https://www.yachtawaynow.com/yacht-charter-st-petersburg",
    action: "BOOK"
  },
  {
    summary: "No Boating License Needed 🛥️ Captained Yacht Rentals in St. Petersburg\n\nWith Yacht Away Now, renting a yacht in St. Pete is effortless — our USCG-licensed captain runs the boat while you and up to 12 guests relax.\n\n⭐ 137 five-star Google reviews\n⚓ Departs 38th Way S, St. Petersburg\n💰 Weekday from $500/hr; weekend 5-hour sunset cruise $3,000 all-inclusive\n\nRequest your St. Pete yacht rental today!",
    url: "https://www.yachtawaynow.com/yacht-charter-st-petersburg",
    action: "BOOK"
  },
];

const ACCOUNT = 'accounts/114971803143699974130';
const LOCATION = 'locations/8568528334353152453';

export default async function handler(req, res) {
  // Calculate which post to send based on week number
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const weekNum = Math.floor((now - startOfYear) / (7 * 24 * 60 * 60 * 1000));
  const postIndex = weekNum % POSTS.length;
  const post = POSTS[postIndex];

  // Get access token using service account or stored refresh token
  // For now, use the application default credentials approach
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN || '',
      grant_type: 'refresh_token',
    }),
  });

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  if (!accessToken) {
    return res.status(500).json({ error: 'Failed to get access token', details: tokenData });
  }

  try {
    const response = await fetch(
      `https://mybusiness.googleapis.com/v4/${ACCOUNT}/${LOCATION}/localPosts`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'x-goog-user-project': 'yachtawaynow',
        },
        body: JSON.stringify({
          languageCode: 'en',
          summary: post.summary,
          callToAction: {
            actionType: post.action,
            url: post.url,
          },
          topicType: 'STANDARD',
        }),
      }
    );

    const result = await response.json();

    return res.status(200).json({
      success: true,
      weekNum,
      postIndex,
      postUrl: post.url,
      state: result.state || result.error?.message,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
