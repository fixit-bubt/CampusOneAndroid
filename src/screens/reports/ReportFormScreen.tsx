import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
  Image, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout , SectorColors, Accent } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useT } from '../../i18n';
import { createReport } from '../../services/reportsService';
import { useAuth } from '../../store/authStore';
import { useToast } from '../../components/ui/Toast';
import { uploadFile } from '../../utils/storage';
import { BUCKETS } from '../../constants/app';
import type { Report } from '../../types/database';

// Issue categories from database schema
const ISSUE_CATS: { id: Report['category']; icon: string; fg: string; en: string }[] = [
  { id: 'Electrical',       icon: 'bolt',    fg: SectorColors.bus, en: 'Electrical' },
  { id: 'Plumbing',         icon: 'pulse',   fg: SectorColors.study, en: 'Plumbing' },
  { id: 'Cleanliness',      icon: 'trash',   fg: SectorColors.market, en: 'Cleanliness' },
  { id: 'IT / Network',     icon: 'wifi',    fg: SectorColors.reports, en: 'IT / Network' },
  { id: 'Furniture',        icon: 'chair',   fg: SectorColors.clubs, en: 'Furniture' },
  { id: 'Safety / Security',icon: 'shield',  fg: Accent.red, en: 'Safety' },
  { id: 'Other',            icon: 'dots',    fg: Accent.slate, en: 'Other' },
];

type PlaceType = 'Classroom' | 'Lab' | 'Washroom' | 'Library' | 'Corridor/Stairs' | 'Other';
const BUILDINGS = ['1', '2', '3', '4'];
const FLOORS = ['Ground', '1st', '2nd', '3rd', '4th', '5th'];
const PLACES: PlaceType[] = ['Classroom', 'Lab', 'Washroom', 'Library', 'Corridor/Stairs', 'Other'];

function placeLabel(t: any, p: PlaceType): string {
  switch (p) {
    case 'Classroom': return t.reports2.placeClassroom;
    case 'Lab': return t.reports2.placeLab;
    case 'Washroom': return t.reports2.placeWashroom;
    case 'Library': return t.reports2.placeLibrary;
    case 'Corridor/Stairs': return t.reports2.placeCorridor;
    default: return t.reports2.placeOther;
  }
}

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

