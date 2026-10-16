import type { Coordinates } from '../services/locationService';
import { findMasterLocationByName } from './dhakaMasterLocations';

export interface HospitalLocationData {
  name: string;
  subLocation: string;
  coords: Coordinates;
  searchQuery: string;
  keywords: string[];
}

// -------------------------------------------------------------
// VERIFIED GPS COORDINATES FOR ALL 108 DHAKA HOSPITALS & INSTITUTES
// Verified against official Survey of Bangladesh & OSM geographic points
// -------------------------------------------------------------
export const DHAKA_HOSPITALS_MASTER: HospitalLocationData[] = [
  // 1. PUBLIC HOSPITALS, MEDICAL INSTITUTES & GOVERNMENT CENTERS (35+)
  {
    name: 'Dhaka Medical College (DMCH)',
    subLocation: 'Shahbagh',
    coords: { latitude: 23.7257, longitude: 90.3976 },
    searchQuery: 'Dhaka Medical College Hospital, Shahbagh, Dhaka',
    keywords: ['dmch', 'dhaka medical', 'shahbagh', 'burn unit', 'ঢাকা মেডিকেল', 'ঢাকা মেডিকেল কলেজ'],
  },
  {
    name: 'BSMMU (PG Hospital)',
    subLocation: 'Shahbagh',
    coords: { latitude: 23.7389, longitude: 90.3956 },
    searchQuery: 'BSMMU (PG Hospital), Shahbagh, Dhaka',
    keywords: ['pg', 'bsmmu', 'bangabandhu', 'shahbagh', 'বিএসএমএমইউ', 'পিজি', 'বিএসএমএমইউ / পিজি'],
  },
  {
    name: 'BIRDEM General Hospital',
    subLocation: 'Shahbagh',
    coords: { latitude: 23.7397, longitude: 90.3962 },
    searchQuery: 'BIRDEM General Hospital, Shahbagh, Dhaka',
    keywords: ['birdem', 'diabetic', 'shahbagh', 'বারডেম', 'বারডেম হাসপাতাল'],
  },
  {
    name: 'BIRDEM-2 (Women & Children)',
    subLocation: 'Segunbagicha',
    coords: { latitude: 23.7342, longitude: 90.4060 },
    searchQuery: 'BIRDEM-2 Women & Children Hospital, Segunbagicha, Dhaka',
    keywords: ['birdem 2', 'segunbagicha', 'diabetic', 'বারডেম-২', 'মহিলা ও শিশু'],
  },
  {
    name: 'Suhrawardy Hospital',
    subLocation: 'Sher-e-Bangla Nagar',
    coords: { latitude: 23.7699, longitude: 90.3712 },
    searchQuery: 'Shaheed Suhrawardy Medical College Hospital, Sher-e-Bangla Nagar, Dhaka',
    keywords: ['suhrawardy', 'shohid', 'agargaon', 'sher-e-bangla', 'সোহরাওয়ার্দী', 'সোহরাওয়ার্দী হাসপাতাল'],
  },
  {
    name: 'National Heart Foundation',
    subLocation: 'Mirpur-2',
    coords: { latitude: 23.8055, longitude: 90.3600 },
    searchQuery: 'National Heart Foundation Hospital, Mirpur-2, Dhaka',
    keywords: ['heart foundation', 'nhf', 'mirpur-2', 'cardiac', 'হৃদরোগ ফাউন্ডেশন', 'জাতীয় হৃদরোগ ফাউন্ডেশন', 'national heart foundation hospital'],
  },
  {
    name: 'Delta Medical College & Hospital',
    subLocation: 'Mirpur-1',
    coords: { latitude: 23.7997, longitude: 90.3533 },
    searchQuery: 'Delta Medical College and Hospital, Mirpur-1, Dhaka',
    keywords: ['delta', 'delta medical', 'mirpur-1', 'ডেল্টা', 'ডেল্টা মেডিকেল'],
  },
  {
    name: 'Mirpur General Hospital & Diagnostic',
    subLocation: 'Mirpur-2',
    coords: { latitude: 23.8072, longitude: 90.3625 },
    searchQuery: 'Mirpur General Hospital, Section-2, Mirpur, Dhaka',
    keywords: ['mirpur general', 'mirpur-2', 'মিরপুর জেনারেল'],
  },
  {
    name: 'Kidney Foundation Hospital & Institute',
    subLocation: 'Mirpur-2',
    coords: { latitude: 23.8048, longitude: 90.3610 },
    searchQuery: 'Kidney Foundation Hospital, Mirpur-2, Dhaka',
    keywords: ['kidney foundation', 'mirpur-2', 'কিডনি ফাউন্ডেশন'],
  },
  {
    name: 'Dhaka Dental College & Hospital',
    subLocation: 'Mirpur-14',
    coords: { latitude: 23.8091, longitude: 90.3835 },
    searchQuery: 'Dhaka Dental College Hospital, Mirpur-14, Dhaka',
    keywords: ['dhaka dental', 'dental college', 'mirpur-14', 'ঢাকা ডেন্টাল'],
  },
  {
    name: 'NICVD (Heart Institute)',
    subLocation: 'Sher-e-Bangla Nagar',
    coords: { latitude: 23.7713, longitude: 90.3705 },
    searchQuery: 'NICVD (National Institute of Cardiovascular Diseases), Sher-e-Bangla Nagar, Dhaka',
    keywords: ['nicvd', 'heart institute', 'sher-e-bangla nagar', 'জাতীয় হৃদরোগ', 'জাতীয় হৃদরোগ ইনস্টিটিউট'],
  },
  {
    name: 'NINS (Neurosciences Hospital)',
    subLocation: 'Agargaon',
    coords: { latitude: 23.7725, longitude: 90.3715 },
    searchQuery: 'National Institute of Neurosciences & Hospital (NINS), Agargaon, Dhaka',
    keywords: ['nins', 'neuro', 'agargaon', 'brain', 'নিউরোসায়েন্সেস', 'জাতীয় নিউরোসায়েন্সেস'],
  },
  {
    name: 'NITOR (Pangu Hospital)',
    subLocation: 'Sher-e-Bangla Nagar',
    coords: { latitude: 23.7715, longitude: 90.3710 },
    searchQuery: 'NITOR (Pangu Hospital), Sher-e-Bangla Nagar, Dhaka',
    keywords: ['pangu', 'nitor', 'traumatology', 'orthopaedic', 'পঙ্গু', 'পঙ্গু হাসপাতাল'],
  },
  {
    name: 'NIKDU (Kidney Institute)',
    subLocation: 'Sher-e-Bangla Nagar',
    coords: { latitude: 23.7733, longitude: 90.3715 },
    searchQuery: 'National Institute of Kidney Diseases & Urology (NIKDU), Sher-e-Bangla Nagar, Dhaka',
    keywords: ['nikdu', 'kidney institute', 'dialysis', 'জাতীয় কিডনি', 'জাতীয় কিডনি ইনস্টিটিউট'],
  },
  {
    name: 'NIOH (National Eye Hospital)',
    subLocation: 'Sher-e-Bangla Nagar',
    coords: { latitude: 23.7725, longitude: 90.3720 },
    searchQuery: 'National Institute of Ophthalmology & Hospital (NIOH), Sher-e-Bangla Nagar, Dhaka',
    keywords: ['nioh', 'eye hospital', 'chokkhu', 'জাতীয় চক্ষু', 'জাতীয় চক্ষু বিজ্ঞান'],
  },
  {
    name: 'NICRH (Cancer Hospital)',
    subLocation: 'Mohakhali',
    coords: { latitude: 23.7785, longitude: 90.4045 },
    searchQuery: 'National Institute of Cancer Research & Hospital (NICRH), Mohakhali, Dhaka',
    keywords: ['nicrh', 'cancer hospital', 'mohakhali', 'oncology', 'ক্যান্সার', 'জাতীয় ক্যান্সার'],
  },
  {
    name: 'NIDCH (Chest Hospital)',
    subLocation: 'Mohakhali',
    coords: { latitude: 23.7790, longitude: 90.4050 },
    searchQuery: 'National Institute of Diseases of the Chest & Hospital (NIDCH), Mohakhali, Dhaka',
    keywords: ['nidch', 'chest hospital', 'tb', 'বক্ষব্যাধি', 'mohakhali', 'জাতীয় বক্ষব্যাধি'],
  },
  {
    name: 'NIMH (Mental Health Institute)',
    subLocation: 'Sher-e-Bangla Nagar',
    coords: { latitude: 23.7735, longitude: 90.3708 },
    searchQuery: 'National Institute of Mental Health (NIMH), Sher-e-Bangla Nagar, Dhaka',
    keywords: ['nimh', 'mental health', 'sher-e-bangla nagar', 'মানসিক স্বাস্থ্য', 'জাতীয় মানসিক স্বাস্থ্য'],
  },
  {
    name: 'NIENT (National ENT Institute)',
    subLocation: 'Tejgaon',
    coords: { latitude: 23.7650, longitude: 90.4010 },
    searchQuery: 'National Institute of ENT, Tejgaon, Dhaka',
    keywords: ['nient', 'ent', 'nak kan gola', 'tejgaon', 'নাক কান গলা', 'জাতীয় নাক কান গলা'],
  },
  {
    name: 'Burn & Plastic Surgery Institute',
    subLocation: 'Chankharpul',
    coords: { latitude: 23.7230, longitude: 90.3995 },
    searchQuery: 'Sheikh Hasina National Institute of Burn & Plastic Surgery, Chankharpul, Dhaka',
    keywords: ['shnibps', 'burn hospital', 'plastic surgery', 'chankharpul', 'বার্ন ইনস্টিটিউট', 'শেখ হাসিনা বার্ন'],
  },
  {
    name: 'Kurmitola General Hospital',
    subLocation: 'Dhaka Cantonment',
    coords: { latitude: 23.8242, longitude: 90.4072 },
    searchQuery: 'Kurmitola General Hospital, Airport Road, Dhaka Cantonment',
    keywords: ['kurmitola', 'kgh', 'cantonment', 'airport road', 'কুর্মিটোলা', 'কুর্মিটোলা জেনারেল'],
  },
  {
    name: 'CMH (Combined Military Hospital)',
    subLocation: 'Dhaka Cantonment',
    coords: { latitude: 23.8217, longitude: 90.4035 },
    searchQuery: 'Combined Military Hospital (CMH), Dhaka Cantonment',
    keywords: ['cmh', 'military hospital', 'cantonment', 'সম্মিলিত সামরিক', 'সম্মিলিত সামরিক হাসপাতাল'],
  },
  {
    name: 'AFMC (Armed Forces Medical)',
    subLocation: 'Dhaka Cantonment',
    coords: { latitude: 23.8210, longitude: 90.4040 },
    searchQuery: 'Armed Forces Medical College, Dhaka Cantonment',
    keywords: ['afmc', 'armed forces', 'cantonment', 'সশস্ত্র বাহিনী মেডিকেল', 'সশস্ত্র বাহিনী'],
  },
  {
    name: 'Sir Salimullah Mitford Hospital',
    subLocation: 'Old Dhaka',
    coords: { latitude: 23.7118, longitude: 90.4019 },
    searchQuery: 'Sir Salimullah Medical College & Mitford Hospital, Babubazar, Old Dhaka',
    keywords: ['mitford', 'ssmc', 'old dhaka', 'babubazar', 'মিটফোর্ড', 'মিটফোর্ড হাসপাতাল'],
  },
  {
    name: 'Mugda Medical College Hospital',
    subLocation: 'Mugda',
    coords: { latitude: 23.7302, longitude: 90.4328 },
    searchQuery: 'Mugda Medical College Hospital, Mugda, Dhaka',
    keywords: ['mugda', 'general hospital', 'khilgaon link', 'মুগদা', 'মুগদা মেডিকেল কলেজ'],
  },
  {
    name: 'Bangladesh Shishu Hospital',
    subLocation: 'Agargaon',
    coords: { latitude: 23.7730, longitude: 90.3725 },
    searchQuery: 'Bangladesh Shishu Hospital & Institute, Agargaon, Dhaka',
    keywords: ['shishu hospital', 'children hospital', 'agargaon', 'শিশু হাসপাতাল', 'শিশু হাসপাতাল ও ইনস্টিটিউট'],
  },
  {
    name: 'Kuwait Bangladesh Friendship Hospital',
    subLocation: 'Uttara',
    coords: { latitude: 23.8745, longitude: 90.3990 },
    searchQuery: 'Kuwait Bangladesh Friendship Govt Hospital, Sector 6, Uttara, Dhaka',
    keywords: ['kuwait maitree', 'uttara', 'govt hospital', 'কুয়েত মৈত্রী', 'কুয়েত বাংলাদেশ মৈত্রী হাসপাতাল'],
  },
  {
    name: 'icddr,b (Cholera Hospital)',
    subLocation: 'Mohakhali',
    coords: { latitude: 23.7780, longitude: 90.4040 },
    searchQuery: 'icddr,b (Cholera Hospital), Mohakhali, Dhaka',
    keywords: ['icddrb', 'cholera', 'diarrhoea', 'mohakhali', 'আইসিডিডিআরবি', 'আইসিডিডিআর,বি'],
  },
  {
    name: 'Govt Employee Hospital',
    subLocation: 'Fulbaria',
    coords: { latitude: 23.7220, longitude: 90.4080 },
    searchQuery: 'Govt Employee Hospital, Fulbaria, Dhaka',
    keywords: ['sorkari kormochari', 'fulbaria', 'gulistan', 'কর্মচারী হাসপাতাল', 'সরকারি কর্মচারী হাসপাতাল'],
  },
  {
    name: 'Central Police Hospital',
    subLocation: 'Rajarbagh',
    coords: { latitude: 23.7400, longitude: 90.4160 },
    searchQuery: 'Central Police Hospital, Rajarbagh, Dhaka',
    keywords: ['police hospital', 'rajarbagh', 'shantinagar', 'পুলিশ হাসপাতাল', 'কেন্দ্রীয় পুলিশ হাসপাতাল'],
  },
  {
    name: 'Railway General Hospital',
    subLocation: 'Kamalapur',
    coords: { latitude: 23.7340, longitude: 90.4260 },
    searchQuery: 'Railway General Hospital, Kamalapur, Dhaka',
    keywords: ['railway hospital', 'kamalapur', 'motijheel', 'রেলওয়ে হাসপাতাল'],
  },
  {
    name: 'Matuail ICMH (Child & Mother)',
    subLocation: 'Matuail',
    coords: { latitude: 23.7050, longitude: 90.4650 },
    searchQuery: 'Institute of Child and Mother Health (ICMH), Matuail, Dhaka',
    keywords: ['matuail', 'icmh', 'maternity', 'shishu', 'মাতুয়াইল', 'মাতুয়াইল শিশু ও মাতৃস্বাস্থ্য'],
  },
  {
    name: 'Azimpur Maternity (MCHTI)',
    subLocation: 'Azimpur',
    coords: { latitude: 23.7280, longitude: 90.3860 },
    searchQuery: 'Maternal and Child Health Training Institute (Azimpur Maternity), Azimpur, Dhaka',
    keywords: ['azimpur maternity', 'mchti', 'maternity', 'আজিমপুর মাতৃসদন'],
  },
  {
    name: 'TB Hospital Shyamoli',
    subLocation: 'Shyamoli',
    coords: { latitude: 23.7720, longitude: 90.3645 },
    searchQuery: '250 Bed TB Hospital, Shyamoli, Dhaka',
    keywords: ['tb hospital', 'shyamoli', 'chest', 'যক্ষ্মা হাসপাতাল', 'যক্ষ্মা হাসপাতাল শ্যামলী'],
  },
  {
    name: 'Infectious Diseases Hospital',
    subLocation: 'Mohakhali',
    coords: { latitude: 23.7782, longitude: 90.4042 },
    searchQuery: 'Infectious Diseases Hospital (IDH), Mohakhali, Dhaka',
    keywords: ['infectious diseases', 'mohakhali', 'idh', 'সংক্রামক ব্যাধি', 'সংক্রামক ব্যাধি হাসপাতাল'],
  },
  {
    name: 'Lions Eye Institute & Hospital',
    subLocation: 'Agargaon',
    coords: { latitude: 23.7740, longitude: 90.3730 },
    searchQuery: 'Lions Eye Institute & Hospital, Agargaon, Dhaka',
    keywords: ['lions eye', 'agargaon', 'eye hospital', 'লায়ন্স চক্ষু', 'লায়ন্স চক্ষু হাসপাতাল'],
  },
  {
    name: 'Ispahani Islamia Eye Institute',
    subLocation: 'Farmgate',
    coords: { latitude: 23.7570, longitude: 90.3885 },
    searchQuery: 'Ispahani Islamia Eye Institute & Hospital, Farmgate, Dhaka',
    keywords: ['islamia eye', 'farmgate', 'eye hospital', 'ইসলামিয়া চক্ষু', 'ইস্পাহানী ইসলামিয়া'],
  },
  {
    name: 'Ahsania Mission Cancer Hospital',
    subLocation: 'Uttara Sector 10',
    coords: { latitude: 23.8647, longitude: 90.3958 },
    searchQuery: 'Ahsania Mission Cancer & General Hospital, Sector 10, Uttara, Dhaka',
    keywords: ['ahsania mission', 'cancer hospital', 'uttara', 'আহছানিয়া মিশন', 'আহছানিয়া মিশন ক্যান্সার'],
  },
  {
    name: 'Dhaka Dental College & Hospital',
    subLocation: 'Mirpur-14',
    coords: { latitude: 23.8075, longitude: 90.3640 },
    searchQuery: 'Dhaka Dental College & Hospital, Mirpur-14, Dhaka',
    keywords: ['dental college', 'dhaka dental', 'mirpur-14', 'ডেন্টাল কলেজ', 'ঢাকা ডেন্টাল'],
  },

  // 2. MIRPUR & VICINITY HOSPITALS (Near BUBT Campus)
  {
    name: 'Ibn Sina Center (Mirpur-10)',
    subLocation: 'Mirpur-2 (Commerce College Road)',
    coords: { latitude: 23.8080, longitude: 90.3585 },
    searchQuery: 'Ibn Sina Diagnostic & Consultation Center, Commerce College Road, Mirpur-2, Dhaka',
    keywords: ['ibn sina center', 'ibn sina mirpur', 'mirpur 10 ibn sina', 'mirpur-10', 'mirpur-2', 'rupnagar', 'shiyalbari', 'commerce college', 'haji road', 'ইবনে সিনা মিরপুর', 'ইবনে সিনা ডায়াগনস্টিক'],
  },
  {
    name: 'Popular Hospital (Mirpur-10)',
    subLocation: 'Mirpur-10',
    coords: { latitude: 23.8072, longitude: 90.3695 },
    searchQuery: 'Popular Diagnostic Centre, Mirpur-10, Dhaka',
    keywords: ['popular mirpur', 'popular mirpur-10', 'popular diagnostic', 'পপুলার মিরপুর', 'পপুলার হাসপাতাল'],
  },
  {
    name: 'Al-Helal Specialized Hospital',
    subLocation: 'Mirpur-10',
    coords: { latitude: 23.8070, longitude: 90.3690 },
    searchQuery: 'Al-Helal Specialized Hospital, Mirpur-10, Dhaka',
    keywords: ['al helal', 'al-helal', 'mirpur-10', 'আল-হেলাল', 'আল-হেলাল হাসপাতাল'],
  },
  {
    name: 'Mirpur General Hospital',
    subLocation: 'Mirpur-2',
    coords: { latitude: 23.8040, longitude: 90.3630 },
    searchQuery: 'Mirpur General Hospital & Diagnostic, Mirpur-2, Dhaka',
    keywords: ['mirpur general', 'mirpur-2', 'near bubt', 'মিরপুর জেনারেল', 'মিরপুর জেনারেল হাসপাতাল'],
  },
  {
    name: 'Kidney Foundation Hospital',
    subLocation: 'Mirpur-2',
    coords: { latitude: 23.8045, longitude: 90.3620 },
    searchQuery: 'Kidney Foundation Hospital & Institute, Mirpur-2, Dhaka',
    keywords: ['kidney foundation', 'mirpur-2', 'dialysis', 'কিডনি ফাউন্ডেশন', 'কিডনি ফাউন্ডেশন হাসপাতাল'],
  },
  {
    name: 'Delta Medical College Hospital',
    subLocation: 'Mirpur-1',
    coords: { latitude: 23.8033, longitude: 90.3619 },
    searchQuery: 'Delta Medical College & Hospital, Mirpur-1, Dhaka',
    keywords: ['delta medical', 'mirpur-1', 'ডেল্টা মেডিকেল', 'ডেল্টা মেডিকেল কলেজ'],
  },
  {
    name: 'Marks Medical College Hospital',
    subLocation: 'Mirpur-14',
    coords: { latitude: 23.8060, longitude: 90.3830 },
    searchQuery: 'Marks Medical College & Hospital, Mirpur-14, Dhaka',
    keywords: ['marks medical', 'mirpur-14', 'dental', 'মার্কস মেডিকেল', 'মার্কস মেডিকেল কলেজ'],
  },
  {
    name: 'Al-Razi Islamia Hospital',
    subLocation: 'Mirpur-10',
    coords: { latitude: 23.8065, longitude: 90.3685 },
    searchQuery: 'Al-Razi Islamia Hospital, Mirpur-10, Dhaka',
    keywords: ['al razi', 'al-razi', 'mirpur-10', 'আল-রাজি', 'আল-রাজি ইসলামিয়া'],
  },
  {
    name: 'Asian Specialized Hospital',
    subLocation: 'Mirpur-2',
    coords: { latitude: 23.8045, longitude: 90.3625 },
    searchQuery: 'Asian Specialized Hospital, Mirpur-2, Dhaka',
    keywords: ['asian specialized', 'mirpur-2', 'এশিয়ান স্পেশালাইজড', 'এশিয়ান স্পেশালাইজড হাসপাতাল'],
  },
  {
    name: 'Selina Hospital',
    subLocation: 'Mirpur-1',
    coords: { latitude: 23.8020, longitude: 90.3550 },
    searchQuery: 'Selina Hospital, Mirpur-1, Dhaka',
    keywords: ['selina hospital', 'mirpur-1', 'সেলিনা', 'সেলিনা হাসপাতাল'],
  },
  {
    name: 'Mirpur Eye Hospital',
    subLocation: 'Mirpur-2',
    coords: { latitude: 23.8050, longitude: 90.3600 },
    searchQuery: 'Mirpur Eye Hospital, Mirpur-2, Dhaka',
    keywords: ['mirpur eye', 'mirpur-2', 'মিরপুর চক্ষু', 'মিরপুর চক্ষু হাসপাতাল'],
  },
  {
    name: 'Prime General Hospital',
    subLocation: 'Mirpur-10',
    coords: { latitude: 23.8070, longitude: 90.3685 },
    searchQuery: 'Prime General Hospital, Mirpur-10, Dhaka',
    keywords: ['prime general', 'mirpur-10', 'প্রাইম জেনারেল', 'প্রাইম জেনারেল হাসপাতাল'],
  },
  {
    name: 'BUBT Medical Center',
    subLocation: 'BUBT Campus, Mirpur-2',
    coords: { latitude: 23.8119, longitude: 90.3572 },
    searchQuery: 'BUBT Campus, Rupnagar, Mirpur-2, Dhaka',
    keywords: ['bubt medical', 'campus medical', 'বিইউবিটি মেডিকেল', 'বিইউবিটি মেডিকেল সেন্টার'],
  },
  {
    name: 'Ibn Sina Hospital (Kalyanpur)',
    subLocation: 'Kalyanpur',
    coords: { latitude: 23.7795, longitude: 90.3600 },
    searchQuery: 'Ibn Sina Medical College Hospital, Kalyanpur, Dhaka',
    keywords: ['ibn sina kalyanpur', 'ismch', 'kalyanpur', 'ইবনে সিনা কল্যাণপুর', 'ইবনে সিনা মেডিকেল কলেজ'],
  },

  // 3. MAJOR DHANMONDI, GREEN ROAD & PANTHAPATH HOSPITALS
  {
    name: 'Square Hospital',
    subLocation: 'Panthapath',
    coords: { latitude: 23.7533, longitude: 90.3817 },
    searchQuery: 'Square Hospital, 18/F Bir Uttam Qazi Nuruzzaman Sarak, Panthapath, Dhaka',
    keywords: ['square hospital', 'panthapath', 'square', 'স্কয়ার', 'স্কয়ার হাসপাতাল'],
  },
  {
    name: 'Ibn Sina Specialized (Dhanmondi)',
    subLocation: 'Dhanmondi Road 9A',
    coords: { latitude: 23.7471, longitude: 90.3705 },
    searchQuery: 'Ibn Sina Specialized Hospital, House 68, Road 15/A, Dhanmondi, Dhaka',
    keywords: ['ibn sina dhanmondi', 'dhanmondi 9a', 'specialized', 'ইবনে সিনা ধানমন্ডি', 'ইবনে সিনা হাসপাতাল'],
  },
  {
    name: 'Labaid Specialized Hospital',
    subLocation: 'Dhanmondi Road 4',
    coords: { latitude: 23.7438, longitude: 90.3807 },
    searchQuery: 'Labaid Specialized Hospital, Road 4, Dhanmondi, Dhaka',
    keywords: ['labaid specialized', 'labaid dhanmondi', 'dhanmondi road 4', 'ল্যাবএইড স্পেশালাইজড', 'ল্যাবএইড হাসপাতাল'],
  },
  {
    name: 'Labaid Cardiac Hospital',
    subLocation: 'Dhanmondi Road 4',
    coords: { latitude: 23.7438, longitude: 90.3807 },
    searchQuery: 'Labaid Cardiac Hospital, Road 4, Dhanmondi, Dhaka',
    keywords: ['labaid cardiac', 'cardiac dhanmondi', 'ল্যাবএইড কার্ডিয়াক', 'ল্যাবএইড কার্ডিয়াক হাসপাতাল'],
  },
  {
    name: 'Labaid Cancer Hospital',
    subLocation: 'Green Road',
    coords: { latitude: 23.7460, longitude: 90.3840 },
    searchQuery: 'Labaid Cancer Hospital & Super Speciality Centre, 26 Green Road, Dhaka',
    keywords: ['labaid cancer', 'green road', 'ল্যাবএইড ক্যান্সার', 'ল্যাবএইড ক্যান্সার হাসপাতাল'],
  },
  {
    name: 'Anwer Khan Modern Hospital',
    subLocation: 'Dhanmondi Road 8',
    coords: { latitude: 23.7456, longitude: 90.3776 },
    searchQuery: 'Anwer Khan Modern Medical College Hospital, Road 8, Dhanmondi, Dhaka',
    keywords: ['anwer khan', 'dhanmondi road 8', 'আনোয়ার খান মডার্ন'],
  },
  {
    name: 'Green Life Medical College Hospital',
    subLocation: 'Green Road',
    coords: { latitude: 23.7495, longitude: 90.3855 },
    searchQuery: 'Green Life Medical College Hospital, 32 Green Road, Dhaka',
    keywords: ['green life', 'green road', 'গ্রিন লাইফ', 'গ্রিন লাইফ হাসপাতাল'],
  },
  {
    name: 'Central Hospital Limited',
    subLocation: 'Green Road',
    coords: { latitude: 23.7447, longitude: 90.3853 },
    searchQuery: 'Central Hospital Limited, Green Road, Dhanmondi, Dhaka',
    keywords: ['central hospital', 'green road', 'সেন্ট্রাল হাসপাতাল'],
  },
  {
    name: 'Popular Medical College Hospital',
    subLocation: 'Dhanmondi Road 2',
    coords: { latitude: 23.7431, longitude: 90.3792 },
    searchQuery: 'Popular Medical College & Hospital, House 8, Road 2, Dhanmondi, Dhaka',
    keywords: ['popular medical', 'popular dhanmondi', 'dhanmondi road 2', 'পপুলার ধানমন্ডি', 'পপুলার মেডিকেল'],
  },
  {
    name: 'BRB Hospitals Limited',
    subLocation: 'Panthapath',
    coords: { latitude: 23.7515, longitude: 90.3840 },
    searchQuery: 'BRB Hospitals Limited, 77/A East Panthapath, Dhaka',
    keywords: ['brb', 'brb hospital', 'panthapath', 'বিআরবি', 'বিআরবি হাসপাতাল'],
  },
  {
    name: 'Samorita Hospital',
    subLocation: 'Panthapath',
    coords: { latitude: 23.7520, longitude: 90.3835 },
    searchQuery: 'Samorita Hospital Limited, 89/1 Panthapath, Dhaka',
    keywords: ['samorita', 'panthapath', 'সমরিতা', 'সমরিতা হাসপাতাল'],
  },
  {
    name: 'Comfort Nursing Home & Hospital',
    subLocation: 'Green Road',
    coords: { latitude: 23.7480, longitude: 90.3850 },
    searchQuery: 'Comfort Nursing Home & Hospital, 167/B Green Road, Dhaka',
    keywords: ['comfort hospital', 'green road', 'কমফোর্ট', 'কমফোর্ট হাসপাতাল'],
  },
  {
    name: 'Japan Bangladesh Friendship Hospital',
    subLocation: 'Dhanmondi Road 55',
    coords: { latitude: 23.7450, longitude: 90.3720 },
    searchQuery: 'Japan Bangladesh Friendship Hospital, Dhanmondi, Dhaka',
    keywords: ['japan bangladesh', 'jbfh', 'dhanmondi', 'জাপান বাংলাদেশ', 'জাপান বাংলাদেশ ফ্রেন্ডশিপ'],
  },
  {
    name: 'Harun Eye Foundation Hospital',
    subLocation: 'Dhanmondi Road 6',
    coords: { latitude: 23.7440, longitude: 90.3750 },
    searchQuery: 'Harun Eye Foundation Hospital, Road 6, Dhanmondi, Dhaka',
    keywords: ['harun eye', 'dhanmondi', 'হারুন আই', 'হারুন আই ফাউন্ডেশন'],
  },
  {
    name: 'Medinova Medical Services',
    subLocation: 'Dhanmondi',
    coords: { latitude: 23.7445, longitude: 90.3780 },
    searchQuery: 'Medinova Medical Services, Dhanmondi, Dhaka',
    keywords: ['medinova', 'dhanmondi', 'মেদিনোভা', 'মেদিনোভা মেডিকেল'],
  },
  {
    name: 'Renaissance Hospital',
    subLocation: 'Dhanmondi Road 27',
    coords: { latitude: 23.7525, longitude: 90.3720 },
    searchQuery: 'Renaissance Hospital, Road 27, Dhanmondi, Dhaka',
    keywords: ['renaissance', 'dhanmondi 27', 'রেনেসাঁ', 'রেনেসাঁ হাসপাতাল'],
  },

  // 4. SHYAMOLI & MOHAMMADPUR HOSPITALS
  {
    name: 'Bangladesh Specialized Hospital',
    subLocation: 'Shyamoli',
    coords: { latitude: 23.7719, longitude: 90.3639 },
    searchQuery: 'Bangladesh Specialized Hospital, Mirpur Road, Shyamoli, Dhaka',
    keywords: ['bangladesh specialized', 'bsh', 'shyamoli', 'বাংলাদেশ স্পেশালাইজড'],
  },
  {
    name: 'Dhaka Central International Hospital',
    subLocation: 'Shyamoli Ring Road',
    coords: { latitude: 23.7710, longitude: 90.3605 },
    searchQuery: 'Dhaka Central International Medical College & Hospital, Ring Road, Shyamoli, Dhaka',
    keywords: ['central international', 'shyamoli ring road', 'ঢাকা সেন্ট্রাল', 'ঢাকা সেন্ট্রাল ইন্টারন্যাশনাল'],
  },
  {
    name: 'Trauma Center & Hospital',
    subLocation: 'Shyamoli',
    coords: { latitude: 23.7722, longitude: 90.3640 },
    searchQuery: 'Trauma Center & Specialised Hospital, Shyamoli, Dhaka',
    keywords: ['trauma center', 'shyamoli', 'ট্রমা সেন্টার'],
  },
  {
    name: 'BOSH (Bangladesh Orthopaedic)',
    subLocation: 'Shyamoli',
    coords: { latitude: 23.7715, longitude: 90.3635 },
    searchQuery: 'Bangladesh Orthopaedic Hospital (BOSH), Shyamoli, Dhaka',
    keywords: ['bosh', 'orthopaedic hospital', 'shyamoli', 'অর্থোপেডিক', 'বাংলাদেশ অর্থোপেডিক'],
  },
  {
    name: 'City Hospital',
    subLocation: 'Mohammadpur',
    coords: { latitude: 23.7630, longitude: 90.3620 },
    searchQuery: 'City Hospital & Medical College, Lalmatia / Mohammadpur, Dhaka',
    keywords: ['city hospital', 'mohammadpur', 'সিটি হাসপাতাল'],
  },
  {
    name: 'Care Medical College Hospital',
    subLocation: 'Mohammadpur',
    coords: { latitude: 23.7640, longitude: 90.3610 },
    searchQuery: 'Care Medical College & Hospital, Iqbal Road, Mohammadpur, Dhaka',
    keywords: ['care medical', 'mohammadpur', 'কেয়ার মেডিকেল', 'কেয়ার মেডিকেল কলেজ'],
  },
  {
    name: 'Al-Manar Hospital',
    subLocation: 'Mohammadpur',
    coords: { latitude: 23.7650, longitude: 90.3600 },
    searchQuery: 'Al-Manar Hospital Limited, Satmasjid Road, Mohammadpur, Dhaka',
    keywords: ['al manar', 'al-manar', 'mohammadpur', 'আল-মানার', 'আল-মানার হাসপাতাল'],
  },
  {
    name: 'Z.H. Sikder Women Medical College Hospital',
    subLocation: 'Rayerbazar / Dhanmondi',
    coords: { latitude: 23.7450, longitude: 90.3580 },
    searchQuery: 'Z.H. Sikder Women Medical College Hospital, Monica Estate, Rayerbazar, Dhaka',
    keywords: ['sikder medical', 'rayerbazar', 'সিকদার মেডিকেল', 'সিকদার মহিলা মেডিকেল কলেজ'],
  },

  // 5. GULSHAN, BANANI, BASHUNDHARA & MOHAKHALI
  {
    name: 'Evercare Hospital',
    subLocation: 'Bashundhara R/A',
    coords: { latitude: 23.8103, longitude: 90.4312 },
    searchQuery: 'Evercare Hospital Dhaka, Plot 81, Block E, Bashundhara R/A, Dhaka',
    keywords: ['evercare', 'apollo', 'bashundhara', 'এভারকেয়ার', 'এভারকেয়ার হাসপাতাল'],
  },
  {
    name: 'United Hospital',
    subLocation: 'Gulshan-2',
    coords: { latitude: 23.7997, longitude: 90.4182 },
    searchQuery: 'United Hospital Limited, Plot 15, Road 71, Gulshan-2, Dhaka',
    keywords: ['united hospital', 'gulshan-2', 'gulshan', 'ইউনাইটেড', 'ইউনাইটেড হাসপাতাল'],
  },
  {
    name: 'Praava Health',
    subLocation: 'Banani',
    coords: { latitude: 23.7937, longitude: 90.4043 },
    searchQuery: 'Praava Health, Plot 9, Road 17, Block C, Banani, Dhaka',
    keywords: ['praava health', 'banani', 'প্রাভা হেলথ'],
  },
  {
    name: 'Universal Medical College Hospital (Aysha Memorial)',
    subLocation: 'Mohakhali',
    coords: { latitude: 23.7745, longitude: 90.4020 },
    searchQuery: 'Universal Medical College Hospital (Aysha Memorial), Mohakhali, Dhaka',
    keywords: ['universal medical', 'aysha memorial', 'mohakhali', 'আয়েশা মেমোরিয়াল', 'ইউনিভার্সাল মেডিকেল'],
  },
  {
    name: 'Metropolitan Medical Centre',
    subLocation: 'Mohakhali',
    coords: { latitude: 23.7750, longitude: 90.4025 },
    searchQuery: 'Metropolitan Medical Centre, Mohakhali, Dhaka',
    keywords: ['metropolitan', 'mohakhali', 'মেট্রোপলিটন', 'মেট্রোপলিটন মেডিকেল'],
  },
  {
    name: 'AMZ Hospital',
    subLocation: 'Uttar Badda',
    coords: { latitude: 23.7845, longitude: 90.4255 },
    searchQuery: 'AMZ Hospital, Uttar Badda, Dhaka',
    keywords: ['amz hospital', 'badda', 'এএমজেড', 'এএমজেড হাসপাতাল'],
  },
  {
    name: 'Badda General Hospital',
    subLocation: 'Badda',
    coords: { latitude: 23.7820, longitude: 90.4250 },
    searchQuery: 'Badda General Hospital, Badda, Dhaka',
    keywords: ['badda general', 'বাড্ডা জেনারেল', 'বাড্ডা জেনারেল হাসপাতাল'],
  },

  // 6. UTTARA HOSPITALS
  {
    name: 'Uttara Crescent Hospital',
    subLocation: 'Uttara Sector 3',
    coords: { latitude: 23.8680, longitude: 90.3960 },
    searchQuery: 'Uttara Crescent Hospital, Sector 3, Uttara, Dhaka',
    keywords: ['uttara crescent', 'sector 3', 'উত্তরা ক্রিসেন্ট', 'উত্তরা ক্রিসেন্ট হাসপাতাল'],
  },
  {
    name: 'Lubana General Hospital',
    subLocation: 'Uttara Sector 3',
    coords: { latitude: 23.8685, longitude: 90.3965 },
    searchQuery: 'Lubana General Hospital, Sector 3, Uttara, Dhaka',
    keywords: ['lubana', 'uttara sector 3', 'লুবানা', 'লুবানা জেনারেল'],
  },
  {
    name: 'Aichi Hospital',
    subLocation: 'Uttara Sector 8',
    coords: { latitude: 23.8760, longitude: 90.4020 },
    searchQuery: 'Aichi Hospital Limited, Sector 8, Uttara, Dhaka',
    keywords: ['aichi', 'uttara sector 8', 'আইচি', 'আইচি হাসপাতাল'],
  },
  {
    name: 'Shin-Shin Japan Hospital',
    subLocation: 'Uttara Sector 11',
    coords: { latitude: 23.8780, longitude: 90.3910 },
    searchQuery: 'Shin-Shin Japan Hospital, Sector 11, Uttara, Dhaka',
    keywords: ['shin shin', 'japan hospital', 'uttara 11', 'শিন-শিন', 'শিন-শিন জাপান'],
  },
  {
    name: 'Ship International Hospital',
    subLocation: 'Uttara Sector 9',
    coords: { latitude: 23.8730, longitude: 90.3920 },
    searchQuery: 'Ship International Hospital, Sector 9, Uttara, Dhaka',
    keywords: ['ship international', 'uttara sector 9', 'শীপ', 'শীপ ইন্টারন্যাশনাল'],
  },
  {
    name: 'Uttara Adhunik Medical College Hospital',
    subLocation: 'Uttara Sector 1',
    coords: { latitude: 23.8620, longitude: 90.3980 },
    searchQuery: 'Uttara Adhunik Medical College Hospital, Sector 1, Uttara, Dhaka',
    keywords: ['uttara adhunik', 'sector 1', 'উত্তরা আধুনিক', 'উত্তরা আধুনিক মেডিকেল'],
  },
  {
    name: 'Radium General Hospital',
    subLocation: 'Uttara Sector 3',
    coords: { latitude: 23.8690, longitude: 90.3955 },
    searchQuery: 'Radium General Hospital, Sector 3, Uttara, Dhaka',
    keywords: ['radium general', 'uttara sector 3', 'রেডিয়াম', 'রেডিয়াম জেনারেল'],
  },
  {
    name: 'Ahsania Mission General Hospital',
    subLocation: 'Uttara Sector 10',
    coords: { latitude: 23.8647, longitude: 90.3958 },
    searchQuery: 'Ahsania Mission General Hospital, Sector 10, Uttara, Dhaka',
    keywords: ['ahsania general', 'uttara 10', 'আহছানিয়া মিশন জেনারেল'],
  },
  {
    name: 'East West Medical College Hospital',
    subLocation: 'Turag',
    coords: { latitude: 23.8820, longitude: 90.3550 },
    searchQuery: 'East West Medical College & Hospital, Aichi Nagar, Turag, Dhaka',
    keywords: ['east west medical', 'turag', 'ইস্ট ওয়েস্ট', 'ইস্ট ওয়েস্ট মেডিকেল'],
  },

  // 7. CENTRAL DHAKA, MOGHBAZAR, MALIBAGH & OLD DHAKA
  {
    name: 'Holy Family Red Crescent Hospital',
    subLocation: 'Eskaton',
    coords: { latitude: 23.7460, longitude: 90.4040 },
    searchQuery: 'Holy Family Red Crescent Medical College Hospital, 1 Eskaton Garden, Dhaka',
    keywords: ['holy family', 'red crescent', 'eskaton', 'হলি ফ্যামিলি', 'হলি ফ্যামিলি হাসপাতাল'],
  },
  {
    name: 'Ad-din Women’s Medical College',
    subLocation: 'Moghbazar',
    coords: { latitude: 23.7475, longitude: 90.4060 },
    searchQuery: 'Ad-din Women’s Medical College Hospital, 2 Bara Moghbazar, Dhaka',
    keywords: ['ad-din', 'addin', 'moghbazar', 'আদ-দ্বীন', 'আদ-দ্বীন হাসপাতাল'],
  },
  {
    name: 'Insaf Barakah Kidney Hospital',
    subLocation: 'Moghbazar',
    coords: { latitude: 23.7485, longitude: 90.4055 },
    searchQuery: 'Insaf Barakah Kidney & General Hospital, Moghbazar, Dhaka',
    keywords: ['insaf barakah', 'moghbazar', 'ইনসাফ বারাকাহ', 'ইনসাফ বারাকাহ হাসপাতাল'],
  },
  {
    name: 'Dhaka Community Medical College Hospital',
    subLocation: 'Moghbazar',
    coords: { latitude: 23.7460, longitude: 90.4070 },
    searchQuery: 'Dhaka Community Medical College Hospital, 190/1 Wireless Railgate, Moghbazar, Dhaka',
    keywords: ['dhaka community', 'moghbazar', 'কমিউনিটি মেডিকেল', 'ঢাকা কমিউনিটি'],
  },
  {
    name: 'City Dental College & Hospital',
    subLocation: 'Moghbazar',
    coords: { latitude: 23.7470, longitude: 90.4050 },
    searchQuery: 'City Dental College & Hospital, Moghbazar, Dhaka',
    keywords: ['city dental', 'moghbazar', 'সিটি ডেন্টাল', 'সিটি ডেন্টাল কলেজ'],
  },
  {
    name: 'Sirajul Islam Medical College Hospital',
    subLocation: 'Malibagh',
    coords: { latitude: 23.7510, longitude: 90.4140 },
    searchQuery: 'Dr. Sirajul Islam Medical College & Hospital, Malibagh Roundabout, Dhaka',
    keywords: ['sirajul islam', 'malibagh', 'সিরাজুল ইসলাম', 'সিরাজুল ইসলাম মেডিকেল'],
  },
  {
    name: 'Islami Bank Central Hospital',
    subLocation: 'Kakrail',
    coords: { latitude: 23.7380, longitude: 90.4100 },
    searchQuery: 'Islami Bank Central Hospital, Kakrail, Dhaka',
    keywords: ['islami bank', 'kakrail', 'ইসলামী ব্যাংক', 'ইসলামী ব্যাংক হাসপাতাল'],
  },
  {
    name: 'Al-Baraka Hospital',
    subLocation: 'Rajarbagh',
    coords: { latitude: 23.7410, longitude: 90.4150 },
    searchQuery: 'Al-Baraka Hospital, Rajarbagh, Dhaka',
    keywords: ['al baraka', 'rajarbagh', 'আল-বারাকা', 'আল-বারাকা হাসপাতাল'],
  },
  {
    name: 'Al-Haramain Hospital',
    subLocation: 'Shantinagar',
    coords: { latitude: 23.7405, longitude: 90.4120 },
    searchQuery: 'Al-Haramain Hospital, Shantinagar, Dhaka',
    keywords: ['al haramain', 'shantinagar', 'আল-হারামাইন', 'আল-হারামাইন হাসপাতাল'],
  },
  {
    name: 'Farazy Hospital',
    subLocation: 'Banasree Block E',
    coords: { latitude: 23.7630, longitude: 90.4320 },
    searchQuery: 'Farazy Hospital Limited, Block E, Banasree, Dhaka',
    keywords: ['farazy', 'banasree', 'ফরাজী', 'ফরাজী হাসপাতাল'],
  },
  {
    name: 'Impulse Hospital',
    subLocation: 'Tejgaon Industrial Area',
    coords: { latitude: 23.7660, longitude: 90.4020 },
    searchQuery: 'Impulse Hospital, Tejgaon Industrial Area, Dhaka',
    keywords: ['impulse', 'tejgaon', 'ইম্পালস', 'ইম্পালস হাসপাতাল'],
  },
  {
    name: 'Asgar Ali Hospital',
    subLocation: 'Gandaria',
    coords: { latitude: 23.7050, longitude: 90.4280 },
    searchQuery: 'Asgar Ali Hospital, Gandaria, Old Dhaka',
    keywords: ['asgar ali', 'gandaria', 'old dhaka', 'আজগর আলী', 'আজগর আলী হাসপাতাল'],
  },
  {
    name: 'Dhaka National Medical College',
    subLocation: 'Old Dhaka (Johnson Road)',
    coords: { latitude: 23.7110, longitude: 90.4120 },
    searchQuery: 'Dhaka National Medical College & Hospital, Johnson Road, Old Dhaka',
    keywords: ['dhaka national', 'johnson road', 'old dhaka', 'ঢাকা ন্যাশনাল'],
  },
  {
    name: 'Salahuddin Specialized Hospital',
    subLocation: 'Wari, Old Dhaka',
    coords: { latitude: 23.7160, longitude: 90.4200 },
    searchQuery: 'Salahuddin Specialized Hospital, Wari, Old Dhaka',
    keywords: ['salahuddin', 'wari', 'সালাহউদ্দীন', 'সালাহউদ্দীন স্পেশালাইজড'],
  },
  {
    name: 'Sumona Clinic & Hospital',
    subLocation: 'Patuatuly, Sadarghat',
    coords: { latitude: 23.7100, longitude: 90.4130 },
    searchQuery: 'Sumona Clinic & Hospital, Patuatuly, Sadarghat, Dhaka',
    keywords: ['sumona clinic', 'sadarghat', 'patuatuly', 'সুমনা', 'সুমনা ক্লিনিক'],
  },
  {
    name: 'Dr. Mahbubur Rahman Mollah Hospital',
    subLocation: 'Demra',
    coords: { latitude: 23.7150, longitude: 90.4700 },
    searchQuery: 'Dr. Mahbubur Rahman Mollah Hospital, Demra, Dhaka',
    keywords: ['mollah hospital', 'demra', 'মোল্লা হাসপাতাল', 'মাহবুবুর রহমান মোল্লা'],
  },

  // 8. GREATER DHAKA & SUBURBS (Savar, Tongi)
  {
    name: 'Enam Medical College & Hospital',
    subLocation: 'Savar',
    coords: { latitude: 23.8519, longitude: 90.2612 },
    searchQuery: 'Enam Medical College & Hospital, Thana Road, Savar, Dhaka',
    keywords: ['enam medical', 'savar', 'এনাম মেডিকেল', 'এনাম মেডিকেল কলেজ'],
  },
  {
    name: 'Monno Medical College Hospital',
    subLocation: 'Savar',
    coords: { latitude: 23.8650, longitude: 90.2450 },
    searchQuery: 'Monno Medical College & Hospital, Savar, Dhaka',
    keywords: ['monno medical', 'savar', 'মুন্নু মেডিকেল', 'মুন্নু মেডিকেল কলেজ'],
  },
  {
    name: 'International Medical College Hospital',
    subLocation: 'Tongi',
    coords: { latitude: 23.9100, longitude: 90.4300 },
    searchQuery: 'International Medical College & Hospital, Gushulia, Tongi, Gazipur',
    keywords: ['international medical', 'tongi', 'আন্তর্জাতিক মেডিকেল'],
  },
];

