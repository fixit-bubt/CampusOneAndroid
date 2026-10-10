import { useState, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView,
  Keyboard, StyleSheet, Animated, Modal, type ViewStyle, type TextStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useToast } from '../../components/ui/Toast';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../i18n';
import { useAuth } from '../../store/authStore';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout, SectorColors } from '../../theme';
import { supabase } from '../../lib/supabase';
import { localToday, formatDate, formatTime } from '../../utils/format';
import type { Ride } from '../../types/database';

const RIDE_COLOR = SectorColors.ride;

const VEHICLES: { id: Ride['vehicle']; label: string; icon: string; maxSeats: number; defaultSeats: number }[] = [
  { id: 'Rickshaw', label: 'Rickshaw', icon: '🚲', maxSeats: 2, defaultSeats: 1 },
  { id: 'Bike',     label: 'Bike',     icon: '🏍️', maxSeats: 1, defaultSeats: 1 },
  { id: 'CNG',      label: 'CNG',      icon: '🛺', maxSeats: 3, defaultSeats: 2 },
  { id: 'Car',      label: 'Car',      icon: '🚗', maxSeats: 4, defaultSeats: 3 },
];

export interface CommuteAreaItem {
  name: string;
  nameBn?: string;
  zone: string;
  desc: string;
  icon: keyof typeof Feather.glyphMap;
}

export const LOCATION_CATEGORIES = [
  { id: 'mirpur', label: 'Mirpur & Campus', count: 14, icon: 'map-pin' as const },
  { id: 'dhaka',  label: 'Greater Dhaka',   count: 44, icon: 'compass' as const },
] as const;

export const ALL_DHAKA_COMMUTE_AREAS: CommuteAreaItem[] = [
  // 1. Mirpur & Campus Vicinity
  { name: 'Mirpur 10', nameBn: 'মিরপুর-১০', zone: 'Mirpur & Campus', desc: 'Metro Rail station · Main Mirpur roundabout', icon: 'navigation' },
  { name: 'Mirpur 2 (BUBT)', nameBn: 'মিরপুর-২', zone: 'Mirpur & Campus', desc: 'Sony Square · Commerce College road · BUBT campus', icon: 'map-pin' },
  { name: 'Sony Cinema', nameBn: 'সনি স্কয়ার', zone: 'Mirpur & Campus', desc: 'Sony Square roundabout & food corridor', icon: 'film' },
  { name: 'Rainkhola', nameBn: 'রাইনখোলা', zone: 'Mirpur & Campus', desc: 'Zoo road entrance · Close to campus', icon: 'compass' },
  { name: 'Mirpur 1', nameBn: 'মিরপুর-১', zone: 'Mirpur & Campus', desc: 'Muktodhara roundabout · Darussalam link', icon: 'map-pin' },
  { name: 'Mirpur 6', nameBn: 'মিরপুর-৬', zone: 'Mirpur & Campus', desc: 'Mirpur 6 roundabout & stadium corridor', icon: 'map-pin' },
  { name: 'Mirpur 11', nameBn: 'মিরপুর-১১', zone: 'Mirpur & Campus', desc: 'Metro Rail station · Purobi cinema hall', icon: 'navigation' },
  { name: 'Mirpur 12', nameBn: 'মিরপুর-১২', zone: 'Mirpur & Campus', desc: 'Metro Rail terminal · Bus depot', icon: 'navigation' },
  { name: 'Mirpur 14', nameBn: 'মিরপুর-১৪', zone: 'Mirpur & Campus', desc: 'BRTA office · Kachukhet link road', icon: 'map-pin' },
  { name: 'Pallabi', nameBn: 'পল্লবী', zone: 'Mirpur & Campus', desc: 'Metro Rail station · Section 12 link', icon: 'navigation' },
  { name: 'Rupnagar', nameBn: 'রূপনগর', zone: 'Mirpur & Campus', desc: 'Rupnagar R/A · Commerce College back gate', icon: 'home' },
  { name: 'Technical', nameBn: 'টেকনিক্যাল', zone: 'Mirpur & Campus', desc: 'Technical intersection · Gabtoli highway', icon: 'git-merge' },
  { name: 'Mirpur DOHS', nameBn: 'মিরপুর ডিওএইচএস', zone: 'Mirpur & Campus', desc: 'DOHS residential gate · Avenue 3/4', icon: 'shield' },
  { name: 'ECB Chattar', nameBn: 'ইসিবি চত্বর', zone: 'Mirpur & Campus', desc: 'Flyover exit · Matikata · Cantonment link', icon: 'map-pin' },

  // 2. North Dhaka
  { name: 'Uttara (Sectors 1-18)', nameBn: 'উত্তরা', zone: 'North Dhaka', desc: 'House Building / Rajlakshmi / Metro North', icon: 'map' },
  { name: 'Banani', nameBn: 'বনানী', zone: 'North Dhaka', desc: 'Banani 11 · Kamal Ataturk Avenue · Kakoli', icon: 'map-pin' },
  { name: 'Gulshan-1', nameBn: 'গুলশান-১', zone: 'North Dhaka', desc: 'Gulshan 1 Circle · Shooting Club link', icon: 'navigation' },
  { name: 'Gulshan-2', nameBn: 'গুলশান-২', zone: 'North Dhaka', desc: 'Gulshan 2 Circle · Diplomatic Zone', icon: 'navigation' },
  { name: 'Baridhara', nameBn: 'বারিধারা', zone: 'North Dhaka', desc: 'Baridhara DOHS · J Block gate', icon: 'shield' },
  { name: 'Bashundhara R/A', nameBn: 'বসুন্ধরা আ/এ', zone: 'North Dhaka', desc: 'Main Gate · Jamuna Future Park · NSU/IUB', icon: 'map-pin' },
  { name: 'Mohakhali', nameBn: 'মহাখালী', zone: 'North Dhaka', desc: 'Flyover · Wireless Gate · Inter-district terminal', icon: 'navigation' },
  { name: 'Cantonment', nameBn: 'সেনানিবাস', zone: 'North Dhaka', desc: 'Sena Kunja · Adamjee / Jahangir Gate', icon: 'shield' },
  { name: 'Airport / Dakshinkhan', nameBn: 'বিমানবন্দর', zone: 'North Dhaka', desc: 'Hazrat Shahjalal Airport · Railway Station', icon: 'send' },
  { name: 'Kuril Flyover', nameBn: 'কুড়িল বিশ্বরোড', zone: 'North Dhaka', desc: 'Kuril Chowrasta · Purbachal 300 Feet link', icon: 'compass' },
  { name: 'Nikunja', nameBn: 'নিকুঞ্জ', zone: 'North Dhaka', desc: 'Nikunja 1 & 2 · Citycell link', icon: 'home' },

  // 3. Central & West Dhaka
  { name: 'Dhanmondi', nameBn: 'ধানমন্ডি', zone: 'Central & West', desc: 'Russel Square / Shimanto Square / Road 27', icon: 'navigation' },
  { name: 'Mohammadpur', nameBn: 'মোহাম্মদপুর', zone: 'Central & West', desc: 'Town Hall / Shia Masjid / Ring Road', icon: 'map-pin' },
  { name: 'Shyamoli', nameBn: 'শ্যামলী', zone: 'Central & West', desc: 'Shyamoli Square · Ring Road footbridge', icon: 'map-pin' },
  { name: 'Kalyanpur', nameBn: 'কল্যাণপুর', zone: 'Central & West', desc: 'Bus stand · Rokeya Sarani transit', icon: 'navigation' },
  { name: 'Farmgate', nameBn: 'ফার্মগেট', zone: 'Central & West', desc: 'Ananda Cinema · Metro Rail station', icon: 'map-pin' },
  { name: 'Tejgaon', nameBn: 'তেজগাঁও', zone: 'Central & West', desc: 'Nabisco / Satrasta / Industrial Area', icon: 'navigation' },
  { name: 'Agargaon', nameBn: 'আগারগাঁও', zone: 'Central & West', desc: 'Passport Office · Biman Bhaban Metro', icon: 'compass' },
  { name: 'Adabor', nameBn: 'আদাবর', zone: 'Central & West', desc: 'Adabor 10/16 · Mohammadpur link', icon: 'home' },
  { name: 'Kalabagan', nameBn: 'কলাবাগান', zone: 'Central & West', desc: 'Kalabagan playground · Mirpur Road', icon: 'map-pin' },
  { name: 'Panthapath', nameBn: 'পান্থপথ', zone: 'Central & West', desc: 'Bashundhara City · Square Hospital link', icon: 'navigation' },
  { name: 'Sobhanbagh', nameBn: 'সোবহানবাগ', zone: 'Central & West', desc: 'Daffodil campus · Mirpur Road link', icon: 'map-pin' },

  // 4. East Dhaka
  { name: 'Badda', nameBn: 'বাড্ডা', zone: 'East Dhaka', desc: 'Middle Badda · Link Road · Rampura canal', icon: 'map-pin' },
  { name: 'Rampura', nameBn: 'রামপুরা', zone: 'East Dhaka', desc: 'Rampura Bridge · TV Center · DIT Road', icon: 'navigation' },
  { name: 'Aftabnagar', nameBn: 'আফতাবনগর', zone: 'East Dhaka', desc: 'East West University gate · Block A/B', icon: 'home' },
  { name: 'Malibagh', nameBn: 'মালিবাগ', zone: 'East Dhaka', desc: 'Malibagh rail crossing · Mouchak market', icon: 'map-pin' },
  { name: 'Moghbazar', nameBn: 'মগবাজার', zone: 'East Dhaka', desc: 'Wireless crossing · Flyover junction', icon: 'navigation' },
  { name: 'Khilgaon', nameBn: 'খিলগাঁও', zone: 'East Dhaka', desc: 'Taltola · Shahid Baki Road restaurant street', icon: 'map-pin' },
  { name: 'Shantinagar', nameBn: 'শান্তিনগর', zone: 'East Dhaka', desc: 'Shantinagar intersection · Twin Towers', icon: 'navigation' },
  { name: 'Notun Bazar', nameBn: 'নতুন বাজার', zone: 'East Dhaka', desc: 'Madani Avenue · 100 Feet road link', icon: 'compass' },

  // 5. South & Old Dhaka
  { name: 'Motijheel', nameBn: 'মতিঝিল', zone: 'South & Old', desc: 'Shapla Chattar · Commercial Hub · Metro', icon: 'briefcase' },
  { name: 'Paltan / Press Club', nameBn: 'পল্টন', zone: 'South & Old', desc: 'National Press Club · Baitul Mukarram', icon: 'map-pin' },
  { name: 'Kakrail', nameBn: 'কাকরাইল', zone: 'South & Old', desc: 'St. Marys Cathedral · Circuit House road', icon: 'map-pin' },
  { name: 'Wari', nameBn: 'ওয়ারী', zone: 'South & Old', desc: 'Rankin Street · Baldha Garden', icon: 'home' },
  { name: 'Sadarghat', nameBn: 'সদরঘাট', zone: 'South & Old', desc: 'Launch Terminal · Victoria Park / Jagannath Univ', icon: 'anchor' },
  { name: 'Lalbagh', nameBn: 'লালবাগ', zone: 'South & Old', desc: 'Lalbagh Fort · Azimpur bus stand', icon: 'shield' },
  { name: 'Chawkbazar', nameBn: 'চকবাজার', zone: 'South & Old', desc: 'Shahi Masjid · Old Dhaka central market', icon: 'map-pin' },
  { name: 'Jatrabari', nameBn: 'যাত্রাবাড়ী', zone: 'South & Old', desc: 'Flyover entrance · Sayedabad highway terminal', icon: 'navigation' },
  { name: 'Sayedabad', nameBn: 'সায়েদাবাদ', zone: 'South & Old', desc: 'Inter-district bus terminal · Janapath', icon: 'navigation' },
  { name: 'Shahbagh / DMCH', nameBn: 'শাহবাগ / ঢামেক', zone: 'South & Old', desc: 'Shahbagh intersection · Dhaka Medical College', icon: 'plus-circle' },

  // 6. Suburbs & Corridors
  { name: 'Savar / Ashulia', nameBn: 'সাভার / আশুলিয়া', zone: 'Suburbs', desc: 'Savar Bazar · Baipail · Highway corridor', icon: 'map' },
  { name: 'Gabtoli', nameBn: 'গাবতলী', zone: 'Suburbs', desc: 'Gabtoli inter-district terminal · Mazar Road', icon: 'navigation' },
  { name: 'Hemayetpur', nameBn: 'হেমায়েতপুর', zone: 'Suburbs', desc: 'Dhaka-Aricha highway · Tannery road link', icon: 'compass' },
  { name: 'Gazipur Chowrasta', nameBn: 'গাজীপুর', zone: 'Suburbs', desc: 'Chowrasta intersection · Highway transit', icon: 'navigation' },
];