export function ReportFormScreen({ route, navigation }: any) {
  const { C, isDark } = useTheme();
  const toast = useToast();
  const { user } = useAuth();
  const t = useT();
  const editReportId: string | undefined = route.params?.editReportId;
  const isEdit = !!editReportId;

  const [cat, setCat]       = useState<Report['category'] | null>(null);
  const [title, setTitle]   = useState('');
  const [building, setBuilding] = useState<string | null>(null);
  const [floor, setFloor]       = useState<string | null>(null);
  const [place, setPlace]       = useState<PlaceType | null>(null);
  const [roomNo, setRoomNo]     = useState('');
  const [washGender, setWashGender] = useState<'Male' | 'Female' | null>(null);
  const [locNote, setLocNote]   = useState('');
  const [desc, setDesc]     = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [busy, setBusy]     = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [err, setErr]       = useState('');
  // Opt the report onto the anonymous Campus Issues board (default on; Safety /
  // Security is always private and can never be boarded).
  const [showOnBoard, setShowOnBoard] = useState(true);

  // Pre-fill when editing
  useEffect(() => {
    if (!editReportId) return;
    (async () => {
      const { data } = await supabase.from('reports').select('*').eq('id', editReportId).single();
      if (data) {
        const lines = (data.description ?? '').split('\n');
        setTitle(lines[0] ?? '');
        setDesc(lines.slice(1).join('\n'));
        setCat((data.category as Report['category']) ?? null);
        // Parse the stored "Building N" / "<floor> floor · <place> ..." strings back
        // into the structured fields so an edit round-trips instead of cumulatively
        // corrupting the location (e.g. re-prefixing "Ground floor · Other ·").
        const bMatch = (data.building ?? '').match(/(\d)/);
        setBuilding(bMatch ? bMatch[1] : null);

        const room = (data.room ?? '');
        const fm = room.match(/^(.+?) floor/);
        setFloor(fm && FLOORS.includes(fm[1]) ? fm[1] : 'Ground');
        const rest = room.replace(/^.+? floor\s*/, '').replace(/^·\s*/, '').trim();

        if (rest.startsWith('Washroom')) {
          setPlace('Washroom');
          const g = rest.match(/\((Male|Female)\)/);
          setWashGender(g ? (g[1] as 'Male' | 'Female') : null);
        } else if (rest.startsWith('Classroom') || rest.startsWith('Lab')) {
          const p: PlaceType = rest.startsWith('Classroom') ? 'Classroom' : 'Lab';
          setPlace(p);
          setRoomNo(rest.replace(/^(Classroom|Lab)\s*/, '').trim());
        } else if (rest.startsWith('Corridor')) {
          setPlace('Corridor/Stairs');
        } else if (rest === 'Library') {
          setPlace('Library');
        } else if (rest.startsWith('Other')) {
          setPlace('Other');
          setLocNote(rest.replace(/^Other\s*·?\s*/, '').trim());
        } else {
          setPlace('Other');
          setLocNote(rest);
        }
        if (data.photo_url) setPhotoUri(data.photo_url);
        setShowOnBoard(data.show_on_board !== false);
      }
      setLoading(false);
    })();
  }, [editReportId]);

  const needsRoom = place === 'Classroom' || place === 'Lab';
  const needsGender = place === 'Washroom';
  const locOk = !!building && !!floor && !!place
    && (!needsRoom || roomNo.trim().length > 0)
    && (!needsGender || !!washGender);
  const ok = !!cat && title.trim().length > 0 && locOk;

  async function pickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast({ type: 'info', title: t.reports2.permissionRequired, message: t.reports2.mediaPermissionBody });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  async function handleSubmit() {
    if (!ok || busy || !cat) return;
    setBusy(true);
    setErr('');

    // Upload photo to storage if it's a new local file
    let finalPhotoUrl: string | undefined = undefined;
    if (photoUri) {
      if (photoUri.startsWith('http')) {
        // Already an uploaded URL (editing existing report)
        finalPhotoUrl = photoUri;
      } else {
        // Local file — upload to storage. Strip any ?query/#fragment and only
        // trust a short alphanumeric extension; content:// and extensionless URIs
        // otherwise yield a garbage extension/contentType.
        const rawExt = (photoUri.split(/[#?]/)[0].split('.').pop() ?? '').toLowerCase();
        const ext = /^[a-z0-9]{1,5}$/.test(rawExt) ? rawExt : 'jpg';
        const mime = ext === 'jpg' ? 'jpeg' : ext;
        const remotePath = `reports/${user?.id ?? 'anon'}/${Date.now()}.${ext}`;
        const result = await uploadFile(BUCKETS.photos, photoUri, remotePath, `image/${mime}`);
        if (!result.success) {
          setBusy(false);
          setErr(t.reports2.photoUploadFailed(result.error));
          return;
        }
        finalPhotoUrl = result.url;
      }
    }

    const buildingStr = building ? `Building ${building}` : 'Unknown';
    let roomStr = floor ? `${floor} floor` : '';
    if (place === 'Classroom' || place === 'Lab') roomStr += ` · ${place} ${roomNo.trim()}`;
    else if (place === 'Washroom') roomStr += ` · Washroom (${washGender})`;
    else if (place) roomStr += ` · ${place}${locNote.trim() ? ` · ${locNote.trim()}` : ''}`;
    const payload = {
      category: cat,
      description: [title.trim(), desc.trim()].filter(Boolean).join('\n'),
      building: buildingStr,
      room: roomStr || undefined,
      show_on_board: cat !== 'Safety / Security' && showOnBoard,
      ...(finalPhotoUrl ? { photo_url: finalPhotoUrl } : {}),
    };

    if (isEdit) {
      // .select() so a no-op update (RLS matched 0 rows, e.g. report no longer Open)
      // is caught — a bare update returns error=null even when nothing changed.
      const { data: updated, error } = await supabase
        .from('reports').update(payload).eq('id', editReportId!).select('id');
      setBusy(false);
      if (error) {
        setErr(error.message ?? t.reports2.updateFailed);
      } else if (!updated || updated.length === 0) {
        setErr(t.reports2.updateFailed);
      } else {
        navigation.goBack();
      }
    } else {
      const res = await createReport(payload);
      setBusy(false);
      if (res.ok) {
        navigation.goBack();
      } else {
        setErr(res.error ?? t.reports2.submitFailed);
      }
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <SubBar title={t.reports2.editReport} onBack={() => navigation.goBack()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={C.brand} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title={isEdit ? t.reports2.editReport : t.reports2.reportAnIssue} onBack={() => navigation.goBack()} />
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
            placeholder={t.reports2.titlePlaceholder}
            placeholderTextColor={C.textMuted}
          />

          {/* Location */}
          <Text style={[styles.label, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>
            {t.reports2.locationLabel}
          </Text>

          <Text style={[styles.subLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaSemiBold }]}>{t.reports2.locBuilding}</Text>
          <View style={styles.chipRow}>
            {BUILDINGS.map(b => {
              const on = building === b;
              return (
                <TouchableOpacity key={b} style={[styles.chip, { backgroundColor: on ? C.brand : C.surface, borderColor: on ? C.brand : C.border }]} onPress={() => setBuilding(b)} activeOpacity={0.75}>
                  <Text style={[styles.chipTxt, { color: on ? '#fff' : C.text2, fontFamily: FontFamily.jakartaBold }]}>{b}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.subLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaSemiBold }]}>{t.reports2.locFloor}</Text>
          <View style={styles.chipRow}>
            {FLOORS.map(f => {
              const on = floor === f;
              return (
                <TouchableOpacity key={f} style={[styles.chip, { backgroundColor: on ? C.brand : C.surface, borderColor: on ? C.brand : C.border }]} onPress={() => setFloor(f)} activeOpacity={0.75}>
                  <Text style={[styles.chipTxt, { color: on ? '#fff' : C.text2, fontFamily: FontFamily.jakartaBold }]}>{f}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.subLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaSemiBold }]}>{t.reports2.locPlace}</Text>
          <View style={styles.chipRow}>
            {PLACES.map(p => {
              const on = place === p;
              return (
                <TouchableOpacity key={p} style={[styles.chip, { backgroundColor: on ? C.brand : C.surface, borderColor: on ? C.brand : C.border }]} onPress={() => setPlace(p)} activeOpacity={0.75}>
                  <Text style={[styles.chipTxt, { color: on ? '#fff' : C.text2, fontFamily: FontFamily.jakartaBold }]}>{placeLabel(t, p)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {(place === 'Classroom' || place === 'Lab') && (
            <TextInput
              style={[styles.input, { marginTop: 10, backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaRegular }]}
              value={roomNo}
              onChangeText={setRoomNo}
              placeholder={t.reports2.locRoomPlaceholder}
              placeholderTextColor={C.textMuted}
              keyboardType="numbers-and-punctuation"
            />
          )}
          {place === 'Washroom' && (
            <View style={[styles.chipRow, { marginTop: 10 }]}>
              {(['Male', 'Female'] as const).map(g => {
                const on = washGender === g;
                return (
                  <TouchableOpacity key={g} style={[styles.chip, { backgroundColor: on ? C.brand : C.surface, borderColor: on ? C.brand : C.border }]} onPress={() => setWashGender(g)} activeOpacity={0.75}>
                    <Text style={[styles.chipTxt, { color: on ? '#fff' : C.text2, fontFamily: FontFamily.jakartaBold }]}>{g === 'Male' ? t.reports2.genderMale : t.reports2.genderFemale}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          {(place === 'Library' || place === 'Corridor/Stairs' || place === 'Other') && (
            <TextInput
              style={[styles.input, { marginTop: 10, backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaRegular }]}
              value={locNote}
              onChangeText={setLocNote}
              placeholder={t.reports2.locDetailPlaceholder}
              placeholderTextColor={C.textMuted}
            />
          )}

          {/* Description */}
          <Text style={[styles.label, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>
            Description{' '}
            <Text style={[styles.optLabel, { color: C.textMuted }]}>· Optional</Text>
          </Text>
          <TextInput
            style={[styles.textarea, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaRegular }]}
            value={desc}
            onChangeText={setDesc}
            placeholder={t.reports2.descriptionPlaceholder}
            placeholderTextColor={C.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          {/* Photo picker */}
          <Text style={[styles.label, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>
            Photo{' '}
            <Text style={[styles.optLabel, { color: C.textMuted }]}>· Optional</Text>
          </Text>
          {photoUri ? (
            <View style={styles.photoPreviewWrap}>
              <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
              <TouchableOpacity
                style={[styles.photoRemoveBtn, { backgroundColor: C.surface, borderColor: C.border }]}
                onPress={() => setPhotoUri(null)}
                activeOpacity={0.75}
              >
                <Icon name="x" size={15} color={C.text2} />
                <Text style={[styles.photoTxt, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>{t.reports2.remove}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.photoPicker, { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={pickPhoto}
              activeOpacity={0.75}
            >
              <Icon name="found" size={18} color={C.textMuted} />
              <Text style={[styles.photoTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                Add photo
              </Text>
            </TouchableOpacity>
          )}

          {/* Campus Issues board opt-in */}
          {cat === 'Safety / Security' ? (
            <View style={[styles.boardNotice, { backgroundColor: C.surface2, borderColor: C.border }]}>
              <Icon name="shield" size={16} color={C.textMuted} />
              <Text style={[styles.boardNoticeTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                {t.campusIssues.alwaysPrivate}
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.boardCard, { backgroundColor: C.surface, borderColor: showOnBoard ? C.brand : C.border }]}
              onPress={() => setShowOnBoard(v => !v)}
              activeOpacity={0.75}
            >
              <View style={[styles.checkbox, { backgroundColor: showOnBoard ? C.brand : 'transparent', borderColor: showOnBoard ? C.brand : C.border }]}>
                {showOnBoard && <Icon name="check" size={13} color="#fff" />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.boardTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {t.campusIssues.optInLabel}
                </Text>
                <Text style={[styles.boardDesc, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                  {t.campusIssues.optInDesc}
                </Text>
              </View>
            </TouchableOpacity>
          )}

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
                <Text style={[styles.btnTxt, { fontFamily: FontFamily.jakartaBold }]}>{isEdit ? t.reports2.updateReport : t.reports2.submitReport}</Text>
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
  subLabel: { fontSize: 12, marginTop: 12, marginBottom: 6 } as any,
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 } as ViewStyle,
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 11, borderWidth: 1.5 } as ViewStyle,
  chipTxt: { fontSize: 13 } as any,

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

  photoPreviewWrap: { gap: 8 } as ViewStyle,
  photoPreview: { width: '100%', height: 180, borderRadius: 14 } as any,
  photoRemoveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
  } as ViewStyle,

  photoTxt: { fontSize: 14 } as any,
  errText: { fontSize: 13, marginTop: 8 } as any,

  boardCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    padding: 13,
    borderRadius: 14,
    borderWidth: 1.5,
    marginTop: 18,
  } as ViewStyle,
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  } as ViewStyle,
  boardTitle: { fontSize: 13.5 } as any,
  boardDesc: { fontSize: 12, marginTop: 3, lineHeight: 16 } as any,
  boardNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    padding: 13,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 18,
  } as ViewStyle,
  boardNoticeTxt: { fontSize: 12.5, flex: 1 } as any,

  submitBtn: {
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 8 } as ViewStyle,
  btnTxt: { fontSize: 15, color: '#fff' } as any,
});
