export interface ClinicInfo {
  name: string;
  department: string;
  building: string;
  room: string;
  floor: string;
  campus: string;
  phoneExt: string;
  phoneDirect: string;
  email: string;
  counselingEmail: string;
  hoursDays: string;
  hoursTime: string;
  closedDays: string;
  eligibility: string;
  rules: string[];
}

export interface ClinicService {
  id: string;
  title: string;
  titleBn: string;
  desc: string;
  descBn: string;
  icon: string;
  badge: string;
  badgeBn: string;
}

export interface DispensaryMedicine {
  id: string;
  name: string;
  nameBn: string;
  category: string;
  categoryBn: string;
  useFor: string;
  useForBn: string;
}

export interface EmergencyHospital {
  id: string;
  name: string;
  nameBn: string;
  type: string;
  typeBn: string;
  distance: string;
  distanceBn: string;
  address: string;
  phone: string;
  hotline: string;
  mapQuery: string;
  coords: {
    latitude: number;
    longitude: number;
  };
}

export interface EmergencyContact {
  id: string;
  title: string;
  titleBn: string;
  sub: string;
  subBn: string;
  phone: string;
  icon: string;
  isNational?: boolean;
}

export const BUBT_CLINIC_INFO: ClinicInfo = {
  name: 'BUBT Medical Unit',
  department: 'Health & Community Development',
  building: 'Building 3',
  room: 'Room 205',
  floor: '1st Floor (Room 205)',
  campus: 'BUBT Main Campus, Rupnagar, Mirpur-2, Dhaka-1216',
  phoneExt: '112',
  phoneDirect: '+8801741129235',
  email: 'medical@bubt.edu.bd',
  counselingEmail: 'moujuliet@bubt.edu.bd',
  hoursDays: 'Sunday - Thursday',
  hoursTime: '9:00 AM - 5:00 PM',
  closedDays: 'Friday & Saturday',
  eligibility: 'Free for all BUBT students, faculty members, and staff with valid ID card.',
  rules: [
    'Present valid BUBT Student / Employee ID card upon arrival.',
    'Walk-in triage policy for primary care and sudden sickness.',
    'Emergency referrals provided for cases needing advanced hospital care.',
    'Mental health counseling sessions are completely private and confidential.',
  ],
};

