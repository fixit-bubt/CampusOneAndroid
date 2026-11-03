import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView,
  StyleSheet, ActivityIndicator, Modal, Platform, type ViewStyle, type TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { Feather } from '@expo/vector-icons';
import { useToast } from '../../components/ui/Toast';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { SegmentedTabs, type TabItem } from '../../components/ui/SegmentedTabs';
import { FontFamily, Layout, SectorColors, Accent } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useT } from '../../i18n';
import { localToday, formatFileSize } from '../../utils/format';
import { uploadJobCircular } from '../../services/jobsService';
import { MAX_FILE_SIZE_MB } from '../../constants/app';
import type { Job } from '../../types/database';

interface PickedCircular {
  uri: string;
  name: string;
  size?: number;
}

interface DropdownItem<T> {
  id: T;
  label: string;
  icon?: keyof typeof Feather.glyphMap;
}

const JOB_TYPE_OPTIONS: DropdownItem<Job['job_type']>[] = [
  { id: 'internship', label: 'Internship', icon: 'briefcase' },
  { id: 'tuition',    label: 'Private Tuition', icon: 'book' },
  { id: 'on_campus',  label: 'On-Campus Job', icon: 'home' },
  { id: 'part_time',  label: 'Part-Time', icon: 'clock' },
  { id: 'full_time',  label: 'Full-Time', icon: 'award' },
  { id: 'freelance',  label: 'Freelance & Projects', icon: 'code' },
];

const DEPT_OPTIONS: DropdownItem<string>[] = [
  { id: 'ALL',  label: 'All Departments (Open to all)', icon: 'layers' },
  { id: 'CSE',  label: 'Computer Science & Engineering (CSE)', icon: 'cpu' },
  { id: 'EEE',  label: 'Electrical & Electronic Engineering (EEE)', icon: 'zap' },
  { id: 'BBA',  label: 'Business Administration (BBA)', icon: 'trending-up' },
  { id: 'LAW',  label: 'Department of Law (LLB)', icon: 'shield' },
  { id: 'ENG',  label: 'Department of English', icon: 'book-open' },
  { id: 'ECO',  label: 'Department of Economics', icon: 'bar-chart-2' },
  { id: 'MATH', label: 'Department of Mathematics', icon: 'percent' },
  { id: 'TEX',  label: 'Textile Engineering (TEX)', icon: 'scissors' },
];

const WORK_MODE_OPTIONS: DropdownItem<Job['work_mode']>[] = [
  { id: 'onsite', label: 'On-site (Campus / Office)', icon: 'map-pin' },
  { id: 'remote', label: 'Remote (Work From Home)', icon: 'wifi' },
  { id: 'hybrid', label: 'Hybrid (Flexible / Combined)', icon: 'shuffle' },
];

const COMPENSATION_OPTIONS: DropdownItem<NonNullable<Job['compensation_type']>>[] = [
  { id: 'paid',       label: 'Paid (Fixed Salary / Stipend)', icon: 'dollar-sign' },
  { id: 'conveyance', label: 'Conveyance Allowance Only', icon: 'navigation' },
  { id: 'unpaid',     label: 'Unpaid / Voluntary', icon: 'heart' },
  { id: 'negotiable', label: 'Negotiable', icon: 'sliders' },
];

const AREA_OPTIONS: DropdownItem<string>[] = [
  { id: 'Mirpur (Near BUBT)', label: 'Mirpur (Near BUBT)', icon: 'map-pin' },
  { id: 'Dhanmondi',          label: 'Dhanmondi', icon: 'map-pin' },
  { id: 'Uttara',             label: 'Uttara', icon: 'map-pin' },
  { id: 'Gulshan / Banani',   label: 'Gulshan / Banani', icon: 'map-pin' },
  { id: 'Mohakhali',          label: 'Mohakhali', icon: 'map-pin' },
  { id: 'Farmgate',           label: 'Farmgate', icon: 'map-pin' },
  { id: 'Mohammadpur',        label: 'Mohammadpur', icon: 'map-pin' },
  { id: 'Motijheel',          label: 'Motijheel', icon: 'map-pin' },
  { id: 'Remote / Online',    label: 'Remote / Online', icon: 'wifi' },
];

