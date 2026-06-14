// Maps DB status strings → colors for Pill / badges.

type PillVariant = 'default' | 'brand' | 'success' | 'warning' | 'error' | 'info';

const REPORT_STATUS_COLOR: Record<string, PillVariant> = {
  Open: 'info',
  'In Progress': 'warning',
  Resolved: 'success',
  Rejected: 'error',
  Closed: 'default',
};

const CLAIM_STATUS_COLOR: Record<string, PillVariant> = {
  Pending: 'warning',
  Approved: 'success',
  Rejected: 'error',
};

const APPOINTMENT_STATUS_COLOR: Record<string, PillVariant> = {
  Booked: 'info',
  Confirmed: 'brand',
  Completed: 'success',
  Cancelled: 'error',
};

const LISTING_STATUS_COLOR: Record<string, PillVariant> = {
  Available: 'success',
  Sold: 'default',
};

const PRIORITY_COLOR: Record<string, PillVariant> = {
  Urgent: 'error',
  Important: 'warning',
  General: 'info',
};

export const StatusColor = {
  report: (s: string): PillVariant => REPORT_STATUS_COLOR[s] ?? 'default',
  claim: (s: string): PillVariant => CLAIM_STATUS_COLOR[s] ?? 'default',
  appointment: (s: string): PillVariant => APPOINTMENT_STATUS_COLOR[s] ?? 'default',
  listing: (s: string): PillVariant => LISTING_STATUS_COLOR[s] ?? 'default',
  priority: (s: string): PillVariant => PRIORITY_COLOR[s] ?? 'default',
};
