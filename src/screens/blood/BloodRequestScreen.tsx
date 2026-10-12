import { useState, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView,
  StyleSheet, KeyboardAvoidingView, Animated, Modal,
  Dimensions, type ViewStyle, type TextStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { SegmentedTabs, type TabItem } from '../../components/ui/SegmentedTabs';
import { FontFamily, Layout, SectorColors } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/ui/Toast';
import { removeCache, CacheKeys } from '../../services/cacheService';
import { AreaPickerModal } from '../../components/blood/AreaPickerModal';
import { DHAKA_AREAS } from '../../constants/dhakaAreas';
import type { BloodRequest } from '../../types/database';

const GROUPS: BloodRequest['blood_group'][] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const URGENCIES: { id: BloodRequest['urgency']; label: string }[] = [
  { id: 'Urgent',    label: 'Urgent' },
  { id: 'Today',     label: 'Today' },
  { id: 'This week', label: 'This week' },
];

interface MedicalReasonOption {
  id: string;
  label: string;
  labelBn: string;
  icon: string;
}

const MEDICAL_REASONS: MedicalReasonOption[] = [
  { id: 'Emergency Surgery',      label: 'Emergency Surgery',      labelBn: 'জরুরি সার্জারি',     icon: 'activity' },
  { id: 'Dengue / Low Platelets', label: 'Dengue / Low Platelets', labelBn: 'ডেঙ্গু / প্লাটিলেট', icon: 'zap' },
  { id: 'Road Accident / Trauma',  label: 'Road Accident / Trauma',  labelBn: 'দুর্ঘটনা / ট্রমা',    icon: 'alert-triangle' },
  { id: 'Childbirth / C-Section', label: 'Childbirth / C-Section', labelBn: 'প্রসব / সিজারিয়ান',  icon: 'heart' },
  { id: 'Thalassemia',           label: 'Thalassemia Regular',    labelBn: 'থ্যালাসেমিয়া রক্তদান', icon: 'droplet' },
  { id: 'ICU Critical Care',     label: 'ICU Critical Care',      labelBn: 'আইসিইউ ক্রিটিক্যাল',   icon: 'shield' },
  { id: 'Routine / Other Case',  label: 'Routine / Other Case',   labelBn: 'অন্যান্য চিকিৎসা',    icon: 'plus-circle' },
];

interface AffiliationOption {
  id: string;
  label: string;
  labelBn: string;
  icon: string;
}

const AFFILIATIONS: AffiliationOption[] = [
  { id: 'BUBT Student',    label: 'BUBT Student',    labelBn: 'বিইউবিটি শিক্ষার্থী', icon: 'book' },
  { id: 'Faculty / Staff', label: 'Faculty / Staff', labelBn: 'শিক্ষক ও কর্মকর্তা', icon: 'award' },
  { id: 'Family Member',   label: 'Family Member',   labelBn: 'পিতা/মাতা/পরিবার',   icon: 'users' },
  { id: 'General Patient', label: 'General Patient', labelBn: 'সাধারণ রোগী',        icon: 'user' },
];

export function BloodRequestScreen({ navigation }: any) {
  const { C, isDark } = useTheme();
  const { user } = useAuth();
  const t = useT();
  const toast = useToast();
  const insets = useSafeAreaInsets();

  const [group, setGroup] = useState<BloodRequest['blood_group'] | null>(null);
  const [units, setUnits] = useState('1');

  // Clean Patient & Clinical Details (No cabin/ward clutter)
  const [patientName, setPatientName] = useState('');
  const [medicalReason, setMedicalReason] = useState<string>('');
  const [affiliation, setAffiliation] = useState('BUBT Student');

  // Dropdown Picker Modal states
  const [reasonModalVisible, setReasonModalVisible] = useState(false);
  const [affModalVisible, setAffModalVisible] = useState(false);

  const [hospital, setHospital] = useState('');
  const [area, setArea] = useState('');
  const [urgency, setUrgency] = useState<BloodRequest['urgency']>('Today');
  const [isPlatelets, setIsPlatelets] = useState(false);
  const [loading, setLoading] = useState(false);

  // Hospital & Area Picker Modal State
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerMode, setPickerMode] = useState<'hospital' | 'area'>('hospital');
  const [customHospitalMode, setCustomHospitalMode] = useState(false);
  const [customAreaMode, setCustomAreaMode] = useState(false);

  const URGENCY_TABS: TabItem<BloodRequest['urgency']>[] = [
    { id: 'Urgent',    label: 'Urgent',    color: C.danger, icon: 'alert-triangle' },
    { id: 'Today',     label: 'Today',     color: C.warn,   icon: 'clock' },
    { id: 'This week', label: 'This week', color: SectorColors.blood, icon: 'calendar' },
  ];

  function handleSelectGroup(g: BloodRequest['blood_group']) {
    setGroup(g);
  }

  function handleSelectReason(item: MedicalReasonOption) {
    setMedicalReason(item.id);
    if (item.id === 'Dengue / Low Platelets') {
      setIsPlatelets(true);
    }
    setReasonModalVisible(false);
  }

  function handleSelectAffiliation(item: AffiliationOption) {
    setAffiliation(item.id);
    setAffModalVisible(false);
  }

  // Hospital & Area Picker Openers
  function openHospitalPicker() {
    setPickerMode('hospital');
    setPickerVisible(true);
  }

  function openAreaPicker() {
    setPickerMode('area');
    setPickerVisible(true);
  }

  function handleSelectLocation(selected: string) {
    if (selected === 'All') return;
    if (pickerMode === 'hospital') {
      setHospital(selected);
      // Auto-prefill area if area is empty and hospital has a known subLocation
      const matched = DHAKA_AREAS.find(a => a.name.toLowerCase() === selected.toLowerCase());
      if (matched?.subLocation && !area) {
        setArea(matched.subLocation);
      }
    } else {
      setArea(selected);
    }
  }

  const canSubmit = group !== null && patientName.trim().length > 0 && hospital.trim().length > 0;

  async function handleSubmit() {
    if (!user) {
      toast({ type: 'info', title: t.blood2.signInRequired, message: t.blood2.signInToRespond });
      return;
    }
    if (!canSubmit) return;
    setLoading(true);
    try {
      // Assemble clean, clinical patient summary
      let fullPatient = patientName.trim();
      if (medicalReason) {
        fullPatient += ` · ${medicalReason}`;
      }
      if (affiliation && affiliation !== 'General Patient') {
        fullPatient += ` (${affiliation})`;
      }

      const finalPatient = isPlatelets ? `[Platelets] ${fullPatient}` : fullPatient;
      const parsedUnits = Math.max(1, Math.min(10, parseInt(units, 10) || 1));

      const { error } = await supabase.from('blood_requests').insert({
        blood_group:  group,
        units:        parsedUnits,
        patient:      finalPatient,
        hospital:     hospital.trim(),
        area:         area.trim() || 'Near campus',
        urgency,
        requester_id: user.id,
      });
      if (error) throw error;
      await Promise.all([
        removeCache(CacheKeys.BLOOD_FEED(user.id)),
        removeCache(CacheKeys.HOME_STATUS(user.id)),
      ]);
      toast({ type: 'success', title: t.blood2.thankYou, message: 'Emergency blood request posted.' });
      navigation.goBack();
    } catch {
      toast({ type: 'error', title: t.common.error, message: t.blood2.postRequestError });
    } finally {
      setLoading(false);
    }
  }

  const currentReasonObj = MEDICAL_REASONS.find(r => r.id === medicalReason);
  const currentAffObj = AFFILIATIONS.find(a => a.id === affiliation);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title={t.blood2.requestBlood} onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* Blood group grid with tactile bounce animation */}
          <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {t.blood2.bloodGroup}
          </Text>
          <View style={styles.groupGrid}>
            {GROUPS.map(g => {
              const on = group === g;
              return (
                <View key={g} style={styles.groupBtnWrapper}>
                  <TouchableOpacity
                    style={[
                      styles.groupBtn,
                      {
                        backgroundColor: on ? SectorColors.blood : C.surface,
                        borderColor: on ? SectorColors.blood : C.border,
                        borderWidth: on ? 1.8 : 1,
                      },
                    ]}
                    onPress={() => handleSelectGroup(g)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.groupTxt,
                        { color: on ? '#fff' : C.text, fontFamily: FontFamily.jakartaExtraBold },
                      ]}
                    >
                      {g}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>

          {/* Units + Urgency with Snappy Sliding Indicator */}
          <View style={styles.row}>
            <View style={[styles.halfField, { flex: 1 }]}>
              <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold, marginTop: 0 }]}>
                {t.blood2.units}
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                value={units}
                onChangeText={t => setUnits(t.replace(/\D/g, ''))}
                keyboardType="numeric"
                placeholderTextColor={C.textMuted}
              />
            </View>
            <View style={[styles.halfField, { flex: 2.1 }]}>
              <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold, marginTop: 0 }]}>
                {t.blood2.urgency}
              </Text>
              <SegmentedTabs<BloodRequest['urgency']>
                size="sm"
                tabs={URGENCY_TABS}
                activeTab={urgency}
                onTabChange={setUrgency}
              />
            </View>
          </View>

          {/* ------------------------------------------------------------- */}
          {/* CLEAN PATIENT & CLINICAL DETAILS (Clean Dropdown Architecture) */}
          {/* ------------------------------------------------------------- */}

          {/* Patient Full Name */}
          <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            PATIENT FULL NAME *
          </Text>
          <View style={[styles.inputWithIcon, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Feather name="user" size={16} color={C.textMuted} />
            <TextInput
              style={[styles.innerInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
              value={patientName}
              onChangeText={setPatientName}
              placeholder="e.g. Sadia Sultana, Md. Karim"
              placeholderTextColor={C.textMuted}
            />
          </View>

          {/* Medical Case Reason Requirement (Clean Dropdown) */}
          <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            CASE REASON / REQUIREMENT
          </Text>
          <TouchableOpacity
            style={[
              styles.dropdownCard,
              {
                backgroundColor: C.surface,
                borderColor: medicalReason ? SectorColors.blood : C.border,
                borderWidth: medicalReason ? 1.5 : 1,
              },
            ]}
            onPress={() => setReasonModalVisible(true)}
            activeOpacity={0.75}
          >
            <View style={[styles.dropdownIconBox, { backgroundColor: `${SectorColors.blood}16` }]}>
              <Feather name={currentReasonObj?.icon ? (currentReasonObj.icon as any) : 'activity'} size={16} color={SectorColors.blood} />
            </View>
            <View style={styles.dropdownInfo}>
              <Text
                style={[
                  styles.dropdownValue,
                  {
                    color: medicalReason ? C.text : C.textMuted,
                    fontFamily: medicalReason ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                  },
                ]}
                numberOfLines={1}
              >
                {currentReasonObj ? `${currentReasonObj.label} (${currentReasonObj.labelBn})` : 'Select case reason (e.g. Surgery, Dengue)...'}
              </Text>
              <Text style={[styles.dropdownHint, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                {medicalReason ? 'Tap to change reason' : 'Helps donors know the emergency context'}
              </Text>
            </View>
            <View style={styles.dropdownRight}>
              {medicalReason ? (
                <TouchableOpacity
                  onPress={(e) => { e.stopPropagation(); setMedicalReason(''); }}
                  style={[styles.clearPill, { backgroundColor: C.surface2 }]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Feather name="x" size={12} color={C.textMuted} />
                </TouchableOpacity>
              ) : (
                <Feather name="chevron-down" size={17} color={C.textMuted} />
              )}
            </View>
          </TouchableOpacity>

          {/* Patient Affiliation (Clean Dropdown) */}
          <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            PATIENT AFFILIATION
          </Text>
          <TouchableOpacity
            style={[
              styles.dropdownCard,
              {
                backgroundColor: C.surface,
                borderColor: C.border,
                borderWidth: 1,
              },
            ]}
            onPress={() => setAffModalVisible(true)}
            activeOpacity={0.75}
          >
            <View style={[styles.dropdownIconBox, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : C.surface2 }]}>
              <Feather name={currentAffObj?.icon ? (currentAffObj.icon as any) : 'users'} size={16} color={SectorColors.blood} />
            </View>
            <View style={styles.dropdownInfo}>
              <Text
                style={[
                  styles.dropdownValue,
                  { color: C.text, fontFamily: FontFamily.jakartaBold },
                ]}
                numberOfLines={1}
              >
                {currentAffObj ? `${currentAffObj.label} (${currentAffObj.labelBn})` : 'BUBT Student'}
              </Text>
              <Text style={[styles.dropdownHint, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                Campus connection or relationship to patient
              </Text>
            </View>
            <Feather name="chevron-down" size={17} color={C.textMuted} style={{ paddingLeft: 4 }} />
          </TouchableOpacity>

          {/* Hospital Dropdown System */}
          <View style={styles.labelRow}>
            <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold, marginTop: 0 }]}>
              {t.blood2.hospital.toUpperCase()} *
            </Text>
            <TouchableOpacity
              onPress={() => setCustomHospitalMode(!customHospitalMode)}
              style={styles.toggleModeBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name={customHospitalMode ? 'list' : 'edit-2'} size={11} color={SectorColors.blood} />
              <Text style={[styles.toggleModeTxt, { color: SectorColors.blood, fontFamily: FontFamily.jakartaBold }]}>
                {customHospitalMode ? 'Choose from list' : 'Type custom'}
              </Text>
            </TouchableOpacity>
          </View>

          {customHospitalMode ? (
            <TextInput
              style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
              value={hospital}
              onChangeText={setHospital}
              placeholder={t.blood2.hospitalPlaceholder}
              placeholderTextColor={C.textMuted}
              autoFocus
            />
          ) : (
            <TouchableOpacity
              style={[
                styles.dropdownCard,
                {
                  backgroundColor: C.surface,
                  borderColor: hospital ? SectorColors.blood : C.border,
                  borderWidth: hospital ? 1.5 : 1,
                },
              ]}
              onPress={openHospitalPicker}
              activeOpacity={0.75}
            >
              <View style={[styles.dropdownIconBox, { backgroundColor: `${SectorColors.blood}16` }]}>
                <Feather name="activity" size={16} color={SectorColors.blood} />
              </View>
              <View style={styles.dropdownInfo}>
                <Text
                  style={[
                    styles.dropdownValue,
                    {
                      color: hospital ? C.text : C.textMuted,
                      fontFamily: hospital ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {hospital || 'Select hospital or medical center...'}
                </Text>
                <Text style={[styles.dropdownHint, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                  {hospital ? 'Tap to change hospital' : '108 Dhaka hospitals & institutes'}
                </Text>
              </View>
              <View style={styles.dropdownRight}>
                {hospital ? (
                  <TouchableOpacity
                    onPress={(e) => { e.stopPropagation(); setHospital(''); }}
                    style={[styles.clearPill, { backgroundColor: C.surface2 }]}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather name="x" size={12} color={C.textMuted} />
                  </TouchableOpacity>
                ) : (
                  <Feather name="chevron-down" size={17} color={C.textMuted} />
                )}
              </View>
            </TouchableOpacity>
          )}

          {/* Area / Neighborhood Dropdown System */}
          <View style={styles.labelRow}>
            <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold, marginTop: 0 }]}>
              {t.blood2.area.toUpperCase()}
            </Text>
            <TouchableOpacity
              onPress={() => setCustomAreaMode(!customAreaMode)}
              style={styles.toggleModeBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name={customAreaMode ? 'list' : 'edit-2'} size={11} color={SectorColors.blood} />
              <Text style={[styles.toggleModeTxt, { color: SectorColors.blood, fontFamily: FontFamily.jakartaBold }]}>
                {customAreaMode ? 'Choose from list' : 'Type custom'}
              </Text>
            </TouchableOpacity>
          </View>

          {customAreaMode ? (
            <TextInput
              style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
              value={area}
              onChangeText={setArea}
              placeholder={t.blood2.areaPlaceholder}
              placeholderTextColor={C.textMuted}
              autoFocus
            />
          ) : (
            <TouchableOpacity
              style={[
                styles.dropdownCard,
                {
                  backgroundColor: C.surface,
                  borderColor: area ? SectorColors.blood : C.border,
                  borderWidth: area ? 1.5 : 1,
                },
              ]}
              onPress={openAreaPicker}
              activeOpacity={0.75}
            >
              <View style={[styles.dropdownIconBox, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : C.surface2 }]}>
                <Icon name="pin" size={16} color={area ? SectorColors.blood : C.text2} />
              </View>
              <View style={styles.dropdownInfo}>
                <Text
                  style={[
                    styles.dropdownValue,
                    {
                      color: area ? C.text : C.textMuted,
                      fontFamily: area ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {area || 'Select residential area or zone...'}
                </Text>
                <Text style={[styles.dropdownHint, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                  {area ? 'Tap to change area' : '144 Dhaka neighborhoods'}
                </Text>
              </View>
              <View style={styles.dropdownRight}>
                {area ? (
                  <TouchableOpacity
                    onPress={(e) => { e.stopPropagation(); setArea(''); }}
                    style={[styles.clearPill, { backgroundColor: C.surface2 }]}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather name="x" size={12} color={C.textMuted} />
                  </TouchableOpacity>
                ) : (
                  <Feather name="chevron-down" size={17} color={C.textMuted} />
                )}
              </View>
            </TouchableOpacity>
          )}

          {/* Dengue Platelet (Apheresis) Toggle Card */}
          <TouchableOpacity
            style={[styles.plateletCard, {
              backgroundColor: isPlatelets ? C.warnBg : C.surface,
              borderColor: isPlatelets ? C.warn : C.border,
            }]}
            onPress={() => setIsPlatelets(!isPlatelets)}
            activeOpacity={0.8}
          >
            <View style={styles.plateletLeft}>
              <View style={[styles.plateletIcon, { backgroundColor: isPlatelets ? C.warn : C.surface2 }]}>
                <Icon name="blood" size={16} color={isPlatelets ? '#fff' : C.textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.plateletTitle, { color: isPlatelets ? C.warn : C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {t.blood2.denguePlateletUrgent} (Apheresis)
                </Text>
                <Text style={[styles.plateletDesc, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                  {t.blood2.denguePlateletNote}
                </Text>
              </View>
            </View>
            <View style={[styles.checkbox, {
              backgroundColor: isPlatelets ? C.warn : 'transparent',
              borderColor: isPlatelets ? C.warn : C.border,
            }]}>
              {isPlatelets && <Icon name="check" size={12} color="#fff" />}
            </View>
          </TouchableOpacity>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: canSubmit ? SectorColors.blood : C.surface2, opacity: loading ? 0.6 : 1 }]}
            onPress={handleSubmit}
            disabled={!canSubmit || loading}
            activeOpacity={0.8}
          >
            <Icon name="blood" size={18} color={canSubmit ? '#fff' : C.textMuted} />
            <Text style={[styles.submitText, { color: canSubmit ? '#fff' : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
              {t.blood2.postRequest}
            </Text>
          </TouchableOpacity>

          <View style={{ height: 30 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ------------------------------------------------------------- */}
      {/* MEDICAL CASE REASON SELECTION SHEET                           */}
      {/* ------------------------------------------------------------- */}
      <Modal
        visible={reasonModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReasonModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setReasonModalVisible(false)}
        >
          <View style={[styles.sheetContent, { backgroundColor: C.surface, borderColor: C.border, paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={[styles.sheetHandle, { backgroundColor: C.border }]} />
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                Select Medical Case Reason
              </Text>
              <TouchableOpacity onPress={() => setReasonModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="x" size={18} color={C.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 360 }}>
              {MEDICAL_REASONS.map(r => {
                const isSelected = medicalReason === r.id;
                return (
                  <TouchableOpacity
                    key={r.id}
                    style={[
                      styles.sheetOptionRow,
                      {
                        backgroundColor: isSelected ? (isDark ? 'rgba(199, 52, 74, 0.16)' : 'rgba(199, 52, 74, 0.08)') : C.surface,
                        borderColor: isSelected ? SectorColors.blood : C.border,
                      },
                    ]}
                    onPress={() => handleSelectReason(r)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.sheetOptionIcon, { backgroundColor: isSelected ? `${SectorColors.blood}20` : C.surface2 }]}>
                      <Feather name={r.icon as any} size={15} color={isSelected ? SectorColors.blood : C.text2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.sheetOptionTitle, { color: isSelected ? SectorColors.blood : C.text, fontFamily: FontFamily.jakartaBold }]}>
                        {r.label}
                      </Text>
                      <Text style={[styles.sheetOptionSub, { color: C.textMuted, fontFamily: FontFamily.bnRegular }]}>
                        {r.labelBn}
                      </Text>
                    </View>
                    {isSelected && <Feather name="check" size={16} color={SectorColors.blood} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* PATIENT AFFILIATION SELECTION SHEET                           */}
      {/* ------------------------------------------------------------- */}
      <Modal
        visible={affModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAffModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setAffModalVisible(false)}
        >
          <View style={[styles.sheetContent, { backgroundColor: C.surface, borderColor: C.border, paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={[styles.sheetHandle, { backgroundColor: C.border }]} />
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                Select Campus Affiliation
              </Text>
              <TouchableOpacity onPress={() => setAffModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="x" size={18} color={C.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 300 }}>
              {AFFILIATIONS.map(a => {
                const isSelected = affiliation === a.id;
                return (
                  <TouchableOpacity
                    key={a.id}
                    style={[
                      styles.sheetOptionRow,
                      {
                        backgroundColor: isSelected ? (isDark ? 'rgba(199, 52, 74, 0.16)' : 'rgba(199, 52, 74, 0.08)') : C.surface,
                        borderColor: isSelected ? SectorColors.blood : C.border,
                      },
                    ]}
                    onPress={() => handleSelectAffiliation(a)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.sheetOptionIcon, { backgroundColor: isSelected ? `${SectorColors.blood}20` : C.surface2 }]}>
                      <Feather name={a.icon as any} size={15} color={isSelected ? SectorColors.blood : C.text2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.sheetOptionTitle, { color: isSelected ? SectorColors.blood : C.text, fontFamily: FontFamily.jakartaBold }]}>
                        {a.label}
                      </Text>
                      <Text style={[styles.sheetOptionSub, { color: C.textMuted, fontFamily: FontFamily.bnRegular }]}>
                        {a.labelBn}
                      </Text>
                    </View>
                    {isSelected && <Feather name="check" size={16} color={SectorColors.blood} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Unified Area & Hospital Picker Modal */}
      <AreaPickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        selectedArea={pickerMode === 'hospital' ? hospital : area}
        onSelectArea={handleSelectLocation}
        title={pickerMode === 'hospital' ? 'Select Hospital' : 'Select Area / Zone'}
        initialTab={pickerMode === 'hospital' ? 'hospital' : 'area'}
        allowAll={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  scroll: { paddingTop: 12, paddingBottom: 20 } as ViewStyle,

  label: {
    fontSize: 11,
    letterSpacing: 0.7,
    marginBottom: 8,
    marginTop: 18,
    marginLeft: 2,
  } as TextStyle,

  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 8,
    marginHorizontal: 2,
  } as ViewStyle,

  toggleModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  } as ViewStyle,

  toggleModeTxt: {
    fontSize: 11.5,
  } as TextStyle,

  groupGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  } as ViewStyle,

  groupBtnWrapper: {
    width: '22%',
  } as ViewStyle,

  groupBtn: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  } as ViewStyle,

  groupTxt: { fontSize: 15 } as TextStyle,

  row: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
    alignItems: 'flex-start',
  } as ViewStyle,

  halfField: {} as ViewStyle,

  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  } as TextStyle,

  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 50,
    borderRadius: 13,
    borderWidth: 1,
    paddingHorizontal: 14,
  } as ViewStyle,

  innerInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    paddingVertical: 0,
  } as TextStyle,

  // Urgency Segment Track with Sliding Indicator
  segRow: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    height: 48,
    alignItems: 'center',
    position: 'relative',
  } as ViewStyle,

  segIndicator: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    left: 3,
    borderRadius: 9,
    shadowColor: SectorColors.blood,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  } as ViewStyle,

  segBtn: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    zIndex: 1,
  } as ViewStyle,

  segTxt: { fontSize: 12 } as TextStyle,

  // Dropdown Selector Cards
  dropdownCard: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    borderRadius: 13,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 10,
  } as ViewStyle,

  dropdownIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  dropdownInfo: {
    flex: 1,
    justifyContent: 'center',
  } as ViewStyle,

  dropdownValue: {
    fontSize: 13.5,
  } as TextStyle,

  dropdownHint: {
    fontSize: 10.5,
    marginTop: 1.5,
  } as TextStyle,

  dropdownRight: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 4,
  } as ViewStyle,

  clearPill: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  plateletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 18,
    gap: 10,
  } as ViewStyle,

  plateletLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  } as ViewStyle,

  plateletIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  plateletTitle: {
    fontSize: 13,
  } as TextStyle,

  plateletDesc: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  } as TextStyle,

  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 14,
    marginTop: 22,
  } as ViewStyle,

  submitText: { fontSize: 15 } as TextStyle,

  // Dropdown Selection Bottom Sheets
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  } as ViewStyle,

  sheetContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    paddingTop: 8,
    paddingHorizontal: Layout.screenPadding,
  } as ViewStyle,

  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 10,
  } as ViewStyle,

  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 2,
  } as ViewStyle,

  sheetTitle: {
    fontSize: 14.5,
  } as TextStyle,

  sheetOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  } as ViewStyle,

  sheetOptionIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  sheetOptionTitle: {
    fontSize: 13,
  } as TextStyle,

  sheetOptionSub: {
    fontSize: 11,
    marginTop: 1,
  } as TextStyle,
});
