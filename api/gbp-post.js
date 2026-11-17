import { isCron } from './_shared.js';
import { REVIEW_COUNT, RATES, MIN_HOURS, SUNSET_HOURS, SLY_FOX_MULTI_DAY_FROM, FUEL_CHARGE, usd } from './_business-facts.js';
import { GBP_LOCATION_URL, getAccessToken, liveReviewCount } from './_gbp.js';
import { alertOwners } from './_owner-alert.js';

const { marquis, slyFox } = RATES;
const weekdayMin = usd(marquis.weekday * MIN_HOURS);
const weekendMin = usd(marquis.weekend * MIN_HOURS);
const sunsetWeekday = usd(marquis.weekday * SUNSET_HOURS);
const sunsetWeekend = usd(marquis.weekend * SUNSET_HOURS);
const fuel = usd(FUEL_CHARGE);

const POSTS = [
  {
    summary: `Yacht Wedding vs Traditional Venue 💍\n\nAn intimate ceremony on the flybridge with a Gulf Coast sunset backdrop. 52ft Marquis Flybridge, up to 13 guests, professional captain and crew.\n\nOne hourly rate with captain and crew included: ${usd(marquis.weekday)}/hr weekdays, ${usd(marquis.weekend)}/hr weekends, ${MIN_HOURS}-hour minimum. A ${MIN_HOURS}-hour weekend charter is ${weekendMin}. Fuel is a flat ${fuel} per trip, paid on the day.\n\nRead our full cost comparison on the blog!`,
    url: "https://www.yachtawaynow.com/blog/yacht-wedding-vs-venue-cost-comparison",
    action: "LEARN_MORE"
  },
  {
    summary: `Planning a Bachelorette in St. Pete? Here's Your 3-Day Itinerary 🥂\n\nDay 1: Beach Drive dinner + rooftop cocktails at The Birchwood\nDay 2: Private sunset yacht cruise with your crew\nDay 3: Brunch + beach\n\nA weekend ${SUNSET_HOURS}-hour sunset cruise (${sunsetWeekend} split 10 ways = ${usd(marquis.weekend * SUNSET_HOURS / 10)}/person) is the highlight every bride remembers.\n\nRead the full itinerary on our blog!`,
    url: "https://www.yachtawaynow.com/blog/bachelorette-yacht-itinerary-st-pete",
    action: "LEARN_MORE"
  },
  {
    summary: `Yacht Charter Near Treasure Island FL 🏝️\n\nPrivate luxury yacht charters departing near Treasure Island. Cruise past Johns Pass, stop at sandbars, watch the sunset over the Gulf.\n\n52ft Marquis Flybridge, 3 decks, Starlink WiFi, premium stereo. Up to 13 guests, BYOB welcome.\n\nWeekend charters from ${weekendMin} for ${MIN_HOURS} hours, plus ${fuel} fuel per trip.`,
    url: "https://www.yachtawaynow.com/yacht-charter-treasure-island",
    action: "BOOK"
  },
  {
    summary: `How Much Does a Yacht Charter Actually Cost? \ud83d\udcb0\n\nNo call-for-quote games. Our Tampa Bay pricing:\n\n\u2705 Weekdays ${usd(marquis.weekday)}/hr \u00b7 Weekends ${usd(marquis.weekend)}/hr\n\u2705 Captain, crew and ice included\n\u2705 Fuel is a flat ${fuel} per trip, paid on the day\n\u2705 ${MIN_HOURS}-hour minimum \u00b7 up to 13 guests\n\nSplit 10 ways, a ${MIN_HOURS}-hour weekend charter (${weekendMin}) is ${usd(marquis.weekend * MIN_HOURS / 10)}/person.\n\nFull pricing breakdown on the blog!`,
    url: "https://www.yachtawaynow.com/blog/how-much-does-a-yacht-charter-cost-tampa-bay",
    action: "LEARN_MORE"
  },
  {
    summary: `First Yacht Charter? Here's Exactly How It Works \u2693\n\nWhere to park, when to board, who picks the route, and yes, how tipping works.\n\nWe wrote the step-by-step guide for first-timers, from booking to the golden-hour ride home. No license or experience needed. Our USCG-licensed captain handles everything.\n\nRead the first-timer's guide!`,
    url: "https://www.yachtawaynow.com/blog/first-yacht-charter-what-to-expect",
    action: "LEARN_MORE"
  },
  {
    summary: `Two Islands. One Perfect Day. \ud83c\udfdd\ufe0f\n\nEgmont Key: fort ruins, a historic lighthouse, and snorkeling over submerged batteries.\nShell Key: the best shelling sandbar on the Gulf Coast.\n\nBoth in one full-day private charter from St. Pete. The exact itinerary our captains run is on the blog.\n\nPlan your island day!`,
    url: "https://www.yachtawaynow.com/blog/shell-key-egmont-key-day-trip",
    action: "LEARN_MORE"
  },
  {
    summary: `When's the Best Month to Charter in Tampa Bay? \ud83c\udf24\ufe0f\n\nOur captains' honest answer: April, May, and October, the local's favorite. Summer? Book mornings or sunset cruises and let the afternoon storm have the mid-afternoon.\n\nWe published the full month-by-month weather guide: water temps, seas, and the truth about hurricane season.\n\nFind your month!`,
    url: "https://www.yachtawaynow.com/blog/tampa-bay-boating-weather-by-month",
    action: "LEARN_MORE"
  },
  {
    summary: `The Best Date Night in St. Pete Isn't a Restaurant \ud83c\udf05\n\nA private 52ft yacht, golden hour off Pass-a-Grille, your playlist, your favorite bottle (BYOB), and a crew that handles everything else.\n\nWeekday evenings from ${weekdayMin} for the entire yacht, plus ${fuel} fuel per trip. Anniversaries and proposals are our specialty and we're undefeated.\n\nPlan your night on the water!`,
    url: "https://www.yachtawaynow.com/blog/date-night-on-the-water-st-petersburg",
    action: "BOOK"
  },
  {
    summary: `How Many People Fit on a Yacht Charter? \ud83d\udc65\n\nOur 52ft Marquis hosts up to 13 guests across 3 decks, and yes, kids count toward the limit (it's federal law, and any operator who'll \"squeeze in extras\" is one to avoid).\n\nBigger group? Add Sly Fox, which sleeps 6, and cruise side by side.\n\nRead the group size guide!`,
    url: "https://www.yachtawaynow.com/blog/how-many-people-fit-on-a-yacht-charter",
    action: "LEARN_MORE"
  },
  {
    summary: `Beat the Florida Heat \u2600\ufe0f Morning & Sunset Charters\n\nSummer on Tampa Bay has a rhythm: gorgeous mornings, a brief afternoon storm, then a washed-clean golden evening.\n\nSo we run with it: morning sandbar swims in warm Gulf water, or the ${SUNSET_HOURS}-hour sunset cruise (${sunsetWeekday} weekdays, ${sunsetWeekend} weekends, plus ${fuel} fuel) when the sky puts on its show.\n\nBook your summer slot!`,
    url: "https://www.yachtawaynow.com/sunset-cruise-st-petersburg",
    action: "BOOK"
  },
  {
    summary: `Meet Sly Fox \ud83e\udd8a Our 3-Stateroom Luxury Yacht\n\nBuilt for couples' escapes and small-group cruising: up to 6 guests, three private staterooms, optional private chef, and multi-day Gulf Coast itineraries from ${usd(SLY_FOX_MULTI_DAY_FROM)}.\n\n${usd(slyFox.weekday)}/hr weekdays \u00b7 ${usd(slyFox.weekend)}/hr weekends \u00b7 captain and crew included, plus ${fuel} fuel per trip.\n\nThe intimate side of Yacht Away Now. Book Sly Fox!`,
    url: "https://www.yachtawaynow.com/sly-fox",
    action: "BOOK"
  },
  {
    summary: `Best Boat Charter Companies in St. Pete: Our Guide ⭐\n\nWe compared pricing, vessels, reviews, and amenities across the top charter companies in St. Petersburg.\n\nSee how Yacht Away Now's 52ft Marquis Flybridge, ${REVIEW_COUNT} five-star reviews, and transparent pricing stack up against the competition.\n\nRead the full comparison!`,
    url: "https://www.yachtawaynow.com/blog/best-boat-charter-companies-st-petersburg",
    action: "LEARN_MORE"
  },
  {
    summary: `Indian Rocks Beach Yacht Charter: Gulf Coast Escape 🌅\n\nPrivate yacht charters serving Indian Rocks Beach, Belleair Beach, and Indian Shores. Cruise the calm Intracoastal Waterway, visit Caladesi Island, and watch the sunset from our flybridge.\n\nWeekend charters from ${weekendMin} for ${MIN_HOURS} hours with captain and crew included. Fuel is a flat ${fuel} per trip, paid on the day.\n\nBook your Gulf Coast escape!`,
    url: "https://www.yachtawaynow.com/yacht-charter-indian-rocks-beach",
    action: "BOOK"
  },
  {
    summary: `Family Yacht Charter: Kids Welcome Aboard! 👨‍👩‍👧‍👦\n\nA private yacht charter is the ultimate family day on Tampa Bay. Swim at sandbars, spot dolphins, explore islands, all from a 52ft yacht with professional captain and crew.\n\nLife jackets for all ages. BYOB welcome. Up to 13 guests.\n\nBook your family adventure today!`,
    url: "https://www.yachtawaynow.com/family-yacht-charter",
    action: "BOOK"
  },
  {
    summary: `Corporate Team Building on a Yacht: Tampa Bay 🤝\n\nSkip the conference room. Host your next corporate event on a private luxury yacht.\n\nThree decks of meeting and socializing space, premium stereo, Starlink WiFi, full galley kitchen, and a professional crew.\n\nWeekend charters from ${weekendMin} for ${MIN_HOURS} hours, plus ${fuel} fuel per trip. Up to 13 guests.`,
    url: "https://www.yachtawaynow.com/corporate-yacht-charter",
    action: "BOOK"
  },
  {
    summary: `${REVIEW_COUNT} Five-Star Google Reviews ⭐⭐⭐⭐⭐\n\n\"An absolutely unforgettable experience. The yacht is wonderful: spacious, fully equipped, comfortable. Such a smooth ride.\"\n\nThank you to all our guests who have made us the top-rated yacht charter in St. Petersburg!\n\nRead all ${REVIEW_COUNT} reviews and book your charter today.`,
    url: "https://www.yachtawaynow.com/about",
    action: "LEARN_MORE"
  },
  {
    summary: `Egmont Key Boat Charter: History Meets Paradise 🏝️\n\nExplore Civil War-era Fort Dade ruins, snorkel crystal-clear waters, and walk untouched beaches, all accessible only by boat.\n\nOur 52ft Marquis Flybridge anchors right at the island. Combine with Shell Key for a full-day island-hopping adventure.\n\nBook your Egmont Key trip!`,
    url: "https://www.yachtawaynow.com/egmont-key-boat-charter",
    action: "BOOK"
  },
  {
    summary: `Sunset Cruise St. Petersburg: Golden Hour on the Water 🌅\n\nWatch the sky turn gold and pink from the flybridge of a private 52ft yacht. Pass the Skyway Bridge, Pass-a-Grille, and Shell Key.\n\n${SUNSET_HOURS}-hour sunset cruise: ${sunsetWeekday} weekdays, ${sunsetWeekend} weekends. Captain and crew included. Fuel is a flat ${fuel} per trip, paid on the day.\n\nThe most popular charter we offer. Book early!`,
    url: "https://www.yachtawaynow.com/sunset-cruise-st-petersburg",
    action: "BOOK"
  },
  {
    summary: `What to Bring on a Yacht Charter: Packing Guide ☀️\n\nPlanning your first yacht charter? Here's what to pack:\n✅ Reef-safe sunscreen & hat\n✅ Swimsuit & towel\n✅ Food & drinks (BYOB, no glass!)\n✅ Waterproof phone case\n✅ Change of clothes\n❌ No shoes inside the yacht\n\nRead the full packing guide on our blog!`,
    url: "https://www.yachtawaynow.com/blog/what-to-bring-on-a-yacht-charter",
    action: "LEARN_MORE"
  },
  {
    summary: `Birthday Yacht Charter: Celebrate on the Water 🎂\n\nMake your next birthday unforgettable aboard a private 52ft luxury yacht. 3 decks, premium Bluetooth stereo, Starlink WiFi, swim platform.\n\nBring your own cake, drinks, and decorations. Up to 13 guests. Weekend charters from ${weekendMin} for ${MIN_HOURS} hours, plus ${fuel} fuel per trip.\n\nBook your birthday charter!`,
    url: "https://www.yachtawaynow.com/birthday-yacht-charter",
    action: "BOOK"
  },
  {
    summary: `Rent a Yacht in St. Petersburg, FL ⚓\n\nLooking to rent a yacht in St. Pete? Yacht Away Now is a private, fully-crewed yacht rental. Step aboard and we handle the rest.\n\n💰 Weekday rentals from ${usd(marquis.weekday)}/hour (${MIN_HOURS}-hour minimum, plus ${fuel} fuel per trip)\n⛵ 52ft Marquis Flybridge, up to 13 guests\n🧑‍✈️ USCG-licensed captain & crew included, no boating license needed\n\nDeparts right from downtown St. Petersburg. Reserve your date!`,
    url: "https://www.yachtawaynow.com/yacht-charter-st-petersburg",
    action: "BOOK"
  },
  {
    summary: `Can You Rent a Yacht for a Day in St. Pete? 🏝️\n\nYes! Rent our 52ft Marquis Flybridge for a full day on Tampa Bay: island-hop to Shell Key & Egmont Key, anchor at a sandbar, or chase the sunset.\n\nEvery rental is captained, so no license or experience required. BYOB welcome, up to 13 guests.\n\nDeparting from our private St. Petersburg marina. Book your day on the water!`,
    url: "https://www.yachtawaynow.com/yacht-charter-st-petersburg",
    action: "BOOK"
  },
  {
    summary: `No Boating License Needed 🛥️ Captained Yacht Rentals in St. Petersburg\n\nWith Yacht Away Now, renting a yacht in St. Pete is effortless. Our USCG-licensed captain runs the boat while your group of up to 13 relaxes.\n\n⭐ ${REVIEW_COUNT} five-star Google reviews\n⚓ Departs 38th Way S, St. Petersburg\n💰 Weekday from ${usd(marquis.weekday)}/hr; weekend ${SUNSET_HOURS}-hour sunset cruise ${sunsetWeekend} plus ${fuel} fuel\n\nRequest your St. Pete yacht rental today!`,
    url: "https://www.yachtawaynow.com/yacht-charter-st-petersburg",
    action: "BOOK"
  },
];

