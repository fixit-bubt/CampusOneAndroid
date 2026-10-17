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
import { AnimatedIcon } from '../../components/ui/AnimatedIcon';
import { SegmentedTabs, type TabItem } from '../../components/ui/SegmentedTabs';
import { LocationPickerModal } from '../../components/location/LocationPickerModal';
import { FontFamily, Layout, SectorColors, pillBg } from '../../theme';
import { supabase } from '../../lib/supabase';
import { localToday, nowDhakaMinutes, formatDate, formatTime } from '../../utils/format';
import { BUBT_COORDS, type Coordinates } from '../../services/locationService';
import { findMasterLocationByName } from '../../constants/dhakaMasterLocations';
import { resolveHospitalLocation } from '../../constants/dhakaHospitalCoords';
import type { Ride } from '../../types/database';

const RIDE_COLOR = SectorColors.ride;

const VEHICLES: { id: Ride['vehicle']; label: string; iconName: string; maxSeats: number; defaultSeats: number }[] = [
  { id: 'Rickshaw', label: 'Rickshaw', iconName: 'rickshaw', maxSeats: 2, defaultSeats: 1 },
  { id: 'Bike',     label: 'Bike',     iconName: 'motorbike', maxSeats: 1, defaultSeats: 1 },
  { id: 'CNG',      label: 'CNG',      iconName: 'taxi', maxSeats: 3, defaultSeats: 2 },
  { id: 'Car',      label: 'Car',      iconName: 'car-side', maxSeats: 4, defaultSeats: 3 },
];

export { ALL_COMMUTE_HUBS as ALL_DHAKA_COMMUTE_AREAS, type CommuteAreaItem } from '../../components/rides/CommuteAreaPickerModal';
import { CommuteAreaPickerModal } from '../../components/rides/CommuteAreaPickerModal';

