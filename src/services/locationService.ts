import * as Location from 'expo-location';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface LandmarkLocation {
  name: string;
  nameBn?: string;
  zone: string;
  coords: Coordinates;
  desc?: string;
  type?: 'hospital' | 'transit' | 'landmark' | 'university' | 'area';
  keywords?: string[];
}

export interface GeocodedPlace {
  name: string;
  zone: string;
  subText: string;
  formattedAddress: string;
  coords: Coordinates;
  distanceKm?: number;
  distanceText?: string;
  placeType?: 'hospital' | 'transit' | 'landmark' | 'university' | 'area';
}

export const BUBT_COORDS: Coordinates = {
  latitude: 23.8119,
  longitude: 90.3571,
};

export const CAMPUS_AND_DHAKA_LANDMARKS: LandmarkLocation[] = [
  // BUBT Campus & Mirpur Vicinity
  {
    name: 'BUBT Main Campus',
    nameBn: 'বিইউবিটি মেইন ক্যাম্পাস',
    zone: 'Mirpur & Campus',
    coords: { latitude: 23.8119, longitude: 90.3571 },
    desc: 'Permanent Campus · Road 9 & 10, Rupnagar',
    type: 'university',
    keywords: ['bubt', 'campus', 'rupnagar', 'permanent campus', 'university', 'academic'],
  },
  {
    name: 'BUBT Building 4 (BBA & Admission)',
    nameBn: 'বিইউবিটি বিল্ডিং ৪',
    zone: 'Mirpur & Campus',
    coords: { latitude: 23.8098, longitude: 90.3567 },
    desc: 'Road 6 · Rupnagar, Mirpur-2',
    type: 'university',
    keywords: ['bubt', 'building 4', 'bba', 'admission', 'rupnagar'],
  },
  {
    name: 'BUBT Building 2 & 3',
    nameBn: 'বিইউবিটি বিল্ডিং ২ ও ৩',
    zone: 'Mirpur & Campus',
    coords: { latitude: 23.8122, longitude: 90.3572 },
    desc: 'Academic Buildings · Road 10, Rupnagar',
    type: 'university',
    keywords: ['bubt', 'building 2', 'building 3', 'academic'],
  },
  {
    name: 'Super Hostel-04 (Mirpur Female Branch)',
    nameBn: 'সুপার হোস্টেল-০৪',
    zone: 'Mirpur & Campus',
    coords: { latitude: 23.8112, longitude: 90.3562 },
    desc: 'Road 8 · Rupnagar, Mirpur-2',
    type: 'landmark',
    keywords: ['super hostel', 'hostel', 'rupnagar'],
  },
  {
    name: 'Follow Fashion (Rupnagar)',
    nameBn: 'ফলো ফ্যাশন',
    zone: 'Mirpur & Campus',
    coords: { latitude: 23.8106, longitude: 90.3560 },
    desc: 'Road 7 · Rupnagar, Mirpur-2',
    type: 'landmark',
    keywords: ['follow fashion', 'fashion', 'rupnagar'],
  },
  {
    name: 'Sony Square (Sony Cinema)',
    nameBn: 'সনি স্কয়ার',
    zone: 'Mirpur & Campus',
    coords: { latitude: 23.8093, longitude: 90.3578 },
    desc: 'Sony Square Roundabout · Mirpur-2',
    type: 'landmark',
    keywords: ['sony', 'cinema', 'square', 'mirpur 2'],
  },
  {
    name: 'Commerce College Road',
    nameBn: 'কমার্স কলেজ রোড',
    zone: 'Mirpur & Campus',
    coords: { latitude: 23.8080, longitude: 90.3550 },
    desc: 'Commerce College Gate · Mirpur-2',
    type: 'university',
    keywords: ['commerce', 'college', 'gate'],
  },
  {
    name: 'Rainkhola',
    nameBn: 'রাইনখোলা',
    zone: 'Mirpur & Campus',
    coords: { latitude: 23.8130, longitude: 90.3525 },
    desc: 'Zoo Road entrance · Mirpur-2 link',
    type: 'area',
    keywords: ['rainkhola', 'zoo road'],
  },
  {
    name: 'Mirpur 2 Roundabout',
    nameBn: 'মিরপুর-২',
    zone: 'Mirpur & Campus',
    coords: { latitude: 23.8078, longitude: 90.3582 },
    desc: 'Mirpur 2 Stadium & Market Link',
    type: 'area',
    keywords: ['mirpur 2', 'stadium'],
  },
  {
    name: 'Mirpur 10 Metro Station',
    nameBn: 'মিরপুর-১০ মেট্রো',
    zone: 'Mirpur & Campus',
    coords: { latitude: 23.8071, longitude: 90.3686 },
    desc: 'Metro Rail Station · Main Roundabout',
    type: 'transit',
    keywords: ['mirpur 10', 'metro', 'roundabout'],
  },
  {
    name: 'Mirpur 1 (Muktodhara)',
    nameBn: 'মিরপুর-১',
    zone: 'Mirpur & Campus',
    coords: { latitude: 23.7956, longitude: 90.3537 },
    desc: 'Muktodhara Roundabout · Darussalam Link',
    type: 'area',
    keywords: ['mirpur 1', 'muktodhara'],
  },
  {
    name: 'Mirpur 11 Metro Station',
    nameBn: 'মিরপুর-১১ মেট্রো',
    zone: 'Mirpur & Campus',
    coords: { latitude: 23.8175, longitude: 90.3662 },
    desc: 'Metro Rail Station · Purobi Cinema',
    type: 'transit',
    keywords: ['mirpur 11', 'purobi', 'metro'],
  },
  {
    name: 'Mirpur 12 Bus Depot',
    nameBn: 'মিরপুর-১২',
    zone: 'Mirpur & Campus',
    coords: { latitude: 23.8277, longitude: 90.3644 },
    desc: 'Metro Rail Terminal · Bus Depot',
    type: 'transit',
    keywords: ['mirpur 12', 'bus depot', 'terminal'],
  },
  {
    name: 'Mirpur 14',
    nameBn: 'মিরপুর-১৪',
    zone: 'Mirpur & Campus',
    coords: { latitude: 23.7997, longitude: 90.3850 },
    desc: 'BRTA Office · Kachukhet Link',
    type: 'area',
    keywords: ['mirpur 14', 'brta', 'kachukhet'],
  },
  {
    name: 'Mirpur DOHS',
    nameBn: 'মিরপুর ডিওএইচএস',
    zone: 'Mirpur & Campus',
    coords: { latitude: 23.8340, longitude: 90.3670 },
    desc: 'DOHS Residential Gate · Avenue 3/4',
    type: 'area',
    keywords: ['mirpur dohs', 'dohs'],
  },
  {
    name: 'Pallabi Metro Station',
    nameBn: 'পল্লবী মেট্রো',
    zone: 'Mirpur & Campus',
    coords: { latitude: 23.8245, longitude: 90.3640 },
    desc: 'Metro Rail Station · Section 12 Link',
    type: 'transit',
    keywords: ['pallabi', 'metro'],
  },
  {
    name: 'Rupnagar R/A',
    nameBn: 'রূপনগর আ/এ',
    zone: 'Mirpur & Campus',
    coords: { latitude: 23.8155, longitude: 90.3510 },
    desc: 'Rupnagar Residential Area Gate',
    type: 'area',
    keywords: ['rupnagar', 'residential'],
  },
  {
    name: 'ECB Chattar',
    nameBn: 'ইসিবি চত্বর',
    zone: 'Mirpur & Campus',
    coords: { latitude: 23.8242, longitude: 90.3885 },
    desc: 'Flyover Exit · Matikata · Cantonment Link',
    type: 'transit',
    keywords: ['ecb', 'chattar', 'matikata', 'flyover'],
  },
  {
    name: 'Kalshi Flyover',
    nameBn: 'কালশী ফ্লাইওভার',
    zone: 'Mirpur & Campus',
    coords: { latitude: 23.8210, longitude: 90.3770 },
    desc: 'Kalshi More · Flyover Junction',
    type: 'landmark',
    keywords: ['kalshi', 'flyover', 'more'],
  },
  {
    name: 'Technical Intersection',
    nameBn: 'টেকনিক্যাল মোড়',
    zone: 'Mirpur & Campus',
    coords: { latitude: 23.7845, longitude: 90.3525 },
    desc: 'Technical Intersection · Gabtoli Highway',
    type: 'transit',
    keywords: ['technical', 'mor', 'gabtoli'],
  },
  {
    name: 'Gabtoli Inter-District Bus Terminal',
    nameBn: 'গাবতলী বাস টার্মিনাল',
    zone: 'Central & West',
    coords: { latitude: 23.7820, longitude: 90.3440 },
    desc: 'Major Bus Terminal · Mazar Road Link',
    type: 'transit',
    keywords: ['gabtoli', 'bus terminal', 'mazar road'],
  },
  {
    name: 'Kalyanpur Bus Stand',
    nameBn: 'কল্যাণপুর',
    zone: 'Central & West',
    coords: { latitude: 23.7780, longitude: 90.3585 },
    desc: 'Kalyanpur Footbridge · Bus Stand',
    type: 'transit',
    keywords: ['kalyanpur', 'bus stand'],
  },
  {
    name: 'Shyamoli Square',
    nameBn: 'শ্যামলী',
    zone: 'Central & West',
    coords: { latitude: 23.7715, longitude: 90.3620 },
    desc: 'Shyamoli Cinema · Ring Road Junction',
    type: 'area',
    keywords: ['shyamoli', 'cinema', 'ring road'],
  },
  {
    name: 'Agargaon Metro Station',
    nameBn: 'আগারগাঁও',
    zone: 'Central & West',
    coords: { latitude: 23.7785, longitude: 90.3795 },
    desc: 'Passport Office · Biman Bhaban',
    type: 'transit',
    keywords: ['agargaon', 'passport', 'metro'],
  },
  {
    name: 'Farmgate',
    nameBn: 'ফার্মগেট',
    zone: 'Central & West',
    coords: { latitude: 23.7570, longitude: 90.3888 },
    desc: 'Ananda Cinema · Metro Rail Station',
    type: 'transit',
    keywords: ['farmgate', 'ananda', 'metro'],
  },
  {
    name: 'Dhanmondi 27',
    nameBn: 'ধানমন্ডি ২৭',
    zone: 'Central & West',
    coords: { latitude: 23.7529, longitude: 90.3752 },
    desc: 'Rapa Plaza · Shatmasjid Road Link',
    type: 'area',
    keywords: ['dhanmondi 27', 'rapa plaza', 'shatmasjid'],
  },
  {
    name: 'Dhanmondi 32',
    nameBn: 'ধানমন্ডি ৩২',
    zone: 'Central & West',
    coords: { latitude: 23.7515, longitude: 90.3780 },
    desc: 'Bangabandhu Memorial Museum · Lake',
    type: 'landmark',
    keywords: ['dhanmondi 32', 'lake', 'museum'],
  },
  {
    name: 'Dhanmondi 8A',
    nameBn: 'ধানমন্ডি ৮/এ',
    zone: 'Central & West',
    coords: { latitude: 23.7450, longitude: 90.3770 },
    desc: 'Shatmasjid Road · Cafe District',
    type: 'area',
    keywords: ['dhanmondi 8a', 'shatmasjid'],
  },
  {
    name: 'Mohammadpur Town Hall',
    nameBn: 'মোহাম্মদপুর টাউন হল',
    zone: 'Central & West',
    coords: { latitude: 23.7635, longitude: 90.3615 },
    desc: 'Town Hall Market · Shia Masjid Link',
    type: 'area',
    keywords: ['mohammadpur', 'town hall'],
  },
  {
    name: 'Mohammadpur Bus Stand',
    nameBn: 'মোহাম্মদপুর বাস স্ট্যান্ড',
    zone: 'Central & West',
    coords: { latitude: 23.7565, longitude: 90.3585 },
    desc: 'Allah Karim Mosque · Main Terminal',
    type: 'transit',
    keywords: ['mohammadpur', 'bus stand'],
  },
  {
    name: 'Science Lab Intersection',
    nameBn: 'সায়েন্স ল্যাব',
    zone: 'Central & West',
    coords: { latitude: 23.7385, longitude: 90.3840 },
    desc: 'Science Laboratory · Mirpur Road',
    type: 'transit',
    keywords: ['science lab', 'mirpur road'],
  },
  {
    name: 'New Market',
    nameBn: 'নিউ মার্কেট',
    zone: 'Central & West',
    coords: { latitude: 23.7340, longitude: 90.3845 },
    desc: 'Gausia Market · Chandni Chowk Link',
    type: 'area',
    keywords: ['new market', 'gausia', 'chandni chowk'],
  },
  {
    name: 'Nilkhet',
    nameBn: 'নীলক্ষেত',
    zone: 'Central & South',
    coords: { latitude: 23.7330, longitude: 90.3875 },
    desc: 'Central Book Market · DU Gate',
    type: 'area',
    keywords: ['nilkhet', 'book market'],
  },

  // South Dhaka, Jatrabari & Sayedabad Hubs (Directly addressing user search)
  {
    name: 'Jatrabari',
    nameBn: 'যাত্রাবাড়ী',
    zone: 'South Dhaka',
    coords: { latitude: 23.7104, longitude: 90.4348 },
    desc: 'Jatrabari Chowrasta · South Dhaka Hub',
    type: 'area',
    keywords: ['jatrabari', 'chowrasta', 'south dhaka'],
  },
  {
    name: 'Jatrabari Bus Stop',
    nameBn: 'যাত্রাবাড়ী বাস স্টপ',
    zone: 'South Dhaka',
    coords: { latitude: 23.7120, longitude: 90.4330 },
    desc: 'Jale Para Road, Jatrabari · Bus Stop',
    type: 'transit',
    keywords: ['jatrabari', 'bus stop', 'stand'],
  },
  {
    name: 'Jatrabari Flyover',
    nameBn: 'যাত্রাবাড়ী ফ্লাইওভার',
    zone: 'South Dhaka',
    coords: { latitude: 23.7140, longitude: 90.4310 },
    desc: 'Mayor Mohammad Hanif Flyover · Jatrabari Exit',
    type: 'landmark',
    keywords: ['jatrabari', 'flyover', 'hanif flyover'],
  },
  {
    name: 'Kazla (Jatrabari)',
    nameBn: 'কাজলা (যাত্রাবাড়ী)',
    zone: 'South Dhaka',
    coords: { latitude: 23.7080, longitude: 90.4400 },
    desc: 'Kazla More · Jatrabari Flyover Link',
    type: 'area',
    keywords: ['kazla', 'jatrabari'],
  },
  {
    name: 'Sayedabad Bus Terminal',
    nameBn: 'সায়েদাবাদ বাস টার্মিনাল',
    zone: 'South Dhaka',
    coords: { latitude: 23.7185, longitude: 90.4285 },
    desc: 'Inter-District Bus Terminal · South Bangladesh Hub',
    type: 'transit',
    keywords: ['sayedabad', 'bus terminal', 'stand'],
  },
  {
    name: 'Kamalapur Railway Station',
    nameBn: 'কমলাপুর রেলওয়ে স্টেশন',
    zone: 'Central & South',
    coords: { latitude: 23.7317, longitude: 90.4255 },
    desc: 'Central Railway Station · Motijheel Link',
    type: 'transit',
    keywords: ['kamalapur', 'railway', 'train', 'station'],
  },
  {
    name: 'Sadarghat Launch Terminal',
    nameBn: 'সদরঘাট লঞ্চ টার্মিনাল',
    zone: 'Old Dhaka',
    coords: { latitude: 23.7060, longitude: 90.4125 },
    desc: 'Buriganga River · Main River Port',
    type: 'transit',
    keywords: ['sadarghat', 'launch', 'river port', 'buriganga'],
  },
  {
    name: 'Dholairpar',
    nameBn: 'ধোলাইরপাড়',
    zone: 'South Dhaka',
    coords: { latitude: 23.7020, longitude: 90.4310 },
    desc: 'Dholairpar Chattar · Padma Bridge Link',
    type: 'transit',
    keywords: ['dholairpar', 'chattar', 'padma link'],
  },
  {
    name: 'Shani Akhra',
    nameBn: 'শনির আখড়া',
    zone: 'South Dhaka',
    coords: { latitude: 23.6980, longitude: 90.4480 },
    desc: 'Dhaka Chittagong Highway Link',
    type: 'area',
    keywords: ['shani akhra', 'highway'],
  },
  {
    name: 'Demra',
    nameBn: 'ডেমরা',
    zone: 'South Dhaka',
    coords: { latitude: 23.7250, longitude: 90.4850 },
    desc: 'Demra Staff Quarter · Tarabo Link',
    type: 'area',
    keywords: ['demra', 'staff quarter'],
  },
  {
    name: 'Postogola',
    nameBn: 'পোস্তগোলা',
    zone: 'South Dhaka',
    coords: { latitude: 23.6910, longitude: 90.4250 },
    desc: 'Buriganga 1st Bridge · Postogola',
    type: 'transit',
    keywords: ['postogola', 'bridge'],
  },

  // Central, Commercial & Old Dhaka
  {
    name: 'Motijheel (Shapla Chattar)',
    nameBn: 'মতিঝিল শাপলা চত্বর',
    zone: 'Central & South',
    coords: { latitude: 23.7328, longitude: 90.4175 },
    desc: 'Financial District · Central Roundabout',
    type: 'area',
    keywords: ['motijheel', 'shapla chattar', 'bank'],
  },
  {
    name: 'Paltan (Baitul Mukarram)',
    nameBn: 'পল্টন (বায়তুল মোকাররম)',
    zone: 'Central & South',
    coords: { latitude: 23.7310, longitude: 90.4128 },
    desc: 'National Mosque · Purana Paltan Link',
    type: 'landmark',
    keywords: ['paltan', 'baitul mukarram', 'national mosque'],
  },
  {
    name: 'Jatia Press Club',
    nameBn: 'জাতীয় প্রেস ক্লাব',
    zone: 'Central & South',
    coords: { latitude: 23.7305, longitude: 90.4075 },
    desc: 'Topkhana Road · High Court Link',
    type: 'landmark',
    keywords: ['jatia press club', 'press club', 'topkhana'],
  },
  {
    name: 'Shahbagh',
    nameBn: 'শাহবাগ',
    zone: 'Central & South',
    coords: { latitude: 23.7385, longitude: 90.3955 },
    desc: 'Shahbagh More · National Museum & BSMMU',
    type: 'transit',
    keywords: ['shahbagh', 'more', 'museum'],
  },
  {
    name: 'Lalbagh Fort',
    nameBn: 'লালবাগ কেল্লা',
    zone: 'Old Dhaka',
    coords: { latitude: 23.7188, longitude: 90.3882 },
    desc: 'Historic Mughal Fort · Old Dhaka',
    type: 'landmark',
    keywords: ['lalbagh', 'fort', 'kella'],
  },
  {
    name: 'Kakrail',
    nameBn: 'কাকরাইল',
    zone: 'Central & South',
    coords: { latitude: 23.7380, longitude: 90.4090 },
    desc: 'Kakrail Mosque · Shantinagar Link',
    type: 'area',
    keywords: ['kakrail', 'shantinagar'],
  },
  {
    name: 'Mouchak Market',
    nameBn: 'মৌচাক মোড়',
    zone: 'Central & East',
    coords: { latitude: 23.7485, longitude: 90.4135 },
    desc: 'Mouchak Flyover · Malibagh Link',
    type: 'area',
    keywords: ['mouchak', 'malibagh', 'flyover'],
  },
  {
    name: 'Khilgaon',
    nameBn: 'খিলগাঁও',
    zone: 'Central & East',
    coords: { latitude: 23.7510, longitude: 90.4240 },
    desc: 'Khilgaon Taltola · Restaurant District',
    type: 'area',
    keywords: ['khilgaon', 'taltola'],
  },
  {
    name: 'Rampura Bridge',
    nameBn: 'রামপুরা ব্রিজ',
    zone: 'Central & East',
    coords: { latitude: 23.7625, longitude: 90.4225 },
    desc: 'Hatirjheel Entrance · DIT Road',
    type: 'transit',
    keywords: ['rampura', 'bridge', 'hatirjheel'],
  },
  {
    name: 'Hatirjheel',
    nameBn: 'হাতিরঝিল',
    zone: 'Central & East',
    coords: { latitude: 23.7600, longitude: 90.4180 },
    desc: 'Waterway Circular Road · Lake View',
    type: 'landmark',
    keywords: ['hatirjheel', 'lake', 'water taxi'],
  },
  {
    name: 'Banasree',
    nameBn: 'বনশ্রী',
    zone: 'Central & East',
    coords: { latitude: 23.7630, longitude: 90.4350 },
    desc: 'Banasree Main Road · Block A-M',
    type: 'area',
    keywords: ['banasree', 'block'],
  },
  {
    name: 'Middle Badda',
    nameBn: 'মধ্য বাড্ডা',
    zone: 'Central & East',
    coords: { latitude: 23.7800, longitude: 90.4260 },
    desc: 'Pragati Sarani · Badda Link',
    type: 'area',
    keywords: ['badda', 'pragati sarani'],
  },

  // North Dhaka, Banani, Gulshan & Uttara
  {
    name: 'Jatra Biroti (Banani)',
    nameBn: 'যাত্রা বিরতি',
    zone: 'North Dhaka',
    coords: { latitude: 23.7935, longitude: 90.4045 },
    desc: 'Kemal Ataturk Avenue, Banani · Cultural Lounge',
    type: 'landmark',
    keywords: ['jatra biroti', 'banani', 'kemal ataturk'],
  },
  {
    name: 'Banani 11',
    nameBn: 'বনানী ১১',
    zone: 'North Dhaka',
    coords: { latitude: 23.7935, longitude: 90.4045 },
    desc: 'Commercial Hub · Kakoli Link',
    type: 'area',
    keywords: ['banani 11', 'commercial'],
  },
  {
    name: 'Gulshan 1 Circle',
    nameBn: 'গুলশান ১',
    zone: 'North Dhaka',
    coords: { latitude: 23.7780, longitude: 90.4170 },
    desc: 'Gulshan 1 Circle · Shooting Club Link',
    type: 'area',
    keywords: ['gulshan 1', 'circle'],
  },
  {
    name: 'Gulshan 2 Circle',
    nameBn: 'গুলশান ২',
    zone: 'North Dhaka',
    coords: { latitude: 23.7925, longitude: 90.4160 },
    desc: 'Gulshan 2 Circle · Diplomatic Zone',
    type: 'area',
    keywords: ['gulshan 2', 'circle'],
  },
  {
    name: 'Mohakhali Inter-District Bus Terminal',
    nameBn: 'মহাখালী বাস টার্মিনাল',
    zone: 'North Dhaka',
    coords: { latitude: 23.7785, longitude: 90.4015 },
    desc: 'Inter-District Bus Terminal · Mymensingh Road',
    type: 'transit',
    keywords: ['mohakhali', 'bus terminal', 'stand'],
  },
  {
    name: 'Mohakhali Flyover',
    nameBn: 'মহাখালী',
    zone: 'North Dhaka',
    coords: { latitude: 23.7776, longitude: 90.4054 },
    desc: 'Flyover Junction · Wireless Gate Link',
    type: 'transit',
    keywords: ['mohakhali', 'flyover', 'wireless'],
  },
  {
    name: 'Kuril Flyover',
    nameBn: 'কুড়িল বিশ্বরোড',
    zone: 'North Dhaka',
    coords: { latitude: 23.8172, longitude: 90.4208 },
    desc: 'Kuril Chowrasta · Purbachal 300 Feet Link',
    type: 'transit',
    keywords: ['kuril', 'flyover', 'bishwo road'],
  },
  {
    name: 'Bashundhara R/A Gate',
    nameBn: 'বসুন্ধরা গেট',
    zone: 'North Dhaka',
    coords: { latitude: 23.8160, longitude: 90.4260 },
    desc: 'Main Gate · Jamuna Future Park',
    type: 'area',
    keywords: ['bashundhara', 'main gate'],
  },
  {
    name: 'Jamuna Future Park',
    nameBn: 'যমুনা ফিউচার পার্ক',
    zone: 'North Dhaka',
    coords: { latitude: 23.8135, longitude: 90.4242 },
    desc: 'Ka-244, Pragati Sarani, Kuril',
    type: 'landmark',
    keywords: ['jamuna', 'future park', 'mall'],
  },
  {
    name: 'Hazrat Shahjalal Int Airport',
    nameBn: 'শাহজালাল আন্তর্জাতিক বিমানবন্দর',
    zone: 'North Dhaka',
    coords: { latitude: 23.8433, longitude: 90.3978 },
    desc: 'Terminal 1 & 2 · Airport Road, Kurmitola',
    type: 'transit',
    keywords: ['airport', 'shahjalal', 'flight'],
  },
  {
    name: 'Airport Railway Station',
    nameBn: 'বিমানবন্দর রেলওয়ে স্টেশন',
    zone: 'North Dhaka',
    coords: { latitude: 23.8510, longitude: 90.4080 },
    desc: 'Inter-City Train Station · Airport Road',
    type: 'transit',
    keywords: ['airport', 'railway', 'train', 'station'],
  },
  {
    name: 'Uttara Sector 3 (Rajlakshmi)',
    nameBn: 'উত্তরা ৩ (রাজলক্ষ্মী)',
    zone: 'North Dhaka',
    coords: { latitude: 23.8696, longitude: 90.3986 },
    desc: 'Rajlakshmi Complex · Dhaka Mymensingh Hwy',
    type: 'area',
    keywords: ['uttara 3', 'rajlakshmi'],
  },
  {
    name: 'Uttara House Building (Sector 7)',
    nameBn: 'উত্তরা হাউস বিল্ডিং',
    zone: 'North Dhaka',
    coords: { latitude: 23.8730, longitude: 90.3980 },
    desc: 'House Building Chowrasta · Metro Link',
    type: 'transit',
    keywords: ['uttara house building', 'sector 7'],
  },
  {
    name: 'Uttara Diabari Metro Rail Terminal',
    nameBn: 'দিয়াবাড়ী মেট্রো টার্মিনাল',
    zone: 'North Dhaka',
    coords: { latitude: 23.8765, longitude: 90.3705 },
    desc: 'Metro Line 6 Terminal · Diabari Lake',
    type: 'transit',
    keywords: ['diabari', 'metro terminal', 'uttara north'],
  },
  {
    name: 'Abdullahpur Bus Stand',
    nameBn: 'আব্দুল্লাহপুর বাস স্ট্যান্ড',
    zone: 'North Dhaka',
    coords: { latitude: 23.8825, longitude: 90.3975 },
    desc: 'Northern Gateway · Tongi Bridge Link',
    type: 'transit',
    keywords: ['abdullahpur', 'bus stand', 'tongi link'],
  },

  // Key Hospitals & Medical Centers (Blood, Emergency & General)
  {
    name: 'National Institute of Cardiovascular Diseases (Jatio Hridrog Hospital)',
    nameBn: 'জাতীয় হৃদরোগ ইনস্টিটিউট',
    zone: 'Central & West',
    coords: { latitude: 23.7710, longitude: 90.3695 },
    desc: 'Mirpur Road, Sher-e-Bangla Nagar · Specialized Heart Hospital',
    type: 'hospital',
    keywords: ['jatio hridrog', 'hridrog', 'nicvd', 'cardiovascular', 'heart hospital'],
  },
  {
    name: 'National Heart Foundation',
    nameBn: 'ন্যাশনাল হার্ট ফাউন্ডেশন',
    zone: 'Mirpur & Campus',
    coords: { latitude: 23.8055, longitude: 90.3600 },
    desc: 'Plot 4, Mirpur-2 · Heart & Cardiac Hospital',
    type: 'hospital',
    keywords: ['heart foundation', 'mirpur 2', 'cardiac'],
  },
  {
    name: 'Delta Hospital',
    nameBn: 'ডেল্টা হাসপাতাল',
    zone: 'Mirpur & Campus',
    coords: { latitude: 23.7990, longitude: 90.3520 },
    desc: 'Section 1, Mirpur · Oncology & General Hospital',
    type: 'hospital',
    keywords: ['delta', 'hospital', 'mirpur 1'],
  },
  {
    name: 'Popular Diagnostic (Mirpur 10)',
    nameBn: 'পপুলার ডায়াগনস্টিক মিরপুর',
    zone: 'Mirpur & Campus',
    coords: { latitude: 23.8068, longitude: 90.3680 },
    desc: 'Begum Rokeya Sarani, Mirpur 10',
    type: 'hospital',
    keywords: ['popular', 'diagnostic', 'mirpur 10'],
  },
  {
    name: 'Dhaka Medical College Hospital (DMCH)',
    nameBn: 'ঢাকা মেডিকেল কলেজ হাসপাতাল',
    zone: 'Central & South',
    coords: { latitude: 23.7257, longitude: 90.3976 },
    desc: 'Bakshibazar, Dhaka · Largest Public Hospital',
    type: 'hospital',
    keywords: ['dmch', 'dhaka medical', 'burn unit'],
  },
  {
    name: 'BSMMU (PG Hospital)',
    nameBn: 'বিএসএমএমইউ / পিজি হাসপাতাল',
    zone: 'Central & South',
    coords: { latitude: 23.7390, longitude: 90.3950 },
    desc: 'Shahbagh Roundabout · Specialized University Hospital',
    type: 'hospital',
    keywords: ['bsmmu', 'pg hospital', 'shahbagh'],
  },
  {
    name: 'BIRDEM General Hospital',
    nameBn: 'বারডেম হাসপাতাল',
    zone: 'Central & South',
    coords: { latitude: 23.7388, longitude: 90.3958 },
    desc: 'Shahbagh Roundabout · Diabetes & Specialized',
    type: 'hospital',
    keywords: ['birdem', 'diabetic', 'shahbagh'],
  },
  {
    name: 'Square Hospital',
    nameBn: 'স্কয়ার হাসপাতাল',
    zone: 'Central & West',
    coords: { latitude: 23.7533, longitude: 90.3817 },
    desc: '18/F Bir Uttam Qazi Nuruzzaman Sarak, Panthapath',
    type: 'hospital',
    keywords: ['square', 'panthapath'],
  },
  {
    name: 'Shaheed Suhrawardy Hospital',
    nameBn: 'শহীদ সোহরাওয়ার্দী হাসপাতাল',
    zone: 'Central & West',
    coords: { latitude: 23.7698, longitude: 90.3702 },
    desc: 'Sher-e-Bangla Nagar · Government Hospital',
    type: 'hospital',
    keywords: ['suhrawardy', 'sher-e-bangla'],
  },
  {
    name: 'NITOR (Pangu Hospital)',
    nameBn: 'পঙ্গু হাসপাতাল',
    zone: 'Central & West',
    coords: { latitude: 23.7705, longitude: 90.3690 },
    desc: 'Orthopedic Hospital · Sher-e-Bangla Nagar',
    type: 'hospital',
    keywords: ['pangu', 'nitor', 'orthopedic'],
  },
  {
    name: 'NINS (National Institute of Neurosciences)',
    nameBn: 'নিউরোসায়েন্সেস হাসপাতাল',
    zone: 'Central & West',
    coords: { latitude: 23.7718, longitude: 90.3710 },
    desc: 'Sher-e-Bangla Nagar · Neurology & Neurosurgery',
    type: 'hospital',
    keywords: ['nins', 'neuroscience', 'neuro'],
  },
  {
    name: 'Dhaka Shishu Hospital (Children Hospital)',
    nameBn: 'ঢাকা শিশু হাসপাতাল',
    zone: 'Central & West',
    coords: { latitude: 23.7725, longitude: 90.3735 },
    desc: 'Sher-e-Bangla Nagar · Pediatric Hospital',
    type: 'hospital',
    keywords: ['shishu', 'children hospital'],
  },
  {
    name: 'Evercare Hospital',
    nameBn: 'এভারকেয়ার হাসপাতাল',
    zone: 'North Dhaka',
    coords: { latitude: 23.8105, longitude: 90.4312 },
    desc: 'Plot 81, Block E, Bashundhara R/A',
    type: 'hospital',
    keywords: ['evercare', 'apollo', 'bashundhara'],
  },
  {
    name: 'United Hospital',
    nameBn: 'ইউনাইটেড হাসপাতাল',
    zone: 'North Dhaka',
    coords: { latitude: 23.7995, longitude: 90.4140 },
    desc: 'Plot 15, Road 71, Gulshan 2',
    type: 'hospital',
    keywords: ['united', 'gulshan 2'],
  },
  {
    name: 'LabAid Specialized Hospital',
    nameBn: 'ল্যাবএইড কার্ডিয়াক হাসপাতাল',
    zone: 'Central & West',
    coords: { latitude: 23.7435, longitude: 90.3820 },
    desc: 'House 1, Road 4, Dhanmondi',
    type: 'hospital',
    keywords: ['labaid', 'dhanmondi'],
  },
  {
    name: 'Mugda Medical College Hospital',
    nameBn: 'মুগদা মেডিকেল কলেজ হাসপাতাল',
    zone: 'Central & South',
    coords: { latitude: 23.7320, longitude: 90.4320 },
    desc: 'Mugda, Dhaka · General Public Hospital',
    type: 'hospital',
    keywords: ['mugda', 'medical'],
  },
  {
    name: 'Kurmitola General Hospital',
    nameBn: 'কুর্মিটোলা জেনারেল হাসপাতাল',
    zone: 'North Dhaka',
    coords: { latitude: 23.8210, longitude: 90.4050 },
    desc: 'Airport Road, Cantonment · General Hospital',
    type: 'hospital',
    keywords: ['kurmitola', 'cantonment'],
  },
  {
    name: 'Sir Salimullah Medical College (Mitford Hospital)',
    nameBn: 'মিটফোর্ড হাসপাতাল',
    zone: 'Old Dhaka',
    coords: { latitude: 23.7115, longitude: 90.3995 },
    desc: 'Mitford Road, Old Dhaka · Historic Hospital',
    type: 'hospital',
    keywords: ['mitford', 'salimullah', 'old dhaka'],
  },

  // University Campuses
  {
    name: 'Dhaka University (TSC & Arts)',
    nameBn: 'ঢাকা বিশ্ববিদ্যালয় (টিএসসি)',
    zone: 'Central & South',
    coords: { latitude: 23.7319, longitude: 90.3957 },
    desc: 'Teacher-Student Centre · Nilkhet Road',
    type: 'university',
    keywords: ['du', 'dhaka university', 'tsc'],
  },
  {
    name: 'BUET Main Campus',
    nameBn: 'বুয়েট মেইন ক্যাম্পাস',
    zone: 'Central & South',
    coords: { latitude: 23.7266, longitude: 90.3924 },
    desc: 'Palashi · Engineering University',
    type: 'university',
    keywords: ['buet', 'palashi', 'engineering'],
  },
  {
    name: 'Jahangirnagar University (JU)',
    nameBn: 'জাহাঙ্গীরনগর বিশ্ববিদ্যালয়',
    zone: 'Savar & Outer West',
    coords: { latitude: 23.8814, longitude: 90.2674 },
    desc: 'Dairy Gate · Savar Highway',
    type: 'university',
    keywords: ['ju', 'jahangirnagar', 'savar'],
  },
  {
    name: 'North South University (NSU)',
    nameBn: 'নর্থ সাউথ বিশ্ববিদ্যালয়',
    zone: 'North Dhaka',
    coords: { latitude: 23.8151, longitude: 90.4255 },
    desc: 'Plot 15, Block B, Bashundhara R/A',
    type: 'university',
    keywords: ['nsu', 'north south', 'bashundhara'],
  },
  {
    name: 'AIUB Permanent Campus',
    nameBn: 'এআইইউবি ক্যাম্পাস',
    zone: 'North Dhaka',
    coords: { latitude: 23.8223, longitude: 90.4274 },
    desc: '408/1 Kuratoli, Khilkhet',
    type: 'university',
    keywords: ['aiub', 'kuratoli'],
  },
  {
    name: 'BRAC University (New Campus)',
    nameBn: 'ব্র্যাক বিশ্ববিদ্যালয়',
    zone: 'Central & East',
    coords: { latitude: 23.7745, longitude: 90.4260 },
    desc: 'Kha 224, Pragati Sarani, Merul Badda',
    type: 'university',
    keywords: ['brac', 'university', 'merul badda'],
  },
  {
    name: 'East West University (EWU)',
    nameBn: 'ইস্ট ওয়েস্ট বিশ্ববিদ্যালয়',
    zone: 'Central & East',
    coords: { latitude: 23.7680, longitude: 90.4270 },
    desc: 'Aftabnagar Main Road, Rampura',
    type: 'university',
    keywords: ['ewu', 'east west', 'aftabnagar'],
  },
  {
    name: 'Bashundhara City Complex',
    nameBn: 'বসুন্ধরা সিটি মল',
    zone: 'Central & West',
    coords: { latitude: 23.7512, longitude: 90.3905 },
    desc: 'Panthapath · Karwan Bazar Link',
    type: 'landmark',
    keywords: ['bashundhara city', 'mall', 'panthapath'],
  },
];

