// English UI strings — the source of truth. bn.ts must mirror this shape
// exactly (TypeScript enforces it). UI chrome only; user content (reports,
// posts, announcements) is never translated.
export const en = {
  common: {
    seeAll: 'See All',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    search: 'Search',
    all: 'All',
    none: 'None',
    done: 'Done',
    error: 'Error',
    retry: 'Retry',
    confirm: 'Confirm',
    back: 'Back',
    open: 'Open',
    close: 'Close',
    submit: 'Submit',
    optional: 'Optional',
    required: 'Required',
    noResults: 'Nothing found',
    loadingError: "Couldn't load. Pull to retry.",
  },

  tabs: {
    home: 'Home',
    explore: 'Explore',
    alerts: 'Alerts',
    profile: 'Profile',
  },

  topbar: {
    greeting: 'Good morning,',
    langLabel: 'EN',
  },

  landing: {
    tagline: 'Your campus, all in one place. Reports, events, clubs, and more.',
    getStarted: 'Get Started',
    haveAccount: 'I already have an account',
  },

  sectors: {
    reports: 'Reports',
    lostfound: 'Lost',
    clubs: 'Clubs',
    events: 'Events',
    jobs: 'Jobs',
    announce: 'News',
    study: 'Study',
    bus: 'Bus',
    medical: 'Medical',
    market: 'Market',
    ride: 'Ride',
    blood: 'Blood',
    directory: 'Directory',
    prayer: 'Prayer',
    faculty: 'Faculty',
  },

  home: {
    newAlerts: (n: number) => `${n} new ${n === 1 ? 'alert' : 'alerts'}`,
    alertsFrom: 'From reports, clubs & more',
    quickActions: 'QUICK ACTIONS',
    myReports: 'MY REPORTS',
    newReport: 'New Report',
    noReports: 'No reports yet. Tap + to submit one.',
    recentAlerts: 'RECENT ALERTS',
    noAlerts: 'No alerts yet.',
  },

  status: {
    Open: 'Open',
    'In Progress': 'In Progress',
    Resolved: 'Resolved',
    Rejected: 'Rejected',
    Closed: 'Closed',
  } as Record<string, string>,

  reports: {
    myReportsTitle: 'My Reports',
    assignedTitle: 'Assigned to Me',
    searchPlaceholder: 'Search reports...',
    newReport: 'New Report',
    noReportsTitle: 'No reports',
    noReportsBody: 'Nothing matches. Try different filters.',
    deleteTitle: 'Delete report',
    deleteBody: 'This removes the report permanently. Continue?',
    view: 'View',
    resultCount: (n: number) => `${n} report${n === 1 ? '' : 's'}`,
  },
};

export type Dict = typeof en;
