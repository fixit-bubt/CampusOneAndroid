import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Linking,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { FontFamily, Layout, SectorColors } from '../../theme';
import { useT } from '../../i18n';
import { useApp } from '../../store/appStore';
import { useToast } from '../../components/ui/Toast';
import { supabase } from '../../lib/supabase';
import { setCache, getCache, CacheKeys } from '../../services/cacheService';
import { formatTime12, toMinutes, minutesToHHMM } from '../../utils/transitPrayer';
import type { BusRoute } from '../../types/database';

const BUS_COLOR = SectorColors.bus;

const DAY_OPTIONS = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const;

const POPULAR_STOPS = [
  'BUBT Main Campus',
  'Pallabi Metro',
  'Mirpur 10 Circle',
  'Mirpur 11',
  'Mirpur 2',
  'Mirpur 1',
  'Mirpur 14',
  'Agargaon Metro',
  'Shyamoli',
  'Kalyanpur',
  'Farmgate',
  'Mohakhali',
  'Uttara (House Building)',
  'Abdullahpur',
  'ECB Chattar',
  'Kuril 300ft',
  'Mirpur DOHS',
  'Gabtoli',
  'Dhanmondi 27',
];

const PRESET_TO_TIMES = ['07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '11:00'];
const PRESET_FROM_TIMES = ['12:30', '13:30', '14:30', '15:00', '16:00', '16:30', '17:15', '18:00'];

interface StopItem {
  id: string;
  name: string;
  legMins: number;
}

interface BusRouteEditorModalProps {
  visible: boolean;
  route: BusRoute | null;
  onClose: () => void;
  onSaveSuccess: (savedRoute: BusRoute) => void;
  onDeleteSuccess?: (deletedRouteId: string) => void;
  currentPdfUrl?: string | null;
  onPdfUrlUpdated?: (newPdfUrl: string) => void;
}

export function BusRouteEditorModal({
  visible,
  route,
  onClose,
  onSaveSuccess,
  onDeleteSuccess,
  currentPdfUrl,
  onPdfUrlUpdated,
}: BusRouteEditorModalProps) {
  const { C } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { lang } = useApp();
  const isBn = lang === 'bn';
  const toast = useToast();

  const isNew = !route?.id;

  // Form State
  const [name, setName] = useState('');
  const [area, setArea] = useState('');
  const [busNo, setBusNo] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [helperName, setHelperName] = useState('');
  const [helperPhone, setHelperPhone] = useState('');
  const [days, setDays] = useState<string[]>(['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu']);
  const [fridayNote, setFridayNote] = useState('');

  // Structured Stops State
  const [stopsList, setStopsList] = useState<StopItem[]>([]);
  const [newStopInput, setNewStopInput] = useState('');
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkStopsInput, setBulkStopsInput] = useState('');

  // Departure Times State
  const [toDepartures, setToDepartures] = useState<string[]>([]);
  const [fromDepartures, setFromDepartures] = useState<string[]>([]);
  const [customToTime, setCustomToTime] = useState('');
  const [customFromTime, setCustomFromTime] = useState('');

  // PDF Schedule Link
  const [pdfUrl, setPdfUrl] = useState('');

  // Processing state
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Initialize or reset form when route changes or opens
  useEffect(() => {
    if (!visible) return;

    if (route) {
      setName(route.name ?? '');
      setArea(route.area ?? '');
      setBusNo(route.bus_no ?? '');
      setIsActive(route.active !== false);
      setHelperName(route.helper_name ?? '');
      setHelperPhone(route.helper_phone ?? '');
      setDays(route.days && route.days.length > 0 ? route.days : ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu']);
      setFridayNote(route.friday_note ?? '');

      const existingStops = route.stops ?? [];
      const existingLegs = route.leg_mins ?? [];
      const parsedStops: StopItem[] = existingStops.map((st, i) => ({
        id: `stop-${i}-${Date.now().toString(36)}`,
        name: st,
        legMins: existingLegs[i] ?? 10,
      }));
      setStopsList(parsedStops);
      setBulkStopsInput(existingStops.join(', '));

      setToDepartures([...(route.to_departures ?? [])].sort((a, b) => toMinutes(a) - toMinutes(b)));
      setFromDepartures([...(route.from_departures ?? [])].sort((a, b) => toMinutes(a) - toMinutes(b)));
    } else {
      // Create defaults
      setName('');
      setArea('');
      setBusNo('');
      setIsActive(true);
      setHelperName('');
      setHelperPhone('');
      setDays(['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu']);
      setFridayNote('');
      setStopsList([
        { id: 'stop-init-0', name: 'BUBT Main Campus (Rupnagar)', legMins: 0 },
        { id: 'stop-init-1', name: 'Pallabi Metro Station', legMins: 10 },
      ]);
      setBulkStopsInput('BUBT Main Campus (Rupnagar), Pallabi Metro Station');
      setToDepartures(['07:30', '08:30']);
      setFromDepartures(['13:30', '17:15']);
    }

    setPdfUrl(currentPdfUrl ?? '');
    setBulkMode(false);
    setCustomToTime('');
    setCustomFromTime('');
    setNewStopInput('');
  }, [visible, route, currentPdfUrl]);

  // Stops handlers
  const handleAddStop = useCallback((stopName: string) => {
    const trimmed = stopName.trim();
    if (!trimmed) return;
    setStopsList((prev) => [
      ...prev,
      {
        id: `stop-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        name: trimmed,
        legMins: 10,
      },
    ]);
    setNewStopInput('');
  }, []);

  const handleRemoveStop = useCallback((index: number) => {
    setStopsList((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleUpdateStopName = useCallback((index: number, text: string) => {
    setStopsList((prev) =>
      prev.map((s, i) => (i === index ? { ...s, name: text } : s))
    );
  }, []);

  const handleUpdateLegMins = useCallback((index: number, delta: number) => {
    setStopsList((prev) =>
      prev.map((s, i) => {
        if (i !== index) return s;
        const next = Math.max(0, Math.min(120, s.legMins + delta));
        return { ...s, legMins: next };
      })
    );
  }, []);

  const handleMoveStop = useCallback((index: number, direction: 'up' | 'down') => {
    setStopsList((prev) => {
      const next = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
  }, []);

  const handleApplyBulkStops = useCallback(() => {
    const parsed = bulkStopsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (parsed.length === 0) return;
    setStopsList(
      parsed.map((st, i) => ({
        id: `bulk-stop-${i}-${Date.now().toString(36)}`,
        name: st,
        legMins: i === 0 ? 0 : 10,
      }))
    );
    setBulkMode(false);
    toast({
      type: 'success',
      title: isBn ? 'স্টপ যোগ সম্পন্ন' : 'Stops Applied',
      message: `${parsed.length} ${isBn ? 'টি স্টপ সফলভাবে যোগ হয়েছে।' : 'stops imported into schedule.'}`,
    });
  }, [bulkStopsInput, isBn, toast]);

  // Departures handlers
  const handleAddDeparture = useCallback(
    (timeStr: string, type: 'to' | 'from') => {
      // Validate HH:MM
      const clean = timeStr.trim();
      if (!/^\d{1,2}:\d{2}$/.test(clean)) {
        toast({
          type: 'error',
          title: isBn ? 'ভুল ফরম্যাট' : 'Invalid Format',
          message: isBn ? 'অনুগ্রহ করে HH:MM ফরম্যাট লিখুন (যেমন: 07:30)' : 'Please use HH:MM format (e.g. 07:30)',
        });
        return;
      }
      const [h, m] = clean.split(':').map(Number);
      if (h < 0 || h > 23 || m < 0 || m > 59) {
        toast({
          type: 'error',
          title: isBn ? 'ভুল সময়' : 'Invalid Time',
          message: isBn ? 'সময় ০:০০ থেকে ২৩:৫৯ হতে হবে।' : 'Time must be between 00:00 and 23:59',
        });
        return;
      }
      const formatted = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

      if (type === 'to') {
        if (toDepartures.includes(formatted)) return;
        const next = [...toDepartures, formatted].sort((a, b) => toMinutes(a) - toMinutes(b));
        setToDepartures(next);
        setCustomToTime('');
      } else {
        if (fromDepartures.includes(formatted)) return;
        const next = [...fromDepartures, formatted].sort((a, b) => toMinutes(a) - toMinutes(b));
        setFromDepartures(next);
        setCustomFromTime('');
      }
    },
    [toDepartures, fromDepartures, isBn, toast]
  );

  const handleRemoveDeparture = useCallback((timeStr: string, type: 'to' | 'from') => {
    if (type === 'to') {
      setToDepartures((prev) => prev.filter((t) => t !== timeStr));
    } else {
      setFromDepartures((prev) => prev.filter((t) => t !== timeStr));
    }
  }, []);

  // Operating days toggle
  const toggleDay = useCallback((day: string) => {
    setDays((prev) => {
      if (prev.includes(day)) {
        if (prev.length === 1) return prev; // Keep at least one day
        return prev.filter((d) => d !== day);
      }
      return [...prev, day];
    });
  }, []);

  const setDaysPreset = useCallback((preset: 'sat_thu' | 'all' | 'fri_only') => {
    if (preset === 'sat_thu') {
      setDays(['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu']);
    } else if (preset === 'all') {
      setDays(['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
    } else if (preset === 'fri_only') {
      setDays(['Fri']);
    }
  }, []);

  // Save Route
  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast({
        type: 'error',
        title: isBn ? 'নাম প্রয়োজন' : 'Name Required',
        message: isBn ? 'অনুগ্রহ করে রুটের একটি নাম লিখুন।' : 'Please enter a name for the route.',
      });
      return;
    }

    setSaving(true);
    try {
      const stopsArray = stopsList.map((s) => s.name.trim()).filter(Boolean);
      const legMinsArray = stopsList.map((s) => s.legMins);

      const payload = {
        name: trimmedName,
        area: area.trim() || 'Dhaka Metropolitan',
        bus_no: busNo.trim() || null,
        helper_name: helperName.trim() || null,
        helper_phone: helperPhone.trim() || null,
        stops: stopsArray,
        leg_mins: legMinsArray,
        to_departures: toDepartures,
        from_departures: fromDepartures,
        days: days,
        friday_note: fridayNote.trim() || null,
        active: isActive,
        updated_at: new Date().toISOString(),
      };

      let savedRecord: BusRoute | null = null;

      if (route?.id) {
        // Update
        const { data, error } = await supabase
          .from('bus_routes')
          .update(payload)
          .eq('id', route.id)
          .select()
          .single();

        if (error) throw error;
        savedRecord = data as BusRoute;
      } else {
        // Insert
        const slug = trimmedName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 36);
        const generatedId = slug ? `${slug}-${Date.now().toString(36).slice(-4)}` : `route-${Date.now().toString(36)}`;

        const { data, error } = await supabase
          .from('bus_routes')
          .insert({
            id: generatedId,
            ...payload,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;
        savedRecord = data as BusRoute;
      }

      // Update cache
      const cached = (await getCache<BusRoute[]>(CacheKeys.BUS_ROUTES)) ?? [];
      const updatedCache = route?.id
        ? cached.map((r) => (r.id === route.id ? (savedRecord as BusRoute) : r))
        : [...cached, savedRecord as BusRoute];
      await setCache(CacheKeys.BUS_ROUTES, updatedCache);

      // Save PDF if changed
      if (pdfUrl.trim() && pdfUrl.trim() !== currentPdfUrl) {
        await supabase
          .from('app_config')
          .upsert({ key: 'latest_bus_schedule_url', value: pdfUrl.trim() });
        await setCache(CacheKeys.BUS_SCHEDULE_PDF_URL, pdfUrl.trim());
        onPdfUrlUpdated?.(pdfUrl.trim());
      }

      toast({
        type: 'success',
        title: isBn ? 'সংরক্ষিত হয়েছে' : 'Route Saved',
        message: `${trimmedName} ${isBn ? 'সফলভাবে সংরক্ষিত হয়েছে।' : 'schedule has been updated.'}`,
      });

      onSaveSuccess(savedRecord as BusRoute);
      onClose();
    } catch (err: any) {
      toast({
        type: 'error',
        title: isBn ? 'ব্যর্থ হয়েছে' : 'Save Failed',
        message: err.message || (isBn ? 'সংরক্ষণ করার সময় ত্রুটি হয়েছে।' : 'An error occurred while saving.'),
      });
    } finally {
      setSaving(false);
    }
  };

  // Delete Route
  const handleDelete = () => {
    if (!route?.id) return;
    Alert.alert(
      t.bus2.deleteRoute,
      t.bus2.deleteConfirm,
      [
        { text: isBn ? 'বাতিল' : 'Cancel', style: 'cancel' },
        {
          text: isBn ? 'মুছে ফেলুন' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              const { error } = await supabase.from('bus_routes').delete().eq('id', route.id);
              if (error) throw error;

              const cached = (await getCache<BusRoute[]>(CacheKeys.BUS_ROUTES)) ?? [];
              const updatedCache = cached.filter((r) => r.id !== route.id);
              await setCache(CacheKeys.BUS_ROUTES, updatedCache);

              toast({
                type: 'success',
                title: isBn ? 'মুছে ফেলা হয়েছে' : 'Route Deleted',
                message: `${route.name} ${isBn ? 'রুটটি মুছে ফেলা হয়েছে।' : 'has been removed.'}`,
              });

              onDeleteSuccess?.(route.id);
              onClose();
            } catch (err: any) {
              toast({
                type: 'error',
                title: isBn ? 'মুছতে ব্যর্থ' : 'Delete Failed',
                message: err.message,
              });
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <SubBar
          title={isNew ? t.bus2.addRoute : t.bus2.editRoute}
          onBack={onClose}
          rightSlot={
            !isNew ? (
              <TouchableOpacity
                onPress={handleDelete}
                hitSlop={8}
                style={styles.headerTrashBtn}
                activeOpacity={0.7}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color={C.danger} />
                ) : (
                  <Feather name="trash-2" size={19} color={C.danger} />
                )}
              </TouchableOpacity>
            ) : null
          }
        />

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={[
              styles.scroll,
              { paddingHorizontal: Layout.screenPadding, paddingBottom: Math.max(insets.bottom + 80, 100) },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Section 1: Route Status & Basic Details */}
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionEyebrow, { color: C.text3, fontFamily: FontFamily.jakartaBold }]}>
                {t.bus2.basicInfoSection}
              </Text>
            </View>

            {/* 52dp Active Toggle Bar */}
            <TouchableOpacity
              style={[
                styles.bar52,
                styles.statusToggleBar,
                {
                  backgroundColor: C.surface,
                  borderColor: isActive ? (C.brand + '80') : C.border,
                },
              ]}
              onPress={() => setIsActive((prev) => !prev)}
              activeOpacity={0.8}
            >
              <View style={styles.statusLeft}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: isActive ? C.success : C.warn },
                  ]}
                />
                <View>
                  <Text style={[styles.statusTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    {isActive ? t.bus2.statusActive : t.bus2.statusSuspended}
                  </Text>
                  <Text style={[styles.statusSub, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                    {isActive
                      ? (isBn ? 'শিক্ষার্থীরা রুটটি দেখতে ও ব্যবহার করতে পারবে' : 'Visible to students and operating on schedule')
                      : (isBn ? 'সাময়িকভাবে বন্ধ ও তালিকায় লুকানো থাকবে' : 'Temporarily halted and hidden from students')}
                  </Text>
                </View>
              </View>
              <Feather
                name={isActive ? 'check-circle' : 'slash'}
                size={20}
                color={isActive ? C.success : C.warn}
              />
            </TouchableOpacity>

            {/* Field: Route Name */}
            <Text style={[styles.fieldLabel, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>
              {t.bus2.fieldName}
            </Text>
            <View style={[styles.inputBox52, { backgroundColor: C.surface, borderColor: C.border }]}>
              <Feather name="navigation" size={18} color={C.textMuted} style={styles.inputLeadingIcon} />
              <TextInput
                style={[styles.textInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                placeholder={isBn ? 'যেমন: রুট ১ (মিরপুর - উত্তরা)' : 'e.g. Route 1 (Mirpur to Uttara)'}
                placeholderTextColor={C.textMuted}
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Field: Service Area */}
            <Text style={[styles.fieldLabel, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>
              {t.bus2.fieldArea}
            </Text>
            <View style={[styles.inputBox52, { backgroundColor: C.surface, borderColor: C.border }]}>
              <Feather name="map" size={18} color={C.textMuted} style={styles.inputLeadingIcon} />
              <TextInput
                style={[styles.textInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                placeholder={isBn ? 'যেমন: মিরপুর / পল্লবী / উত্তরা' : 'e.g. Mirpur / Pallabi / Uttara'}
                placeholderTextColor={C.textMuted}
                value={area}
                onChangeText={setArea}
              />
            </View>

            {/* Field: Bus Plate / Number */}
            <Text style={[styles.fieldLabel, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>
              {t.bus2.fieldBusNo}
            </Text>
            <View style={[styles.inputBox52, { backgroundColor: C.surface, borderColor: C.border }]}>
              <Feather name="truck" size={18} color={C.textMuted} style={styles.inputLeadingIcon} />
              <TextInput
                style={[styles.textInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                placeholder={isBn ? 'যেমন: BUBT-01 বা ঢাকা মেট্রো চ ১১-৪৫৫৫' : 'e.g. BUBT-01 or Cha 11-4455'}
                placeholderTextColor={C.textMuted}
                value={busNo}
                onChangeText={setBusNo}
              />
            </View>

            {/* Section 2: Driver & Helper Info */}
            <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
              <Text style={[styles.sectionEyebrow, { color: C.text3, fontFamily: FontFamily.jakartaBold }]}>
                {t.bus2.contactsSection}
              </Text>
            </View>

            <View style={[styles.inputBox52, { backgroundColor: C.surface, borderColor: C.border }]}>
              <Feather name="user" size={18} color={C.textMuted} style={styles.inputLeadingIcon} />
              <TextInput
                style={[styles.textInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                placeholder={t.bus2.fieldHelperName}
                placeholderTextColor={C.textMuted}
                value={helperName}
                onChangeText={setHelperName}
              />
            </View>

            <View style={[styles.inputBox52, { backgroundColor: C.surface, borderColor: C.border, marginTop: 10 }]}>
              <Feather name="phone" size={18} color={C.textMuted} style={styles.inputLeadingIcon} />
              <TextInput
                style={[styles.textInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                placeholder={t.bus2.fieldHelperPhone}
                placeholderTextColor={C.textMuted}
                value={helperPhone}
                onChangeText={setHelperPhone}
                keyboardType="phone-pad"
              />
              {helperPhone.trim().length > 0 && (
                <TouchableOpacity
                  style={[styles.quickCallPill, { backgroundColor: C.surface2 }]}
                  onPress={() => Linking.openURL(`tel:${helperPhone.trim()}`)}
                  activeOpacity={0.7}
                >
                  <Feather name="phone-call" size={13} color={C.brand} />
                  <Text style={[styles.quickCallTxt, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
                    {isBn ? 'টেস্ট কল' : 'Call'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Section 3: Operating Days & Holiday Notice */}
            <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
              <Text style={[styles.sectionEyebrow, { color: C.text3, fontFamily: FontFamily.jakartaBold }]}>
                {t.bus2.operatingDaysSection}
              </Text>
            </View>

            {/* Preset days shortcut row */}
            <View style={styles.daysPresetRow}>
              <TouchableOpacity
                style={[
                  styles.presetChip,
                  {
                    backgroundColor: days.length === 6 && !days.includes('Fri') ? `${C.brand}20` : C.surface,
                    borderColor: days.length === 6 && !days.includes('Fri') ? C.brand : C.border,
                  },
                ]}
                onPress={() => setDaysPreset('sat_thu')}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.presetChipTxt,
                    {
                      color: days.length === 6 && !days.includes('Fri') ? C.brand : C.textMuted,
                      fontFamily: FontFamily.jakartaBold,
                    },
                  ]}
                >
                  {t.bus2.regularDays}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.presetChip,
                  {
                    backgroundColor: days.length === 7 ? `${C.brand}20` : C.surface,
                    borderColor: days.length === 7 ? C.brand : C.border,
                  },
                ]}
                onPress={() => setDaysPreset('all')}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.presetChipTxt,
                    {
                      color: days.length === 7 ? C.brand : C.textMuted,
                      fontFamily: FontFamily.jakartaBold,
                    },
                  ]}
                >
                  {t.bus2.allDays}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Individual day chips */}
            <View style={styles.daysChipsRow}>
              {DAY_OPTIONS.map((d) => {
                const selected = days.includes(d);
                return (
                  <TouchableOpacity
                    key={d}
                    style={[
                      styles.dayChip,
                      {
                        backgroundColor: selected ? BUS_COLOR : C.surface,
                        borderColor: selected ? BUS_COLOR : C.border,
                      },
                    ]}
                    onPress={() => toggleDay(d)}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.dayChipTxt,
                        {
                          color: selected ? '#fff' : C.textMuted,
                          fontFamily: FontFamily.jakartaBold,
                        },
                      ]}
                    >
                      {d}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Holiday / Friday notice */}
            <Text style={[styles.fieldLabel, { color: C.text2, fontFamily: FontFamily.jakartaBold, marginTop: 14 }]}>
              {t.bus2.fridayNoticeSection}
            </Text>
            <View style={[styles.inputBox52, { backgroundColor: C.surface, borderColor: C.border }]}>
              <Feather name="info" size={18} color={C.textMuted} style={styles.inputLeadingIcon} />
              <TextInput
                style={[styles.textInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                placeholder={isBn ? 'যেমন: শুক্রবার স্পেশাল পরীক্ষার বাস চলবে' : 'e.g. Special shuttle runs on exam Fridays'}
                placeholderTextColor={C.textMuted}
                value={fridayNote}
                onChangeText={setFridayNote}
              />
            </View>

            {/* Section 4: Stops & Intermediate Travel Times */}
            <View style={[styles.sectionHeaderRow, { marginTop: 24, justifyContent: 'space-between' }]}>
              <Text style={[styles.sectionEyebrow, { color: C.text3, fontFamily: FontFamily.jakartaBold }]}>
                {t.bus2.stopsSection} ({stopsList.length})
              </Text>
              <TouchableOpacity
                onPress={() => setBulkMode((prev) => !prev)}
                hitSlop={8}
                activeOpacity={0.7}
              >
                <Text style={[styles.modeToggleTxt, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
                  {bulkMode ? (isBn ? 'তালিকা ভিউ' : 'List View') : t.bus2.bulkStopsMode}
                </Text>
              </TouchableOpacity>
            </View>

            {bulkMode ? (
              /* Bulk Paste Mode */
              <View style={[styles.bulkBox, { backgroundColor: C.surface, borderColor: C.border }]}>
                <Text style={[styles.bulkHint, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                  {t.bus2.bulkStopsPlaceholder}
                </Text>
                <TextInput
                  style={[
                    styles.bulkInput,
                    {
                      color: C.text,
                      backgroundColor: C.bg,
                      borderColor: C.border,
                      fontFamily: FontFamily.jakartaMedium,
                    },
                  ]}
                  value={bulkStopsInput}
                  onChangeText={setBulkStopsInput}
                  multiline
                  numberOfLines={4}
                  placeholderTextColor={C.textMuted}
                  placeholder="BUBT Campus, Pallabi, Mirpur 10..."
                />
                <TouchableOpacity
                  style={[styles.bar52, styles.applyBulkBtn, { backgroundColor: C.brand }]}
                  onPress={handleApplyBulkStops}
                  activeOpacity={0.8}
                >
                  <Feather name="check" size={18} color="#fff" />
                  <Text style={[styles.applyBulkTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
                    {t.bus2.applyBulkStops}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* Structured Stops List */
              <View style={styles.stopsBlock}>
                {/* Add new stop bar */}
                <View style={[styles.inputBox52, styles.addStopBar, { backgroundColor: C.surface, borderColor: C.border }]}>
                  <Feather name="map-pin" size={18} color={C.textMuted} style={styles.inputLeadingIcon} />
                  <TextInput
                    style={[styles.textInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                    placeholder={t.bus2.addStopPlaceholder}
                    placeholderTextColor={C.textMuted}
                    value={newStopInput}
                    onChangeText={setNewStopInput}
                    onSubmitEditing={() => handleAddStop(newStopInput)}
                  />
                  <TouchableOpacity
                    style={[styles.addStopBtn, { backgroundColor: newStopInput.trim() ? BUS_COLOR : C.surface2 }]}
                    onPress={() => handleAddStop(newStopInput)}
                    disabled={!newStopInput.trim()}
                    activeOpacity={0.8}
                  >
                    <Feather name="plus" size={18} color={newStopInput.trim() ? '#fff' : C.textMuted} />
                  </TouchableOpacity>
                </View>

                {/* Popular stop quick suggestion pills */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.popularRow}>
                  {POPULAR_STOPS.map((st) => (
                    <TouchableOpacity
                      key={st}
                      style={[styles.suggestPill, { backgroundColor: C.surface, borderColor: C.border }]}
                      onPress={() => handleAddStop(st)}
                      activeOpacity={0.7}
                    >
                      <Feather name="plus" size={11} color={C.textMuted} />
                      <Text style={[styles.suggestPillTxt, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}>
                        {st}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Ordered list of stops */}
                {stopsList.map((stop, index) => {
                  const isFirst = index === 0;
                  const isLast = index === stopsList.length - 1;

                  return (
                    <View
                      key={stop.id}
                      style={[
                        styles.stopItemCard,
                        {
                          backgroundColor: C.surface,
                          borderColor: C.border,
                        },
                      ]}
                    >
                      {/* Step index badge */}
                      <View style={[styles.stopIndexBadge, { backgroundColor: C.surface2 }]}>
                        <Text style={[styles.stopIndexTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                          #{index + 1}
                        </Text>
                      </View>

                      {/* Stop name input */}
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <TextInput
                          style={[styles.stopNameInput, { color: C.text, fontFamily: FontFamily.jakartaBold }]}
                          value={stop.name}
                          onChangeText={(txt) => handleUpdateStopName(index, txt)}
                          placeholder="Stop name"
                          placeholderTextColor={C.textMuted}
                        />
                        {/* Leg duration adjuster */}
                        <View style={styles.legRow}>
                          <Text style={[styles.legLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                            {isFirst ? (isBn ? 'শুরুর পয়েন্ট' : 'Origin') : `+${stop.legMins} ${t.bus2.travelMin}`}
                          </Text>
                          {!isFirst && (
                            <View style={styles.legAdjusters}>
                              <TouchableOpacity
                                style={[styles.legBtn, { borderColor: C.border }]}
                                onPress={() => handleUpdateLegMins(index, -5)}
                                hitSlop={6}
                              >
                                <Feather name="minus" size={12} color={C.textMuted} />
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[styles.legBtn, { borderColor: C.border }]}
                                onPress={() => handleUpdateLegMins(index, 5)}
                                hitSlop={6}
                              >
                                <Feather name="plus" size={12} color={C.textMuted} />
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      </View>

                      {/* Reorder and Delete actions */}
                      <View style={styles.stopActions}>
                        <TouchableOpacity
                          style={[styles.actionIconBtn, { opacity: isFirst ? 0.3 : 1 }]}
                          onPress={() => handleMoveStop(index, 'up')}
                          disabled={isFirst}
                          hitSlop={6}
                        >
                          <Feather name="arrow-up" size={15} color={C.textMuted} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionIconBtn, { opacity: isLast ? 0.3 : 1 }]}
                          onPress={() => handleMoveStop(index, 'down')}
                          disabled={isLast}
                          hitSlop={6}
                        >
                          <Feather name="arrow-down" size={15} color={C.textMuted} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionIconBtn}
                          onPress={() => handleRemoveStop(index)}
                          hitSlop={6}
                        >
                          <Feather name="x" size={16} color={C.danger} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Section 5: Departure Timings (To Campus & From Campus) */}
            <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
              <Text style={[styles.sectionEyebrow, { color: C.text3, fontFamily: FontFamily.jakartaBold }]}>
                {t.bus2.departuresSection}
              </Text>
            </View>

            {/* 5.1 To Campus Departures */}
            <View style={[styles.depContainer, { backgroundColor: C.surface, borderColor: C.border }]}>
              <View style={styles.depHeader}>
                <View style={styles.depTitleRow}>
                  <Feather name="arrow-right" size={16} color={BUS_COLOR} />
                  <Text style={[styles.depBlockTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    {t.bus2.toCampus} ({toDepartures.length})
                  </Text>
                </View>
                <Text style={[styles.depSub, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                  {isBn ? 'সকাল ও দুপুরের ক্যাম্পাসগামী বাস' : 'Morning & midday shuttles to campus'}
                </Text>
              </View>

              {/* Time Chips */}
              <View style={styles.timePillsWrap}>
                {toDepartures.map((time) => (
                  <View key={time} style={[styles.timeChip, { backgroundColor: `${BUS_COLOR}1c`, borderColor: BUS_COLOR }]}>
                    <Text style={[styles.timeChipTxt, { color: BUS_COLOR, fontFamily: FontFamily.jakartaBold }]}>
                      {formatTime12(time)}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleRemoveDeparture(time, 'to')}
                      hitSlop={6}
                      style={{ padding: 2 }}
                    >
                      <Feather name="x" size={13} color={BUS_COLOR} />
                    </TouchableOpacity>
                  </View>
                ))}
                {toDepartures.length === 0 && (
                  <Text style={[styles.noTimesTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                    {isBn ? 'কোনো সময় যোগ করা হয়নি' : 'No times configured'}
                  </Text>
                )}
              </View>

              {/* Quick Add Presets */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timePresetsRow}>
                {PRESET_TO_TIMES.map((preset) => (
                  <TouchableOpacity
                    key={preset}
                    style={[
                      styles.timePresetBtn,
                      {
                        backgroundColor: toDepartures.includes(preset) ? `${BUS_COLOR}24` : C.bg,
                        borderColor: toDepartures.includes(preset) ? BUS_COLOR : C.border,
                      },
                    ]}
                    onPress={() => handleAddDeparture(preset, 'to')}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.timePresetTxt,
                        {
                          color: toDepartures.includes(preset) ? BUS_COLOR : C.text,
                          fontFamily: FontFamily.jakartaBold,
                        },
                      ]}
                    >
                      +{preset}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Custom Time Input */}
              <View style={[styles.customTimeRow, { borderColor: C.border }]}>
                <TextInput
                  style={[styles.customTimeInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                  placeholder={t.bus2.customTimePlaceholder}
                  placeholderTextColor={C.textMuted}
                  value={customToTime}
                  onChangeText={setCustomToTime}
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                />
                <TouchableOpacity
                  style={[styles.customTimeBtn, { backgroundColor: BUS_COLOR }]}
                  onPress={() => handleAddDeparture(customToTime, 'to')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.customTimeBtnTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
                    {t.bus2.addTimeBtn}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 5.2 From Campus Departures */}
            <View style={[styles.depContainer, { backgroundColor: C.surface, borderColor: C.border, marginTop: 14 }]}>
              <View style={styles.depHeader}>
                <View style={styles.depTitleRow}>
                  <Feather name="arrow-left" size={16} color={C.brand} />
                  <Text style={[styles.depBlockTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    {t.bus2.fromCampus} ({fromDepartures.length})
                  </Text>
                </View>
                <Text style={[styles.depSub, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                  {isBn ? 'দুপুর ও সন্ধ্যার ফিরতি বাস' : 'Afternoon & evening return shuttles'}
                </Text>
              </View>

              {/* Time Chips */}
              <View style={styles.timePillsWrap}>
                {fromDepartures.map((time) => (
                  <View key={time} style={[styles.timeChip, { backgroundColor: `${C.brand}1c`, borderColor: C.brand }]}>
                    <Text style={[styles.timeChipTxt, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
                      {formatTime12(time)}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleRemoveDeparture(time, 'from')}
                      hitSlop={6}
                      style={{ padding: 2 }}
                    >
                      <Feather name="x" size={13} color={C.brand} />
                    </TouchableOpacity>
                  </View>
                ))}
                {fromDepartures.length === 0 && (
                  <Text style={[styles.noTimesTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                    {isBn ? 'কোনো সময় যোগ করা হয়নি' : 'No times configured'}
                  </Text>
                )}
              </View>

              {/* Quick Add Presets */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timePresetsRow}>
                {PRESET_FROM_TIMES.map((preset) => (
                  <TouchableOpacity
                    key={preset}
                    style={[
                      styles.timePresetBtn,
                      {
                        backgroundColor: fromDepartures.includes(preset) ? `${C.brand}24` : C.bg,
                        borderColor: fromDepartures.includes(preset) ? C.brand : C.border,
                      },
                    ]}
                    onPress={() => handleAddDeparture(preset, 'from')}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.timePresetTxt,
                        {
                          color: fromDepartures.includes(preset) ? C.brand : C.text,
                          fontFamily: FontFamily.jakartaBold,
                        },
                      ]}
                    >
                      +{preset}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Custom Time Input */}
              <View style={[styles.customTimeRow, { borderColor: C.border }]}>
                <TextInput
                  style={[styles.customTimeInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                  placeholder={t.bus2.customTimePlaceholder}
                  placeholderTextColor={C.textMuted}
                  value={customFromTime}
                  onChangeText={setCustomFromTime}
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                />
                <TouchableOpacity
                  style={[styles.customTimeBtn, { backgroundColor: C.brand }]}
                  onPress={() => handleAddDeparture(customFromTime, 'from')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.customTimeBtnTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
                    {t.bus2.addTimeBtn}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Section 6: Official PDF Circular URL */}
            <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
              <Text style={[styles.sectionEyebrow, { color: C.text3, fontFamily: FontFamily.jakartaBold }]}>
                {t.bus2.pdfSection}
              </Text>
            </View>
            <View style={[styles.inputBox52, { backgroundColor: C.surface, borderColor: C.border }]}>
              <Feather name="file-text" size={18} color={C.textMuted} style={styles.inputLeadingIcon} />
              <TextInput
                style={[styles.textInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                placeholder={t.bus2.pdfUrlPlaceholder}
                placeholderTextColor={C.textMuted}
                value={pdfUrl}
                onChangeText={setPdfUrl}
                autoCapitalize="none"
              />
              {pdfUrl.trim().length > 0 && (
                <TouchableOpacity
                  style={[styles.quickCallPill, { backgroundColor: C.surface2 }]}
                  onPress={() => Linking.openURL(pdfUrl.trim())}
                  activeOpacity={0.7}
                >
                  <Feather name="external-link" size={13} color={C.brand} />
                  <Text style={[styles.quickCallTxt, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
                    View
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={{ height: 32 }} />
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Floating Bottom CTA Dock */}
        <View
          style={[
            styles.bottomDock,
            {
              backgroundColor: C.surface,
              borderTopColor: C.border,
              paddingBottom: Math.max(insets.bottom + 12, 16),
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.bar52,
              styles.submitBtn,
              {
                backgroundColor: BUS_COLOR,
                opacity: name.trim() && !saving ? 1 : 0.5,
              },
            ]}
            onPress={handleSave}
            disabled={!name.trim() || saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Feather name="check" size={20} color="#fff" />
                <Text style={[styles.submitBtnTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
                  {t.bus2.saveRoute}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  scroll: { paddingTop: 10 } as ViewStyle,

  headerTrashBtn: {
    padding: 6,
    borderRadius: 8,
  } as ViewStyle,

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  } as ViewStyle,
  sectionEyebrow: {
    fontSize: 11.5,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  } as TextStyle,
  modeToggleTxt: {
    fontSize: 12.5,
  } as TextStyle,

  bar52: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  } as ViewStyle,

  statusToggleBar: {
    justifyContent: 'space-between',
    marginBottom: 14,
  } as ViewStyle,
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  } as ViewStyle,
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  } as ViewStyle,
  statusTitle: {
    fontSize: 14,
  } as TextStyle,
  statusSub: {
    fontSize: 11,
    marginTop: 1,
  } as TextStyle,

  fieldLabel: {
    fontSize: 11.5,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 10,
  } as TextStyle,

  inputBox52: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  } as ViewStyle,
  inputLeadingIcon: {
    width: 22,
  } as ViewStyle,
  textInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
  } as TextStyle,

  quickCallPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  } as ViewStyle,
  quickCallTxt: {
    fontSize: 11.5,
  } as TextStyle,

  daysPresetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  } as ViewStyle,
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  } as ViewStyle,
  presetChipTxt: {
    fontSize: 11.5,
  } as TextStyle,

  daysChipsRow: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'space-between',
  } as ViewStyle,
  dayChip: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  dayChipTxt: {
    fontSize: 12,
  } as TextStyle,

  stopsBlock: {
    gap: 8,
  } as ViewStyle,
  addStopBar: {
    paddingRight: 6,
  } as ViewStyle,
  addStopBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  popularRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 4,
  } as ViewStyle,
  suggestPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  } as ViewStyle,
  suggestPillTxt: {
    fontSize: 12,
  } as TextStyle,

  stopItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
  } as ViewStyle,
  stopIndexBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  stopIndexTxt: {
    fontSize: 11.5,
  } as TextStyle,
  stopNameInput: {
    fontSize: 14,
    padding: 0,
    marginBottom: 2,
  } as TextStyle,
  legRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  } as ViewStyle,
  legLabel: {
    fontSize: 11,
  } as TextStyle,
  legAdjusters: {
    flexDirection: 'row',
    gap: 4,
  } as ViewStyle,
  legBtn: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  stopActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  } as ViewStyle,
  actionIconBtn: {
    padding: 6,
  } as ViewStyle,

  bulkBox: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  } as ViewStyle,
  bulkHint: {
    fontSize: 12,
    lineHeight: 17,
  } as TextStyle,
  bulkInput: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    fontSize: 13.5,
    minHeight: 90,
    textAlignVertical: 'top',
  } as TextStyle,
  applyBulkBtn: {
    justifyContent: 'center',
    gap: 8,
  } as ViewStyle,
  applyBulkTxt: {
    fontSize: 14,
  } as TextStyle,

  depContainer: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  } as ViewStyle,
  depHeader: {
    gap: 2,
  } as ViewStyle,
  depTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  } as ViewStyle,
  depBlockTitle: {
    fontSize: 14,
  } as TextStyle,
  depSub: {
    fontSize: 11.5,
  } as TextStyle,

  timePillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  } as ViewStyle,
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
  } as ViewStyle,
  timeChipTxt: {
    fontSize: 12,
  } as TextStyle,
  noTimesTxt: {
    fontSize: 12,
    fontStyle: 'italic',
    paddingVertical: 4,
  } as TextStyle,

  timePresetsRow: {
    flexDirection: 'row',
    gap: 6,
  } as ViewStyle,
  timePresetBtn: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  } as ViewStyle,
  timePresetTxt: {
    fontSize: 11.5,
  } as TextStyle,

  customTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    paddingTop: 10,
  } as ViewStyle,
  customTimeInput: {
    flex: 1,
    height: 40,
    fontSize: 13,
  } as TextStyle,
  customTimeBtn: {
    paddingHorizontal: 14,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  customTimeBtnTxt: {
    fontSize: 12.5,
  } as TextStyle,

  bottomDock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingHorizontal: Layout.screenPadding,
    paddingTop: 12,
  } as ViewStyle,
  submitBtn: {
    justifyContent: 'center',
    gap: 8,
  } as ViewStyle,
  submitBtnTxt: {
    fontSize: 15,
  } as TextStyle,
});