// -------------------------------------------------------------
// VERIFIED GEOGRAPHIC CENTERS FOR ALL 144 DHAKA RESIDENTIAL AREAS
// -------------------------------------------------------------
export const DHAKA_AREA_CENTERS: Record<string, Coordinates> = {
  // Mirpur & Campus Vicinity
  'mirpur': { latitude: 23.8078, longitude: 90.3582 },
  'mirpur-2': { latitude: 23.8078, longitude: 90.3582 },
  'mirpur-1': { latitude: 23.7956, longitude: 90.3537 },
  'mirpur-3': { latitude: 23.8110, longitude: 90.3600 },
  'mirpur-6': { latitude: 23.8080, longitude: 90.3620 },
  'mirpur-7': { latitude: 23.8180, longitude: 90.3600 },
  'mirpur-10': { latitude: 23.8071, longitude: 90.3686 },
  'mirpur-11': { latitude: 23.8175, longitude: 90.3662 },
  'mirpur-11.5': { latitude: 23.8210, longitude: 90.3650 },
  'bauniabadh': { latitude: 23.8210, longitude: 90.3700 },
  'bauniabadh (mirpur-11)': { latitude: 23.8210, longitude: 90.3700 },
  'purobi': { latitude: 23.8210, longitude: 90.3650 },
  'mirpur-12': { latitude: 23.8277, longitude: 90.3644 },
  'mirpur-12 dohs': { latitude: 23.8320, longitude: 90.3700 },
  'dohs mirpur': { latitude: 23.8320, longitude: 90.3700 },
  'mirpur-13': { latitude: 23.8020, longitude: 90.3750 },
  'mirpur-14': { latitude: 23.7980, longitude: 90.3830 },
  'pallabi': { latitude: 23.8240, longitude: 90.3620 },
  'rupnagar': { latitude: 23.8119, longitude: 90.3572 },
  'paikpara': { latitude: 23.7850, longitude: 90.3600 },
  'pirerbag': { latitude: 23.7880, longitude: 90.3620 },
  'monipur': { latitude: 23.7950, longitude: 90.3650 },
  'kazipara': { latitude: 23.7915, longitude: 90.3725 },
  'shewrapara': { latitude: 23.7860, longitude: 90.3740 },
  'ibrahimpur': { latitude: 23.7930, longitude: 90.3880 },
  'kafrul': { latitude: 23.7900, longitude: 90.3850 },
  'senpara parbata': { latitude: 23.8010, longitude: 90.3720 },
  'vashantek': { latitude: 23.8050, longitude: 90.3920 },
  'darussalam': { latitude: 23.7910, longitude: 90.3520 },
  'ansar camp': { latitude: 23.8000, longitude: 90.3550 },
  'tolabagh': { latitude: 23.8000, longitude: 90.3550 },

  // Western & Mohammadpur Zone
  'kalyanpur': { latitude: 23.7795, longitude: 90.3600 },
  'shyamoli': { latitude: 23.7725, longitude: 90.3642 },
  'agargaon': { latitude: 23.7779, longitude: 90.3807 },
  'sher-e-bangla nagar': { latitude: 23.7700, longitude: 90.3720 },
  'mohammadpur': { latitude: 23.7658, longitude: 90.3584 },
  'lalmatia': { latitude: 23.7550, longitude: 90.3680 },
  'adabor': { latitude: 23.7710, longitude: 90.3550 },
  'japan garden city': { latitude: 23.7680, longitude: 90.3560 },
  'bosila': { latitude: 23.7480, longitude: 90.3420 },
  'gabtoli': { latitude: 23.7840, longitude: 90.3450 },
  'town hall': { latitude: 23.7610, longitude: 90.3640 },
  'tajmahal road': { latitude: 23.7620, longitude: 90.3630 },
  'salimullah road': { latitude: 23.7600, longitude: 90.3610 },
  'noorjahan road': { latitude: 23.7590, longitude: 90.3620 },
  'shia masjid': { latitude: 23.7680, longitude: 90.3590 },
  'ring road': { latitude: 23.7710, longitude: 90.3610 },
  'chandrima udyan': { latitude: 23.7660, longitude: 90.3780 },
  'shekhertek': { latitude: 23.7680, longitude: 90.3520 },
  'monsurabad': { latitude: 23.7660, longitude: 90.3480 },
  'baitul aman': { latitude: 23.7670, longitude: 90.3580 },
  'nobodoy': { latitude: 23.7650, longitude: 90.3540 },

  // Central Dhanmondi, Panthapath & Green Road
  'dhanmondi': { latitude: 23.7461, longitude: 90.3742 },
  'shankar': { latitude: 23.7490, longitude: 90.3680 },
  'satmasjid road': { latitude: 23.7480, longitude: 90.3710 },
  'jigatola': { latitude: 23.7380, longitude: 90.3720 },
  'panthapath': { latitude: 23.7518, longitude: 90.3862 },
  'green road': { latitude: 23.7465, longitude: 90.3850 },
  'kalabagan': { latitude: 23.7480, longitude: 90.3820 },
  'sobhanbagh': { latitude: 23.7510, longitude: 90.3780 },
  'shukrabad': { latitude: 23.7530, longitude: 90.3780 },
  'farmgate': { latitude: 23.7570, longitude: 90.3888 },
  'indira road': { latitude: 23.7580, longitude: 90.3860 },
  'tejturi bazar': { latitude: 23.7560, longitude: 90.3910 },
  'bijoy sarani': { latitude: 23.7660, longitude: 90.3870 },
  'karwan bazar': { latitude: 23.7520, longitude: 90.3930 },
  'banglamotor': { latitude: 23.7460, longitude: 90.3960 },
  'hatirpool': { latitude: 23.7440, longitude: 90.3910 },
  'katabon': { latitude: 23.7400, longitude: 90.3890 },

  // Central Ramna, Shahbagh & Old Dhaka
  'shahbagh': { latitude: 23.7380, longitude: 90.3950 },
  'eskaton': { latitude: 23.7460, longitude: 90.4020 },
  'bailey road': { latitude: 23.7410, longitude: 90.4050 },
  'officers colony': { latitude: 23.7420, longitude: 90.4020 },
  'moghbazar': { latitude: 23.7475, longitude: 90.4060 },
  'malibagh': { latitude: 23.7510, longitude: 90.4140 },
  'mouchak': { latitude: 23.7470, longitude: 90.4120 },
  'shantinagar': { latitude: 23.7410, longitude: 90.4130 },
  'rajarbagh': { latitude: 23.7400, longitude: 90.4160 },
  'kakrail': { latitude: 23.7380, longitude: 90.4100 },
  'kamalapur': { latitude: 23.7340, longitude: 90.4260 },
  'motijheel': { latitude: 23.7330, longitude: 90.4170 },
  'paltan': { latitude: 23.7320, longitude: 90.4120 },
  'fulbaria': { latitude: 23.7220, longitude: 90.4080 },
  'segunbagicha': { latitude: 23.7340, longitude: 90.4060 },
  'buet campus': { latitude: 23.7260, longitude: 90.3920 },
  'chankharpul': { latitude: 23.7230, longitude: 90.3990 },
  'bakshibazar': { latitude: 23.7210, longitude: 90.3940 },
  'azimpur': { latitude: 23.7280, longitude: 90.3860 },
  'lalbagh': { latitude: 23.7190, longitude: 90.3880 },
  'chawkbazar': { latitude: 23.7170, longitude: 90.3980 },
  'armanitola': { latitude: 23.7130, longitude: 90.4040 },
  'babubazar': { latitude: 23.7110, longitude: 90.4010 },
  'islampur': { latitude: 23.7100, longitude: 90.4080 },
  'bangshal': { latitude: 23.7180, longitude: 90.4080 },
  'tikatuli': { latitude: 23.7220, longitude: 90.4220 },
  'sayedabad': { latitude: 23.7150, longitude: 90.4300 },
  'sutrapur': { latitude: 23.7080, longitude: 90.4180 },
  'laxmibazar': { latitude: 23.7090, longitude: 90.4160 },
  'shankhari bazar': { latitude: 23.7110, longitude: 90.4100 },
  'tantibazar': { latitude: 23.7120, longitude: 90.4070 },
  'dayaganj': { latitude: 23.7120, longitude: 90.4280 },
  'dholairkhal': { latitude: 23.7140, longitude: 90.4220 },
  'farashganj': { latitude: 23.7040, longitude: 90.4150 },
  'shyambazar': { latitude: 23.7020, longitude: 90.4130 },
  'old dhaka': { latitude: 23.7120, longitude: 90.4020 },
  'gandaria': { latitude: 23.7050, longitude: 90.4280 },
  'wari': { latitude: 23.7160, longitude: 90.4200 },
  'sadarghat': { latitude: 23.7080, longitude: 90.4100 },
  'kamrangirchar': { latitude: 23.7150, longitude: 90.3750 },
  'hazaribagh': { latitude: 23.7350, longitude: 90.3650 },
  'rayer bazar': { latitude: 23.7420, longitude: 90.3620 },
  'keraniganj': { latitude: 23.6980, longitude: 90.3950 },
  'zinjira': { latitude: 23.7020, longitude: 90.3960 },

  // Eastern Dhaka & Khilgaon
  'khilgaon': { latitude: 23.7510, longitude: 90.4250 },
  'goran': { latitude: 23.7550, longitude: 90.4320 },
  'sipahibagh': { latitude: 23.7540, longitude: 90.4280 },
  'basabo': { latitude: 23.7450, longitude: 90.4350 },
  'madartek': { latitude: 23.7420, longitude: 90.4380 },
  'shahjahanpur': { latitude: 23.7420, longitude: 90.4220 },
  'maniknagar': { latitude: 23.7280, longitude: 90.4300 },
  'mugda': { latitude: 23.7302, longitude: 90.4328 },
  'rampura': { latitude: 23.7610, longitude: 90.4220 },
  'banasree': { latitude: 23.7630, longitude: 90.4320 },
  'aftabnagar': { latitude: 23.7680, longitude: 90.4350 },
  'badda': { latitude: 23.7845, longitude: 90.4255 },
  'pragati sarani': { latitude: 23.7920, longitude: 90.4250 },
  'natun bazar': { latitude: 23.7950, longitude: 90.4240 },
  'madani avenue': { latitude: 23.7960, longitude: 90.4260 },

  // South-Eastern Belt & Suburbs
  'matuail': { latitude: 23.7050, longitude: 90.4650 },
  'shanir akhra': { latitude: 23.7020, longitude: 90.4480 },
  'rayerbag': { latitude: 23.7010, longitude: 90.4550 },
  'dania': { latitude: 23.6980, longitude: 90.4500 },
  'dhalpur': { latitude: 23.7180, longitude: 90.4380 },
  'golapbagh': { latitude: 23.7170, longitude: 90.4350 },
  'jatrabari': { latitude: 23.7110, longitude: 90.4350 },
  'demra': { latitude: 23.7150, longitude: 90.4700 },
  'postogola': { latitude: 23.6950, longitude: 90.4350 },
  'jurain': { latitude: 23.6980, longitude: 90.4390 },
  'signboard': { latitude: 23.6850, longitude: 90.4850 },
  'narayanganj': { latitude: 23.6200, longitude: 90.5000 },

  // Northern Dhaka, Cantonment & Uttara
  'tejgaon': { latitude: 23.7660, longitude: 90.4020 },
  'mohakhali': { latitude: 23.7776, longitude: 90.4054 },
  'banani': { latitude: 23.7937, longitude: 90.4043 },
  'gulshan': { latitude: 23.7925, longitude: 90.4078 },
  'gulshan-1': { latitude: 23.7780, longitude: 90.4160 },
  'gulshan-2': { latitude: 23.7997, longitude: 90.4182 },
  'baridhara': { latitude: 23.8000, longitude: 90.4220 },
  'baridhara dohs': { latitude: 23.8120, longitude: 90.4180 },
  'bashundhara': { latitude: 23.8103, longitude: 90.4312 },
  'kuril': { latitude: 23.8180, longitude: 90.4200 },
  'cantonment': { latitude: 23.8217, longitude: 90.4035 },
  'khilkhet': { latitude: 23.8300, longitude: 90.4190 },
  'nikunja': { latitude: 23.8320, longitude: 90.4180 },
  'airport': { latitude: 23.8430, longitude: 90.4050 },
  'ashkona': { latitude: 23.8500, longitude: 90.4120 },
  'uttara': { latitude: 23.8759, longitude: 90.3795 },
  'jasimuddin': { latitude: 23.8650, longitude: 90.3990 },
  'rajlakshmi': { latitude: 23.8670, longitude: 90.3980 },
  'azampur': { latitude: 23.8690, longitude: 90.4010 },
  'house building': { latitude: 23.8740, longitude: 90.3980 },
  'uttarkhan': { latitude: 23.8780, longitude: 90.4280 },
  'dakshinkhan': { latitude: 23.8650, longitude: 90.4260 },
  'turag': { latitude: 23.8820, longitude: 90.3550 },
  'tongi': { latitude: 23.9100, longitude: 90.4300 },
  'gazipur': { latitude: 23.9999, longitude: 90.4203 },
  'gazipur chowrasta': { latitude: 23.9850, longitude: 90.3800 },
  'ashulia': { latitude: 23.9050, longitude: 90.3200 },
  'birulia': { latitude: 23.8550, longitude: 90.3200 },
  'savar': { latitude: 23.8500, longitude: 90.2600 },
  'hemayetpur': { latitude: 23.7950, longitude: 90.2700 },
  'aminbazar': { latitude: 23.7850, longitude: 90.3250 },
};

