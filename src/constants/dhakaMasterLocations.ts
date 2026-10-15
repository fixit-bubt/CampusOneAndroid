// -------------------------------------------------------------
// DHAKA MASTER LOCATIONS CATALOG (Unified, Verified & Comprehensive)
// Pinned to ground-truth coordinates across Dhaka City & Suburbs
// Serves Blood Donation, Rides, Marketplace, Lost & Found, and Campus Commute
// -------------------------------------------------------------

export interface MasterLocation {
  id: string;
  name: string;
  nameBn: string;
  category: 'hospital' | 'transit' | 'university' | 'area' | 'landmark';
  zone: string;
  zoneBn: string;
  subLocation?: string;
  coords: {
    latitude: number;
    longitude: number;
  };
  address?: string;
  keywords: string[];
  emergencyPhone?: string;
}

export const DHAKA_ZONE_METAS = [
  {
    id: 'mirpur',
    name: 'Mirpur & Campus',
    nameBn: 'মিরপুর ও ক্যাম্পাস এলাকা',
    subtitle: 'Mirpur 1, 2, 6, 10, 11, 12, Rupnagar, Pallabi, DOHS',
  },
  {
    id: 'dhanmondi',
    name: 'Dhanmondi & West',
    nameBn: 'ধানমন্ডি ও পশ্চিম ঢাকা',
    subtitle: 'Panthapath, Green Rd, Shyamoli, Mohammadpur, Lalmatia',
  },
  {
    id: 'shahbagh',
    name: 'Shahbagh & Central',
    nameBn: 'শাহবাগ ও কেন্দ্রীয় ঢাকা',
    subtitle: 'Agargaon, Farmgate, Tejgaon, Dhaka University, New Market',
  },
  {
    id: 'mohakhali',
    name: 'Mohakhali & Gulshan',
    nameBn: 'মহাখালী ও গুলশান',
    subtitle: 'Banani, Gulshan 1 & 2, Baridhara, Bashundhara, Kuril',
  },
  {
    id: 'uttara',
    name: 'Uttara & North',
    nameBn: 'উত্তরা ও উত্তর ঢাকা',
    subtitle: 'Uttara Sectors 1-18, Airport, Ashkona, Diabari',
  },
  {
    id: 'old_dhaka',
    name: 'Old Dhaka & Sadarghat',
    nameBn: 'পুরান ঢাকা ও সদরঘাট',
    subtitle: 'Wari, Lalbagh, Armanitola, Chawkbazar, Sadarghat',
  },
  {
    id: 'motijheel',
    name: 'Motijheel & East',
    nameBn: 'মতিঝিল ও পূর্ব ঢাকা',
    subtitle: 'Khilgaon, Rampura, Banasree, Aftabnagar, Jatrabari',
  },
  {
    id: 'suburbs',
    name: 'Greater Dhaka & Suburbs',
    nameBn: 'বৃহত্তর ঢাকা ও শহরতলি',
    subtitle: 'Savar, Gazipur, Ashulia, Keraniganj, Narayanganj',
  },
] as const;