export const LOCATION_CATEGORIES = [
  { id: 'mirpur', label: 'Mirpur & Campus', count: 14, icon: 'map-pin' as const },
  { id: 'dhaka',  label: 'Greater Dhaka',   count: 44, icon: 'compass' as const },
] as const;


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
  try {
    const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Dhaka',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(d);
  } catch {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const off = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - off).toISOString().split('T')[0];
  }
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
  const dhakaMins = nowDhakaMinutes();
  const currentHour = Math.floor(dhakaMins / 60);
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
  const [fromCoords, setFromCoords] = useState<Coordinates | null>(null);
  const [toCoords, setToCoords] = useState<Coordinates | null>(BUBT_COORDS);
  const [dateChoice, setDateChoice] = useState<'today' | 'tomorrow'>(initialSchedule.defaultDate);
  const [time, setTime] = useState(initialSchedule.defaultTime);
  const [seats, setSeats] = useState(1);
  const [fare, setFare] = useState('40');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const [hubModalVisible, setHubModalVisible] = useState(false);
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [targetField, setTargetField] = useState<'from' | 'to'>('from');
  const [customFromMode, setCustomFromMode] = useState(false);
  const [customToMode, setCustomToMode] = useState(false);
  const [timeModalVisible, setTimeModalVisible] = useState(false);

  const isOffer = postType === 'offer';
  const accentColor = isOffer ? RIDE_COLOR : '#8b5cf6';
  const POST_TYPE_TABS: TabItem<'offer' | 'request'>[] = useMemo(() => [
    { id: 'offer', label: 'Offer Ride', color: RIDE_COLOR },
    { id: 'request', label: 'Need Ride', color: '#8b5cf6' },
  ], []);

  const DIRECTION_TABS: TabItem<Ride['direction']>[] = useMemo(() => [
    { id: 'To Campus', label: t.rides2.toCampus ?? 'To Campus', color: accentColor },
    { id: 'From Campus', label: t.rides2.fromCampus ?? 'From Campus', color: accentColor },
  ], [accentColor, t.rides2.toCampus, t.rides2.fromCampus]);

  const DATE_TABS: TabItem<'today' | 'tomorrow'>[] = useMemo(() => [
    { id: 'today', label: `${t.rides2.todayText ?? 'Today'} · ${formatShortDate(localToday())}`, color: accentColor },
    { id: 'tomorrow', label: `${t.rides2.tomorrowText ?? 'Tomorrow'} · ${formatShortDate(localTomorrow())}`, color: accentColor },
  ], [accentColor, t.rides2.todayText, t.rides2.tomorrowText]);

  const LOC_CAT_TABS: TabItem<'mirpur' | 'dhaka'>[] = useMemo(() => [
    { id: 'mirpur', label: 'Mirpur & Campus', color: accentColor },
    { id: 'dhaka', label: 'Greater Dhaka', color: accentColor },
  ], [accentColor]);

  const handlePostTypeChange = (next: 'offer' | 'request') => {
    setPostType(next);
    if (next === 'offer' && fare === '40') setFare('50');
    if (next === 'request' && fare === '50') setFare('40');
  };

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
    const dhakaMins = nowDhakaMinutes();
    const currentHour = Math.floor(dhakaMins / 60);
    if (choice === 'tomorrow') {
      if (!time || time === `${String((currentHour + 1) % 24).padStart(2, '0')}:00`) {
        setTime('08:00');
      }
    } else {
      if (currentHour >= 18 && time === '08:00') {
        const nextHour = Math.min(23, currentHour + 1);
        setTime(`${String(nextHour).padStart(2, '0')}:00`);
      }
    }
  }

  function handleDirectionSelect(dir: Ride['direction']) {
    setDirection(dir);
    if (dir === 'To Campus') {
      setTo('BUBT Campus');
      setToCoords(BUBT_COORDS);
      if (from === 'BUBT Campus') {
        setFrom('');
        setFromCoords(null);
      }
    } else {
      setFrom('BUBT Campus');
      setFromCoords(BUBT_COORDS);
      if (to === 'BUBT Campus') {
        setTo('');
        setToCoords(null);
      }
    }
  }

  const activeHub = direction === 'To Campus' ? from : to;

  function openLocationModal(field: 'from' | 'to') {
    setTargetField(field);
    setHubModalVisible(true);
  }

  function openMapModal(field: 'from' | 'to') {
    setTargetField(field);
    setMapModalVisible(true);
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
      const curMins = nowDhakaMinutes();
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
      : Math.max(1, Math.min(seats, 4));

    const finalOriginCoords = fromCoords
      || findMasterLocationByName(from.trim())?.coords
      || resolveHospitalLocation(from.trim()).coords
      || (from.trim().toLowerCase().includes('bubt') ? BUBT_COORDS : null);

    const finalDestCoords = toCoords
      || findMasterLocationByName(to.trim())?.coords
      || resolveHospitalLocation(to.trim()).coords
      || (to.trim().toLowerCase().includes('bubt') ? BUBT_COORDS : null);

    setLoading(true);
    try {
      const { error } = await supabase.from('rides').insert({
        driver_id:   user.id,
        direction:   direction,
        vehicle:     vehicle,
        origin:      from.trim(),
        destination: to.trim(),
        origin_lat:  finalOriginCoords?.latitude ?? null,
        origin_lng:  finalOriginCoords?.longitude ?? null,
        dest_lat:    finalDestCoords?.latitude ?? null,
        dest_lng:    finalDestCoords?.longitude ?? null,
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
          {/* Post Type Segmented Tab Switcher */}
          <SegmentedTabs<'offer' | 'request'>
            tabs={POST_TYPE_TABS}
            activeTab={postType}
            onTabChange={handlePostTypeChange}
          />

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
                  <AnimatedIcon
                    family="mci"
                    name={v.iconName}
                    size={26}
                    color={on ? accentColor : (isDark ? C.text2 : C.text)}
                    animation={on ? 'spring' : 'none'}
                    style={{ marginBottom: 5 }}
                  />
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

          {/* 2. Direction Selection */}
          <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {t.rides2.direction ?? 'DIRECTION'}
          </Text>
          <SegmentedTabs<Ride['direction']>
            tabs={DIRECTION_TABS}
            activeTab={direction}
            onTabChange={handleDirectionSelect}
          />

          {/* 3. Origin & Destination: Universal 72dp Dropdown System (100% Blood Parity) */}
          {/* Bar 1: Pickup Location (From) */}
          <View style={styles.labelRow}>
            <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold, marginTop: 0, marginBottom: 0 }]}>
              {isOffer ? (t.rides2.from ?? 'PICKUP LOCATION / FROM') : 'YOUR LOCATION / FROM'} *
            </Text>
            <TouchableOpacity
              onPress={() => setCustomFromMode(!customFromMode)}
              style={styles.toggleModeBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name={customFromMode ? 'list' : 'edit-2'} size={12} color={accentColor} />
              <Text style={[styles.toggleModeTxt, { color: accentColor, fontFamily: FontFamily.jakartaBold }]}>
                {customFromMode ? 'Choose from list' : 'Type custom'}
              </Text>
            </TouchableOpacity>
          </View>

          {customFromMode ? (
            <View style={[styles.customInputWrap, { backgroundColor: C.surface, borderColor: from ? accentColor : C.border }]}>
              <Feather name="navigation" size={17} color={accentColor} />
              <TextInput
                style={[styles.customInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                value={from}
                onChangeText={setFrom}
                placeholder={isOffer ? 'Enter custom pickup landmark...' : 'Enter your current location...'}
                placeholderTextColor={C.textMuted}
                autoFocus
              />
              {from.length > 0 && (
                <TouchableOpacity onPress={() => setFrom('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Feather name="x" size={15} color={C.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View
              style={[
                styles.dropdownCard,
                {
                  backgroundColor: C.surface,
                  borderColor: from ? accentColor : C.border,
                  borderWidth: from ? 1.5 : 1,
                },
              ]}
            >
              <TouchableOpacity
                style={styles.dropdownMain}
                onPress={() => openLocationModal('from')}
                activeOpacity={0.75}
              >
                <View
                  style={[
                    styles.dropdownIconBox,
                    {
                      backgroundColor: from ? pillBg(accentColor, isDark) : (isDark ? 'rgba(255, 255, 255, 0.06)' : C.surface2),
                      borderColor: from ? accentColor : C.border,
                      borderWidth: 1,
                    },
                  ]}
                >
                  <AnimatedIcon
                    key={`from-${from}`}
                    family="feather"
                    name="navigation"
                    size={20}
                    color={from ? (isDark ? '#ffffff' : accentColor) : C.text2}
                    animation={from ? 'spring' : 'entrance'}
                  />
                </View>
                <View style={styles.dropdownInfo}>
                  <Text
                    style={[
                      styles.dropdownValue,
                      {
                        color: from ? C.text : C.textMuted,
                        fontFamily: from ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {from || (isOffer ? 'Select pickup hub or area…' : 'Select your location…')}
                  </Text>
                  <Text style={[styles.dropdownHint, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                    {from ? `${from} · Tap to change` : 'Choose from 58 Dhaka commute hubs & GPS Map'}
                  </Text>
                </View>
              </TouchableOpacity>
              <View style={styles.dropdownRight}>
                {from ? (
                  <TouchableOpacity
                    onPress={() => setFrom('')}
                    style={[styles.clearPill, { backgroundColor: C.surface2, borderColor: C.border, borderWidth: 1 }]}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather name="x" size={14} color={C.textMuted} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={() => openLocationModal('from')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather name="chevron-down" size={18} color={C.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Bar 2: Destination (To) */}
          <View style={styles.labelRow}>
            <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold, marginTop: 0, marginBottom: 0 }]}>
              {t.rides2.to ?? 'DESTINATION / TO'} *
            </Text>
            <TouchableOpacity
              onPress={() => setCustomToMode(!customToMode)}
              style={styles.toggleModeBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name={customToMode ? 'list' : 'edit-2'} size={12} color={accentColor} />
              <Text style={[styles.toggleModeTxt, { color: accentColor, fontFamily: FontFamily.jakartaBold }]}>
                {customToMode ? 'Choose from list' : 'Type custom'}
              </Text>
            </TouchableOpacity>
          </View>

          {customToMode ? (
            <View style={[styles.customInputWrap, { backgroundColor: C.surface, borderColor: to ? accentColor : C.border }]}>
              <Feather name="map-pin" size={17} color={accentColor} />
              <TextInput
                style={[styles.customInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                value={to}
                onChangeText={setTo}
                placeholder="Enter custom destination landmark..."
                placeholderTextColor={C.textMuted}
                autoFocus
              />
              {to.length > 0 && (
                <TouchableOpacity onPress={() => setTo('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Feather name="x" size={15} color={C.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View
              style={[
                styles.dropdownCard,
                {
                  backgroundColor: C.surface,
                  borderColor: to ? accentColor : C.border,
                  borderWidth: to ? 1.5 : 1,
                },
              ]}
            >
              <TouchableOpacity
                style={styles.dropdownMain}
                onPress={() => openLocationModal('to')}
                activeOpacity={0.75}
              >
                <View
                  style={[
                    styles.dropdownIconBox,
                    {
                      backgroundColor: to ? pillBg(accentColor, isDark) : (isDark ? 'rgba(255, 255, 255, 0.06)' : C.surface2),
                      borderColor: to ? accentColor : C.border,
                      borderWidth: 1,
                    },
                  ]}
                >
                  <AnimatedIcon
                    key={`to-${to}`}
                    family="feather"
                    name="map-pin"
                    size={20}
                    color={to ? (isDark ? '#ffffff' : accentColor) : C.text2}
                    animation={to ? 'spring' : 'entrance'}
                  />
                </View>
                <View style={styles.dropdownInfo}>
                  <Text
                    style={[
                      styles.dropdownValue,
                      {
                        color: to ? C.text : C.textMuted,
                        fontFamily: to ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {to || 'Select destination hub or area…'}
                  </Text>
                  <Text style={[styles.dropdownHint, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                    {to ? `${to} · Tap to change` : 'Choose from 58 Dhaka commute hubs & GPS Map'}
                  </Text>
                </View>
              </TouchableOpacity>
              <View style={styles.dropdownRight}>
                {to ? (
                  <TouchableOpacity
                    onPress={() => setTo('')}
                    style={[styles.clearPill, { backgroundColor: C.surface2, borderColor: C.border, borderWidth: 1 }]}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather name="x" size={14} color={C.textMuted} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={() => openLocationModal('to')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather name="chevron-down" size={18} color={C.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* 4. Date Choice (Animated Segmented Track) */}
          <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {t.rides2.date ?? 'DATE'}
          </Text>
          <SegmentedTabs<'today' | 'tomorrow'>
            tabs={DATE_TABS}
            activeTab={dateChoice}
            onTabChange={handleDateChoice}
          />

          {/* 5. Departure Time Picker (Universal 72dp Dropdown Standard) */}
          <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {isOffer ? (t.rides2.time ?? 'DEPARTURE TIME') : 'WHEN DO YOU NEED THE RIDE?'} *
          </Text>

          <TouchableOpacity
            style={[
              styles.dropdownCard,
              {
                backgroundColor: C.surface,
                borderColor: accentColor,
                borderWidth: 1.5,
              },
            ]}
            onPress={() => setTimeModalVisible(true)}
            activeOpacity={0.75}
          >
            <View style={styles.dropdownMain}>
              <View
                style={[
                  styles.dropdownIconBox,
                  {
                    backgroundColor: pillBg(accentColor, isDark),
                    borderColor: accentColor,
                    borderWidth: 1,
                  },
                ]}
              >
                <AnimatedIcon
                  family="feather"
                  name="clock"
                  size={20}
                  color={isDark ? '#ffffff' : accentColor}
                  animation="spring"
                />
              </View>
              <View style={styles.dropdownInfo}>
                <Text style={[styles.dropdownValue, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                  {formatTime(time)} · {getShiftLabel(time)}
                </Text>
                <Text style={[styles.dropdownHint, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                  {selectedDate === localToday() ? 'Today' : 'Tomorrow'} · BUBT Varsity Shift Schedule
                </Text>
              </View>
            </View>

            <View style={styles.dropdownRight}>
              <View
                style={[
                  styles.timePreviewBadge,
                  {
                    backgroundColor: pillBg(accentColor, isDark),
                    borderColor: accentColor,
                    marginRight: 6,
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

          {/* 6. Seats & Fare Row (Universal 58dp Standard) */}
          <View style={styles.sideBySideRow}>
            {/* Seats Stepper (58dp) */}
            <View style={styles.halfCol}>
              <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                {isOffer ? (t.rides2.seats ?? 'SEATS OFFERED') : 'SEATS NEEDED'}
              </Text>
              <View style={[styles.stepper, { backgroundColor: C.surface, borderColor: C.border }]}>
                <TouchableOpacity
                  style={[styles.stepBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : C.surface2 }]}
                  onPress={() => setSeats(s => Math.max(1, s - 1))}
                  activeOpacity={0.7}
                >
                  <Feather name="minus" size={16} color={C.text} />
                </TouchableOpacity>
                <Text style={[styles.stepVal, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {seats}
                </Text>
                <TouchableOpacity
                  style={[styles.stepBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : C.surface2 }]}
                  onPress={() => setSeats(s => isOffer ? Math.min(currentVehicleConfig.maxSeats, s + 1) : Math.min(4, s + 1))}
                  activeOpacity={0.7}
                >
                  <Feather name="plus" size={16} color={C.text} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Fare Input (58dp) */}
            <View style={styles.halfCol}>
              <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                {isOffer ? (t.rides2.fareTk ?? 'FARE (৳) PER SEAT') : 'BUDGET (৳)'}
              </Text>
              <View style={[styles.fareInputWrap, { backgroundColor: C.surface, borderColor: fare ? accentColor : C.border }]}>
                <View style={[styles.currencyPrefixBox, { backgroundColor: pillBg(accentColor, isDark) }]}>
                  <Text style={[styles.currencyPrefixTxt, { color: accentColor, fontFamily: FontFamily.jakartaBold }]}>৳</Text>
                </View>
                <TextInput
                  style={[styles.fareInput, { color: C.text, fontFamily: FontFamily.jakartaBold }]}
                  value={fare}
                  onChangeText={setFare}
                  keyboardType="numeric"
                  placeholder="40"
                  placeholderTextColor={C.textMuted}
                />
                <Text style={[styles.perSeatLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                  / seat
                </Text>
              </View>
            </View>
          </View>

          {/* 7. Meeting Point / Notes (Universal 58dp Standard) */}
          <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {isOffer ? (t.rides2.meetingSpot ?? 'MEETING POINT / LANDMARK') : 'NOTES / MEETING POINT'}
          </Text>
          <View style={[styles.customInputWrap, { backgroundColor: C.surface, borderColor: notes ? accentColor : C.border }]}>
            <Feather name="map-pin" size={17} color={accentColor} />
            <TextInput
              style={[styles.customInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
              value={notes}
              onChangeText={setNotes}
              placeholder={isOffer ? 'e.g. Opposite Sony Cinema Gate 2, Rainkhola' : 'e.g. Waiting at footbridge, carrying bag'}
              placeholderTextColor={C.textMuted}
            />
            {notes.length > 0 && (
              <TouchableOpacity onPress={() => setNotes('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="x" size={15} color={C.textMuted} />
              </TouchableOpacity>
            )}
          </View>

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
            <Feather name={isOffer ? 'check-circle' : 'send'} size={18} color="#fff" />
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

      {/* 1. Commute Areas & Map Picker Bottom Sheet Modal (Full Parity with Blood Donation) */}
      <CommuteAreaPickerModal
        visible={hubModalVisible}
        onClose={() => setHubModalVisible(false)}
        selectedArea={targetField === 'from' ? from : to}
        onSelectArea={(areaName, subLoc, coords) => {
          const resolvedCoords = coords || findMasterLocationByName(areaName)?.coords || null;
          if (targetField === 'from') {
            setFrom(areaName);
            setFromCoords(resolvedCoords);
          } else {
            setTo(areaName);
            setToCoords(resolvedCoords);
          }
          if (coords && !notes && subLoc && subLoc !== areaName) {
            setNotes(subLoc);
          }
        }}
        title={targetField === 'from' ? (isOffer ? 'Select Pickup Point' : 'Your Current Location') : 'Select Destination'}
        subtitle="Choose commute hub or area in Dhaka"
        accentColor={accentColor}
      />


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

      {/* 3. Interactive MapLibre Vector Map & GPS Picker Modal */}
      <LocationPickerModal
        visible={mapModalVisible}
        onClose={() => setMapModalVisible(false)}
        accentColor={accentColor}
        title={targetField === 'from' ? (isOffer ? 'Select Pickup Point' : 'Your Current Location') : 'Select Destination'}
        initialPlaceName={targetField === 'from' ? from : to}
        initialCoords={(targetField === 'from' ? fromCoords : toCoords) || undefined}
        onSelectLocation={(place) => {
          if (targetField === 'from') {
            setFrom(place.formattedAddress);
            setFromCoords(place.coords);
          } else {
            setTo(place.formattedAddress);
            setToCoords(place.coords);
          }
          if (!notes && place.zone && place.subText && place.subText !== place.formattedAddress) {
            setNotes(place.subText);
          }
        }}
      />
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

  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 6,
  } as ViewStyle,
  toggleModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  } as ViewStyle,
  toggleModeTxt: {
    fontSize: 11.5,
  } as TextStyle,

  dropdownCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 72,
    borderRadius: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    gap: 12,
  } as ViewStyle,
  dropdownMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    height: '100%',
  } as ViewStyle,
  dropdownIconBox: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  dropdownInfo: {
    flex: 1,
    justifyContent: 'center',
  } as ViewStyle,
  dropdownValue: {
    fontSize: 14.5,
  } as TextStyle,
  dropdownHint: {
    fontSize: 11.5,
    marginTop: 2,
    lineHeight: 16,
  } as TextStyle,
  dropdownRight: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 4,
  } as ViewStyle,
  clearPill: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  customInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    gap: 10,
  } as ViewStyle,
  customInput: {
    flex: 1,
    height: '100%',
    fontSize: 14.5,
    paddingVertical: 0,
  } as TextStyle,

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
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  } as ViewStyle,
  modalSearchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14.5,
    paddingVertical: 0,
    textAlignVertical: 'center',
    includeFontPadding: false,
  } as TextStyle,

  /* Location Bars (Main Screen) */
  locationBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 58,
    borderRadius: 16,
    borderWidth: 1.2,
    paddingLeft: 14,
    paddingRight: 8,
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
  locationBarMapBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } as ViewStyle,
  locationBarPickTxt: {
    fontSize: 12.5,
  } as TextStyle,

  /* 58dp Map & GPS Trigger Card */
  mapTriggerCard58: {
    height: Layout.controlHeight,
    borderRadius: Layout.controlRadius,
    borderWidth: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 10,
    gap: 12,
  } as ViewStyle,
  mapTriggerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  mapTriggerTitle: {
    fontSize: 13.5,
    lineHeight: 18,
    includeFontPadding: false,
  } as TextStyle,
  mapTriggerSub: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
    includeFontPadding: false,
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
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 6,
  } as ViewStyle,
  stepBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  stepVal: {
    fontSize: 16,
  } as TextStyle,

  fareInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 10,
    gap: 8,
  } as ViewStyle,
  currencyPrefixBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  currencyPrefixTxt: {
    fontSize: 15,
  } as TextStyle,
  fareInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    paddingVertical: 0,
  } as TextStyle,
  perSeatLabel: {
    fontSize: 11.5,
  } as TextStyle,

  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    height: 58,
    borderRadius: 16,
    marginTop: 22,
  } as ViewStyle,
  submitBtnTxt: { fontSize: 15 } as TextStyle,
});
