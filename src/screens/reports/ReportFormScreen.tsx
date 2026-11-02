import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { SegmentedTabs, type TabItem } from '../../components/ui/SegmentedTabs';
import { LiquidToggle } from '../../components/ui/LiquidToggle';
import { FontFamily, Layout, SectorColors } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useT } from '../../i18n';
import { createReport } from '../../services/reportsService';
import { useAuth } from '../../store/authStore';
import { useToast } from '../../components/ui/Toast';
import { uploadFile } from '../../utils/storage';
import { BUCKETS } from '../../constants/app';
import type { Report } from '../../types/database';

interface CategoryOption {
  id: Report['category'];
  icon: string;
  fg: string;
  label: string;
  desc: string;
}

const CATEGORIES: CategoryOption[] = [
  { id: 'Electrical', icon: 'bolt', fg: '#f59e0b', label: 'Electrical', desc: 'Fans, tube lights, switches, AC & wiring' },
  { id: 'Plumbing', icon: 'droplets', fg: '#0284c7', label: 'Plumbing', desc: 'Water supply, leaking taps & washrooms' },
  { id: 'Cleanliness', icon: 'sparkles', fg: '#10b981', label: 'Cleanliness', desc: 'Classroom waste, washroom hygiene & bins' },
  { id: 'IT / Network', icon: 'wifi', fg: '#8b5cf6', label: 'IT / Network', desc: 'Wi-Fi routers, projectors & lab PCs' },
  { id: 'Furniture', icon: 'box', fg: '#f97316', label: 'Furniture', desc: 'Benches, desks, chairs & whiteboards' },
  { id: 'Safety / Security', icon: 'shield', fg: '#ef4444', label: 'Safety / Security', desc: 'Broken doors, locks & physical hazards' },
  { id: 'Other', icon: 'sliders', fg: '#64748b', label: 'Other', desc: 'Other physical campus infrastructure' },
];

const BUILDINGS = [
  { id: '1', label: 'Building 1', desc: 'Academic Building & Registrar Office' },
  { id: '2', label: 'Building 2', desc: 'Engineering & Applied Sciences Complex' },
  { id: '3', label: 'Building 3', desc: 'Faculty of Business & Student Cafeteria' },
  { id: '4', label: 'Building 4', desc: 'Central Library & Admin Annex' },
];

const FLOORS = [
  { id: 'Ground', label: 'Ground Floor' },
  { id: '1st', label: '1st Floor' },
  { id: '2nd', label: '2nd Floor' },
  { id: '3rd', label: '3rd Floor' },
  { id: '4th', label: '4th Floor' },
  { id: '5th', label: '5th Floor' },
];

type PlaceType = 'Classroom' | 'Lab' | 'Washroom' | 'Library' | 'Corridor/Stairs' | 'Other';

interface PlaceOption {
  id: PlaceType;
  label: string;
  icon: keyof typeof Feather.glyphMap;
}

const PLACES: PlaceOption[] = [
  { id: 'Classroom', label: 'Classroom', icon: 'book-open' },
  { id: 'Lab', label: 'Computer / Science Lab', icon: 'cpu' },
  { id: 'Washroom', label: 'Washroom / Restroom', icon: 'droplet' },
  { id: 'Library', label: 'Central Library', icon: 'book' },
  { id: 'Corridor/Stairs', label: 'Corridor / Stairs', icon: 'compass' },
  { id: 'Other', label: 'Other Campus Area', icon: 'grid' },
];

