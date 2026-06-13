// Matches design screens-g.jsx — AnnouncePost
import { useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView,
  StyleSheet, Alert, Switch, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useT } from '../../i18n';
import type { Announcement } from '../../types/database';

const PRIORITIES: { id: Announcement['priority']; label: string }[] = [
  { id: 'Urgent',    label: 'Urgent'    },
  { id: 'Important', label: 'Important' },
  { id: 'General',   label: 'General'   },
];

// Priority accent from theme tokens (dark-mode aware via C)
function priColor(C: any, id: Announcement['priority']): string {
  return id === 'Urgent' ? C.danger : id === 'Important' ? C.warn : C.brand;
}

export function AnnouncePostScreen({ navigation }: any) {
  const { C } = useTheme();
  const { user, profile } = useAuth();
  const t = useT();

  // All hooks must be declared before any early return
  const [title, setTitle] = useState('');
  const [dept, setDept] = useState('');
  const [priority, setPriority] = useState<Announcement['priority']>('General');
  const [body, setBody] = useState('');
  const [pinned, setPinned] = useState(false);
  const [loading, setLoading] = useState(false);

  // Web parity: announcements are admin-only.
  if (profile?.role !== 'admin') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <SubBar title="New Announcement" onBack={() => navigation.goBack()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Icon name="announce" size={36} color={C.textMuted} />
          <Text style={{ color: C.text, fontFamily: FontFamily.jakartaBold, fontSize: 16, marginTop: 14 }}>
            Admin Only
          </Text>
          <Text style={{ color: C.textMuted, fontFamily: FontFamily.jakartaMedium, fontSize: 13.5, marginTop: 8, textAlign: 'center' }}>
            Only admins can post announcements.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const canSubmit = title.trim() && body.trim();

  async function handleSubmit() {
    if (!canSubmit || !user) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('announcements').insert({
        code:       'ANN-' + String(performance.now()),
        title:      title.trim(),
        department: dept.trim() || 'Administration',
        priority,
        body:       body.trim(),
        created_by: user.id,
        pinned:     pinned || priority === 'Urgent',
      });
      if (error) throw error;
      navigation.goBack();
    } catch {
      Alert.alert(t.common.error, t.announce2.postFailed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title="New Announcement" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.announce2.labelTitle}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
          value={title}
          onChangeText={setTitle}
          placeholder={t.announce2.titlePlaceholder}
          placeholderTextColor={C.textMuted}
        />

        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.announce2.labelDepartment}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
          value={dept}
          onChangeText={setDept}
          placeholder={t.announce2.deptPlaceholder}
          placeholderTextColor={C.textMuted}
        />

        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.announce2.labelPriority}</Text>
        <View style={[styles.segRow, { backgroundColor: C.surface2, borderColor: C.border }]}>
          {PRIORITIES.map(p => {
            const on = priority === p.id;
            return (
              <TouchableOpacity
                key={p.id}
                style={[styles.segBtn, on && { backgroundColor: priColor(C, p.id) }]}
                onPress={() => setPriority(p.id)}
                activeOpacity={0.75}
              >
                <Text style={[styles.segTxt, { color: on ? '#fff' : C.text2, fontFamily: FontFamily.jakartaBold }]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.announce2.labelBody}</Text>
        <TextInput
          style={[styles.textarea, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
          value={body}
          onChangeText={setBody}
          placeholder={t.announce2.bodyPlaceholder}
          placeholderTextColor={C.textMuted}
          multiline
          textAlignVertical="top"
        />

        <View style={styles.pinRow}>
          <Text style={[styles.pinLbl, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>
            Pin to top
          </Text>
          <Switch value={pinned} onValueChange={setPinned} trackColor={{ true: C.brand }} />
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: canSubmit ? C.brand : C.surface2, opacity: loading ? 0.6 : 1 }]}
          onPress={handleSubmit}
          disabled={!canSubmit || loading}
          activeOpacity={0.8}
        >
          <Icon name="check" size={18} color={canSubmit ? C.white : C.textMuted} />
          <Text style={[styles.submitText, { color: canSubmit ? C.white : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            Publish
          </Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  scroll: { paddingTop: 12, paddingBottom: 20 } as ViewStyle,
  pinRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 } as ViewStyle,
  pinLbl: { fontSize: 14 } as any,

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

  segRow: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  } as ViewStyle,

  segBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 9,
  } as ViewStyle,

  segTxt: { fontSize: 13.5 } as any,

  textarea: {
    minHeight: 120,
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
