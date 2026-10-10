import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Image,
  TextInput, KeyboardAvoidingView, ActivityIndicator, Modal,
  type ViewStyle, type TextStyle,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout, SectorColors, Accent, pillBg } from '../../theme';
import { supabase } from '../../lib/supabase';
import { localToday } from '../../utils/format';
import { rankMatches, type MatchItem } from '../../utils/lostFoundMatch';
import { uploadPhoto } from '../../utils/storage';
import { getCache, setCache, CacheKeys } from '../../services/cacheService';
import type { LostFoundItem } from '../../types/database';
import { useT } from '../../i18n';

const LF_CATS: { id: LostFoundItem['category']; icon: string; fg: string; en: string }[] = [
  { id: 'Personal',    icon: 'user',   fg: Accent.blue, en: 'Personal' },
  { id: 'Electronics', icon: 'phone',  fg: SectorColors.lostfound, en: 'Electronics' },
  { id: 'Documents',   icon: 'layers', fg: Accent.green, en: 'Documents' },
  { id: 'Other',       icon: 'inbox',  fg: Accent.slate, en: 'Other' },
];

const QUICK_LOCATIONS = [
  'Library',
  'Cafeteria',
  'Building 2',
  'Room 402',
  'Exam Hall',
  'Mosque',
  'Computer Lab',
  'Campus Grounds',
];

