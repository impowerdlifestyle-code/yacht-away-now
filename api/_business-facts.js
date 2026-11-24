// The one place the serverless functions read published rates and the Google
// review count from. The static pages still carry their own copies, so a change
// here goes out with the sitewide sweep, in the same commit.
export const REVIEW_COUNT = 144;

export const MIN_HOURS = 4;
export const SUNSET_HOURS = 5;

export const RATES = {
  marquis: { weekday: 500, weekend: 600 },
  slyFox: { weekday: 650, weekend: 750 },
};

export const SLY_FOX_MULTI_DAY_FROM = 5000;

// Not in the hourly rate. Paid to the captain at the boat, never collected online.
export const FUEL_CHARGE = 250;

export function usd(amount) {
  return `$${amount.toLocaleString('en-US')}`;
}
