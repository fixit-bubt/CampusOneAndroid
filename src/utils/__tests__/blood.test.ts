import { donorEligibility, DONATION_WAIT_DAYS, DONATION_WAIT_DAYS_FEMALE } from '../blood';
import { localToday } from '../format';

const daysAgo = (n: number) => {
  const [y, m, d] = localToday().split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d - n));
  return dt.toISOString().slice(0, 10);
};

describe('donorEligibility', () => {
  it('is eligible with no recorded donation', () => {
    expect(donorEligibility(null)).toEqual({ eligible: true, daysLeft: 0, waitDays: DONATION_WAIT_DAYS });
    expect(donorEligibility(undefined)).toEqual({ eligible: true, daysLeft: 0, waitDays: DONATION_WAIT_DAYS });
    expect(donorEligibility('')).toEqual({ eligible: true, daysLeft: 0, waitDays: DONATION_WAIT_DAYS });
  });

  it('is ineligible within the wait window, with a countdown', () => {
    const r = donorEligibility(daysAgo(30));
    expect(r.eligible).toBe(false);
    expect(r.daysLeft).toBe(DONATION_WAIT_DAYS - 30); // 60
    expect(r.waitDays).toBe(DONATION_WAIT_DAYS);
  });

  it('is eligible once the wait has fully passed', () => {
    expect(donorEligibility(daysAgo(DONATION_WAIT_DAYS)).eligible).toBe(true);
    expect(donorEligibility(daysAgo(DONATION_WAIT_DAYS + 5))).toEqual({ eligible: true, daysLeft: 0, waitDays: DONATION_WAIT_DAYS });
  });

  it('is ineligible the day before it clears', () => {
    const r = donorEligibility(daysAgo(DONATION_WAIT_DAYS - 1));
    expect(r.eligible).toBe(false);
    expect(r.daysLeft).toBe(1);
  });

  it('enforces 120-day wait window for female donors (WHO standard)', () => {
    const r = donorEligibility(daysAgo(100), 'female');
    expect(r.eligible).toBe(false);
    expect(r.daysLeft).toBe(DONATION_WAIT_DAYS_FEMALE - 100); // 20
    expect(r.waitDays).toBe(120);

    const ready = donorEligibility(daysAgo(120), 'female');
    expect(ready.eligible).toBe(true);
    expect(ready.daysLeft).toBe(0);
  });

  it('treats an unparseable date as eligible rather than blocking', () => {
    expect(donorEligibility('not-a-date')).toEqual({ eligible: true, daysLeft: 0, waitDays: DONATION_WAIT_DAYS });
  });

  it('calculates exactly 90 days left if donated today', () => {
    const today = localToday();
    const r = donorEligibility(today);
    expect(r.eligible).toBe(false);
    expect(r.daysLeft).toBe(90);
  });
});

describe('isBloodCompatible', () => {
  const { isBloodCompatible } = require('../blood');

  it('correctly matches ABO/Rh compatible donors', () => {
    // O- is universal red cell donor
    expect(isBloodCompatible('O-', 'A+')).toBe(true);
    expect(isBloodCompatible('O-', 'B+')).toBe(true);
    expect(isBloodCompatible('O-', 'AB+')).toBe(true);
    expect(isBloodCompatible('O-', 'O-')).toBe(true);

    // AB+ is universal recipient
    expect(isBloodCompatible('A+', 'AB+')).toBe(true);
    expect(isBloodCompatible('B-', 'AB+')).toBe(true);

    // Incompatible pairs
    expect(isBloodCompatible('A+', 'B+')).toBe(false);
    expect(isBloodCompatible('B+', 'A-')).toBe(false);
    expect(isBloodCompatible('AB+', 'O+')).toBe(false);
  });
});