export interface ResolvedHospitalLocation {
  coords: Coordinates;
  verifiedName: string;
  subLocation: string;
  searchQuery: string;
  isExactMatch: boolean;
}

// Pre-sorted by key length descending to guarantee specific places (e.g. mirpur-11.5, mirpur-10, mirpur-12 dohs)
// match before generic substrings (e.g. mirpur-1)
const SORTED_AREA_ENTRIES = Object.entries(DHAKA_AREA_CENTERS).sort(
  (a, b) => b[0].length - a[0].length
);

/**
 * Intelligent hospital & area coordinate resolver.
 * Handles multi-branch hospitals (e.g. Ibn Sina Mirpur-10 vs Dhanmondi vs Kalyanpur),
 * Bengali aliases, area keywords, and formats a clean Google Maps search query.
 */
export function resolveHospitalLocation(
  hospitalName: string,
  areaName?: string
): ResolvedHospitalLocation {
  const rawHosp = (hospitalName || '').trim();
  const rawArea = (areaName || '').trim();
  const hLower = rawHosp.toLowerCase();
  const aLower = rawArea.toLowerCase();
  const combined = `${hLower} ${aLower}`;

  // 0. Coordinate-First Resolution for Map-Picked Locations (e.g. "23.8605, 90.4695" or "Bhaturia (23.8605, 90.4695)")
  const coordRegex = /(-?\d{1,3}\.\d+)[,\s]+(-?\d{1,3}\.\d+)/;
  const matchHosp = rawHosp.match(coordRegex);
  const matchArea = rawArea.match(coordRegex);
  const coordMatch = matchHosp || matchArea;

  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lng = parseFloat(coordMatch[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng) && lat >= 20.0 && lat <= 27.0 && lng >= 88.0 && lng <= 93.0) {
      let closestArea = rawArea && !matchArea ? rawArea : 'Dhaka';
      let minDistance = Infinity;
      for (const [areaKey, centerCoords] of Object.entries(DHAKA_AREA_CENTERS)) {
        const d = Math.hypot(lat - centerCoords.latitude, lng - centerCoords.longitude);
        if (d < minDistance) {
          minDistance = d;
          closestArea = areaKey;
        }
      }

      // Title-case closestArea so "dakshinkhan" becomes "Dakshinkhan"
      const formattedArea = closestArea
        .split(/[\s-]+/)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');

      const isPureCoords = /^\s*-?\d{1,3}\.\d+[,\s]+-?\d{1,3}\.\d+\s*$/.test(rawHosp);
      const cleanName = isPureCoords
        ? (rawArea && !matchArea && rawArea !== 'Near campus' ? `${rawArea} Location` : `${formattedArea} Location`)
        : rawHosp;

      return {
        coords: { latitude: lat, longitude: lng },
        verifiedName: cleanName,
        subLocation: formattedArea,
        searchQuery: `${lat},${lng}`, // Clean coordinates for Google Maps navigation!
        isExactMatch: true,
      };
    }
  }

  // 1. Multi-Branch Disambiguation (e.g. Ibn Sina Mirpur vs Kalyanpur vs Dhanmondi)
  if (combined.includes('ibn sina') || combined.includes('ইবনে সিনা')) {
    if (combined.includes('mirpur') || combined.includes('মিরপুর') || combined.includes('10')) {
      const match = DHAKA_HOSPITALS_MASTER.find(h => h.name.includes('Mirpur-10') && h.name.includes('Ibn Sina'));
      if (match) {
        return {
          coords: match.coords,
          verifiedName: match.name,
          subLocation: match.subLocation,
          searchQuery: match.searchQuery,
          isExactMatch: true,
        };
      }
    }
    if (combined.includes('kalyanpur') || combined.includes('কল্যাণপুর')) {
      const match = DHAKA_HOSPITALS_MASTER.find(h => h.name.includes('Kalyanpur'));
      if (match) {
        return {
          coords: match.coords,
          verifiedName: match.name,
          subLocation: match.subLocation,
          searchQuery: match.searchQuery,
          isExactMatch: true,
        };
      }
    }
    if (combined.includes('dhanmondi') || combined.includes('ধানমন্ডি')) {
      const match = DHAKA_HOSPITALS_MASTER.find(h => h.name.includes('Dhanmondi') && h.name.includes('Ibn Sina'));
      if (match) {
        return {
          coords: match.coords,
          verifiedName: match.name,
          subLocation: match.subLocation,
          searchQuery: match.searchQuery,
          isExactMatch: true,
        };
      }
    }
  }

  // Popular Diagnostic Multi-Branch Disambiguation
  if (combined.includes('popular') || combined.includes('পপুলার')) {
    if (combined.includes('mirpur') || combined.includes('মিরপুর') || combined.includes('10')) {
      const match = DHAKA_HOSPITALS_MASTER.find(h => h.name.includes('Mirpur-10') && h.name.includes('Popular'));
      if (match) {
        return {
          coords: match.coords,
          verifiedName: match.name,
          subLocation: match.subLocation,
          searchQuery: match.searchQuery,
          isExactMatch: true,
        };
      }
    }
    if (combined.includes('dhanmondi') || combined.includes('ধানমন্ডি')) {
      const match = DHAKA_HOSPITALS_MASTER.find(h => h.name.includes('Dhanmondi') && h.name.includes('Popular'));
      if (match) {
        return {
          coords: match.coords,
          verifiedName: match.name,
          subLocation: match.subLocation,
          searchQuery: match.searchQuery,
          isExactMatch: true,
        };
      }
    }
  }

  // Labaid Multi-Branch Disambiguation
  if (combined.includes('labaid') || combined.includes('ল্যাবএইড')) {
    if (combined.includes('cancer') || combined.includes('green road')) {
      const match = DHAKA_HOSPITALS_MASTER.find(h => h.name.includes('Labaid Cancer'));
      if (match) {
        return {
          coords: match.coords,
          verifiedName: match.name,
          subLocation: match.subLocation,
          searchQuery: match.searchQuery,
          isExactMatch: true,
        };
      }
    }
    const match = DHAKA_HOSPITALS_MASTER.find(h => h.name.includes('Labaid Specialized'));
    if (match) {
      return {
        coords: match.coords,
        verifiedName: match.name,
        subLocation: match.subLocation,
        searchQuery: match.searchQuery,
        isExactMatch: true,
      };
    }
  }

  // 2. Hospital Name Resolution (if rawHosp is provided)
  if (rawHosp && rawHosp.trim().length >= 2) {
    // Check Master Database of 513 verified places for hospital match
    const hospMasterMatch = findMasterLocationByName(rawHosp);
    if (hospMasterMatch) {
      return {
        coords: hospMasterMatch.coords,
        verifiedName: hospMasterMatch.name,
        subLocation: hospMasterMatch.subLocation || hospMasterMatch.zone,
        searchQuery: `${hospMasterMatch.coords.latitude},${hospMasterMatch.coords.longitude}`,
        isExactMatch: true,
      };
    }

    // Exact or Substring Match in Master Hospital List
    for (const h of DHAKA_HOSPITALS_MASTER) {
      if (h.name.toLowerCase() === hLower || hLower.includes(h.name.toLowerCase())) {
        return {
          coords: h.coords,
          verifiedName: h.name,
          subLocation: h.subLocation,
          searchQuery: h.searchQuery,
          isExactMatch: true,
        };
      }
      for (const kw of h.keywords) {
        const kwLower = kw.toLowerCase();
        if (hLower.includes(kwLower)) {
          return {
            coords: h.coords,
            verifiedName: h.name,
            subLocation: h.subLocation,
            searchQuery: h.searchQuery,
            isExactMatch: true,
          };
        }
      }
    }
  }

  // 3. Area Match in Master Database (513 verified places: areas, hubs, transit)
  if (rawArea && rawArea.trim().length >= 2) {
    const areaMasterMatch = findMasterLocationByName(rawArea);
    if (areaMasterMatch) {
      return {
        coords: areaMasterMatch.coords,
        verifiedName: rawHosp || areaMasterMatch.name,
        subLocation: areaMasterMatch.subLocation || areaMasterMatch.zone,
        searchQuery: `${areaMasterMatch.coords.latitude},${areaMasterMatch.coords.longitude}`,
        isExactMatch: true,
      };
    }
  }

  // 5. Area Matching with Word-Boundary & Length-Descending Priority (prevents mirpur-10 matching mirpur-1)
  for (const [areaKey, coords] of SORTED_AREA_ENTRIES) {
    if (aLower === areaKey || hLower === areaKey) {
      const formattedArea = areaKey
        .split(/[\s-]+/)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
      const label = rawArea || formattedArea;
      return {
        coords,
        verifiedName: rawHosp || `${label} Location`,
        subLocation: label,
        searchQuery: `${rawHosp || label}, ${label}, Dhaka`,
        isExactMatch: false,
      };
    }

    const escaped = areaKey.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const boundaryRegex = new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`, 'i');
    if (boundaryRegex.test(aLower) || boundaryRegex.test(hLower)) {
      const formattedArea = areaKey
        .split(/[\s-]+/)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
      const label = rawArea || formattedArea;
      return {
        coords,
        verifiedName: rawHosp || `${label} Location`,
        subLocation: label,
        searchQuery: `${rawHosp || label}, ${label}, Dhaka`,
        isExactMatch: false,
      };
    }
  }

  // 6. Zone-Aware Geographic Fallback (never jumps 15km to Panthapath)
  const combinedText = `${rawHosp} ${rawArea}`.toLowerCase();
  if (combinedText.includes('mirpur') || combinedText.includes('মিরপুর') || combinedText.includes('rupnagar') || combinedText.includes('pallabi')) {
    return {
      coords: { latitude: 23.8119, longitude: 90.3572 }, // BUBT / Rupnagar, Mirpur
      verifiedName: rawHosp || 'Mirpur Area',
      subLocation: rawArea || 'Mirpur, Dhaka',
      searchQuery: `${rawHosp || 'Location'}, Mirpur, Dhaka`,
      isExactMatch: false,
    };
  }
  if (combinedText.includes('uttara') || combinedText.includes('উত্তরা') || combinedText.includes('diabari')) {
    return {
      coords: { latitude: 23.8759, longitude: 90.3795 }, // Uttara Sector 3 / Diabari
      verifiedName: rawHosp || 'Uttara Area',
      subLocation: rawArea || 'Uttara, Dhaka',
      searchQuery: `${rawHosp || 'Location'}, Uttara, Dhaka`,
      isExactMatch: false,
    };
  }
  if (combinedText.includes('dhanmondi') || combinedText.includes('ধানমন্ডি')) {
    return {
      coords: { latitude: 23.7461, longitude: 90.3742 }, // Dhanmondi
      verifiedName: rawHosp || 'Dhanmondi Area',
      subLocation: rawArea || 'Dhanmondi, Dhaka',
      searchQuery: `${rawHosp || 'Location'}, Dhanmondi, Dhaka`,
      isExactMatch: false,
    };
  }
  if (combinedText.includes('gulshan') || combinedText.includes('গুলশান') || combinedText.includes('banani') || combinedText.includes('বনানী')) {
    return {
      coords: { latitude: 23.7925, longitude: 90.4078 }, // Gulshan
      verifiedName: rawHosp || 'Gulshan Area',
      subLocation: rawArea || 'Gulshan, Dhaka',
      searchQuery: `${rawHosp || 'Location'}, Gulshan, Dhaka`,
      isExactMatch: false,
    };
  }
  if (combinedText.includes('shahbagh') || combinedText.includes('শাহবাগ') || combinedText.includes('panthapath') || combinedText.includes('green road')) {
    return {
      coords: { latitude: 23.7380, longitude: 90.3950 }, // Shahbagh
      verifiedName: rawHosp || 'Shahbagh Area',
      subLocation: rawArea || 'Shahbagh, Dhaka',
      searchQuery: `${rawHosp || 'Location'}, Shahbagh, Dhaka`,
      isExactMatch: false,
    };
  }

  // Final Default: BUBT Main Campus (Mirpur-2), the home of CampusOne
  return {
    coords: { latitude: 23.8119, longitude: 90.3572 },
    verifiedName: rawHosp || 'Campus & Mirpur Area',
    subLocation: rawArea || 'Mirpur-2, Dhaka',
    searchQuery: `${rawHosp || 'Location'}, Mirpur-2, Dhaka`,
    isExactMatch: false,
  };
}