export function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function findNearestLandmark(
  coords: Coordinates,
  maxDistanceMeters: number = 280
): LandmarkLocation | null {
  let nearest: LandmarkLocation | null = null;
  let minDistance = maxDistanceMeters;

  for (const landmark of CAMPUS_AND_DHAKA_LANDMARKS) {
    const dist = getDistanceMeters(
      coords.latitude,
      coords.longitude,
      landmark.coords.latitude,
      landmark.coords.longitude
    );
    if (dist < minDistance) {
      minDistance = dist;
      nearest = landmark;
    }
  }

  return nearest;
}

export function findLandmarkByName(name?: string | null): LandmarkLocation | null {
  if (!name || !name.trim()) return null;
  const q = name.trim().toLowerCase();
  return (
    CAMPUS_AND_DHAKA_LANDMARKS.find(
      l =>
        l.name.toLowerCase() === q ||
        (l.nameBn && l.nameBn.toLowerCase() === q) ||
        l.name.toLowerCase().includes(q) ||
        q.includes(l.name.toLowerCase())
    ) || null
  );
}

export function searchLandmarks(
  query: string,
  limit: number = 8,
  userCoords?: Coordinates | null
): LandmarkLocation[] {
  if (!query || !query.trim()) return [];
  const q = query.trim().toLowerCase();

  const matches = CAMPUS_AND_DHAKA_LANDMARKS.filter(l => {
    const nameMatch = l.name.toLowerCase().includes(q);
    const bnMatch = l.nameBn && l.nameBn.toLowerCase().includes(q);
    const zoneMatch = l.zone.toLowerCase().includes(q);
    const descMatch = l.desc && l.desc.toLowerCase().includes(q);
    const kwMatch = l.keywords && l.keywords.some(k => k.toLowerCase().includes(q));
    return nameMatch || bnMatch || zoneMatch || descMatch || kwMatch;
  });

  // Smart prefix and relevance sorting
  matches.sort((a, b) => {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();

    // 1. Starts with query (e.g. "jat" -> "Jatrabari")
    const aStarts = aName.startsWith(q);
    const bStarts = bName.startsWith(q);
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;

    // If both start with prefix, prefer shorter/cleaner name (e.g. "Jatrabari" over "Jatrabari Flyover")
    if (aStarts && bStarts && aName.length !== bName.length) {
      return aName.length - bName.length;
    }

    // 2. Contains any word starting with query (e.g. "bus" -> "Jatrabari Bus Stop")
    const aWordStart = aName.split(/\s+/).some(w => w.startsWith(q));
    const bWordStart = bName.split(/\s+/).some(w => w.startsWith(q));
    if (aWordStart && !bWordStart) return -1;
    if (!aWordStart && bWordStart) return 1;

    // 3. Proximity to user's location
    if (userCoords) {
      const distA = getDistanceMeters(userCoords.latitude, userCoords.longitude, a.coords.latitude, a.coords.longitude);
      const distB = getDistanceMeters(userCoords.latitude, userCoords.longitude, b.coords.latitude, b.coords.longitude);
      return distA - distB;
    }

    return 0;
  });

  return matches.slice(0, limit);
}

