import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView,
  StyleSheet, ActivityIndicator, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { Feather } from '@expo/vector-icons';
import { useToast } from '../../components/ui/Toast';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout, SectorColors, Accent } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useT } from '../../i18n';
import { isValidDate, localToday, formatFileSize } from '../../utils/format';
import { uploadJobCircular } from '../../services/jobsService';
import { MAX_FILE_SIZE_MB, JOB_DEPARTMENTS, DHAKA_AREAS, COMPENSATION_TYPES } from '../../constants/app';
import type { Job } from '../../types/database';

function SegControl<T extends string>({
  options, value, onChange, C,
}: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void; C: any }) {
  return (
    <View style={[segStyles.row, { backgroundColor: C.surface2, borderColor: C.border }]}>
      {options.map(o => {
        const on = o.id === value;
        return (
          <TouchableOpacity
            key={o.id}
            style={[segStyles.btn, on && { backgroundColor: C.brand }]}
            onPress={() => onChange(o.id)}
            activeOpacity={0.75}
          >
            <Text style={[segStyles.txt, { color: on ? '#fff' : C.text2, fontFamily: FontFamily.jakartaBold }]}>
              {o.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const segStyles = StyleSheet.create({
  row: { flexDirection: 'row' as const, borderRadius: 12, borderWidth: 1, padding: 4, gap: 4 },
  btn: { flex: 1, alignItems: 'center' as const, paddingVertical: 9, borderRadius: 9 },
  txt: { fontSize: 13 } as any,
});

const JOB_TYPES: { id: Job['job_type']; label: string }[] = [
  { id: 'internship', label: 'Internship' },
  { id: 'tuition',    label: 'Tuition' },
  { id: 'on_campus',  label: 'On-Campus' },
  { id: 'part_time',  label: 'Part-time' },
  { id: 'full_time',  label: 'Full-time' },
  { id: 'freelance',  label: 'Freelance' },
];

const MODES: { id: Job['work_mode']; label: string }[] = [
  { id: 'onsite', label: 'On-site' },
  { id: 'remote', label: 'Remote' },
  { id: 'hybrid', label: 'Hybrid' },
];

const COMPENSATION_OPTIONS: { id: NonNullable<Job['compensation_type']>; label: string }[] = [
  { id: 'paid',        label: 'Paid / Stipend' },
  { id: 'conveyance',  label: 'Conveyance' },
  { id: 'negotiable',  label: 'Negotiable' },
  { id: 'unpaid',      label: 'Experience' },
];

const APPLY_METHODS: { id: Job['apply_method']; label: string }[] = [
  { id: 'email', label: 'Email' },
  { id: 'link',  label: 'Link' },
  { id: 'file',  label: 'Circular PDF' },
];

interface PickedCircular {
  uri: string;
  name: string;
  size?: number;
}

function addDhakaDays(days: number): string {
  const today = localToday();
  const d = new Date(`${today}T00:00:00Z`);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function semesterChipLabel(sem: number, anyLabel: string) {
  if (sem === 1) return anyLabel;
  if (sem === 2) return '2nd+';
  if (sem === 3) return '3rd+';
  return `${sem}th+`;
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
  const [location, setLocation] = useState('');
  const [areaName, setAreaName] = useState('');
  const [salary, setSalary] = useState('');
  const [minSemester, setMinSemester] = useState(1);
  const [isAlumniReferral, setIsAlumniReferral] = useState(false);
  const [skillsInput, setSkillsInput] = useState('');
  const [deadline, setDeadline] = useState(addDhakaDays(14)); // default 14 days
  const [desc, setDesc] = useState('');
  const [requirements, setRequirements] = useState('');
  const [applyMethod, setApplyMethod] = useState<Job['apply_method']>('email');
  const [applyValue, setApplyValue] = useState('');
  const [pickedFile, setPickedFile] = useState<PickedCircular | null>(null);
  const [loading, setLoading] = useState(false);
  const [myClubs, setMyClubs] = useState<{ id: string; name: string }[]>([]);
  const [clubId, setClubId] = useState<string | null>(null);

  // Permission guard: ensure only authorized posters can access
  useEffect(() => {
    supabase.rpc('can_post_jobs').then(({ data }) => {
      if (data === false) {
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

  const jobTypes: { id: Job['job_type']; label: string }[] = [
    { id: 'internship', label: t.jobs2?.internship ?? 'Internship' },
    { id: 'tuition',    label: t.jobs2?.tuition ?? 'Tuition' },
    { id: 'on_campus',  label: t.jobs2?.onCampus ?? 'On-Campus' },
    { id: 'part_time',  label: t.jobs2?.partTime ?? 'Part-time' },
    { id: 'full_time',  label: t.jobs2?.fullTime ?? 'Full-time' },
    { id: 'freelance',  label: t.jobs2?.freelance ?? 'Freelance' },
  ];

  const modes: { id: Job['work_mode']; label: string }[] = [
    { id: 'onsite', label: t.jobs2?.onsite ?? 'On-site' },
    { id: 'remote', label: t.jobs2?.remote ?? 'Remote' },
    { id: 'hybrid', label: t.jobs2?.hybrid ?? 'Hybrid' },
  ];

  const compensationOptions: { id: NonNullable<Job['compensation_type']>; label: string }[] = [
    { id: 'paid',        label: t.jobs2?.paid ?? 'Paid / Stipend' },
    { id: 'conveyance',  label: t.jobs2?.conveyance ?? 'Conveyance' },
    { id: 'negotiable',  label: t.jobs2?.negotiable ?? 'Negotiable' },
    { id: 'unpaid',      label: t.jobs2?.unpaid ?? 'Experience' },
  ];

  async function pickPdfFile() {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (res.canceled || !res.assets || res.assets.length === 0) return;
      const asset = res.assets[0];
      const size = asset.size ?? 0;

      if (size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        toast({
          type: 'error',
          title: t.common.error,
          message: `PDF exceeds ${MAX_FILE_SIZE_MB}MB limit.`,
        });
        return;
      }

      setPickedFile({
        uri: asset.uri,
        name: asset.name,
        size: asset.size,
      });
    } catch {
      toast({ type: 'error', title: t.common.error, message: 'Could not select document.' });
    }
  }

  async function handleSubmit() {
    if (!canSubmit || !user || loading) return;

    if (deadline.trim()) {
      if (!isValidDate(deadline)) {
        toast({ type: 'error', title: t.common.error, message: t.common.invalidDate });
        return;
      }
      if (deadline.trim() < dhakaToday) {
        toast({ type: 'error', title: t.common.error, message: t.jobs2?.deadlinePast ?? 'Deadline cannot be in the past.' });
        return;
      }
    }

    if (applyMethod === 'email') {
      const emailTrimmed = applyValue.trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailTrimmed)) {
        toast({ type: 'error', title: t.common.error, message: 'Please enter a valid email address.' });
        return;
      }
    }

    if (applyMethod === 'link') {
      const linkTrimmed = applyValue.trim();
      if (!linkTrimmed.includes('.')) {
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
        effectiveStipend = 'Conveyance Only';
      } else if (compensationType === 'unpaid') {
        effectiveStipend = 'Unpaid';
      } else if (compensationType === 'negotiable') {
        effectiveStipend = 'Negotiable';
      }

      const { error } = await supabase.from('jobs').insert({
        company:         company.trim(),
        title:           role.trim(),
        job_type:        jobType,
        work_mode:       workMode,
        location:        location.trim() || (areaName ? areaName : 'Dhaka'),
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
            style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
            value={company}
            onChangeText={setCompany}
            placeholder={t.jobs2.companyPlaceholder}
            placeholderTextColor={C.textMuted}
          />

          {/* Role Title */}
          <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {t.jobs2.roleTitle}
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
            value={role}
            onChangeText={setRole}
            placeholder={t.jobs2.roleTitlePlaceholder}
            placeholderTextColor={C.textMuted}
          />

          {/* Job Type Grid */}
          <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {t.jobs2.type}
          </Text>
          <View style={styles.typeGrid}>
            {jobTypes.map(jt => {
              const on = jobType === jt.id;
              return (
                <TouchableOpacity
                  key={jt.id}
                  style={[
                    styles.typeGridChip,
                    on
                      ? { backgroundColor: C.brand, borderColor: C.brand }
                      : { backgroundColor: C.surface, borderColor: C.border },
                  ]}
                  onPress={() => setJobType(jt.id)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.typeGridTxt, { color: on ? '#fff' : C.text2, fontFamily: FontFamily.jakartaBold }]}>
                    {jt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Target Department Filter */}
          <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {t.jobs2?.targetDept ?? 'TARGET DEPARTMENT'}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 7, paddingVertical: 2 }}>
            {JOB_DEPARTMENTS.map(dept => {
              const on = departmentCode === dept.code;
              return (
                <TouchableOpacity
                  key={dept.code}
                  style={[
                    styles.deptChip,
                    on
                      ? { backgroundColor: C.brand, borderColor: C.brand }
                      : { backgroundColor: C.surface, borderColor: C.border },
                  ]}
                  onPress={() => setDepartmentCode(dept.code)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.deptChipTxt, { color: on ? '#fff' : C.text2, fontFamily: FontFamily.jakartaBold }]}>
                    {dept.code === 'ALL' ? (t.jobs2?.allDepts ?? dept.label) : dept.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Work Mode */}
          <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {t.jobs2.workMode}
          </Text>
          <SegControl options={modes} value={workMode} onChange={setWorkMode} C={C} />

          {/* Compensation Model */}
          <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {t.jobs2?.salaryLabel ?? 'COMPENSATION & SALARY'}
          </Text>
          <SegControl
            options={compensationOptions}
            value={compensationType}
            onChange={setCompensationType}
            C={C}
          />

          {compensationType === 'paid' && (
            <TextInput
              style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium, marginTop: 10 }]}
              value={salary}
              onChangeText={setSalary}
              placeholder="e.g. ৳8,000 / month or ৳5,000 / subject"
              placeholderTextColor={C.textMuted}
            />
          )}

          {/* Location & Dhaka Area Presets */}
          <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {t.jobs2.location}
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
            value={location}
            onChangeText={setLocation}
            placeholder={t.jobs2.locationPlaceholder}
            placeholderTextColor={C.textMuted}
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 6, paddingTop: 8 }}>
            {DHAKA_AREAS.slice(0, 8).map(area => {
              const on = areaName === area;
              return (
                <TouchableOpacity
                  key={area}
                  style={[
                    styles.areaPresetChip,
                    on
                      ? { backgroundColor: isDark ? 'rgba(14, 156, 138, 0.25)' : '#e0f4f0', borderColor: SectorColors.jobs }
                      : { backgroundColor: C.surface2, borderColor: 'transparent' },
                  ]}
                  onPress={() => {
                    setAreaName(area);
                    if (!location || location === 'Dhaka') setLocation(area);
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.areaPresetTxt, { color: on ? SectorColors.jobs : C.text2, fontFamily: FontFamily.jakartaBold }]}>
                    {area}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Minimum Semester & Alumni Referral */}
          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold, marginTop: 0 }]}>
                {t.jobs2?.minSemester ?? 'MIN SEMESTER'}
              </Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                {[1, 3, 5, 7].map(sem => {
                  const on = minSemester === sem;
                  return (
                    <TouchableOpacity
                      key={sem}
                      style={[
                        styles.semChip,
                        on
                          ? { backgroundColor: C.brand, borderColor: C.brand }
                          : { backgroundColor: C.surface, borderColor: C.border },
                      ]}
                      onPress={() => setMinSemester(sem)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.semChipTxt, { color: on ? '#fff' : C.text2, fontFamily: FontFamily.jakartaBold }]}>
                        {semesterChipLabel(sem, t.jobs2?.anySemester ?? 'Any')}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.halfField}>
              <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold, marginTop: 0 }]}>
                {t.jobs2?.alumniReferral ?? 'ALUMNI REFERRAL'}
              </Text>
              <TouchableOpacity
                style={[
                  styles.alumniToggle,
                  isAlumniReferral
                    ? { backgroundColor: isDark ? 'rgba(234, 179, 8, 0.2)' : '#fef9c3', borderColor: Accent.gold }
                    : { backgroundColor: C.surface, borderColor: C.border },
                ]}
                onPress={() => setIsAlumniReferral(!isAlumniReferral)}
                activeOpacity={0.75}
              >
                <Feather name="award" size={15} color={isAlumniReferral ? Accent.gold : C.textMuted} />
                <Text style={[styles.alumniToggleTxt, { color: isAlumniReferral ? Accent.gold : C.text2, fontFamily: FontFamily.jakartaBold }]}>
                  {isAlumniReferral ? (t.jobs2?.alumniReferral ?? 'Alumni Job') : 'Regular'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Skills Required */}
          <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {t.jobs2?.requiredSkills ?? 'SKILLS / SUBJECTS (COMMA SEPARATED)'}
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
            value={skillsInput}
            onChangeText={setSkillsInput}
            placeholder="e.g. React, Node.js, Git OR Class 9-10 Math, Physics"
            placeholderTextColor={C.textMuted}
          />

          {/* Deadline */}
          <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {t.jobs2.deadlineLabel} (YYYY-MM-DD)
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
            value={deadline}
            onChangeText={setDeadline}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={C.textMuted}
          />

          {/* Quick Deadline Presets */}
          <View style={styles.presetRow}>
            {[
              { label: '+7 Days', days: 7 },
              { label: '+14 Days', days: 14 },
              { label: '+30 Days', days: 30 },
            ].map(p => (
              <TouchableOpacity
                key={p.days}
                style={[styles.presetChip, { backgroundColor: C.surface2, borderColor: C.border }]}
                onPress={() => setDeadline(addDhakaDays(p.days))}
                activeOpacity={0.75}
              >
                <Text style={[styles.presetTxt, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Description */}
          <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {t.jobs2.description}
          </Text>
          <TextInput
            style={[styles.textarea, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
            value={desc}
            onChangeText={setDesc}
            placeholder={t.jobs2.descriptionPlaceholder}
            placeholderTextColor={C.textMuted}
            multiline
            textAlignVertical="top"
          />

          {/* Requirements */}
          <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {t.jobs2.requirements}
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
            value={requirements}
            onChangeText={setRequirements}
            placeholder={t.jobs2.requirementsPlaceholder}
            placeholderTextColor={C.textMuted}
          />

          {/* How to Apply */}
          <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {t.jobs2?.applyTitle ?? 'HOW TO APPLY'}
          </Text>
          <SegControl
            options={APPLY_METHODS}
            value={applyMethod}
            onChange={setApplyMethod}
            C={C}
          />

          {applyMethod === 'email' && (
            <TextInput
              style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium, marginTop: 10 }]}
              value={applyValue}
              onChangeText={setApplyValue}
              placeholder={t.jobs2.applyEmailPlaceholder}
              placeholderTextColor={C.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          )}

          {applyMethod === 'link' && (
            <TextInput
              style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium, marginTop: 10 }]}
              value={applyValue}
              onChangeText={setApplyValue}
              placeholder={t.jobs2.applyLinkPlaceholder}
              placeholderTextColor={C.textMuted}
              autoCapitalize="none"
              keyboardType="url"
            />
          )}

          {applyMethod === 'file' && (
            <View style={{ marginTop: 10 }}>
              {pickedFile ? (
                <View style={[styles.filePickedCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                  <Feather name="file-text" size={20} color={SectorColors.jobs} />
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
                  <Feather name="upload" size={18} color={C.brand} />
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
                <Icon name="check" size={18} color={canSubmit ? '#fff' : C.textMuted} />
                <Text style={[styles.submitText, { color: canSubmit ? '#fff' : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                  {t.jobs2?.postListing ?? 'Post Listing'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 36 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  scroll: { paddingTop: 12, paddingBottom: 24 } as ViewStyle,

  postAsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 } as ViewStyle,
  postAsChip: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 20, borderWidth: 1 } as ViewStyle,
  postAsChipTxt: { fontSize: 13 } as any,

  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 } as ViewStyle,
  typeGridChip: { width: '31%', minWidth: 95, flexGrow: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, borderWidth: 1 } as ViewStyle,
  typeGridTxt: { fontSize: 12.5 } as any,

  deptChip: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 18, borderWidth: 1 } as ViewStyle,
  deptChipTxt: { fontSize: 12 } as any,

  areaPresetChip: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 14, borderWidth: 1 } as ViewStyle,
  areaPresetTxt: { fontSize: 11.5 } as any,

  semChip: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10, borderWidth: 1 } as ViewStyle,
  semChipTxt: { fontSize: 12 } as any,

  alumniToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 38, marginTop: 4, borderRadius: 10, borderWidth: 1 } as ViewStyle,
  alumniToggleTxt: { fontSize: 12 } as any,

  label: {
    fontSize: 11,
    letterSpacing: 0.7,
    marginBottom: 8,
    marginTop: 18,
    marginLeft: 2,
  } as any,

  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14.5,
  } as any,

  row: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  } as ViewStyle,

  halfField: { flex: 1 } as ViewStyle,

  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  } as ViewStyle,

  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  } as ViewStyle,

  presetTxt: {
    fontSize: 11.5,
  } as any,

  textarea: {
    minHeight: 100,
    borderRadius: 12,
    borderWidth: 1,
    padding: 13,
    fontSize: 14.5,
    lineHeight: 22,
  } as any,

  filePickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 12,
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
    borderRadius: 12,
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
    gap: 8,
    height: 52,
    borderRadius: 14,
    marginTop: 22,
  } as ViewStyle,

  submitText: { fontSize: 15 } as any,
});
