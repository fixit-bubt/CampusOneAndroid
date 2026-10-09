// Blood donation eligibility - WHO standard: 90 days for males, 120 days for females.
// last_donated is a YYYY-MM-DD date (local Dhaka date; see localToday()).

export const DONATION_WAIT_DAYS = 90;
export const DONATION_WAIT_DAYS_MALE = 90;
export const DONATION_WAIT_DAYS_FEMALE = 120;

export interface Eligibility {
  eligible: boolean;
  daysLeft: number; // days until eligible again; 0 when eligible
  waitDays: number; // required wait days (90 for male, 120 for female)
}

/**
 * A donor is eligible if they have no recorded donation, or at least
 * waitDays (90 for males, 120 for females per WHO guidelines) have passed since the last one.
 */
export function donorEligibility(
  lastDonated: string | null | undefined,
  gender?: 'male' | 'female' | 'Male' | 'Female' | null
): Eligibility {
  const isFemale = gender ? gender.toLowerCase() === 'female' : false;
  const waitDays = isFemale ? DONATION_WAIT_DAYS_FEMALE : DONATION_WAIT_DAYS_MALE;

  if (!lastDonated) return { eligible: true, daysLeft: 0, waitDays };
  const then = new Date(lastDonated).getTime();
  if (isNaN(then)) return { eligible: true, daysLeft: 0, waitDays };
  const days = Math.floor((Date.now() - then) / 86400000);
  const daysLeft = Math.max(0, waitDays - days);
  return { eligible: daysLeft === 0, daysLeft, waitDays };
}