interface TimePeriod {
  title: string;
  desc: string;
  icon: keyof typeof Feather.glyphMap;
  times: string[];
}

const TIME_PERIODS: TimePeriod[] = [
  {
    title: 'Morning Shift',
    desc: 'Varsity class arrivals & morning lab sessions',
    icon: 'sunrise',
    times: ['07:30', '08:00', '08:30', '09:00', '10:00'],
  },
  {
    title: 'Afternoon Shift',
    desc: 'Midday schedule & afternoon lectures',
    icon: 'sun',
    times: ['12:00', '13:00', '14:30', '16:00'],
  },
  {
    title: 'Evening & Return Commutes',
    desc: 'Return trips & evening batch commute',
    icon: 'sunset',
    times: ['16:30', '17:30', '18:00', '19:30', '21:00'],
  },
];

function localTomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().split('T')[0];
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (!iso || isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function getShiftLabel(timeStr: string): string {
  const [h] = (timeStr || '').split(':').map(Number);
  if (!Number.isFinite(h)) return 'Commute Time';
  if (h < 12) return 'Morning Shift';
  if (h < 16) return 'Afternoon';
  return 'Evening Return';
}

function getInitialDateTime(): { defaultDate: 'today' | 'tomorrow'; defaultTime: string } {
  const now = new Date();
  const currentHour = now.getHours();
  // If it's evening (after 6 PM / 18:00), default to tomorrow morning 08:00
  if (currentHour >= 18) {
    return { defaultDate: 'tomorrow', defaultTime: '08:00' };
  }
  // Otherwise, default to the next upcoming hour today
  const nextHour = (currentHour + 1) % 24;
  const timeStr = `${String(nextHour).padStart(2, '0')}:00`;
  return { defaultDate: 'today', defaultTime: timeStr };
}

export function RidePostScreen({ route, navigation }: any) {
  const { C, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { user } = useAuth();
  const toast = useToast();

  const initialSchedule = getInitialDateTime();
  const initialPostType = route?.params?.postType === 'request' ? 'request' : 'offer';

  const [postType, setPostType] = useState<'offer' | 'request'>(initialPostType);
  const [vehicle, setVehicle] = useState<Ride['vehicle']>('Rickshaw');
  const [direction, setDirection] = useState<Ride['direction']>('To Campus');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('BUBT Campus');
  const [dateChoice, setDateChoice] = useState<'today' | 'tomorrow'>(initialSchedule.defaultDate);
  const [time, setTime] = useState(initialSchedule.defaultTime);
  const [seats, setSeats] = useState(1);
  const [fare, setFare] = useState('40');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const [hubModalVisible, setHubModalVisible] = useState(false);
  const [targetField, setTargetField] = useState<'from' | 'to'>('from');
  const [searchArea, setSearchArea] = useState('');
  const [locationCategory, setLocationCategory] = useState<'mirpur' | 'dhaka'>('mirpur');
  const [timeModalVisible, setTimeModalVisible] = useState(false);

  const isOffer = postType === 'offer';
  const accentColor = isOffer ? RIDE_COLOR : '#8b5cf6';
  const TRACK_PADDING = 3;

  // 1. Post Type (Offer vs Request)
  const animIndex = useRef(new Animated.Value(initialPostType === 'request' ? 1 : 0)).current;
  const [trackWidth, setTrackWidth] = useState(0);

  useEffect(() => {
    Animated.spring(animIndex, {
      toValue: postType === 'request' ? 1 : 0,
      tension: 68,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [postType, animIndex]);

  const innerTrackWidth = Math.max(0, trackWidth - TRACK_PADDING * 2);
  const tabWidth = innerTrackWidth > 0 ? innerTrackWidth / 2 : 0;
  const translateX = animIndex.interpolate({
    inputRange: [0, 1],
    outputRange: [0, tabWidth],
  });

  // 2. Direction (To Campus vs From Campus)
  const dirAnimIndex = useRef(new Animated.Value(direction === 'From Campus' ? 1 : 0)).current;
  const [dirTrackWidth, setDirTrackWidth] = useState(0);

  useEffect(() => {
    Animated.spring(dirAnimIndex, {
      toValue: direction === 'From Campus' ? 1 : 0,
      tension: 68,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [direction, dirAnimIndex]);

  const dirInnerTrackWidth = Math.max(0, dirTrackWidth - TRACK_PADDING * 2);
  const dirTabWidth = dirInnerTrackWidth > 0 ? dirInnerTrackWidth / 2 : 0;
  const dirTranslateX = dirAnimIndex.interpolate({
    inputRange: [0, 1],
    outputRange: [0, dirTabWidth],
  });

  // 3. Date Choice (Today vs Tomorrow)
  const dateAnimIndex = useRef(new Animated.Value(dateChoice === 'tomorrow' ? 1 : 0)).current;
  const [dateTrackWidth, setDateTrackWidth] = useState(0);

  useEffect(() => {
    Animated.spring(dateAnimIndex, {
      toValue: dateChoice === 'tomorrow' ? 1 : 0,
      tension: 68,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [dateChoice, dateAnimIndex]);

  const dateInnerTrackWidth = Math.max(0, dateTrackWidth - TRACK_PADDING * 2);
  const dateTabWidth = dateInnerTrackWidth > 0 ? dateInnerTrackWidth / 2 : 0;
  const dateTranslateX = dateAnimIndex.interpolate({
    inputRange: [0, 1],
    outputRange: [0, dateTabWidth],
  });

  // 4. Modal Category Switcher (Mirpur & Campus vs Greater Dhaka)
  const catAnimIndex = useRef(new Animated.Value(locationCategory === 'dhaka' ? 1 : 0)).current;
  const [catTrackWidth, setCatTrackWidth] = useState(0);

  useEffect(() => {
    Animated.spring(catAnimIndex, {
      toValue: locationCategory === 'dhaka' ? 1 : 0,
      tension: 68,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [locationCategory, catAnimIndex]);

  const catInnerTrackWidth = Math.max(0, catTrackWidth - TRACK_PADDING * 2);
  const catTabWidth = catInnerTrackWidth > 0 ? catInnerTrackWidth / 2 : 0;
  const catTranslateX = catAnimIndex.interpolate({
    inputRange: [0, 1],
    outputRange: [0, catTabWidth],
  });

  const currentVehicleConfig = VEHICLES.find(v => v.id === vehicle) ?? VEHICLES[0];

  function handleVehicleSelect(v: Ride['vehicle']) {
    setVehicle(v);
    const cfg = VEHICLES.find(item => item.id === v);
    if (cfg) {
      setSeats(Math.min(seats, cfg.maxSeats) || cfg.defaultSeats);
    }
  }

  function handleDateChoice(choice: 'today' | 'tomorrow') {
    setDateChoice(choice);
    const now = new Date();
    if (choice === 'tomorrow') {
      if (!time || time === `${String((now.getHours() + 1) % 24).padStart(2, '0')}:00`) {
        setTime('08:00');
      }
    } else {
      if (now.getHours() >= 18 && time === '08:00') {
        const nextHour = Math.min(23, now.getHours() + 1);
        setTime(`${String(nextHour).padStart(2, '0')}:00`);
      }
    }
  }

  function handleDirectionSelect(dir: Ride['direction']) {
    setDirection(dir);
    if (dir === 'To Campus') {
      setTo('BUBT Campus');
      if (from === 'BUBT Campus') setFrom('');
    } else {
      setFrom('BUBT Campus');
      if (to === 'BUBT Campus') setTo('');
    }
  }

  const activeHub = direction === 'To Campus' ? from : to;

  function openLocationModal(field: 'from' | 'to') {
    setTargetField(field);
    setSearchArea('');
    const targetCat = field === 'from' ? 'mirpur' : 'dhaka';
    setLocationCategory(targetCat);
    catAnimIndex.setValue(targetCat === 'dhaka' ? 1 : 0);
    setHubModalVisible(true);
  }

  function handleAreaSelect(areaName: string) {
    Keyboard.dismiss();
    if (targetField === 'from') {
      setFrom(areaName);
    } else {
      setTo(areaName);
    }
    setHubModalVisible(false);
  }

  const filteredAreas = useMemo(() => {
    const q = searchArea.trim().toLowerCase();
    if (q) {
      return ALL_DHAKA_COMMUTE_AREAS.filter(a =>
        a.name.toLowerCase().includes(q) ||
        (a.nameBn && a.nameBn.includes(q)) ||
        a.zone.toLowerCase().includes(q) ||
        a.desc.toLowerCase().includes(q)
      );
    }
    if (locationCategory === 'mirpur') {
      return ALL_DHAKA_COMMUTE_AREAS.filter(a => a.zone === 'Mirpur & Campus');
    }
    return ALL_DHAKA_COMMUTE_AREAS.filter(a => a.zone !== 'Mirpur & Campus');
  }, [searchArea, locationCategory]);

  const groupedAreas = useMemo(() => {
    const map: Record<string, CommuteAreaItem[]> = {};
    filteredAreas.forEach(a => {
      if (!map[a.zone]) map[a.zone] = [];
      map[a.zone].push(a);
    });
    return map;
  }, [filteredAreas]);

  const selectedDate = dateChoice === 'today' ? localToday() : localTomorrow();

  const canSubmit = from.trim() && to.trim() && fare.trim();

  async function handleSubmit() {
    if (!canSubmit || !user || loading) return;
    const parsedFare = parseInt(fare, 10);
    if (isNaN(parsedFare) || parsedFare < 0) {
      toast({ type: 'error', title: t.rides2.invalidFareTitle, message: t.rides2.invalidFareBody });
      return;
    }

    // Normalize time to HH:MM with leading zero
    let timePart = time.trim() || '08:00';
    if (/^\d:\d{2}$/.test(timePart)) {
      timePart = '0' + timePart;
    }

    // Validate that a ride scheduled for Today hasn't already departed
    const [h, m] = timePart.split(':').map(Number);
    if (selectedDate === localToday() && Number.isFinite(h) && Number.isFinite(m)) {
      const now = new Date();
      const curMins = now.getHours() * 60 + now.getMinutes();
      const rideMins = h * 60 + m;
      if (rideMins < curMins - 15) {
        toast({
          type: 'info',
          title: 'Departure Time Passed',
          message: 'The departure time has already passed for today. Please pick a future time or select Tomorrow.',
        });
        return;
      }
    }

    const calculatedSeats = postType === 'offer'
      ? Math.max(1, Math.min(seats, currentVehicleConfig.maxSeats))
      : Math.max(1, Math.min(seats, 2));

    setLoading(true);
    try {
      const { error } = await supabase.from('rides').insert({
        driver_id:   user.id,
        direction:   direction,
        vehicle:     vehicle,
        origin:      from.trim(),
        destination: to.trim(),
        date:        selectedDate,
        time:        timePart,
        seats_total: calculatedSeats,
        fare:        parsedFare,
        notes:       notes.trim() || null,
        recurring:   [],
        post_type:   postType,
      });

      if (error) throw error;
      toast({
        type: 'success',
        title: postType === 'offer' ? 'Ride Offered' : 'Ride Requested',
        message: postType === 'offer'
          ? 'Your campus ride is now visible to students.'
          : 'Your ride request is now posted for drivers and carpoolers.',
      });
      navigation.goBack();
    } catch (err: any) {
      toast({ type: 'error', title: t.common.error, message: err?.message || t.rides2.postFailed });
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar
        title={t.rides2.postRideTitle ?? 'Post a Ride'}
        onBack={() => navigation.goBack()}
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        >
          {/* Post Type Segmented Animated Track Bar */}
          <View
            style={[styles.segmentedTrack, { backgroundColor: C.surface2 }]}
            onLayout={e => setTrackWidth(e.nativeEvent.layout.width)}
          >
            {tabWidth > 0 && (
              <Animated.View
                style={[
                  styles.slidingIndicator,
                  {
                    width: tabWidth,
                    transform: [{ translateX }],
                    backgroundColor: C.surface,
                    borderColor: isDark
                      ? (isOffer ? `${RIDE_COLOR}55` : '#8b5cf655')
                      : (isOffer ? `${RIDE_COLOR}35` : '#8b5cf635'),
                  },
                ]}
              />
            )}

            <TouchableOpacity
              style={styles.segmentedTabBtn}
              onPress={() => {
                setPostType('offer');
                if (fare === '40') setFare('50');
              }}
              activeOpacity={0.75}
            >
              <Feather name="navigation" size={14} color={isOffer ? RIDE_COLOR : C.textMuted} />
              <Text
                style={[
                  styles.segmentedTabTxt,
                  {
                    color: isOffer ? RIDE_COLOR : C.textMuted,
                    fontFamily: isOffer ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                  },
                ]}
              >
                Offer Ride (Driver)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.segmentedTabBtn}
              onPress={() => {
                setPostType('request');
                if (fare === '50') setFare('40');
              }}
              activeOpacity={0.75}
            >
              <Feather name="user-check" size={14} color={!isOffer ? '#8b5cf6' : C.textMuted} />
              <Text
                style={[
                  styles.segmentedTabTxt,
                  {
                    color: !isOffer ? '#8b5cf6' : C.textMuted,
                    fontFamily: !isOffer ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                  },
                ]}
              >
                Need Ride (Passenger)
              </Text>
            </TouchableOpacity>
          </View>

          {/* 1. Vehicle Selection */}
          <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {isOffer ? (t.rides2.vehicle ?? 'YOUR VEHICLE') : 'PREFERRED VEHICLE'}
          </Text>
          <View style={styles.vehicleRow}>
            {VEHICLES.map(v => {
              const on = vehicle === v.id;
              return (
                <TouchableOpacity
                  key={v.id}
                  style={[
                    styles.vehicleCard,
                    {
                      backgroundColor: on
                        ? (isDark ? 'rgba(110, 139, 31, 0.2)' : (isOffer ? '#f4f8e6' : '#f5f0ff'))
                        : C.surface,
                      borderColor: on ? accentColor : C.border,
                    },
                  ]}
                  onPress={() => handleVehicleSelect(v.id)}
                  activeOpacity={0.75}
                >
                  {v.id === 'Rickshaw' ? (
                    <MaterialCommunityIcons
                      name="rickshaw"
                      size={26}
                      color={on ? accentColor : (isDark ? '#a3e635' : '#4d7c0f')}
                      style={{ marginBottom: 4 }}
                    />
                  ) : (
                    <Text style={styles.vehicleIcon}>{v.icon}</Text>
                  )}
                  <Text style={[styles.vehicleLabel, { color: on ? accentColor : C.text, fontFamily: FontFamily.jakartaBold }]}>
                    {v.label}
                  </Text>
                  <Text style={[styles.vehicleSeatsHint, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                    {isOffer ? `Max ${v.maxSeats}` : 'Any'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 2. Direction Selection (Animated Segmented Track) */}
          <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {t.rides2.direction ?? 'DIRECTION'}
          </Text>
          <View
            style={[styles.segmentedTrack, { backgroundColor: C.surface2 }]}
            onLayout={e => setDirTrackWidth(e.nativeEvent.layout.width)}
          >
            {dirTabWidth > 0 && (
              <Animated.View
                style={[
                  styles.slidingIndicator,
                  {
                    width: dirTabWidth,
                    transform: [{ translateX: dirTranslateX }],
                    backgroundColor: C.surface,
                    borderColor: isDark
                      ? (isOffer ? `${RIDE_COLOR}55` : '#8b5cf655')
                      : (isOffer ? `${RIDE_COLOR}35` : '#8b5cf635'),
                  },
                ]}
              />
            )}

            <TouchableOpacity
              style={styles.segmentedTabBtn}
              onPress={() => handleDirectionSelect('To Campus')}
              activeOpacity={0.75}
            >
              <Feather
                name="arrow-up-right"
                size={14}
                color={direction === 'To Campus' ? accentColor : C.textMuted}
              />
              <Text
                style={[
                  styles.segmentedTabTxt,
                  {
                    color: direction === 'To Campus' ? accentColor : C.textMuted,
                    fontFamily: direction === 'To Campus' ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                  },
                ]}
              >
                {t.rides2.toCampus ?? 'To Campus'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.segmentedTabBtn}
              onPress={() => handleDirectionSelect('From Campus')}
              activeOpacity={0.75}
            >
              <Feather
                name="arrow-down-left"
                size={14}
                color={direction === 'From Campus' ? accentColor : C.textMuted}
              />
              <Text
                style={[
                  styles.segmentedTabTxt,
                  {
                    color: direction === 'From Campus' ? accentColor : C.textMuted,
                    fontFamily: direction === 'From Campus' ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                  },
                ]}
              >
                {t.rides2.fromCampus ?? 'From Campus'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* 3. Origin & Destination: 2 Dedicated Location Bars */}
          {/* Bar 1: Pickup Location (From) */}
          <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {isOffer ? (t.rides2.from ?? 'PICKUP LOCATION / FROM') : 'YOUR LOCATION / FROM'}
          </Text>
          <View style={[styles.locationBarContainer, { backgroundColor: C.surface, borderColor: from ? accentColor : C.border }]}>
            <View style={styles.locationBarLeftIcon}>
              <Feather name="navigation" size={16} color={accentColor} />
            </View>
            <TextInput
              style={[styles.locationBarInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
              value={from}
              onChangeText={setFrom}
              placeholder={isOffer ? (t.rides2.fromPlaceholder ?? 'e.g. Mirpur 10, Sony Square, or custom…') : 'e.g. Mirpur 2, Sony Cinema, or custom…'}
              placeholderTextColor={C.textMuted}
            />
            <TouchableOpacity
              style={[
                styles.locationBarPickBtn,
                {
                  backgroundColor: isDark ? `${accentColor}22` : `${accentColor}14`,
                  borderColor: isDark ? `${accentColor}44` : `${accentColor}28`,
                },
              ]}
              onPress={() => openLocationModal('from')}
              activeOpacity={0.75}
            >
              <Text style={[styles.locationBarPickTxt, { color: accentColor, fontFamily: FontFamily.jakartaBold }]}>
                Pick Area
              </Text>
              <Feather name="chevron-down" size={13} color={accentColor} />
            </TouchableOpacity>
          </View>

          {/* Bar 2: Destination (To) */}
          <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {t.rides2.to ?? 'DESTINATION / TO'}
          </Text>
          <View style={[styles.locationBarContainer, { backgroundColor: C.surface, borderColor: to ? accentColor : C.border }]}>
            <View style={styles.locationBarLeftIcon}>
              <Feather name="map-pin" size={16} color={accentColor} />
            </View>
            <TextInput
              style={[styles.locationBarInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
              value={to}
              onChangeText={setTo}
              placeholder={t.rides2.toPlaceholder ?? 'e.g. BUBT Campus, Uttara, Dhanmondi…'}
              placeholderTextColor={C.textMuted}
            />
            <TouchableOpacity
              style={[
                styles.locationBarPickBtn,
                {
                  backgroundColor: isDark ? `${accentColor}22` : `${accentColor}14`,
                  borderColor: isDark ? `${accentColor}44` : `${accentColor}28`,
                },
              ]}
              onPress={() => openLocationModal('to')}
              activeOpacity={0.75}
            >
              <Text style={[styles.locationBarPickTxt, { color: accentColor, fontFamily: FontFamily.jakartaBold }]}>
                Pick Area
              </Text>
              <Feather name="chevron-down" size={13} color={accentColor} />
            </TouchableOpacity>
          </View>

          {/* 4. Date Choice (Animated Segmented Track) */}
          <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {t.rides2.date ?? 'DATE'}
          </Text>
          <View
            style={[styles.segmentedTrack, { backgroundColor: C.surface2 }]}
            onLayout={e => setDateTrackWidth(e.nativeEvent.layout.width)}
          >
            {dateTabWidth > 0 && (
              <Animated.View
                style={[
                  styles.slidingIndicator,
                  {
                    width: dateTabWidth,
                    transform: [{ translateX: dateTranslateX }],
                    backgroundColor: C.surface,
                    borderColor: isDark
                      ? (isOffer ? `${RIDE_COLOR}55` : '#8b5cf655')
                      : (isOffer ? `${RIDE_COLOR}35` : '#8b5cf635'),
                  },
                ]}
              />
            )}

            <TouchableOpacity
              style={styles.segmentedTabBtn}
              onPress={() => handleDateChoice('today')}
              activeOpacity={0.75}
            >
              <Feather
                name="calendar"
                size={13}
                color={dateChoice === 'today' ? accentColor : C.textMuted}
              />
              <Text
                style={[
                  styles.segmentedTabTxt,
                  {
                    color: dateChoice === 'today' ? accentColor : C.textMuted,
                    fontFamily: dateChoice === 'today' ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                  },
                ]}
                numberOfLines={1}
              >
                {(t.rides2.todayText ?? 'Today')} · {formatShortDate(localToday())}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.segmentedTabBtn}
              onPress={() => handleDateChoice('tomorrow')}
              activeOpacity={0.75}
            >
              <Feather
                name="calendar"
                size={13}
                color={dateChoice === 'tomorrow' ? accentColor : C.textMuted}
              />
              <Text
                style={[
                  styles.segmentedTabTxt,
                  {
                    color: dateChoice === 'tomorrow' ? accentColor : C.textMuted,
                    fontFamily: dateChoice === 'tomorrow' ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                  },
                ]}
                numberOfLines={1}
              >
                {(t.rides2.tomorrowText ?? 'Tomorrow')} · {formatShortDate(localTomorrow())}
              </Text>
            </TouchableOpacity>
          </View>

          {/* 5. Departure Time Picker Trigger Bar */}
          <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {isOffer ? (t.rides2.time ?? 'DEPARTURE TIME') : 'WHEN DO YOU NEED THE RIDE?'}
          </Text>

          <TouchableOpacity
            style={[
              styles.pickerTriggerCard,
              {
                backgroundColor: C.surface,
                borderColor: accentColor,
              },
            ]}
            onPress={() => setTimeModalVisible(true)}
            activeOpacity={0.75}
          >
            <View style={styles.pickerTriggerLeft}>
              <View
                style={[
                  styles.pickerTriggerIconBox,
                  { backgroundColor: isDark ? `${accentColor}24` : `${accentColor}15` },
                ]}
              >
                <Feather name="clock" size={17} color={accentColor} />
              </View>
              <View style={styles.pickerTriggerContent}>
                <Text style={[styles.pickerTriggerLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                  DEPARTURE TIME & VARSITY SHIFT
                </Text>
                <Text
                  style={[
                    styles.pickerTriggerValue,
                    { color: C.text, fontFamily: FontFamily.jakartaBold },
                  ]}
                  numberOfLines={1}
                >
                  {formatTime(time)} · {getShiftLabel(time)}
                </Text>
              </View>
            </View>

            <View style={styles.pickerTriggerRight}>
              <View
                style={[
                  styles.timePreviewBadge,
                  {
                    backgroundColor: isDark
                      ? 'rgba(110, 139, 31, 0.18)'
                      : (isOffer ? '#f2f7e4' : '#f5f0ff'),
                    borderColor: isDark ? 'transparent' : (isOffer ? `${RIDE_COLOR}40` : '#8b5cf640'),
                  },
                ]}
              >
                <Text style={[styles.timePreviewTxt, { color: accentColor, fontFamily: FontFamily.jakartaBold }]}>
                  {formatTime(time)}
                </Text>
              </View>
              <Feather name="chevron-down" size={18} color={C.textMuted} />
            </View>
          </TouchableOpacity>

          {/* 6. Seats & Fare Row */}
          <View style={styles.sideBySideRow}>
            {/* Seats Stepper */}
            <View style={styles.halfCol}>
              <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                {isOffer ? (t.rides2.seats ?? 'SEATS OFFERED') : 'SEATS NEEDED'}
              </Text>
              <View style={[styles.stepper, { backgroundColor: C.surface, borderColor: C.border }]}>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => setSeats(s => Math.max(1, s - 1))}
                  activeOpacity={0.7}
                >
                  <Feather name="minus" size={16} color={C.text} />
                </TouchableOpacity>
                <Text style={[styles.stepVal, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {seats}
                </Text>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => setSeats(s => isOffer ? Math.min(currentVehicleConfig.maxSeats, s + 1) : Math.min(2, s + 1))}
                  activeOpacity={0.7}
                >
                  <Feather name="plus" size={16} color={C.text} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Fare Input */}
            <View style={styles.halfCol}>
              <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                {isOffer ? (t.rides2.fareTk ?? 'FARE (৳) PER SEAT') : 'BUDGET (৳)'}
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                value={fare}
                onChangeText={setFare}
                keyboardType="numeric"
                placeholder="40"
                placeholderTextColor={C.textMuted}
              />
            </View>
          </View>

          {/* 7. Meeting Point / Notes */}
          <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {isOffer ? (t.rides2.meetingSpot ?? 'MEETING POINT / LANDMARK') : 'NOTES / MEETING POINT'}
          </Text>
          <TextInput
            style={[styles.input, styles.multilineInput, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
            value={notes}
            onChangeText={setNotes}
            placeholder={isOffer ? (t.rides2.meetingSpotPlaceholder ?? 'e.g. Opposite Sony Cinema Hall gate') : 'e.g. Waiting at footbridge, carrying backpack'}
            placeholderTextColor={C.textMuted}
            multiline
            numberOfLines={2}
          />

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitBtn,
              {
                backgroundColor: isOffer ? RIDE_COLOR : '#8b5cf6',
                opacity: canSubmit && !loading ? 1 : 0.6,
              },
            ]}
            onPress={handleSubmit}
            disabled={!canSubmit || loading}
            activeOpacity={0.8}
          >
            <Feather name={isOffer ? 'check-circle' : 'send'} size={17} color="#fff" />
            <Text style={[styles.submitBtnTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
              {loading
                ? 'Posting…'
                : isOffer
                ? (t.rides2.offerRide ?? 'Post Offered Ride')
                : 'Post Ride Request'}
            </Text>
          </TouchableOpacity>
          <View style={{ height: 28 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 1. Commute Areas & Custom Location Bottom Sheet Modal */}
      <Modal
        visible={hubModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setHubModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setHubModalVisible(false)}
          />
          <KeyboardAvoidingView
            behavior="padding"
            style={{ width: '100%', justifyContent: 'flex-end' }}
          >
            <View
              style={[
                styles.modalSheet,
                {
                  backgroundColor: C.surface,
                  borderColor: C.border,
                  paddingBottom: Math.max(insets.bottom, 20),
                  maxHeight: '90%',
                },
              ]}
            >
              <View style={[styles.modalHandle, { backgroundColor: C.border }]} />

              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderLeft}>
                  <View
                    style={[
                      styles.modalHeaderIcon,
                      { backgroundColor: isDark ? `${accentColor}24` : `${accentColor}15` },
                    ]}
                  >
                    <Feather name="map-pin" size={18} color={accentColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modalTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                      {targetField === 'from' ? 'Select Pickup Point' : 'Select Destination'}
                    </Text>
                    <Text style={[styles.modalSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                      Choose from Mirpur hubs or Greater Dhaka areas
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => setHubModalVisible(false)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={[styles.modalCloseBtn, { backgroundColor: C.surface2 }]}
                >
                  <Feather name="x" size={16} color={C.text} />
                </TouchableOpacity>
              </View>

              {/* 1. Live Search Box */}
              <View style={[styles.modalSearchBox, { backgroundColor: C.surface2, borderColor: C.border }]}>
                <Feather name="search" size={15} color={C.textMuted} />
                <TextInput
                  style={[styles.modalSearchInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                  placeholder="Search any Dhaka area, landmark, or metro station…"
                  placeholderTextColor={C.textMuted}
                  value={searchArea}
                  onChangeText={setSearchArea}
                  autoCorrect={false}
                  returnKeyType="search"
                  onSubmitEditing={() => {
                    if (searchArea.trim()) {
                      handleAreaSelect(searchArea.trim());
                    }
                  }}
                />
                {searchArea.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchArea('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Feather name="x" size={14} color={C.textMuted} />
                  </TouchableOpacity>
                )}
              </View>

              {/* 2. The 2-Bar Category Switcher with Spring Sliding Animation */}
              <View
                style={[styles.categorySwitcherTrack, { backgroundColor: C.surface2 }]}
                onLayout={e => setCatTrackWidth(e.nativeEvent.layout.width)}
              >
                {catTabWidth > 0 && (
                  <Animated.View
                    style={[
                      styles.categorySlidingIndicator,
                      {
                        width: catTabWidth,
                        transform: [{ translateX: catTranslateX }],
                        backgroundColor: C.surface,
                        borderColor: isDark ? `${accentColor}55` : `${accentColor}35`,
                      },
                    ]}
                  />
                )}

                <TouchableOpacity
                  style={styles.categorySwitcherBtn}
                  onPress={() => setLocationCategory('mirpur')}
                  activeOpacity={0.75}
                >
                  <Feather
                    name="map-pin"
                    size={14}
                    color={locationCategory === 'mirpur' ? accentColor : C.textMuted}
                  />
                  <Text
                    style={[
                      styles.categorySwitcherTxt,
                      {
                        color: locationCategory === 'mirpur' ? accentColor : C.textMuted,
                        fontFamily: locationCategory === 'mirpur' ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                      },
                    ]}
                  >
                    Mirpur & Campus
                  </Text>
                  <View
                    style={[
                      styles.categoryMiniBadge,
                      {
                        backgroundColor: locationCategory === 'mirpur'
                          ? (isDark ? `${accentColor}25` : `${accentColor}18`)
                          : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryMiniBadgeTxt,
                        { color: locationCategory === 'mirpur' ? accentColor : C.textMuted, fontFamily: FontFamily.jakartaBold },
                      ]}
                    >
                      14
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.categorySwitcherBtn}
                  onPress={() => setLocationCategory('dhaka')}
                  activeOpacity={0.75}
                >
                  <Feather
                    name="compass"
                    size={14}
                    color={locationCategory === 'dhaka' ? accentColor : C.textMuted}
                  />
                  <Text
                    style={[
                      styles.categorySwitcherTxt,
                      {
                        color: locationCategory === 'dhaka' ? accentColor : C.textMuted,
                        fontFamily: locationCategory === 'dhaka' ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                      },
                    ]}
                  >
                    Greater Dhaka
                  </Text>
                  <View
                    style={[
                      styles.categoryMiniBadge,
                      {
                        backgroundColor: locationCategory === 'dhaka'
                          ? (isDark ? `${accentColor}25` : `${accentColor}18`)
                          : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryMiniBadgeTxt,
                        { color: locationCategory === 'dhaka' ? accentColor : C.textMuted, fontFamily: FontFamily.jakartaBold },
                      ]}
                    >
                      44
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* 3. Scrollable Areas List */}
              <ScrollView
                showsVerticalScrollIndicator={false}
                style={{ maxHeight: 420 }}
                contentContainerStyle={{ paddingBottom: 24 }}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
              >
                {/* Highlighted Custom Query Card if search text doesn't match an exact area */}
                {searchArea.trim().length > 1 && !ALL_DHAKA_COMMUTE_AREAS.some(a => a.name.toLowerCase() === searchArea.trim().toLowerCase()) && (
                  <TouchableOpacity
                    style={[
                      styles.modalCustomCard,
                      {
                        backgroundColor: isDark ? `${accentColor}20` : `${accentColor}10`,
                        borderColor: accentColor,
                      },
                    ]}
                    onPress={() => {
                      handleAreaSelect(searchArea.trim());
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.modalCardIconBox, { backgroundColor: accentColor }]}>
                      <Feather name="plus" size={17} color="#fff" />
                    </View>
                    <View style={styles.modalCardInfo}>
                      <Text style={[styles.modalCardTitle, { color: accentColor, fontFamily: FontFamily.jakartaBold }]}>
                        Use &ldquo;{searchArea.trim()}&rdquo;
                      </Text>
                      <Text style={[styles.modalCardSub, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                        Set as custom {targetField === 'from' ? 'pickup point' : 'destination'}
                      </Text>
                    </View>
                    <Feather name="arrow-right" size={16} color={accentColor} />
                  </TouchableOpacity>
                )}

                {Object.keys(groupedAreas).map(zoneName => (
                  <View key={zoneName} style={styles.modalGroupBlock}>
                    <View style={styles.modalGroupTitleRow}>
                      <Feather name="compass" size={12} color={C.textMuted} />
                      <Text style={[styles.modalGroupTitle, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                        {zoneName.toUpperCase()}
                      </Text>
                    </View>

                    {groupedAreas[zoneName].map(item => {
                      const currentVal = targetField === 'from' ? from : to;
                      const active = currentVal.trim().toLowerCase() === item.name.toLowerCase();

                      return (
                        <TouchableOpacity
                          key={item.name}
                          style={[
                            styles.modalCard,
                            {
                              backgroundColor: active
                                ? (isDark ? 'rgba(255, 255, 255, 0.04)' : `${accentColor}0a`)
                                : C.surface,
                              borderColor: active ? accentColor : C.border,
                              borderWidth: active ? 1.5 : 1,
                            },
                          ]}
                          onPress={() => handleAreaSelect(item.name)}
                          activeOpacity={0.75}
                        >
                          <View
                            style={[
                              styles.modalCardIconBox,
                              { backgroundColor: isDark ? `${accentColor}24` : `${accentColor}15` },
                            ]}
                          >
                            <Feather name={item.icon} size={18} color={accentColor} />
                          </View>

                          <View style={styles.modalCardInfo}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text
                                style={[
                                  styles.modalCardTitle,
                                  {
                                    color: active ? accentColor : C.text,
                                    fontFamily: active ? FontFamily.jakartaBold : FontFamily.jakartaSemiBold,
                                  },
                                ]}
                              >
                                {item.name}
                              </Text>
                              {item.nameBn ? (
                                <Text style={{ fontSize: 11, color: C.textMuted, fontFamily: FontFamily.bnRegular }}>
                                  ({item.nameBn})
                                </Text>
                              ) : null}
                            </View>
                            <Text
                              style={[styles.modalCardSub, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}
                              numberOfLines={1}
                            >
                              {item.desc}
                            </Text>
                          </View>

                          {active && (
                            <View style={[styles.modalCheckCircle, { backgroundColor: accentColor }]}>
                              <Feather name="check" size={13} color="#fff" />
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* 2. Departure Time Bottom Sheet Modal */}
      <Modal
        visible={timeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTimeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setTimeModalVisible(false)}
          />
          <KeyboardAvoidingView behavior="padding" style={{ width: '100%', justifyContent: 'flex-end' }}>
            <View
              style={[
                styles.modalSheet,
                {
                  backgroundColor: C.surface,
                  borderColor: C.border,
                  paddingBottom: Math.max(insets.bottom, 20),
                },
              ]}
            >
              <View style={[styles.modalHandle, { backgroundColor: C.border }]} />

              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderLeft}>
                  <View
                    style={[
                      styles.modalHeaderIcon,
                      { backgroundColor: isDark ? `${accentColor}24` : `${accentColor}15` },
                    ]}
                  >
                    <Feather name="clock" size={18} color={accentColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modalTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                      Select Departure Time
                    </Text>
                    <Text style={[styles.modalSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                      BUBT varsity commute shifts & class arrivals
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => setTimeModalVisible(false)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={[styles.modalCloseBtn, { backgroundColor: C.surface2 }]}
                >
                  <Feather name="x" size={16} color={C.text} />
                </TouchableOpacity>
              </View>

              {/* Exact Manual Time Input Bar at top of modal */}
              <View style={[styles.modalCustomTimeBar, { backgroundColor: C.surface2, borderColor: C.border }]}>
                <Feather name="edit-3" size={15} color={accentColor} style={{ marginLeft: 10, marginRight: 6 }} />
                <Text style={[styles.modalCustomTimeLabel, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  Custom:
                </Text>
                <TextInput
                  style={[styles.modalCustomTimeInput, { color: C.text, fontFamily: FontFamily.jakartaBold }]}
                  value={time}
                  onChangeText={setTime}
                  placeholder="08:00"
                  placeholderTextColor={C.textMuted}
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                />
                <TouchableOpacity
                  style={[styles.modalCustomTimeApplyBtn, { backgroundColor: accentColor }]}
                  onPress={() => setTimeModalVisible(false)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.modalCustomTimeApplyTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
                    Set Time
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                style={{ maxHeight: 420 }}
                contentContainerStyle={{ paddingBottom: 16 }}
              >
                {TIME_PERIODS.map(period => (
                  <View key={period.title} style={styles.modalGroupBlock}>
                    <View style={styles.modalGroupTitleRow}>
                      <Feather name={period.icon} size={12} color={C.textMuted} />
                      <Text style={[styles.modalGroupTitle, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                        {period.title.toUpperCase()}
                      </Text>
                    </View>

                    {period.times.map(tPreset => {
                      const active = time === tPreset;
                      return (
                        <TouchableOpacity
                          key={tPreset}
                          style={[
                            styles.modalCard,
                            {
                              backgroundColor: active
                                ? (isDark ? 'rgba(255, 255, 255, 0.04)' : `${accentColor}0a`)
                                : C.surface,
                              borderColor: active ? accentColor : C.border,
                              borderWidth: active ? 1.5 : 1,
                            },
                          ]}
                          onPress={() => {
                            setTime(tPreset);
                            setTimeModalVisible(false);
                          }}
                          activeOpacity={0.75}
                        >
                          <View
                            style={[
                              styles.modalCardIconBox,
                              { backgroundColor: isDark ? `${accentColor}24` : `${accentColor}15` },
                            ]}
                          >
                            <Feather name={period.icon} size={18} color={accentColor} />
                          </View>

                          <View style={styles.modalCardInfo}>
                            <Text
                              style={[
                                styles.modalCardTitle,
                                {
                                  color: active ? accentColor : C.text,
                                  fontFamily: active ? FontFamily.jakartaBold : FontFamily.jakartaSemiBold,
                                },
                              ]}
                            >
                              {formatTime(tPreset)}
                            </Text>
                            <Text
                              style={[styles.modalCardSub, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}
                              numberOfLines={1}
                            >
                              {period.desc}
                            </Text>
                          </View>

                          {active && (
                            <View style={[styles.modalCheckCircle, { backgroundColor: accentColor }]}>
                              <Feather name="check" size={13} color="#fff" />
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingTop: 6, paddingBottom: 24 },

  segmentedTrack: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 3,
    marginBottom: 12,
    position: 'relative',
  } as ViewStyle,
  slidingIndicator: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    left: 3,
    borderRadius: 11,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  } as ViewStyle,
  segmentedTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 11,
    minHeight: 44,
    zIndex: 1,
  } as ViewStyle,
  segmentedTabTxt: {
    fontSize: 12.5,
  } as TextStyle,

  sectionLabel: {
    fontSize: 11,
    letterSpacing: 0.6,
    marginTop: 14,
    marginBottom: 6,
  } as TextStyle,

  vehicleRow: {
    flexDirection: 'row',
    gap: 8,
  } as ViewStyle,
  vehicleCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    minHeight: 78,
    justifyContent: 'center',
  } as ViewStyle,
  vehicleIcon: { fontSize: 24, marginBottom: 3 },
  vehicleLabel: { fontSize: 12.5 } as TextStyle,
  vehicleSeatsHint: { fontSize: 10.5, marginTop: 1 } as TextStyle,

  input: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  } as TextStyle,
  multilineInput: {
    height: 70,
    paddingTop: 10,
    textAlignVertical: 'top',
  } as TextStyle,

  /* Location Inputs With Quick Action */
  inputWithAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  } as ViewStyle,
  inputFlex: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  } as TextStyle,
  inputActionBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } as ViewStyle,

  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  } as ViewStyle,

  /* Picker Trigger Cards */
  pickerTriggerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    borderRadius: 14,
    borderWidth: 1.2,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginTop: 8,
    marginBottom: 6,
  } as ViewStyle,
  pickerTriggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    flex: 1,
    paddingRight: 8,
  } as ViewStyle,
  pickerTriggerIconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } as ViewStyle,
  pickerTriggerContent: {
    flex: 1,
    minWidth: 0,
  } as ViewStyle,
  pickerTriggerLabel: {
    fontSize: 10,
    letterSpacing: 0.5,
    marginBottom: 2,
  } as TextStyle,
  pickerTriggerValue: {
    fontSize: 13.5,
  } as TextStyle,
  pickerTriggerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  } as ViewStyle,
  activeBadgeCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  timePreviewBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  } as ViewStyle,
  timePreviewTxt: {
    fontSize: 11.5,
  } as TextStyle,

  /* Bottom Sheet Modals (Matching DirectoryScreen 1:1) */
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  } as ViewStyle,
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  } as ViewStyle,
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingTop: 10,
    paddingHorizontal: Layout.screenPadding,
    maxHeight: '85%',
  } as ViewStyle,
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  } as ViewStyle,
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
  } as ViewStyle,
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  } as ViewStyle,
  modalHeaderIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  modalTitle: {
    fontSize: 16,
  } as TextStyle,
  modalSub: {
    fontSize: 11.5,
    marginTop: 1,
  } as TextStyle,
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  /* Target Switcher inside Location Modal */
  targetSwitcherTrack: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    marginBottom: 10,
    gap: 4,
  } as ViewStyle,
  targetSwitcherBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  } as ViewStyle,
  targetSwitcherTxt: {
    fontSize: 12,
  } as TextStyle,
  targetMiniDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  } as ViewStyle,

  /* Custom Location Input Bar */
  modalCustomLocationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    marginBottom: 8,
    gap: 8,
  } as ViewStyle,
  modalCustomLocationInput: {
    flex: 1,
    fontSize: 13.5,
    paddingVertical: 0,
  } as TextStyle,
  modalCustomLocationApplyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  modalCustomLocationApplyTxt: {
    fontSize: 12,
  } as TextStyle,

  /* Search Box */
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    marginBottom: 8,
    gap: 8,
  } as ViewStyle,
  modalSearchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  } as TextStyle,

  /* Location Bars (Main Screen) */
  locationBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 14,
    borderWidth: 1.2,
    paddingLeft: 12,
    paddingRight: 6,
    marginBottom: 8,
    gap: 8,
  } as ViewStyle,
  locationBarLeftIcon: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } as ViewStyle,
  locationBarInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  } as TextStyle,
  locationBarPickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
    flexShrink: 0,
  } as ViewStyle,
  locationBarPickTxt: {
    fontSize: 12.5,
  } as TextStyle,

  /* 2-Bar Category Switcher (Modal) */
  categorySwitcherTrack: {
    flexDirection: 'row',
    borderRadius: 13,
    padding: 3,
    marginBottom: 10,
    position: 'relative',
  } as ViewStyle,
  categorySlidingIndicator: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    left: 3,
    borderRadius: 10,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  } as ViewStyle,
  categorySwitcherBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    gap: 6,
    zIndex: 1,
  } as ViewStyle,
  categorySwitcherTxt: {
    fontSize: 12.5,
  } as TextStyle,
  categoryMiniBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  } as ViewStyle,
  categoryMiniBadgeTxt: {
    fontSize: 10.5,
  } as TextStyle,

  /* Custom Search Card fallback */
  modalCustomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 11,
    borderRadius: 14,
    borderWidth: 1.2,
    marginBottom: 10,
  } as ViewStyle,

  modalCustomTimeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 8,
    marginBottom: 12,
    gap: 6,
  } as ViewStyle,
  modalCustomTimeLabel: {
    fontSize: 12,
  } as TextStyle,
  modalCustomTimeInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
    paddingHorizontal: 4,
  } as TextStyle,
  modalCustomTimeApplyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  modalCustomTimeApplyTxt: {
    fontSize: 12,
  } as TextStyle,

  modalGroupBlock: {
    marginBottom: 12,
    gap: 6,
  } as ViewStyle,
  modalGroupTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
    marginTop: 4,
  } as ViewStyle,
  modalGroupTitle: {
    fontSize: 10.5,
    letterSpacing: 0.6,
  } as TextStyle,

  modalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 11,
    borderRadius: 14,
  } as ViewStyle,
  modalCardIconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } as ViewStyle,
  modalCardInfo: {
    flex: 1,
    minWidth: 0,
  } as ViewStyle,
  modalCardTitle: {
    fontSize: 13.5,
  } as TextStyle,
  modalCardSub: {
    fontSize: 11,
    marginTop: 2,
  } as TextStyle,
  modalCheckCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } as ViewStyle,

  sideBySideRow: {
    flexDirection: 'row',
    gap: 10,
  } as ViewStyle,
  halfCol: {
    flex: 1,
  } as ViewStyle,

  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 4,
  } as ViewStyle,
  stepBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  stepVal: { fontSize: 15 } as TextStyle,

  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 14,
    marginTop: 22,
  } as ViewStyle,
  submitBtnTxt: { fontSize: 15 } as TextStyle,
});
