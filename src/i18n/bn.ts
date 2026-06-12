// Bangla UI strings — mirrors en.ts exactly (type-checked via Dict).
// Existing translations carried over from HomeScreen's inline maps.
import type { Dict } from './en';

export const bn: Dict = {
  common: {
    seeAll: 'সব দেখুন',
    cancel: 'বাতিল',
    save: 'সংরক্ষণ',
    delete: 'মুছুন',
    edit: 'সম্পাদনা',
    search: 'খুঁজুন',
    all: 'সব',
    none: 'কিছু নেই',
    done: 'সম্পন্ন',
    error: 'ত্রুটি',
    retry: 'আবার চেষ্টা',
    confirm: 'নিশ্চিত করুন',
    back: 'ফিরে যান',
    open: 'খুলুন',
    close: 'বন্ধ',
    submit: 'জমা দিন',
    optional: 'ঐচ্ছিক',
    required: 'আবশ্যক',
    noResults: 'কিছু পাওয়া যায়নি',
    loadingError: 'লোড করা যায়নি। আবার টানুন।',
  },

  tabs: {
    home: 'হোম',
    explore: 'এক্সপ্লোর',
    alerts: 'অ্যালার্ট',
    profile: 'প্রোফাইল',
  },

  topbar: {
    greeting: 'গুড সকাল,',
    langLabel: 'বাং',
  },

  landing: {
    tagline: 'আপনার ক্যাম্পাস, সব এক জায়গায়। রিপোর্ট, ইভেন্ট, ক্লাব এবং আরও অনেক কিছু।',
    getStarted: 'শুরু করুন',
    haveAccount: 'আমার অ্যাকাউন্ট আছে',
  },

  sectors: {
    reports: 'রিপোর্ট',
    lostfound: 'হারানো',
    clubs: 'ক্লাব',
    events: 'ইভেন্ট',
    jobs: 'চাকরি',
    announce: 'সংবাদ',
    study: 'পড়াশোনা',
    bus: 'বাস',
    medical: 'মেডিকেল',
    market: 'বাজার',
    ride: 'রাইড',
    blood: 'রক্ত',
    directory: 'ডিরেক্টরি',
    prayer: 'নামাজ',
    faculty: 'শিক্ষক',
  },

  home: {
    newAlerts: (n: number) => `${n} টি নতুন অ্যালার্ট`,
    alertsFrom: 'রিপোর্ট, ক্লাব ও আরও কিছু থেকে',
    quickActions: 'দ্রুত কাজ',
    myReports: 'আমার রিপোর্ট',
    newReport: 'নতুন রিপোর্ট',
    noReports: 'এখনও কোনো রিপোর্ট নেই।',
    recentAlerts: 'সাম্প্রতিক অ্যালার্ট',
    noAlerts: 'এখনও কোনো অ্যালার্ট নেই।',
  },

  status: {
    Open: 'খোলা',
    'In Progress': 'চলমান',
    Resolved: 'সমাধান হয়েছে',
    Rejected: 'প্রত্যাখ্যাত',
    Closed: 'বন্ধ',
  } as Record<string, string>,

  reports: {
    myReportsTitle: 'আমার রিপোর্ট',
    assignedTitle: 'আমার দায়িত্বে',
    searchPlaceholder: 'রিপোর্ট খুঁজুন...',
    newReport: 'নতুন রিপোর্ট',
    noReportsTitle: 'কোনো রিপোর্ট নেই',
    noReportsBody: 'কিছু মেলেনি। অন্য ফিল্টার চেষ্টা করুন।',
    deleteTitle: 'রিপোর্ট মুছবেন',
    deleteBody: 'রিপোর্টটি স্থায়ীভাবে মুছে যাবে। চালিয়ে যাবেন?',
    view: 'দেখুন',
    resultCount: (n: number) => `${n} টি রিপোর্ট`,
  },
};
