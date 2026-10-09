export interface DhakaAreaInfo {
  name: string;
  nameBn: string;
  zone: string;
  zoneBn: string;
}

export const DHAKA_AREAS: DhakaAreaInfo[] = [
  // Mirpur & Immediate Campus Vicinity (BUBT)
  { name: 'Mirpur-1', nameBn: 'মিরপুর-১', zone: 'Mirpur & Campus', zoneBn: 'মিরপুর ও ক্যাম্পাস' },
  { name: 'Mirpur-2 (BUBT)', nameBn: 'মিরপুর-২ (বিইউবিটি)', zone: 'Mirpur & Campus', zoneBn: 'মিরপুর ও ক্যাম্পাস' },
  { name: 'Mirpur-6', nameBn: 'মিরপুর-৬', zone: 'Mirpur & Campus', zoneBn: 'মিরপুর ও ক্যাম্পাস' },
  { name: 'Mirpur-10', nameBn: 'মিরপুর-১০', zone: 'Mirpur & Campus', zoneBn: 'মিরপুর ও ক্যাম্পাস' },
  { name: 'Mirpur-11', nameBn: 'মিরপুর-১১', zone: 'Mirpur & Campus', zoneBn: 'মিরপুর ও ক্যাম্পাস' },
  { name: 'Mirpur-12', nameBn: 'মিরপুর-১২', zone: 'Mirpur & Campus', zoneBn: 'মিরপুর ও ক্যাম্পাস' },
  { name: 'Mirpur-14', nameBn: 'মিরপুর-১৪', zone: 'Mirpur & Campus', zoneBn: 'মিরপুর ও ক্যাম্পাস' },
  { name: 'Pallabi', nameBn: 'পল্লবী', zone: 'Mirpur & Campus', zoneBn: 'মিরপুর ও ক্যাম্পাস' },
  { name: 'Rupnagar', nameBn: 'রূপনগর', zone: 'Mirpur & Campus', zoneBn: 'মিরপুর ও ক্যাম্পাস' },

  // Key Medical Hubs & Hospitals
  { name: 'DMCH / Shahbagh', nameBn: 'ঢাকা মেডিকেল / শাহবাগ', zone: 'Medical Hubs', zoneBn: 'প্রধান হাসপাতাল' },
  { name: 'BSMMU (PG Hospital)', nameBn: 'বিএসএমএমইউ (পিজি)', zone: 'Medical Hubs', zoneBn: 'প্রধান হাসপাতাল' },
  { name: 'National Heart Foundation', nameBn: 'জাতীয় হৃদরোগ ইনস্টিটিউট', zone: 'Medical Hubs', zoneBn: 'প্রধান হাসপাতাল' },
  { name: 'Kurmitola General Hospital', nameBn: 'কুর্মিটোলা জেনারেল', zone: 'Medical Hubs', zoneBn: 'প্রধান হাসপাতাল' },
  { name: 'Suhrawardy Hospital / Agargaon', nameBn: 'সোহরাওয়ার্দী / আগারগাঁও', zone: 'Medical Hubs', zoneBn: 'প্রধান হাসপাতাল' },
  { name: 'National Eye / NICVD (Sher-e-Bangla)', nameBn: 'জাতীয় চক্ষু / এনআইসিভিডি', zone: 'Medical Hubs', zoneBn: 'প্রধান হাসপাতাল' },

  // North Dhaka
  { name: 'Uttara (Sectors 1-18)', nameBn: 'উত্তরা (সেক্টর ১-১৮)', zone: 'North Dhaka', zoneBn: 'উত্তর ঢাকা' },
  { name: 'Banani', nameBn: 'বনানী', zone: 'North Dhaka', zoneBn: 'উত্তর ঢাকা' },
  { name: 'Gulshan-1', nameBn: 'গুলশান-১', zone: 'North Dhaka', zoneBn: 'উত্তর ঢাকা' },
  { name: 'Gulshan-2', nameBn: 'গুলশান-২', zone: 'North Dhaka', zoneBn: 'উত্তর ঢাকা' },
  { name: 'Baridhara', nameBn: 'বারিধারা', zone: 'North Dhaka', zoneBn: 'উত্তর ঢাকা' },
  { name: 'Bashundhara R/A', nameBn: 'বসুন্ধরা আ/এ', zone: 'North Dhaka', zoneBn: 'উত্তর ঢাকা' },
  { name: 'Mohakhali', nameBn: 'মহাখালী', zone: 'North Dhaka', zoneBn: 'উত্তর ঢাকা' },
  { name: 'Cantonment', nameBn: 'সেনানিবাস', zone: 'North Dhaka', zoneBn: 'উত্তর ঢাকা' },
  { name: 'Airport / Dakshinkhan', nameBn: 'বিমানবন্দর / দক্ষিণখান', zone: 'North Dhaka', zoneBn: 'উত্তর ঢাকা' },

  // Central & West Dhaka
  { name: 'Dhanmondi', nameBn: 'ধানমন্ডি', zone: 'Central & West Dhaka', zoneBn: 'মধ্য ও পশ্চিম ঢাকা' },
  { name: 'Kalabagan', nameBn: 'কলাবাগান', zone: 'Central & West Dhaka', zoneBn: 'মধ্য ও পশ্চিম ঢাকা' },
  { name: 'Sobhanbagh / Panthapath', nameBn: 'সোবহানবাগ / পান্থপথ', zone: 'Central & West Dhaka', zoneBn: 'মধ্য ও পশ্চিম ঢাকা' },
  { name: 'Mohammadpur', nameBn: 'মোহাম্মদপুর', zone: 'Central & West Dhaka', zoneBn: 'মধ্য ও পশ্চিম ঢাকা' },
  { name: 'Adabor', nameBn: 'আদাবর', zone: 'Central & West Dhaka', zoneBn: 'মধ্য ও পশ্চিম ঢাকা' },
  { name: 'Shyamoli', nameBn: 'শ্যামলী', zone: 'Central & West Dhaka', zoneBn: 'মধ্য ও পশ্চিম ঢাকা' },
  { name: 'Kalyanpur', nameBn: 'কল্যাণপুর', zone: 'Central & West Dhaka', zoneBn: 'মধ্য ও পশ্চিম ঢাকা' },
  { name: 'Farmgate', nameBn: 'ফার্মগেট', zone: 'Central & West Dhaka', zoneBn: 'মধ্য ও পশ্চিম ঢাকা' },
  { name: 'Tejgaon', nameBn: 'তেজগাঁও', zone: 'Central & West Dhaka', zoneBn: 'মধ্য ও পশ্চিম ঢাকা' },

  // East Dhaka
  { name: 'Badda', nameBn: 'বাড্ডা', zone: 'East Dhaka', zoneBn: 'পূর্ব ঢাকা' },
  { name: 'Rampura', nameBn: 'রামপুরা', zone: 'East Dhaka', zoneBn: 'পূর্ব ঢাকা' },
  { name: 'Aftabnagar', nameBn: 'আফতাবনগর', zone: 'East Dhaka', zoneBn: 'পূর্ব ঢাকা' },
  { name: 'Malibagh', nameBn: 'মালিবাগ', zone: 'East Dhaka', zoneBn: 'পূর্ব ঢাকা' },
  { name: 'Moghbazar', nameBn: 'মগবাজার', zone: 'East Dhaka', zoneBn: 'পূর্ব ঢাকা' },
  { name: 'Khilgaon', nameBn: 'খিলগাঁও', zone: 'East Dhaka', zoneBn: 'পূর্ব ঢাকা' },
  { name: 'Shantinagar', nameBn: 'শান্তিনগর', zone: 'East Dhaka', zoneBn: 'পূর্ব ঢাকা' },

  // South & Old Dhaka
  { name: 'Motijheel', nameBn: 'মতিঝিল', zone: 'South & Old Dhaka', zoneBn: 'দক্ষিণ ও পুরান ঢাকা' },
  { name: 'Paltan / Press Club', nameBn: 'পল্টন / প্রেস ক্লাব', zone: 'South & Old Dhaka', zoneBn: 'দক্ষিণ ও পুরান ঢাকা' },
  { name: 'Kakrail', nameBn: 'কাকরাইল', zone: 'South & Old Dhaka', zoneBn: 'দক্ষিণ ও পুরান ঢাকা' },
  { name: 'Wari', nameBn: 'ওয়ারী', zone: 'South & Old Dhaka', zoneBn: 'দক্ষিণ ও পুরান ঢাকা' },
  { name: 'Sadarghat (Old Dhaka)', nameBn: 'সদরঘাট (পুরান ঢাকা)', zone: 'South & Old Dhaka', zoneBn: 'দক্ষিণ ও পুরান ঢাকা' },
  { name: 'Lalbagh', nameBn: 'লালবাগ', zone: 'South & Old Dhaka', zoneBn: 'দক্ষিণ ও পুরান ঢাকা' },
  { name: 'Chawkbazar', nameBn: 'চকবাজার', zone: 'South & Old Dhaka', zoneBn: 'দক্ষিণ ও পুরান ঢাকা' },
  { name: 'Jatrabari', nameBn: 'যাত্রাবাড়ী', zone: 'South & Old Dhaka', zoneBn: 'দক্ষিণ ও পুরান ঢাকা' },
  { name: 'Sayedabad', nameBn: 'সায়েদাবাদ', zone: 'South & Old Dhaka', zoneBn: 'দক্ষিণ ও পুরান ঢাকা' },

  // Suburbs
  { name: 'Savar / Ashulia', nameBn: 'সাভার / আশুলিয়া', zone: 'Suburbs', zoneBn: 'উপশহর' },
  { name: 'Gabtoli', nameBn: 'গাবতলী', zone: 'Suburbs', zoneBn: 'উপশহর' },
];

export const QUICK_CAMPUS_AREAS = [
  'All',
  'Mirpur',
  'DMCH',
  'Kurmitola',
  'Dhanmondi',
  'Uttara',
];
