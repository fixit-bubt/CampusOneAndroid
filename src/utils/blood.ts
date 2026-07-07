// Blood donation eligibility — the 90-day wait between donations.
// last_donated is a YYYY-MM-DD date (local Dhaka date; see localToday()).

export const DONATION_WAIT_DAYS = 90;

export interface Eligibility {
  eligible: boolean;
  daysLeft: number; // days until eligible again; 0 when eligible
}

/**
 * A donor is eligible if they have no recorded donation, or at least
 * DONATION_WAIT_DAYS have passed since the last one.
 */
export function donorEligibility(lastDonated: string | null | undefined): Eligibility {
  if (!lastDonated) return { eligible: true, daysLeft: 0 };
  const then = new Date(lastDonated).getTime();
  if (isNaN(then)) return { eligible: true, daysLeft: 0 };
  const days = Math.floor((Date.now() - then) / 86400000);
  const daysLeft = Math.max(0, DONATION_WAIT_DAYS - days);
  return { eligible: daysLeft === 0, daysLeft };
}