export const CLINIC_SERVICES: ClinicService[] = [
  {
    id: 'doctor_consultation',
    title: 'Doctor Consultation',
    titleBn: 'ডাক্তার পরামর্শ',
    desc: 'General physician consultations for fever, cold, infections, and chronic disease guidance.',
    descBn: 'জ্বর, ঠাণ্ডা, সংক্রমণ এবং দীর্ঘমেয়াদী রোগ ব্যবস্থাপনায় এমবিবিএস ডাক্তারের পরামর্শ।',
    icon: 'user-check',
    badge: 'Free',
    badgeBn: 'ফ্রি',
  },
  {
    id: 'mental_health',
    title: 'Mental Health Counseling',
    titleBn: 'মানসিক স্বাস্থ্য ও কাউন্সেলিং',
    desc: 'Confidential psychological support for stress, anxiety, academic burnout, and emotional well-being.',
    descBn: 'মানসিক চাপ, পরীক্ষাভীতি ও মানসিক সুস্থতায় সাইকোলজিস্টের সাথে গোপনীয় কাউন্সেলিং।',
    icon: 'heart',
    badge: 'Confidential',
    badgeBn: 'গোপনীয়',
  },
  {
    id: 'vitals_monitoring',
    title: 'Vital Signs Check',
    titleBn: 'ভাইটাল সাইন পর্যবেক্ষণ',
    desc: 'Instant check for Blood Pressure (BP), Pulse Rate, Blood Oxygen (SpO2), and Body Temperature.',
    descBn: 'ব্লাড প্রেশার, পালস, অক্সিজেন স্যাচুরেশন (SpO2) ও শারীরিক তাপমাত্রার তাৎক্ষণিক পরীক্ষা।',
    icon: 'activity',
    badge: 'Walk-in',
    badgeBn: 'ওয়াক-ইন',
  },
  {
    id: 'glucose_test',
    title: 'Blood Glucose Test',
    titleBn: 'ব্লাড সুগার পরীক্ষা',
    desc: 'Random Blood Sugar (RBS) screening for diabetes monitoring and acute hypoglycemia checks.',
    descBn: 'ডায়াবেটিস ও হাইপোগ্লাইসেমিয়ার জন্য র‍্যান্ডম ব্লাড সুগার (RBS) স্ক্রিনিং।',
    icon: 'droplet',
    badge: 'Walk-in',
    badgeBn: 'ওয়াক-ইন',
  },
  {
    id: 'first_aid',
    title: 'Emergency First Aid',
    titleBn: 'জরুরি প্রাথমিক চিকিৎসা',
    desc: 'Immediate on-campus stabilization for cuts, burns, sprains, fainting, and minor trauma.',
    descBn: 'কেটে যাওয়া, পুড়ে যাওয়া, মচকানো ও হঠাৎ অজ্ঞান হওয়া রোগীদের তাৎক্ষণিক চিকিৎসা।',
    icon: 'shield',
    badge: 'Immediate',
    badgeBn: 'তাৎক্ষণিক',
  },
  {
    id: 'nebulization',
    title: 'Asthma Nebulization',
    titleBn: 'নেবুলাইজার থেরাপি',
    desc: 'Rapid nebulization therapy for acute asthma attacks, wheezing, and breathing distress.',
    descBn: 'হাঁপানি ও শ্বাসকষ্টের জন্য ক্যাম্পাসে তাৎক্ষণিক নেবুলাইজার সুবিধা।',
    icon: 'wind',
    badge: 'On-site',
    badgeBn: 'ক্যাম্পাসে',
  },
  {
    id: 'wound_dressing',
    title: 'Wound Dressing & Bandaging',
    titleBn: 'ড্রেসিং ও ব্যান্ডেজ',
    desc: 'Antiseptic wound cleaning, sterile gauze dressing, and minor injury care.',
    descBn: 'জীবাণুমুক্ত গজ-ব্যান্ডেজ দিয়ে ক্ষতের প্রাথমিক পরিষ্কার ও ড্রেসিং সেবা।',
    icon: 'plus-circle',
    badge: 'Walk-in',
    badgeBn: 'ওয়াক-ইন',
  },
  {
    id: 'mobility_assistance',
    title: 'Wheelchair & Stretcher',
    titleBn: 'হুইলচেয়ার ও স্ট্রেচার',
    desc: 'Mobility support across campus buildings for injured or immobilized students.',
    descBn: 'অসুস্থ বা আহত শিক্ষার্থীদের ক্লাসরুম থেকে মেডিকেল সেন্টারে স্থানান্তরে সহায়তা।',
    icon: 'navigation',
    badge: 'Support',
    badgeBn: 'সহায়তা',
  },
];

