import { donorEligibility, DONATION_WAIT_DAYS } from '../blood';

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

describe('donorEligibility', () => {
  it('is eligible with no recorded donation', () => {
    expect(donorEligibility(null)).toEqual({ eligible: true, daysLeft: 0 });
    expect(donorEligibility(undefined)).toEqual({ eligible: true, daysLeft: 0 });
    expect(donorEligibility('')).toEqual({ eligible: true, daysLeft: 0 });
  });

  it('is ineligible within the wait window, with a countdown', () => {
    const r = donorEligibility(daysAgo(30));
    expect(r.eligible).toBe(false);
    expect(r.daysLeft).toBe(DONATION_WAIT_DAYS - 30); // 60
  });

  it('is eligible once the wait has fully passed', () => {
    expect(donorEligibility(daysAgo(DONATION_WAIT_DAYS)).eligible).toBe(true);
    expect(donorEligibility(daysAgo(DONATION_WAIT_DAYS + 5))).toEqual({ eligible: true, daysLeft: 0 });
  });

  it('is ineligible the day before it clears', () => {
    const r = donorEligibility(daysAgo(DONATION_WAIT_DAYS - 1));
    expect(r.eligible).toBe(false);
    expect(r.daysLeft).toBe(1);
  });

  it('treats an unparseable date as eligible rather than blocking', () => {
    expect(donorEligibility('not-a-date')).toEqual({ eligible: true, daysLeft: 0 });
  });
});