export default async function handler(req, res) {
  if (!isCron(req)) return res.status(401).json({ error: 'Unauthorized' });
  console.log(`gbp-post run at=${new Date().toISOString()}`);
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const weekNum = Math.floor((now - startOfYear) / (7 * 24 * 60 * 60 * 1000));
  const postIndex = weekNum % POSTS.length;
  const post = POSTS[postIndex];

  let accessToken;
  try {
    accessToken = await getAccessToken();
  } catch (err) {
    console.error('gbp-post token refresh failed:', err.message);
    return res.status(502).json({ error: 'Failed to get access token' });
  }

  // The posts quote the review count and the site publishes the same number.
  // Google prunes reviews, so nothing goes out until the two agree again.
  let liveCount;
  try {
    liveCount = await liveReviewCount(accessToken);
  } catch (err) {
    console.error('gbp-post:', err.message);
    await alertOwners({
      subject: 'Weekly Google post skipped: review count could not be checked',
      text: `This week's Google Business Profile post was not published because the live review count could not be read from Google (${err.message}). It will try again next week.`,
    });
    return res.status(200).json({ success: false, skipped: 'review count unavailable', weekNum, postIndex });
  }
  if (liveCount !== REVIEW_COUNT) {
    console.warn(`gbp-post skipped: Google reports ${liveCount} reviews, the site says ${REVIEW_COUNT}`);
    await alertOwners({
      subject: `Weekly Google post skipped: Google shows ${liveCount} reviews, the site says ${REVIEW_COUNT}`,
      text: `This week's Google Business Profile post was not published.\n\n` +
        `Google reports ${liveCount} reviews. The website and the scheduled posts say ${REVIEW_COUNT}.\n\n` +
        'To fix it, run the review-count sweep across the site, set REVIEW_COUNT in api/_business-facts.js to the live number in the same commit, and deploy. Posting resumes on the next weekly run once the numbers match.',
    });
    return res.status(200).json({ success: false, skipped: 'review count mismatch', googleReviewCount: liveCount, siteReviewCount: REVIEW_COUNT, weekNum, postIndex });
  }

  try {
    const response = await fetch(
      `${GBP_LOCATION_URL}/localPosts`,
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

    const result = await response.json().catch(() => ({}));

    if (!response.ok || result.error) {
      console.error('gbp-post failed:', response.status, JSON.stringify(result.error || {}).slice(0, 500));
      return res.status(502).json({ success: false, weekNum, postIndex, postUrl: post.url, status: response.status, error: result.error?.message || 'Google rejected the post' });
    }

    return res.status(200).json({
      success: true,
      weekNum,
      postIndex,
      postUrl: post.url,
      state: result.state || null,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