export const DISPENSARY_MEDICINES: DispensaryMedicine[] = [
  {
    id: 'paracetamol',
    name: 'Paracetamol (500mg)',
    nameBn: 'প্যারাসিটামল (৫০০ মি.গ্রা.)',
    category: 'Fever & Pain Relief',
    categoryBn: 'জ্বর ও ব্যথা উপশম',
    useFor: 'Headaches, acute fever, muscle ache',
    useForBn: 'মাথাব্যথা, জ্বর এবং গা ব্যথা',
  },
  {
    id: 'ors',
    name: 'Oral Rehydration Salts (ORS)',
    nameBn: 'খাবার স্যালাইন (ওআরএস)',
    category: 'Hydration & Electrolytes',
    categoryBn: 'পানিশূন্যতা রোধ',
    useFor: 'Dehydration, heat exhaustion, diarrhea',
    useForBn: 'হিট স্ট্রোক, ডায়রিয়া ও পানিশূন্যতা',
  },
  {
    id: 'antacid',
    name: 'Antacid / Omeprazole (20mg)',
    nameBn: 'অ্যান্টাসিড / ওমিপ্রাজল (২০ মি.গ্রা.)',
    category: 'Acidity & Gastritis',
    categoryBn: 'গ্যাস্ট্রিক ও বুকজ্বালা',
    useFor: 'Heartburn, hyperacidity, acute stomach ache',
    useForBn: 'বুকজ্বালা, এসিডিটি ও পেটের অস্বস্তি',
  },
  {
    id: 'antihistamine',
    name: 'Antihistamine (Cetirizine 10mg)',
    nameBn: 'অ্যান্টিহিস্টামিন (সেটিরিজিন ১০ মি.গ্রা.)',
    category: 'Allergy & Cold',
    categoryBn: 'অ্যালার্জি ও সর্দি',
    useFor: 'Sneezing, allergic rhinitis, skin itching',
    useForBn: 'হাঁচি, সর্দি ও অ্যালার্জির চুলকানি',
  },
  {
    id: 'antispasmodic',
    name: 'Antispasmodic (Hyoscine 10mg)',
    nameBn: 'অ্যান্টিস্পাসমোডিক (হায়োসিন ১০ মি.গ্রা.)',
    category: 'Abdominal Cramps',
    categoryBn: 'পেট মোচড়ানো ব্যথা',
    useFor: 'Acute spasmodic stomach cramps',
    useForBn: 'হঠাৎ তীব্র পেটে মোচড়ানো ব্যথা',
  },
  {
    id: 'burn_cream',
    name: 'Silver Sulfadiazine Burn Cream',
    nameBn: 'বার্ন ক্রিম (সিলভার সালফাডায়াজিন)',
    category: 'Burn Treatment',
    categoryBn: 'পোড়া ক্ষতের মলম',
    useFor: 'Superficial burns and lab scalds',
    useForBn: 'হালকা পুড়ে যাওয়া ও ল্যাব দুর্ঘটনার ক্ষত',
  },
  {
    id: 'povidone',
    name: 'Povidone-Iodine Antiseptic Solution',
    nameBn: 'পোভিডোন-আয়োডিন অ্যান্টিসেপটিক',
    category: 'Antiseptic & Wound Care',
    categoryBn: 'জীবাণুনাশক',
    useFor: 'Disinfecting cuts, scrapes, and abrasions',
    useForBn: 'কেটে যাওয়া স্থান জীবাণুমুক্ত করা',
  },
];

