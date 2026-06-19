import { useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform,
  StyleSheet, type ViewStyle,
} from 'react-native';
import { useToast } from '../../components/ui/Toast';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useT } from '../../i18n';
import { isValidDate } from '../../utils/format';
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
  { id: 'part_time',  label: 'Part-time' },
  { id: 'full_time',  label: 'Full-time' },
];

const MODES: { id: Job['work_mode']; label: string }[] = [
  { id: 'onsite', label: 'On-site' },
  { id: 'remote', label: 'Remote' },
  { id: 'hybrid', label: 'Hybrid' },
];

export function JobPostScreen({ navigation }: any) {
  const { C } = useTheme();
  const t = useT();
  const { user, profile } = useAuth();

  const toast = useToast();
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [jobType, setJobType] = useState<Job['job_type']>('internship');
  const [workMode, setWorkMode] = useState<Job['work_mode']>('onsite');
  const [location, setLocation] = useState('');
  const [salary, setSalary] = useState('');
  const [deadline, setDeadline] = useState('');
  const [desc, setDesc] = useState('');
  const [requirements, setRequirements] = useState('');
  const [applyMethod, setApplyMethod] = useState<'email' | 'link'>('email');
  const [applyValue, setApplyValue] = useState('');
  const [loading, setLoading] = useState(false);

  // Match the DB CHECK minimums (company>=2, title>=3, description>=10) and
  // apply_value (required by DB for both email and link methods).
  const canSubmit =
    company.trim().length >= 2 &&
    role.trim().length >= 3 &&
    desc.trim().length >= 10 &&
    applyValue.trim().length > 0;

  // Today's date in Asia/Dhaka (UTC+6). en-CA yields YYYY-MM-DD. Using the UTC
  // date here would be a day behind during 00:00-05:59 Dhaka and the RLS
  // deadline check (>= now() AT TIME ZONE 'Asia/Dhaka') would reject the row.
  const dhakaToday = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(new Date());

  async function handleSubmit() {
    if (!canSubmit || !user || loading) return;
    // Free-text deadline must be a real, non-past date or the NOT NULL date column
    // / RLS deadline check rejects it with a raw Postgres error.
    if (deadline.trim() && !isValidDate(deadline)) {
      toast({ type: 'error', title: t.common.error, message: t.common.invalidDate });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from('jobs').insert({
        company:      company.trim(),
        title:        role.trim(),
        job_type:     jobType,
        work_mode:    workMode,
        location:     location.trim() || 'Dhaka',
        stipend:      salary.trim() || null,
        deadline:     deadline.trim() || dhakaToday,
        description:  desc.trim(),
        requirements: requirements.trim() || null,
        apply_method: applyMethod as Job['apply_method'],
        apply_value:  applyValue.trim() || null,
        posted_by:    user.id,
        posted_by_name: profile?.full_name ?? '',
      });
      if (error) throw error;
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

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.jobs2.company}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
          value={company}
          onChangeText={setCompany}
          placeholder={t.jobs2.companyPlaceholder}
          placeholderTextColor={C.textMuted}
        />

        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.jobs2.roleTitle}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
          value={role}
          onChangeText={setRole}
          placeholder={t.jobs2.roleTitlePlaceholder}
          placeholderTextColor={C.textMuted}
        />

        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.jobs2.type}</Text>
        <SegControl options={JOB_TYPES} value={jobType} onChange={setJobType} C={C} />

        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.jobs2.workMode}</Text>
        <SegControl options={MODES} value={workMode} onChange={setWorkMode} C={C} />

        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.jobs2.location}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
          value={location}
          onChangeText={setLocation}
          placeholder={t.jobs2.locationPlaceholder}
          placeholderTextColor={C.textMuted}
        />

        <View style={styles.row}>
          <View style={styles.halfField}>
            <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold, marginTop: 0 }]}>{t.jobs2.salaryLabel}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
              value={salary}
              onChangeText={setSalary}
              placeholder={t.jobs2.salaryPlaceholder}
              placeholderTextColor={C.textMuted}
            />
          </View>
          <View style={styles.halfField}>
            <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold, marginTop: 0 }]}>{t.jobs2.deadlineLabel}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
              value={deadline}
              onChangeText={setDeadline}
              placeholder={t.jobs2.deadlinePlaceholder}
              placeholderTextColor={C.textMuted}
            />
          </View>
        </View>

        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.jobs2.description}</Text>
        <TextInput
          style={[styles.textarea, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
          value={desc}
          onChangeText={setDesc}
          placeholder={t.jobs2.descriptionPlaceholder}
          placeholderTextColor={C.textMuted}
          multiline
          textAlignVertical="top"
        />

        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.jobs2.requirements}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
          value={requirements}
          onChangeText={setRequirements}
          placeholder={t.jobs2.requirementsPlaceholder}
          placeholderTextColor={C.textMuted}
        />

        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>HOW TO APPLY</Text>
        <SegControl
          options={[{ id: 'email' as const, label: 'Email' }, { id: 'link' as const, label: 'Link' }]}
          value={applyMethod}
          onChange={setApplyMethod}
          C={C}
        />
        <TextInput
          style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium, marginTop: 10 }]}
          value={applyValue}
          onChangeText={setApplyValue}
          placeholder={applyMethod === 'email' ? t.jobs2.applyEmailPlaceholder : t.jobs2.applyLinkPlaceholder}
          placeholderTextColor={C.textMuted}
          autoCapitalize="none"
          keyboardType={applyMethod === 'email' ? 'email-address' : 'url'}
        />

        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: canSubmit ? C.brand : C.surface2, opacity: loading ? 0.6 : 1 }]}
          onPress={handleSubmit}
          disabled={!canSubmit || loading}
          activeOpacity={0.8}
        >
          <Icon name="check" size={18} color={canSubmit ? '#fff' : C.textMuted} />
          <Text style={[styles.submitText, { color: canSubmit ? '#fff' : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            Post Listing
          </Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>
      </KeyboardAvoidingView>
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

  textarea: {
    minHeight: 100,
    borderRadius: 12,
    borderWidth: 1,
    padding: 13,
    fontSize: 14.5,
    lineHeight: 22,
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