export function ReportFormScreen({ route, navigation }: any) {
  const { C, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { user } = useAuth();
  const t = useT();

  const editReportId: string | undefined = route.params?.editReportId;
  const isEdit = !!editReportId;

  const [cat, setCat] = useState<Report['category'] | null>(null);
  const [title, setTitle] = useState('');
  const [building, setBuilding] = useState<string | null>(null);
  const [floor, setFloor] = useState<string | null>(null);
  const [place, setPlace] = useState<PlaceType | null>(null);
  const [roomNo, setRoomNo] = useState('');
  const [washGender, setWashGender] = useState<'Male' | 'Female'>('Male');
  const [locNote, setLocNote] = useState('');
  const [desc, setDesc] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [err, setErr] = useState('');
  const [showOnBoard, setShowOnBoard] = useState(true);

  // Modal visibility states
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [bldgModalOpen, setBldgModalOpen] = useState(false);
  const [floorModalOpen, setFloorModalOpen] = useState(false);
  const [spaceModalOpen, setSpaceModalOpen] = useState(false);

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

        const bMatch = (data.building ?? '').match(/(\d)/);
        setBuilding(bMatch ? bMatch[1] : null);

        const room = data.room ?? '';
        const fm = room.match(/^(.+?) floor/);
        setFloor(fm && FLOORS.some(f => f.id === fm[1]) ? fm[1] : 'Ground');
        const rest = room.replace(/^.+? floor\s*/, '').replace(/^·\s*/, '').trim();

        if (rest.startsWith('Washroom')) {
          setPlace('Washroom');
          const g = rest.match(/\((Male|Female)\)/);
          setWashGender(g ? (g[1] as 'Male' | 'Female') : 'Male');
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

  const selectedCat = useMemo(() => CATEGORIES.find(c => c.id === cat), [cat]);
  const selectedBldg = useMemo(() => BUILDINGS.find(b => b.id === building), [building]);
  const selectedFloor = useMemo(() => FLOORS.find(f => f.id === floor), [floor]);
  const selectedPlace = useMemo(() => PLACES.find(p => p.id === place), [place]);

  const needsRoom = place === 'Classroom' || place === 'Lab';
  const locOk = !!building && !!floor && !!place && (!needsRoom || roomNo.trim().length > 0);
  const canSubmit = !!cat && title.trim().length > 0 && locOk && !busy;

  const washTabs: TabItem<'Male' | 'Female'>[] = useMemo(() => [
    { id: 'Male', label: 'Male Washroom', color: C.brand },
    { id: 'Female', label: 'Female Washroom', color: '#ec4899' },
  ], [C.brand]);

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
    if (!canSubmit || !cat) return;
    setBusy(true);
    setErr('');

    let finalPhotoUrl: string | undefined = undefined;
    if (photoUri) {
      if (photoUri.startsWith('http')) {
        finalPhotoUrl = photoUri;
      } else {
        const remotePath = `reports/${user?.id ?? 'anon'}/${Date.now()}.jpg`;
        const result = await uploadFile(BUCKETS.photos, photoUri, remotePath, 'image/jpeg', true, { preset: 'standard' });
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
    if (place === 'Classroom' || place === 'Lab') {
      roomStr += ` · ${place} ${roomNo.trim()}`;
    } else if (place === 'Washroom') {
      roomStr += ` · Washroom (${washGender})`;
    } else if (place) {
      roomStr += ` · ${place}${locNote.trim() ? ` · ${locNote.trim()}` : ''}`;
    }

    const payload = {
      category: cat,
      description: [title.trim(), desc.trim()].filter(Boolean).join('\n'),
      building: buildingStr,
      room: roomStr || undefined,
      show_on_board: cat !== 'Safety / Security' && showOnBoard,
      ...(finalPhotoUrl ? { photo_url: finalPhotoUrl } : {}),
    };

    if (isEdit) {
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
      <View style={[styles.safe, { backgroundColor: C.bg, paddingTop: insets.top }]}>
        <SubBar title={t.reports2.editReport} onBack={() => navigation.goBack()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={C.brand} size="large" />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.safe, { backgroundColor: C.bg, paddingTop: insets.top }]}>
      <SubBar
        title={isEdit ? t.reports2.editReport : t.reports2.reportAnIssue}
        onBack={() => navigation.goBack()}
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingHorizontal: Layout.screenPadding }]}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* STEP 1: 72dp CATEGORY DROPDOWN BAR */}
          <Text style={[styles.sectionEyebrow, { color: C.text3, fontFamily: FontFamily.jakartaBold }]}>
            1. ISSUE CATEGORY
          </Text>
          <TouchableOpacity
            style={[
              styles.dropdownBar72,
              {
                backgroundColor: C.surface,
                borderColor: C.border,
                borderLeftColor: selectedCat ? C.brand : C.border,
              },
            ]}
            onPress={() => setCatModalOpen(true)}
            activeOpacity={0.75}
          >
            <View style={styles.bar72IconSlot}>
              <Icon
                name={selectedCat ? selectedCat.icon : 'tool'}
                size={32}
                color={selectedCat ? C.brand : C.textMuted}
              />
            </View>
            <View style={styles.bar72Body}>
              <Text style={[styles.bar72Title, { color: selectedCat ? C.text : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                {selectedCat ? selectedCat.label : 'Select Issue Category'}
              </Text>
            </View>
            <Feather name="chevron-down" size={18} color={C.textMuted} />
          </TouchableOpacity>

          {/* STEP 2: 58dp TITLE INPUT */}
          <Text style={[styles.sectionEyebrow, { color: C.text3, fontFamily: FontFamily.jakartaBold, marginTop: 16 }]}>
            2. ISSUE TITLE
          </Text>
          <View style={[styles.inputBox58, { backgroundColor: C.surface, borderColor: C.border }]}>
            <TextInput
              style={[styles.input58, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
              value={title}
              onChangeText={setTitle}
              placeholder={t.reports2.titlePlaceholder ?? 'e.g. Fan 2 not working in Classroom 402'}
              placeholderTextColor={C.textMuted}
            />
          </View>

          {/* STEP 3: LOCATION (THREE 72dp DROPDOWN BARS) */}
          <Text style={[styles.sectionEyebrow, { color: C.text3, fontFamily: FontFamily.jakartaBold, marginTop: 16 }]}>
            3. EXACT CAMPUS LOCATION
          </Text>

          {/* 3a: Building Bar (72dp) */}
          <TouchableOpacity
            style={[
              styles.dropdownBar72,
              {
                backgroundColor: C.surface,
                borderColor: C.border,
                borderLeftColor: selectedBldg ? C.brand : C.border,
                marginBottom: 8,
              },
            ]}
            onPress={() => setBldgModalOpen(true)}
            activeOpacity={0.75}
          >
            <View style={styles.bar72IconSlot}>
              <Feather name="map-pin" size={28} color={selectedBldg ? C.brand : C.textMuted} />
            </View>
            <View style={styles.bar72Body}>
              <Text style={[styles.bar72Title, { color: selectedBldg ? C.text : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                {selectedBldg ? selectedBldg.label : 'Select Building'}
              </Text>
            </View>
            <Feather name="chevron-down" size={18} color={C.textMuted} />
          </TouchableOpacity>

          {/* 3b: Floor Bar (72dp) */}
          <TouchableOpacity
            style={[
              styles.dropdownBar72,
              {
                backgroundColor: C.surface,
                borderColor: C.border,
                borderLeftColor: selectedFloor ? C.brand : C.border,
                marginBottom: 8,
              },
            ]}
            onPress={() => setFloorModalOpen(true)}
            activeOpacity={0.75}
          >
            <View style={styles.bar72IconSlot}>
              <Feather name="layers" size={28} color={selectedFloor ? C.brand : C.textMuted} />
            </View>
            <View style={styles.bar72Body}>
              <Text style={[styles.bar72Title, { color: selectedFloor ? C.text : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                {selectedFloor ? selectedFloor.label : 'Select Floor'}
              </Text>
            </View>
            <Feather name="chevron-down" size={18} color={C.textMuted} />
          </TouchableOpacity>

          {/* 3c: Space Type Bar (72dp) */}
          <TouchableOpacity
            style={[
              styles.dropdownBar72,
              {
                backgroundColor: C.surface,
                borderColor: C.border,
                borderLeftColor: selectedPlace ? C.brand : C.border,
                marginBottom: 8,
              },
            ]}
            onPress={() => setSpaceModalOpen(true)}
            activeOpacity={0.75}
          >
            <View style={styles.bar72IconSlot}>
              <Feather name={selectedPlace ? selectedPlace.icon : 'grid'} size={28} color={selectedPlace ? C.brand : C.textMuted} />
            </View>
            <View style={styles.bar72Body}>
              <Text style={[styles.bar72Title, { color: selectedPlace ? C.text : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                {selectedPlace ? selectedPlace.label : 'Select Space Type'}
              </Text>
            </View>
            <Feather name="chevron-down" size={18} color={C.textMuted} />
          </TouchableOpacity>

          {/* Contextual Space Inputs */}
          {needsRoom && (
            <View style={[styles.inputBox58, { backgroundColor: C.surface, borderColor: C.border, marginBottom: 8 }]}>
              <TextInput
                style={[styles.input58, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                value={roomNo}
                onChangeText={setRoomNo}
                placeholder={t.reports2.locRoomPlaceholder ?? 'Room Number (e.g. 402, Lab 3)'}
                placeholderTextColor={C.textMuted}
                keyboardType="numbers-and-punctuation"
              />
            </View>
          )}

          {place === 'Washroom' && (
            <View style={{ marginBottom: 8 }}>
              <SegmentedTabs
                tabs={washTabs}
                activeTab={washGender}
                onTabChange={setWashGender}
              />
            </View>
          )}

          {(place === 'Library' || place === 'Corridor/Stairs' || place === 'Other') && (
            <View style={[styles.inputBox58, { backgroundColor: C.surface, borderColor: C.border, marginBottom: 8 }]}>
              <TextInput
                style={[styles.input58, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                value={locNote}
                onChangeText={setLocNote}
                placeholder={t.reports2.locDetailPlaceholder ?? 'Extra location detail (e.g. near south stairs)'}
                placeholderTextColor={C.textMuted}
              />
            </View>
          )}

          {/* STEP 4: PHOTO & DETAILS */}
          <Text style={[styles.sectionEyebrow, { color: C.text3, fontFamily: FontFamily.jakartaBold, marginTop: 16 }]}>
            4. DETAILS & PHOTO PROOF (OPTIONAL)
          </Text>

          <TextInput
            style={[styles.textarea, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
            value={desc}
            onChangeText={setDesc}
            placeholder={t.reports2.descriptionPlaceholder ?? 'Describe the issue or exact spot in detail…'}
            placeholderTextColor={C.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          {photoUri ? (
            <View style={[styles.photoPreviewCard, { backgroundColor: C.surface, borderColor: C.border }]}>
              <Image source={{ uri: photoUri }} style={styles.photoImg} resizeMode="cover" />
              <TouchableOpacity
                style={[styles.photoDeleteBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
                onPress={() => setPhotoUri(null)}
                activeOpacity={0.75}
              >
                <Feather name="trash-2" size={15} color={C.danger} />
                <Text style={[styles.photoDeleteTxt, { color: C.danger, fontFamily: FontFamily.jakartaBold }]}>
                  {t.reports2.remove ?? 'Remove Photo'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.photoPickerBar72, { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={pickPhoto}
              activeOpacity={0.75}
            >
              <View style={styles.bar72IconSlot}>
                <Feather name="camera" size={26} color={C.textMuted} />
              </View>
              <View style={styles.bar72Body}>
                <Text style={[styles.bar72Title, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {t.reports2.addPhoto ?? 'Attach Photo Proof'}
                </Text>
              </View>
              <Feather name="plus" size={18} color={C.textMuted} />
            </TouchableOpacity>
          )}

          {/* STEP 5: VISIBILITY ON CAMPUS ISSUES BOARD */}
          {cat !== 'Safety / Security' && (
            <View style={[styles.visibilityCard, { backgroundColor: C.surface, borderColor: C.border }]}>
              <View style={styles.visibilityBody}>
                <Text style={[styles.visibilityTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {t.campusIssues.optInLabel ?? 'Show on Campus Issues Board'}
                </Text>
                <Text style={[styles.visibilityDesc, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]}>
                  {t.campusIssues.optInDesc ?? 'Other students can see this issue anonymously and add a "me too" vote.'}
                </Text>
              </View>
              <LiquidToggle
                checked={showOnBoard}
                onCheckedChange={setShowOnBoard}
                size="default"
              />
            </View>
          )}

          {err ? (
            <Text style={[styles.errorBanner, { color: C.danger, fontFamily: FontFamily.jakartaSemiBold }]}>
              {err}
            </Text>
          ) : null}

          {/* STEP 6: 58dp FULL-WIDTH SUBMIT BUTTON */}
          <TouchableOpacity
            style={[
              styles.submitBtn58,
              {
                backgroundColor: C.brand,
                opacity: canSubmit ? 1 : 0.45,
              },
            ]}
            onPress={handleSubmit}
            disabled={!canSubmit}
            activeOpacity={0.85}
          >
            {busy ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={[styles.submitBtnTxt, { color: '#ffffff', fontFamily: FontFamily.jakartaBold }]}>
                {isEdit ? (t.reports2.updateReport ?? 'Update Report') : (t.reports2.submitReport ?? 'Submit Issue Report')}
              </Text>
            )}
          </TouchableOpacity>

          <View style={{ height: 36 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── MODAL 1: CATEGORY SELECTION (58dp Item Rows) ── */}
      <Modal
        visible={catModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCatModalOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setCatModalOpen(false)}>
          <View style={[styles.modalSheet, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
                Select Category
              </Text>
              <TouchableOpacity onPress={() => setCatModalOpen(false)} hitSlop={8} style={styles.modalCloseBtn}>
                <Feather name="x" size={20} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            {CATEGORIES.map(c => {
              const active = cat === c.id;
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    styles.modalRow58,
                    {
                      backgroundColor: active ? (C.brand + '15') : C.surface2,
                      borderColor: active ? C.brand : C.border,
                      borderLeftWidth: 4.5,
                      borderLeftColor: C.brand,
                    },
                  ]}
                  onPress={() => {
                    setCat(c.id);
                    setCatModalOpen(false);
                  }}
                  activeOpacity={0.75}
                >
                  <View style={styles.modalRowLeft}>
                    <Icon name={c.icon} size={28} color={active ? C.brand : C.text} />
                    <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
                      <Text style={[styles.modalRowLabel, { color: active ? C.text : C.text2, fontFamily: FontFamily.jakartaBold }]}>
                        {c.label}
                      </Text>
                    </View>
                  </View>
                  {active && <Feather name="check" size={18} color={C.brand} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>

      {/* ── MODAL 2: BUILDING SELECTION (58dp Item Rows) ── */}
      <Modal
        visible={bldgModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setBldgModalOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setBldgModalOpen(false)}>
          <View style={[styles.modalSheet, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
                Select Building
              </Text>
              <TouchableOpacity onPress={() => setBldgModalOpen(false)} hitSlop={8} style={styles.modalCloseBtn}>
                <Feather name="x" size={20} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            {BUILDINGS.map(b => {
              const active = building === b.id;
              return (
                <TouchableOpacity
                  key={b.id}
                  style={[
                    styles.modalRow58,
                    {
                      backgroundColor: active ? (C.brand + '15') : C.surface2,
                      borderColor: active ? C.brand : C.border,
                    },
                  ]}
                  onPress={() => {
                    setBuilding(b.id);
                    setBldgModalOpen(false);
                  }}
                  activeOpacity={0.75}
                >
                  <View style={styles.modalRowLeft}>
                    <Feather name="map-pin" size={20} color={active ? C.brand : C.textMuted} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.modalRowLabel, { color: active ? C.text : C.text2, fontFamily: FontFamily.jakartaBold }]}>
                        {b.label}
                      </Text>
                      <Text style={[styles.modalRowDesc, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                        {b.desc}
                      </Text>
                    </View>
                  </View>
                  {active && <Feather name="check" size={18} color={C.brand} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>

      {/* ── MODAL 3: FLOOR SELECTION (58dp Item Rows) ── */}
      <Modal
        visible={floorModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setFloorModalOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setFloorModalOpen(false)}>
          <View style={[styles.modalSheet, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
                Select Floor
              </Text>
              <TouchableOpacity onPress={() => setFloorModalOpen(false)} hitSlop={8} style={styles.modalCloseBtn}>
                <Feather name="x" size={20} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            {FLOORS.map(f => {
              const active = floor === f.id;
              return (
                <TouchableOpacity
                  key={f.id}
                  style={[
                    styles.modalRow58,
                    {
                      backgroundColor: active ? (C.brand + '15') : C.surface2,
                      borderColor: active ? C.brand : C.border,
                    },
                  ]}
                  onPress={() => {
                    setFloor(f.id);
                    setFloorModalOpen(false);
                  }}
                  activeOpacity={0.75}
                >
                  <View style={styles.modalRowLeft}>
                    <Feather name="layers" size={20} color={active ? C.brand : C.textMuted} />
                    <Text style={[styles.modalRowLabel, { color: active ? C.text : C.text2, fontFamily: FontFamily.jakartaBold }]}>
                      {f.label}
                    </Text>
                  </View>
                  {active && <Feather name="check" size={18} color={C.brand} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>

      {/* ── MODAL 4: SPACE TYPE SELECTION (58dp Item Rows) ── */}
      <Modal
        visible={spaceModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSpaceModalOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSpaceModalOpen(false)}>
          <View style={[styles.modalSheet, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
                Select Space Type
              </Text>
              <TouchableOpacity onPress={() => setSpaceModalOpen(false)} hitSlop={8} style={styles.modalCloseBtn}>
                <Feather name="x" size={20} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            {PLACES.map(p => {
              const active = place === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.modalRow58,
                    {
                      backgroundColor: active ? (C.brand + '15') : C.surface2,
                      borderColor: active ? C.brand : C.border,
                    },
                  ]}
                  onPress={() => {
                    setPlace(p.id);
                    setSpaceModalOpen(false);
                  }}
                  activeOpacity={0.75}
                >
                  <View style={styles.modalRowLeft}>
                    <Feather name={p.icon} size={20} color={active ? C.brand : C.textMuted} />
                    <Text style={[styles.modalRowLabel, { color: active ? C.text : C.text2, fontFamily: FontFamily.jakartaBold }]}>
                      {p.label}
                    </Text>
                  </View>
                  {active && <Feather name="check" size={18} color={C.brand} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  } as ViewStyle,

  content: {
    paddingTop: 10,
    paddingBottom: 30,
  } as ViewStyle,

  sectionEyebrow: {
    fontSize: 11,
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingHorizontal: 2,
  } as TextStyle,

  dropdownBar72: {
    height: 72,
    borderRadius: 16,
    borderWidth: 1,
    borderLeftWidth: 4.5,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  } as ViewStyle,

  bar72IconSlot: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  bar72Body: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  } as ViewStyle,

  bar72Title: {
    fontSize: 14.5,
    lineHeight: 19,
  } as TextStyle,

  bar72Desc: {
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 2,
  } as TextStyle,

  inputBox58: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
  } as ViewStyle,

  input58: {
    fontSize: 14.5,
    paddingVertical: 0,
  } as TextStyle,

  textarea: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    fontSize: 14,
    minHeight: 90,
    marginBottom: 10,
  } as TextStyle,

  photoPreviewCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  } as ViewStyle,

  photoImg: {
    width: 58,
    height: 58,
    borderRadius: 12,
  } as any,

  photoDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  } as ViewStyle,

  photoDeleteTxt: {
    fontSize: 12.5,
  } as TextStyle,

  photoPickerBar72: {
    height: 72,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  } as ViewStyle,

  visibilityCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
    marginBottom: 18,
  } as ViewStyle,

  visibilityBody: {
    flex: 1,
  } as ViewStyle,

  visibilityTitle: {
    fontSize: 14,
    lineHeight: 18,
  } as TextStyle,

  visibilityDesc: {
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 3,
  } as TextStyle,

  errorBanner: {
    fontSize: 12.5,
    marginBottom: 12,
    textAlign: 'center',
  } as TextStyle,

  submitBtn58: {
    height: 58,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  submitBtnTxt: {
    fontSize: 15,
    letterSpacing: 0.2,
  } as TextStyle,

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  } as ViewStyle,

  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '82%',
  } as ViewStyle,

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 2,
  } as ViewStyle,

  modalTitle: {
    fontSize: 16.5,
  } as TextStyle,

  modalCloseBtn: {
    padding: 6,
  } as ViewStyle,

  modalRow58: {
    height: 58,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  } as ViewStyle,

  modalRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  } as ViewStyle,

  modalRowLabel: {
    fontSize: 14.5,
  } as TextStyle,

  modalRowDesc: {
    fontSize: 11.5,
    marginTop: 2,
  } as TextStyle,
});