function hexAlpha(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export function PostItemFormScreen({ route, navigation }: any) {
  const { C, isDark } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
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
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);
  const [photoPickerVisible, setPhotoPickerVisible] = useState(false);
  const [matches, setMatches] = useState<MatchItem[]>([]);

  // Pre-fill fields when editing an existing item
  useEffect(() => {
    if (!editId) return;
    (async () => {
      const { data } = await supabase
        .from('lost_found_items')
        .select('type, category, title, location, description, photo_url')
        .eq('id', editId)
        .single();
      if (data) {
        setType(data.type as 'Lost' | 'Found');
        setCat(data.category as LostFoundItem['category']);
        setTitle(data.title ?? '');
        setLoc(data.location ?? '');
        setDesc(data.description ?? '');
        setExistingPhotoUrl(data.photo_url ?? null);
      }
    })();
  }, [editId]);

  // Pre-post hint: once a category and a 3+ char name exist, surface similar
  // opposite-type open items so a return/duplicate isn't missed. Debounced.
  useEffect(() => {
    const q = title.trim();
    if (!cat || q.length < 3 || !user) { setMatches([]); return; }
    const oppType = type === 'Lost' ? 'Found' : 'Lost';
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

  async function takePhotoWithCamera() {
    setPhotoPickerVisible(false);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setErr('Permission to access camera is required');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  async function pickFromGallery() {
    setPhotoPickerVisible(false);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setErr('Permission to access photo library is required');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  const ok = !!cat && title.trim().length > 0;

  async function handleSubmit() {
    if (!ok || busy || !cat || !user) return;
    setBusy(true);
    setErr('');
    let photoUrl: string | null = existingPhotoUrl;
    if (photoUri) {
      const up = await uploadPhoto(photoUri, 'lostfound', user.id);
      if (!up.success) {
        setBusy(false);
        setErr(t.lf.photoUploadFail || 'Failed to upload photo. Please check your connection and try again.');
        return;
      }
      photoUrl = up.url;
    }

    if (isEdit) {
      const { data, error } = await supabase
        .from('lost_found_items')
        .update({
          type,
          title:       title.trim(),
          category:    cat,
          description: desc.trim() || title.trim(),
          location:    loc.trim() || 'Campus',
          photo_url:   photoUrl,
        })
        .eq('id', editId)
        .select()
        .single();

      setBusy(false);
      if (error) {
        setErr(error.message);
      } else {
        if (data) {
          const cached = await getCache<LostFoundItem[]>(CacheKeys.LOST_FOUND);
          if (cached) {
            await setCache(
              CacheKeys.LOST_FOUND,
              cached.map(item => item.id === editId ? (data as LostFoundItem) : item)
            );
          }
        }
        navigation.goBack();
      }
    } else {
      const { data, error } = await supabase
        .from('lost_found_items')
        .insert({
          type,
          title:       title.trim(),
          category:    cat,
          description: desc.trim() || title.trim(),
          location:    loc.trim() || 'Campus',
          item_date:   localToday(),
          status:      'Open',
          poster_id:   user.id,
          photo_url:   photoUrl,
        })
        .select()
        .single();

      setBusy(false);
      if (error) {
        setErr(error.message);
      } else {
        if (data) {
          const cached = await getCache<LostFoundItem[]>(CacheKeys.LOST_FOUND);
          if (cached) {
            await setCache(
              CacheKeys.LOST_FOUND,
              [data as LostFoundItem, ...cached.filter(i => i.id !== data.id)]
            );
          }
        }
        navigation.goBack();
      }
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title={isEdit ? t.lf.editItem : t.lf.postItem} onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView
          contentContainerStyle={[styles.content, { paddingHorizontal: Layout.screenPadding }]}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Type toggle: Lost / Found */}
          <Text style={[styles.label, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold, marginTop: 4 }]}>
            {t.lf.typeLabel}
          </Text>
          <View style={[styles.typeToggle, { backgroundColor: C.surface2, borderColor: C.border }]}>
            {(['Lost', 'Found'] as const).map(tOpt => {
              const active = type === tOpt;
              const isLost = tOpt === 'Lost';
              const activeBg = isLost ? C.dangerBg : C.successBg;
              const activeBorder = isLost ? C.danger : C.success;
              const activeFg = isLost ? C.danger : C.success;
              return (
                <TouchableOpacity
                  key={tOpt}
                  style={[
                    styles.typeBtn,
                    active && {
                      backgroundColor: activeBg,
                      borderColor: activeBorder,
                      borderWidth: 1.5,
                      elevation: 1,
                    },
                  ]}
                  onPress={() => setType(tOpt)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.typeDot, { backgroundColor: activeFg }]} />
                  <Text style={[styles.typeTxt, { color: active ? activeFg : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                    {tOpt === 'Lost' ? t.lf.lost : t.lf.found}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Category: 2x2 Symmetrical Grid */}
          <Text style={[styles.label, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>
            {t.lf.categoryLabel}
          </Text>
          <View style={styles.catGrid}>
            {LF_CATS.map(c => {
              const on = cat === c.id;
              const fg = c.fg;
              const bg = pillBg(fg, isDark);
              const label = c.id === 'Personal' ? t.lf.catPersonal
                : c.id === 'Electronics' ? t.lf.catElectronics
                : c.id === 'Documents' ? t.lf.catDocuments
                : t.lf.catOther;

              return (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    styles.catCard,
                    {
                      backgroundColor: on ? bg : C.surface,
                      borderColor: on ? fg : C.border,
                      borderWidth: on ? 1.5 : 1,
                    },
                  ]}
                  onPress={() => setCat(c.id)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.catIcon, { backgroundColor: on ? `${fg}28` : bg }]}>
                    <Icon name={c.icon} size={16} color={fg} />
                  </View>
                  <Text style={[styles.catLabel, { color: on ? fg : C.text, fontFamily: FontFamily.jakartaBold }]}>
                    {label}
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

          {/* Pre-post smart match hint */}
          {matches.length > 0 && (
            <View style={[styles.matchWrap, { backgroundColor: isDark ? 'rgba(217, 135, 11, 0.14)' : '#fffbeb', borderColor: Accent.amber }]}>
              <View style={styles.matchHeaderRow}>
                <Feather name="alert-circle" size={15} color={Accent.amber} />
                <Text style={[styles.matchHead, { color: Accent.amber, fontFamily: FontFamily.jakartaExtraBold }]}>
                  {t.lf.possibleMatchAlert.toUpperCase()}
                </Text>
              </View>
              <Text style={[styles.matchSub2, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
                {t.lf.possibleMatchAlertSub}
              </Text>
              {matches.map(m => {
                const mc = LF_CATS.find(c => c.id === m.category) ?? LF_CATS[LF_CATS.length - 1];
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.matchRow, { backgroundColor: C.surface, borderColor: C.border }]}
                    onPress={() => navigation.navigate('LostFoundDetail', { itemId: m.id })}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.matchIcon, { backgroundColor: hexAlpha(mc.fg, 0.14) }]}>
                      <Icon name={mc.icon} size={15} color={mc.fg} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
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

          {/* Quick Location Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.quickLocRow}
          >
            {QUICK_LOCATIONS.map(place => (
              <TouchableOpacity
                key={place}
                style={[
                  styles.quickLocChip,
                  {
                    backgroundColor: loc === place ? (isDark ? 'rgba(255,255,255,0.1)' : C.surface2) : C.surface,
                    borderColor: loc === place ? C.text : C.border,
                  },
                ]}
                onPress={() => setLoc(place)}
                activeOpacity={0.75}
              >
                <Feather name="map-pin" size={11} color={loc === place ? C.text : C.textMuted} />
                <Text style={[styles.quickLocTxt, { color: loc === place ? C.text : C.text2, fontFamily: FontFamily.jakartaMedium }]}>
                  {place}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

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

          {/* Photo upload */}
          <Text style={[styles.label, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>Photo (Optional)</Text>
          {photoUri || existingPhotoUrl ? (
            <View style={[styles.photoCard, { borderColor: C.border, backgroundColor: C.surface }]}>
              <Image source={{ uri: photoUri || existingPhotoUrl! }} style={styles.photoThumb} resizeMode="cover" />
              <View style={styles.photoActions}>
                <TouchableOpacity
                  style={[styles.photoBtn, { backgroundColor: C.surface2 }]}
                  onPress={() => setPhotoPickerVisible(true)}
                  activeOpacity={0.75}
                >
                  <Icon name="image" size={14} color={C.text} />
                  <Text style={[styles.photoBtnTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>Change</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.photoBtn, { backgroundColor: C.dangerBg }]}
                  onPress={() => { setPhotoUri(null); setExistingPhotoUrl(null); }}
                  activeOpacity={0.75}
                >
                  <Icon name="trash" size={14} color={C.danger} />
                  <Text style={[styles.photoBtnTxt, { color: C.danger, fontFamily: FontFamily.jakartaBold }]}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.photoUploadBtn, { borderColor: C.border, backgroundColor: C.surface }]}
              onPress={() => setPhotoPickerVisible(true)}
              activeOpacity={0.75}
            >
              <Feather name="camera" size={18} color={SectorColors.lostfound} />
              <Text style={[styles.photoUploadTxt, { color: C.text, fontFamily: FontFamily.jakartaSemiBold }]}>
                Add Photo (Optional)
              </Text>
            </TouchableOpacity>
          )}

          {!!err && <Text style={[styles.errText, { color: C.danger }]}>{err}</Text>}

          {/* Submit button with dynamic type-aware label & tint */}
          <TouchableOpacity
            style={[
              styles.submitBtn,
              {
                backgroundColor: type === 'Lost' ? C.danger : C.success,
                opacity: ok ? 1 : 0.5,
                marginTop: 22,
              },
            ]}
            onPress={handleSubmit}
            disabled={!ok || busy}
            activeOpacity={0.85}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.btnRow}>
                <Icon name="check" size={18} color="#fff" />
                <Text style={[styles.btnTxt, { fontFamily: FontFamily.jakartaBold }]}>
                  {isEdit ? t.lf.saveChanges : (type === 'Lost' ? t.lf.postLostBtn : t.lf.postFoundBtn)}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={{ height: 28 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Photo Picker Source Modal (Camera vs Gallery) */}
      <Modal
        visible={photoPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPhotoPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.pickerModalOverlay}
          activeOpacity={1}
          onPress={() => setPhotoPickerVisible(false)}
        >
          <View style={[styles.pickerModalSheet, { backgroundColor: C.surface, borderColor: C.border, paddingBottom: Math.max(insets.bottom, 18) }]}>
            <Text style={[styles.pickerModalTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {t.lf.selectPhotoSource}
            </Text>

            <TouchableOpacity
              style={[styles.pickerModalOpt, { backgroundColor: C.surface2 }]}
              onPress={takePhotoWithCamera}
              activeOpacity={0.75}
            >
              <Feather name="camera" size={18} color={SectorColors.lostfound} />
              <Text style={[styles.pickerModalOptTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {t.lf.takePhoto}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.pickerModalOpt, { backgroundColor: C.surface2 }]}
              onPress={pickFromGallery}
              activeOpacity={0.75}
            >
              <Feather name="image" size={18} color={Accent.blue} />
              <Text style={[styles.pickerModalOptTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {t.lf.chooseGallery}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.pickerCancelBtn}
              onPress={() => setPhotoPickerVisible(false)}
              activeOpacity={0.75}
            >
              <Text style={[styles.pickerCancelTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                {t.common.cancel}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  content: { paddingTop: 10, paddingBottom: 24 } as ViewStyle,

  label: { fontSize: 13, marginBottom: 8, marginTop: 16 } as TextStyle,

  typeToggle: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  } as ViewStyle,

  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 10,
    minHeight: 44,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'transparent',
  } as ViewStyle,

  typeDot: { width: 8, height: 8, borderRadius: 4 } as ViewStyle,
  typeTxt: { fontSize: 14 } as TextStyle,

  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  } as ViewStyle,

  catCard: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 14,
  } as ViewStyle,

  catIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  catLabel: { fontSize: 13 } as TextStyle,

  matchWrap: {
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 13,
  } as ViewStyle,
  matchHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  } as ViewStyle,
  matchHead: { fontSize: 12, letterSpacing: 0.5 } as TextStyle,
  matchSub2: { fontSize: 12, marginTop: 4, marginBottom: 8, lineHeight: 17 } as TextStyle,
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 6,
  } as ViewStyle,
  matchIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  matchName: { fontSize: 13.5 } as TextStyle,
  matchLoc: { fontSize: 11.5, marginTop: 1 } as TextStyle,

  input: {
    height: 48,
    borderRadius: 13,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    fontSize: 14.5,
  } as TextStyle,

  quickLocRow: {
    flexDirection: 'row',
    gap: 6,
    paddingTop: 8,
    paddingBottom: 2,
  } as ViewStyle,
  quickLocChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    minHeight: 38,
    borderRadius: 10,
    borderWidth: 1,
  } as ViewStyle,
  quickLocTxt: {
    fontSize: 12,
  } as TextStyle,

  textarea: {
    borderRadius: 13,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingTop: 12,
    fontSize: 14.5,
    minHeight: 100,
  } as TextStyle,

  errText: { fontSize: 13, marginTop: 8 } as TextStyle,

  submitBtn: {
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 8 } as ViewStyle,
  btnTxt: { fontSize: 15, color: '#fff' } as TextStyle,

  photoUploadBtn: {
    height: 50,
    borderRadius: 13,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  } as ViewStyle,
  photoUploadTxt: { fontSize: 13.5 } as TextStyle,

  photoCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  } as ViewStyle,
  photoThumb: {
    width: '100%',
    height: 160,
  } as any,
  photoActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    padding: 10,
  } as ViewStyle,
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 8,
    minHeight: 38,
    borderRadius: 9,
  } as ViewStyle,
  photoBtnTxt: { fontSize: 12 } as TextStyle,

  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    padding: 16,
  } as ViewStyle,
  pickerModalSheet: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    gap: 10,
  } as ViewStyle,
  pickerModalTitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 6,
  } as TextStyle,
  pickerModalOpt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    height: 48,
    borderRadius: 13,
  } as ViewStyle,
  pickerModalOptTxt: {
    fontSize: 14,
  } as TextStyle,
  pickerCancelBtn: {
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 2,
  } as ViewStyle,
  pickerCancelTxt: {
    fontSize: 13.5,
  } as TextStyle,
});