const SEMESTER_OPTIONS: DropdownItem<number>[] = [
  { id: 1, label: 'Any Semester (No Restriction)', icon: 'award' },
  { id: 2, label: '2nd Semester and Above', icon: 'award' },
  { id: 3, label: '3rd Semester and Above', icon: 'award' },
  { id: 4, label: '4th Semester and Above', icon: 'award' },
  { id: 5, label: '5th Semester and Above', icon: 'award' },
  { id: 6, label: '6th Semester and Above', icon: 'award' },
  { id: 7, label: '7th Semester and Above', icon: 'award' },
  { id: 8, label: 'Final Year / Graduating (8th Sem+)', icon: 'award' },
];

const APPLY_METHODS: TabItem<Job['apply_method']>[] = [
  { id: 'email', label: 'Email', icon: 'mail' },
  { id: 'link',  label: 'Link', icon: 'link' },
  { id: 'file',  label: 'PDF', icon: 'file-text' },
];

function addDhakaDays(days: number): string {
  const [y, m, d] = localToday().split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().split('T')[0];
}

interface PickerModalProps<T> {
  visible: boolean;
  title: string;
  options: DropdownItem<T>[];
  selectedId: T;
  onSelect: (id: T) => void;
  onClose: () => void;
  C: any;
}

function PickerModalSheet<T extends string | number>({
  visible,
  title,
  options,
  selectedId,
  onSelect,
  onClose,
  C,
}: PickerModalProps<T>) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.pickerBackdrop}>
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={onClose} />
        <View style={[styles.pickerSheet, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.pickerHeaderRow}>
            <Text style={[styles.pickerTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
              {title}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Feather name="x" size={20} color={C.textMuted} />
            </TouchableOpacity>
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: 420 }}
            contentContainerStyle={{ gap: 8, paddingBottom: 16 }}
          >
            {options.map((opt) => {
              const isSelected = selectedId === opt.id;
              return (
                <TouchableOpacity
                  key={String(opt.id)}
                  style={[
                    styles.optionBar58,
                    {
                      backgroundColor: isSelected ? C.surface2 : C.surface,
                      borderColor: isSelected ? C.brand : C.border,
                    },
                  ]}
                  onPress={() => {
                    onSelect(opt.id);
                    onClose();
                  }}
                  activeOpacity={0.75}
                >
                  <View style={styles.barIconSlot}>
                    <Feather
                      name={opt.icon ?? 'circle'}
                      size={26}
                      color={isSelected ? C.brand : C.text}
                    />
                  </View>
                  <View style={{ flex: 1, justifyContent: 'center' }}>
                    <Text
                      style={[
                        styles.barTxt,
                        {
                          color: isSelected ? C.brand : C.text,
                          fontFamily: isSelected ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {opt.label}
                    </Text>
                  </View>
                  {isSelected && (
                    <Feather name="check" size={20} color={C.brand} style={{ marginLeft: 6 }} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

interface CompensationModalProps {
  visible: boolean;
  selectedType: NonNullable<Job['compensation_type']>;
  salary: string;
  onSave: (type: NonNullable<Job['compensation_type']>, salary: string) => void;
  onClose: () => void;
  C: any;
}

function CompensationModalSheet({
  visible,
  selectedType,
  salary,
  onSave,
  onClose,
  C,
}: CompensationModalProps) {
  const [draftType, setDraftType] = useState(selectedType);
  const [draftSalary, setDraftSalary] = useState(salary);

  useEffect(() => {
    if (visible) {
      setDraftType(selectedType);
      setDraftSalary(salary);
    }
  }, [visible, selectedType, salary]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.pickerBackdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={onClose} />
        <View style={[styles.pickerSheet, { backgroundColor: C.surface, borderColor: C.border, maxHeight: '85%' }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.pickerHeaderRow}>
            <Text style={[styles.pickerTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
              Compensation Model
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Feather name="x" size={20} color={C.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: 8, paddingBottom: 20 }}
          >
            {COMPENSATION_OPTIONS.map((opt) => {
              const isSelected = draftType === opt.id;
              return (
                <TouchableOpacity
                  key={String(opt.id)}
                  style={[
                    styles.optionBar58,
                    {
                      backgroundColor: isSelected ? C.surface2 : C.surface,
                      borderColor: isSelected ? C.brand : C.border,
                    },
                  ]}
                  onPress={() => setDraftType(opt.id)}
                  activeOpacity={0.75}
                >
                  <View style={styles.barIconSlot}>
                    <Feather
                      name={opt.icon ?? 'dollar-sign'}
                      size={26}
                      color={isSelected ? C.brand : C.text}
                    />
                  </View>
                  <View style={{ flex: 1, justifyContent: 'center' }}>
                    <Text
                      style={[
                        styles.barTxt,
                        {
                          color: isSelected ? C.brand : C.text,
                          fontFamily: isSelected ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {opt.label}
                    </Text>
                  </View>
                  {isSelected && (
                    <Feather name="check" size={20} color={C.brand} style={{ marginLeft: 6 }} />
                  )}
                </TouchableOpacity>
              );
            })}

            {(draftType === 'paid' || draftType === 'conveyance') && (
              <View style={{ marginTop: 6 }}>
                <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold, marginTop: 8 }]}>
                  SALARY / AMOUNT DETAILS (OPTIONAL)
                </Text>
                <TextInput
                  style={[
                    styles.input54,
                    { backgroundColor: C.surface2, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium },
                  ]}
                  value={draftSalary}
                  onChangeText={setDraftSalary}
                  placeholder=""
                  placeholderTextColor={C.textMuted}
                />
              </View>
            )}

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: C.brand, height: 58, borderRadius: 16, marginTop: 14 }]}
              onPress={() => {
                onSave(draftType, draftSalary);
                onClose();
              }}
              activeOpacity={0.8}
            >
              <Feather name="check" size={20} color="#fff" />
              <Text style={[styles.submitText, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
                Confirm Compensation
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

interface LocationModalProps {
  visible: boolean;
  selectedArea: string;
  specificLocation: string;
  onSave: (area: string, specific: string) => void;
  onClose: () => void;
  C: any;
}

function LocationModalSheet({
  visible,
  selectedArea,
  specificLocation,
  onSave,
  onClose,
  C,
}: LocationModalProps) {
  const [draftArea, setDraftArea] = useState(selectedArea);
  const [draftSpecific, setDraftSpecific] = useState(specificLocation);

  useEffect(() => {
    if (visible) {
      setDraftArea(selectedArea);
      setDraftSpecific(specificLocation);
    }
  }, [visible, selectedArea, specificLocation]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.pickerBackdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={onClose} />
        <View style={[styles.pickerSheet, { backgroundColor: C.surface, borderColor: C.border, maxHeight: '85%' }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.pickerHeaderRow}>
            <Text style={[styles.pickerTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
              Location & Area
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Feather name="x" size={20} color={C.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: 8, paddingBottom: 20 }}
          >
            {AREA_OPTIONS.map((opt) => {
              const isSelected = draftArea === opt.id;
              return (
                <TouchableOpacity
                  key={String(opt.id)}
                  style={[
                    styles.optionBar58,
                    {
                      backgroundColor: isSelected ? C.surface2 : C.surface,
                      borderColor: isSelected ? C.brand : C.border,
                    },
                  ]}
                  onPress={() => setDraftArea(opt.id)}
                  activeOpacity={0.75}
                >
                  <View style={styles.barIconSlot}>
                    <Feather
                      name={opt.icon ?? 'map-pin'}
                      size={26}
                      color={isSelected ? C.brand : C.text}
                    />
                  </View>
                  <View style={{ flex: 1, justifyContent: 'center' }}>
                    <Text
                      style={[
                        styles.barTxt,
                        {
                          color: isSelected ? C.brand : C.text,
                          fontFamily: isSelected ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {opt.label}
                    </Text>
                  </View>
                  {isSelected && (
                    <Feather name="check" size={20} color={C.brand} style={{ marginLeft: 6 }} />
                  )}
                </TouchableOpacity>
              );
            })}

            <View style={{ marginTop: 6 }}>
              <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold, marginTop: 8 }]}>
                SPECIFIC BUILDING, ROOM OR ROAD (OPTIONAL)
              </Text>
              <TextInput
                style={[
                  styles.input54,
                  { backgroundColor: C.surface2, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium },
                ]}
                value={draftSpecific}
                onChangeText={setDraftSpecific}
                placeholder=""
                placeholderTextColor={C.textMuted}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: C.brand, height: 58, borderRadius: 16, marginTop: 14 }]}
              onPress={() => {
                onSave(draftArea, draftSpecific);
                onClose();
              }}
              activeOpacity={0.8}
            >
              <Feather name="check" size={20} color="#fff" />
              <Text style={[styles.submitText, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>
                Confirm Location
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function JobPostScreen({ navigation }: any) {
  const { C, isDark } = useTheme();
  const t = useT();
  const { user, profile } = useAuth();
  const toast = useToast();

  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [jobType, setJobType] = useState<Job['job_type']>('internship');
  const [workMode, setWorkMode] = useState<Job['work_mode']>('onsite');
  const [departmentCode, setDepartmentCode] = useState('ALL');
  const [compensationType, setCompensationType] = useState<NonNullable<Job['compensation_type']>>('paid');
  const [areaName, setAreaName] = useState('Mirpur (Near BUBT)');
  const [specificLocation, setSpecificLocation] = useState('');
  const [salary, setSalary] = useState('');
  const [minSemester, setMinSemester] = useState(1);
  const [isAlumniReferral, setIsAlumniReferral] = useState(false);
  const [skillsInput, setSkillsInput] = useState('');
  const [deadline, setDeadline] = useState(addDhakaDays(14));
  const [desc, setDesc] = useState('');
  const [requirements, setRequirements] = useState('');
  const [applyMethod, setApplyMethod] = useState<Job['apply_method']>('email');
  const [applyValue, setApplyValue] = useState('');
  const [pickedFile, setPickedFile] = useState<PickedCircular | null>(null);
  const [loading, setLoading] = useState(false);
  const [myClubs, setMyClubs] = useState<{ id: string; name: string }[]>([]);
  const [clubId, setClubId] = useState<string | null>(null);

  // Dropdown Picker Modals
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [deptPickerOpen, setDeptPickerOpen] = useState(false);
  const [modePickerOpen, setModePickerOpen] = useState(false);
  const [compPickerOpen, setCompPickerOpen] = useState(false);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [semPickerOpen, setSemPickerOpen] = useState(false);

  // Permission guard: ensure only authorized posters can access
  useEffect(() => {
    supabase.rpc('can_post_jobs').then(({ data, error }) => {
      if (error || data !== true) {
        toast({ type: 'error', title: t.jobs2.accessDenied, message: 'You do not have permission to post jobs or circulars.' });
        navigation.goBack();
      }
    });
  }, [navigation, toast, t]);

  // Clubs the user leads (president/vp)
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('club_members')
        .select('club_id, clubs:club_id(name)')
        .eq('user_id', user.id)
        .in('role', ['president', 'vp']);
      if (data) {
        setMyClubs(
          (data as any[])
            .map(r => ({ id: r.club_id as string, name: r.clubs?.name as string }))
            .filter(c => !!c.name),
        );
      }
    })();
  }, [user?.id]);

  const canSubmit =
    company.trim().length >= 2 &&
    role.trim().length >= 3 &&
    desc.trim().length >= 10 &&
    (applyMethod === 'file' ? !!pickedFile : applyValue.trim().length > 0);

  const dhakaToday = localToday();

  // Active configurations for display in 58dp bars
  const selectedType = useMemo(() => JOB_TYPE_OPTIONS.find(o => o.id === jobType) ?? JOB_TYPE_OPTIONS[0], [jobType]);
  const selectedDept = useMemo(() => DEPT_OPTIONS.find(o => o.id === departmentCode) ?? DEPT_OPTIONS[0], [departmentCode]);
  const selectedMode = useMemo(() => WORK_MODE_OPTIONS.find(o => o.id === workMode) ?? WORK_MODE_OPTIONS[0], [workMode]);
  const selectedComp = useMemo(() => COMPENSATION_OPTIONS.find(o => o.id === compensationType) ?? COMPENSATION_OPTIONS[0], [compensationType]);
  const selectedSem  = useMemo(() => SEMESTER_OPTIONS.find(o => o.id === minSemester) ?? SEMESTER_OPTIONS[0], [minSemester]);

  async function pickPdfFile() {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (res.canceled || !res.assets || res.assets.length === 0) return;
      const asset = res.assets[0];

      if ((asset.size ?? 0) > MAX_FILE_SIZE_MB * 1024 * 1024) {
        toast({ type: 'error', title: t.common.error, message: `Circular PDF exceeds ${MAX_FILE_SIZE_MB}MB limit.` });
        return;
      }

      setPickedFile({ uri: asset.uri, name: asset.name, size: asset.size });
    } catch {
      toast({ type: 'error', title: t.common.error, message: 'Could not select document.' });
    }
  }

  async function handleSubmit() {
    if (!canSubmit || !user) return;

    if (deadline && deadline < dhakaToday) {
      toast({ type: 'error', title: t.common.error, message: t.jobs2?.deadlinePast ?? 'Deadline cannot be in the past.' });
      return;
    }

    if (applyMethod === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(applyValue.trim())) {
        toast({ type: 'error', title: t.common.error, message: 'Please enter a valid email address.' });
        return;
      }
    }

    if (applyMethod === 'link') {
      const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/i;
      if (!urlRegex.test(applyValue.trim())) {
        toast({ type: 'error', title: t.common.error, message: 'Please enter a valid application URL.' });
        return;
      }
    }

    setLoading(true);
    try {
      let fileUrl: string | null = null;
      let fileName: string | null = null;

      if (applyMethod === 'file' && pickedFile) {
        const uploadRes = await uploadJobCircular(user.id, pickedFile.uri, pickedFile.name);
        if (!uploadRes.success || !uploadRes.url) {
          throw new Error(uploadRes.error || 'Failed to upload circular PDF.');
        }
        fileUrl = uploadRes.url;
        fileName = pickedFile.name;
      }

      const skillsArray = skillsInput
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      let effectiveStipend: string | null = null;
      if (compensationType === 'paid') {
        effectiveStipend = salary.trim() || 'Paid';
      } else if (compensationType === 'conveyance') {
        effectiveStipend = salary.trim() || 'Conveyance Only';
      } else if (compensationType === 'unpaid') {
        effectiveStipend = 'Unpaid';
      } else if (compensationType === 'negotiable') {
        effectiveStipend = 'Negotiable';
      }

      const effectiveLocation = specificLocation.trim()
        ? `${areaName.trim()} · ${specificLocation.trim()}`
        : (areaName.trim() || 'Mirpur (Near BUBT)');

      const { error } = await supabase.from('jobs').insert({
        company:         company.trim(),
        title:           role.trim(),
        job_type:        jobType,
        work_mode:       workMode,
        location:        effectiveLocation,
        stipend:         effectiveStipend,
        deadline:        deadline.trim() || dhakaToday,
        description:     desc.trim(),
        requirements:    requirements.trim() || null,
        apply_method:    applyMethod,
        apply_value:     applyMethod === 'file' ? null : applyValue.trim(),
        apply_file_url:  fileUrl,
        apply_file_name: fileName,
        posted_by:       user.id,
        posted_by_name:  profile?.full_name ?? '',
        club_id:         clubId,
        department_code: departmentCode,
        compensation_type: compensationType,
        area_name:       areaName.trim() || null,
        skills:          skillsArray.length > 0 ? skillsArray : null,
        is_alumni_referral: isAlumniReferral,
        min_semester:    minSemester,
      });

      if (error) throw error;
      toast({ type: 'success', title: 'Listing Posted', message: 'Your opportunity is now live.' });
      navigation.goBack();
    } catch (e: any) {
      toast({ type: 'error', title: t.common.error, message: e?.message ?? t.jobs2.postFailed });
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title={t.jobs2.postAJob} onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        >
          {/* Post as Club Attribution */}
          {myClubs.length > 0 && (
            <>
              <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold, marginTop: 4 }]}>
                {t.jobs2.postAs}
              </Text>
              <View style={styles.postAsRow}>
                {([{ id: null as string | null, name: t.jobs2.postAsSelf }, ...myClubs]).map(opt => {
                  const on = clubId === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id ?? 'self'}
                      style={[
                        styles.postAsChip,
                        on
                          ? { backgroundColor: C.brand, borderColor: C.brand }
                          : { backgroundColor: C.surface, borderColor: C.border },
                      ]}
                      onPress={() => setClubId(opt.id)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.postAsChipTxt, { color: on ? '#fff' : C.text2, fontFamily: FontFamily.jakartaBold }]}>
                        {opt.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {/* Company */}
          <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {t.jobs2.company}
          </Text>
          <TextInput
            style={[styles.input54, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
            value={company}
            onChangeText={setCompany}
            placeholder=""
            placeholderTextColor={C.textMuted}
          />

          {/* Role Title */}
          <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {t.jobs2.roleTitle}
          </Text>
          <TextInput
            style={[styles.input54, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
            value={role}
            onChangeText={setRole}
            placeholder=""
            placeholderTextColor={C.textMuted}
          />

          {/* 1. Job Type Dropdown Bar (Height 58dp) */}
          <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {t.jobs2.type}
          </Text>
          <TouchableOpacity
            style={[styles.dropdownBar58, { backgroundColor: C.surface, borderColor: C.border }]}
            onPress={() => setTypePickerOpen(true)}
            activeOpacity={0.75}
          >
            <View style={styles.barIconSlot}>
              <Feather name={selectedType.icon ?? 'briefcase'} size={28} color={C.text} />
            </View>
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <Text style={[styles.barTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {selectedType.label}
              </Text>
            </View>
            <Feather name="chevron-down" size={20} color={C.textMuted} />
          </TouchableOpacity>

          {/* 2. Target Department Dropdown Bar (Height 58dp) */}
          <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {t.jobs2?.targetDept ?? 'TARGET DEPARTMENT'}
          </Text>
          <TouchableOpacity
            style={[styles.dropdownBar58, { backgroundColor: C.surface, borderColor: C.border }]}
            onPress={() => setDeptPickerOpen(true)}
            activeOpacity={0.75}
          >
            <View style={styles.barIconSlot}>
              <Feather name={selectedDept.icon ?? 'layers'} size={28} color={C.text} />
            </View>
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <Text style={[styles.barTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {selectedDept.label}
              </Text>
            </View>
            <Feather name="chevron-down" size={20} color={C.textMuted} />
          </TouchableOpacity>

          {/* 3. Work Mode Dropdown Bar (Height 58dp) */}
          <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {t.jobs2.workMode}
          </Text>
          <TouchableOpacity
            style={[styles.dropdownBar58, { backgroundColor: C.surface, borderColor: C.border }]}
            onPress={() => setModePickerOpen(true)}
            activeOpacity={0.75}
          >
            <View style={styles.barIconSlot}>
              <Feather name={selectedMode.icon ?? 'map-pin'} size={28} color={C.text} />
            </View>
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <Text style={[styles.barTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {selectedMode.label}
              </Text>
            </View>
            <Feather name="chevron-down" size={20} color={C.textMuted} />
          </TouchableOpacity>

          {/* 4. Compensation Model Dropdown Bar (Height 58dp) */}
          <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {t.jobs2?.salaryLabel ?? 'COMPENSATION & SALARY'}
          </Text>
          <TouchableOpacity
            style={[styles.dropdownBar58, { backgroundColor: C.surface, borderColor: C.border }]}
            onPress={() => setCompPickerOpen(true)}
            activeOpacity={0.75}
          >
            <View style={styles.barIconSlot}>
              <Feather name={selectedComp.icon ?? 'dollar-sign'} size={28} color={C.text} />
            </View>
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <Text style={[styles.barTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                {salary.trim() ? `${selectedComp.label} · ${salary.trim()}` : selectedComp.label}
              </Text>
            </View>
            <Feather name="chevron-down" size={20} color={C.textMuted} />
          </TouchableOpacity>

          {/* 5. Location / Area Dropdown Bar (Height 58dp) */}
          <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {t.jobs2.location}
          </Text>
          <TouchableOpacity
            style={[styles.dropdownBar58, { backgroundColor: C.surface, borderColor: C.border }]}
            onPress={() => setLocationPickerOpen(true)}
            activeOpacity={0.75}
          >
            <View style={styles.barIconSlot}>
              <Feather name="map-pin" size={28} color={C.text} />
            </View>
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <Text style={[styles.barTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                {specificLocation.trim()
                  ? `${areaName} · ${specificLocation.trim()}`
                  : (areaName || 'Select Area')}
              </Text>
            </View>
            <Feather name="chevron-down" size={20} color={C.textMuted} />
          </TouchableOpacity>

          {/* 6. Minimum Semester Dropdown Bar (Height 58dp) */}
          <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {t.jobs2?.minSemester ?? 'MINIMUM SEMESTER REQUIREMENT'}
          </Text>
          <TouchableOpacity
            style={[styles.dropdownBar58, { backgroundColor: C.surface, borderColor: C.border }]}
            onPress={() => setSemPickerOpen(true)}
            activeOpacity={0.75}
          >
            <View style={styles.barIconSlot}>
              <Feather name={selectedSem.icon ?? 'award'} size={28} color={C.text} />
            </View>
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <Text style={[styles.barTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {selectedSem.label}
              </Text>
            </View>
            <Feather name="chevron-down" size={20} color={C.textMuted} />
          </TouchableOpacity>

          {/* Alumni Referral Bar (Height 58dp) */}
          <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {t.jobs2?.alumniReferral ?? 'ALUMNI REFERRAL OPPORTUNITY'}
          </Text>
          <TouchableOpacity
            style={[
              styles.dropdownBar58,
              isAlumniReferral
                ? { backgroundColor: isDark ? 'rgba(234, 179, 8, 0.15)' : '#fef9c3', borderColor: Accent.gold }
                : { backgroundColor: C.surface, borderColor: C.border },
            ]}
            onPress={() => setIsAlumniReferral(!isAlumniReferral)}
            activeOpacity={0.75}
          >
            <View style={styles.barIconSlot}>
              <Feather name="award" size={28} color={isAlumniReferral ? Accent.gold : C.text} />
            </View>
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <Text style={[styles.barTxt, { color: isAlumniReferral ? Accent.gold : C.text, fontFamily: FontFamily.jakartaBold }]}>
                {isAlumniReferral ? 'Alumni Referral Priority Active' : 'Regular Opportunity'}
              </Text>
            </View>
            <View style={[styles.alumniCheckPill, { backgroundColor: isAlumniReferral ? Accent.gold : C.surface2 }]}>
              <Feather name={isAlumniReferral ? 'check' : 'plus'} size={15} color={isAlumniReferral ? '#fff' : C.textMuted} />
            </View>
          </TouchableOpacity>

          {/* Skills Required */}
          <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {t.jobs2?.requiredSkills ?? 'SKILLS / SUBJECTS (COMMA SEPARATED)'}
          </Text>
          <TextInput
            style={[styles.input54, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
            value={skillsInput}
            onChangeText={setSkillsInput}
            placeholder=""
            placeholderTextColor={C.textMuted}
          />

          {/* Deadline */}
          <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {t.jobs2.deadlineLabel} (YYYY-MM-DD)
          </Text>
          <TextInput
            style={[styles.input54, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
            value={deadline}
            onChangeText={setDeadline}
            placeholder=""
            placeholderTextColor={C.textMuted}
          />

          {/* Description */}
          <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {t.jobs2.description}
          </Text>
          <TextInput
            style={[styles.textarea, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
            value={desc}
            onChangeText={setDesc}
            placeholder=""
            placeholderTextColor={C.textMuted}
            multiline
            textAlignVertical="top"
          />

          {/* Requirements */}
          <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {t.jobs2.requirements}
          </Text>
          <TextInput
            style={[styles.input54, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
            value={requirements}
            onChangeText={setRequirements}
            placeholder=""
            placeholderTextColor={C.textMuted}
          />

          {/* How to Apply */}
          <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {t.jobs2?.applyTitle ?? 'HOW TO APPLY'}
          </Text>
          <SegmentedTabs
            tabs={APPLY_METHODS}
            activeTab={applyMethod}
            onTabChange={setApplyMethod}
          />

          {applyMethod === 'email' && (
            <TextInput
              style={[styles.input54, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium, marginTop: 10 }]}
              value={applyValue}
              onChangeText={setApplyValue}
              placeholder=""
              placeholderTextColor={C.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          )}

          {applyMethod === 'link' && (
            <TextInput
              style={[styles.input54, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium, marginTop: 10 }]}
              value={applyValue}
              onChangeText={setApplyValue}
              placeholder=""
              placeholderTextColor={C.textMuted}
              autoCapitalize="none"
              keyboardType="url"
            />
          )}

          {applyMethod === 'file' && (
            <View style={{ marginTop: 10 }}>
              {pickedFile ? (
                <View style={[styles.filePickedCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                  <Feather name="file-text" size={24} color={SectorColors.jobs} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.fileNameTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                      {pickedFile.name}
                    </Text>
                    {pickedFile.size ? (
                      <Text style={[styles.fileSizeTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                        {formatFileSize(pickedFile.size)}
                      </Text>
                    ) : null}
                  </View>
                  <TouchableOpacity onPress={() => setPickedFile(null)} hitSlop={8}>
                    <Feather name="x" size={18} color={C.textMuted} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.filePickBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
                  onPress={pickPdfFile}
                  activeOpacity={0.75}
                >
                  <Feather name="upload" size={22} color={C.brand} />
                  <Text style={[styles.filePickTxt, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
                    {t.jobs2?.uploadResume ?? 'Upload Circular PDF'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitBtn,
              { backgroundColor: canSubmit ? C.brand : C.surface2, opacity: loading ? 0.6 : 1 },
            ]}
            onPress={handleSubmit}
            disabled={!canSubmit || loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Icon name="check" size={22} color={canSubmit ? '#fff' : C.textMuted} />
                <Text style={[styles.submitText, { color: canSubmit ? '#fff' : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                  {t.jobs2?.postListing ?? 'Post Listing'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 36 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Dropdown Modal Sheets (All with 58dp Option Rows) */}
      <PickerModalSheet
        visible={typePickerOpen}
        title="Select Job Type"
        options={JOB_TYPE_OPTIONS}
        selectedId={jobType}
        onSelect={(id) => setJobType(id as Job['job_type'])}
        onClose={() => setTypePickerOpen(false)}
        C={C}
      />

      <PickerModalSheet
        visible={deptPickerOpen}
        title="Select Target Department"
        options={DEPT_OPTIONS}
        selectedId={departmentCode}
        onSelect={(id) => setDepartmentCode(id as string)}
        onClose={() => setDeptPickerOpen(false)}
        C={C}
      />

      <PickerModalSheet
        visible={modePickerOpen}
        title="Select Work Mode"
        options={WORK_MODE_OPTIONS}
        selectedId={workMode}
        onSelect={(id) => setWorkMode(id as Job['work_mode'])}
        onClose={() => setModePickerOpen(false)}
        C={C}
      />

      <CompensationModalSheet
        visible={compPickerOpen}
        selectedType={compensationType}
        salary={salary}
        onSave={(type, sal) => {
          setCompensationType(type);
          setSalary(sal);
        }}
        onClose={() => setCompPickerOpen(false)}
        C={C}
      />

      <LocationModalSheet
        visible={locationPickerOpen}
        selectedArea={areaName}
        specificLocation={specificLocation}
        onSave={(area, spec) => {
          setAreaName(area);
          setSpecificLocation(spec);
        }}
        onClose={() => setLocationPickerOpen(false)}
        C={C}
      />

      <PickerModalSheet
        visible={semPickerOpen}
        title="Select Minimum Semester"
        options={SEMESTER_OPTIONS}
        selectedId={minSemester}
        onSelect={(id) => setMinSemester(id as number)}
        onClose={() => setSemPickerOpen(false)}
        C={C}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  scroll: { paddingTop: 12, paddingBottom: 24 } as ViewStyle,

  postAsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 } as ViewStyle,
  postAsChip: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 20, borderWidth: 1 } as ViewStyle,
  postAsChipTxt: { fontSize: 13 } as any,

  label: {
    fontSize: 11,
    letterSpacing: 0.7,
    marginBottom: 8,
    marginTop: 18,
    marginLeft: 2,
  } as any,

  input54: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 14.5,
  } as any,

  dropdownBar58: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
  } as ViewStyle,

  barIconSlot: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  barTxt: {
    fontSize: 14.5,
  } as TextStyle,

  alumniCheckPill: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  textarea: {
    minHeight: 100,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    fontSize: 14.5,
    lineHeight: 22,
  } as any,

  filePickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
  } as ViewStyle,

  filePickTxt: {
    fontSize: 13.5,
  } as any,

  filePickedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  } as ViewStyle,

  fileNameTxt: {
    fontSize: 13,
  } as any,

  fileSizeTxt: {
    fontSize: 11,
    marginTop: 2,
  } as any,

  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    height: 58,
    borderRadius: 16,
    marginTop: 24,
  } as ViewStyle,

  submitText: { fontSize: 15 } as any,

  // Picker Bottom Sheet Modal Styles
  pickerBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  } as ViewStyle,

  pickerOverlay: {
    flex: 1,
  } as ViewStyle,

  pickerSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderWidth: 1,
  } as ViewStyle,

  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(150,150,150,0.4)',
    alignSelf: 'center',
    marginBottom: 10,
  } as ViewStyle,

  pickerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 14,
  } as ViewStyle,

  pickerTitle: {
    fontSize: 16.5,
  } as TextStyle,

  optionBar58: {
    height: 58,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 12,
  } as ViewStyle,
});
