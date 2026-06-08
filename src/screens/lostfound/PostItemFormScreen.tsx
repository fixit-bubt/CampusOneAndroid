// Matches design screens-lostfound.jsx — PostItemForm
import { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout } from '../../theme';
import { supabase } from '../../lib/supabase';
import type { LostFoundItem } from '../../types/database';

const LF_CATS: { id: LostFoundItem['category']; icon: string; fg: string; en: string }[] = [
  { id: 'Personal',    icon: 'user',   fg: '#4f6bed', en: 'Personal' },
  { id: 'Electronics', icon: 'phone',  fg: '#e08a2b', en: 'Electronics' },
  { id: 'Documents',   icon: 'layers', fg: '#12915e', en: 'Documents' },
  { id: 'Other',       icon: 'inbox',  fg: '#5b6b86', en: 'Other' },
];

function hexAlpha(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export function PostItemFormScreen({ navigation }: any) {
  const { C, isDark } = useTheme();
  const [type, setType] = useState<'Lost' | 'Found'>('Found');
  const [cat, setCat]   = useState<LostFoundItem['category'] | null>(null);
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
    const { error } = await supabase.from('lost_found_items').insert({
      type,
      title: title.trim(),
      category: cat,
      description: desc.trim() || title.trim(),
      location: loc.trim() || 'Campus',
      item_date: new Date().toISOString().split('T')[0],
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
    } else {
      navigation.goBack();
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title="Post Item" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingHorizontal: Layout.screenPadding }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Type toggle: Lost / Found */}
          <Text style={[styles.label, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold, marginTop: 4 }]}>
            Type
          </Text>
          <View style={[styles.typeToggle, { backgroundColor: C.surface2, borderColor: C.border }]}>
            {(['Lost', 'Found'] as const).map(t => (
              <TouchableOpacity
                key={t}
                style={[
                  styles.typeBtn,
                  type === t && {
                    backgroundColor: C.surface,
                    shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2,
                  },
                ]}
                onPress={() => setType(t)}
                activeOpacity={0.75}
              >
                <View style={[styles.typeDot, { backgroundColor: t === 'Lost' ? '#d63d35' : '#12915e' }]} />
                <Text style={[styles.typeTxt, { color: type === t ? C.text : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Category */}
          <Text style={[styles.label, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>
            Category
          </Text>
          <View style={styles.catGrid}>
            {LF_CATS.map(c => {
              const on = cat === c.id;
              const fg = c.fg;
              const bg = hexAlpha(c.fg, isDark ? 0.18 : 0.1);
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.catOpt, { backgroundColor: on ? bg : C.surface, borderColor: on ? fg : C.border, borderWidth: on ? 1.5 : 1 }]}
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

          {/* Item name */}
          <Text style={[styles.label, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>Item Name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaRegular }]}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Black iPhone 13"
            placeholderTextColor={C.textMuted}
          />

          {/* Location */}
          <Text style={[styles.label, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>Location</Text>
          <TextInput
            style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaRegular }]}
            value={loc}
            onChangeText={setLoc}
            placeholder="e.g. Library · 2nd floor"
            placeholderTextColor={C.textMuted}
          />

          {/* Description */}
          <Text style={[styles.label, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>Description</Text>
          <TextInput
            style={[styles.textarea, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaRegular }]}
            value={desc}
            onChangeText={setDesc}
            placeholder="Describe the item in detail…"
            placeholderTextColor={C.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          {!!err && <Text style={[styles.errText, { color: C.danger }]}>{err}</Text>}

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
                <Text style={[styles.btnTxt, { fontFamily: FontFamily.jakartaBold }]}>Post Item</Text>
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

  typeToggle: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 5,
    gap: 5,
  } as ViewStyle,

  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
  } as ViewStyle,

  typeDot: { width: 8, height: 8, borderRadius: 4 } as ViewStyle,
  typeTxt: { fontSize: 14 } as any,

  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 } as ViewStyle,

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
