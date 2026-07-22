import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout , SectorColors, Accent } from '../../theme';
import { supabase } from '../../lib/supabase';
import { localToday } from '../../utils/format';
import { rankMatches, type MatchItem } from '../../utils/lostFoundMatch';
import type { LostFoundItem } from '../../types/database';
import { useT } from '../../i18n';

const LF_CATS: { id: LostFoundItem['category']; icon: string; fg: string; en: string }[] = [
  { id: 'Personal',    icon: 'user',   fg: Accent.blue, en: 'Personal' },
  { id: 'Electronics', icon: 'phone',  fg: SectorColors.lostfound, en: 'Electronics' },
  { id: 'Documents',   icon: 'layers', fg: Accent.green, en: 'Documents' },
  { id: 'Other',       icon: 'inbox',  fg: Accent.slate, en: 'Other' },
];

function hexAlpha(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export function PostItemFormScreen({ route, navigation }: any) {
  const { C, isDark } = useTheme();
  const { user } = useAuth();
  const t = useT();
  const editId: string | undefined = route.params?.itemId;
  const isEdit = !!editId;

  const [type, setType] = useState<'Lost' | 'Found'>('Found');
  const [cat, setCat]   = useState<LostFoundItem['category'] | null>(null);
  const [title, setTitle] = useState('');
  const [loc, setLoc]     = useState('');
  const [desc, setDesc]   = useState('');
  const [busy, setBusy]   = useState(false);
  const [err, setErr]     = useState('');
  const [matches, setMatches] = useState<MatchItem[]>([]);

  // Pre-fill fields when editing an existing item
  useEffect(() => {
    if (!editId) return;
    (async () => {
      const { data } = await supabase
        .from('lost_found_items')
        .select('type, category, title, location, description')
        .eq('id', editId)
        .single();
      if (data) {
        setType(data.type as 'Lost' | 'Found');
        setCat(data.category as LostFoundItem['category']);
        setTitle(data.title ?? '');
        setLoc(data.location ?? '');
        setDesc(data.description ?? '');
      }
    })();
  }, [editId]);

  // Pre-post hint: once a category and a 3+ char name exist, surface similar
  // opposite-type open items so a return/duplicate isn't missed. Debounced.
  useEffect(() => {
    const q = title.trim();
    if (!cat || q.length < 3 || !user) { setMatches([]); return; }
    const oppType = type === 'Lost' ? 'Found' : 'Lost';
    // `cancelled` covers a request already in flight — clearTimeout alone only
    // cancels a still-pending debounce, so a slow older response could land last.
    let cancelled = false;
    const handle = setTimeout(async () => {
      const { data } = await supabase
        .from('lost_found_items')
        .select('id, title, description, type, category, status, created_at, poster_id, location')
        .eq('type', oppType)
        .eq('category', cat)
        .eq('status', 'Open')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(40);
      if (cancelled) return;
      const ranked = rankMatches({ title: q, description: desc, poster_id: user.id }, (data ?? []) as MatchItem[]);
      setMatches(editId ? ranked.filter(m => m.id !== editId) : ranked);
    }, 350);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [cat, title, desc, type, user, editId]);

  const ok = !!cat && title.trim().length > 0;

  async function handleSubmit() {
    if (!ok || busy || !cat || !user) return;
    setBusy(true);
    setErr('');
    let error: any;
    if (isEdit) {
      ({ error } = await supabase
        .from('lost_found_items')
        .update({
          type,
          title:       title.trim(),
          category:    cat,
          description: desc.trim() || title.trim(),
          location:    loc.trim() || 'Campus',
        })
        .eq('id', editId));
    } else {
      ({ error } = await supabase.from('lost_found_items').insert({
        type,
        title:       title.trim(),
        category:    cat,
        description: desc.trim() || title.trim(),
        location:    loc.trim() || 'Campus',
        item_date:   localToday(),
        status:      'Open',
        poster_id:   user.id,
      }));
    }
    setBusy(false);
    if (error) {
      setErr(error.message);
    } else {
      navigation.goBack();
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title={isEdit ? t.lf.editItem : t.lf.postItem} onBack={() => navigation.goBack()} />
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
                <View style={[styles.typeDot, { backgroundColor: t === 'Lost' ? C.danger : C.success }]} />
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
          <Text style={[styles.label, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>{t.lf.itemName}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaRegular }]}
            value={title}
            onChangeText={setTitle}
            placeholder={t.lf.itemNamePlaceholder}
            placeholderTextColor={C.textMuted}
          />

          {/* Pre-post match hint */}
          {matches.length > 0 && (
            <View style={[styles.matchWrap, { backgroundColor: C.surface2, borderColor: C.border }]}>
              <Text style={[styles.matchHead, { color: C.text2, fontFamily: FontFamily.jakartaExtraBold }]}>
                {t.lostfound.possibleMatches.toUpperCase()}
              </Text>
              <Text style={[styles.matchSub2, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                {t.lostfound.possibleMatchesSub}
              </Text>
              {matches.map(m => {
                const mc = LF_CATS.find(c => c.id === m.category) ?? LF_CATS[LF_CATS.length - 1];
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={styles.matchRow}
                    onPress={() => navigation.navigate('LostFoundDetail', { itemId: m.id })}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.matchIcon, { backgroundColor: hexAlpha(mc.fg, 0.14) }]}>
                      <Icon name={mc.icon} size={15} color={mc.fg} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.matchName, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>{m.title}</Text>
                      <Text style={[styles.matchLoc, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>{m.location}</Text>
                    </View>
                    <Icon name="chevR" size={16} color={C.textMuted} />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Location */}
          <Text style={[styles.label, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>{t.lf.locationLabel}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaRegular }]}
            value={loc}
            onChangeText={setLoc}
            placeholder={t.lf.locationPlaceholder}
            placeholderTextColor={C.textMuted}
          />

          {/* Description */}
          <Text style={[styles.label, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>{t.lf.descriptionLabel}</Text>
          <TextInput
            style={[styles.textarea, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaRegular }]}
            value={desc}
            onChangeText={setDesc}
            placeholder={t.lf.descriptionPlaceholder}
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
                <Text style={[styles.btnTxt, { fontFamily: FontFamily.jakartaBold }]}>{isEdit ? t.lf.saveChanges : t.lf.postItem}</Text>
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

  matchWrap: { marginTop: 14, borderRadius: 14, borderWidth: 1, padding: 12 } as ViewStyle,
  matchHead: { fontSize: 11, letterSpacing: 0.6 } as any,
  matchSub2: { fontSize: 12, marginTop: 3, marginBottom: 6, lineHeight: 16 } as any,
  matchRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 8 } as ViewStyle,
  matchIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  matchName: { fontSize: 13.5 } as any,
  matchLoc: { fontSize: 11.5, marginTop: 1 } as any,

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
