import { localToday } from './format';

// Blood donation eligibility - WHO standard: 90 days for males, 120 days for females.
// last_donated is a YYYY-MM-DD date (local Dhaka date; see localToday()).

export const DONATION_WAIT_DAYS = 90;
export const DONATION_WAIT_DAYS_MALE = 90;
export const DONATION_WAIT_DAYS_FEMALE = 120;

export const COMPATIBLE_DONOR_GROUPS: Record<string, string[]> = {
  'A+':  ['A+', 'A-', 'O+', 'O-'],
  'A-':  ['A-', 'O-'],
  'B+':  ['B+', 'B-', 'O+', 'O-'],
  'B-':  ['B-', 'O-'],
  'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
  'AB-': ['A-', 'B-', 'AB-', 'O-'],
  'O+':  ['O+', 'O-'],
  'O-':  ['O-'],
};

export function isBloodCompatible(donorGroup: string | null | undefined, recipientGroup: string): boolean {
  if (!donorGroup) return false;
  const allowable = COMPATIBLE_DONOR_GROUPS[recipientGroup];
  return allowable ? allowable.includes(donorGroup) : donorGroup === recipientGroup;
}

export interface Eligibility {
  eligible: boolean;
  daysLeft: number; // days until eligible again; 0 when eligible
  waitDays: number; // required wait days (90 for male, 120 for female)
}

/**
 * A donor is eligible if they have no recorded donation, or at least
 * waitDays (90 for males, 120 for females per WHO guidelines) have passed since the last one.
 * Uses calendar date math via localToday() to prevent Dhaka UTC+6 midnight drift.
 */
export function donorEligibility(
  lastDonated: string | null | undefined,
  gender?: 'male' | 'female' | 'Male' | 'Female' | null
): Eligibility {
  const isFemale = gender ? gender.toLowerCase() === 'female' : false;
  const waitDays = isFemale ? DONATION_WAIT_DAYS_FEMALE : DONATION_WAIT_DAYS_MALE;

  if (!lastDonated || !/^\d{4}-\d{2}-\d{2}$/.test(lastDonated)) {
    return { eligible: true, daysLeft: 0, waitDays };
  }

  const [y1, m1, d1] = lastDonated.split('-').map(Number);
  const [y2, m2, d2] = localToday().split('-').map(Number);
  const thenUtc = Date.UTC(y1, m1 - 1, d1);
  const todayUtc = Date.UTC(y2, m2 - 1, d2);
  const daysElapsed = Math.floor((todayUtc - thenUtc) / 86400000);
  const daysLeft = Math.max(0, waitDays - Math.max(0, daysElapsed));

  return { eligible: daysLeft === 0, daysLeft, waitDays };
}