export const DHAKA_MASTER_LOCATIONS: MasterLocation[] = [
  {
    "id": "camp_bubt_main",
    "name": "BUBT Main Campus",
    "nameBn": "বিইউবিটি মেইন ক্যাম্পাস",
    "category": "university",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Road 9 & 5, Rupnagar",
    "coords": {
      "latitude": 23.8119,
      "longitude": 90.3572
    },
    "address": "Plot 77-78, Road 9, Rupnagar, Mirpur-2, Dhaka",
    "keywords": [
      "bubt",
      "bubt main",
      "permanent campus",
      "rupnagar",
      "university",
      "academic",
      "বিইউবিটি"
    ]
  },
  {
    "id": "camp_bubt_bldg4",
    "name": "BUBT Building 4 (BBA & Admission)",
    "nameBn": "বিইউবিটি বিল্ডিং ৪ (বিবিএ ও ভর্তি)",
    "category": "university",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Road 6, Rupnagar",
    "coords": {
      "latitude": 23.8098,
      "longitude": 90.3567
    },
    "address": "Road 6, Rupnagar, Mirpur-2, Dhaka",
    "keywords": [
      "bubt bldg 4",
      "building 4",
      "admission",
      "bba",
      "rupnagar",
      "বিইউবিটি বিল্ডিং ৪"
    ]
  },
  {
    "id": "camp_bubt_bldg2_3",
    "name": "BUBT Building 2 & 3",
    "nameBn": "বিইউবিটি বিল্ডিং ২ ও ৩",
    "category": "university",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Road 10, Rupnagar",
    "coords": {
      "latitude": 23.8122,
      "longitude": 90.3572
    },
    "address": "Road 10, Rupnagar, Mirpur-2, Dhaka",
    "keywords": [
      "bubt bldg 2",
      "bubt bldg 3",
      "academic",
      "rupnagar",
      "বিইউবিটি ২"
    ]
  },
  {
    "id": "camp_commerce_college",
    "name": "Dhaka Commerce College Gate",
    "nameBn": "ঢাকা কমার্স কলেজ গেট",
    "category": "university",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Commerce College Road, Mirpur-2",
    "coords": {
      "latitude": 23.808,
      "longitude": 90.355
    },
    "address": "Commerce College Road, Mirpur-2, Dhaka",
    "keywords": [
      "commerce college",
      "dcc",
      "mirpur 2",
      "কমার্স কলেজ"
    ]
  },
  {
    "id": "camp_super_hostel",
    "name": "Super Hostel-04 (Female Branch)",
    "nameBn": "সুপার হোস্টেল-০৪",
    "category": "landmark",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Road 8, Rupnagar",
    "coords": {
      "latitude": 23.8112,
      "longitude": 90.3562
    },
    "address": "Road 8, Rupnagar, Mirpur-2",
    "keywords": [
      "super hostel",
      "hostel",
      "female hostel",
      "rupnagar",
      "সুপার হোস্টেল"
    ]
  },
  {
    "id": "camp_follow_fashion",
    "name": "Follow Fashion (Rupnagar)",
    "nameBn": "ফলো ফ্যাশন",
    "category": "landmark",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Road 7, Rupnagar",
    "coords": {
      "latitude": 23.8106,
      "longitude": 90.356
    },
    "address": "Road 7, Rupnagar, Mirpur-2",
    "keywords": [
      "follow fashion",
      "fashion",
      "rupnagar",
      "ফলো ফ্যাশন"
    ]
  },
  {
    "id": "camp_sony_square",
    "name": "Sony Square (Star Cineplex)",
    "nameBn": "সনি স্কয়ার (স্টার সিনেপ্লেক্স)",
    "category": "landmark",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Mirpur-2 Roundabout Link",
    "coords": {
      "latitude": 23.8093,
      "longitude": 90.3578
    },
    "address": "Sony Square, Mirpur-2, Dhaka",
    "keywords": [
      "sony square",
      "sony cinema",
      "cineplex",
      "mirpur 2",
      "সনি স্কয়ার",
      "সনি সিনেমা"
    ]
  },
  {
    "id": "camp_mirpur_stadium",
    "name": "Sher-e-Bangla National Cricket Stadium",
    "nameBn": "মিরপুর জাতীয় ক্রিকেট স্টেডিয়াম",
    "category": "landmark",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Mirpur-2 Stadium Link",
    "coords": {
      "latitude": 23.8069,
      "longitude": 90.3636
    },
    "address": "Section 2, Mirpur, Dhaka",
    "keywords": [
      "mirpur stadium",
      "cricket stadium",
      "sher-e-bangla stadium",
      "মিরপুর স্টেডিয়াম"
    ]
  },
  {
    "id": "camp_national_zoo",
    "name": "Bangladesh National Zoo Gate",
    "nameBn": "জাতীয় চিড়িয়াখানা গেট",
    "category": "landmark",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Zoo Road, Mirpur-1",
    "coords": {
      "latitude": 23.8135,
      "longitude": 90.347
    },
    "address": "Zoo Road, Mirpur-1, Dhaka",
    "keywords": [
      "zoo",
      "national zoo",
      "mirpur 1",
      "চিড়িয়াখানা"
    ]
  },
  {
    "id": "camp_botanical_garden",
    "name": "National Botanical Garden Gate",
    "nameBn": "জাতীয় উদ্ভিদ উদ্যান গেট",
    "category": "landmark",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Zoo Road, Mirpur-1",
    "coords": {
      "latitude": 23.818,
      "longitude": 90.346
    },
    "address": "Zoo Road, Mirpur-1, Dhaka",
    "keywords": [
      "botanical garden",
      "mirpur 1",
      "উদ্ভিদ উদ্যান",
      "বোটানিক্যাল গার্ডেন"
    ]
  },
  {
    "id": "camp_rainkhola",
    "name": "Rainkhola Mor",
    "nameBn": "রাইনখোলা মোড়",
    "category": "area",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Zoo Road Link, Mirpur-1",
    "coords": {
      "latitude": 23.813,
      "longitude": 90.3525
    },
    "address": "Rainkhola, Zoo Road, Mirpur",
    "keywords": [
      "rainkhola",
      "zoo road",
      "mirpur 1",
      "রাইনখোলা"
    ]
  },
  {
    "id": "camp_shialbari",
    "name": "Shialbari Mor (Rupnagar Link)",
    "nameBn": "শিয়ালবাড়ি মোড়",
    "category": "area",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Rupnagar, Mirpur-2",
    "coords": {
      "latitude": 23.816,
      "longitude": 90.354
    },
    "address": "Shialbari, Rupnagar, Mirpur-2",
    "keywords": [
      "shialbari",
      "rupnagar",
      "শিয়ালবাড়ি"
    ]
  },
  {
    "id": "camp_rupnagar_tinshed",
    "name": "Rupnagar Tin Shed Colony",
    "nameBn": "রূপনগর টিন শেড",
    "category": "area",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Rupnagar, Mirpur-2",
    "coords": {
      "latitude": 23.814,
      "longitude": 90.353
    },
    "address": "Tin Shed, Rupnagar, Mirpur",
    "keywords": [
      "tin shed",
      "rupnagar",
      "টিন শেড"
    ]
  },
  {
    "id": "camp_rupnagar_thana",
    "name": "Rupnagar Police Station",
    "nameBn": "রূপনগর থানা",
    "category": "landmark",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Rupnagar R/A Gate",
    "coords": {
      "latitude": 23.8145,
      "longitude": 90.3515
    },
    "address": "Rupnagar, Mirpur-2, Dhaka",
    "keywords": [
      "rupnagar thana",
      "police station",
      "রূপনগর থানা"
    ]
  },
  {
    "id": "camp_kalshi_flyover",
    "name": "Kalshi Flyover Junction",
    "nameBn": "কালশী ফ্লাইওভার মোড়",
    "category": "transit",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Kalshi More · ECB Link",
    "coords": {
      "latitude": 23.821,
      "longitude": 90.377
    },
    "address": "Kalshi More, Mirpur, Dhaka",
    "keywords": [
      "kalshi",
      "flyover",
      "kalshi more",
      "কালশী",
      "ফ্লাইওভার"
    ]
  },
  {
    "id": "camp_ecb_chattar",
    "name": "ECB Chattar",
    "nameBn": "ইসিবি চত্বর",
    "category": "transit",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Flyover Exit · Matikata",
    "coords": {
      "latitude": 23.8242,
      "longitude": 90.3885
    },
    "address": "ECB Chattar, Cantonment Link, Dhaka",
    "keywords": [
      "ecb",
      "ecb chattar",
      "matikata",
      "flyover",
      "ইসিবি",
      "ইসিবি চত্বর"
    ]
  },
  {
    "id": "camp_mirpur_shopping",
    "name": "Mirpur Shopping Center (Mirpur 2)",
    "nameBn": "মিরপুর শপিং সেন্টার (মিরপুর ২)",
    "category": "landmark",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Stadium Link, Mirpur-2",
    "coords": {
      "latitude": 23.808,
      "longitude": 90.3605
    },
    "address": "Section 2, Mirpur, Dhaka",
    "keywords": [
      "mirpur shopping center",
      "mirpur 2",
      "মিরপুর শপিং সেন্টার"
    ]
  },
  {
    "id": "camp_mazar_road",
    "name": "Mazar Road Intersection (Mirpur 1)",
    "nameBn": "মাজার রোড মোড় (মিরপুর ১)",
    "category": "transit",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Mirpur-1 / Darussalam Link",
    "coords": {
      "latitude": 23.8015,
      "longitude": 90.352
    },
    "address": "Mazar Road, Mirpur-1, Dhaka",
    "keywords": [
      "mazar road",
      "mirpur 1",
      "শাহ আলী মাজার",
      "মাজার রোড"
    ]
  },
  {
    "id": "camp_ansar_camp",
    "name": "Ansar Camp (Mirpur 1)",
    "nameBn": "আনসার ক্যাম্প (মিরপুর ১)",
    "category": "area",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Mirpur-1 to Technical Link",
    "coords": {
      "latitude": 23.7965,
      "longitude": 90.3545
    },
    "address": "Ansar Camp, Mirpur-1, Dhaka",
    "keywords": [
      "ansar camp",
      "mirpur 1",
      "আনসার ক্যাম্প"
    ]
  },
  {
    "id": "camp_tolabagh",
    "name": "Tolabagh (Mirpur 1)",
    "nameBn": "টোলাবাগ (মিরপুর ১)",
    "category": "area",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Behind Sony Square",
    "coords": {
      "latitude": 23.793,
      "longitude": 90.357
    },
    "address": "Tolabagh, Mirpur-1, Dhaka",
    "keywords": [
      "tolabagh",
      "mirpur 1",
      "টোলাবাগ"
    ]
  },
  {
    "id": "camp_paikpara_colony",
    "name": "Paikpara Government Colony",
    "nameBn": "পাইকপাড়া সরকারি কলোনি",
    "category": "area",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Paikpara, Mirpur-1 Link",
    "coords": {
      "latitude": 23.785,
      "longitude": 90.36
    },
    "address": "Paikpara, Mirpur, Dhaka",
    "keywords": [
      "paikpara",
      "government colony",
      "পাইকপাড়া"
    ]
  },
  {
    "id": "camp_pirerbagh_mor",
    "name": "Pirerbagh Mor (60 Feet Link)",
    "nameBn": "পীরেরবাগ মোড়",
    "category": "area",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Pirerbagh Road, Mirpur",
    "coords": {
      "latitude": 23.78,
      "longitude": 90.366
    },
    "address": "Pirerbagh, Mirpur, Dhaka",
    "keywords": [
      "pirerbagh",
      "pirerbag",
      "60 feet",
      "পীরেরবাগ"
    ]
  },
  {
    "id": "camp_mirpur1_golchattar",
    "name": "Mirpur 1 Golchattar (Muktodhara)",
    "nameBn": "মিরপুর ১ গোলচত্বর (মুক্তধারা)",
    "category": "transit",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Mirpur-1 Main Intersection",
    "coords": {
      "latitude": 23.805,
      "longitude": 90.354
    },
    "address": "Section 1, Mirpur, Dhaka",
    "keywords": [
      "mirpur 1",
      "golchattar",
      "muktodhara",
      "মিরপুর ১"
    ]
  },
  {
    "id": "camp_darussalam_thana",
    "name": "Darussalam Police Station",
    "nameBn": "দারুসসালাম থানা",
    "category": "landmark",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Mirpur-1 Link",
    "coords": {
      "latitude": 23.7865,
      "longitude": 90.351
    },
    "address": "Darussalam, Mirpur-1",
    "keywords": [
      "darussalam",
      "thana",
      "police",
      "দারুসসালাম"
    ]
  },
  {
    "id": "camp_shah_ali_plaza",
    "name": "Shah Ali Plaza (Mirpur 10)",
    "nameBn": "শাহ আলী প্লাজা (মিরপুর ১০)",
    "category": "landmark",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Section 10 Roundabout Link",
    "coords": {
      "latitude": 23.8065,
      "longitude": 90.368
    },
    "address": "Mirpur 10, Dhaka",
    "keywords": [
      "shah ali plaza",
      "mirpur 10",
      "শাহ আলী প্লাজা"
    ]
  },
  {
    "id": "camp_dohs_gate1",
    "name": "Mirpur DOHS Main Gate 1",
    "nameBn": "মিরপুর ডিওএইচএস মেইন গেট ১",
    "category": "transit",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Avenue 1 Link, Mirpur DOHS",
    "coords": {
      "latitude": 23.834,
      "longitude": 90.37
    },
    "address": "Mirpur DOHS, Dhaka",
    "keywords": [
      "mirpur dohs",
      "dohs gate 1",
      "মিরপুর ডিওএইচএস"
    ]
  },
  {
    "id": "camp_dohs_cultural",
    "name": "Mirpur DOHS Cultural Center & Mosque",
    "nameBn": "মিরপুর ডিওএইচএস কালচারাল সেন্টার",
    "category": "landmark",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Road 9, Mirpur DOHS",
    "coords": {
      "latitude": 23.837,
      "longitude": 90.367
    },
    "address": "Mirpur DOHS, Dhaka",
    "keywords": [
      "dohs cultural center",
      "mosque",
      "কালচারাল সেন্টার"
    ]
  },
  {
    "id": "camp_mirpur14_bus",
    "name": "Mirpur 14 Bus Stand & Cantonment Link",
    "nameBn": "মিরপুর ১৪ বাস স্ট্যান্ড",
    "category": "transit",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Mirpur 14 to Cantonment Link",
    "coords": {
      "latitude": 23.8035,
      "longitude": 90.384
    },
    "address": "Section 14, Mirpur, Dhaka",
    "keywords": [
      "mirpur 14",
      "bus stand",
      "cantonment link",
      "মিরপুর ১৪"
    ]
  },
  {
    "id": "mrt_uttara_north",
    "name": "Uttara North Metro Station (Diabari)",
    "nameBn": "উত্তরা উত্তর মেট্রো স্টেশন (দিয়াবাড়ি)",
    "category": "transit",
    "zone": "Uttara & North",
    "zoneBn": "উত্তরা ও উত্তর ঢাকা",
    "subLocation": "Diabari, Sector 17",
    "coords": {
      "latitude": 23.8755,
      "longitude": 90.3802
    },
    "keywords": [
      "uttara north",
      "diabari",
      "metro",
      "mrt-6",
      "উত্তরা উত্তর",
      "দিয়াবাড়ি",
      "মেট্রো"
    ]
  },
  {
    "id": "mrt_uttara_center",
    "name": "Uttara Center Metro Station",
    "nameBn": "উত্তরা সেন্টার মেট্রো স্টেশন",
    "category": "transit",
    "zone": "Uttara & North",
    "zoneBn": "উত্তরা ও উত্তর ঢাকা",
    "subLocation": "Sector 16/17 Link",
    "coords": {
      "latitude": 23.8682,
      "longitude": 90.378
    },
    "keywords": [
      "uttara center",
      "metro",
      "mrt-6",
      "sector 16",
      "উত্তরা সেন্টার",
      "মেট্রো"
    ]
  },
  {
    "id": "mrt_uttara_south",
    "name": "Uttara South Metro Station",
    "nameBn": "উত্তরা দক্ষিণ মেট্রো স্টেশন",
    "category": "transit",
    "zone": "Uttara & North",
    "zoneBn": "উত্তরা ও উত্তর ঢাকা",
    "subLocation": "Sector 18 / Panchabati Link",
    "coords": {
      "latitude": 23.856,
      "longitude": 90.3745
    },
    "keywords": [
      "uttara south",
      "metro",
      "mrt-6",
      "উত্তরা দক্ষিণ",
      "মেট্রো"
    ]
  },
  {
    "id": "mrt_pallabi",
    "name": "Pallabi Metro Station",
    "nameBn": "পল্লবী মেট্রো স্টেশন",
    "category": "transit",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Pallabi, Section 12",
    "coords": {
      "latitude": 23.8245,
      "longitude": 90.364
    },
    "keywords": [
      "pallabi",
      "metro",
      "mrt-6",
      "mirpur 12",
      "পল্লবী",
      "পল্লবী মেট্রো"
    ]
  },
  {
    "id": "mrt_mirpur_11",
    "name": "Mirpur 11 Metro Station",
    "nameBn": "মিরপুর ১১ মেট্রো স্টেশন",
    "category": "transit",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Purobi / Section 11",
    "coords": {
      "latitude": 23.8175,
      "longitude": 90.3662
    },
    "keywords": [
      "mirpur 11",
      "purobi",
      "metro",
      "mrt-6",
      "মিরপুর ১১",
      "মিরপুর-১১",
      "পুরবী"
    ]
  },
  {
    "id": "mrt_mirpur_10",
    "name": "Mirpur 10 Metro Station",
    "nameBn": "মিরপুর ১০ মেট্রো স্টেশন",
    "category": "transit",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Main Roundabout",
    "coords": {
      "latitude": 23.8071,
      "longitude": 90.3686
    },
    "keywords": [
      "mirpur 10",
      "golchattar",
      "roundabout",
      "metro",
      "mrt-6",
      "মিরপুর ১০",
      "মিরপুর-১০",
      "গোলচত্বর"
    ]
  },
  {
    "id": "mrt_kazipara",
    "name": "Kazipara Metro Station",
    "nameBn": "কাজীপাড়া মেট্রো স্টেশন",
    "category": "transit",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Rokeya Sarani, Kazipara",
    "coords": {
      "latitude": 23.7915,
      "longitude": 90.3725
    },
    "keywords": [
      "kazipara",
      "metro",
      "mrt-6",
      "rokeya sarani",
      "কাজীপাড়া",
      "মেট্রো"
    ]
  },
  {
    "id": "mrt_shewrapara",
    "name": "Shewrapara Metro Station",
    "nameBn": "শেওড়াপাড়া মেট্রো স্টেশন",
    "category": "transit",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Rokeya Sarani, Shewrapara",
    "coords": {
      "latitude": 23.786,
      "longitude": 90.374
    },
    "keywords": [
      "shewrapara",
      "metro",
      "mrt-6",
      "rokeya sarani",
      "শেওড়াপাড়া",
      "শেওড়াপাড়া",
      "মেট্রো"
    ]
  },
  {
    "id": "mrt_agargaon",
    "name": "Agargaon Metro Station",
    "nameBn": "আগারগাঁও মেট্রো স্টেশন",
    "category": "transit",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Passport Office Link",
    "coords": {
      "latitude": 23.7785,
      "longitude": 90.3795
    },
    "keywords": [
      "agargaon",
      "passport office",
      "metro",
      "mrt-6",
      "আগারগাঁও",
      "মেট্রো"
    ]
  },
  {
    "id": "mrt_bijoy_sarani",
    "name": "Bijoy Sarani Metro Station",
    "nameBn": "বিজয় সরণি মেট্রো স্টেশন",
    "category": "transit",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Military Museum Link",
    "coords": {
      "latitude": 23.7665,
      "longitude": 90.3872
    },
    "keywords": [
      "bijoy sarani",
      "military museum",
      "metro",
      "mrt-6",
      "বিজয় সরণি",
      "মেট্রো"
    ]
  },
  {
    "id": "mrt_farmgate",
    "name": "Farmgate Metro Station",
    "nameBn": "ফার্মগেট মেট্রো স্টেশন",
    "category": "transit",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Ananda Cinema / Khamarbari",
    "coords": {
      "latitude": 23.757,
      "longitude": 90.3888
    },
    "keywords": [
      "farmgate",
      "ananda cinema",
      "khamarbari",
      "metro",
      "mrt-6",
      "ফার্মগেট",
      "মেট্রো"
    ]
  },
  {
    "id": "mrt_karwan_bazar",
    "name": "Karwan Bazar Metro Station",
    "nameBn": "কাওরান বাজার মেট্রো স্টেশন",
    "category": "transit",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "CA Bhaban / WASA Link",
    "coords": {
      "latitude": 23.7515,
      "longitude": 90.3925
    },
    "keywords": [
      "karwan bazar",
      "kawran bazar",
      "metro",
      "mrt-6",
      "কাওরান বাজার",
      "কারওয়ান বাজার",
      "মেট্রো"
    ]
  },
  {
    "id": "mrt_shahbagh",
    "name": "Shahbagh Metro Station",
    "nameBn": "শাহবাগ মেট্রো স্টেশন",
    "category": "transit",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "BSMMU / National Museum",
    "coords": {
      "latitude": 23.7385,
      "longitude": 90.3955
    },
    "keywords": [
      "shahbagh",
      "bsmmu",
      "pg hospital",
      "metro",
      "mrt-6",
      "শাহবাগ",
      "মেট্রো"
    ]
  },
  {
    "id": "mrt_dhaka_university",
    "name": "Dhaka University Metro Station (TSC)",
    "nameBn": "ঢাকা বিশ্ববিদ্যালয় মেট্রো স্টেশন (টিএসসি)",
    "category": "transit",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "TSC, Dhaka University",
    "coords": {
      "latitude": 23.7328,
      "longitude": 90.396
    },
    "keywords": [
      "dhaka university",
      "du",
      "tsc",
      "curzon hall",
      "metro",
      "mrt-6",
      "ঢাবি",
      "টিএসসি",
      "মেট্রো"
    ]
  },
  {
    "id": "mrt_secretariat",
    "name": "Bangladesh Secretariat Metro Station",
    "nameBn": "বাংলাদেশ সচিবালয় মেট্রো স্টেশন",
    "category": "transit",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Press Club / Secretariat",
    "coords": {
      "latitude": 23.7292,
      "longitude": 90.4048
    },
    "keywords": [
      "secretariat",
      "press club",
      "high court",
      "curzon",
      "metro",
      "সচিবালয়",
      "প্রেস ক্লাব",
      "মেট্রো"
    ]
  },
  {
    "id": "mrt_motijheel",
    "name": "Motijheel Metro Station",
    "nameBn": "মতিঝিল মেট্রো স্টেশন",
    "category": "transit",
    "zone": "Motijheel & East",
    "zoneBn": "মতিঝিল ও পূর্ব ঢাকা",
    "subLocation": "Bangladesh Bank / Shapla Chattar",
    "coords": {
      "latitude": 23.7315,
      "longitude": 90.4172
    },
    "keywords": [
      "motijheel",
      "shapla chattar",
      "bangladesh bank",
      "metro",
      "mrt-6",
      "মতিঝিল",
      "শাপলা চত্বর",
      "মেট্রো"
    ]
  },
  {
    "id": "univ_du_tsc",
    "name": "Dhaka University (TSC & Central Campus)",
    "nameBn": "ঢাকা বিশ্ববিদ্যালয় (টিএসসি)",
    "category": "university",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Nilkhet / Shahbagh Link",
    "coords": {
      "latitude": 23.7328,
      "longitude": 90.396
    },
    "address": "Dhaka University Campus, Dhaka",
    "keywords": [
      "du",
      "dhaka university",
      "tsc",
      "arts building",
      "ঢাবি",
      "ঢাকা বিশ্ববিদ্যালয়",
      "টিএসসি"
    ]
  },
  {
    "id": "univ_du_curzon",
    "name": "Curzon Hall (Dhaka University Science)",
    "nameBn": "কার্জন হল (ঢাবি বিজ্ঞান অনুষদ)",
    "category": "university",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "High Court Link",
    "coords": {
      "latitude": 23.7275,
      "longitude": 90.4018
    },
    "address": "High Court Road, Dhaka",
    "keywords": [
      "curzon hall",
      "du",
      "science faculty",
      "কার্জন হল"
    ]
  },
  {
    "id": "univ_du_kala_bhaban",
    "name": "Dhaka University Arts Building (Kala Bhaban)",
    "nameBn": "কলা ভবন (ঢাকা বিশ্ববিদ্যালয়)",
    "category": "university",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Mall Chattar / Arts Faculty",
    "coords": {
      "latitude": 23.7335,
      "longitude": 90.3925
    },
    "address": "Dhaka University Campus, Dhaka",
    "keywords": [
      "kala bhaban",
      "arts faculty",
      "du",
      "কলা ভবন"
    ]
  },
  {
    "id": "univ_du_fbs",
    "name": "Dhaka University Business Faculty (FBS)",
    "nameBn": "ব্যবসায় শিক্ষা অনুষদ (ঢাবি)",
    "category": "university",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "DU Central Mosque Link",
    "coords": {
      "latitude": 23.732,
      "longitude": 90.393
    },
    "address": "Dhaka University Campus, Dhaka",
    "keywords": [
      "fbs",
      "business faculty",
      "du",
      "ব্যবসায় শিক্ষা অনুষদ"
    ]
  },
  {
    "id": "univ_du_iba",
    "name": "Institute of Business Administration (IBA DU)",
    "nameBn": "আইবিএ (ঢাকা বিশ্ববিদ্যালয়)",
    "category": "university",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Shahbagh / TSC Link",
    "coords": {
      "latitude": 23.7345,
      "longitude": 90.3955
    },
    "address": "Dhaka University Campus, Dhaka",
    "keywords": [
      "iba",
      "iba du",
      "business administration",
      "আইবিএ"
    ]
  },
  {
    "id": "univ_du_rokeya_hall",
    "name": "Dhaka University Rokeya Hall Gate",
    "nameBn": "রোকেয়া হল গেট (ঢাবি)",
    "category": "university",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Fuller Road / Shamsun Nahar Link",
    "coords": {
      "latitude": 23.7315,
      "longitude": 90.395
    },
    "address": "Dhaka University, Dhaka",
    "keywords": [
      "rokeya hall",
      "female hall",
      "du",
      "রোকেয়া হল"
    ]
  },
  {
    "id": "univ_buet_main",
    "name": "BUET Main Campus & EEE Building",
    "nameBn": "বুয়েট মেইন ক্যাম্পাস",
    "category": "university",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Palashi Link",
    "coords": {
      "latitude": 23.7262,
      "longitude": 90.3925
    },
    "address": "Palashi, Dhaka",
    "keywords": [
      "buet",
      "engineering university",
      "palashi",
      "বুয়েট"
    ]
  },
  {
    "id": "univ_buet_auditorium",
    "name": "BUET Central Auditorium & Cafe",
    "nameBn": "বুয়েট অডিটোরিয়াম ও ক্যাফেটেরিয়া",
    "category": "university",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "BUET Central Campus",
    "coords": {
      "latitude": 23.726,
      "longitude": 90.3915
    },
    "address": "BUET, Palashi, Dhaka",
    "keywords": [
      "buet auditorium",
      "buet cafe",
      "বুয়েট অডিটোরিয়াম"
    ]
  },
  {
    "id": "univ_nsu_bashundhara",
    "name": "North South University (NSU)",
    "nameBn": "নর্থ সাউথ বিশ্ববিদ্যালয়",
    "category": "university",
    "zone": "Mohakhali & Gulshan",
    "zoneBn": "মহাখালী ও গুলশান",
    "subLocation": "Plot 15, Block B, Bashundhara R/A",
    "coords": {
      "latitude": 23.8151,
      "longitude": 90.4255
    },
    "address": "Plot 15, Block B, Bashundhara R/A, Dhaka",
    "keywords": [
      "nsu",
      "north south",
      "bashundhara",
      "নর্থ সাউথ"
    ]
  },
  {
    "id": "univ_iub_bashundhara",
    "name": "Independent University, Bangladesh (IUB)",
    "nameBn": "ইন্ডিপেন্ডেন্ট বিশ্ববিদ্যালয় (আইইউবি)",
    "category": "university",
    "zone": "Mohakhali & Gulshan",
    "zoneBn": "মহাখালী ও গুলশান",
    "subLocation": "Plot 16, Block B, Bashundhara R/A",
    "coords": {
      "latitude": 23.816,
      "longitude": 90.427
    },
    "address": "Plot 16, Block B, Bashundhara R/A, Dhaka",
    "keywords": [
      "iub",
      "independent university",
      "bashundhara",
      "আইইউবি"
    ]
  },
  {
    "id": "univ_aiub_kuratoli",
    "name": "AIUB Permanent Campus",
    "nameBn": "এআইইউবি স্থায়ী ক্যাম্পাস",
    "category": "university",
    "zone": "Uttara & North",
    "zoneBn": "উত্তরা ও উত্তর ঢাকা",
    "subLocation": "408/1 Kuratoli, Khilkhet",
    "coords": {
      "latitude": 23.8223,
      "longitude": 90.4274
    },
    "address": "408/1 Kuratoli Road, Khilkhet, Dhaka",
    "keywords": [
      "aiub",
      "kuratoli",
      "khilkhet",
      "american international",
      "এআইইউবি"
    ]
  },
  {
    "id": "univ_brac_merul",
    "name": "BRAC University (New Permanent Campus)",
    "nameBn": "ব্র্যাক বিশ্ববিদ্যালয় (মেরুল বাড্ডা)",
    "category": "university",
    "zone": "Motijheel & East",
    "zoneBn": "মতিঝিল ও পূর্ব ঢাকা",
    "subLocation": "Kha 224, Pragati Sarani, Merul Badda",
    "coords": {
      "latitude": 23.7745,
      "longitude": 90.426
    },
    "address": "Pragati Sarani, Merul Badda, Dhaka",
    "keywords": [
      "brac",
      "brac university",
      "merul badda",
      "pragati sarani",
      "ব্র্যাক"
    ]
  },
  {
    "id": "univ_uiu_madani",
    "name": "United International University (UIU)",
    "nameBn": "ইউনাইটেড ইন্টারন্যাশনাল ইউনিভার্সিটি (ইউআইইউ)",
    "category": "university",
    "zone": "Motijheel & East",
    "zoneBn": "মতিঝিল ও পূর্ব ঢাকা",
    "subLocation": "United City, Madani Avenue, Badda",
    "coords": {
      "latitude": 23.7978,
      "longitude": 90.4495
    },
    "address": "United City, Madani Avenue, Dhaka",
    "keywords": [
      "uiu",
      "united university",
      "madani avenue",
      "united city",
      "ইউআইইউ"
    ]
  },
  {
    "id": "univ_ewu_aftabnagar",
    "name": "East West University (EWU)",
    "nameBn": "ইস্ট ওয়েস্ট বিশ্ববিদ্যালয়",
    "category": "university",
    "zone": "Motijheel & East",
    "zoneBn": "মতিঝিল ও পূর্ব ঢাকা",
    "subLocation": "Aftabnagar Main Road, Rampura",
    "coords": {
      "latitude": 23.768,
      "longitude": 90.427
    },
    "address": "Aftabnagar, Rampura, Dhaka",
    "keywords": [
      "ewu",
      "east west",
      "aftabnagar",
      "rampura",
      "ইস্ট ওয়েস্ট"
    ]
  },
  {
    "id": "univ_diu_smart_city",
    "name": "Daffodil International University (Smart City)",
    "nameBn": "ড্যাফোডিল বিশ্ববিদ্যালয় (স্মার্ট সিটি)",
    "category": "university",
    "zone": "Greater Dhaka & Suburbs",
    "zoneBn": "বৃহত্তর ঢাকা ও শহরতলি",
    "subLocation": "Daffodil Smart City, Ashulia",
    "coords": {
      "latitude": 23.8768,
      "longitude": 90.3202
    },
    "address": "Daffodil Smart City, Birulia, Ashulia, Dhaka",
    "keywords": [
      "diu",
      "daffodil",
      "smart city",
      "ashulia",
      "birulia",
      "ড্যাফোডিল"
    ]
  },
  {
    "id": "univ_diu_dhanmondi",
    "name": "Daffodil International University (Dhanmondi)",
    "nameBn": "ড্যাফোডিল বিশ্ববিদ্যালয় (ধানমন্ডি)",
    "category": "university",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Sobhanbagh, Dhanmondi 27",
    "coords": {
      "latitude": 23.7535,
      "longitude": 90.3768
    },
    "address": "Sobhanbagh, Dhanmondi, Dhaka",
    "keywords": [
      "diu dhanmondi",
      "sobhanbagh",
      "daffodil"
    ]
  },
  {
    "id": "univ_aust_tejgaon",
    "name": "AUST (Ahsanullah University of Science & Tech)",
    "nameBn": "আহসানউল্লাহ প্রযুক্তি বিশ্ববিদ্যালয়",
    "category": "university",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "141-142 Love Road, Tejgaon I/A",
    "coords": {
      "latitude": 23.7635,
      "longitude": 90.4065
    },
    "address": "Love Road, Tejgaon Industrial Area, Dhaka",
    "keywords": [
      "aust",
      "ahsanullah",
      "love road",
      "tejgaon",
      "আহসানউল্লাহ"
    ]
  },
  {
    "id": "univ_ulab_beribadh",
    "name": "ULAB Permanent Campus",
    "nameBn": "ইউল্যাব স্থায়ী ক্যাম্পাস",
    "category": "university",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Beribadh Road, Mohammadpur",
    "coords": {
      "latitude": 23.754,
      "longitude": 90.349
    },
    "address": "Beribadh Road, Mohammadpur, Dhaka",
    "keywords": [
      "ulab",
      "liberal arts",
      "beribadh",
      "mohammadpur",
      "ইউল্যাব"
    ]
  },
  {
    "id": "univ_green_shewrapara",
    "name": "Green University of Bangladesh",
    "nameBn": "গ্রিন ইউনিভার্সিটি",
    "category": "university",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Begum Rokeya Sarani, Shewrapara",
    "coords": {
      "latitude": 23.7885,
      "longitude": 90.373
    },
    "address": "220 Begum Rokeya Sarani, Shewrapara, Dhaka",
    "keywords": [
      "green university",
      "shewrapara",
      "rokeya sarani",
      "গ্রিন ইউনিভার্সিটি"
    ]
  },
  {
    "id": "univ_jnu_sadarghat",
    "name": "Jagannath University (JnU)",
    "nameBn": "জগন্নাথ বিশ্ববিদ্যালয়",
    "category": "university",
    "zone": "Old Dhaka & Sadarghat",
    "zoneBn": "পুরান ঢাকা ও সদরঘাট",
    "subLocation": "Chittaranjan Avenue, Sadarghat",
    "coords": {
      "latitude": 23.7105,
      "longitude": 90.4115
    },
    "address": "Sadarghat, Old Dhaka",
    "keywords": [
      "jnu",
      "jagannath university",
      "sadarghat",
      "জগন্নাথ বিশ্ববিদ্যালয়"
    ]
  },
  {
    "id": "univ_ju_savar",
    "name": "Jahangirnagar University (JU Dairy Gate)",
    "nameBn": "জাহাঙ্গীরনগর বিশ্ববিদ্যালয় (ডেইরি গেট)",
    "category": "university",
    "zone": "Greater Dhaka & Suburbs",
    "zoneBn": "বৃহত্তর ঢাকা ও শহরতলি",
    "subLocation": "Dairy Farm Gate, Savar",
    "coords": {
      "latitude": 23.881,
      "longitude": 90.2675
    },
    "address": "Savar, Dhaka",
    "keywords": [
      "ju",
      "jahangirnagar",
      "dairy gate",
      "savar",
      "জাবি",
      "জাহাঙ্গীরনগর"
    ]
  },
  {
    "id": "univ_dhaka_college",
    "name": "Dhaka College Gate",
    "nameBn": "ঢাকা কলেজ গেট",
    "category": "university",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Mirpur Road, Science Lab",
    "coords": {
      "latitude": 23.7375,
      "longitude": 90.3835
    },
    "address": "Mirpur Road, Dhanmondi, Dhaka",
    "keywords": [
      "dhaka college",
      "science lab",
      "mirpur road",
      "ঢাকা কলেজ"
    ]
  },
  {
    "id": "univ_eden_college",
    "name": "Eden Mohila College Gate",
    "nameBn": "ইডেন মহিলা কলেজ গেট",
    "category": "university",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Azimpur Road, Azimpur",
    "coords": {
      "latitude": 23.7295,
      "longitude": 90.385
    },
    "address": "Azimpur, Dhaka",
    "keywords": [
      "eden college",
      "azimpur",
      "ইডেন কলেজ"
    ]
  },
  {
    "id": "univ_titumir_college",
    "name": "Government Titumir College",
    "nameBn": "সরকারি তিতুমীর কলেজ",
    "category": "university",
    "zone": "Mohakhali & Gulshan",
    "zoneBn": "মহাখালী ও গুলশান",
    "subLocation": "A K Khandakar Road, Mohakhali",
    "coords": {
      "latitude": 23.776,
      "longitude": 90.4075
    },
    "address": "Mohakhali, Dhaka",
    "keywords": [
      "titumir college",
      "mohakhali",
      "তিতুমীর কলেজ"
    ]
  },
  {
    "id": "univ_bangla_college",
    "name": "Government Bangla College",
    "nameBn": "সরকারি বাঙলা কলেজ",
    "category": "university",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Darussalam Road, Mirpur-1",
    "coords": {
      "latitude": 23.789,
      "longitude": 90.354
    },
    "address": "Darussalam, Mirpur-1, Dhaka",
    "keywords": [
      "bangla college",
      "darussalam",
      "mirpur 1",
      "বাঙলা কলেজ"
    ]
  },
  {
    "id": "univ_sau_agargaon",
    "name": "Sher-e-Bangla Agricultural University (SAU)",
    "nameBn": "শেরেবাংলা কৃষি বিশ্ববিদ্যালয়",
    "category": "university",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Sher-e-Bangla Nagar, Agargaon",
    "coords": {
      "latitude": 23.7705,
      "longitude": 90.375
    },
    "address": "Sher-e-Bangla Nagar, Dhaka",
    "keywords": [
      "sau",
      "agricultural university",
      "agargaon",
      "শেকৃবি",
      "কৃষি বিশ্ববিদ্যালয়"
    ]
  },
  {
    "id": "univ_iut_gazipur",
    "name": "Islamic University of Technology (IUT)",
    "nameBn": "আইইউটি (ইসলামিক প্রযুক্তি বিশ্ববিদ্যালয়)",
    "category": "university",
    "zone": "Greater Dhaka & Suburbs",
    "zoneBn": "বৃহত্তর ঢাকা ও শহরতলি",
    "subLocation": "Board Bazar, Gazipur",
    "coords": {
      "latitude": 23.945,
      "longitude": 90.385
    },
    "address": "Board Bazar, Gazipur, Dhaka Corridor",
    "keywords": [
      "iut",
      "islamic university of technology",
      "board bazar",
      "gazipur",
      "আইইউটি"
    ]
  },
  {
    "id": "univ_notredame_college",
    "name": "Notre Dame College Gate (Arambagh)",
    "nameBn": "নটর ডেম কলেজ গেট",
    "category": "university",
    "zone": "Motijheel & East",
    "zoneBn": "মতিঝিল ও পূর্ব ঢাকা",
    "subLocation": "Arambagh, Motijheel Link",
    "coords": {
      "latitude": 23.7315,
      "longitude": 90.422
    },
    "address": "Toyenbee Circular Road, Arambagh",
    "keywords": [
      "notre dame college",
      "ndc",
      "arambagh",
      "নটর ডেম"
    ]
  },
  {
    "id": "univ_kendriya_college",
    "name": "Mohammadpur Kendriya College",
    "nameBn": "মোহাম্মদপুর কেন্দ্রীয় কলেজ",
    "category": "university",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Noorjahan Road, Mohammadpur",
    "coords": {
      "latitude": 23.7605,
      "longitude": 90.3635
    },
    "address": "Noorjahan Road, Mohammadpur",
    "keywords": [
      "kendriya college",
      "mohammadpur",
      "কেন্দ্রীয় কলেজ"
    ]
  },
  {
    "id": "tr_gabtoli_terminal",
    "name": "Gabtoli Inter-District Bus Terminal",
    "nameBn": "গাবতলী বাস টার্মিনাল",
    "category": "transit",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Gabtoli Mazar Road Link",
    "coords": {
      "latitude": 23.782,
      "longitude": 90.344
    },
    "address": "Gabtoli, Dhaka",
    "keywords": [
      "gabtoli",
      "bus terminal",
      "mazar road",
      "গাবতলী"
    ]
  },
  {
    "id": "tr_mohakhali_terminal",
    "name": "Mohakhali Inter-District Bus Terminal",
    "nameBn": "মহাখালী বাস টার্মিনাল",
    "category": "transit",
    "zone": "Mohakhali & Gulshan",
    "zoneBn": "মহাখালী ও গুলশান",
    "subLocation": "Amtoli / Wireless Gate",
    "coords": {
      "latitude": 23.777,
      "longitude": 90.401
    },
    "address": "Mohakhali, Dhaka",
    "keywords": [
      "mohakhali terminal",
      "bus terminal",
      "amtoli",
      "মহাখালী বাস টার্মিনাল"
    ]
  },
  {
    "id": "tr_sayedabad_terminal",
    "name": "Sayedabad Inter-District Bus Terminal",
    "nameBn": "সায়েদাবাদ বাস টার্মিনাল",
    "category": "transit",
    "zone": "Motijheel & East",
    "zoneBn": "মতিঝিল ও পূর্ব ঢাকা",
    "subLocation": "Jatrabari / Dhalpur Link",
    "coords": {
      "latitude": 23.715,
      "longitude": 90.43
    },
    "address": "Sayedabad, Dhaka",
    "keywords": [
      "sayedabad",
      "bus terminal",
      "jatrabari",
      "সায়েদাবাদ"
    ]
  },
  {
    "id": "tr_kamalapur_railway",
    "name": "Kamalapur Railway Station",
    "nameBn": "কমলাপুর রেলওয়ে স্টেশন",
    "category": "transit",
    "zone": "Motijheel & East",
    "zoneBn": "মতিঝিল ও পূর্ব ঢাকা",
    "subLocation": "Motijheel / Arambagh Link",
    "coords": {
      "latitude": 23.7335,
      "longitude": 90.4255
    },
    "address": "Kamalapur, Dhaka",
    "keywords": [
      "kamalapur",
      "railway station",
      "train",
      "কমলাপুর রেলওয়ে স্টেশন"
    ]
  },
  {
    "id": "tr_airport_railway",
    "name": "Dhaka Airport Railway Station",
    "nameBn": "ঢাকা বিমানবন্দর রেলওয়ে স্টেশন",
    "category": "transit",
    "zone": "Uttara & North",
    "zoneBn": "উত্তরা ও উত্তর ঢাকা",
    "subLocation": "Airport Road, Kawla",
    "coords": {
      "latitude": 23.851,
      "longitude": 90.408
    },
    "address": "Airport Road, Dhaka",
    "keywords": [
      "airport railway",
      "train station",
      "kawla",
      "বিমানবন্দর রেলওয়ে স্টেশন"
    ]
  },
  {
    "id": "tr_airport_terminal",
    "name": "Hazrat Shahjalal International Airport (T1/T2)",
    "nameBn": "হযরত শাহজালাল আন্তর্জাতিক বিমানবন্দর",
    "category": "transit",
    "zone": "Uttara & North",
    "zoneBn": "উত্তরা ও উত্তর ঢাকা",
    "subLocation": "Kurmitola / Kawla",
    "coords": {
      "latitude": 23.843,
      "longitude": 90.405
    },
    "address": "Airport Road, Kurmitola, Dhaka",
    "keywords": [
      "airport",
      "shahjalal airport",
      "t1",
      "t2",
      "terminal 1",
      "বিমানবন্দর"
    ]
  },
  {
    "id": "tr_airport_t3",
    "name": "Shahjalal Airport Terminal 3 (New)",
    "nameBn": "শাহজালাল বিমানবন্দর টার্মিনাল ৩",
    "category": "transit",
    "zone": "Uttara & North",
    "zoneBn": "উত্তরা ও উত্তর ঢাকা",
    "subLocation": "Kawla / Airport Link",
    "coords": {
      "latitude": 23.8375,
      "longitude": 90.412
    },
    "address": "Airport Expressway, Dhaka",
    "keywords": [
      "terminal 3",
      "t3",
      "new terminal",
      "airport",
      "টার্মিনাল ৩"
    ]
  },
  {
    "id": "tr_sadarghat_launch",
    "name": "Sadarghat Launch Terminal",
    "nameBn": "সদরঘাট লঞ্চ টার্মিনাল",
    "category": "transit",
    "zone": "Old Dhaka & Sadarghat",
    "zoneBn": "পুরান ঢাকা ও সদরঘাট",
    "subLocation": "Buriganga Riverfront, Sadarghat",
    "coords": {
      "latitude": 23.705,
      "longitude": 90.412
    },
    "address": "Sadarghat, Old Dhaka",
    "keywords": [
      "sadarghat",
      "launch terminal",
      "buriganga",
      "boat",
      "সদরঘাট লঞ্চ টার্মিনাল"
    ]
  },
  {
    "id": "tr_kalyanpur_bus",
    "name": "Kalyanpur Bus Stand & Counters",
    "nameBn": "কল্যাণপুর বাস কাউন্টার",
    "category": "transit",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Mirpur Road Footbridge",
    "coords": {
      "latitude": 23.778,
      "longitude": 90.3585
    },
    "address": "Mirpur Road, Kalyanpur, Dhaka",
    "keywords": [
      "kalyanpur",
      "bus counter",
      "shyamoli",
      "কল্যাণপুর"
    ]
  },
  {
    "id": "tr_shyamoli_bus",
    "name": "Shyamoli Bus Stand & Footbridge",
    "nameBn": "শ্যামলী বাস কাউন্টার",
    "category": "transit",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Mirpur Road / Ring Road",
    "coords": {
      "latitude": 23.7715,
      "longitude": 90.362
    },
    "address": "Mirpur Road, Shyamoli, Dhaka",
    "keywords": [
      "shyamoli",
      "bus stand",
      "shyamoli square",
      "শ্যামলী"
    ]
  },
  {
    "id": "tr_technical_mor",
    "name": "Technical Intersection (Technical Mor)",
    "nameBn": "টেকনিক্যাল মোড়",
    "category": "transit",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Mirpur Road / Gabtoli Link",
    "coords": {
      "latitude": 23.7845,
      "longitude": 90.3525
    },
    "address": "Technical, Mirpur, Dhaka",
    "keywords": [
      "technical",
      "technical mor",
      "gabtoli link",
      "টেকনিক্যাল"
    ]
  },
  {
    "id": "tr_mirpur_12_depot",
    "name": "Mirpur 12 Bus Depot & Terminal",
    "nameBn": "মিরপুর ১২ বাস টার্মিনাল",
    "category": "transit",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Metro Terminal / Ceramic Link",
    "coords": {
      "latitude": 23.8277,
      "longitude": 90.3644
    },
    "address": "Section 12, Mirpur, Dhaka",
    "keywords": [
      "mirpur 12",
      "bus depot",
      "terminal",
      "মিরপুর ১২"
    ]
  },
  {
    "id": "tr_savar_bus_stand",
    "name": "Savar Bus Stand",
    "nameBn": "সাভার বাস স্ট্যান্ড",
    "category": "transit",
    "zone": "Greater Dhaka & Suburbs",
    "zoneBn": "বৃহত্তর ঢাকা ও শহরতলি",
    "subLocation": "Dhaka-Aricha Highway",
    "coords": {
      "latitude": 23.845,
      "longitude": 90.258
    },
    "address": "Savar, Dhaka",
    "keywords": [
      "savar",
      "bus stand",
      "enam link",
      "সাভার"
    ]
  },
  {
    "id": "tr_tongi_station_road",
    "name": "Tongi Station Road",
    "nameBn": "টঙ্গী স্টেশন রোড",
    "category": "transit",
    "zone": "Greater Dhaka & Suburbs",
    "zoneBn": "বৃহত্তর ঢাকা ও শহরতলি",
    "subLocation": "Dhaka-Mymensingh Highway",
    "coords": {
      "latitude": 23.905,
      "longitude": 90.41
    },
    "address": "Tongi, Gazipur Link",
    "keywords": [
      "tongi",
      "station road",
      "টঙ্গী"
    ]
  },
  {
    "id": "tr_abdullahpur_bus",
    "name": "Abdullahpur Bus Stand (Uttara Entrance)",
    "nameBn": "আব্দুল্লাহপুর বাস স্ট্যান্ড",
    "category": "transit",
    "zone": "Uttara & North",
    "zoneBn": "উত্তরা ও উত্তর ঢাকা",
    "subLocation": "Tongi Bridge Link, Sector 9",
    "coords": {
      "latitude": 23.8825,
      "longitude": 90.4005
    },
    "address": "Abdullahpur, Uttara, Dhaka",
    "keywords": [
      "abdullahpur",
      "tongi bridge",
      "uttara entrance",
      "আব্দুল্লাহপুর"
    ]
  },
  {
    "id": "tr_house_building_mor",
    "name": "House Building Mor (Uttara)",
    "nameBn": "হাউজ বিল্ডিং মোড় (উত্তরা)",
    "category": "transit",
    "zone": "Uttara & North",
    "zoneBn": "উত্তরা ও উত্তর ঢাকা",
    "subLocation": "Dhaka-Mymensingh Highway, Sector 7/9",
    "coords": {
      "latitude": 23.8765,
      "longitude": 90.399
    },
    "address": "House Building, Uttara, Dhaka",
    "keywords": [
      "house building",
      "uttara",
      "azampur link",
      "হাউজ বিল্ডিং"
    ]
  },
  {
    "id": "tr_arambagh_counters",
    "name": "Arambagh Bus Counter Hub",
    "nameBn": "আরামবাগ বাস কাউন্টার",
    "category": "transit",
    "zone": "Motijheel & East",
    "zoneBn": "মতিঝিল ও পূর্ব ঢাকা",
    "subLocation": "Motijheel / Notre Dame Link",
    "coords": {
      "latitude": 23.731,
      "longitude": 90.423
    },
    "address": "Arambagh, Dhaka",
    "keywords": [
      "arambagh",
      "bus counter",
      "notre dame",
      "আরামবাগ"
    ]
  },
  {
    "id": "tr_jatrabari_bus_stop",
    "name": "Jatrabari Bus Stop",
    "nameBn": "যাত্রাবাড়ী বাস স্টপ",
    "category": "transit",
    "zone": "Motijheel & East",
    "zoneBn": "মতিঝিল ও পূর্ব ঢাকা",
    "subLocation": "Chittagong Road Link",
    "coords": {
      "latitude": 23.7085,
      "longitude": 90.4345
    },
    "address": "Jatrabari, Dhaka",
    "keywords": [
      "jatrabari bus stop",
      "jatrabari",
      "bus stop",
      "যাত্রাবাড়ী বাস স্টপ"
    ]
  },
  {
    "id": "tr_jatrabari_flyover",
    "name": "Jatrabari Flyover",
    "nameBn": "যাত্রাবাড়ী ফ্লাইওভার",
    "category": "transit",
    "zone": "Motijheel & East",
    "zoneBn": "মতিঝিল ও পূর্ব ঢাকা",
    "subLocation": "Mayor Hanif Flyover Entrance",
    "coords": {
      "latitude": 23.708,
      "longitude": 90.435
    },
    "address": "Jatrabari, Dhaka",
    "keywords": [
      "jatrabari flyover",
      "hanif flyover",
      "যাত্রাবাড়ী ফ্লাইওভার"
    ]
  },
  {
    "id": "tr_kuril_flyover",
    "name": "Kuril Flyover Junction",
    "nameBn": "কুড়িল ফ্লাইওভার মোড়",
    "category": "transit",
    "zone": "Mohakhali & Gulshan",
    "zoneBn": "মহাখালী ও গুলশান",
    "subLocation": "Airport Rd to 300ft Link",
    "coords": {
      "latitude": 23.816,
      "longitude": 90.42
    },
    "address": "Kuril, Pragati Sarani, Dhaka",
    "keywords": [
      "kuril flyover",
      "kuril",
      "300ft link",
      "কুড়িল ফ্লাইওভার"
    ]
  },
  {
    "id": "tr_mohakhali_amtoli",
    "name": "Amtoli Junction (Mohakhali)",
    "nameBn": "আমতলী মোড় (মহাখালী)",
    "category": "transit",
    "zone": "Mohakhali & Gulshan",
    "zoneBn": "মহাখালী ও গুলশান",
    "subLocation": "Flyover Underpass, Mohakhali",
    "coords": {
      "latitude": 23.779,
      "longitude": 90.403
    },
    "address": "Amtoli, Mohakhali, Dhaka",
    "keywords": [
      "amtoli",
      "mohakhali flyover",
      "আমতলী"
    ]
  },
  {
    "id": "tr_science_lab_mor",
    "name": "Science Laboratory Intersection",
    "nameBn": "সায়েন্স ল্যাব মোড়",
    "category": "transit",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Mirpur Rd & Elephant Rd Link",
    "coords": {
      "latitude": 23.738,
      "longitude": 90.384
    },
    "address": "Science Lab, Mirpur Road, Dhaka",
    "keywords": [
      "science lab",
      "mirpur road",
      "elephant road",
      "সায়েন্স ল্যাব"
    ]
  },
  {
    "id": "tr_mouchak_mor",
    "name": "Mouchak Intersection (Flyover Center)",
    "nameBn": "মৌচাক মোড় (ফ্লাইওভার)",
    "category": "transit",
    "zone": "Motijheel & East",
    "zoneBn": "মতিঝিল ও পূর্ব ঢাকা",
    "subLocation": "Malibagh / Mouchak Link",
    "coords": {
      "latitude": 23.748,
      "longitude": 90.412
    },
    "address": "Mouchak, Malibagh, Dhaka",
    "keywords": [
      "mouchak",
      "malibagh mor",
      "flyover",
      "মৌচাক"
    ]
  },
  {
    "id": "lm_jamuna_future_park",
    "name": "Jamuna Future Park Gate",
    "nameBn": "যমুনা ফিউচার পার্ক",
    "category": "landmark",
    "zone": "Mohakhali & Gulshan",
    "zoneBn": "মহাখালী ও গুলশান",
    "subLocation": "Ka-244, Pragati Sarani, Kuril",
    "coords": {
      "latitude": 23.8135,
      "longitude": 90.424
    },
    "address": "Pragati Sarani, Kuril, Dhaka",
    "keywords": [
      "jamuna future park",
      "jfp",
      "mall",
      "cineplex",
      "kuril",
      "যমুনা ফিউচার পার্ক"
    ]
  },
  {
    "id": "lm_bashundhara_city",
    "name": "Bashundhara City Complex",
    "nameBn": "বসুন্ধরা সিটি শপিং মল",
    "category": "landmark",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Panthapath · Karwan Bazar Link",
    "coords": {
      "latitude": 23.7512,
      "longitude": 90.3905
    },
    "address": "Panthapath, Dhaka",
    "keywords": [
      "bashundhara city",
      "mall",
      "cineplex",
      "panthapath",
      "বসুন্ধরা সিটি"
    ]
  },
  {
    "id": "lm_shimanto_square",
    "name": "Shimanto Square (Peelkhana Gate)",
    "nameBn": "সীমান্ত স্কয়ার",
    "category": "landmark",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Peelkhana Gate, Dhanmondi",
    "coords": {
      "latitude": 23.738,
      "longitude": 90.3755
    },
    "address": "Road 2, Dhanmondi, Dhaka",
    "keywords": [
      "shimanto square",
      "rifle square",
      "dhanmondi",
      "সীমান্ত স্কয়ার"
    ]
  },
  {
    "id": "lm_rapa_plaza",
    "name": "Rapa Plaza (Dhanmondi 27)",
    "nameBn": "রাপ্পা প্লাজা (ধানমন্ডি ২৭)",
    "category": "landmark",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Mirpur Road, Dhanmondi 27",
    "coords": {
      "latitude": 23.7529,
      "longitude": 90.3752
    },
    "address": "Road 27, Dhanmondi, Dhaka",
    "keywords": [
      "rapa plaza",
      "dhanmondi 27",
      "genetic plaza",
      "রাপ্পা প্লাজা"
    ]
  },
  {
    "id": "lm_police_plaza",
    "name": "Police Plaza Concord",
    "nameBn": "পুলিশ প্লাজা কনকর্ড",
    "category": "landmark",
    "zone": "Mohakhali & Gulshan",
    "zoneBn": "মহাখালী ও গুলশান",
    "subLocation": "Hatirjheel · Gulshan 1 Link",
    "coords": {
      "latitude": 23.7765,
      "longitude": 90.4165
    },
    "address": "Gulshan 1, Dhaka",
    "keywords": [
      "police plaza",
      "gulshan 1",
      "hatirjheel",
      "পুলিশ প্লাজা"
    ]
  },
  {
    "id": "lm_tokyo_square",
    "name": "Tokyo Square (Japan Garden City)",
    "nameBn": "টোকিও স্কয়ার",
    "category": "landmark",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Ring Road, Mohammadpur",
    "coords": {
      "latitude": 23.768,
      "longitude": 90.3575
    },
    "address": "Ring Road, Mohammadpur, Dhaka",
    "keywords": [
      "tokyo square",
      "japan garden city",
      "ring road",
      "টোকিও স্কয়ার"
    ]
  },
  {
    "id": "lm_bns_center",
    "name": "BNS Center (Uttara Sector 7)",
    "nameBn": "বিএনএস সেন্টার (উত্তরা)",
    "category": "landmark",
    "zone": "Uttara & North",
    "zoneBn": "উত্তরা ও উত্তর ঢাকা",
    "subLocation": "Dhaka-Mymensingh Road, Sector 7",
    "coords": {
      "latitude": 23.8685,
      "longitude": 90.3985
    },
    "address": "Sector 7, Uttara, Dhaka",
    "keywords": [
      "bns center",
      "uttara sector 7",
      "mascot plaza",
      "বিএনএস সেন্টার"
    ]
  },
  {
    "id": "lm_new_market",
    "name": "Dhaka New Market Main Gate",
    "nameBn": "নিউ মার্কেট মেইন গেট",
    "category": "landmark",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Mirpur Road, Nilkhet",
    "coords": {
      "latitude": 23.7335,
      "longitude": 90.3845
    },
    "address": "New Market, Dhaka",
    "keywords": [
      "new market",
      "gausia",
      "chandni chowk",
      "nilkhet",
      "নিউ মার্কেট"
    ]
  },
  {
    "id": "lm_idb_bhaban",
    "name": "BCS Computer City (IDB Bhaban)",
    "nameBn": "আইডিবি ভবন (বিসিএস কম্পিউটার সিটি)",
    "category": "landmark",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Rokeya Sarani, Agargaon",
    "coords": {
      "latitude": 23.7745,
      "longitude": 90.382
    },
    "address": "Agargaon, Dhaka",
    "keywords": [
      "idb bhaban",
      "bcs computer city",
      "agargaon",
      "আইডিবি ভবন"
    ]
  },
  {
    "id": "lm_hatirjheel_rampura",
    "name": "Hatirjheel (Rampura Bridge Entry)",
    "nameBn": "হাতিরঝিল (রামপুরা ব্রিজ গেট)",
    "category": "landmark",
    "zone": "Motijheel & East",
    "zoneBn": "মতিঝিল ও পূর্ব ঢাকা",
    "subLocation": "Water Taxi Terminal, Rampura",
    "coords": {
      "latitude": 23.762,
      "longitude": 90.418
    },
    "address": "Hatirjheel, Rampura, Dhaka",
    "keywords": [
      "hatirjheel",
      "rampura bridge",
      "water taxi",
      "হাতিরঝিল"
    ]
  },
  {
    "id": "lm_hatirjheel_fdc",
    "name": "Hatirjheel (FDC Mor Entry)",
    "nameBn": "হাতিরঝিল (এফডিসি মোড় গেট)",
    "category": "landmark",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Tejgaon / Karwan Bazar Link",
    "coords": {
      "latitude": 23.755,
      "longitude": 90.397
    },
    "address": "FDC Mor, Tejgaon, Dhaka",
    "keywords": [
      "hatirjheel fdc",
      "fdc mor",
      "water taxi"
    ]
  },
  {
    "id": "lm_lalbagh_fort",
    "name": "Lalbagh Fort Gate",
    "nameBn": "লালবাগ কেল্লা গেট",
    "category": "landmark",
    "zone": "Old Dhaka & Sadarghat",
    "zoneBn": "পুরান ঢাকা ও সদরঘাট",
    "subLocation": "Lalbagh Road, Old Dhaka",
    "coords": {
      "latitude": 23.719,
      "longitude": 90.388
    },
    "address": "Lalbagh, Old Dhaka",
    "keywords": [
      "lalbagh fort",
      "fort",
      "heritage",
      "old dhaka",
      "লালবাগ কেল্লা"
    ]
  },
  {
    "id": "lm_ahsan_manzil",
    "name": "Ahsan Manzil (Pink Palace)",
    "nameBn": "আহসান মঞ্জিল",
    "category": "landmark",
    "zone": "Old Dhaka & Sadarghat",
    "zoneBn": "পুরান ঢাকা ও সদরঘাট",
    "subLocation": "Kumartoli, Islampur",
    "coords": {
      "latitude": 23.7085,
      "longitude": 90.406
    },
    "address": "Islampur, Old Dhaka",
    "keywords": [
      "ahsan manzil",
      "pink palace",
      "museum",
      "old dhaka",
      "আহসান মঞ্জিল"
    ]
  },
  {
    "id": "lm_military_museum",
    "name": "Bangabandhu Military Museum",
    "nameBn": "সামরিক জাদুঘর (বিজয় সরণি)",
    "category": "landmark",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Bijoy Sarani Link",
    "coords": {
      "latitude": 23.765,
      "longitude": 90.386
    },
    "address": "Bijoy Sarani, Tejgaon, Dhaka",
    "keywords": [
      "military museum",
      "bijoy sarani",
      "planetarium",
      "নভোথিয়েটার",
      "সামরিক জাদুঘর"
    ]
  },
  {
    "id": "lm_liberation_war_museum",
    "name": "Liberation War Museum",
    "nameBn": "মুক্তিযুদ্ধ জাদুঘর",
    "category": "landmark",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Sher-e-Bangla Nagar, Agargaon",
    "coords": {
      "latitude": 23.774,
      "longitude": 90.3785
    },
    "address": "Agargaon, Dhaka",
    "keywords": [
      "liberation war museum",
      "muktojoddha",
      "agargaon",
      "মুক্তিযুদ্ধ জাদুঘর"
    ]
  },
  {
    "id": "lm_national_memorial",
    "name": "National Martyrs Memorial (Jatiya Smriti Soudho)",
    "nameBn": "জাতীয় স্মৃতিসৌধ (সাভার)",
    "category": "landmark",
    "zone": "Greater Dhaka & Suburbs",
    "zoneBn": "বৃহত্তর ঢাকা ও শহরতলি",
    "subLocation": "Nabinagar, Savar",
    "coords": {
      "latitude": 23.911,
      "longitude": 90.254
    },
    "address": "Nabinagar, Savar, Dhaka",
    "keywords": [
      "national memorial",
      "smriti soudho",
      "nabinagar",
      "savar",
      "স্মৃতিসৌধ"
    ]
  },
  {
    "id": "lm_purbachal_300ft",
    "name": "Purbachal 300 Feet Express Highway (Neelganj)",
    "nameBn": "পূর্বাচল ৩০০ ফিট এক্সপ্রেসওয়ে",
    "category": "landmark",
    "zone": "Uttara & North",
    "zoneBn": "উত্তরা ও উত্তর ঢাকা",
    "subLocation": "Kuril Link / Purbachal",
    "coords": {
      "latitude": 23.824,
      "longitude": 90.465
    },
    "address": "300 Feet Highway, Dhaka",
    "keywords": [
      "300 feet",
      "purbachal",
      "express highway",
      "neelganj",
      "৩০০ ফিট",
      "পূর্বাচল"
    ]
  },
  {
    "id": "lm_shahid_minar",
    "name": "Central Shahid Minar",
    "nameBn": "কেন্দ্রীয় শহীদ মিনার",
    "category": "landmark",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Dhaka Medical College Link",
    "coords": {
      "latitude": 23.7275,
      "longitude": 90.398
    },
    "address": "Secretariat Road, Dhaka",
    "keywords": [
      "shahid minar",
      "language movement",
      "dmch",
      "শহীদ মিনার"
    ]
  },
  {
    "id": "lm_national_parliament",
    "name": "National Parliament House (Jatiya Sangsad)",
    "nameBn": "জাতীয় সংসদ ভবন",
    "category": "landmark",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Manik Mia Avenue, Sher-e-Bangla Nagar",
    "coords": {
      "latitude": 23.7625,
      "longitude": 90.378
    },
    "address": "Manik Mia Ave, Dhaka",
    "keywords": [
      "parliament",
      "jatiya sangsad",
      "manik mia",
      "জাতীয় সংসদ"
    ]
  },
  {
    "id": "lm_chandrima_udyan",
    "name": "Chandrima Udyan (Zia Uddan)",
    "nameBn": "চন্দ্রিমা উদ্যান (ক্রিসেন্ট লেক)",
    "category": "landmark",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Crescent Lake, Agargaon Link",
    "coords": {
      "latitude": 23.766,
      "longitude": 90.3785
    },
    "address": "Sher-e-Bangla Nagar, Dhaka",
    "keywords": [
      "chandrima udyan",
      "zia uddan",
      "crescent lake",
      "চন্দ্রিমা উদ্যান"
    ]
  },
  {
    "id": "lm_bicc_agargaon",
    "name": "Bangabandhu Intl Conference Center (BICC)",
    "nameBn": "বঙ্গবন্ধু আন্তর্জাতিক সম্মেলন কেন্দ্র (বিআইসিসি)",
    "category": "landmark",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Agargaon Link",
    "coords": {
      "latitude": 23.7725,
      "longitude": 90.3795
    },
    "address": "Agargaon, Dhaka",
    "keywords": [
      "bicc",
      "conference center",
      "agargaon",
      "বিআইসিসি"
    ]
  },
  {
    "id": "lm_baitul_mukarram",
    "name": "Baitul Mukarram National Mosque",
    "nameBn": "বায়তুল মোকাররম জাতীয় মসজিদ",
    "category": "landmark",
    "zone": "Motijheel & East",
    "zoneBn": "মতিঝিল ও পূর্ব ঢাকা",
    "subLocation": "Paltan / Stadium Link",
    "coords": {
      "latitude": 23.7315,
      "longitude": 90.413
    },
    "address": "Topkhana Road, Paltan, Dhaka",
    "keywords": [
      "baitul mukarram",
      "national mosque",
      "paltan",
      "বায়তুল মোকাররম"
    ]
  },
  {
    "id": "lm_star_mosque",
    "name": "Tara Masjid (Star Mosque)",
    "nameBn": "তারা মসজিদ (আরমানিটোলা)",
    "category": "landmark",
    "zone": "Old Dhaka & Sadarghat",
    "zoneBn": "পুরান ঢাকা ও সদরঘাট",
    "subLocation": "Armanitola, Old Dhaka",
    "coords": {
      "latitude": 23.716,
      "longitude": 90.402
    },
    "address": "Armanitola, Dhaka",
    "keywords": [
      "star mosque",
      "tara masjid",
      "armanitola",
      "তারা মসজিদ"
    ]
  },
  {
    "id": "lm_iccb_bashundhara",
    "name": "International Convention City Bashundhara (ICCB)",
    "nameBn": "আইসিসিবি (বসুন্ধরা কনভেনশন সিটি)",
    "category": "landmark",
    "zone": "Mohakhali & Gulshan",
    "zoneBn": "মহাখালী ও গুলশান",
    "subLocation": "Kuril Link / Purbachal Express Link",
    "coords": {
      "latitude": 23.824,
      "longitude": 90.437
    },
    "address": "Bashundhara R/A, Dhaka",
    "keywords": [
      "iccb",
      "bashundhara convention",
      "expo",
      "আইসিসিবি"
    ]
  },
  {
    "id": "lm_bbcfec_purbachal",
    "name": "BBCFEC Exhibition Center (Bangabandhu Center)",
    "nameBn": "বাংলাদেশ-চীন প্রদর্শনী কেন্দ্র (পূর্বাচল)",
    "category": "landmark",
    "zone": "Greater Dhaka & Suburbs",
    "zoneBn": "বৃহত্তর ঢাকা ও শহরতলি",
    "subLocation": "Sector 4, Purbachal Express",
    "coords": {
      "latitude": 23.829,
      "longitude": 90.49
    },
    "address": "Purbachal, Dhaka",
    "keywords": [
      "bbcfec",
      "trade fair",
      "ditf",
      "purbachal",
      "বাণিজ্য মেলা"
    ]
  },
  {
    "id": "lm_chawkbazar_shahi",
    "name": "Chawkbazar Shahi Mosque & Chowk",
    "nameBn": "চকবাজার শাহী মসজিদ",
    "category": "landmark",
    "zone": "Old Dhaka & Sadarghat",
    "zoneBn": "পুরান ঢাকা ও সদরঘাট",
    "subLocation": "Chawkbazar Mor, Old Dhaka",
    "coords": {
      "latitude": 23.717,
      "longitude": 90.396
    },
    "address": "Chawkbazar, Old Dhaka",
    "keywords": [
      "chawkbazar",
      "shahi mosque",
      "iftar market",
      "চকবাজার"
    ]
  },
  {
    "id": "lm_bahadur_shah_park",
    "name": "Bahadur Shah Park (Victoria Park)",
    "nameBn": "বাহাদুর শাহ পার্ক (ভিক্টোরিয়া পার্ক)",
    "category": "landmark",
    "zone": "Old Dhaka & Sadarghat",
    "zoneBn": "পুরান ঢাকা ও সদরঘাট",
    "subLocation": "Sadarghat / Jagannath Univ Link",
    "coords": {
      "latitude": 23.71,
      "longitude": 90.411
    },
    "address": "Laxmibazar, Old Dhaka",
    "keywords": [
      "bahadur shah park",
      "victoria park",
      "sadarghat",
      "বাহাদুর শাহ পার্ক"
    ]
  },
  {
    "id": "lm_baldha_garden",
    "name": "Baldha Garden (Wari)",
    "nameBn": "বলধা গার্ডেন (ওয়ারী)",
    "category": "landmark",
    "zone": "Old Dhaka & Sadarghat",
    "zoneBn": "পুরান ঢাকা ও সদরঘাট",
    "subLocation": "Rankin Street, Wari",
    "coords": {
      "latitude": 23.717,
      "longitude": 90.419
    },
    "address": "Wari, Dhaka",
    "keywords": [
      "baldha garden",
      "wari",
      "botanical",
      "বলধা গার্ডেন"
    ]
  },
  {
    "id": "lm_ramna_park",
    "name": "Ramna Park Main Gate",
    "nameBn": "রমনা পার্ক মেইন গেট",
    "category": "landmark",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Kakrail / Matsya Bhaban Link",
    "coords": {
      "latitude": 23.733,
      "longitude": 90.403
    },
    "address": "Ramna, Dhaka",
    "keywords": [
      "ramna park",
      "pohela boishakh",
      "matsya bhaban",
      "রমনা পার্ক"
    ]
  },
  {
    "id": "lm_suhrawardy_udyan",
    "name": "Suhrawardy Udyan (Shikha Chirantan)",
    "nameBn": "সোহরাওয়ার্দী উদ্যান (শিখা চিরন্তন)",
    "category": "landmark",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Shahbagh / TSC Link",
    "coords": {
      "latitude": 23.734,
      "longitude": 90.398
    },
    "address": "Shahbagh, Dhaka",
    "keywords": [
      "suhrawardy udyan",
      "shikha chirantan",
      "7th march",
      "সোহরাওয়ার্দী উদ্যান"
    ]
  },
  {
    "id": "lm_national_museum",
    "name": "Bangladesh National Museum Gate",
    "nameBn": "জাতীয় জাদুঘর (শাহবাগ)",
    "category": "landmark",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Shahbagh Roundabout Link",
    "coords": {
      "latitude": 23.7375,
      "longitude": 90.3945
    },
    "address": "Shahbagh, Dhaka",
    "keywords": [
      "national museum",
      "shahbagh",
      "জাতীয় জাদুঘর"
    ]
  },
  {
    "id": "lm_multiplan_center",
    "name": "Multiplan Center (Elephant Road Computer Mall)",
    "nameBn": "মাল্টিপ্ল্যান সেন্টার (কম্পিউটার মল)",
    "category": "landmark",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Elephant Road / Bata Signal Link",
    "coords": {
      "latitude": 23.7405,
      "longitude": 90.387
    },
    "address": "Elephant Road, Dhaka",
    "keywords": [
      "multiplan center",
      "computer market",
      "elephant road",
      "মাল্টিপ্ল্যান সেন্টার"
    ]
  },
  {
    "id": "lm_eastern_plaza",
    "name": "Eastern Plaza (Hatirpool)",
    "nameBn": "ইস্টার্ন প্লাজা (হাতিরপুল)",
    "category": "landmark",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Hatirpool Circular Road Link",
    "coords": {
      "latitude": 23.743,
      "longitude": 90.391
    },
    "address": "Hatirpool, Dhaka",
    "keywords": [
      "eastern plaza",
      "hatirpool",
      "mobile market",
      "ইস্টার্ন প্লাজা"
    ]
  },
  {
    "id": "lm_bangabandhu_stadium",
    "name": "Bangabandhu National Stadium Gate",
    "nameBn": "বঙ্গবন্ধু জাতীয় স্টেডিয়াম",
    "category": "landmark",
    "zone": "Motijheel & East",
    "zoneBn": "মতিঝিল ও পূর্ব ঢাকা",
    "subLocation": "Paltan / GPO Link",
    "coords": {
      "latitude": 23.7295,
      "longitude": 90.413
    },
    "address": "Stadium Road, Motijheel, Dhaka",
    "keywords": [
      "bangabandhu stadium",
      "national stadium",
      "paltan",
      "বঙ্গবন্ধু স্টেডিয়াম"
    ]
  },
  {
    "id": "lm_gpo_zero_point",
    "name": "GPO Zero Point (Center of Dhaka)",
    "nameBn": "জিপিও জিরো পয়েন্ট",
    "category": "landmark",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "General Post Office / Secretariat Link",
    "coords": {
      "latitude": 23.728,
      "longitude": 90.411
    },
    "address": "Topkhana Road, Dhaka",
    "keywords": [
      "gpo",
      "zero point",
      "post office",
      "জিরো পয়েন্ট"
    ]
  },
  {
    "id": "lm_doel_chattar",
    "name": "Doel Chattar (National Monument)",
    "nameBn": "দোয়েল চত্বর",
    "category": "landmark",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Curzon Hall & High Court Link",
    "coords": {
      "latitude": 23.728,
      "longitude": 90.4045
    },
    "address": "Dhaka University Link, Dhaka",
    "keywords": [
      "doel chattar",
      "curzon link",
      "দোয়েল চত্বর"
    ]
  },
  {
    "id": "lm_radisson_blu",
    "name": "Radisson Blu Water Garden Gate",
    "nameBn": "রেডিসন ব্লু ওয়াটার গার্ডেন",
    "category": "landmark",
    "zone": "Uttara & North",
    "zoneBn": "উত্তরা ও উত্তর ঢাকা",
    "subLocation": "Airport Road, Cantonment",
    "coords": {
      "latitude": 23.821,
      "longitude": 90.406
    },
    "address": "Airport Road, Dhaka",
    "keywords": [
      "radisson blu",
      "hotel",
      "airport road",
      "রেডিসন ব্লু"
    ]
  },
  {
    "id": "lm_afmc_cantt",
    "name": "Armed Forces Medical College (AFMC)",
    "nameBn": "আর্মড ফোর্সেস মেডিকেল কলেজ",
    "category": "university",
    "zone": "Uttara & North",
    "zoneBn": "উত্তরা ও উত্তর ঢাকা",
    "subLocation": "Dhaka Cantonment Gate",
    "coords": {
      "latitude": 23.82,
      "longitude": 90.401
    },
    "address": "Dhaka Cantonment, Dhaka",
    "keywords": [
      "afmc",
      "armed forces",
      "medical college",
      "আর্মড ফোর্সেস"
    ]
  },
  {
    "id": "area_uttara_sec_1",
    "name": "Uttara Sector 1",
    "nameBn": "উত্তরা সেক্টর ১",
    "category": "area",
    "zone": "Uttara & North",
    "zoneBn": "উত্তরা ও উত্তর ঢাকা",
    "subLocation": "Sector 1, Uttara",
    "coords": {
      "latitude": 23.861,
      "longitude": 90.398
    },
    "keywords": [
      "uttara sector 1",
      "sector 1",
      "উত্তরা সেক্টর ১"
    ]
  },
  {
    "id": "area_uttara_sec_2",
    "name": "Uttara Sector 2",
    "nameBn": "উত্তরা সেক্টর ২",
    "category": "area",
    "zone": "Uttara & North",
    "zoneBn": "উত্তরা ও উত্তর ঢাকা",
    "subLocation": "Sector 2, Uttara",
    "coords": {
      "latitude": 23.864,
      "longitude": 90.3995
    },
    "keywords": [
      "uttara sector 2",
      "sector 2",
      "উত্তরা সেক্টর ২"
    ]
  },
  {
    "id": "area_uttara_sec_3",
    "name": "Uttara Sector 3 (Rajlakshmi)",
    "nameBn": "উত্তরা সেক্টর ৩ (রাজলক্ষ্মী)",
    "category": "area",
    "zone": "Uttara & North",
    "zoneBn": "উত্তরা ও উত্তর ঢাকা",
    "subLocation": "Rajlakshmi Complex, Rabindra Sarani",
    "coords": {
      "latitude": 23.8696,
      "longitude": 90.3986
    },
    "keywords": [
      "uttara sector 3",
      "rajlakshmi",
      "rabindra sarani",
      "উত্তরা সেক্টর ৩"
    ]
  },
  {
    "id": "area_uttara_sec_4",
    "name": "Uttara Sector 4",
    "nameBn": "উত্তরা সেক্টর ৪",
    "category": "area",
    "zone": "Uttara & North",
    "zoneBn": "উত্তরা ও উত্তর ঢাকা",
    "subLocation": "Sector 4, Uttara",
    "coords": {
      "latitude": 23.871,
      "longitude": 90.395
    },
    "keywords": [
      "uttara sector 4",
      "polwel carnation",
      "উত্তরা সেক্টর ৪"
    ]
  },
  {
    "id": "area_uttara_sec_5",
    "name": "Uttara Sector 5",
    "nameBn": "উত্তরা সেক্টর ৫",
    "category": "area",
    "zone": "Uttara & North",
    "zoneBn": "উত্তরা ও উত্তর ঢাকা",
    "subLocation": "Sector 5, Uttara",
    "coords": {
      "latitude": 23.873,
      "longitude": 90.39
    },
    "keywords": [
      "uttara sector 5",
      "উত্তরা সেক্টর ৫"
    ]
  },
  {
    "id": "area_uttara_sec_6",
    "name": "Uttara Sector 6 (Azampur)",
    "nameBn": "উত্তরা সেক্টর ৬ (আজমপুর)",
    "category": "area",
    "zone": "Uttara & North",
    "zoneBn": "উত্তরা ও উত্তর ঢাকা",
    "subLocation": "Azampur Link, Sector 6",
    "coords": {
      "latitude": 23.8745,
      "longitude": 90.401
    },
    "keywords": [
      "uttara sector 6",
      "azampur",
      "উত্তরা সেক্টর ৬"
    ]
  },
  {
    "id": "area_uttara_sec_7",
    "name": "Uttara Sector 7 (BNS Center)",
    "nameBn": "উত্তরা সেক্টর ৭ (বিএনএস সেন্টার)",
    "category": "area",
    "zone": "Uttara & North",
    "zoneBn": "উত্তরা ও উত্তর ঢাকা",
    "subLocation": "BNS Center / Mascot Plaza",
    "coords": {
      "latitude": 23.8685,
      "longitude": 90.3985
    },
    "keywords": [
      "uttara sector 7",
      "bns center",
      "mascot plaza",
      "উত্তরা সেক্টর ৭"
    ]
  },
  {
    "id": "area_uttara_sec_8",
    "name": "Uttara Sector 8",
    "nameBn": "উত্তরা সেক্টর ৮",
    "category": "area",
    "zone": "Uttara & North",
    "zoneBn": "উত্তরা ও উত্তর ঢাকা",
    "subLocation": "Sector 8, Uttara",
    "coords": {
      "latitude": 23.858,
      "longitude": 90.405
    },
    "keywords": [
      "uttara sector 8",
      "উত্তরা সেক্টর ৮"
    ]
  },
  {
    "id": "area_uttara_sec_9",
    "name": "Uttara Sector 9",
    "nameBn": "উত্তরা সেক্টর ৯",
    "category": "area",
    "zone": "Uttara & North",
    "zoneBn": "উত্তরা ও উত্তর ঢাকা",
    "subLocation": "Sector 9, Uttara",
    "coords": {
      "latitude": 23.878,
      "longitude": 90.393
    },
    "keywords": [
      "uttara sector 9",
      "উত্তরা সেক্টর ৯"
    ]
  },
  {
    "id": "area_uttara_sec_10",
    "name": "Uttara Sector 10",
    "nameBn": "উত্তরা সেক্টর ১০",
    "category": "area",
    "zone": "Uttara & North",
    "zoneBn": "উত্তরা ও উত্তর ঢাকা",
    "subLocation": "Sector 10, Uttara",
    "coords": {
      "latitude": 23.882,
      "longitude": 90.388
    },
    "keywords": [
      "uttara sector 10",
      "kamardhar",
      "উত্তরা সেক্টর ১০"
    ]
  },
  {
    "id": "area_uttara_sec_11",
    "name": "Uttara Sector 11 (Gareeb-e-Nawaz)",
    "nameBn": "উত্তরা সেক্টর ১১ (গরীব-ই-নেওয়াজ)",
    "category": "area",
    "zone": "Uttara & North",
    "zoneBn": "উত্তরা ও উত্তর ঢাকা",
    "subLocation": "Gareeb-e-Nawaz Ave",
    "coords": {
      "latitude": 23.876,
      "longitude": 90.386
    },
    "keywords": [
      "uttara sector 11",
      "gareeb-e-nawaz",
      "উত্তরা সেক্টর ১১"
    ]
  },
  {
    "id": "area_uttara_sec_12",
    "name": "Uttara Sector 12",
    "nameBn": "উত্তরা সেক্টর ১২",
    "category": "area",
    "zone": "Uttara & North",
    "zoneBn": "উত্তরা ও উত্তর ঢাকা",
    "subLocation": "Shah Makhdum Ave Link",
    "coords": {
      "latitude": 23.874,
      "longitude": 90.381
    },
    "keywords": [
      "uttara sector 12",
      "shah makhdum",
      "উত্তরা সেক্টর ১২"
    ]
  },
  {
    "id": "area_uttara_sec_13",
    "name": "Uttara Sector 13",
    "nameBn": "উত্তরা সেক্টর ১৩",
    "category": "area",
    "zone": "Uttara & North",
    "zoneBn": "উত্তরা ও উত্তর ঢাকা",
    "subLocation": "Sonargaon Janapath Link",
    "coords": {
      "latitude": 23.87,
      "longitude": 90.384
    },
    "keywords": [
      "uttara sector 13",
      "sonargaon janapath",
      "উত্তরা সেক্টর ১৩"
    ]
  },
  {
    "id": "area_uttara_sec_14",
    "name": "Uttara Sector 14",
    "nameBn": "উত্তরা সেক্টর ১৪",
    "category": "area",
    "zone": "Uttara & North",
    "zoneBn": "উত্তরা ও উত্তর ঢাকা",
    "subLocation": "Sonargaon Janapath Link",
    "coords": {
      "latitude": 23.866,
      "longitude": 90.381
    },
    "keywords": [
      "uttara sector 14",
      "উত্তরা সেক্টর ১৪"
    ]
  },
  {
    "id": "area_uttara_sec_15",
    "name": "Uttara Sector 15 (Diabari Link)",
    "nameBn": "উত্তরা সেক্টর ১৫ (দিয়াবাড়ি)",
    "category": "area",
    "zone": "Uttara & North",
    "zoneBn": "উত্তরা ও উত্তর ঢাকা",
    "subLocation": "Diabari Lake Link",
    "coords": {
      "latitude": 23.873,
      "longitude": 90.375
    },
    "keywords": [
      "uttara sector 15",
      "diabari",
      "উত্তরা সেক্টর ১৫"
    ]
  },
  {
    "id": "area_uttara_sec_16",
    "name": "Uttara Sector 16",
    "nameBn": "উত্তরা সেক্টর ১৬",
    "category": "area",
    "zone": "Uttara & North",
    "zoneBn": "উত্তরা ও উত্তর ঢাকা",
    "subLocation": "Metro Rail Link, Sector 16",
    "coords": {
      "latitude": 23.868,
      "longitude": 90.375
    },
    "keywords": [
      "uttara sector 16",
      "উত্তরা সেক্টর ১৬"
    ]
  },
  {
    "id": "area_uttara_sec_17",
    "name": "Uttara Sector 17",
    "nameBn": "উত্তরা সেক্টর ১৭",
    "category": "area",
    "zone": "Uttara & North",
    "zoneBn": "উত্তরা ও উত্তর ঢাকা",
    "subLocation": "Metro Terminal Link, Diabari",
    "coords": {
      "latitude": 23.874,
      "longitude": 90.37
    },
    "keywords": [
      "uttara sector 17",
      "diabari",
      "উত্তরা সেক্টর ১৭"
    ]
  },
  {
    "id": "area_uttara_sec_18",
    "name": "Uttara Sector 18 (Rajuk Apartments)",
    "nameBn": "উত্তরা সেক্টর ১৮ (রাজউক অ্যাপার্টমেন্ট)",
    "category": "area",
    "zone": "Uttara & North",
    "zoneBn": "উত্তরা ও উত্তর ঢাকা",
    "subLocation": "Panchabati / Rajuk Apartment",
    "coords": {
      "latitude": 23.865,
      "longitude": 90.368
    },
    "keywords": [
      "uttara sector 18",
      "rajuk apartment",
      "উত্তরা সেক্টর ১৮"
    ]
  },
  {
    "id": "area_bashundhara_blk_a",
    "name": "Bashundhara R/A Block A",
    "nameBn": "বসুন্ধরা আ/এ ব্লক এ",
    "category": "area",
    "zone": "Mohakhali & Gulshan",
    "zoneBn": "মহাখালী ও গুলশান",
    "subLocation": "Main Gate Link, Block A",
    "coords": {
      "latitude": 23.812,
      "longitude": 90.424
    },
    "keywords": [
      "bashundhara block a",
      "block a",
      "বসুন্ধরা ব্লক এ"
    ]
  },
  {
    "id": "area_bashundhara_blk_b",
    "name": "Bashundhara R/A Block B (NSU/IUB)",
    "nameBn": "বসুন্ধরা আ/এ ব্লক বি (এনএসইউ/আইইউবি)",
    "category": "area",
    "zone": "Mohakhali & Gulshan",
    "zoneBn": "মহাখালী ও গুলশান",
    "subLocation": "NSU & IUB Gate, Block B",
    "coords": {
      "latitude": 23.815,
      "longitude": 90.426
    },
    "keywords": [
      "bashundhara block b",
      "nsu gate",
      "iub gate",
      "block b",
      "বসুন্ধরা ব্লক বি"
    ]
  },
  {
    "id": "area_bashundhara_blk_c",
    "name": "Bashundhara R/A Block C",
    "nameBn": "বসুন্ধরা আ/এ ব্লক সি",
    "category": "area",
    "zone": "Mohakhali & Gulshan",
    "zoneBn": "মহাখালী ও গুলশান",
    "subLocation": "Block C, Bashundhara",
    "coords": {
      "latitude": 23.818,
      "longitude": 90.428
    },
    "keywords": [
      "bashundhara block c",
      "block c",
      "বসুন্ধরা ব্লক সি"
    ]
  },
  {
    "id": "area_bashundhara_blk_d",
    "name": "Bashundhara R/A Block D (Evercare)",
    "nameBn": "বসুন্ধরা আ/এ ব্লক ডি (এভারকেয়ার)",
    "category": "area",
    "zone": "Mohakhali & Gulshan",
    "zoneBn": "মহাখালী ও গুলশান",
    "subLocation": "Evercare Hospital Link, Block D",
    "coords": {
      "latitude": 23.8103,
      "longitude": 90.4312
    },
    "keywords": [
      "bashundhara block d",
      "evercare gate",
      "block d",
      "বসুন্ধরা ব্লক ডি"
    ]
  },
  {
    "id": "area_bashundhara_blk_e",
    "name": "Bashundhara R/A Block E",
    "nameBn": "বসুন্ধরা আ/এ ব্লক ই",
    "category": "area",
    "zone": "Mohakhali & Gulshan",
    "zoneBn": "মহাখালী ও গুলশান",
    "subLocation": "Block E, Bashundhara",
    "coords": {
      "latitude": 23.812,
      "longitude": 90.432
    },
    "keywords": [
      "bashundhara block e",
      "block e",
      "বসুন্ধরা ব্লক ই"
    ]
  },
  {
    "id": "area_bashundhara_blk_f",
    "name": "Bashundhara R/A Block F",
    "nameBn": "বসুন্ধরা আ/এ ব্লক এফ",
    "category": "area",
    "zone": "Mohakhali & Gulshan",
    "zoneBn": "মহাখালী ও গুলশান",
    "subLocation": "Block F, Bashundhara",
    "coords": {
      "latitude": 23.816,
      "longitude": 90.435
    },
    "keywords": [
      "bashundhara block f",
      "block f",
      "বসুন্ধরা ব্লক এফ"
    ]
  },
  {
    "id": "area_bashundhara_blk_g",
    "name": "Bashundhara R/A Block G",
    "nameBn": "বসুন্ধরা আ/এ ব্লক জি",
    "category": "area",
    "zone": "Mohakhali & Gulshan",
    "zoneBn": "মহাখালী ও গুলশান",
    "subLocation": "Block G, Bashundhara",
    "coords": {
      "latitude": 23.82,
      "longitude": 90.437
    },
    "keywords": [
      "bashundhara block g",
      "block g",
      "বসুন্ধরা ব্লক জি"
    ]
  },
  {
    "id": "area_bashundhara_blk_i",
    "name": "Bashundhara R/A Block I",
    "nameBn": "বসুন্ধরা আ/এ ব্লক আই",
    "category": "area",
    "zone": "Mohakhali & Gulshan",
    "zoneBn": "মহাখালী ও গুলশান",
    "subLocation": "Block I, Bashundhara",
    "coords": {
      "latitude": 23.818,
      "longitude": 90.442
    },
    "keywords": [
      "bashundhara block i",
      "block i",
      "বসুন্ধরা ব্লক আই"
    ]
  },
  {
    "id": "area_banasree_blk_a",
    "name": "Banasree Block A",
    "nameBn": "বনশ্রী ব্লক এ",
    "category": "area",
    "zone": "Motijheel & East",
    "zoneBn": "মতিঝিল ও পূর্ব ঢাকা",
    "subLocation": "Main Gate Link, Block A",
    "coords": {
      "latitude": 23.765,
      "longitude": 90.427
    },
    "keywords": [
      "banasree block a",
      "block a",
      "বনশ্রী ব্লক এ"
    ]
  },
  {
    "id": "area_banasree_blk_b",
    "name": "Banasree Block B",
    "nameBn": "বনশ্রী ব্লক বি",
    "category": "area",
    "zone": "Motijheel & East",
    "zoneBn": "মতিঝিল ও পূর্ব ঢাকা",
    "subLocation": "Block B, Banasree",
    "coords": {
      "latitude": 23.766,
      "longitude": 90.429
    },
    "keywords": [
      "banasree block b",
      "block b",
      "বনশ্রী ব্লক বি"
    ]
  },
  {
    "id": "area_banasree_blk_c",
    "name": "Banasree Block C",
    "nameBn": "বনশ্রী ব্লক সি",
    "category": "area",
    "zone": "Motijheel & East",
    "zoneBn": "মতিঝিল ও পূর্ব ঢাকা",
    "subLocation": "Farazy Hospital Link, Block C",
    "coords": {
      "latitude": 23.764,
      "longitude": 90.431
    },
    "keywords": [
      "banasree block c",
      "farazy hospital",
      "block c",
      "বনশ্রী ব্লক সি"
    ]
  },
  {
    "id": "area_banasree_blk_d",
    "name": "Banasree Block D",
    "nameBn": "বনশ্রী ব্লক ডি",
    "category": "area",
    "zone": "Motijheel & East",
    "zoneBn": "মতিঝিল ও পূর্ব ঢাকা",
    "subLocation": "Ideal School Link, Block D",
    "coords": {
      "latitude": 23.762,
      "longitude": 90.433
    },
    "keywords": [
      "banasree block d",
      "ideal school",
      "block d",
      "বনশ্রী ব্লক ডি"
    ]
  },
  {
    "id": "area_banasree_blk_e",
    "name": "Banasree Block E",
    "nameBn": "বনশ্রী ব্লক ই",
    "category": "area",
    "zone": "Motijheel & East",
    "zoneBn": "মতিঝিল ও পূর্ব ঢাকা",
    "subLocation": "Block E, Banasree",
    "coords": {
      "latitude": 23.76,
      "longitude": 90.435
    },
    "keywords": [
      "banasree block e",
      "block e",
      "বনশ্রী ব্লক ই"
    ]
  },
  {
    "id": "area_banasree_blk_f",
    "name": "Banasree Block F",
    "nameBn": "বনশ্রী ব্লক এফ",
    "category": "area",
    "zone": "Motijheel & East",
    "zoneBn": "মতিঝিল ও পূর্ব ঢাকা",
    "subLocation": "Block F, Banasree",
    "coords": {
      "latitude": 23.758,
      "longitude": 90.437
    },
    "keywords": [
      "banasree block f",
      "block f",
      "বনশ্রী ব্লক এফ"
    ]
  },
  {
    "id": "area_dhanmondi_27",
    "name": "Dhanmondi 27 (Rapa Plaza)",
    "nameBn": "ধানমন্ডি ২৭ (রাপ্পা প্লাজা)",
    "category": "area",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Road 27 / Mirpur Road Link",
    "coords": {
      "latitude": 23.7529,
      "longitude": 90.3752
    },
    "keywords": [
      "dhanmondi 27",
      "rapa plaza",
      "road 27",
      "ধানমন্ডি ২৭"
    ]
  },
  {
    "id": "area_dhanmondi_32",
    "name": "Dhanmondi 32 (Museum Link)",
    "nameBn": "ধানমন্ডি ৩২ (জাদুঘর ব্রিজ)",
    "category": "area",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Road 32 / Mirpur Road Link",
    "coords": {
      "latitude": 23.751,
      "longitude": 90.378
    },
    "keywords": [
      "dhanmondi 32",
      "road 32",
      "ধানমন্ডি ৩২"
    ]
  },
  {
    "id": "area_dhanmondi_8a",
    "name": "Dhanmondi 8/A",
    "nameBn": "ধানমন্ডি ৮/এ",
    "category": "area",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Sat Masjid Road Link",
    "coords": {
      "latitude": 23.746,
      "longitude": 90.372
    },
    "keywords": [
      "dhanmondi 8a",
      "road 8a",
      "sat masjid road",
      "ধানমন্ডি ৮/এ"
    ]
  },
  {
    "id": "area_dhanmondi_9a",
    "name": "Dhanmondi 9/A (Mahila Complex)",
    "nameBn": "ধানমন্ডি ৯/এ (মহিলা কমপ্লেক্স)",
    "category": "area",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Sat Masjid Road Link",
    "coords": {
      "latitude": 23.7475,
      "longitude": 90.371
    },
    "keywords": [
      "dhanmondi 9a",
      "mahila complex",
      "ধানমন্ডি ৯/এ"
    ]
  },
  {
    "id": "area_dhanmondi_12a",
    "name": "Dhanmondi 12/A (Abahani Playground)",
    "nameBn": "ধানমন্ডি ১২/এ (আবাহনী মাঠ)",
    "category": "area",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Sat Masjid Road Link",
    "coords": {
      "latitude": 23.745,
      "longitude": 90.3735
    },
    "keywords": [
      "dhanmondi 12a",
      "abahani field",
      "ধানমন্ডি ১২/এ"
    ]
  },
  {
    "id": "area_dhanmondi_15",
    "name": "Dhanmondi 15 (Shankar)",
    "nameBn": "ধানমন্ডি ১৫ (শংকর)",
    "category": "area",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Sat Masjid Road / Shankar Bus Stand",
    "coords": {
      "latitude": 23.7485,
      "longitude": 90.369
    },
    "keywords": [
      "dhanmondi 15",
      "shankar",
      "road 15",
      "ধানমন্ডি ১৫",
      "শংকর"
    ]
  },
  {
    "id": "area_dhanmondi_2",
    "name": "Dhanmondi 2 (Shimanto Square)",
    "nameBn": "ধানমন্ডি ২ (সীমান্ত স্কয়ার)",
    "category": "area",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Peelkhana Gate / Road 2",
    "coords": {
      "latitude": 23.738,
      "longitude": 90.3755
    },
    "keywords": [
      "dhanmondi 2",
      "shimanto square",
      "road 2",
      "ধানমন্ডি ২"
    ]
  },
  {
    "id": "area_dhanmondi_lake",
    "name": "Dhanmondi Lake Amphitheatre",
    "nameBn": "ধানমন্ডি লেক অ্যাম্ফিথিয়েটার",
    "category": "landmark",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Rabindra Sarobar / Lake Amphitheatre",
    "coords": {
      "latitude": 23.747,
      "longitude": 90.377
    },
    "keywords": [
      "dhanmondi lake",
      "rabindra sarobar",
      "lake",
      "ধানমন্ডি লেক",
      "রবীন্দ্র সরোবর"
    ]
  },
  {
    "id": "area_jigatola_bus",
    "name": "Jigatola Bus Stand",
    "nameBn": "জিগাতলা বাস স্ট্যান্ড",
    "category": "transit",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Sat Masjid Road / BDR Gate",
    "coords": {
      "latitude": 23.7405,
      "longitude": 90.371
    },
    "keywords": [
      "jigatola",
      "sat masjid road",
      "জিগাতলা"
    ]
  },
  {
    "id": "area_kalabagan_playground",
    "name": "Kalabagan Playground",
    "nameBn": "কলাবাগান মাঠ",
    "category": "area",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Mirpur Road, Kalabagan",
    "coords": {
      "latitude": 23.746,
      "longitude": 90.381
    },
    "keywords": [
      "kalabagan",
      "mirpur road",
      "playground",
      "কলাবাগান"
    ]
  },
  {
    "id": "area_sukrabad_mor",
    "name": "Sukrabad Mor",
    "nameBn": "শুক্রাবাদ মোড়",
    "category": "area",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Mirpur Road opposite Metro",
    "coords": {
      "latitude": 23.751,
      "longitude": 90.3795
    },
    "keywords": [
      "sukrabad",
      "shukrabad",
      "daffodil link",
      "শুক্রাবাদ"
    ]
  },
  {
    "id": "area_mdpur_town_hall",
    "name": "Mohammadpur Town Hall Market",
    "nameBn": "মোহাম্মদপুর টাউন হল মার্কেট",
    "category": "area",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Asad Gate / Town Hall Link",
    "coords": {
      "latitude": 23.761,
      "longitude": 90.364
    },
    "keywords": [
      "town hall",
      "mohammadpur town hall",
      "টাউন হল"
    ]
  },
  {
    "id": "area_mdpur_krishi_market",
    "name": "Mohammadpur Krishi Market",
    "nameBn": "মোহাম্মদপুর কৃষি মার্কেট",
    "category": "area",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Ring Road / Krishi Market Link",
    "coords": {
      "latitude": 23.763,
      "longitude": 90.362
    },
    "keywords": [
      "krishi market",
      "mohammadpur krishi market",
      "কৃষি মার্কেট"
    ]
  },
  {
    "id": "area_mdpur_shia_masjid",
    "name": "Shia Masjid Mor (Mohammadpur)",
    "nameBn": "শিয়া মসজিদ মোড়",
    "category": "area",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Ring Road / Taj Mahal Road Link",
    "coords": {
      "latitude": 23.768,
      "longitude": 90.359
    },
    "keywords": [
      "shia masjid",
      "shia mor",
      "taj mahal road",
      "শিয়া মসজিদ"
    ]
  },
  {
    "id": "area_mdpur_japan_garden",
    "name": "Japan Garden City (Tokyo Square)",
    "nameBn": "জাপান গার্ডেন সিটি (টোকিও স্কয়ার)",
    "category": "area",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Ring Road, Mohammadpur",
    "coords": {
      "latitude": 23.768,
      "longitude": 90.356
    },
    "keywords": [
      "japan garden city",
      "tokyo square",
      "ring road",
      "জাপান গার্ডেন সিটি"
    ]
  },
  {
    "id": "area_mdpur_asad_gate",
    "name": "Asad Gate Intersection",
    "nameBn": "আসাদ গেট মোড়",
    "category": "transit",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Mirpur Road / Parliament Link",
    "coords": {
      "latitude": 23.7585,
      "longitude": 90.368
    },
    "keywords": [
      "asad gate",
      "parliament",
      "st joseph",
      "আসাদ গেট"
    ]
  },
  {
    "id": "area_mdpur_bosila_40ft",
    "name": "Bosila 40 Feet Road",
    "nameBn": "বসিলা ৪০ ফিট রোড",
    "category": "area",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Bosila Bridge Link",
    "coords": {
      "latitude": 23.745,
      "longitude": 90.34
    },
    "keywords": [
      "bosila 40 feet",
      "bosila bridge",
      "বসিলা ৪০ ফিট"
    ]
  },
  {
    "id": "area_mdpur_bosila_bridge",
    "name": "Bosila Bridge (Buriganga 3rd Bridge)",
    "nameBn": "বসিলা ব্রিজ (৩য় বুড়িগঙ্গা সেতু)",
    "category": "transit",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Beribadh / Keraniganj Link",
    "coords": {
      "latitude": 23.738,
      "longitude": 90.334
    },
    "keywords": [
      "bosila bridge",
      "buriganga bridge",
      "বসিলা ব্রিজ"
    ]
  },
  {
    "id": "area_mdpur_bus_stand",
    "name": "Mohammadpur Bus Stand (Allah Karim)",
    "nameBn": "মোহাম্মদপুর বাস স্ট্যান্ড (আল্লাহ করিম)",
    "category": "transit",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Allah Karim Masjid Mor",
    "coords": {
      "latitude": 23.756,
      "longitude": 90.358
    },
    "keywords": [
      "mohammadpur bus stand",
      "allah karim",
      "মোহাম্মদপুর বাস স্ট্যান্ড"
    ]
  },
  {
    "id": "area_mdpur_taj_mahal",
    "name": "Taj Mahal Road (Mohammadpur)",
    "nameBn": "তাজমহল রোড (মোহাম্মদপুর)",
    "category": "area",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Mohammadpur Residential Link",
    "coords": {
      "latitude": 23.764,
      "longitude": 90.361
    },
    "keywords": [
      "taj mahal road",
      "mohammadpur",
      "তাজমহল রোড"
    ]
  },
  {
    "id": "area_mdpur_rayerbazar_memorial",
    "name": "Rayerbazar Martyred Intellectuals Memorial",
    "nameBn": "রায়েরবাজার বধ্যভূমি স্মৃতিসৌধ",
    "category": "landmark",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Beribadh, Rayerbazar",
    "coords": {
      "latitude": 23.748,
      "longitude": 90.353
    },
    "keywords": [
      "rayerbazar",
      "boddhobhumi",
      "martyred memorial",
      "রায়েরবাজার বধ্যভূমি"
    ]
  },
  {
    "id": "area_mdpur_college_gate",
    "name": "Mohammadpur College Gate",
    "nameBn": "কলেজ গেট (মোহাম্মদপুর)",
    "category": "transit",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Mirpur Road Link",
    "coords": {
      "latitude": 23.756,
      "longitude": 90.366
    },
    "keywords": [
      "college gate",
      "mohammadpur",
      "mirpur road",
      "কলেজ গেট"
    ]
  },
  {
    "id": "area_mirpur_central",
    "name": "Mirpur",
    "nameBn": "মিরপুর",
    "category": "area",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Mirpur-2 & Central Hub",
    "coords": {
      "latitude": 23.8078,
      "longitude": 90.3582
    },
    "keywords": [
      "mirpur",
      "mirpur central",
      "মিরপুর",
      "মিরপুর এলাকা"
    ]
  },
  {
    "id": "area_mirpur_60ft_main",
    "name": "60 Feet Road (Kamal Sarani Main)",
    "nameBn": "৬০ ফিট রোড (কামাল সরণি)",
    "category": "area",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Mirpur-2 to Agargaon Link",
    "coords": {
      "latitude": 23.785,
      "longitude": 90.365
    },
    "keywords": [
      "60 feet",
      "kamal sarani",
      "paka masjid",
      "৬০ ফিট"
    ]
  },
  {
    "id": "area_mirpur_60ft_paka_masjid",
    "name": "Paka Masjid Mor (60 Feet Road)",
    "nameBn": "পাকা মসজিদ মোড় (৬০ ফিট)",
    "category": "area",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "60 Feet Road, Mirpur-2",
    "coords": {
      "latitude": 23.787,
      "longitude": 90.366
    },
    "keywords": [
      "paka masjid",
      "60 feet",
      "পাকা মসজিদ"
    ]
  },
  {
    "id": "area_mirpur_60ft_agnishikha",
    "name": "Agnishikha Mor (60 Feet Road)",
    "nameBn": "অগ্নিশিখা মোড় (৬০ ফিট)",
    "category": "area",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "60 Feet Road, Pirerbagh Link",
    "coords": {
      "latitude": 23.782,
      "longitude": 90.364
    },
    "keywords": [
      "agnishikha",
      "60 feet",
      "অগ্নিশিখা"
    ]
  },
  {
    "id": "area_mirpur_60ft_shadhinata",
    "name": "Shadhinata Chattar (60 Feet Road)",
    "nameBn": "স্বাধীনতা চত্বর (৬০ ফিট)",
    "category": "area",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "60 Feet Road, Monipur Link",
    "coords": {
      "latitude": 23.789,
      "longitude": 90.367
    },
    "keywords": [
      "shadhinata chattar",
      "60 feet",
      "স্বাধীনতা চত্বর"
    ]
  },
  {
    "id": "area_mirpur_benarasi_palli",
    "name": "Benarasi Palli (Mirpur 10)",
    "nameBn": "বেনারসি পল্লী (মিরপুর ১০)",
    "category": "landmark",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Section 10 Block A, Mirpur",
    "coords": {
      "latitude": 23.808,
      "longitude": 90.366
    },
    "keywords": [
      "benarasi palli",
      "mirpur 10",
      "saree market",
      "বেনারসি পল্লী"
    ]
  },
  {
    "id": "area_mirpur_love_road",
    "name": "Love Road (Mirpur 2)",
    "nameBn": "লাভ রোড (মিরপুর ২)",
    "category": "area",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Section 2 Block D Link",
    "coords": {
      "latitude": 23.806,
      "longitude": 90.359
    },
    "keywords": [
      "love road",
      "mirpur 2",
      "লাভ রোড"
    ]
  },
  {
    "id": "area_mirpur_sec6_eastern",
    "name": "Mirpur 6 Eastern Housing",
    "nameBn": "মিরপুর ৬ ইস্টার্ন হাউজিং",
    "category": "area",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Section 6, Mirpur",
    "coords": {
      "latitude": 23.805,
      "longitude": 90.351
    },
    "keywords": [
      "mirpur 6 eastern",
      "eastern housing",
      "ইস্টার্ন হাউজিং"
    ]
  },
  {
    "id": "area_mirpur_sec11_ave5",
    "name": "Avenue 5 (Mirpur 11)",
    "nameBn": "অ্যাভিনিউ ৫ (মিরপুর ১১)",
    "category": "area",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Section 11 Block C Link",
    "coords": {
      "latitude": 23.819,
      "longitude": 90.368
    },
    "keywords": [
      "avenue 5",
      "mirpur 11",
      "অ্যাভিনিউ ৫"
    ]
  },
  {
    "id": "area_mirpur_ceramic_mor",
    "name": "Ceramic Mor (Mirpur 12)",
    "nameBn": "সিরামিক মোড় (মিরপুর ১২)",
    "category": "area",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Section 12 Block E Link",
    "coords": {
      "latitude": 23.831,
      "longitude": 90.363
    },
    "keywords": [
      "ceramic mor",
      "mirpur 12",
      "সিরামিক মোড়"
    ]
  },
  {
    "id": "area_mirpur_nam_garden",
    "name": "NAM Garden (Mirpur 13)",
    "nameBn": "নম গার্ডেন (মিরপুর ১৩)",
    "category": "area",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Section 13 Officers Link",
    "coords": {
      "latitude": 23.804,
      "longitude": 90.377
    },
    "keywords": [
      "nam garden",
      "mirpur 13",
      "নম গার্ডেন"
    ]
  },
  {
    "id": "area_mirpur_milk_vita",
    "name": "Milk Vita Mor (Mirpur 7)",
    "nameBn": "দুগ্ধ ভিটা মোড় (মিরপুর ৭)",
    "category": "area",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Section 7 Milk Vita Factory",
    "coords": {
      "latitude": 23.815,
      "longitude": 90.361
    },
    "keywords": [
      "milk vita",
      "mirpur 7",
      "মিল্ক ভিটা"
    ]
  },
  {
    "id": "area_mirpur_chalantika",
    "name": "Chalantika Mor (Mirpur 7)",
    "nameBn": "চলন্তিকা মোড় (মিরপুর ৭)",
    "category": "area",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Section 7 to Rupnagar Link",
    "coords": {
      "latitude": 23.818,
      "longitude": 90.3615
    },
    "keywords": [
      "chalantika",
      "mirpur 7",
      "rupnagar link",
      "চলন্তিকা"
    ]
  },
  {
    "id": "area_mirpur_bauniabadh",
    "name": "Bauniabadh (Mirpur-11)",
    "nameBn": "বাউনিয়াবাদ (মিরপুর-১১)",
    "category": "area",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Mirpur-11",
    "coords": {
      "latitude": 23.821,
      "longitude": 90.37
    },
    "keywords": [
      "bauniabadh",
      "mirpur 11",
      "মিরপুর ১১",
      "বাউনিয়াবাদ",
      "badh"
    ]
  },
  {
    "id": "area_mirpur_vashantek",
    "name": "Vashantek Mor (Cantonment Link)",
    "nameBn": "ভাষানটেক মোড়",
    "category": "area",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Mirpur 14 to Cantonment Link",
    "coords": {
      "latitude": 23.805,
      "longitude": 90.387
    },
    "keywords": [
      "vashantek",
      "bhashantek",
      "cantonment link",
      "ভাষানটেক"
    ]
  },
  {
    "id": "area_mirpur_ibrahimpur",
    "name": "Ibrahimpur Bazar (Kafrul)",
    "nameBn": "ইব্রাহিমপুর বাজার",
    "category": "area",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Kafrul, Mirpur-14 Link",
    "coords": {
      "latitude": 23.799,
      "longitude": 90.385
    },
    "keywords": [
      "ibrahimpur",
      "kafrul",
      "ইব্রাহিমপুর"
    ]
  },
  {
    "id": "area_banani_11",
    "name": "Banani 11 Food Street (Road 11)",
    "nameBn": "বনানী ১১ ফুড স্ট্রিট (রোড ১১)",
    "category": "area",
    "zone": "Mohakhali & Gulshan",
    "zoneBn": "মহাখালী ও গুলশান",
    "subLocation": "Road 11, Banani",
    "coords": {
      "latitude": 23.793,
      "longitude": 90.405
    },
    "keywords": [
      "banani 11",
      "road 11",
      "food street",
      "বনানী ১১"
    ]
  },
  {
    "id": "area_banani_kamal_ataturk",
    "name": "Kamal Ataturk Avenue (Banani)",
    "nameBn": "কামাল আতাতুর্ক অ্যাভিনিউ",
    "category": "transit",
    "zone": "Mohakhali & Gulshan",
    "zoneBn": "মহাখালী ও গুলশান",
    "subLocation": "Banani Commercial Area",
    "coords": {
      "latitude": 23.794,
      "longitude": 90.406
    },
    "keywords": [
      "kamal ataturk",
      "banani",
      "কামাল আতাতুর্ক"
    ]
  },
  {
    "id": "area_banani_chairman_bari",
    "name": "Chairman Bari Mor (Banani)",
    "nameBn": "চেয়ারম্যান বাড়ি মোড়",
    "category": "transit",
    "zone": "Mohakhali & Gulshan",
    "zoneBn": "মহাখালী ও গুলশান",
    "subLocation": "Airport Road, Banani Link",
    "coords": {
      "latitude": 23.788,
      "longitude": 90.402
    },
    "keywords": [
      "chairman bari",
      "banani",
      "চেয়ারম্যান বাড়ি"
    ]
  },
  {
    "id": "area_gulshan_1_circle",
    "name": "Gulshan 1 Circle",
    "nameBn": "গুলশান ১ চত্বর",
    "category": "transit",
    "zone": "Mohakhali & Gulshan",
    "zoneBn": "মহাখালী ও গুলশান",
    "subLocation": "Gulshan 1 Roundabout",
    "coords": {
      "latitude": 23.7785,
      "longitude": 90.4175
    },
    "keywords": [
      "gulshan 1",
      "gulshan 1 circle",
      "গুলশান ১"
    ]
  },
  {
    "id": "area_gulshan_2_circle",
    "name": "Gulshan 2 Circle",
    "nameBn": "গুলশান ২ চত্বর",
    "category": "transit",
    "zone": "Mohakhali & Gulshan",
    "zoneBn": "মহাখালী ও গুলশান",
    "subLocation": "Gulshan 2 Roundabout & DCC Market",
    "coords": {
      "latitude": 23.7925,
      "longitude": 90.415
    },
    "keywords": [
      "gulshan 2",
      "gulshan 2 circle",
      "গুলশান ২"
    ]
  },
  {
    "id": "area_nikunja_1",
    "name": "Nikunja 1 Gate",
    "nameBn": "নিকুঞ্জ ১ গেট",
    "category": "area",
    "zone": "Mohakhali & Gulshan",
    "zoneBn": "মহাখালী ও গুলশান",
    "subLocation": "Airport Road Link",
    "coords": {
      "latitude": 23.829,
      "longitude": 90.415
    },
    "keywords": [
      "nikunja 1",
      "airport road",
      "নিকুঞ্জ ১"
    ]
  },
  {
    "id": "area_nikunja_2",
    "name": "Nikunja 2 Main Road",
    "nameBn": "নিকুঞ্জ ২ মেইন রোড",
    "category": "area",
    "zone": "Mohakhali & Gulshan",
    "zoneBn": "মহাখালী ও গুলশান",
    "subLocation": "DSE Bhaban Link, Nikunja",
    "coords": {
      "latitude": 23.832,
      "longitude": 90.418
    },
    "keywords": [
      "nikunja 2",
      "dse",
      "নিকুঞ্জ ২"
    ]
  },
  {
    "id": "area_khilkhet_bus",
    "name": "Khilkhet Bus Stand",
    "nameBn": "খিলক্ষেত বাস স্ট্যান্ড",
    "category": "transit",
    "zone": "Mohakhali & Gulshan",
    "zoneBn": "মহাখালী ও গুলশান",
    "subLocation": "Pragati Sarani Link",
    "coords": {
      "latitude": 23.83,
      "longitude": 90.419
    },
    "keywords": [
      "khilkhet",
      "bus stand",
      "খিলক্ষেত"
    ]
  },
  {
    "id": "area_khilgaon_taltola",
    "name": "Khilgaon Taltola Market",
    "nameBn": "খিলগাঁও তালতলা মার্কেট",
    "category": "area",
    "zone": "Motijheel & East",
    "zoneBn": "মতিঝিল ও পূর্ব ঢাকা",
    "subLocation": "Khilgaon Main Road",
    "coords": {
      "latitude": 23.752,
      "longitude": 90.423
    },
    "keywords": [
      "khilgaon taltola",
      "taltola market",
      "তালতলা মার্কেট"
    ]
  },
  {
    "id": "area_khilgaon_food_street",
    "name": "Shahid Baki Road (Khilgaon Food Street)",
    "nameBn": "শহীদ বাকী রোড (খিলগাঁও রেস্তোরাঁ রোড)",
    "category": "area",
    "zone": "Motijheel & East",
    "zoneBn": "মতিঝিল ও পূর্ব ঢাকা",
    "subLocation": "Khilgaon Dining Strip",
    "coords": {
      "latitude": 23.75,
      "longitude": 90.425
    },
    "keywords": [
      "shahid baki road",
      "khilgaon food",
      "restaurant",
      "শহীদ বাকী রোড"
    ]
  },
  {
    "id": "area_notun_bazar_100ft",
    "name": "Notun Bazar (100 Feet / Madani Ave)",
    "nameBn": "নতুন বাজার (১০০ ফিট / মাদানী অ্যাভিনিউ)",
    "category": "transit",
    "zone": "Motijheel & East",
    "zoneBn": "মতিঝিল ও পূর্ব ঢাকা",
    "subLocation": "Pragati Sarani & Madani Avenue Link",
    "coords": {
      "latitude": 23.798,
      "longitude": 90.425
    },
    "keywords": [
      "notun bazar",
      "100 feet",
      "madani avenue",
      "নতুন বাজার"
    ]
  },
  {
    "id": "area_merul_badda_brac",
    "name": "Merul Badda (BRAC University Link)",
    "nameBn": "মেরুল বাড্ডা (ব্র্যাক বিশ্ববিদ্যালয়)",
    "category": "area",
    "zone": "Motijheel & East",
    "zoneBn": "মতিঝিল ও পূর্ব ঢাকা",
    "subLocation": "Pragati Sarani, Merul Badda",
    "coords": {
      "latitude": 23.7745,
      "longitude": 90.426
    },
    "keywords": [
      "merul badda",
      "brac link",
      "মেরুল বাড্ডা"
    ]
  },
  {
    "id": "area_aftabnagar_gate",
    "name": "Aftabnagar Main Gate",
    "nameBn": "আফতাবনগর মেইন গেট",
    "category": "area",
    "zone": "Motijheel & East",
    "zoneBn": "মতিঝিল ও পূর্ব ঢাকা",
    "subLocation": "Rampura Bridge Link",
    "coords": {
      "latitude": 23.766,
      "longitude": 90.423
    },
    "keywords": [
      "aftabnagar gate",
      "rampura bridge",
      "আফতাবনগর"
    ]
  },
  {
    "id": "area_motijheel_shapla",
    "name": "Shapla Chattar (Motijheel)",
    "nameBn": "শাপলা চত্বর (মতিঝিল)",
    "category": "transit",
    "zone": "Motijheel & East",
    "zoneBn": "মতিঝিল ও পূর্ব ঢাকা",
    "subLocation": "Bangladesh Bank Link",
    "coords": {
      "latitude": 23.7315,
      "longitude": 90.4172
    },
    "keywords": [
      "shapla chattar",
      "motijheel",
      "bangladesh bank",
      "শাপলা চত্বর"
    ]
  },
  {
    "id": "area_dilkusha_commercial",
    "name": "Dilkusha Commercial Area",
    "nameBn": "দিলকুশা বাণিজ্যিক এলাকা",
    "category": "area",
    "zone": "Motijheel & East",
    "zoneBn": "মতিঝিল ও পূর্ব ঢাকা",
    "subLocation": "Motijheel Banking Zone",
    "coords": {
      "latitude": 23.729,
      "longitude": 90.419
    },
    "keywords": [
      "dilkusha",
      "motijheel",
      "দিলকুশা"
    ]
  },
  {
    "id": "area_tejgaon_channel_i",
    "name": "Tejgaon Channel i Gate",
    "nameBn": "চ্যানেল আই গেট (তেজগাঁও)",
    "category": "area",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Shahid Tajuddin Ahmed Sarani",
    "coords": {
      "latitude": 23.766,
      "longitude": 90.404
    },
    "keywords": [
      "channel i",
      "tejgaon",
      "চ্যানেল আই"
    ]
  },
  {
    "id": "area_tejgaon_nabisco",
    "name": "Nabisco Mor (Tejgaon)",
    "nameBn": "নাবিস্কো মোড় (তেজগাঁও)",
    "category": "transit",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Tejgaon Industrial Area Link",
    "coords": {
      "latitude": 23.768,
      "longitude": 90.401
    },
    "keywords": [
      "nabisco",
      "tejgaon",
      "নাবিস্কো"
    ]
  },
  {
    "id": "area_tejgaon_satrasta",
    "name": "Satrasta Mor (Tejgaon Flyover)",
    "nameBn": "সাতরাস্তা মোড় (ফ্লাইওভার)",
    "category": "transit",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Moghbazar-Tejgaon Flyover Junction",
    "coords": {
      "latitude": 23.758,
      "longitude": 90.3995
    },
    "keywords": [
      "satrasta",
      "flyover",
      "tejgaon",
      "সাতরাস্তা"
    ]
  },
  {
    "id": "area_wari_rankin",
    "name": "Rankin Street (Wari)",
    "nameBn": "র‌্যাংকিন স্ট্রিট (ওয়ারী)",
    "category": "area",
    "zone": "Old Dhaka & Sadarghat",
    "zoneBn": "পুরান ঢাকা ও সদরঘাট",
    "subLocation": "Wari Commercial Hub",
    "coords": {
      "latitude": 23.719,
      "longitude": 90.418
    },
    "keywords": [
      "rankin street",
      "wari",
      "র‌্যাংকিন স্ট্রিট"
    ]
  },
  {
    "id": "area_shankhari_bazar",
    "name": "Shankhari Bazar (Hindu Street)",
    "nameBn": "শাঁখারী বাজার",
    "category": "landmark",
    "zone": "Old Dhaka & Sadarghat",
    "zoneBn": "পুরান ঢাকা ও সদরঘাট",
    "subLocation": "Kotwali, Old Dhaka",
    "coords": {
      "latitude": 23.7105,
      "longitude": 90.407
    },
    "keywords": [
      "shankhari bazar",
      "hindu street",
      "conch shell",
      "শাঁখারী বাজার"
    ]
  },
  {
    "id": "area_tantibazar",
    "name": "Tantibazar Mor",
    "nameBn": "তাঁতীবাজার মোড়",
    "category": "area",
    "zone": "Old Dhaka & Sadarghat",
    "zoneBn": "পুরান ঢাকা ও সদরঘাট",
    "subLocation": "Kotwali, Old Dhaka",
    "coords": {
      "latitude": 23.712,
      "longitude": 90.408
    },
    "keywords": [
      "tantibazar",
      "jewelry market",
      "তাঁতীবাজার"
    ]
  },
  {
    "id": "area_armanitola",
    "name": "Armanitola Mor",
    "nameBn": "আরমানিটোলা মোড়",
    "category": "area",
    "zone": "Old Dhaka & Sadarghat",
    "zoneBn": "পুরান ঢাকা ও সদরঘাট",
    "subLocation": "Star Mosque Link",
    "coords": {
      "latitude": 23.715,
      "longitude": 90.404
    },
    "keywords": [
      "armanitola",
      "star mosque link",
      "আরমানিটোলা"
    ]
  },
  {
    "id": "area_islampur_market",
    "name": "Islampur Cloth Wholesale Market",
    "nameBn": "ইসলামপুর কাপড়ের বাজার",
    "category": "landmark",
    "zone": "Old Dhaka & Sadarghat",
    "zoneBn": "পুরান ঢাকা ও সদরঘাট",
    "subLocation": "Babu Bazar Link",
    "coords": {
      "latitude": 23.709,
      "longitude": 90.408
    },
    "keywords": [
      "islampur",
      "cloth market",
      "fabric",
      "ইসলামপুর"
    ]
  },
  {
    "id": "area_nilkhet_book_market",
    "name": "Nilkhet Book Market & Mor",
    "nameBn": "নীলক্ষেত বই মার্কেট ও মোড়",
    "category": "landmark",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Mirpur Road & DU Link",
    "coords": {
      "latitude": 23.733,
      "longitude": 90.3865
    },
    "keywords": [
      "nilkhet",
      "book market",
      "du gate",
      "নীলক্ষেত"
    ]
  },
  {
    "id": "area_palashi_intersection",
    "name": "Palashi Intersection (BUET Link)",
    "nameBn": "পলাশী মোড় (বুয়েট গেট)",
    "category": "transit",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Palashi Bazar / BUET Gate",
    "coords": {
      "latitude": 23.7255,
      "longitude": 90.3895
    },
    "keywords": [
      "palashi",
      "buet gate",
      "পলাশী"
    ]
  },
  {
    "id": "area_katabon_masjid",
    "name": "Katabon Masjid & Animal Market Mor",
    "nameBn": "কাটাবন মোড়",
    "category": "area",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Elephant Road & Shahbagh Link",
    "coords": {
      "latitude": 23.74,
      "longitude": 90.392
    },
    "keywords": [
      "katabon",
      "animal market",
      "কাটাবন"
    ]
  },
  {
    "id": "area_laxmibazar_mor",
    "name": "Laxmibazar Mor (Old Dhaka)",
    "nameBn": "লক্ষ্মীবাজার মোড়",
    "category": "area",
    "zone": "Old Dhaka & Sadarghat",
    "zoneBn": "পুরান ঢাকা ও সদরঘাট",
    "subLocation": "Victoria Park Link, Old Dhaka",
    "coords": {
      "latitude": 23.7115,
      "longitude": 90.413
    },
    "keywords": [
      "laxmibazar",
      "old dhaka",
      "victoria park link",
      "লক্ষ্মীবাজার"
    ]
  },
  {
    "id": "area_bangshal_cycle",
    "name": "Bangshal Bicycle Market Mor",
    "nameBn": "বংশাল সাইকেল মার্কেট মোড়",
    "category": "area",
    "zone": "Old Dhaka & Sadarghat",
    "zoneBn": "পুরান ঢাকা ও সদরঘাট",
    "subLocation": "Kazi Alauddin Road Link",
    "coords": {
      "latitude": 23.719,
      "longitude": 90.407
    },
    "keywords": [
      "bangshal",
      "bicycle market",
      "বংশাল"
    ]
  },
  {
    "id": "area_gazipur_central",
    "name": "Gazipur",
    "nameBn": "গাজীপুর",
    "category": "area",
    "zone": "Greater Dhaka & Suburbs",
    "zoneBn": "বৃহত্তর ঢাকা ও শহরতলি",
    "subLocation": "Gazipur Sadar Hub",
    "coords": {
      "latitude": 23.9999,
      "longitude": 90.4203
    },
    "keywords": [
      "gazipur",
      "gazipur sadar",
      "গাজীপুর",
      "গাজীপুর শহর"
    ]
  },
  {
    "id": "area_baipail_ashulia",
    "name": "Baipail Intersection (EPZ Link)",
    "nameBn": "বাইপাইল মোড় (ইপিজেড সংযোগ)",
    "category": "transit",
    "zone": "Greater Dhaka & Suburbs",
    "zoneBn": "বৃহত্তর ঢাকা ও শহরতলি",
    "subLocation": "Dhaka-EPZ Highway, Ashulia",
    "coords": {
      "latitude": 23.935,
      "longitude": 90.27
    },
    "keywords": [
      "baipail",
      "ashulia",
      "epz",
      "বাইপাইল"
    ]
  },
  {
    "id": "area_fantasy_kingdom",
    "name": "Fantasy Kingdom (Ashulia)",
    "nameBn": "ফ্যান্টাসি কিংডম (আশুলিয়া)",
    "category": "landmark",
    "zone": "Greater Dhaka & Suburbs",
    "zoneBn": "বৃহত্তর ঢাকা ও শহরতলি",
    "subLocation": "Jamgora, Ashulia",
    "coords": {
      "latitude": 23.938,
      "longitude": 90.292
    },
    "keywords": [
      "fantasy kingdom",
      "theme park",
      "ashulia",
      "ফ্যান্টাসি কিংডম"
    ]
  },
  {
    "id": "area_gazipur_chowrasta",
    "name": "Gazipur Chowrasta Roundabout",
    "nameBn": "গাজীপুর চৌরাস্তা",
    "category": "transit",
    "zone": "Greater Dhaka & Suburbs",
    "zoneBn": "বৃহত্তর ঢাকা ও শহরতলি",
    "subLocation": "Dhaka-Mymensingh & Tangail Hwy",
    "coords": {
      "latitude": 23.992,
      "longitude": 90.38
    },
    "keywords": [
      "gazipur chowrasta",
      "chowrasta",
      "গাজীপুর চৌরাস্তা"
    ]
  },
  {
    "id": "area_kanchan_bridge",
    "name": "Kanchan Bridge (Purbachal Expressway End)",
    "nameBn": "কাঞ্চন ব্রিজ (পূর্বাচল এক্সপ্রেসওয়ে)",
    "category": "transit",
    "zone": "Greater Dhaka & Suburbs",
    "zoneBn": "বৃহত্তর ঢাকা ও শহরতলি",
    "subLocation": "Shitalakshya River Link, Purbachal",
    "coords": {
      "latitude": 23.834,
      "longitude": 90.525
    },
    "keywords": [
      "kanchan bridge",
      "purbachal expressway",
      "কাঞ্চন ব্রিজ"
    ]
  },
  {
    "id": "area_signboard_hwy",
    "name": "Signboard Bus Stand (Highway Link)",
    "nameBn": "সাইনবোর্ড বাস স্ট্যান্ড",
    "category": "transit",
    "zone": "Greater Dhaka & Suburbs",
    "zoneBn": "বৃহত্তর ঢাকা ও শহরতলি",
    "subLocation": "Dhaka-Chittagong Highway",
    "coords": {
      "latitude": 23.682,
      "longitude": 90.478
    },
    "keywords": [
      "signboard",
      "chittagong highway",
      "সাইনবোর্ড"
    ]
  },
  {
    "id": "area_chasara_narayanganj",
    "name": "Chasara Roundabout (Narayanganj)",
    "nameBn": "চাষাঢ়া গোলচত্বর (নারায়ণগঞ্জ)",
    "category": "transit",
    "zone": "Greater Dhaka & Suburbs",
    "zoneBn": "বৃহত্তর ঢাকা ও শহরতলি",
    "subLocation": "Narayanganj City Center",
    "coords": {
      "latitude": 23.623,
      "longitude": 90.5
    },
    "keywords": [
      "chasara",
      "narayanganj",
      "চাষাঢ়া"
    ]
  },
  {
    "id": "hosp_dhaka_medical_college_dmch",
    "name": "Dhaka Medical College (DMCH)",
    "nameBn": "ঢাকা মেডিকেল",
    "category": "hospital",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Shahbagh",
    "coords": {
      "latitude": 23.7257,
      "longitude": 90.3976
    },
    "keywords": [
      "dmch",
      "dhaka medical",
      "shahbagh",
      "burn unit",
      "ঢাকা মেডিকেল",
      "ঢাকা মেডিকেল কলেজ",
      "dhaka medical college (dmch)",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_bsmmu_pg_hospital",
    "name": "BSMMU (PG Hospital)",
    "nameBn": "বিএসএমএমইউ / পিজি",
    "category": "hospital",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Shahbagh",
    "coords": {
      "latitude": 23.7389,
      "longitude": 90.3956
    },
    "keywords": [
      "pg",
      "bsmmu",
      "bangabandhu",
      "shahbagh",
      "বিএসএমএমইউ",
      "পিজি",
      "বিএসএমএমইউ / পিজি",
      "bsmmu (pg hospital)",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_birdem_general_hospital",
    "name": "BIRDEM General Hospital",
    "nameBn": "বারডেম হাসপাতাল",
    "category": "hospital",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Shahbagh",
    "coords": {
      "latitude": 23.7397,
      "longitude": 90.3962
    },
    "keywords": [
      "birdem",
      "diabetic",
      "shahbagh",
      "বারডেম",
      "বারডেম হাসপাতাল",
      "birdem general hospital",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_birdem_2_women_children",
    "name": "BIRDEM-2 (Women & Children)",
    "nameBn": "বারডেম-২ (মহিলা ও শিশু)",
    "category": "hospital",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Segunbagicha",
    "coords": {
      "latitude": 23.7342,
      "longitude": 90.406
    },
    "keywords": [
      "birdem 2",
      "segunbagicha",
      "diabetic",
      "বারডেম-২",
      "মহিলা ও শিশু",
      "birdem-2 (women & children)",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_suhrawardy_hospital",
    "name": "Suhrawardy Hospital",
    "nameBn": "সোহরাওয়ার্দী হাসপাতাল",
    "category": "hospital",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Sher-e-Bangla Nagar",
    "coords": {
      "latitude": 23.7699,
      "longitude": 90.3712
    },
    "keywords": [
      "suhrawardy",
      "shohid",
      "agargaon",
      "sher-e-bangla",
      "সোহরাওয়ার্দী",
      "সোহরাওয়ার্দী হাসপাতাল",
      "suhrawardy hospital",
      "sher-e-bangla nagar",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_national_heart_foundation",
    "name": "National Heart Foundation",
    "nameBn": "জাতীয় হৃদরোগ ফাউন্ডেশন",
    "category": "hospital",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Mirpur-2",
    "coords": {
      "latitude": 23.8055,
      "longitude": 90.36
    },
    "keywords": [
      "heart foundation",
      "nhf",
      "mirpur-2",
      "cardiac",
      "হৃদরোগ ফাউন্ডেশন",
      "জাতীয় হৃদরোগ ফাউন্ডেশন",
      "national heart foundation",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_nicvd_heart_institute",
    "name": "NICVD (Heart Institute)",
    "nameBn": "জাতীয় হৃদরোগ ইনস্টিটিউট",
    "category": "hospital",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Sher-e-Bangla Nagar",
    "coords": {
      "latitude": 23.7713,
      "longitude": 90.3705
    },
    "keywords": [
      "nicvd",
      "heart institute",
      "sher-e-bangla nagar",
      "জাতীয় হৃদরোগ",
      "জাতীয় হৃদরোগ ইনস্টিটিউট",
      "nicvd (heart institute)",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_nins_neurosciences_hospital",
    "name": "NINS (Neurosciences Hospital)",
    "nameBn": "জাতীয় নিউরোসায়েন্সেস",
    "category": "hospital",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Agargaon",
    "coords": {
      "latitude": 23.7725,
      "longitude": 90.3715
    },
    "keywords": [
      "nins",
      "neuro",
      "agargaon",
      "brain",
      "নিউরোসায়েন্সেস",
      "জাতীয় নিউরোসায়েন্সেস",
      "nins (neurosciences hospital)",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_nitor_pangu_hospital",
    "name": "NITOR (Pangu Hospital)",
    "nameBn": "পঙ্গু হাসপাতাল",
    "category": "hospital",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Sher-e-Bangla Nagar",
    "coords": {
      "latitude": 23.7715,
      "longitude": 90.371
    },
    "keywords": [
      "pangu",
      "nitor",
      "traumatology",
      "orthopaedic",
      "পঙ্গু",
      "পঙ্গু হাসপাতাল",
      "nitor (pangu hospital)",
      "sher-e-bangla nagar",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_nikdu_kidney_institute",
    "name": "NIKDU (Kidney Institute)",
    "nameBn": "জাতীয় কিডনি ইনস্টিটিউট",
    "category": "hospital",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Sher-e-Bangla Nagar",
    "coords": {
      "latitude": 23.7733,
      "longitude": 90.3715
    },
    "keywords": [
      "nikdu",
      "kidney institute",
      "dialysis",
      "জাতীয় কিডনি",
      "জাতীয় কিডনি ইনস্টিটিউট",
      "nikdu (kidney institute)",
      "sher-e-bangla nagar",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_nioh_national_eye_hospital",
    "name": "NIOH (National Eye Hospital)",
    "nameBn": "জাতীয় চক্ষু বিজ্ঞান ইনস্টিটিউট",
    "category": "hospital",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Sher-e-Bangla Nagar",
    "coords": {
      "latitude": 23.7725,
      "longitude": 90.372
    },
    "keywords": [
      "nioh",
      "eye hospital",
      "chokkhu",
      "জাতীয় চক্ষু",
      "জাতীয় চক্ষু বিজ্ঞান",
      "nioh (national eye hospital)",
      "sher-e-bangla nagar",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_nicrh_cancer_hospital",
    "name": "NICRH (Cancer Hospital)",
    "nameBn": "জাতীয় ক্যান্সার ইনস্টিটিউট",
    "category": "hospital",
    "zone": "Mohakhali & Gulshan",
    "zoneBn": "মহাখালী ও গুলশান",
    "subLocation": "Mohakhali",
    "coords": {
      "latitude": 23.7785,
      "longitude": 90.4045
    },
    "keywords": [
      "nicrh",
      "cancer hospital",
      "mohakhali",
      "oncology",
      "ক্যান্সার",
      "জাতীয় ক্যান্সার",
      "nicrh (cancer hospital)",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_nidch_chest_hospital",
    "name": "NIDCH (Chest Hospital)",
    "nameBn": "জাতীয় বক্ষব্যাধি ইনস্টিটিউট",
    "category": "hospital",
    "zone": "Mohakhali & Gulshan",
    "zoneBn": "মহাখালী ও গুলশান",
    "subLocation": "Mohakhali",
    "coords": {
      "latitude": 23.779,
      "longitude": 90.405
    },
    "keywords": [
      "nidch",
      "chest hospital",
      "tb",
      "বক্ষব্যাধি",
      "mohakhali",
      "জাতীয় বক্ষব্যাধি",
      "nidch (chest hospital)",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_nimh_mental_health_institute",
    "name": "NIMH (Mental Health Institute)",
    "nameBn": "জাতীয় মানসিক স্বাস্থ্য ইনস্টিটিউট",
    "category": "hospital",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Sher-e-Bangla Nagar",
    "coords": {
      "latitude": 23.7735,
      "longitude": 90.3708
    },
    "keywords": [
      "nimh",
      "mental health",
      "sher-e-bangla nagar",
      "মানসিক স্বাস্থ্য",
      "জাতীয় মানসিক স্বাস্থ্য",
      "nimh (mental health institute)",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_nient_national_ent_institute",
    "name": "NIENT (National ENT Institute)",
    "nameBn": "জাতীয় নাক কান গলা ইনস্টিটিউট",
    "category": "hospital",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Tejgaon",
    "coords": {
      "latitude": 23.765,
      "longitude": 90.401
    },
    "keywords": [
      "nient",
      "ent",
      "nak kan gola",
      "tejgaon",
      "নাক কান গলা",
      "জাতীয় নাক কান গলা",
      "nient (national ent institute)",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_burn_plastic_surgery_institute",
    "name": "Burn & Plastic Surgery Institute",
    "nameBn": "শেখ হাসিনা বার্ন ইনস্টিটিউট",
    "category": "hospital",
    "zone": "Old Dhaka & Sadarghat",
    "zoneBn": "পুরান ঢাকা ও সদরঘাট",
    "subLocation": "Chankharpul",
    "coords": {
      "latitude": 23.723,
      "longitude": 90.3995
    },
    "keywords": [
      "shnibps",
      "burn hospital",
      "plastic surgery",
      "chankharpul",
      "বার্ন ইনস্টিটিউট",
      "শেখ হাসিনা বার্ন",
      "burn & plastic surgery institute",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_kurmitola_general_hospital",
    "name": "Kurmitola General Hospital",
    "nameBn": "কুর্মিটোলা জেনারেল হাসপাতাল",
    "category": "hospital",
    "zone": "Mohakhali & Gulshan",
    "zoneBn": "মহাখালী ও গুলশান",
    "subLocation": "Dhaka Cantonment",
    "coords": {
      "latitude": 23.8242,
      "longitude": 90.4072
    },
    "keywords": [
      "kurmitola",
      "kgh",
      "cantonment",
      "airport road",
      "কুর্মিটোলা",
      "কুর্মিটোলা জেনারেল",
      "kurmitola general hospital",
      "dhaka cantonment",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_cmh_combined_military_hospital",
    "name": "CMH (Combined Military Hospital)",
    "nameBn": "সম্মিলিত সামরিক হাসপাতাল",
    "category": "hospital",
    "zone": "Mohakhali & Gulshan",
    "zoneBn": "মহাখালী ও গুলশান",
    "subLocation": "Dhaka Cantonment",
    "coords": {
      "latitude": 23.8217,
      "longitude": 90.4035
    },
    "keywords": [
      "cmh",
      "military hospital",
      "cantonment",
      "সম্মিলিত সামরিক",
      "সম্মিলিত সামরিক হাসপাতাল",
      "cmh (combined military hospital)",
      "dhaka cantonment",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_afmc_armed_forces_medical",
    "name": "AFMC (Armed Forces Medical)",
    "nameBn": "সশস্ত্র বাহিনী মেডিকেল",
    "category": "hospital",
    "zone": "Mohakhali & Gulshan",
    "zoneBn": "মহাখালী ও গুলশান",
    "subLocation": "Dhaka Cantonment",
    "coords": {
      "latitude": 23.821,
      "longitude": 90.404
    },
    "keywords": [
      "afmc",
      "armed forces",
      "cantonment",
      "সশস্ত্র বাহিনী মেডিকেল",
      "সশস্ত্র বাহিনী",
      "afmc (armed forces medical)",
      "dhaka cantonment",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_sir_salimullah_mitford_hospital",
    "name": "Sir Salimullah Mitford Hospital",
    "nameBn": "মিটফোর্ড হাসপাতাল",
    "category": "hospital",
    "zone": "Old Dhaka & Sadarghat",
    "zoneBn": "পুরান ঢাকা ও সদরঘাট",
    "subLocation": "Old Dhaka",
    "coords": {
      "latitude": 23.7118,
      "longitude": 90.4019
    },
    "keywords": [
      "mitford",
      "ssmc",
      "old dhaka",
      "babubazar",
      "মিটফোর্ড",
      "মিটফোর্ড হাসপাতাল",
      "sir salimullah mitford hospital",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_mugda_medical_college_hospital",
    "name": "Mugda Medical College Hospital",
    "nameBn": "মুগদা মেডিকেল কলেজ",
    "category": "hospital",
    "zone": "Motijheel & East",
    "zoneBn": "মতিঝিল ও পূর্ব ঢাকা",
    "subLocation": "Mugda",
    "coords": {
      "latitude": 23.7302,
      "longitude": 90.4328
    },
    "keywords": [
      "mugda",
      "general hospital",
      "khilgaon link",
      "মুগদা",
      "মুগদা মেডিকেল কলেজ",
      "mugda medical college hospital",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_bangladesh_shishu_hospital",
    "name": "Bangladesh Shishu Hospital",
    "nameBn": "শিশু হাসপাতাল ও ইনস্টিটিউট",
    "category": "hospital",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Agargaon",
    "coords": {
      "latitude": 23.773,
      "longitude": 90.3725
    },
    "keywords": [
      "shishu hospital",
      "children hospital",
      "agargaon",
      "শিশু হাসপাতাল",
      "শিশু হাসপাতাল ও ইনস্টিটিউট",
      "bangladesh shishu hospital",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_kuwait_bangladesh_friendship_hospital",
    "name": "Kuwait Bangladesh Friendship Hospital",
    "nameBn": "কুয়েত বাংলাদেশ মৈত্রী হাসপাতাল",
    "category": "hospital",
    "zone": "Uttara & North",
    "zoneBn": "উত্তরা ও উত্তর ঢাকা",
    "subLocation": "Uttara",
    "coords": {
      "latitude": 23.8745,
      "longitude": 90.399
    },
    "keywords": [
      "kuwait maitree",
      "uttara",
      "govt hospital",
      "কুয়েত মৈত্রী",
      "কুয়েত বাংলাদেশ মৈত্রী হাসপাতাল",
      "kuwait bangladesh friendship hospital",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_icddr_b_cholera_hospital",
    "name": "icddr,b (Cholera Hospital)",
    "nameBn": "আইসিডিডিআর,বি",
    "category": "hospital",
    "zone": "Mohakhali & Gulshan",
    "zoneBn": "মহাখালী ও গুলশান",
    "subLocation": "Mohakhali",
    "coords": {
      "latitude": 23.778,
      "longitude": 90.404
    },
    "keywords": [
      "icddrb",
      "cholera",
      "diarrhoea",
      "mohakhali",
      "আইসিডিডিআরবি",
      "আইসিডিডিআর",
      "বি",
      "icddr,b (cholera hospital)",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_govt_employee_hospital",
    "name": "Govt Employee Hospital",
    "nameBn": "সরকারি কর্মচারী হাসপাতাল",
    "category": "hospital",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Fulbaria",
    "coords": {
      "latitude": 23.722,
      "longitude": 90.408
    },
    "keywords": [
      "sorkari kormochari",
      "fulbaria",
      "gulistan",
      "কর্মচারী হাসপাতাল",
      "সরকারি কর্মচারী হাসপাতাল",
      "govt employee hospital",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_central_police_hospital",
    "name": "Central Police Hospital",
    "nameBn": "কেন্দ্রীয় পুলিশ হাসপাতাল",
    "category": "hospital",
    "zone": "Motijheel & East",
    "zoneBn": "মতিঝিল ও পূর্ব ঢাকা",
    "subLocation": "Rajarbagh",
    "coords": {
      "latitude": 23.74,
      "longitude": 90.416
    },
    "keywords": [
      "police hospital",
      "rajarbagh",
      "shantinagar",
      "পুলিশ হাসপাতাল",
      "কেন্দ্রীয় পুলিশ হাসপাতাল",
      "central police hospital",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_railway_general_hospital",
    "name": "Railway General Hospital",
    "nameBn": "রেলওয়ে হাসপাতাল",
    "category": "hospital",
    "zone": "Motijheel & East",
    "zoneBn": "মতিঝিল ও পূর্ব ঢাকা",
    "subLocation": "Kamalapur",
    "coords": {
      "latitude": 23.734,
      "longitude": 90.426
    },
    "keywords": [
      "railway hospital",
      "kamalapur",
      "motijheel",
      "রেলওয়ে হাসপাতাল",
      "railway general hospital",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_matuail_icmh_child_mother",
    "name": "Matuail ICMH (Child & Mother)",
    "nameBn": "মাতুয়াইল শিশু ও মাতৃস্বাস্থ্য ইনস্টিটিউট",
    "category": "hospital",
    "zone": "Motijheel & East",
    "zoneBn": "মতিঝিল ও পূর্ব ঢাকা",
    "subLocation": "Matuail",
    "coords": {
      "latitude": 23.705,
      "longitude": 90.465
    },
    "keywords": [
      "matuail",
      "icmh",
      "maternity",
      "shishu",
      "মাতুয়াইল",
      "মাতুয়াইল শিশু ও মাতৃস্বাস্থ্য",
      "matuail icmh (child & mother)",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_azimpur_maternity_mchti",
    "name": "Azimpur Maternity (MCHTI)",
    "nameBn": "আজিমপুর মাতৃসদন",
    "category": "hospital",
    "zone": "Old Dhaka & Sadarghat",
    "zoneBn": "পুরান ঢাকা ও সদরঘাট",
    "subLocation": "Azimpur",
    "coords": {
      "latitude": 23.728,
      "longitude": 90.386
    },
    "keywords": [
      "azimpur maternity",
      "mchti",
      "maternity",
      "আজিমপুর মাতৃসদন",
      "azimpur maternity (mchti)",
      "azimpur",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_tb_hospital_shyamoli",
    "name": "TB Hospital Shyamoli",
    "nameBn": "যক্ষ্মা হাসপাতাল শ্যামলী",
    "category": "hospital",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Shyamoli",
    "coords": {
      "latitude": 23.772,
      "longitude": 90.3645
    },
    "keywords": [
      "tb hospital",
      "shyamoli",
      "chest",
      "যক্ষ্মা হাসপাতাল",
      "যক্ষ্মা হাসপাতাল শ্যামলী",
      "tb hospital shyamoli",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_infectious_diseases_hospital",
    "name": "Infectious Diseases Hospital",
    "nameBn": "সংক্রামক ব্যাধি হাসপাতাল",
    "category": "hospital",
    "zone": "Mohakhali & Gulshan",
    "zoneBn": "মহাখালী ও গুলশান",
    "subLocation": "Mohakhali",
    "coords": {
      "latitude": 23.7782,
      "longitude": 90.4042
    },
    "keywords": [
      "infectious diseases",
      "mohakhali",
      "idh",
      "সংক্রামক ব্যাধি",
      "সংক্রামক ব্যাধি হাসপাতাল",
      "infectious diseases hospital",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_lions_eye_institute_hospital",
    "name": "Lions Eye Institute & Hospital",
    "nameBn": "লায়ন্স চক্ষু হাসপাতাল",
    "category": "hospital",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Agargaon",
    "coords": {
      "latitude": 23.774,
      "longitude": 90.373
    },
    "keywords": [
      "lions eye",
      "agargaon",
      "eye hospital",
      "লায়ন্স চক্ষু",
      "লায়ন্স চক্ষু হাসপাতাল",
      "lions eye institute & hospital",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_ispahani_islamia_eye_institute",
    "name": "Ispahani Islamia Eye Institute",
    "nameBn": "ইস্পাহানী ইসলামিয়া চক্ষু ইনস্টিটিউট",
    "category": "hospital",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Farmgate",
    "coords": {
      "latitude": 23.757,
      "longitude": 90.3885
    },
    "keywords": [
      "islamia eye",
      "farmgate",
      "eye hospital",
      "ইসলামিয়া চক্ষু",
      "ইস্পাহানী ইসলামিয়া",
      "ispahani islamia eye institute",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_ahsania_mission_cancer_hospital",
    "name": "Ahsania Mission Cancer Hospital",
    "nameBn": "আহছানিয়া মিশন ক্যান্সার হাসপাতাল",
    "category": "hospital",
    "zone": "Uttara & North",
    "zoneBn": "উত্তরা ও উত্তর ঢাকা",
    "subLocation": "Uttara Sector 10",
    "coords": {
      "latitude": 23.8647,
      "longitude": 90.3958
    },
    "keywords": [
      "ahsania mission",
      "cancer hospital",
      "uttara",
      "আহছানিয়া মিশন",
      "আহছানিয়া মিশন ক্যান্সার",
      "ahsania mission cancer hospital",
      "uttara sector 10",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_dhaka_dental_college_hospital",
    "name": "Dhaka Dental College & Hospital",
    "nameBn": "ঢাকা ডেন্টাল কলেজ হাসপাতাল",
    "category": "hospital",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Mirpur-14",
    "coords": {
      "latitude": 23.8075,
      "longitude": 90.364
    },
    "keywords": [
      "dental college",
      "dhaka dental",
      "mirpur-14",
      "ডেন্টাল কলেজ",
      "ঢাকা ডেন্টাল",
      "dhaka dental college & hospital",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_ibn_sina_center_mirpur_10",
    "name": "Ibn Sina Center (Mirpur-10)",
    "nameBn": "ইবনে সিনা ডায়াগনস্টিক",
    "category": "hospital",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Mirpur-2 (Commerce College Road)",
    "coords": {
      "latitude": 23.808,
      "longitude": 90.3585
    },
    "keywords": [
      "ibn sina center",
      "ibn sina mirpur",
      "mirpur 10 ibn sina",
      "mirpur-10",
      "mirpur-2",
      "rupnagar",
      "shiyalbari",
      "commerce college",
      "haji road",
      "ইবনে সিনা মিরপুর",
      "ইবনে সিনা ডায়াগনস্টিক",
      "ibn sina center (mirpur-10)",
      "mirpur-2 (commerce college road)",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_popular_hospital_mirpur_10",
    "name": "Popular Hospital (Mirpur-10)",
    "nameBn": "পপুলার হাসপাতাল",
    "category": "hospital",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Mirpur-10",
    "coords": {
      "latitude": 23.8072,
      "longitude": 90.3695
    },
    "keywords": [
      "popular mirpur",
      "popular mirpur-10",
      "popular diagnostic",
      "পপুলার মিরপুর",
      "পপুলার হাসপাতাল",
      "popular hospital (mirpur-10)",
      "mirpur-10",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_al_helal_specialized_hospital",
    "name": "Al-Helal Specialized Hospital",
    "nameBn": "আল-হেলাল হাসপাতাল",
    "category": "hospital",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Mirpur-10",
    "coords": {
      "latitude": 23.807,
      "longitude": 90.369
    },
    "keywords": [
      "al helal",
      "al-helal",
      "mirpur-10",
      "আল-হেলাল",
      "আল-হেলাল হাসপাতাল",
      "al-helal specialized hospital",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_mirpur_general_hospital",
    "name": "Mirpur General Hospital",
    "nameBn": "মিরপুর জেনারেল হাসপাতাল",
    "category": "hospital",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Mirpur-2",
    "coords": {
      "latitude": 23.804,
      "longitude": 90.363
    },
    "keywords": [
      "mirpur general",
      "mirpur-2",
      "near bubt",
      "মিরপুর জেনারেল",
      "মিরপুর জেনারেল হাসপাতাল",
      "mirpur general hospital",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_kidney_foundation_hospital",
    "name": "Kidney Foundation Hospital",
    "nameBn": "কিডনি ফাউন্ডেশন হাসপাতাল",
    "category": "hospital",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Mirpur-2",
    "coords": {
      "latitude": 23.8045,
      "longitude": 90.362
    },
    "keywords": [
      "kidney foundation",
      "mirpur-2",
      "dialysis",
      "কিডনি ফাউন্ডেশন",
      "কিডনি ফাউন্ডেশন হাসপাতাল",
      "kidney foundation hospital",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_delta_medical_college_hospital",
    "name": "Delta Medical College Hospital",
    "nameBn": "ডেল্টা মেডিকেল কলেজ",
    "category": "hospital",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Mirpur-1",
    "coords": {
      "latitude": 23.8033,
      "longitude": 90.3619
    },
    "keywords": [
      "delta medical",
      "mirpur-1",
      "ডেল্টা মেডিকেল",
      "ডেল্টা মেডিকেল কলেজ",
      "delta medical college hospital",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_marks_medical_college_hospital",
    "name": "Marks Medical College Hospital",
    "nameBn": "মার্কস মেডিকেল কলেজ",
    "category": "hospital",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Mirpur-14",
    "coords": {
      "latitude": 23.806,
      "longitude": 90.383
    },
    "keywords": [
      "marks medical",
      "mirpur-14",
      "dental",
      "মার্কস মেডিকেল",
      "মার্কস মেডিকেল কলেজ",
      "marks medical college hospital",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_al_razi_islamia_hospital",
    "name": "Al-Razi Islamia Hospital",
    "nameBn": "আল-রাজি ইসলামিয়া হাসপাতাল",
    "category": "hospital",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Mirpur-10",
    "coords": {
      "latitude": 23.8065,
      "longitude": 90.3685
    },
    "keywords": [
      "al razi",
      "al-razi",
      "mirpur-10",
      "আল-রাজি",
      "আল-রাজি ইসলামিয়া",
      "al-razi islamia hospital",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_asian_specialized_hospital",
    "name": "Asian Specialized Hospital",
    "nameBn": "এশিয়ান স্পেশালাইজড হাসপাতাল",
    "category": "hospital",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Mirpur-2",
    "coords": {
      "latitude": 23.8045,
      "longitude": 90.3625
    },
    "keywords": [
      "asian specialized",
      "mirpur-2",
      "এশিয়ান স্পেশালাইজড",
      "এশিয়ান স্পেশালাইজড হাসপাতাল",
      "asian specialized hospital",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_selina_hospital",
    "name": "Selina Hospital",
    "nameBn": "সেলিনা হাসপাতাল",
    "category": "hospital",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Mirpur-1",
    "coords": {
      "latitude": 23.802,
      "longitude": 90.355
    },
    "keywords": [
      "selina hospital",
      "mirpur-1",
      "সেলিনা",
      "সেলিনা হাসপাতাল",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_mirpur_eye_hospital",
    "name": "Mirpur Eye Hospital",
    "nameBn": "মিরপুর চক্ষু হাসপাতাল",
    "category": "hospital",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Mirpur-2",
    "coords": {
      "latitude": 23.805,
      "longitude": 90.36
    },
    "keywords": [
      "mirpur eye",
      "mirpur-2",
      "মিরপুর চক্ষু",
      "মিরপুর চক্ষু হাসপাতাল",
      "mirpur eye hospital",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_prime_general_hospital",
    "name": "Prime General Hospital",
    "nameBn": "প্রাইম জেনারেল হাসপাতাল",
    "category": "hospital",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Mirpur-10",
    "coords": {
      "latitude": 23.807,
      "longitude": 90.3685
    },
    "keywords": [
      "prime general",
      "mirpur-10",
      "প্রাইম জেনারেল",
      "প্রাইম জেনারেল হাসপাতাল",
      "prime general hospital",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_bubt_medical_center",
    "name": "BUBT Medical Center",
    "nameBn": "বিইউবিটি মেডিকেল সেন্টার",
    "category": "hospital",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "BUBT Campus, Mirpur-2",
    "coords": {
      "latitude": 23.8119,
      "longitude": 90.3572
    },
    "keywords": [
      "bubt medical",
      "campus medical",
      "বিইউবিটি মেডিকেল",
      "বিইউবিটি মেডিকেল সেন্টার",
      "bubt medical center",
      "bubt campus, mirpur-2",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_ibn_sina_hospital_kalyanpur",
    "name": "Ibn Sina Hospital (Kalyanpur)",
    "nameBn": "ইবনে সিনা মেডিকেল কলেজ",
    "category": "hospital",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Kalyanpur",
    "coords": {
      "latitude": 23.7795,
      "longitude": 90.36
    },
    "keywords": [
      "ibn sina kalyanpur",
      "ismch",
      "kalyanpur",
      "ইবনে সিনা কল্যাণপুর",
      "ইবনে সিনা মেডিকেল কলেজ",
      "ibn sina hospital (kalyanpur)",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_square_hospital",
    "name": "Square Hospital",
    "nameBn": "স্কয়ার হাসপাতাল",
    "category": "hospital",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Panthapath",
    "coords": {
      "latitude": 23.7533,
      "longitude": 90.3817
    },
    "keywords": [
      "square hospital",
      "panthapath",
      "square",
      "স্কয়ার",
      "স্কয়ার হাসপাতাল",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_ibn_sina_specialized_dhanmondi",
    "name": "Ibn Sina Specialized (Dhanmondi)",
    "nameBn": "ইবনে সিনা হাসপাতাল",
    "category": "hospital",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Dhanmondi Road 9A",
    "coords": {
      "latitude": 23.7471,
      "longitude": 90.3705
    },
    "keywords": [
      "ibn sina dhanmondi",
      "dhanmondi 9a",
      "specialized",
      "ইবনে সিনা ধানমন্ডি",
      "ইবনে সিনা হাসপাতাল",
      "ibn sina specialized (dhanmondi)",
      "dhanmondi road 9a",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_labaid_specialized_hospital",
    "name": "Labaid Specialized Hospital",
    "nameBn": "ল্যাবএইড হাসপাতাল",
    "category": "hospital",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Dhanmondi Road 4",
    "coords": {
      "latitude": 23.7438,
      "longitude": 90.3807
    },
    "keywords": [
      "labaid specialized",
      "labaid dhanmondi",
      "dhanmondi road 4",
      "ল্যাবএইড স্পেশালাইজড",
      "ল্যাবএইড হাসপাতাল",
      "labaid specialized hospital",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_labaid_cardiac_hospital",
    "name": "Labaid Cardiac Hospital",
    "nameBn": "ল্যাবএইড কার্ডিয়াক হাসপাতাল",
    "category": "hospital",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Dhanmondi Road 4",
    "coords": {
      "latitude": 23.7438,
      "longitude": 90.3807
    },
    "keywords": [
      "labaid cardiac",
      "cardiac dhanmondi",
      "ল্যাবএইড কার্ডিয়াক",
      "ল্যাবএইড কার্ডিয়াক হাসপাতাল",
      "labaid cardiac hospital",
      "dhanmondi road 4",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_labaid_cancer_hospital",
    "name": "Labaid Cancer Hospital",
    "nameBn": "ল্যাবএইড ক্যান্সার হাসপাতাল",
    "category": "hospital",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Green Road",
    "coords": {
      "latitude": 23.746,
      "longitude": 90.384
    },
    "keywords": [
      "labaid cancer",
      "green road",
      "ল্যাবএইড ক্যান্সার",
      "ল্যাবএইড ক্যান্সার হাসপাতাল",
      "labaid cancer hospital",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_anwer_khan_modern_hospital",
    "name": "Anwer Khan Modern Hospital",
    "nameBn": "আনোয়ার খান মডার্ন",
    "category": "hospital",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Dhanmondi Road 8",
    "coords": {
      "latitude": 23.7456,
      "longitude": 90.3776
    },
    "keywords": [
      "anwer khan",
      "dhanmondi road 8",
      "আনোয়ার খান মডার্ন",
      "anwer khan modern hospital",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_green_life_medical_college_hospital",
    "name": "Green Life Medical College Hospital",
    "nameBn": "গ্রিন লাইফ হাসপাতাল",
    "category": "hospital",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Green Road",
    "coords": {
      "latitude": 23.7495,
      "longitude": 90.3855
    },
    "keywords": [
      "green life",
      "green road",
      "গ্রিন লাইফ",
      "গ্রিন লাইফ হাসপাতাল",
      "green life medical college hospital",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_central_hospital_limited",
    "name": "Central Hospital Limited",
    "nameBn": "সেন্ট্রাল হাসপাতাল",
    "category": "hospital",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Green Road",
    "coords": {
      "latitude": 23.7447,
      "longitude": 90.3853
    },
    "keywords": [
      "central hospital",
      "green road",
      "সেন্ট্রাল হাসপাতাল",
      "central hospital limited",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_popular_medical_college_hospital",
    "name": "Popular Medical College Hospital",
    "nameBn": "পপুলার মেডিকেল",
    "category": "hospital",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Dhanmondi Road 2",
    "coords": {
      "latitude": 23.7431,
      "longitude": 90.3792
    },
    "keywords": [
      "popular medical",
      "popular dhanmondi",
      "dhanmondi road 2",
      "পপুলার ধানমন্ডি",
      "পপুলার মেডিকেল",
      "popular medical college hospital",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_brb_hospitals_limited",
    "name": "BRB Hospitals Limited",
    "nameBn": "বিআরবি হাসপাতাল",
    "category": "hospital",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Panthapath",
    "coords": {
      "latitude": 23.7515,
      "longitude": 90.384
    },
    "keywords": [
      "brb",
      "brb hospital",
      "panthapath",
      "বিআরবি",
      "বিআরবি হাসপাতাল",
      "brb hospitals limited",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_samorita_hospital",
    "name": "Samorita Hospital",
    "nameBn": "সমরিতা হাসপাতাল",
    "category": "hospital",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Panthapath",
    "coords": {
      "latitude": 23.752,
      "longitude": 90.3835
    },
    "keywords": [
      "samorita",
      "panthapath",
      "সমরিতা",
      "সমরিতা হাসপাতাল",
      "samorita hospital",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_comfort_nursing_home_hospital",
    "name": "Comfort Nursing Home & Hospital",
    "nameBn": "কমফোর্ট হাসপাতাল",
    "category": "hospital",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Green Road",
    "coords": {
      "latitude": 23.748,
      "longitude": 90.385
    },
    "keywords": [
      "comfort hospital",
      "green road",
      "কমফোর্ট",
      "কমফোর্ট হাসপাতাল",
      "comfort nursing home & hospital",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_japan_bangladesh_friendship_hospital",
    "name": "Japan Bangladesh Friendship Hospital",
    "nameBn": "জাপান বাংলাদেশ ফ্রেন্ডশিপ",
    "category": "hospital",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Dhanmondi Road 55",
    "coords": {
      "latitude": 23.745,
      "longitude": 90.372
    },
    "keywords": [
      "japan bangladesh",
      "jbfh",
      "dhanmondi",
      "জাপান বাংলাদেশ",
      "জাপান বাংলাদেশ ফ্রেন্ডশিপ",
      "japan bangladesh friendship hospital",
      "dhanmondi road 55",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_harun_eye_foundation_hospital",
    "name": "Harun Eye Foundation Hospital",
    "nameBn": "হারুন আই ফাউন্ডেশন",
    "category": "hospital",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Dhanmondi Road 6",
    "coords": {
      "latitude": 23.744,
      "longitude": 90.375
    },
    "keywords": [
      "harun eye",
      "dhanmondi",
      "হারুন আই",
      "হারুন আই ফাউন্ডেশন",
      "harun eye foundation hospital",
      "dhanmondi road 6",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_medinova_medical_services",
    "name": "Medinova Medical Services",
    "nameBn": "মেদিনোভা মেডিকেল সার্ভিসেস",
    "category": "hospital",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Dhanmondi",
    "coords": {
      "latitude": 23.7445,
      "longitude": 90.378
    },
    "keywords": [
      "medinova",
      "dhanmondi",
      "মেদিনোভা",
      "মেদিনোভা মেডিকেল",
      "medinova medical services",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_renaissance_hospital",
    "name": "Renaissance Hospital",
    "nameBn": "রেনেসাঁ হাসপাতাল",
    "category": "hospital",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Dhanmondi Road 27",
    "coords": {
      "latitude": 23.7525,
      "longitude": 90.372
    },
    "keywords": [
      "renaissance",
      "dhanmondi 27",
      "রেনেসাঁ",
      "রেনেসাঁ হাসপাতাল",
      "renaissance hospital",
      "dhanmondi road 27",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_bangladesh_specialized_hospital",
    "name": "Bangladesh Specialized Hospital",
    "nameBn": "বাংলাদেশ স্পেশালাইজড",
    "category": "hospital",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Shyamoli",
    "coords": {
      "latitude": 23.7719,
      "longitude": 90.3639
    },
    "keywords": [
      "bangladesh specialized",
      "bsh",
      "shyamoli",
      "বাংলাদেশ স্পেশালাইজড",
      "bangladesh specialized hospital",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_dhaka_central_international_hospital",
    "name": "Dhaka Central International Hospital",
    "nameBn": "ঢাকা সেন্ট্রাল ইন্টারন্যাশনাল",
    "category": "hospital",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Shyamoli Ring Road",
    "coords": {
      "latitude": 23.771,
      "longitude": 90.3605
    },
    "keywords": [
      "central international",
      "shyamoli ring road",
      "ঢাকা সেন্ট্রাল",
      "ঢাকা সেন্ট্রাল ইন্টারন্যাশনাল",
      "dhaka central international hospital",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_trauma_center_hospital",
    "name": "Trauma Center & Hospital",
    "nameBn": "ট্রমা সেন্টার",
    "category": "hospital",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Shyamoli",
    "coords": {
      "latitude": 23.7722,
      "longitude": 90.364
    },
    "keywords": [
      "trauma center",
      "shyamoli",
      "ট্রমা সেন্টার",
      "trauma center & hospital",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_bosh_bangladesh_orthopaedic",
    "name": "BOSH (Bangladesh Orthopaedic)",
    "nameBn": "বাংলাদেশ অর্থোপেডিক হাসপাতাল",
    "category": "hospital",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Shyamoli",
    "coords": {
      "latitude": 23.7715,
      "longitude": 90.3635
    },
    "keywords": [
      "bosh",
      "orthopaedic hospital",
      "shyamoli",
      "অর্থোপেডিক",
      "বাংলাদেশ অর্থোপেডিক",
      "bosh (bangladesh orthopaedic)",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_city_hospital",
    "name": "City Hospital",
    "nameBn": "সিটি হাসপাতাল",
    "category": "hospital",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Mohammadpur",
    "coords": {
      "latitude": 23.763,
      "longitude": 90.362
    },
    "keywords": [
      "city hospital",
      "mohammadpur",
      "সিটি হাসপাতাল",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_care_medical_college_hospital",
    "name": "Care Medical College Hospital",
    "nameBn": "কেয়ার মেডিকেল কলেজ",
    "category": "hospital",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Mohammadpur",
    "coords": {
      "latitude": 23.764,
      "longitude": 90.361
    },
    "keywords": [
      "care medical",
      "mohammadpur",
      "কেয়ার মেডিকেল",
      "কেয়ার মেডিকেল কলেজ",
      "care medical college hospital",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_al_manar_hospital",
    "name": "Al-Manar Hospital",
    "nameBn": "আল-মানার হাসপাতাল",
    "category": "hospital",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Mohammadpur",
    "coords": {
      "latitude": 23.765,
      "longitude": 90.36
    },
    "keywords": [
      "al manar",
      "al-manar",
      "mohammadpur",
      "আল-মানার",
      "আল-মানার হাসপাতাল",
      "al-manar hospital",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_z_h_sikder_women_medical_college_hospital",
    "name": "Z.H. Sikder Women Medical College Hospital",
    "nameBn": "সিকদার মহিলা মেডিকেল কলেজ",
    "category": "hospital",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Rayerbazar / Dhanmondi",
    "coords": {
      "latitude": 23.745,
      "longitude": 90.358
    },
    "keywords": [
      "sikder medical",
      "rayerbazar",
      "সিকদার মেডিকেল",
      "সিকদার মহিলা মেডিকেল কলেজ",
      "z.h. sikder women medical college hospital",
      "rayerbazar / dhanmondi",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_evercare_hospital",
    "name": "Evercare Hospital",
    "nameBn": "এভারকেয়ার হাসপাতাল",
    "category": "hospital",
    "zone": "Mohakhali & Gulshan",
    "zoneBn": "মহাখালী ও গুলশান",
    "subLocation": "Bashundhara R/A",
    "coords": {
      "latitude": 23.8103,
      "longitude": 90.4312
    },
    "keywords": [
      "evercare",
      "apollo",
      "bashundhara",
      "এভারকেয়ার",
      "এভারকেয়ার হাসপাতাল",
      "evercare hospital",
      "bashundhara r/a",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_united_hospital",
    "name": "United Hospital",
    "nameBn": "ইউনাইটেড হাসপাতাল",
    "category": "hospital",
    "zone": "Mohakhali & Gulshan",
    "zoneBn": "মহাখালী ও গুলশান",
    "subLocation": "Gulshan-2",
    "coords": {
      "latitude": 23.7997,
      "longitude": 90.4182
    },
    "keywords": [
      "united hospital",
      "gulshan-2",
      "gulshan",
      "ইউনাইটেড",
      "ইউনাইটেড হাসপাতাল",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_praava_health",
    "name": "Praava Health",
    "nameBn": "প্রাভা হেলথ",
    "category": "hospital",
    "zone": "Mohakhali & Gulshan",
    "zoneBn": "মহাখালী ও গুলশান",
    "subLocation": "Banani",
    "coords": {
      "latitude": 23.7937,
      "longitude": 90.4043
    },
    "keywords": [
      "praava health",
      "banani",
      "প্রাভা হেলথ",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_universal_medical_college_hospital_aysha_memorial",
    "name": "Universal Medical College Hospital (Aysha Memorial)",
    "nameBn": "ইউনিভার্সাল মেডিকেল কলেজ (আয়েশা মেমোরিয়াল)",
    "category": "hospital",
    "zone": "Mohakhali & Gulshan",
    "zoneBn": "মহাখালী ও গুলশান",
    "subLocation": "Mohakhali",
    "coords": {
      "latitude": 23.7745,
      "longitude": 90.402
    },
    "keywords": [
      "universal medical",
      "aysha memorial",
      "mohakhali",
      "আয়েশা মেমোরিয়াল",
      "ইউনিভার্সাল মেডিকেল",
      "universal medical college hospital (aysha memorial)",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_metropolitan_medical_centre",
    "name": "Metropolitan Medical Centre",
    "nameBn": "মেট্রোপলিটন মেডিকেল সেন্টার",
    "category": "hospital",
    "zone": "Mohakhali & Gulshan",
    "zoneBn": "মহাখালী ও গুলশান",
    "subLocation": "Mohakhali",
    "coords": {
      "latitude": 23.775,
      "longitude": 90.4025
    },
    "keywords": [
      "metropolitan",
      "mohakhali",
      "মেট্রোপলিটন",
      "মেট্রোপলিটন মেডিকেল",
      "metropolitan medical centre",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_amz_hospital",
    "name": "AMZ Hospital",
    "nameBn": "এএমজেড হাসপাতাল",
    "category": "hospital",
    "zone": "Mohakhali & Gulshan",
    "zoneBn": "মহাখালী ও গুলশান",
    "subLocation": "Uttar Badda",
    "coords": {
      "latitude": 23.7845,
      "longitude": 90.4255
    },
    "keywords": [
      "amz hospital",
      "badda",
      "এএমজেড",
      "এএমজেড হাসপাতাল",
      "uttar badda",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_badda_general_hospital",
    "name": "Badda General Hospital",
    "nameBn": "বাড্ডা জেনারেল হাসপাতাল",
    "category": "hospital",
    "zone": "Mohakhali & Gulshan",
    "zoneBn": "মহাখালী ও গুলশান",
    "subLocation": "Badda",
    "coords": {
      "latitude": 23.782,
      "longitude": 90.425
    },
    "keywords": [
      "badda general",
      "বাড্ডা জেনারেল",
      "বাড্ডা জেনারেল হাসপাতাল",
      "badda general hospital",
      "badda",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_uttara_crescent_hospital",
    "name": "Uttara Crescent Hospital",
    "nameBn": "উত্তরা ক্রিসেন্ট হাসপাতাল",
    "category": "hospital",
    "zone": "Uttara & North",
    "zoneBn": "উত্তরা ও উত্তর ঢাকা",
    "subLocation": "Uttara Sector 3",
    "coords": {
      "latitude": 23.868,
      "longitude": 90.396
    },
    "keywords": [
      "uttara crescent",
      "sector 3",
      "উত্তরা ক্রিসেন্ট",
      "উত্তরা ক্রিসেন্ট হাসপাতাল",
      "uttara crescent hospital",
      "uttara sector 3",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_lubana_general_hospital",
    "name": "Lubana General Hospital",
    "nameBn": "লুবানা জেনারেল হাসপাতাল",
    "category": "hospital",
    "zone": "Uttara & North",
    "zoneBn": "উত্তরা ও উত্তর ঢাকা",
    "subLocation": "Uttara Sector 3",
    "coords": {
      "latitude": 23.8685,
      "longitude": 90.3965
    },
    "keywords": [
      "lubana",
      "uttara sector 3",
      "লুবানা",
      "লুবানা জেনারেল",
      "lubana general hospital",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_aichi_hospital",
    "name": "Aichi Hospital",
    "nameBn": "আইচি হাসপাতাল",
    "category": "hospital",
    "zone": "Uttara & North",
    "zoneBn": "উত্তরা ও উত্তর ঢাকা",
    "subLocation": "Uttara Sector 8",
    "coords": {
      "latitude": 23.876,
      "longitude": 90.402
    },
    "keywords": [
      "aichi",
      "uttara sector 8",
      "আইচি",
      "আইচি হাসপাতাল",
      "aichi hospital",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_shin_shin_japan_hospital",
    "name": "Shin-Shin Japan Hospital",
    "nameBn": "শিন-শিন জাপান হাসপাতাল",
    "category": "hospital",
    "zone": "Uttara & North",
    "zoneBn": "উত্তরা ও উত্তর ঢাকা",
    "subLocation": "Uttara Sector 11",
    "coords": {
      "latitude": 23.878,
      "longitude": 90.391
    },
    "keywords": [
      "shin shin",
      "japan hospital",
      "uttara 11",
      "শিন-শিন",
      "শিন-শিন জাপান",
      "shin-shin japan hospital",
      "uttara sector 11",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_ship_international_hospital",
    "name": "Ship International Hospital",
    "nameBn": "শীপ ইন্টারন্যাশনাল হাসপাতাল",
    "category": "hospital",
    "zone": "Uttara & North",
    "zoneBn": "উত্তরা ও উত্তর ঢাকা",
    "subLocation": "Uttara Sector 9",
    "coords": {
      "latitude": 23.873,
      "longitude": 90.392
    },
    "keywords": [
      "ship international",
      "uttara sector 9",
      "শীপ",
      "শীপ ইন্টারন্যাশনাল",
      "ship international hospital",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_uttara_adhunik_medical_college_hospital",
    "name": "Uttara Adhunik Medical College Hospital",
    "nameBn": "উত্তরা আধুনিক মেডিকেল কলেজ",
    "category": "hospital",
    "zone": "Uttara & North",
    "zoneBn": "উত্তরা ও উত্তর ঢাকা",
    "subLocation": "Uttara Sector 1",
    "coords": {
      "latitude": 23.862,
      "longitude": 90.398
    },
    "keywords": [
      "uttara adhunik",
      "sector 1",
      "উত্তরা আধুনিক",
      "উত্তরা আধুনিক মেডিকেল",
      "uttara adhunik medical college hospital",
      "uttara sector 1",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_radium_general_hospital",
    "name": "Radium General Hospital",
    "nameBn": "রেডিয়াম জেনারেল হাসপাতাল",
    "category": "hospital",
    "zone": "Uttara & North",
    "zoneBn": "উত্তরা ও উত্তর ঢাকা",
    "subLocation": "Uttara Sector 3",
    "coords": {
      "latitude": 23.869,
      "longitude": 90.3955
    },
    "keywords": [
      "radium general",
      "uttara sector 3",
      "রেডিয়াম",
      "রেডিয়াম জেনারেল",
      "radium general hospital",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_ahsania_mission_general_hospital",
    "name": "Ahsania Mission General Hospital",
    "nameBn": "আহছানিয়া মিশন জেনারেল হাসপাতাল",
    "category": "hospital",
    "zone": "Uttara & North",
    "zoneBn": "উত্তরা ও উত্তর ঢাকা",
    "subLocation": "Uttara Sector 10",
    "coords": {
      "latitude": 23.8647,
      "longitude": 90.3958
    },
    "keywords": [
      "ahsania general",
      "uttara 10",
      "আহছানিয়া মিশন জেনারেল",
      "ahsania mission general hospital",
      "uttara sector 10",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_east_west_medical_college_hospital",
    "name": "East West Medical College Hospital",
    "nameBn": "ইস্ট ওয়েস্ট মেডিকেল",
    "category": "hospital",
    "zone": "Uttara & North",
    "zoneBn": "উত্তরা ও উত্তর ঢাকা",
    "subLocation": "Turag",
    "coords": {
      "latitude": 23.882,
      "longitude": 90.355
    },
    "keywords": [
      "east west medical",
      "turag",
      "ইস্ট ওয়েস্ট",
      "ইস্ট ওয়েস্ট মেডিকেল",
      "east west medical college hospital",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_holy_family_red_crescent_hospital",
    "name": "Holy Family Red Crescent Hospital",
    "nameBn": "হলি ফ্যামিলি হাসপাতাল",
    "category": "hospital",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Eskaton",
    "coords": {
      "latitude": 23.746,
      "longitude": 90.404
    },
    "keywords": [
      "holy family",
      "red crescent",
      "eskaton",
      "হলি ফ্যামিলি",
      "হলি ফ্যামিলি হাসপাতাল",
      "holy family red crescent hospital",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_ad_din_women_s_medical_college",
    "name": "Ad-din Women’s Medical College",
    "nameBn": "আদ-দ্বীন হাসপাতাল",
    "category": "hospital",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Moghbazar",
    "coords": {
      "latitude": 23.7475,
      "longitude": 90.406
    },
    "keywords": [
      "ad-din",
      "addin",
      "moghbazar",
      "আদ-দ্বীন",
      "আদ-দ্বীন হাসপাতাল",
      "ad-din women’s medical college",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_insaf_barakah_kidney_hospital",
    "name": "Insaf Barakah Kidney Hospital",
    "nameBn": "ইনসাফ বারাকাহ হাসপাতাল",
    "category": "hospital",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Moghbazar",
    "coords": {
      "latitude": 23.7485,
      "longitude": 90.4055
    },
    "keywords": [
      "insaf barakah",
      "moghbazar",
      "ইনসাফ বারাকাহ",
      "ইনসাফ বারাকাহ হাসপাতাল",
      "insaf barakah kidney hospital",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_dhaka_community_medical_college_hospital",
    "name": "Dhaka Community Medical College Hospital",
    "nameBn": "ঢাকা কমিউনিটি মেডিকেল কলেজ",
    "category": "hospital",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Moghbazar",
    "coords": {
      "latitude": 23.746,
      "longitude": 90.407
    },
    "keywords": [
      "dhaka community",
      "moghbazar",
      "কমিউনিটি মেডিকেল",
      "ঢাকা কমিউনিটি",
      "dhaka community medical college hospital",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_city_dental_college_hospital",
    "name": "City Dental College & Hospital",
    "nameBn": "সিটি ডেন্টাল কলেজ হাসপাতাল",
    "category": "hospital",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Moghbazar",
    "coords": {
      "latitude": 23.747,
      "longitude": 90.405
    },
    "keywords": [
      "city dental",
      "moghbazar",
      "সিটি ডেন্টাল",
      "সিটি ডেন্টাল কলেজ",
      "city dental college & hospital",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_sirajul_islam_medical_college_hospital",
    "name": "Sirajul Islam Medical College Hospital",
    "nameBn": "সিরাজুল ইসলাম মেডিকেল কলেজ",
    "category": "hospital",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Malibagh",
    "coords": {
      "latitude": 23.751,
      "longitude": 90.414
    },
    "keywords": [
      "sirajul islam",
      "malibagh",
      "সিরাজুল ইসলাম",
      "সিরাজুল ইসলাম মেডিকেল",
      "sirajul islam medical college hospital",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_islami_bank_central_hospital",
    "name": "Islami Bank Central Hospital",
    "nameBn": "ইসলামী ব্যাংক হাসপাতাল",
    "category": "hospital",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Kakrail",
    "coords": {
      "latitude": 23.738,
      "longitude": 90.41
    },
    "keywords": [
      "islami bank",
      "kakrail",
      "ইসলামী ব্যাংক",
      "ইসলামী ব্যাংক হাসপাতাল",
      "islami bank central hospital",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_al_baraka_hospital",
    "name": "Al-Baraka Hospital",
    "nameBn": "আল-বারাকা হাসপাতাল",
    "category": "hospital",
    "zone": "Motijheel & East",
    "zoneBn": "মতিঝিল ও পূর্ব ঢাকা",
    "subLocation": "Rajarbagh",
    "coords": {
      "latitude": 23.741,
      "longitude": 90.415
    },
    "keywords": [
      "al baraka",
      "rajarbagh",
      "আল-বারাকা",
      "আল-বারাকা হাসপাতাল",
      "al-baraka hospital",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_al_haramain_hospital",
    "name": "Al-Haramain Hospital",
    "nameBn": "আল-হারামাইন হাসপাতাল",
    "category": "hospital",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Shantinagar",
    "coords": {
      "latitude": 23.7405,
      "longitude": 90.412
    },
    "keywords": [
      "al haramain",
      "shantinagar",
      "আল-হারামাইন",
      "আল-হারামাইন হাসপাতাল",
      "al-haramain hospital",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_farazy_hospital",
    "name": "Farazy Hospital",
    "nameBn": "ফরাজী হাসপাতাল",
    "category": "hospital",
    "zone": "Motijheel & East",
    "zoneBn": "মতিঝিল ও পূর্ব ঢাকা",
    "subLocation": "Banasree Block E",
    "coords": {
      "latitude": 23.763,
      "longitude": 90.432
    },
    "keywords": [
      "farazy",
      "banasree",
      "ফরাজী",
      "ফরাজী হাসপাতাল",
      "farazy hospital",
      "banasree block e",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_impulse_hospital",
    "name": "Impulse Hospital",
    "nameBn": "ইম্পালস হাসপাতাল",
    "category": "hospital",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Tejgaon Industrial Area",
    "coords": {
      "latitude": 23.766,
      "longitude": 90.402
    },
    "keywords": [
      "impulse",
      "tejgaon",
      "ইম্পালস",
      "ইম্পালস হাসপাতাল",
      "impulse hospital",
      "tejgaon industrial area",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_asgar_ali_hospital",
    "name": "Asgar Ali Hospital",
    "nameBn": "আজগর আলী হাসপাতাল",
    "category": "hospital",
    "zone": "Old Dhaka & Sadarghat",
    "zoneBn": "পুরান ঢাকা ও সদরঘাট",
    "subLocation": "Gandaria",
    "coords": {
      "latitude": 23.705,
      "longitude": 90.428
    },
    "keywords": [
      "asgar ali",
      "gandaria",
      "old dhaka",
      "আজগর আলী",
      "আজগর আলী হাসপাতাল",
      "asgar ali hospital",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_dhaka_national_medical_college",
    "name": "Dhaka National Medical College",
    "nameBn": "ঢাকা ন্যাশনাল মেডিকেল",
    "category": "hospital",
    "zone": "Old Dhaka & Sadarghat",
    "zoneBn": "পুরান ঢাকা ও সদরঘাট",
    "subLocation": "Old Dhaka (Johnson Road)",
    "coords": {
      "latitude": 23.711,
      "longitude": 90.412
    },
    "keywords": [
      "dhaka national",
      "johnson road",
      "old dhaka",
      "ঢাকা ন্যাশনাল",
      "dhaka national medical college",
      "old dhaka (johnson road)",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_salahuddin_specialized_hospital",
    "name": "Salahuddin Specialized Hospital",
    "nameBn": "সালাহউদ্দীন স্পেশালাইজড হাসপাতাল",
    "category": "hospital",
    "zone": "Old Dhaka & Sadarghat",
    "zoneBn": "পুরান ঢাকা ও সদরঘাট",
    "subLocation": "Wari, Old Dhaka",
    "coords": {
      "latitude": 23.716,
      "longitude": 90.42
    },
    "keywords": [
      "salahuddin",
      "wari",
      "সালাহউদ্দীন",
      "সালাহউদ্দীন স্পেশালাইজড",
      "salahuddin specialized hospital",
      "wari, old dhaka",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_sumona_clinic_hospital",
    "name": "Sumona Clinic & Hospital",
    "nameBn": "সুমনা ক্লিনিক ও হাসপাতাল",
    "category": "hospital",
    "zone": "Old Dhaka & Sadarghat",
    "zoneBn": "পুরান ঢাকা ও সদরঘাট",
    "subLocation": "Patuatuly, Sadarghat",
    "coords": {
      "latitude": 23.71,
      "longitude": 90.413
    },
    "keywords": [
      "sumona clinic",
      "sadarghat",
      "patuatuly",
      "সুমনা",
      "সুমনা ক্লিনিক",
      "sumona clinic & hospital",
      "patuatuly, sadarghat",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_dr_mahbubur_rahman_mollah_hospital",
    "name": "Dr. Mahbubur Rahman Mollah Hospital",
    "nameBn": "ডাঃ মাহবুবুর রহমান মোল্লা হাসপাতাল",
    "category": "hospital",
    "zone": "Motijheel & East",
    "zoneBn": "মতিঝিল ও পূর্ব ঢাকা",
    "subLocation": "Demra",
    "coords": {
      "latitude": 23.715,
      "longitude": 90.47
    },
    "keywords": [
      "mollah hospital",
      "demra",
      "মোল্লা হাসপাতাল",
      "মাহবুবুর রহমান মোল্লা",
      "dr. mahbubur rahman mollah hospital",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_enam_medical_college_hospital",
    "name": "Enam Medical College & Hospital",
    "nameBn": "এনাম মেডিকেল কলেজ",
    "category": "hospital",
    "zone": "Greater Dhaka & Suburbs",
    "zoneBn": "বৃহত্তর ঢাকা ও শহরতলি",
    "subLocation": "Savar",
    "coords": {
      "latitude": 23.8519,
      "longitude": 90.2612
    },
    "keywords": [
      "enam medical",
      "savar",
      "এনাম মেডিকেল",
      "এনাম মেডিকেল কলেজ",
      "enam medical college & hospital",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_monno_medical_college_hospital",
    "name": "Monno Medical College Hospital",
    "nameBn": "মুন্নু মেডিকেল কলেজ হাসপাতাল",
    "category": "hospital",
    "zone": "Greater Dhaka & Suburbs",
    "zoneBn": "বৃহত্তর ঢাকা ও শহরতলি",
    "subLocation": "Savar",
    "coords": {
      "latitude": 23.865,
      "longitude": 90.245
    },
    "keywords": [
      "monno medical",
      "savar",
      "মুন্নু মেডিকেল",
      "মুন্নু মেডিকেল কলেজ",
      "monno medical college hospital",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "hosp_international_medical_college_hospital",
    "name": "International Medical College Hospital",
    "nameBn": "আন্তর্জাতিক মেডিকেল কলেজ",
    "category": "hospital",
    "zone": "Greater Dhaka & Suburbs",
    "zoneBn": "বৃহত্তর ঢাকা ও শহরতলি",
    "subLocation": "Tongi",
    "coords": {
      "latitude": 23.91,
      "longitude": 90.43
    },
    "keywords": [
      "international medical",
      "tongi",
      "আন্তর্জাতিক মেডিকেল",
      "international medical college hospital",
      "hospital",
      "হাসপাতাল",
      "চিকিৎসা"
    ]
  },
  {
    "id": "area_mirpur",
    "name": "Mirpur",
    "nameBn": "মিরপুর জেনারেল হাসপাতাল",
    "category": "area",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Mirpur, Dhaka",
    "coords": {
      "latitude": 23.8078,
      "longitude": 90.3582
    },
    "keywords": [
      "mirpur",
      "mirpur",
      "মিরপুর জেনারেল হাসপাতাল",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_mirpur_2",
    "name": "Mirpur 2",
    "nameBn": "মিরপুর-২ (বিইউবিটি)",
    "category": "area",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Mirpur 2, Dhaka",
    "coords": {
      "latitude": 23.8078,
      "longitude": 90.3582
    },
    "keywords": [
      "mirpur-2",
      "mirpur 2",
      "মিরপুর-২ (বিইউবিটি)",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_mirpur_1",
    "name": "Mirpur 1",
    "nameBn": "পপুলার হাসপাতাল",
    "category": "area",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Mirpur 1, Dhaka",
    "coords": {
      "latitude": 23.7956,
      "longitude": 90.3537
    },
    "keywords": [
      "mirpur-1",
      "mirpur 1",
      "পপুলার হাসপাতাল",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_mirpur_3",
    "name": "Mirpur 3",
    "nameBn": "মিরপুর-৩",
    "category": "area",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Mirpur 3, Dhaka",
    "coords": {
      "latitude": 23.811,
      "longitude": 90.36
    },
    "keywords": [
      "mirpur-3",
      "mirpur 3",
      "মিরপুর-৩",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_mirpur_6",
    "name": "Mirpur 6",
    "nameBn": "মিরপুর-৬",
    "category": "area",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Mirpur 6, Dhaka",
    "coords": {
      "latitude": 23.808,
      "longitude": 90.362
    },
    "keywords": [
      "mirpur-6",
      "mirpur 6",
      "মিরপুর-৬",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_mirpur_7",
    "name": "Mirpur 7",
    "nameBn": "মিরপুর-৭",
    "category": "area",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Mirpur 7, Dhaka",
    "coords": {
      "latitude": 23.818,
      "longitude": 90.36
    },
    "keywords": [
      "mirpur-7",
      "mirpur 7",
      "মিরপুর-৭",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_mirpur_10",
    "name": "Mirpur 10",
    "nameBn": "পপুলার হাসপাতাল",
    "category": "area",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Mirpur 10, Dhaka",
    "coords": {
      "latitude": 23.8071,
      "longitude": 90.3686
    },
    "keywords": [
      "mirpur-10",
      "mirpur 10",
      "পপুলার হাসপাতাল",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_mirpur_11",
    "name": "Mirpur 11",
    "nameBn": "মিরপুর-১১",
    "category": "area",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Mirpur 11, Dhaka",
    "coords": {
      "latitude": 23.8175,
      "longitude": 90.3662
    },
    "keywords": [
      "mirpur-11",
      "mirpur 11",
      "মিরপুর-১১",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_mirpur_11_5",
    "name": "Mirpur 11.5",
    "nameBn": "মিরপুর-১১.৫ (পুরবী)",
    "category": "area",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Mirpur 11.5, Dhaka",
    "coords": {
      "latitude": 23.821,
      "longitude": 90.365
    },
    "keywords": [
      "mirpur-11.5",
      "mirpur 11.5",
      "মিরপুর-১১.৫ (পুরবী)",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_purobi",
    "name": "Purobi",
    "nameBn": "মিরপুর-১১.৫ (পুরবী)",
    "category": "area",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Purobi, Dhaka",
    "coords": {
      "latitude": 23.821,
      "longitude": 90.365
    },
    "keywords": [
      "purobi",
      "purobi",
      "মিরপুর-১১.৫ (পুরবী)",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_mirpur_12",
    "name": "Mirpur 12",
    "nameBn": "মিরপুর-১২",
    "category": "area",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Mirpur 12, Dhaka",
    "coords": {
      "latitude": 23.8277,
      "longitude": 90.3644
    },
    "keywords": [
      "mirpur-12",
      "mirpur 12",
      "মিরপুর-১২",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_mirpur_12_dohs",
    "name": "Mirpur 12 Dohs",
    "nameBn": "মিরপুর ডিওএইচএস",
    "category": "area",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Mirpur 12 Dohs, Dhaka",
    "coords": {
      "latitude": 23.832,
      "longitude": 90.37
    },
    "keywords": [
      "mirpur-12 dohs",
      "mirpur 12 dohs",
      "মিরপুর ডিওএইচএস",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_dohs_mirpur",
    "name": "Dohs Mirpur",
    "nameBn": "Dohs Mirpur",
    "category": "area",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Dohs Mirpur, Dhaka",
    "coords": {
      "latitude": 23.832,
      "longitude": 90.37
    },
    "keywords": [
      "dohs mirpur",
      "dohs mirpur",
      "dohs mirpur",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_mirpur_13",
    "name": "Mirpur 13",
    "nameBn": "মিরপুর-১৩",
    "category": "area",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Mirpur 13, Dhaka",
    "coords": {
      "latitude": 23.802,
      "longitude": 90.375
    },
    "keywords": [
      "mirpur-13",
      "mirpur 13",
      "মিরপুর-১৩",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_mirpur_14",
    "name": "Mirpur 14",
    "nameBn": "মিরপুর-১৪",
    "category": "area",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Mirpur 14, Dhaka",
    "coords": {
      "latitude": 23.798,
      "longitude": 90.383
    },
    "keywords": [
      "mirpur-14",
      "mirpur 14",
      "মিরপুর-১৪",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_pallabi",
    "name": "Pallabi",
    "nameBn": "পল্লবী",
    "category": "area",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Pallabi, Dhaka",
    "coords": {
      "latitude": 23.824,
      "longitude": 90.362
    },
    "keywords": [
      "pallabi",
      "pallabi",
      "পল্লবী",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_rupnagar",
    "name": "Rupnagar",
    "nameBn": "রূপনগর আবাসিক এলাকা",
    "category": "area",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Rupnagar, Dhaka",
    "coords": {
      "latitude": 23.8119,
      "longitude": 90.3572
    },
    "keywords": [
      "rupnagar",
      "rupnagar",
      "রূপনগর আবাসিক এলাকা",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_paikpara",
    "name": "Paikpara",
    "nameBn": "পাইকপাড়া",
    "category": "area",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Paikpara, Dhaka",
    "coords": {
      "latitude": 23.785,
      "longitude": 90.36
    },
    "keywords": [
      "paikpara",
      "paikpara",
      "পাইকপাড়া",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_pirerbag",
    "name": "Pirerbag",
    "nameBn": "পীরেরবাগ",
    "category": "area",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Pirerbag, Dhaka",
    "coords": {
      "latitude": 23.788,
      "longitude": 90.362
    },
    "keywords": [
      "pirerbag",
      "pirerbag",
      "পীরেরবাগ",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_monipur",
    "name": "Monipur",
    "nameBn": "মণিপুর",
    "category": "area",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Monipur, Dhaka",
    "coords": {
      "latitude": 23.795,
      "longitude": 90.365
    },
    "keywords": [
      "monipur",
      "monipur",
      "মণিপুর",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_kazipara",
    "name": "Kazipara",
    "nameBn": "কাজীপাড়া",
    "category": "area",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Kazipara, Dhaka",
    "coords": {
      "latitude": 23.7915,
      "longitude": 90.3725
    },
    "keywords": [
      "kazipara",
      "kazipara",
      "কাজীপাড়া",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_shewrapara",
    "name": "Shewrapara",
    "nameBn": "শেওড়াপাড়া",
    "category": "area",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Shewrapara, Dhaka",
    "coords": {
      "latitude": 23.786,
      "longitude": 90.374
    },
    "keywords": [
      "shewrapara",
      "shewrapara",
      "শেওড়াপাড়া",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_ibrahimpur",
    "name": "Ibrahimpur",
    "nameBn": "ইব্রাহিমপুর",
    "category": "area",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Ibrahimpur, Dhaka",
    "coords": {
      "latitude": 23.793,
      "longitude": 90.388
    },
    "keywords": [
      "ibrahimpur",
      "ibrahimpur",
      "ইব্রাহিমপুর",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_kafrul",
    "name": "Kafrul",
    "nameBn": "কাফরুল",
    "category": "area",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Kafrul, Dhaka",
    "coords": {
      "latitude": 23.79,
      "longitude": 90.385
    },
    "keywords": [
      "kafrul",
      "kafrul",
      "কাফরুল",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_senpara_parbata",
    "name": "Senpara Parbata",
    "nameBn": "সেনপাড়া পর্বতা",
    "category": "area",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Senpara Parbata, Dhaka",
    "coords": {
      "latitude": 23.801,
      "longitude": 90.372
    },
    "keywords": [
      "senpara parbata",
      "senpara parbata",
      "সেনপাড়া পর্বতা",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_vashantek",
    "name": "Vashantek",
    "nameBn": "ভাষানটেক",
    "category": "area",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Vashantek, Dhaka",
    "coords": {
      "latitude": 23.805,
      "longitude": 90.392
    },
    "keywords": [
      "vashantek",
      "vashantek",
      "ভাষানটেক",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_darussalam",
    "name": "Darussalam",
    "nameBn": "দারুসসালাম",
    "category": "area",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Darussalam, Dhaka",
    "coords": {
      "latitude": 23.791,
      "longitude": 90.352
    },
    "keywords": [
      "darussalam",
      "darussalam",
      "দারুসসালাম",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_ansar_camp",
    "name": "Ansar Camp",
    "nameBn": "আনসার ক্যাম্প ও টোলারবাগ",
    "category": "area",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Ansar Camp, Dhaka",
    "coords": {
      "latitude": 23.8,
      "longitude": 90.355
    },
    "keywords": [
      "ansar camp",
      "ansar camp",
      "আনসার ক্যাম্প ও টোলারবাগ",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_tolabagh",
    "name": "Tolabagh",
    "nameBn": "আনসার ক্যাম্প ও টোলারবাগ",
    "category": "area",
    "zone": "Mirpur & Campus",
    "zoneBn": "মিরপুর ও ক্যাম্পাস এলাকা",
    "subLocation": "Tolabagh, Dhaka",
    "coords": {
      "latitude": 23.8,
      "longitude": 90.355
    },
    "keywords": [
      "tolabagh",
      "tolabagh",
      "আনসার ক্যাম্প ও টোলারবাগ",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_kalyanpur",
    "name": "Kalyanpur",
    "nameBn": "ইবনে সিনা মেডিকেল কলেজ",
    "category": "area",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Kalyanpur, Dhaka",
    "coords": {
      "latitude": 23.7795,
      "longitude": 90.36
    },
    "keywords": [
      "kalyanpur",
      "kalyanpur",
      "ইবনে সিনা মেডিকেল কলেজ",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_shyamoli",
    "name": "Shyamoli",
    "nameBn": "যক্ষ্মা হাসপাতাল শ্যামলী",
    "category": "area",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Shyamoli, Dhaka",
    "coords": {
      "latitude": 23.7725,
      "longitude": 90.3642
    },
    "keywords": [
      "shyamoli",
      "shyamoli",
      "যক্ষ্মা হাসপাতাল শ্যামলী",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_agargaon",
    "name": "Agargaon",
    "nameBn": "আগারগাঁও",
    "category": "area",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Agargaon, Dhaka",
    "coords": {
      "latitude": 23.7779,
      "longitude": 90.3807
    },
    "keywords": [
      "agargaon",
      "agargaon",
      "আগারগাঁও",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_sher_e_bangla_nagar",
    "name": "Sher E Bangla Nagar",
    "nameBn": "শেরেবাংলা নগর",
    "category": "area",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Sher E Bangla Nagar, Dhaka",
    "coords": {
      "latitude": 23.77,
      "longitude": 90.372
    },
    "keywords": [
      "sher-e-bangla nagar",
      "sher e bangla nagar",
      "শেরেবাংলা নগর",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_mohammadpur",
    "name": "Mohammadpur",
    "nameBn": "মোহাম্মদপুর",
    "category": "area",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Mohammadpur, Dhaka",
    "coords": {
      "latitude": 23.7658,
      "longitude": 90.3584
    },
    "keywords": [
      "mohammadpur",
      "mohammadpur",
      "মোহাম্মদপুর",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_lalmatia",
    "name": "Lalmatia",
    "nameBn": "লালমাটিয়া",
    "category": "area",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Lalmatia, Dhaka",
    "coords": {
      "latitude": 23.755,
      "longitude": 90.368
    },
    "keywords": [
      "lalmatia",
      "lalmatia",
      "লালমাটিয়া",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_adabor",
    "name": "Adabor",
    "nameBn": "আদাবর",
    "category": "area",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Adabor, Dhaka",
    "coords": {
      "latitude": 23.771,
      "longitude": 90.355
    },
    "keywords": [
      "adabor",
      "adabor",
      "আদাবর",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_japan_garden_city",
    "name": "Japan Garden City",
    "nameBn": "জাপান গার্ডেন সিটি",
    "category": "area",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Japan Garden City, Dhaka",
    "coords": {
      "latitude": 23.768,
      "longitude": 90.356
    },
    "keywords": [
      "japan garden city",
      "japan garden city",
      "জাপান গার্ডেন সিটি",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_bosila",
    "name": "Bosila",
    "nameBn": "বসিলা",
    "category": "area",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Bosila, Dhaka",
    "coords": {
      "latitude": 23.748,
      "longitude": 90.342
    },
    "keywords": [
      "bosila",
      "bosila",
      "বসিলা",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_gabtoli",
    "name": "Gabtoli",
    "nameBn": "গাবতলী",
    "category": "area",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Gabtoli, Dhaka",
    "coords": {
      "latitude": 23.784,
      "longitude": 90.345
    },
    "keywords": [
      "gabtoli",
      "gabtoli",
      "গাবতলী",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_town_hall",
    "name": "Town Hall",
    "nameBn": "টাউন হল ও তাজমহল রোড",
    "category": "area",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Town Hall, Dhaka",
    "coords": {
      "latitude": 23.761,
      "longitude": 90.364
    },
    "keywords": [
      "town hall",
      "town hall",
      "টাউন হল ও তাজমহল রোড",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_tajmahal_road",
    "name": "Tajmahal Road",
    "nameBn": "টাউন হল ও তাজমহল রোড",
    "category": "area",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Tajmahal Road, Dhaka",
    "coords": {
      "latitude": 23.762,
      "longitude": 90.363
    },
    "keywords": [
      "tajmahal road",
      "tajmahal road",
      "টাউন হল ও তাজমহল রোড",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_salimullah_road",
    "name": "Salimullah Road",
    "nameBn": "Salimullah Road",
    "category": "area",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Salimullah Road, Dhaka",
    "coords": {
      "latitude": 23.76,
      "longitude": 90.361
    },
    "keywords": [
      "salimullah road",
      "salimullah road",
      "salimullah road",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_noorjahan_road",
    "name": "Noorjahan Road",
    "nameBn": "সলিমুল্লাহ ও নুরজাহান রোড",
    "category": "area",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Noorjahan Road, Dhaka",
    "coords": {
      "latitude": 23.759,
      "longitude": 90.362
    },
    "keywords": [
      "noorjahan road",
      "noorjahan road",
      "সলিমুল্লাহ ও নুরজাহান রোড",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_shia_masjid",
    "name": "Shia Masjid",
    "nameBn": "শিয়া মসজিদ ও রিং রোড",
    "category": "area",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Shia Masjid, Dhaka",
    "coords": {
      "latitude": 23.768,
      "longitude": 90.359
    },
    "keywords": [
      "shia masjid",
      "shia masjid",
      "শিয়া মসজিদ ও রিং রোড",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_ring_road",
    "name": "Ring Road",
    "nameBn": "শিয়া মসজিদ ও রিং রোড",
    "category": "area",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Ring Road, Dhaka",
    "coords": {
      "latitude": 23.771,
      "longitude": 90.361
    },
    "keywords": [
      "ring road",
      "ring road",
      "শিয়া মসজিদ ও রিং রোড",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_chandrima_udyan",
    "name": "Chandrima Udyan",
    "nameBn": "চন্দ্রিমা উদ্যান হাউজিং",
    "category": "area",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Chandrima Udyan, Dhaka",
    "coords": {
      "latitude": 23.766,
      "longitude": 90.378
    },
    "keywords": [
      "chandrima udyan",
      "chandrima udyan",
      "চন্দ্রিমা উদ্যান হাউজিং",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_shekhertek",
    "name": "Shekhertek",
    "nameBn": "শেখেরটেক ও মনসুরাবাদ",
    "category": "area",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Shekhertek, Dhaka",
    "coords": {
      "latitude": 23.768,
      "longitude": 90.352
    },
    "keywords": [
      "shekhertek",
      "shekhertek",
      "শেখেরটেক ও মনসুরাবাদ",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_monsurabad",
    "name": "Monsurabad",
    "nameBn": "শেখেরটেক ও মনসুরাবাদ",
    "category": "area",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Monsurabad, Dhaka",
    "coords": {
      "latitude": 23.766,
      "longitude": 90.348
    },
    "keywords": [
      "monsurabad",
      "monsurabad",
      "শেখেরটেক ও মনসুরাবাদ",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_baitul_aman",
    "name": "Baitul Aman",
    "nameBn": "বায়তুল আমান ও নবোদয় হাউজিং",
    "category": "area",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Baitul Aman, Dhaka",
    "coords": {
      "latitude": 23.767,
      "longitude": 90.358
    },
    "keywords": [
      "baitul aman",
      "baitul aman",
      "বায়তুল আমান ও নবোদয় হাউজিং",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_nobodoy",
    "name": "Nobodoy",
    "nameBn": "বায়তুল আমান ও নবোদয় হাউজিং",
    "category": "area",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Nobodoy, Dhaka",
    "coords": {
      "latitude": 23.765,
      "longitude": 90.354
    },
    "keywords": [
      "nobodoy",
      "nobodoy",
      "বায়তুল আমান ও নবোদয় হাউজিং",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_dhanmondi",
    "name": "Dhanmondi",
    "nameBn": "ইবনে সিনা হাসপাতাল",
    "category": "area",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Dhanmondi, Dhaka",
    "coords": {
      "latitude": 23.7461,
      "longitude": 90.3742
    },
    "keywords": [
      "dhanmondi",
      "dhanmondi",
      "ইবনে সিনা হাসপাতাল",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_shankar",
    "name": "Shankar",
    "nameBn": "শংকর ও সাতমসজিদ রোড",
    "category": "area",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Shankar, Dhaka",
    "coords": {
      "latitude": 23.749,
      "longitude": 90.368
    },
    "keywords": [
      "shankar",
      "shankar",
      "শংকর ও সাতমসজিদ রোড",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_satmasjid_road",
    "name": "Satmasjid Road",
    "nameBn": "শংকর ও সাতমসজিদ রোড",
    "category": "area",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Satmasjid Road, Dhaka",
    "coords": {
      "latitude": 23.748,
      "longitude": 90.371
    },
    "keywords": [
      "satmasjid road",
      "satmasjid road",
      "শংকর ও সাতমসজিদ রোড",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_jigatola",
    "name": "Jigatola",
    "nameBn": "জিগাতলা",
    "category": "area",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Jigatola, Dhaka",
    "coords": {
      "latitude": 23.738,
      "longitude": 90.372
    },
    "keywords": [
      "jigatola",
      "jigatola",
      "জিগাতলা",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_panthapath",
    "name": "Panthapath",
    "nameBn": "পান্থপথ",
    "category": "area",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Panthapath, Dhaka",
    "coords": {
      "latitude": 23.7518,
      "longitude": 90.3862
    },
    "keywords": [
      "panthapath",
      "panthapath",
      "পান্থপথ",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_green_road",
    "name": "Green Road",
    "nameBn": "গ্রিন রোড",
    "category": "area",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Green Road, Dhaka",
    "coords": {
      "latitude": 23.7465,
      "longitude": 90.385
    },
    "keywords": [
      "green road",
      "green road",
      "গ্রিন রোড",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_kalabagan",
    "name": "Kalabagan",
    "nameBn": "কলাবাগান",
    "category": "area",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Kalabagan, Dhaka",
    "coords": {
      "latitude": 23.748,
      "longitude": 90.382
    },
    "keywords": [
      "kalabagan",
      "kalabagan",
      "কলাবাগান",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_sobhanbagh",
    "name": "Sobhanbagh",
    "nameBn": "সোবহানবাগ",
    "category": "area",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Sobhanbagh, Dhaka",
    "coords": {
      "latitude": 23.751,
      "longitude": 90.378
    },
    "keywords": [
      "sobhanbagh",
      "sobhanbagh",
      "সোবহানবাগ",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_shukrabad",
    "name": "Shukrabad",
    "nameBn": "শুক্রাবাদ",
    "category": "area",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Shukrabad, Dhaka",
    "coords": {
      "latitude": 23.753,
      "longitude": 90.378
    },
    "keywords": [
      "shukrabad",
      "shukrabad",
      "শুক্রাবাদ",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_farmgate",
    "name": "Farmgate",
    "nameBn": "ফার্মগেট",
    "category": "area",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Farmgate, Dhaka",
    "coords": {
      "latitude": 23.757,
      "longitude": 90.3888
    },
    "keywords": [
      "farmgate",
      "farmgate",
      "ফার্মগেট",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_indira_road",
    "name": "Indira Road",
    "nameBn": "ইন্দিরা রোড / তেজতুরী বাজার",
    "category": "area",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Indira Road, Dhaka",
    "coords": {
      "latitude": 23.758,
      "longitude": 90.386
    },
    "keywords": [
      "indira road",
      "indira road",
      "ইন্দিরা রোড / তেজতুরী বাজার",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_tejturi_bazar",
    "name": "Tejturi Bazar",
    "nameBn": "ইন্দিরা রোড / তেজতুরী বাজার",
    "category": "area",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Tejturi Bazar, Dhaka",
    "coords": {
      "latitude": 23.756,
      "longitude": 90.391
    },
    "keywords": [
      "tejturi bazar",
      "tejturi bazar",
      "ইন্দিরা রোড / তেজতুরী বাজার",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_bijoy_sarani",
    "name": "Bijoy Sarani",
    "nameBn": "বিজয় সরণি",
    "category": "area",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Bijoy Sarani, Dhaka",
    "coords": {
      "latitude": 23.766,
      "longitude": 90.387
    },
    "keywords": [
      "bijoy sarani",
      "bijoy sarani",
      "বিজয় সরণি",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_karwan_bazar",
    "name": "Karwan Bazar",
    "nameBn": "কাওরান বাজার",
    "category": "area",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Karwan Bazar, Dhaka",
    "coords": {
      "latitude": 23.752,
      "longitude": 90.393
    },
    "keywords": [
      "karwan bazar",
      "karwan bazar",
      "কাওরান বাজার",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_banglamotor",
    "name": "Banglamotor",
    "nameBn": "বাংলামোটর",
    "category": "area",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Banglamotor, Dhaka",
    "coords": {
      "latitude": 23.746,
      "longitude": 90.396
    },
    "keywords": [
      "banglamotor",
      "banglamotor",
      "বাংলামোটর",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_hatirpool",
    "name": "Hatirpool",
    "nameBn": "হাতিরপুল",
    "category": "area",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Hatirpool, Dhaka",
    "coords": {
      "latitude": 23.744,
      "longitude": 90.391
    },
    "keywords": [
      "hatirpool",
      "hatirpool",
      "হাতিরপুল",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_katabon",
    "name": "Katabon",
    "nameBn": "কাটাবন",
    "category": "area",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Katabon, Dhaka",
    "coords": {
      "latitude": 23.74,
      "longitude": 90.389
    },
    "keywords": [
      "katabon",
      "katabon",
      "কাটাবন",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_shahbagh",
    "name": "Shahbagh",
    "nameBn": "শাহবাগ",
    "category": "area",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Shahbagh, Dhaka",
    "coords": {
      "latitude": 23.738,
      "longitude": 90.395
    },
    "keywords": [
      "shahbagh",
      "shahbagh",
      "শাহবাগ",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_eskaton",
    "name": "Eskaton",
    "nameBn": "ইস্কাটন",
    "category": "area",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Eskaton, Dhaka",
    "coords": {
      "latitude": 23.746,
      "longitude": 90.402
    },
    "keywords": [
      "eskaton",
      "eskaton",
      "ইস্কাটন",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_bailey_road",
    "name": "Bailey Road",
    "nameBn": "বেইলি রোড ও অফিসার্স কলোনি",
    "category": "area",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Bailey Road, Dhaka",
    "coords": {
      "latitude": 23.741,
      "longitude": 90.405
    },
    "keywords": [
      "bailey road",
      "bailey road",
      "বেইলি রোড ও অফিসার্স কলোনি",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_officers_colony",
    "name": "Officers Colony",
    "nameBn": "বেইলি রোড ও অফিসার্স কলোনি",
    "category": "area",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Officers Colony, Dhaka",
    "coords": {
      "latitude": 23.742,
      "longitude": 90.402
    },
    "keywords": [
      "officers colony",
      "officers colony",
      "বেইলি রোড ও অফিসার্স কলোনি",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_moghbazar",
    "name": "Moghbazar",
    "nameBn": "মগবাজার",
    "category": "area",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Moghbazar, Dhaka",
    "coords": {
      "latitude": 23.7475,
      "longitude": 90.406
    },
    "keywords": [
      "moghbazar",
      "moghbazar",
      "মগবাজার",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_malibagh",
    "name": "Malibagh",
    "nameBn": "মালিবাগ",
    "category": "area",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Malibagh, Dhaka",
    "coords": {
      "latitude": 23.751,
      "longitude": 90.414
    },
    "keywords": [
      "malibagh",
      "malibagh",
      "মালিবাগ",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_mouchak",
    "name": "Mouchak",
    "nameBn": "মৌচাক",
    "category": "area",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Mouchak, Dhaka",
    "coords": {
      "latitude": 23.747,
      "longitude": 90.412
    },
    "keywords": [
      "mouchak",
      "mouchak",
      "মৌচাক",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_shantinagar",
    "name": "Shantinagar",
    "nameBn": "শান্তিনগর",
    "category": "area",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Shantinagar, Dhaka",
    "coords": {
      "latitude": 23.741,
      "longitude": 90.413
    },
    "keywords": [
      "shantinagar",
      "shantinagar",
      "শান্তিনগর",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_rajarbagh",
    "name": "Rajarbagh",
    "nameBn": "Rajarbagh",
    "category": "area",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Rajarbagh, Dhaka",
    "coords": {
      "latitude": 23.74,
      "longitude": 90.416
    },
    "keywords": [
      "rajarbagh",
      "rajarbagh",
      "rajarbagh",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_kakrail",
    "name": "Kakrail",
    "nameBn": "কাকরাইল",
    "category": "area",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Kakrail, Dhaka",
    "coords": {
      "latitude": 23.738,
      "longitude": 90.41
    },
    "keywords": [
      "kakrail",
      "kakrail",
      "কাকরাইল",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_kamalapur",
    "name": "Kamalapur",
    "nameBn": "Kamalapur",
    "category": "area",
    "zone": "Motijheel & East",
    "zoneBn": "মতিঝিল ও পূর্ব ঢাকা",
    "subLocation": "Kamalapur, Dhaka",
    "coords": {
      "latitude": 23.734,
      "longitude": 90.426
    },
    "keywords": [
      "kamalapur",
      "kamalapur",
      "kamalapur",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_motijheel",
    "name": "Motijheel",
    "nameBn": "মতিঝিল",
    "category": "area",
    "zone": "Motijheel & East",
    "zoneBn": "মতিঝিল ও পূর্ব ঢাকা",
    "subLocation": "Motijheel, Dhaka",
    "coords": {
      "latitude": 23.733,
      "longitude": 90.417
    },
    "keywords": [
      "motijheel",
      "motijheel",
      "মতিঝিল",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_paltan",
    "name": "Paltan",
    "nameBn": "পল্টন / প্রেস ক্লাব",
    "category": "area",
    "zone": "Motijheel & East",
    "zoneBn": "মতিঝিল ও পূর্ব ঢাকা",
    "subLocation": "Paltan, Dhaka",
    "coords": {
      "latitude": 23.732,
      "longitude": 90.412
    },
    "keywords": [
      "paltan",
      "paltan",
      "পল্টন / প্রেস ক্লাব",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_fulbaria",
    "name": "Fulbaria",
    "nameBn": "Fulbaria",
    "category": "area",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Fulbaria, Dhaka",
    "coords": {
      "latitude": 23.722,
      "longitude": 90.408
    },
    "keywords": [
      "fulbaria",
      "fulbaria",
      "fulbaria",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_segunbagicha",
    "name": "Segunbagicha",
    "nameBn": "সেগুনবাগিচা",
    "category": "area",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Segunbagicha, Dhaka",
    "coords": {
      "latitude": 23.734,
      "longitude": 90.406
    },
    "keywords": [
      "segunbagicha",
      "segunbagicha",
      "সেগুনবাগিচা",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_buet_campus",
    "name": "Buet Campus",
    "nameBn": "বুয়েট ক্যাম্পাস",
    "category": "area",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Buet Campus, Dhaka",
    "coords": {
      "latitude": 23.726,
      "longitude": 90.392
    },
    "keywords": [
      "buet campus",
      "buet campus",
      "বুয়েট ক্যাম্পাস",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_chankharpul",
    "name": "Chankharpul",
    "nameBn": "চাঁনখারপুল / বকশীবাজার",
    "category": "area",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Chankharpul, Dhaka",
    "coords": {
      "latitude": 23.723,
      "longitude": 90.399
    },
    "keywords": [
      "chankharpul",
      "chankharpul",
      "চাঁনখারপুল / বকশীবাজার",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_bakshibazar",
    "name": "Bakshibazar",
    "nameBn": "চাঁনখারপুল / বকশীবাজার",
    "category": "area",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Bakshibazar, Dhaka",
    "coords": {
      "latitude": 23.721,
      "longitude": 90.394
    },
    "keywords": [
      "bakshibazar",
      "bakshibazar",
      "চাঁনখারপুল / বকশীবাজার",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_azimpur",
    "name": "Azimpur",
    "nameBn": "আজিমপুর মাতৃসদন",
    "category": "area",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Azimpur, Dhaka",
    "coords": {
      "latitude": 23.728,
      "longitude": 90.386
    },
    "keywords": [
      "azimpur",
      "azimpur",
      "আজিমপুর মাতৃসদন",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_lalbagh",
    "name": "Lalbagh",
    "nameBn": "লালবাগ",
    "category": "area",
    "zone": "Old Dhaka & Sadarghat",
    "zoneBn": "পুরান ঢাকা ও সদরঘাট",
    "subLocation": "Lalbagh, Dhaka",
    "coords": {
      "latitude": 23.719,
      "longitude": 90.388
    },
    "keywords": [
      "lalbagh",
      "lalbagh",
      "লালবাগ",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_chawkbazar",
    "name": "Chawkbazar",
    "nameBn": "চকবাজার",
    "category": "area",
    "zone": "Old Dhaka & Sadarghat",
    "zoneBn": "পুরান ঢাকা ও সদরঘাট",
    "subLocation": "Chawkbazar, Dhaka",
    "coords": {
      "latitude": 23.717,
      "longitude": 90.398
    },
    "keywords": [
      "chawkbazar",
      "chawkbazar",
      "চকবাজার",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_armanitola_1",
    "name": "Armanitola",
    "nameBn": "আরমানিটোলা / বাবুবাজার",
    "category": "area",
    "zone": "Old Dhaka & Sadarghat",
    "zoneBn": "পুরান ঢাকা ও সদরঘাট",
    "subLocation": "Armanitola, Dhaka",
    "coords": {
      "latitude": 23.713,
      "longitude": 90.404
    },
    "keywords": [
      "armanitola",
      "armanitola",
      "আরমানিটোলা / বাবুবাজার",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_babubazar",
    "name": "Babubazar",
    "nameBn": "আরমানিটোলা / বাবুবাজার",
    "category": "area",
    "zone": "Old Dhaka & Sadarghat",
    "zoneBn": "পুরান ঢাকা ও সদরঘাট",
    "subLocation": "Babubazar, Dhaka",
    "coords": {
      "latitude": 23.711,
      "longitude": 90.401
    },
    "keywords": [
      "babubazar",
      "babubazar",
      "আরমানিটোলা / বাবুবাজার",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_islampur",
    "name": "Islampur",
    "nameBn": "ইসলামপুর / বংশাল",
    "category": "area",
    "zone": "Old Dhaka & Sadarghat",
    "zoneBn": "পুরান ঢাকা ও সদরঘাট",
    "subLocation": "Islampur, Dhaka",
    "coords": {
      "latitude": 23.71,
      "longitude": 90.408
    },
    "keywords": [
      "islampur",
      "islampur",
      "ইসলামপুর / বংশাল",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_bangshal",
    "name": "Bangshal",
    "nameBn": "ইসলামপুর / বংশাল",
    "category": "area",
    "zone": "Old Dhaka & Sadarghat",
    "zoneBn": "পুরান ঢাকা ও সদরঘাট",
    "subLocation": "Bangshal, Dhaka",
    "coords": {
      "latitude": 23.718,
      "longitude": 90.408
    },
    "keywords": [
      "bangshal",
      "bangshal",
      "ইসলামপুর / বংশাল",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_tikatuli",
    "name": "Tikatuli",
    "nameBn": "টিকাটুলী",
    "category": "area",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Tikatuli, Dhaka",
    "coords": {
      "latitude": 23.722,
      "longitude": 90.422
    },
    "keywords": [
      "tikatuli",
      "tikatuli",
      "টিকাটুলী",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_sayedabad",
    "name": "Sayedabad",
    "nameBn": "সায়েদাবাদ",
    "category": "area",
    "zone": "Motijheel & East",
    "zoneBn": "মতিঝিল ও পূর্ব ঢাকা",
    "subLocation": "Sayedabad, Dhaka",
    "coords": {
      "latitude": 23.715,
      "longitude": 90.43
    },
    "keywords": [
      "sayedabad",
      "sayedabad",
      "সায়েদাবাদ",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_sutrapur",
    "name": "Sutrapur",
    "nameBn": "সূত্রাপুর ও লক্ষ্মীবাজার",
    "category": "area",
    "zone": "Old Dhaka & Sadarghat",
    "zoneBn": "পুরান ঢাকা ও সদরঘাট",
    "subLocation": "Sutrapur, Dhaka",
    "coords": {
      "latitude": 23.708,
      "longitude": 90.418
    },
    "keywords": [
      "sutrapur",
      "sutrapur",
      "সূত্রাপুর ও লক্ষ্মীবাজার",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_laxmibazar",
    "name": "Laxmibazar",
    "nameBn": "সূত্রাপুর ও লক্ষ্মীবাজার",
    "category": "area",
    "zone": "Old Dhaka & Sadarghat",
    "zoneBn": "পুরান ঢাকা ও সদরঘাট",
    "subLocation": "Laxmibazar, Dhaka",
    "coords": {
      "latitude": 23.709,
      "longitude": 90.416
    },
    "keywords": [
      "laxmibazar",
      "laxmibazar",
      "সূত্রাপুর ও লক্ষ্মীবাজার",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_shankhari_bazar_1",
    "name": "Shankhari Bazar",
    "nameBn": "শাঁখারীবাজার ও তাঁতীবাজার",
    "category": "area",
    "zone": "Old Dhaka & Sadarghat",
    "zoneBn": "পুরান ঢাকা ও সদরঘাট",
    "subLocation": "Shankhari Bazar, Dhaka",
    "coords": {
      "latitude": 23.711,
      "longitude": 90.41
    },
    "keywords": [
      "shankhari bazar",
      "shankhari bazar",
      "শাঁখারীবাজার ও তাঁতীবাজার",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_tantibazar_1",
    "name": "Tantibazar",
    "nameBn": "শাঁখারীবাজার ও তাঁতীবাজার",
    "category": "area",
    "zone": "Old Dhaka & Sadarghat",
    "zoneBn": "পুরান ঢাকা ও সদরঘাট",
    "subLocation": "Tantibazar, Dhaka",
    "coords": {
      "latitude": 23.712,
      "longitude": 90.407
    },
    "keywords": [
      "tantibazar",
      "tantibazar",
      "শাঁখারীবাজার ও তাঁতীবাজার",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_dayaganj",
    "name": "Dayaganj",
    "nameBn": "দয়াগঞ্জ ও ধোলাইখাল",
    "category": "area",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Dayaganj, Dhaka",
    "coords": {
      "latitude": 23.712,
      "longitude": 90.428
    },
    "keywords": [
      "dayaganj",
      "dayaganj",
      "দয়াগঞ্জ ও ধোলাইখাল",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_dholairkhal",
    "name": "Dholairkhal",
    "nameBn": "দয়াগঞ্জ ও ধোলাইখাল",
    "category": "area",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Dholairkhal, Dhaka",
    "coords": {
      "latitude": 23.714,
      "longitude": 90.422
    },
    "keywords": [
      "dholairkhal",
      "dholairkhal",
      "দয়াগঞ্জ ও ধোলাইখাল",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_farashganj",
    "name": "Farashganj",
    "nameBn": "ফরাশগঞ্জ ও শ্যামবাজার",
    "category": "area",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Farashganj, Dhaka",
    "coords": {
      "latitude": 23.704,
      "longitude": 90.415
    },
    "keywords": [
      "farashganj",
      "farashganj",
      "ফরাশগঞ্জ ও শ্যামবাজার",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_shyambazar",
    "name": "Shyambazar",
    "nameBn": "ফরাশগঞ্জ ও শ্যামবাজার",
    "category": "area",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Shyambazar, Dhaka",
    "coords": {
      "latitude": 23.702,
      "longitude": 90.413
    },
    "keywords": [
      "shyambazar",
      "shyambazar",
      "ফরাশগঞ্জ ও শ্যামবাজার",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_old_dhaka",
    "name": "Old Dhaka",
    "nameBn": "Old Dhaka",
    "category": "area",
    "zone": "Old Dhaka & Sadarghat",
    "zoneBn": "পুরান ঢাকা ও সদরঘাট",
    "subLocation": "Old Dhaka, Dhaka",
    "coords": {
      "latitude": 23.712,
      "longitude": 90.402
    },
    "keywords": [
      "old dhaka",
      "old dhaka",
      "old dhaka",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_gandaria",
    "name": "Gandaria",
    "nameBn": "নারিন্দা / গেন্ডারিয়া",
    "category": "area",
    "zone": "Old Dhaka & Sadarghat",
    "zoneBn": "পুরান ঢাকা ও সদরঘাট",
    "subLocation": "Gandaria, Dhaka",
    "coords": {
      "latitude": 23.705,
      "longitude": 90.428
    },
    "keywords": [
      "gandaria",
      "gandaria",
      "নারিন্দা / গেন্ডারিয়া",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_wari",
    "name": "Wari",
    "nameBn": "ওয়ারী",
    "category": "area",
    "zone": "Old Dhaka & Sadarghat",
    "zoneBn": "পুরান ঢাকা ও সদরঘাট",
    "subLocation": "Wari, Dhaka",
    "coords": {
      "latitude": 23.716,
      "longitude": 90.42
    },
    "keywords": [
      "wari",
      "wari",
      "ওয়ারী",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_sadarghat",
    "name": "Sadarghat",
    "nameBn": "সদরঘাট",
    "category": "area",
    "zone": "Old Dhaka & Sadarghat",
    "zoneBn": "পুরান ঢাকা ও সদরঘাট",
    "subLocation": "Sadarghat, Dhaka",
    "coords": {
      "latitude": 23.708,
      "longitude": 90.41
    },
    "keywords": [
      "sadarghat",
      "sadarghat",
      "সদরঘাট",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_kamrangirchar",
    "name": "Kamrangirchar",
    "nameBn": "কামরাঙ্গীরচর",
    "category": "area",
    "zone": "Old Dhaka & Sadarghat",
    "zoneBn": "পুরান ঢাকা ও সদরঘাট",
    "subLocation": "Kamrangirchar, Dhaka",
    "coords": {
      "latitude": 23.715,
      "longitude": 90.375
    },
    "keywords": [
      "kamrangirchar",
      "kamrangirchar",
      "কামরাঙ্গীরচর",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_hazaribagh",
    "name": "Hazaribagh",
    "nameBn": "হাজারীবাগ / রায়ের বাজার",
    "category": "area",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Hazaribagh, Dhaka",
    "coords": {
      "latitude": 23.735,
      "longitude": 90.365
    },
    "keywords": [
      "hazaribagh",
      "hazaribagh",
      "হাজারীবাগ / রায়ের বাজার",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_rayer_bazar",
    "name": "Rayer Bazar",
    "nameBn": "হাজারীবাগ / রায়ের বাজার",
    "category": "area",
    "zone": "Dhanmondi & West",
    "zoneBn": "ধানমন্ডি ও পশ্চিম ঢাকা",
    "subLocation": "Rayer Bazar, Dhaka",
    "coords": {
      "latitude": 23.742,
      "longitude": 90.362
    },
    "keywords": [
      "rayer bazar",
      "rayer bazar",
      "হাজারীবাগ / রায়ের বাজার",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_keraniganj",
    "name": "Keraniganj",
    "nameBn": "কেরানীগঞ্জ / জিনজিরা",
    "category": "area",
    "zone": "Old Dhaka & Sadarghat",
    "zoneBn": "পুরান ঢাকা ও সদরঘাট",
    "subLocation": "Keraniganj, Dhaka",
    "coords": {
      "latitude": 23.698,
      "longitude": 90.395
    },
    "keywords": [
      "keraniganj",
      "keraniganj",
      "কেরানীগঞ্জ / জিনজিরা",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_zinjira",
    "name": "Zinjira",
    "nameBn": "কেরানীগঞ্জ / জিনজিরা",
    "category": "area",
    "zone": "Old Dhaka & Sadarghat",
    "zoneBn": "পুরান ঢাকা ও সদরঘাট",
    "subLocation": "Zinjira, Dhaka",
    "coords": {
      "latitude": 23.702,
      "longitude": 90.396
    },
    "keywords": [
      "zinjira",
      "zinjira",
      "কেরানীগঞ্জ / জিনজিরা",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_khilgaon",
    "name": "Khilgaon",
    "nameBn": "খিলগাঁও",
    "category": "area",
    "zone": "Motijheel & East",
    "zoneBn": "মতিঝিল ও পূর্ব ঢাকা",
    "subLocation": "Khilgaon, Dhaka",
    "coords": {
      "latitude": 23.751,
      "longitude": 90.425
    },
    "keywords": [
      "khilgaon",
      "khilgaon",
      "খিলগাঁও",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_goran",
    "name": "Goran",
    "nameBn": "গোড়ান ও সিপাহীবাগ",
    "category": "area",
    "zone": "Motijheel & East",
    "zoneBn": "মতিঝিল ও পূর্ব ঢাকা",
    "subLocation": "Goran, Dhaka",
    "coords": {
      "latitude": 23.755,
      "longitude": 90.432
    },
    "keywords": [
      "goran",
      "goran",
      "গোড়ান ও সিপাহীবাগ",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_sipahibagh",
    "name": "Sipahibagh",
    "nameBn": "গোড়ান ও সিপাহীবাগ",
    "category": "area",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Sipahibagh, Dhaka",
    "coords": {
      "latitude": 23.754,
      "longitude": 90.428
    },
    "keywords": [
      "sipahibagh",
      "sipahibagh",
      "গোড়ান ও সিপাহীবাগ",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_basabo",
    "name": "Basabo",
    "nameBn": "বাসাবো / মাদারটেক",
    "category": "area",
    "zone": "Motijheel & East",
    "zoneBn": "মতিঝিল ও পূর্ব ঢাকা",
    "subLocation": "Basabo, Dhaka",
    "coords": {
      "latitude": 23.745,
      "longitude": 90.435
    },
    "keywords": [
      "basabo",
      "basabo",
      "বাসাবো / মাদারটেক",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_madartek",
    "name": "Madartek",
    "nameBn": "বাসাবো / মাদারটেক",
    "category": "area",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Madartek, Dhaka",
    "coords": {
      "latitude": 23.742,
      "longitude": 90.438
    },
    "keywords": [
      "madartek",
      "madartek",
      "বাসাবো / মাদারটেক",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_shahjahanpur",
    "name": "Shahjahanpur",
    "nameBn": "শাহজাহানপুর",
    "category": "area",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Shahjahanpur, Dhaka",
    "coords": {
      "latitude": 23.742,
      "longitude": 90.422
    },
    "keywords": [
      "shahjahanpur",
      "shahjahanpur",
      "শাহজাহানপুর",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_maniknagar",
    "name": "Maniknagar",
    "nameBn": "মানিকনগর",
    "category": "area",
    "zone": "Motijheel & East",
    "zoneBn": "মতিঝিল ও পূর্ব ঢাকা",
    "subLocation": "Maniknagar, Dhaka",
    "coords": {
      "latitude": 23.728,
      "longitude": 90.43
    },
    "keywords": [
      "maniknagar",
      "maniknagar",
      "মানিকনগর",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_mugda",
    "name": "Mugda",
    "nameBn": "মুগদা মেডিকেল কলেজ",
    "category": "area",
    "zone": "Motijheel & East",
    "zoneBn": "মতিঝিল ও পূর্ব ঢাকা",
    "subLocation": "Mugda, Dhaka",
    "coords": {
      "latitude": 23.7302,
      "longitude": 90.4328
    },
    "keywords": [
      "mugda",
      "mugda",
      "মুগদা মেডিকেল কলেজ",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_rampura",
    "name": "Rampura",
    "nameBn": "রামপুরা",
    "category": "area",
    "zone": "Motijheel & East",
    "zoneBn": "মতিঝিল ও পূর্ব ঢাকা",
    "subLocation": "Rampura, Dhaka",
    "coords": {
      "latitude": 23.761,
      "longitude": 90.422
    },
    "keywords": [
      "rampura",
      "rampura",
      "রামপুরা",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_banasree",
    "name": "Banasree",
    "nameBn": "বনশ্রী",
    "category": "area",
    "zone": "Motijheel & East",
    "zoneBn": "মতিঝিল ও পূর্ব ঢাকা",
    "subLocation": "Banasree, Dhaka",
    "coords": {
      "latitude": 23.763,
      "longitude": 90.432
    },
    "keywords": [
      "banasree",
      "banasree",
      "বনশ্রী",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_aftabnagar",
    "name": "Aftabnagar",
    "nameBn": "আফতাবনগর",
    "category": "area",
    "zone": "Motijheel & East",
    "zoneBn": "মতিঝিল ও পূর্ব ঢাকা",
    "subLocation": "Aftabnagar, Dhaka",
    "coords": {
      "latitude": 23.768,
      "longitude": 90.435
    },
    "keywords": [
      "aftabnagar",
      "aftabnagar",
      "আফতাবনগর",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_badda",
    "name": "Badda",
    "nameBn": "বাড্ডা জেনারেল হাসপাতাল",
    "category": "area",
    "zone": "Motijheel & East",
    "zoneBn": "মতিঝিল ও পূর্ব ঢাকা",
    "subLocation": "Badda, Dhaka",
    "coords": {
      "latitude": 23.7845,
      "longitude": 90.4255
    },
    "keywords": [
      "badda",
      "badda",
      "বাড্ডা জেনারেল হাসপাতাল",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_pragati_sarani",
    "name": "Pragati Sarani",
    "nameBn": "প্রগতি সরণি",
    "category": "area",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Pragati Sarani, Dhaka",
    "coords": {
      "latitude": 23.792,
      "longitude": 90.425
    },
    "keywords": [
      "pragati sarani",
      "pragati sarani",
      "প্রগতি সরণি",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_natun_bazar",
    "name": "Natun Bazar",
    "nameBn": "নতুন বাজার ও মাদানী এভিনিউ",
    "category": "area",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Natun Bazar, Dhaka",
    "coords": {
      "latitude": 23.795,
      "longitude": 90.424
    },
    "keywords": [
      "natun bazar",
      "natun bazar",
      "নতুন বাজার ও মাদানী এভিনিউ",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_madani_avenue",
    "name": "Madani Avenue",
    "nameBn": "নতুন বাজার ও মাদানী এভিনিউ",
    "category": "area",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Madani Avenue, Dhaka",
    "coords": {
      "latitude": 23.796,
      "longitude": 90.426
    },
    "keywords": [
      "madani avenue",
      "madani avenue",
      "নতুন বাজার ও মাদানী এভিনিউ",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_matuail",
    "name": "Matuail",
    "nameBn": "মাতুয়াইল শিশু ও মাতৃস্বাস্থ্য ইনস্টিটিউট",
    "category": "area",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Matuail, Dhaka",
    "coords": {
      "latitude": 23.705,
      "longitude": 90.465
    },
    "keywords": [
      "matuail",
      "matuail",
      "মাতুয়াইল শিশু ও মাতৃস্বাস্থ্য ইনস্টিটিউট",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_shanir_akhra",
    "name": "Shanir Akhra",
    "nameBn": "শনির আখড়া / রায়েরবাগ",
    "category": "area",
    "zone": "Motijheel & East",
    "zoneBn": "মতিঝিল ও পূর্ব ঢাকা",
    "subLocation": "Shanir Akhra, Dhaka",
    "coords": {
      "latitude": 23.702,
      "longitude": 90.448
    },
    "keywords": [
      "shanir akhra",
      "shanir akhra",
      "শনির আখড়া / রায়েরবাগ",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_rayerbag",
    "name": "Rayerbag",
    "nameBn": "শনির আখড়া / রায়েরবাগ",
    "category": "area",
    "zone": "Motijheel & East",
    "zoneBn": "মতিঝিল ও পূর্ব ঢাকা",
    "subLocation": "Rayerbag, Dhaka",
    "coords": {
      "latitude": 23.701,
      "longitude": 90.455
    },
    "keywords": [
      "rayerbag",
      "rayerbag",
      "শনির আখড়া / রায়েরবাগ",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_dania",
    "name": "Dania",
    "nameBn": "দনিয়া ও শনির আখড়া",
    "category": "area",
    "zone": "Motijheel & East",
    "zoneBn": "মতিঝিল ও পূর্ব ঢাকা",
    "subLocation": "Dania, Dhaka",
    "coords": {
      "latitude": 23.698,
      "longitude": 90.45
    },
    "keywords": [
      "dania",
      "dania",
      "দনিয়া ও শনির আখড়া",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_dhalpur",
    "name": "Dhalpur",
    "nameBn": "ধলপুর ও গোলাপবাগ",
    "category": "area",
    "zone": "Motijheel & East",
    "zoneBn": "মতিঝিল ও পূর্ব ঢাকা",
    "subLocation": "Dhalpur, Dhaka",
    "coords": {
      "latitude": 23.718,
      "longitude": 90.438
    },
    "keywords": [
      "dhalpur",
      "dhalpur",
      "ধলপুর ও গোলাপবাগ",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_golapbagh",
    "name": "Golapbagh",
    "nameBn": "ধলপুর ও গোলাপবাগ",
    "category": "area",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Golapbagh, Dhaka",
    "coords": {
      "latitude": 23.717,
      "longitude": 90.435
    },
    "keywords": [
      "golapbagh",
      "golapbagh",
      "ধলপুর ও গোলাপবাগ",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_jatrabari",
    "name": "Jatrabari",
    "nameBn": "যাত্রাবাড়ী",
    "category": "area",
    "zone": "Motijheel & East",
    "zoneBn": "মতিঝিল ও পূর্ব ঢাকা",
    "subLocation": "Jatrabari, Dhaka",
    "coords": {
      "latitude": 23.711,
      "longitude": 90.435
    },
    "keywords": [
      "jatrabari",
      "jatrabari",
      "যাত্রাবাড়ী",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_demra",
    "name": "Demra",
    "nameBn": "ডেমরা ও স্টাফ কোয়ার্টার",
    "category": "area",
    "zone": "Motijheel & East",
    "zoneBn": "মতিঝিল ও পূর্ব ঢাকা",
    "subLocation": "Demra, Dhaka",
    "coords": {
      "latitude": 23.715,
      "longitude": 90.47
    },
    "keywords": [
      "demra",
      "demra",
      "ডেমরা ও স্টাফ কোয়ার্টার",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_postogola",
    "name": "Postogola",
    "nameBn": "পোস্তগোলা / জুরাইন",
    "category": "area",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Postogola, Dhaka",
    "coords": {
      "latitude": 23.695,
      "longitude": 90.435
    },
    "keywords": [
      "postogola",
      "postogola",
      "পোস্তগোলা / জুরাইন",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_jurain",
    "name": "Jurain",
    "nameBn": "পোস্তগোলা / জুরাইন",
    "category": "area",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Jurain, Dhaka",
    "coords": {
      "latitude": 23.698,
      "longitude": 90.439
    },
    "keywords": [
      "jurain",
      "jurain",
      "পোস্তগোলা / জুরাইন",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_signboard",
    "name": "Signboard",
    "nameBn": "নারায়ণগঞ্জ / সাইনবোর্ড",
    "category": "area",
    "zone": "Greater Dhaka & Suburbs",
    "zoneBn": "বৃহত্তর ঢাকা ও শহরতলি",
    "subLocation": "Signboard, Dhaka",
    "coords": {
      "latitude": 23.685,
      "longitude": 90.485
    },
    "keywords": [
      "signboard",
      "signboard",
      "নারায়ণগঞ্জ / সাইনবোর্ড",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_narayanganj",
    "name": "Narayanganj",
    "nameBn": "নারায়ণগঞ্জ / সাইনবোর্ড",
    "category": "area",
    "zone": "Greater Dhaka & Suburbs",
    "zoneBn": "বৃহত্তর ঢাকা ও শহরতলি",
    "subLocation": "Narayanganj, Dhaka",
    "coords": {
      "latitude": 23.62,
      "longitude": 90.5
    },
    "keywords": [
      "narayanganj",
      "narayanganj",
      "নারায়ণগঞ্জ / সাইনবোর্ড",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_tejgaon",
    "name": "Tejgaon",
    "nameBn": "তেজগাঁও শিল্পাঞ্চল",
    "category": "area",
    "zone": "Shahbagh & Central",
    "zoneBn": "শাহবাগ ও কেন্দ্রীয় ঢাকা",
    "subLocation": "Tejgaon, Dhaka",
    "coords": {
      "latitude": 23.766,
      "longitude": 90.402
    },
    "keywords": [
      "tejgaon",
      "tejgaon",
      "তেজগাঁও শিল্পাঞ্চল",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_mohakhali",
    "name": "Mohakhali",
    "nameBn": "মহাখালী",
    "category": "area",
    "zone": "Mohakhali & Gulshan",
    "zoneBn": "মহাখালী ও গুলশান",
    "subLocation": "Mohakhali, Dhaka",
    "coords": {
      "latitude": 23.7776,
      "longitude": 90.4054
    },
    "keywords": [
      "mohakhali",
      "mohakhali",
      "মহাখালী",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_banani",
    "name": "Banani",
    "nameBn": "বনানী",
    "category": "area",
    "zone": "Mohakhali & Gulshan",
    "zoneBn": "মহাখালী ও গুলশান",
    "subLocation": "Banani, Dhaka",
    "coords": {
      "latitude": 23.7937,
      "longitude": 90.4043
    },
    "keywords": [
      "banani",
      "banani",
      "বনানী",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_gulshan",
    "name": "Gulshan",
    "nameBn": "গুলশান-১",
    "category": "area",
    "zone": "Mohakhali & Gulshan",
    "zoneBn": "মহাখালী ও গুলশান",
    "subLocation": "Gulshan, Dhaka",
    "coords": {
      "latitude": 23.7925,
      "longitude": 90.4078
    },
    "keywords": [
      "gulshan",
      "gulshan",
      "গুলশান-১",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_gulshan_1",
    "name": "Gulshan 1",
    "nameBn": "গুলশান-১",
    "category": "area",
    "zone": "Mohakhali & Gulshan",
    "zoneBn": "মহাখালী ও গুলশান",
    "subLocation": "Gulshan 1, Dhaka",
    "coords": {
      "latitude": 23.778,
      "longitude": 90.416
    },
    "keywords": [
      "gulshan-1",
      "gulshan 1",
      "গুলশান-১",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_gulshan_2",
    "name": "Gulshan 2",
    "nameBn": "গুলশান-২",
    "category": "area",
    "zone": "Mohakhali & Gulshan",
    "zoneBn": "মহাখালী ও গুলশান",
    "subLocation": "Gulshan 2, Dhaka",
    "coords": {
      "latitude": 23.7997,
      "longitude": 90.4182
    },
    "keywords": [
      "gulshan-2",
      "gulshan 2",
      "গুলশান-২",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_baridhara",
    "name": "Baridhara",
    "nameBn": "বারিধারা ডিপ্লোম্যাটিক",
    "category": "area",
    "zone": "Mohakhali & Gulshan",
    "zoneBn": "মহাখালী ও গুলশান",
    "subLocation": "Baridhara, Dhaka",
    "coords": {
      "latitude": 23.8,
      "longitude": 90.422
    },
    "keywords": [
      "baridhara",
      "baridhara",
      "বারিধারা ডিপ্লোম্যাটিক",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_baridhara_dohs",
    "name": "Baridhara Dohs",
    "nameBn": "বারিধারা ডিওএইচএস",
    "category": "area",
    "zone": "Mohakhali & Gulshan",
    "zoneBn": "মহাখালী ও গুলশান",
    "subLocation": "Baridhara Dohs, Dhaka",
    "coords": {
      "latitude": 23.812,
      "longitude": 90.418
    },
    "keywords": [
      "baridhara dohs",
      "baridhara dohs",
      "বারিধারা ডিওএইচএস",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_bashundhara",
    "name": "Bashundhara",
    "nameBn": "বসুন্ধরা আবাসিক এলাকা",
    "category": "area",
    "zone": "Mohakhali & Gulshan",
    "zoneBn": "মহাখালী ও গুলশান",
    "subLocation": "Bashundhara, Dhaka",
    "coords": {
      "latitude": 23.8103,
      "longitude": 90.4312
    },
    "keywords": [
      "bashundhara",
      "bashundhara",
      "বসুন্ধরা আবাসিক এলাকা",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_kuril",
    "name": "Kuril",
    "nameBn": "কুড়িল বিশ্বরোড",
    "category": "area",
    "zone": "Mohakhali & Gulshan",
    "zoneBn": "মহাখালী ও গুলশান",
    "subLocation": "Kuril, Dhaka",
    "coords": {
      "latitude": 23.818,
      "longitude": 90.42
    },
    "keywords": [
      "kuril",
      "kuril",
      "কুড়িল বিশ্বরোড",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_cantonment",
    "name": "Cantonment",
    "nameBn": "ঢাকা সেনানিবাস",
    "category": "area",
    "zone": "Mohakhali & Gulshan",
    "zoneBn": "মহাখালী ও গুলশান",
    "subLocation": "Cantonment, Dhaka",
    "coords": {
      "latitude": 23.8217,
      "longitude": 90.4035
    },
    "keywords": [
      "cantonment",
      "cantonment",
      "ঢাকা সেনানিবাস",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_khilkhet",
    "name": "Khilkhet",
    "nameBn": "খিলক্ষেত / নিকুঞ্জ",
    "category": "area",
    "zone": "Mohakhali & Gulshan",
    "zoneBn": "মহাখালী ও গুলশান",
    "subLocation": "Khilkhet, Dhaka",
    "coords": {
      "latitude": 23.83,
      "longitude": 90.419
    },
    "keywords": [
      "khilkhet",
      "khilkhet",
      "খিলক্ষেত / নিকুঞ্জ",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_nikunja",
    "name": "Nikunja",
    "nameBn": "খিলক্ষেত / নিকুঞ্জ",
    "category": "area",
    "zone": "Mohakhali & Gulshan",
    "zoneBn": "মহাখালী ও গুলশান",
    "subLocation": "Nikunja, Dhaka",
    "coords": {
      "latitude": 23.832,
      "longitude": 90.418
    },
    "keywords": [
      "nikunja",
      "nikunja",
      "খিলক্ষেত / নিকুঞ্জ",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_airport",
    "name": "Airport",
    "nameBn": "বিমানবন্দর / আশকোনা",
    "category": "area",
    "zone": "Uttara & North",
    "zoneBn": "উত্তরা ও উত্তর ঢাকা",
    "subLocation": "Airport, Dhaka",
    "coords": {
      "latitude": 23.843,
      "longitude": 90.405
    },
    "keywords": [
      "airport",
      "airport",
      "বিমানবন্দর / আশকোনা",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_ashkona",
    "name": "Ashkona",
    "nameBn": "বিমানবন্দর / আশকোনা",
    "category": "area",
    "zone": "Uttara & North",
    "zoneBn": "উত্তরা ও উত্তর ঢাকা",
    "subLocation": "Ashkona, Dhaka",
    "coords": {
      "latitude": 23.85,
      "longitude": 90.412
    },
    "keywords": [
      "ashkona",
      "ashkona",
      "বিমানবন্দর / আশকোনা",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_uttara",
    "name": "Uttara",
    "nameBn": "উত্তরা ক্রিসেন্ট হাসপাতাল",
    "category": "area",
    "zone": "Uttara & North",
    "zoneBn": "উত্তরা ও উত্তর ঢাকা",
    "subLocation": "Uttara, Dhaka",
    "coords": {
      "latitude": 23.8759,
      "longitude": 90.3795
    },
    "keywords": [
      "uttara",
      "uttara",
      "উত্তরা ক্রিসেন্ট হাসপাতাল",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_jasimuddin",
    "name": "Jasimuddin",
    "nameBn": "জসীমউদ্দীন ও রাজলক্ষ্মী",
    "category": "area",
    "zone": "Uttara & North",
    "zoneBn": "উত্তরা ও উত্তর ঢাকা",
    "subLocation": "Jasimuddin, Dhaka",
    "coords": {
      "latitude": 23.865,
      "longitude": 90.399
    },
    "keywords": [
      "jasimuddin",
      "jasimuddin",
      "জসীমউদ্দীন ও রাজলক্ষ্মী",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_rajlakshmi",
    "name": "Rajlakshmi",
    "nameBn": "জসীমউদ্দীন ও রাজলক্ষ্মী",
    "category": "area",
    "zone": "Uttara & North",
    "zoneBn": "উত্তরা ও উত্তর ঢাকা",
    "subLocation": "Rajlakshmi, Dhaka",
    "coords": {
      "latitude": 23.867,
      "longitude": 90.398
    },
    "keywords": [
      "rajlakshmi",
      "rajlakshmi",
      "জসীমউদ্দীন ও রাজলক্ষ্মী",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_azampur",
    "name": "Azampur",
    "nameBn": "আজমপুর ও হাউজ বিল্ডিং",
    "category": "area",
    "zone": "Uttara & North",
    "zoneBn": "উত্তরা ও উত্তর ঢাকা",
    "subLocation": "Azampur, Dhaka",
    "coords": {
      "latitude": 23.869,
      "longitude": 90.401
    },
    "keywords": [
      "azampur",
      "azampur",
      "আজমপুর ও হাউজ বিল্ডিং",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_house_building",
    "name": "House Building",
    "nameBn": "আজমপুর ও হাউজ বিল্ডিং",
    "category": "area",
    "zone": "Uttara & North",
    "zoneBn": "উত্তরা ও উত্তর ঢাকা",
    "subLocation": "House Building, Dhaka",
    "coords": {
      "latitude": 23.874,
      "longitude": 90.398
    },
    "keywords": [
      "house building",
      "house building",
      "আজমপুর ও হাউজ বিল্ডিং",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_uttarkhan",
    "name": "Uttarkhan",
    "nameBn": "উত্তরখান",
    "category": "area",
    "zone": "Uttara & North",
    "zoneBn": "উত্তরা ও উত্তর ঢাকা",
    "subLocation": "Uttarkhan, Dhaka",
    "coords": {
      "latitude": 23.878,
      "longitude": 90.428
    },
    "keywords": [
      "uttarkhan",
      "uttarkhan",
      "উত্তরখান",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_dakshinkhan",
    "name": "Dakshinkhan",
    "nameBn": "দক্ষিণখান",
    "category": "area",
    "zone": "Uttara & North",
    "zoneBn": "উত্তরা ও উত্তর ঢাকা",
    "subLocation": "Dakshinkhan, Dhaka",
    "coords": {
      "latitude": 23.865,
      "longitude": 90.426
    },
    "keywords": [
      "dakshinkhan",
      "dakshinkhan",
      "দক্ষিণখান",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_turag",
    "name": "Turag",
    "nameBn": "Turag",
    "category": "area",
    "zone": "Uttara & North",
    "zoneBn": "উত্তরা ও উত্তর ঢাকা",
    "subLocation": "Turag, Dhaka",
    "coords": {
      "latitude": 23.882,
      "longitude": 90.355
    },
    "keywords": [
      "turag",
      "turag",
      "turag",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_tongi",
    "name": "Tongi",
    "nameBn": "টঙ্গী",
    "category": "area",
    "zone": "Greater Dhaka & Suburbs",
    "zoneBn": "বৃহত্তর ঢাকা ও শহরতলি",
    "subLocation": "Tongi, Dhaka",
    "coords": {
      "latitude": 23.91,
      "longitude": 90.43
    },
    "keywords": [
      "tongi",
      "tongi",
      "টঙ্গী",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_gazipur",
    "name": "Gazipur",
    "nameBn": "গাজীপুর চৌরাস্তা",
    "category": "area",
    "zone": "Greater Dhaka & Suburbs",
    "zoneBn": "বৃহত্তর ঢাকা ও শহরতলি",
    "subLocation": "Gazipur, Dhaka",
    "coords": {
      "latitude": 23.9999,
      "longitude": 90.4203
    },
    "keywords": [
      "gazipur",
      "gazipur",
      "গাজীপুর চৌরাস্তা",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_gazipur_chowrasta_1",
    "name": "Gazipur Chowrasta",
    "nameBn": "গাজীপুর চৌরাস্তা",
    "category": "area",
    "zone": "Greater Dhaka & Suburbs",
    "zoneBn": "বৃহত্তর ঢাকা ও শহরতলি",
    "subLocation": "Gazipur Chowrasta, Dhaka",
    "coords": {
      "latitude": 23.985,
      "longitude": 90.38
    },
    "keywords": [
      "gazipur chowrasta",
      "gazipur chowrasta",
      "গাজীপুর চৌরাস্তা",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_ashulia",
    "name": "Ashulia",
    "nameBn": "আশুলিয়া",
    "category": "area",
    "zone": "Greater Dhaka & Suburbs",
    "zoneBn": "বৃহত্তর ঢাকা ও শহরতলি",
    "subLocation": "Ashulia, Dhaka",
    "coords": {
      "latitude": 23.905,
      "longitude": 90.32
    },
    "keywords": [
      "ashulia",
      "ashulia",
      "আশুলিয়া",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_birulia",
    "name": "Birulia",
    "nameBn": "বিরুলিয়া",
    "category": "area",
    "zone": "Greater Dhaka & Suburbs",
    "zoneBn": "বৃহত্তর ঢাকা ও শহরতলি",
    "subLocation": "Birulia, Dhaka",
    "coords": {
      "latitude": 23.855,
      "longitude": 90.32
    },
    "keywords": [
      "birulia",
      "birulia",
      "বিরুলিয়া",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_savar",
    "name": "Savar",
    "nameBn": "সাভার",
    "category": "area",
    "zone": "Greater Dhaka & Suburbs",
    "zoneBn": "বৃহত্তর ঢাকা ও শহরতলি",
    "subLocation": "Savar, Dhaka",
    "coords": {
      "latitude": 23.85,
      "longitude": 90.26
    },
    "keywords": [
      "savar",
      "savar",
      "সাভার",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_hemayetpur",
    "name": "Hemayetpur",
    "nameBn": "হেমায়েতপুর / আমিনবাজার",
    "category": "area",
    "zone": "Greater Dhaka & Suburbs",
    "zoneBn": "বৃহত্তর ঢাকা ও শহরতলি",
    "subLocation": "Hemayetpur, Dhaka",
    "coords": {
      "latitude": 23.795,
      "longitude": 90.27
    },
    "keywords": [
      "hemayetpur",
      "hemayetpur",
      "হেমায়েতপুর / আমিনবাজার",
      "area",
      "এলাকা"
    ]
  },
  {
    "id": "area_aminbazar",
    "name": "Aminbazar",
    "nameBn": "হেমায়েতপুর / আমিনবাজার",
    "category": "area",
    "zone": "Greater Dhaka & Suburbs",
    "zoneBn": "বৃহত্তর ঢাকা ও শহরতলি",
    "subLocation": "Aminbazar, Dhaka",
    "coords": {
      "latitude": 23.785,
      "longitude": 90.325
    },
    "keywords": [
      "aminbazar",
      "aminbazar",
      "হেমায়েতপুর / আমিনবাজার",
      "area",
      "এলাকা"
    ]
  }
];

export const MASTER_HOSPITALS = DHAKA_MASTER_LOCATIONS.filter(l => l.category === 'hospital');
export const MASTER_METRO_STATIONS = DHAKA_MASTER_LOCATIONS.filter(l => l.keywords.includes('metro'));
export const MASTER_AREAS = DHAKA_MASTER_LOCATIONS.filter(l => l.category === 'area');
export const MASTER_UNIVERSITIES = DHAKA_MASTER_LOCATIONS.filter(l => l.category === 'university');
export const MASTER_TRANSIT = DHAKA_MASTER_LOCATIONS.filter(l => l.category === 'transit');
export const MASTER_LANDMARKS = DHAKA_MASTER_LOCATIONS.filter(l => l.category === 'landmark');

/**
 * Fast O(1) indexed ID lookup
 */
const ID_MAP = new Map<string, MasterLocation>();
for (const loc of DHAKA_MASTER_LOCATIONS) {
  ID_MAP.set(loc.id, loc);
}

export function findMasterLocationById(id: string): MasterLocation | undefined {
  return ID_MAP.get(id);
}

function getDistanceMetersFast(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface SearchIndexEntry {
  loc: MasterLocation;
  cleanName: string;
  cleanBn: string;
  lowerName: string;
  lowerBn: string;
  lowerZone: string;
  lowerSub: string;
  tokens: string[];
}

const SEARCH_INDEX: SearchIndexEntry[] = DHAKA_MASTER_LOCATIONS.map(loc => ({
  loc,
  cleanName: loc.name.toLowerCase().replace(/[^a-z0-9ঀ-৿]/gi, ''),
  cleanBn: (loc.nameBn || '').toLowerCase().replace(/[^a-z0-9ঀ-৿]/gi, ''),
  lowerName: loc.name.toLowerCase(),
  lowerBn: (loc.nameBn || '').toLowerCase(),
  lowerZone: loc.zone.toLowerCase(),
  lowerSub: (loc.subLocation || '').toLowerCase(),
  tokens: [
    loc.name.toLowerCase(),
    (loc.nameBn || '').toLowerCase(),
    loc.zone.toLowerCase(),
    (loc.subLocation || '').toLowerCase(),
    ...loc.keywords.map(k => k.toLowerCase()),
  ],
}));

const CLEAN_MAP = new Map<string, MasterLocation>();
for (const item of SEARCH_INDEX) {
  if (item.cleanName) CLEAN_MAP.set(item.cleanName, item.loc);
  if (item.cleanBn) CLEAN_MAP.set(item.cleanBn, item.loc);
  if (item.lowerName) CLEAN_MAP.set(item.lowerName, item.loc);
  if (item.lowerBn) CLEAN_MAP.set(item.lowerBn, item.loc);
  for (const kw of item.loc.keywords) {
    const cleanKw = kw.toLowerCase().replace(/[^a-z0-9ঀ-৿]/gi, '');
    if (cleanKw.length >= 3 && !CLEAN_MAP.has(cleanKw)) {
      CLEAN_MAP.set(cleanKw, item.loc);
    }
  }
}

export function findMasterLocationByName(name?: string | null): MasterLocation | undefined {
  if (!name || !name.trim()) return undefined;
  const q = name.trim().toLowerCase();
  const direct = CLEAN_MAP.get(q);
  if (direct) return direct;

  const cleanQ = q.replace(/[^a-z0-9ঀ-৿]/gi, '');
  if (cleanQ) {
    const cleanDirect = CLEAN_MAP.get(cleanQ);
    if (cleanDirect) return cleanDirect;
  }

  // Split on delimiters (/ & ( ) ,) to support compound names like "Airport / Ashkona"
  const parts = q.split(/[/&(),]+/).map(p => p.trim()).filter(Boolean);
  for (const part of parts) {
    const partClean = part.replace(/[^a-z0-9ঀ-৿]/gi, '');
    if (partClean.length >= 3) {
      const partMatch = CLEAN_MAP.get(partClean);
      if (partMatch) return partMatch;
    }
  }

  // Substring fallback
  if (cleanQ.length >= 4) {
    for (const [k, loc] of CLEAN_MAP) {
      if (k.length >= 4 && (cleanQ.includes(k) || k.includes(cleanQ))) {
        return loc;
      }
    }
  }

  return undefined;
}

export function searchMasterLocations(
  query: string,
  limit: number = 8,
  userCoords?: { latitude: number; longitude: number } | null
): MasterLocation[] {
  if (!query || !query.trim()) return [];
  const q = query.trim().toLowerCase();
  const qClean = q.replace(/[^a-z0-9ঀ-৿]/gi, '');

  const matches: MasterLocation[] = [];
  for (let i = 0; i < SEARCH_INDEX.length; i++) {
    const item = SEARCH_INDEX[i];
    if (
      item.lowerName.includes(q) ||
      item.lowerBn.includes(q) ||
      item.lowerZone.includes(q) ||
      item.lowerSub.includes(q) ||
      (qClean.length >= 2 && (item.cleanName.includes(qClean) || item.cleanBn.includes(qClean)))
    ) {
      matches.push(item.loc);
      continue;
    }
    const tokens = item.tokens;
    for (let j = 0; j < tokens.length; j++) {
      if (tokens[j].includes(q)) {
        matches.push(item.loc);
        break;
      }
    }
  }

  matches.sort((a, b) => {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();

    if (aName === q && bName !== q) return -1;
    if (bName === q && aName !== q) return 1;

    const aStarts = aName.startsWith(q);
    const bStarts = bName.startsWith(q);
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;

    if (aStarts && bStarts && aName.length !== bName.length) {
      return aName.length - bName.length;
    }

    if (userCoords) {
      const distA = getDistanceMetersFast(userCoords.latitude, userCoords.longitude, a.coords.latitude, a.coords.longitude);
      const distB = getDistanceMetersFast(userCoords.latitude, userCoords.longitude, b.coords.latitude, b.coords.longitude);
      return distA - distB;
    }

    return 0;
  });

  return matches.slice(0, limit);
}

export function findNearestMasterLocation(
  coords: { latitude: number; longitude: number },
  maxDistanceMeters: number = 100
): { location: MasterLocation; distanceM: number } | null {
  let nearest: MasterLocation | null = null;
  let minDistance = maxDistanceMeters;

  for (let i = 0; i < DHAKA_MASTER_LOCATIONS.length; i++) {
    const loc = DHAKA_MASTER_LOCATIONS[i];
    const dist = getDistanceMetersFast(
      coords.latitude,
      coords.longitude,
      loc.coords.latitude,
      loc.coords.longitude
    );
    if (dist < minDistance) {
      minDistance = dist;
      nearest = loc;
    }
  }

  return nearest ? { location: nearest, distanceM: minDistance } : null;
}