export const NEARBY_HOSPITALS: EmergencyHospital[] = [
  {
    id: 'nhf',
    name: 'National Heart Foundation Hospital',
    nameBn: 'ন্যাশনাল হার্ট ফাউন্ডেশন হাসপাতাল',
    type: 'Specialized Cardiac & Emergency',
    typeBn: 'হৃদরোগ ও জরুরি চিকিৎসা',
    distance: '1.4 km (5 mins)',
    distanceBn: '১.৪ কি.মি. (৫ মিনিট)',
    address: 'Plot-4, Section-2, Mirpur, Dhaka-1216',
    phone: '0258054708',
    hotline: '01713007419',
    mapQuery: 'National+Heart+Foundation+Hospital+Mirpur+Dhaka',
    coords: { latitude: 23.8055, longitude: 90.3600 },
  },
  {
    id: 'delta',
    name: 'Delta Medical College & Hospital',
    nameBn: 'ডেল্টা মেডিকেল কলেজ ও হাসপাতাল',
    type: 'General Hospital & 24/7 ER',
    typeBn: 'জেনারেল হাসপাতাল ও ২৪/৭ ইমার্জেন্সি',
    distance: '2.2 km (8 mins)',
    distanceBn: '২.২ কি.মি. (৮ মিনিট)',
    address: '26/2 Principal Abul Kashem Road, Mirpur-1, Dhaka',
    phone: '029010044',
    hotline: '01777755500',
    mapQuery: 'Delta+Medical+College+Hospital+Mirpur+Dhaka',
    coords: { latitude: 23.7997, longitude: 90.3533 },
  },
  {
    id: 'mirpur_gen',
    name: 'Mirpur General Hospital & Diagnostic',
    nameBn: 'মিরপুর জেনারেল হাসপাতাল',
    type: 'General & Emergency',
    typeBn: 'সাধারণ চিকিৎসা ও জরুরি বিভাগ',
    distance: '1.8 km (7 mins)',
    distanceBn: '১.৮ কি.মি. (৭ মিনিট)',
    address: 'Section-2, Mirpur, Dhaka-1216',
    phone: '01712285141',
    hotline: '01712285141',
    mapQuery: 'Mirpur+General+Hospital+Dhaka',
    coords: { latitude: 23.8072, longitude: 90.3625 },
  },
  {
    id: 'kidney_fdn',
    name: 'Kidney Foundation Hospital & Institute',
    nameBn: 'কিডনি ফাউন্ডেশন হাসপাতাল',
    type: 'Specialized & Emergency',
    typeBn: 'কিডনি রোগ ও জরুরি বিভাগ',
    distance: '1.5 km (6 mins)',
    distanceBn: '১.৫ কি.মি. (৬ মিনিট)',
    address: 'Plot 5/1, Road 2, Section 2, Mirpur, Dhaka',
    phone: '0244807444',
    hotline: '01713017449',
    mapQuery: 'Kidney+Foundation+Hospital+Mirpur+Dhaka',
    coords: { latitude: 23.8048, longitude: 90.3610 },
  },
  {
    id: 'dhaka_dental',
    name: 'Dhaka Dental College & Hospital',
    nameBn: 'ঢাকা ডেন্টাল কলেজ হাসপাতাল',
    type: 'Dental & Oral Emergency',
    typeBn: 'দন্ত ও মুখগহ্বর জরুরি বিভাগ',
    distance: '3.1 km (10 mins)',
    distanceBn: '৩.১ কি.মি. (১০ মিনিট)',
    address: 'Mirpur-14, Dhaka-1206',
    phone: '029011938',
    hotline: '029011938',
    mapQuery: 'Dhaka+Dental+College+Hospital+Mirpur',
    coords: { latitude: 23.8091, longitude: 90.3835 },
  },
];

export const EMERGENCY_CONTACTS: EmergencyContact[] = [
  {
    id: 'bubt_medical_desk',
    title: 'BUBT Medical Unit (Room 205)',
    titleBn: 'বিইউবিটি মেডিকেল ইউনিট (রুম ২০৫)',
    sub: 'Campus First Aid & Doctor Desk (Ext. 112)',
    subBn: 'ক্যাম্পাস ফার্স্ট এইড ও ডাক্তার ডেস্ক (এক্সটেনশন ১১২)',
    phone: '+8801741129235',
    icon: 'heart',
  },
  {
    id: 'national_emergency',
    title: 'National Emergency Service',
    titleBn: 'জাতীয় জরুরি সেবা',
    sub: 'Government 24/7 Ambulance & Police Hotline',
    subBn: 'সরকারি ২৪/৭ অ্যাম্বুলেন্স, পুলিশ ও ফায়ার সার্ভিস',
    phone: '999',
    icon: 'phone-call',
    isNational: true,
  },
  {
    id: 'bubt_security',
    title: 'BUBT Campus Security & Transport',
    titleBn: 'বিইউবিটি নিরাপত্তা ও পরিবহন ডেস্ক',
    sub: 'Stretcher dispatch & emergency exit assistance',
    subBn: 'স্ট্রেচার সহায়তা ও ক্যাম্পাসে জরুরি যানবাহন',
    phone: '01967008888',
    icon: 'shield',
  },
];

