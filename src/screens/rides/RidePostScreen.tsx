import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView,
  StyleSheet, Animated, Modal, type ViewStyle, type TextStyle,
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

interface HubItem {
  name: string;
  desc: string;
  icon: keyof typeof Feather.glyphMap;
}

interface HubGroup {
  category: string;
  icon: keyof typeof Feather.glyphMap;
  hubs: HubItem[];
}

const HUB_GROUPS: HubGroup[] = [
  {
    category: 'Nearby & Mirpur Area',
    icon: 'map-pin',
    hubs: [
      { name: 'Mirpur 10', desc: 'Metro Rail station · Main Mirpur roundabout', icon: 'navigation' },
      { name: 'Mirpur 2', desc: 'Sony Square · Commerce College road', icon: 'map-pin' },
      { name: 'Sony Cinema', desc: 'Sony Square roundabout & food corridor', icon: 'film' },
      { name: 'Rainkhola', desc: 'Zoo road entrance · Close to campus', icon: 'compass' },
      { name: 'Mirpur 1', desc: 'Muktodhara roundabout · Darussalam link', icon: 'map-pin' },
      { name: 'Technical', desc: 'Technical intersection · Gabtoli highway', icon: 'git-merge' },
    ],
  },
  {
    category: 'Major Dhaka Corridors',
    icon: 'compass',
    hubs: [
      { name: 'Uttara', desc: 'House Building / Rajlakshmi / Sector 7', icon: 'map' },
      { name: 'Shyamoli', desc: 'Shyamoli Square · Ring Road footbridge', icon: 'map-pin' },
      { name: 'Kalyanpur', desc: 'Bus stand · Rokeya Sarani transit', icon: 'navigation' },
      { name: 'Farmgate', desc: 'Ananda Cinema · Metro Rail station', icon: 'map-pin' },
      { name: 'Dhanmondi', desc: 'Russel Square / Shimanto Square / R#27', icon: 'navigation' },
      { name: 'Mohammadpur', desc: 'Town Hall / Shia Masjid / Ring Road', icon: 'map-pin' },
      { name: 'Agargaon', desc: 'Passport Office · Biman Bhaban Metro', icon: 'compass' },
    ],
  },
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

  function handleHubSelect(hub: string) {
    if (direction === 'To Campus') {
      setFrom(hub);
    } else {
      setTo(hub);
    }
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

          {/* 3. Origin & Destination */}
          <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {isOffer ? (t.rides2.from ?? 'PICKUP POINT / FROM') : 'YOUR LOCATION / FROM'}
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
            value={from}
            onChangeText={setFrom}
            placeholder={isOffer ? (t.rides2.fromPlaceholder ?? 'e.g. Mirpur 10') : 'e.g. Mirpur 2, Sony Cinema'}
            placeholderTextColor={C.textMuted}
          />

          <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {t.rides2.to ?? 'TO'}
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
            value={to}
            onChangeText={setTo}
            placeholder={t.rides2.toPlaceholder ?? 'e.g. BUBT Campus'}
            placeholderTextColor={C.textMuted}
          />

          {/* Hub Picker Trigger Bar (Opens Bottom Sheet Modal) */}
          <TouchableOpacity
            style={[
              styles.pickerTriggerCard,
              {
                backgroundColor: C.surface,
                borderColor: activeHub ? accentColor : C.border,
              },
            ]}
            onPress={() => setHubModalVisible(true)}
            activeOpacity={0.75}
          >
            <View style={styles.pickerTriggerLeft}>
              <View
                style={[
                  styles.pickerTriggerIconBox,
                  { backgroundColor: isDark ? `${accentColor}24` : `${accentColor}15` },
                ]}
              >
                <Feather name="map-pin" size={17} color={accentColor} />
              </View>
              <View style={styles.pickerTriggerContent}>
                <Text style={[styles.pickerTriggerLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                  {direction === 'To Campus' ? 'POPULAR PICKUP HUBS' : 'POPULAR DESTINATION HUBS'}
                </Text>
                <Text
                  style={[
                    styles.pickerTriggerValue,
                    {
                      color: activeHub ? C.text : C.textMuted,
                      fontFamily: activeHub ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {activeHub
                    ? `${activeHub} · Selected`
                    : 'Choose from 13 Mirpur & Dhaka hubs…'}
                </Text>
              </View>
            </View>

            <View style={styles.pickerTriggerRight}>
              {activeHub ? (
                <View
                  style={[
                    styles.activeBadgeCircle,
                    { backgroundColor: isDark ? `${accentColor}30` : `${accentColor}18` },
                  ]}
                >
                  <Feather name="check" size={12} color={accentColor} />
                </View>
              ) : null}
              <Feather name="chevron-down" size={18} color={C.textMuted} />
            </View>
          </TouchableOpacity>

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

      {/* 1. Commute Hubs Bottom Sheet Modal */}
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
                  <Feather name="map-pin" size={18} color={accentColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    {direction === 'To Campus' ? 'Select Pickup Hub' : 'Select Destination Hub'}
                  </Text>
                  <Text style={[styles.modalSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                    13 popular hubs across Mirpur & Dhaka
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

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 460 }}
              contentContainerStyle={{ paddingBottom: 16 }}
            >
              {HUB_GROUPS.map(group => (
                <View key={group.category} style={styles.modalGroupBlock}>
                  <View style={styles.modalGroupTitleRow}>
                    <Feather name={group.icon} size={12} color={C.textMuted} />
                    <Text style={[styles.modalGroupTitle, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                      {group.category.toUpperCase()}
                    </Text>
                  </View>

                  {group.hubs.map(hub => {
                    const active = activeHub.trim().toLowerCase() === hub.name.toLowerCase();
                    return (
                      <TouchableOpacity
                        key={hub.name}
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
                          handleHubSelect(hub.name);
                          setHubModalVisible(false);
                        }}
                        activeOpacity={0.75}
                      >
                        <View
                          style={[
                            styles.modalCardIconBox,
                            { backgroundColor: isDark ? `${accentColor}24` : `${accentColor}15` },
                          ]}
                        >
                          <Feather name={hub.icon} size={18} color={accentColor} />
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
                            {hub.name}
                          </Text>
                          <Text
                            style={[styles.modalCardSub, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}
                            numberOfLines={1}
                          >
                            {hub.desc}
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