export async function searchPlacesOnline(
  query: string,
  userCoords?: Coordinates | null
): Promise<GeocodedPlace[]> {
  if (!query || query.trim().length < 2) return [];
  const q = query.trim();

  // Helper for computing distance text
  const calcDist = (coords: Coordinates): { distKm: number; text: string } | null => {
    if (!userCoords) return null;
    const m = getDistanceMeters(userCoords.latitude, userCoords.longitude, coords.latitude, coords.longitude);
    const km = m / 1000;
    const text = km < 1 ? `${Math.round(m)} m` : `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
    return { distKm: km, text };
  };

  // 1. Instant local curated landmark match (0ms latency, prefix-aware)
  const localMatches: GeocodedPlace[] = searchLandmarks(q, 7, userCoords).map(l => {
    const d = calcDist(l.coords);
    return {
      name: l.name,
      zone: l.zone,
      subText: l.desc || `${l.coords.latitude.toFixed(4)}, ${l.coords.longitude.toFixed(4)}`,
      formattedAddress: l.name,
      coords: l.coords,
      distanceKm: d?.distKm,
      distanceText: d?.text,
      placeType: l.type || 'area',
    };
  });

  // 2. Real-time OpenStreetMap Nominatim search for Bangladesh / Dhaka
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const encoded = encodeURIComponent(q);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&countrycodes=bd&limit=8&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'CampusOne-BUBT-App/1.0 (academic capstone)',
        },
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const onlineMatches: GeocodedPlace[] = [];

      for (const item of data) {
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);
        if (isNaN(lat) || isNaN(lon)) continue;

        const addr = item.address || {};
        const primary =
          item.name ||
          addr.amenity ||
          addr.building ||
          addr.road ||
          addr.suburb ||
          addr.neighbourhood ||
          item.display_name.split(',')[0];

        // Skip only if identically named and within 50m of a local match
        const isDuplicate = localMatches.some(
          lm =>
            lm.name.toLowerCase() === primary.toLowerCase() &&
            Math.abs(lm.coords.latitude - lat) < 0.0005 &&
            Math.abs(lm.coords.longitude - lon) < 0.0005
        );
        if (isDuplicate) continue;

        const areaParts = [
          addr.suburb || addr.quarter || addr.neighbourhood,
          addr.city || addr.county || 'Dhaka',
        ].filter(Boolean);
        const sub = areaParts.join(', ') || item.display_name;

        // Infer placeType
        let placeType: 'hospital' | 'transit' | 'landmark' | 'university' | 'area' = 'area';
        const typeStr = `${item.type || ''} ${item.class || ''} ${primary}`.toLowerCase();
        if (typeStr.includes('hospital') || typeStr.includes('clinic') || typeStr.includes('doctor') || typeStr.includes('medical')) {
          placeType = 'hospital';
        } else if (typeStr.includes('bus') || typeStr.includes('station') || typeStr.includes('terminal') || typeStr.includes('metro') || typeStr.includes('rail')) {
          placeType = 'transit';
        } else if (typeStr.includes('university') || typeStr.includes('college') || typeStr.includes('campus') || typeStr.includes('school')) {
          placeType = 'university';
        } else if (typeStr.includes('flyover') || typeStr.includes('bridge') || typeStr.includes('monument') || typeStr.includes('park') || typeStr.includes('museum')) {
          placeType = 'landmark';
        }

        const coords = { latitude: lat, longitude: lon };
        const d = calcDist(coords);

        onlineMatches.push({
          name: primary,
          zone: addr.city || 'Dhaka',
          subText: sub,
          formattedAddress: `${primary}, ${sub}`,
          coords,
          distanceKm: d?.distKm,
          distanceText: d?.text,
          placeType,
        });
      }

      return [...localMatches, ...onlineMatches].slice(0, 8);
    }
  } catch (err) {
    // Return local matches if offline or timed out
  }

  return localMatches;
}

export function isWithinBangladesh(coords: Coordinates): boolean {
  return (
    coords.latitude >= 20.5 &&
    coords.latitude <= 26.7 &&
    coords.longitude >= 88.0 &&
    coords.longitude <= 92.8
  );
}

export async function getCurrentUserCoordinates(): Promise<Coordinates | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return null;
    }

    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
    };
  } catch (err) {
    console.warn('Failed to obtain device coordinates:', err);
    return null;
  }
}

export async function reverseGeocodeCoords(coords: Coordinates): Promise<GeocodedPlace> {
  const inBd = isWithinBangladesh(coords);

  // 1. Instant Landmark Match within 280 meters
  const nearestLandmark = findNearestLandmark(coords, 280);
  if (nearestLandmark) {
    return {
      name: nearestLandmark.name,
      zone: nearestLandmark.zone,
      subText: nearestLandmark.desc || `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`,
      formattedAddress: nearestLandmark.name,
      coords,
    };
  }

  // 2. Native Android Geocoder
  try {
    const nativePlaces = await Location.reverseGeocodeAsync({
      latitude: coords.latitude,
      longitude: coords.longitude,
    });

    if (nativePlaces && nativePlaces.length > 0) {
      const p = nativePlaces[0];
      const primaryName = p.name || p.street || p.subregion || p.district || (inBd ? 'Dhaka Location' : 'Selected Location');
      const area = p.subregion || p.district || p.city || (inBd ? 'Dhaka' : p.country || '');
      const label = area && primaryName !== area ? `${primaryName}, ${area}` : primaryName;

      return {
        name: label,
        zone: area || (inBd ? 'Dhaka' : 'Global'),
        subText: `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`,
        formattedAddress: label,
        coords,
      };
    }
  } catch (nativeErr) {
    // Native geocoder fallback
  }

  // 3. OpenStreetMap Nominatim Reverse API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'CampusOne-BUBT-App/1.0 (academic capstone)',
        },
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const placeName =
        addr.amenity ||
        addr.building ||
        addr.road ||
        addr.suburb ||
        addr.neighbourhood ||
        addr.residential ||
        data.name ||
        (inBd ? 'Dhaka Location' : 'Custom Map Pin');
      const cityArea = addr.suburb || addr.city_district || addr.city || (inBd ? 'Dhaka' : addr.country || '');
      const formatted = cityArea && placeName !== cityArea ? `${placeName}, ${cityArea}` : placeName;

      return {
        name: formatted,
        zone: cityArea || (inBd ? 'Dhaka' : 'Global'),
        subText: cityArea && placeName !== cityArea ? `${cityArea} · ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}` : `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`,
        formattedAddress: formatted,
        coords,
      };
    }
  } catch (osmErr) {
    // Fallback if network request fails
  }

  // 4. Clean Coordinate Fallback
  return {
    name: inBd ? 'Dhaka Location' : 'Selected Pin',
    zone: inBd ? 'Mirpur & Campus' : 'Map Pin',
    subText: inBd ? `Dhaka · ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}` : `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`,
    formattedAddress: `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`,
    coords,
  };
}
