import { useState, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView,
  StyleSheet, KeyboardAvoidingView, Animated, Modal,
  Dimensions, type ViewStyle, type TextStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { AnimatedIcon } from '../../components/ui/AnimatedIcon';
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

  // Location Picker State
  const [pickerVisible, setPickerVisible] = useState(false);
  const [customMode, setCustomMode] = useState(false);

  const URGENCY_TABS: TabItem<BloodRequest['urgency']>[] = [
    { id: 'Urgent',    label: 'Urgent', color: C.danger },
    { id: 'Today',     label: 'Today',  color: C.warn },
    { id: 'This week', label: 'Week',   color: SectorColors.blood },
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

  function handleSelectLocation(selected: string, subLocation?: string) {
    if (selected === 'All') return;
    setHospital(selected);
    if (subLocation) {
      setArea(subLocation);
    } else {
      const matched = DHAKA_AREAS.find(a => a.name.toLowerCase() === selected.toLowerCase());
      if (matched?.subLocation) {
        setArea(matched.subLocation);
      } else {
        setArea(selected);
      }
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
            {GROUPS.map(g => (
              <GroupButton
                key={g}
                label={g}
                isSelected={group === g}
                onPress={() => handleSelectGroup(g)}
                C={C}
              />
            ))}
          </View>

          {/* Urgency with Snappy Sliding Indicator (Universal 58dp Standard) */}
          <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {t.blood2.urgency.toUpperCase()}
          </Text>
          <SegmentedTabs<BloodRequest['urgency']>
            tabs={URGENCY_TABS}
            activeTab={urgency}
            onTabChange={setUrgency}
          />

          {/* Units / Bags Needed Stepper (Universal 72dp Content Standard) */}
          <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {t.blood2.units.toUpperCase()}
          </Text>
          <View style={[styles.unitsBar, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={styles.unitsLeft}>
              <View style={[styles.unitsIconBox, { backgroundColor: `${SectorColors.blood}16` }]}>
                <AnimatedIcon
                  key={`units-droplet-${units}`}
                  family="feather"
                  name="droplet"
                  size={20}
                  color={SectorColors.blood}
                  animation="spring"
                />
              </View>
              <View style={{ justifyContent: 'center' }}>
                <Text style={[styles.unitsLabel, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {units} {parseInt(units, 10) === 1 ? 'Bag Needed' : 'Bags Needed'}
                </Text>
                <Text style={[styles.unitsSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                  Clinical blood units required
                </Text>
              </View>
            </View>
            <View style={styles.stepperRow}>
              <TouchableOpacity
                style={[styles.stepperBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
                onPress={() => setUnits(prev => String(Math.max(1, (parseInt(prev, 10) || 1) - 1)))}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="minus" size={16} color={C.text} />
              </TouchableOpacity>
              <Text style={[styles.stepperValue, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
                {units}
              </Text>
              <TouchableOpacity
                style={[styles.stepperBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
                onPress={() => setUnits(prev => String(Math.min(10, (parseInt(prev, 10) || 1) + 1)))}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="plus" size={16} color={C.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* ------------------------------------------------------------- */}
          {/* CLEAN PATIENT & CLINICAL DETAILS (Clean Dropdown Architecture) */}
          {/* ------------------------------------------------------------- */}

          {/* Patient Full Name (Universal 58dp Standard) */}
          <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            PATIENT FULL NAME *
          </Text>
          <View style={[styles.inputWithIcon, { backgroundColor: C.surface, borderColor: C.border }]}>
            <AnimatedIcon family="feather" name="user" size={18} color={patientName ? SectorColors.blood : C.textMuted} animation="entrance" />
            <TextInput
              style={[styles.innerInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
              value={patientName}
              onChangeText={setPatientName}
              placeholder="e.g. Sadia Sultana, Md. Karim"
              placeholderTextColor={C.textMuted}
            />
          </View>

          {/* Medical Case Reason Requirement (Universal 72dp Content Standard) */}
          <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            CASE REASON / REQUIREMENT
          </Text>
          <View
            style={[
              styles.dropdownCard,
              {
                backgroundColor: C.surface,
                borderColor: C.border,
                borderWidth: 1,
              },
            ]}
          >
            <TouchableOpacity
              style={styles.dropdownMain}
              onPress={() => setReasonModalVisible(true)}
              activeOpacity={0.75}
            >
              <View style={[styles.dropdownIconBox, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : C.surface2, borderColor: C.border, borderWidth: 1 }]}>
                <AnimatedIcon
                  key={`reason-${medicalReason}`}
                  family="feather"
                  name={currentReasonObj?.icon ? (currentReasonObj.icon as any) : 'activity'}
                  size={22}
                  color={C.text}
                  animation={medicalReason ? 'spring' : 'entrance'}
                />
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
            </TouchableOpacity>
            <View style={styles.dropdownRight}>
              {medicalReason ? (
                <TouchableOpacity
                  onPress={() => setMedicalReason('')}
                  style={[styles.clearPill, { backgroundColor: C.surface2, borderColor: C.border, borderWidth: 1 }]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Feather name="x" size={14} color={C.textMuted} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => setReasonModalVisible(true)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Feather name="chevron-down" size={18} color={C.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Patient Affiliation (Universal 72dp Content Standard) */}
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
            <View style={[styles.dropdownIconBox, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : C.surface2, borderColor: C.border, borderWidth: 1 }]}>
              <AnimatedIcon
                key={`aff-${affiliation}`}
                family="feather"
                name={currentAffObj?.icon ? (currentAffObj.icon as any) : 'users'}
                size={22}
                color={C.text}
                animation={affiliation ? 'spring' : 'entrance'}
              />
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
            <Feather name="chevron-down" size={18} color={C.textMuted} style={{ paddingLeft: 4 }} />
          </TouchableOpacity>

          {/* Single Unified Hospital & Location Dropdown System (Universal 72dp Content Standard) */}
          <View style={styles.labelRow}>
            <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold, marginTop: 0 }]}>
              HOSPITAL OR LOCATION *
            </Text>
            <TouchableOpacity
              onPress={() => setCustomMode(!customMode)}
              style={styles.toggleModeBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name={customMode ? 'list' : 'edit-2'} size={11} color={C.text2} />
              <Text style={[styles.toggleModeTxt, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>
                {customMode ? 'Choose from list' : 'Type custom'}
              </Text>
            </TouchableOpacity>
          </View>

          {customMode ? (
            <TextInput
              style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
              value={hospital}
              onChangeText={(val) => {
                setHospital(val);
                setArea(val);
              }}
              placeholder="Enter hospital, clinic, or location (e.g. DMCH, Mirpur-2)..."
              placeholderTextColor={C.textMuted}
              autoFocus
            />
          ) : (
            <View
              style={[
                styles.dropdownCard,
                {
                  backgroundColor: C.surface,
                  borderColor: C.border,
                  borderWidth: 1,
                },
              ]}
            >
              <TouchableOpacity
                style={styles.dropdownMain}
                onPress={() => setPickerVisible(true)}
                activeOpacity={0.75}
              >
                <View style={[styles.dropdownIconBox, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : C.surface2, borderColor: C.border, borderWidth: 1 }]}>
                  <AnimatedIcon
                    key={`hosp-${hospital || area}`}
                    family="mci"
                    name={hospital ? 'hospital-building' : 'map-marker-radius'}
                    size={22}
                    color={C.text}
                    animation={hospital ? 'spring' : 'entrance'}
                  />
                </View>
                <View style={styles.dropdownInfo}>
                  <Text
                    style={[
                      styles.dropdownValue,
                      {
                        color: (hospital || area) ? C.text : C.textMuted,
                        fontFamily: (hospital || area) ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {hospital || area || 'Select hospital or location...'}
                  </Text>
                  <Text style={[styles.dropdownHint, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                    {area ? `${area} · Tap to change location` : '108 Dhaka hospitals & 144 areas'}
                  </Text>
                </View>
              </TouchableOpacity>
              <View style={styles.dropdownRight}>
                {(hospital || area) ? (
                  <TouchableOpacity
                    onPress={() => {
                      setHospital('');
                      setArea('');
                    }}
                    style={[styles.clearPill, { backgroundColor: C.surface2, borderColor: C.border, borderWidth: 1 }]}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather name="x" size={14} color={C.textMuted} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={() => setPickerVisible(true)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather name="chevron-down" size={18} color={C.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Dengue Platelet (Apheresis) Toggle Card (Universal 72dp Content Standard) */}
          <TouchableOpacity
            style={[styles.plateletCard, {
              backgroundColor: isPlatelets ? C.warnBg : C.surface,
              borderColor: isPlatelets ? C.warn : C.border,
            }]}
            onPress={() => setIsPlatelets(!isPlatelets)}
            activeOpacity={0.8}
          >
            <View style={styles.plateletLeft}>
              <View style={[styles.plateletIcon, { backgroundColor: isPlatelets ? C.warn : (isDark ? 'rgba(234, 179, 8, 0.15)' : 'rgba(234, 179, 8, 0.10)') }]}>
                <AnimatedIcon
                  key={`platelet-${isPlatelets}`}
                  family="feather"
                  name="zap"
                  size={22}
                  color={isPlatelets ? '#fff' : C.warn}
                  animation={isPlatelets ? 'spring' : 'wobble'}
                  loop={false}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.plateletTitle, { color: isPlatelets ? (isDark ? '#fef08a' : '#854d0e') : C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
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

          {/* Submit Button (Universal 58dp Standard) */}
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: canSubmit ? SectorColors.blood : C.surface2, opacity: loading ? 0.6 : 1 }]}
            onPress={handleSubmit}
            disabled={!canSubmit || loading}
            activeOpacity={0.8}
          >
            <AnimatedIcon
              key={`submit-droplet-${canSubmit}`}
              family="feather"
              name="droplet"
              size={18}
              color={canSubmit ? '#fff' : C.textMuted}
              animation={canSubmit ? 'spring' : 'entrance'}
            />
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
                        backgroundColor: isSelected ? (isDark ? 'rgba(255, 255, 255, 0.06)' : '#f8fafc') : C.surface,
                        borderColor: isSelected ? (isDark ? 'rgba(255, 255, 255, 0.24)' : 'rgba(0, 0, 0, 0.20)') : C.border,
                      },
                    ]}
                    onPress={() => handleSelectReason(r)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.sheetOptionIcon, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : C.surface2, borderColor: C.border, borderWidth: 1 }]}>
                      <AnimatedIcon family="feather" name={r.icon as any} size={18} color={C.text} animation="entrance" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.sheetOptionTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                        {r.label}
                      </Text>
                      <Text style={[styles.sheetOptionSub, { color: C.textMuted, fontFamily: FontFamily.bnRegular }]}>
                        {r.labelBn}
                      </Text>
                    </View>
                    {isSelected && <AnimatedIcon family="feather" name="check" size={16} color={C.text} animation="spring" />}
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
                        backgroundColor: isSelected ? (isDark ? 'rgba(255, 255, 255, 0.06)' : '#f8fafc') : C.surface,
                        borderColor: isSelected ? (isDark ? 'rgba(255, 255, 255, 0.24)' : 'rgba(0, 0, 0, 0.20)') : C.border,
                      },
                    ]}
                    onPress={() => handleSelectAffiliation(a)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.sheetOptionIcon, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : C.surface2, borderColor: C.border, borderWidth: 1 }]}>
                      <AnimatedIcon family="feather" name={a.icon as any} size={18} color={C.text} animation="entrance" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.sheetOptionTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                        {a.label}
                      </Text>
                      <Text style={[styles.sheetOptionSub, { color: C.textMuted, fontFamily: FontFamily.bnRegular }]}>
                        {a.labelBn}
                      </Text>
                    </View>
                    {isSelected && <AnimatedIcon family="feather" name="check" size={16} color={C.text} animation="spring" />}
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
        selectedArea={hospital || area}
        onSelectArea={handleSelectLocation}
        title="Select Hospital or Area"
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

  unitsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 72,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
  } as ViewStyle,

  unitsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  } as ViewStyle,

  unitsIconBox: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  unitsLabel: {
    fontSize: 14.5,
  } as TextStyle,

  unitsSub: {
    fontSize: 11.5,
    marginTop: 2,
  } as TextStyle,

  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  } as ViewStyle,

  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  stepperValue: {
    fontSize: 16,
    minWidth: 26,
    textAlign: 'center',
  } as TextStyle,

  input: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 14.5,
  } as TextStyle,

  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
  } as ViewStyle,

  innerInput: {
    flex: 1,
    height: '100%',
    fontSize: 14.5,
    paddingVertical: 0,
  } as TextStyle,

  // Dropdown Selector Cards (Universal 72dp Content Standard)
  dropdownCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 72,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    gap: 12,
  } as ViewStyle,

  dropdownMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
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

  plateletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 72,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 18,
    gap: 12,
  } as ViewStyle,

  plateletLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  } as ViewStyle,

  plateletIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  plateletTitle: {
    fontSize: 14.5,
  } as TextStyle,

  plateletDesc: {
    fontSize: 11.5,
    marginTop: 2,
    lineHeight: 16,
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
    gap: 9,
    height: 58,
    borderRadius: 16,
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
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  } as ViewStyle,

  sheetOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  sheetOptionTitle: {
    fontSize: 14,
  } as TextStyle,

  sheetOptionSub: {
    fontSize: 11.5,
    marginTop: 2,
  } as TextStyle,
});

function GroupButton({
  label,
  isSelected,
  onPress,
  C,
}: {
  label: string;
  isSelected: boolean;
  onPress: () => void;
  C: any;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.90,
      tension: 340,
      friction: 12,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.sequence([
      Animated.spring(scale, {
        toValue: 1.15,
        tension: 320,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        tension: 200,
        friction: 9,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <Animated.View style={[styles.groupBtnWrapper, { transform: [{ scale }] }]}>
      <TouchableOpacity
        style={[
          styles.groupBtn,
          {
            backgroundColor: isSelected ? SectorColors.blood : C.surface,
            borderColor: isSelected ? SectorColors.blood : C.border,
            borderWidth: isSelected ? 1.8 : 1,
          },
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.85}
      >
        <Text
          style={[
            styles.groupTxt,
            { color: isSelected ? '#fff' : C.text, fontFamily: FontFamily.jakartaExtraBold },
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}
