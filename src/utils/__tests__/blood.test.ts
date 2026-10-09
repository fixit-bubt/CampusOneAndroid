import { donorEligibility, DONATION_WAIT_DAYS, DONATION_WAIT_DAYS_FEMALE } from '../blood';

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

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
});
