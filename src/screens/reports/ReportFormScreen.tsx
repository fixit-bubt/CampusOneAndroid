// Matches design screens-reportform.jsx — ReportForm
import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout } from '../../theme';
import { createReport } from '../../services/reportsService';
import type { Report } from '../../types/database';

// Issue categories from database schema
const ISSUE_CATS: { id: Report['category']; icon: string; fg: string; en: string }[] = [
  { id: 'Electrical',       icon: 'bolt',    fg: '#e08a2b', en: 'Electrical' },
  { id: 'Plumbing',         icon: 'pulse',   fg: '#2ba0c9', en: 'Plumbing' },
  { id: 'Cleanliness',      icon: 'trash',   fg: '#2e9e63', en: 'Cleanliness' },
  { id: 'IT / Network',     icon: 'wifi',    fg: '#4f6bed', en: 'IT / Network' },
  { id: 'Furniture',        icon: 'chair',   fg: '#8b5cf0', en: 'Furniture' },
  { id: 'Safety / Security',icon: 'shield',  fg: '#d63d35', en: 'Safety' },
  { id: 'Other',            icon: 'dots',    fg: '#5b6b86', en: 'Other' },
];

function hexAlpha(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
function lightenHex(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.round(r + (255 - r) * 0.34);
  g = Math.round(g + (255 - g) * 0.34);
  b = Math.round(b + (255 - b) * 0.34);
  return `rgb(${r},${g},${b})`;
}

export function ReportFormScreen({ navigation }: any) {
  const { C, isDark } = useTheme();

  const [cat, setCat]     = useState<Report['category'] | null>(null);
  const [title, setTitle] = useState('');
  const [loc, setLoc]     = useState('');
  const [desc, setDesc]   = useState('');
  const [busy, setBusy]   = useState(false);
  const [err, setErr]     = useState('');

  const ok = !!cat && title.trim().length > 0;

  async function handleSubmit() {
    if (!ok || busy || !cat) return;
    setBusy(true);
    setErr('');
    const [building, room] = loc.includes('·') ? loc.split('·').map(s => s.trim()) : [loc.trim(), undefined];
    const res = await createReport({
      category: cat,
      description: [title.trim(), desc.trim()].filter(Boolean).join('\n'),
      building: building || 'Unknown',
      room: room,
    });
    setBusy(false);
    if (res.ok) {
      navigation.goBack();
    } else {
      setErr(res.error ?? 'Failed to submit report');
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title="Report an Issue" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingHorizontal: Layout.screenPadding }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Category picker */}
          <Text style={[styles.label, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>
            Category
          </Text>
          <View style={styles.catGrid}>
            {ISSUE_CATS.map(c => {
              const on = cat === c.id;
              const fg = isDark ? lightenHex(c.fg) : c.fg;
              const bg = hexAlpha(c.fg, isDark ? 0.18 : 0.1);
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    styles.catOpt,
                    {
                      backgroundColor: on ? bg : C.surface,
                      borderColor: on ? fg : C.border,
                      borderWidth: on ? 1.5 : 1,
                    },
                  ]}
                  onPress={() => setCat(c.id)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.catIcon, { backgroundColor: bg }]}>
                    <Icon name={c.icon} size={16} color={fg} />
                  </View>
                  <Text style={[styles.catLabel, { color: on ? fg : C.text2, fontFamily: FontFamily.jakartaBold }]}>
                    {c.en}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Title */}
          <Text style={[styles.label, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>
            Title
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaRegular }]}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Broken tube light — 3rd floor"
            placeholderTextColor={C.textMuted}
          />

          {/* Location */}
          <Text style={[styles.label, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>
            Location
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaRegular }]}
            value={loc}
            onChangeText={setLoc}
            placeholder="e.g. Library · Room 302"
            placeholderTextColor={C.textMuted}
          />

          {/* Description */}
          <Text style={[styles.label, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>
            Description{' '}
            <Text style={[styles.optLabel, { color: C.textMuted }]}>· Optional</Text>
          </Text>
          <TextInput
            style={[styles.textarea, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaRegular }]}
            value={desc}
            onChangeText={setDesc}
            placeholder="Describe the issue in detail…"
            placeholderTextColor={C.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          {/* Photo placeholder */}
          <Text style={[styles.label, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>
            Photo{' '}
            <Text style={[styles.optLabel, { color: C.textMuted }]}>· Optional</Text>
          </Text>
          <TouchableOpacity
            style={[styles.photoPicker, { backgroundColor: C.surface, borderColor: C.border }]}
            activeOpacity={0.75}
          >
            <Icon name="found" size={18} color={C.textMuted} />
            <Text style={[styles.photoTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              Add photo
            </Text>
          </TouchableOpacity>

          {/* Error */}
          {!!err && (
            <Text style={[styles.errText, { color: C.danger, fontFamily: FontFamily.jakartaMedium }]}>
              {err}
            </Text>
          )}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: C.brand, opacity: ok ? 1 : 0.5, marginTop: 22 }]}
            onPress={handleSubmit}
            disabled={!ok || busy}
            activeOpacity={0.85}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.btnRow}>
                <Icon name="check" size={18} color="#fff" />
                <Text style={[styles.btnTxt, { fontFamily: FontFamily.jakartaBold }]}>Submit Report</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={{ height: 28 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  content: { paddingTop: 12, paddingBottom: 20 } as ViewStyle,

  label: { fontSize: 13, marginBottom: 8, marginTop: 16 } as any,
  optLabel: { fontSize: 12, fontWeight: '500' } as any,

  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  } as ViewStyle,

  catOpt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 13,
  } as ViewStyle,

  catIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  catLabel: { fontSize: 13 } as any,

  input: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    fontSize: 15,
  } as any,

  textarea: {
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingTop: 13,
    fontSize: 15,
    minHeight: 110,
  } as any,

  photoPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  } as ViewStyle,

  photoTxt: { fontSize: 14 } as any,
  errText: { fontSize: 13, marginTop: 8 } as any,

  submitBtn: {
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 8 } as ViewStyle,
  btnTxt: { fontSize: 15, color: '#fff' } as any,
});
