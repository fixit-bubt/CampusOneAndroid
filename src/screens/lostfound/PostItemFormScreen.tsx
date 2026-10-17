import { useState, useEffect, useMemo } from 'react';
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
import { useApp } from '../../store/appStore';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { AnimatedIcon } from '../../components/ui/AnimatedIcon';
import { SegmentedTabs, type TabItem } from '../../components/ui/SegmentedTabs';
import { LocationPickerModal } from '../../components/location/LocationPickerModal';
import { FontFamily, Layout, SectorColors } from '../../theme';
import { supabase } from '../../lib/supabase';
import { localToday } from '../../utils/format';
import { rankMatches, type MatchItem } from '../../utils/lostFoundMatch';
import { uploadPhoto, deleteFile } from '../../utils/storage';
import { BUCKETS } from '../../constants/app';
import { getCache, setCache, CacheKeys } from '../../services/cacheService';
import { BUBT_COORDS, type Coordinates } from '../../services/locationService';
import { findMasterLocationByName } from '../../constants/dhakaMasterLocations';
import { resolveHospitalLocation } from '../../constants/dhakaHospitalCoords';
import type { LostFoundItem } from '../../types/database';
import { useT } from '../../i18n';

const LF_COLOR = SectorColors.lostfound;
const LF_BG = `${SectorColors.lostfound}18`;

interface CategoryOption {
  id: LostFoundItem['category'];
  icon: string;
  label: string;
  labelBn: string;
  sub: string;
  subBn: string;
}

const LF_CATS: CategoryOption[] = [
  {
    id: 'Personal',
    icon: 'user',
    label: 'Personal Items',
    labelBn: 'ব্যক্তিগত সামগ্রী',
    sub: 'Wallets, keys, bags, watch, bottle',
    subBn: 'মানিব্যাগ, চাবি, ব্যাগ, ঘড়ি, বোতল',
  },
  {
    id: 'Electronics',
    icon: 'smartphone',
    label: 'Electronics & Gadgets',
    labelBn: 'ইলেকট্রনিক্স ও গ্যাজেট',
    sub: 'Phones, chargers, calculator, laptop',
    subBn: 'ফোন, চার্জার, ক্যালকুলেটর, ল্যাপটপ',
  },
  {
    id: 'Documents',
    icon: 'layers',
    label: 'Documents & Cards',
    labelBn: 'কাগজপত্র ও আইডি কার্ড',
    sub: 'Student ID, notebooks, files, admit card',
    subBn: 'আইডি কার্ড, খাতা, ফাইল, এডমিট কার্ড',
  },
  {
    id: 'Other',
    icon: 'inbox',
    label: 'Other Items',
    labelBn: 'অন্যান্য জিনিসপত্র',
    sub: 'Umbrellas, clothing, glasses, stationery',
    subBn: 'ছাতা, পোশাক, চশমা, অন্যান্য সামগ্রী',
  },
];

interface CampusHub {
  id: string;
  name: string;
  nameBn: string;
  sub: string;
  subBn: string;
  icon: string;
}

const BUBT_CAMPUS_HUBS: CampusHub[] = [
  {
    id: 'library',
    name: 'Central Library',
    nameBn: 'সেন্ট্রাল লাইব্রেরি',
    sub: 'Building 2, Level 6',
    subBn: 'ভবন ২, ৬ষ্ঠ তলা',
    icon: 'book',
  },
  {
    id: 'cafeteria',
    name: 'Campus Cafeteria',
    nameBn: 'ক্যাম্পাস ক্যাফেটেরিয়া',
    sub: 'Building 1, Ground Floor',
    subBn: 'ভবন ১, নিচতলা',
    icon: 'coffee',
  },
  {
    id: 'b2',
    name: 'Building 2 (Academic Complex)',
    nameBn: 'ভবন ২ (একাডেমিক ভবন)',
    sub: 'Classrooms, Dean Office, Labs',
    subBn: 'ক্লাসরুম, ডিন অফিস ও ল্যাব',
    icon: 'home',
  },
  {
    id: 'b1',
    name: 'Building 1 (Admin & Academic)',
    nameBn: 'ভবন ১ (প্রশাসনিক ও একাডেমিক)',
    sub: 'Admission, Accounts & Classrooms',
    subBn: 'ভর্তি, হিসাব ও ক্লাসরুম',
    icon: 'home',
  },
  {
    id: 'b3',
    name: 'Building 3 / Annex',
    nameBn: 'ভবন ৩ / অ্যানেক্স',
    sub: 'Department offices & classes',
    subBn: 'বিভাগীয় অফিস ও ক্লাস',
    icon: 'home',
  },
  {
    id: 'mosque',
    name: 'Campus Mosque',
    nameBn: 'ক্যাম্পাস মসজিদ',
    sub: 'Prayer Hall & Ablution area',
    subBn: 'নামাজের স্থান ও ওজুখানা',
    icon: 'compass',
  },
  {
    id: 'com_lab',
    name: 'Computer Labs',
    nameBn: 'কম্পিউটার ল্যাব',
    sub: 'Building 2, Level 5',
    subBn: 'ভবন ২, ৫ম তলা',
    icon: 'monitor',
  },
  {
    id: 'exam_hall',
    name: 'Examination Hall & Auditorium',
    nameBn: 'পরীক্ষা হল ও অডিটোরিয়াম',
    sub: 'Building 1, Top Floor',
    subBn: 'ভবন ১, শীর্ষ তলা',
    icon: 'file-text',
  },
  {
    id: 'grounds',
    name: 'Campus Playground & Grounds',
    nameBn: 'ক্যাম্পাস মাঠ ও চত্বর',
    sub: 'Open courtyard & sports area',
    subBn: 'খোলা মাঠ ও খেলাধুলার স্থান',
    icon: 'sun',
  },
];

function hexAlpha(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function extractPhotoStoragePath(url: string | null): string | null {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${BUCKETS.photos}/`;
  const idx = url.indexOf(marker);
  return idx !== -1 ? url.slice(idx + marker.length) : null;
}

export function PostItemFormScreen({ route, navigation }: any) {
  const { C, isDark } = useTheme();
  const { user } = useAuth();
  const { lang } = useApp();
  const isBn = lang === 'bn';
  const insets = useSafeAreaInsets();
  const t = useT();
  const editId: string | undefined = route.params?.itemId;
  const isEdit = !!editId;

  const [type, setType] = useState<'Lost' | 'Found'>('Found');
  const [cat, setCat]   = useState<LostFoundItem['category'] | null>(null);
  const [title, setTitle] = useState('');
  const [loc, setLoc]     = useState('');
  const [locCoords, setLocCoords] = useState<Coordinates | null>(null);
  const [desc, setDesc]   = useState('');
  const [busy, setBusy]   = useState(false);
  const [err, setErr]     = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);
  const [originalPhotoUrl, setOriginalPhotoUrl] = useState<string | null>(null);
  const [photoPickerVisible, setPhotoPickerVisible] = useState(false);
  const [catModalVisible, setCatModalVisible] = useState(false);
  const [locModalVisible, setLocModalVisible] = useState(false);
  const [locInputText, setLocInputText] = useState('');
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [matches, setMatches] = useState<MatchItem[]>([]);

  const selectedCatObj = useMemo(() => LF_CATS.find(c => c.id === cat), [cat]);

  const TYPE_TABS: TabItem<'Lost' | 'Found'>[] = [
    { id: 'Lost',  label: t.lf.lost,  icon: 'alert-circle', color: C.danger },
    { id: 'Found', label: t.lf.found, icon: 'check-circle', color: C.success },
  ];

  // Pre-fill fields when editing an existing item
  useEffect(() => {
    if (!editId) return;
    (async () => {
      const { data } = await supabase
        .from('lost_found_items')
        .select('type, category, title, location, description, photo_url, latitude, longitude')
        .eq('id', editId)
        .single();
      if (data) {
        setType(data.type as 'Lost' | 'Found');
        setCat(data.category as LostFoundItem['category']);
        setTitle(data.title ?? '');
        setLoc(data.location ?? '');
        setDesc(data.description ?? '');
        setExistingPhotoUrl(data.photo_url ?? null);
        setOriginalPhotoUrl(data.photo_url ?? null);
        if (data.latitude && data.longitude) {
          setLocCoords({ latitude: data.latitude, longitude: data.longitude });
        }
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
    let uploadedPath: string | null = null;
    if (photoUri) {
      const up = await uploadPhoto(photoUri, 'lostfound', user.id);
      if (!up.success) {
        setBusy(false);
        setErr(t.lf.photoUploadFail || 'Failed to upload photo. Please check your connection and try again.');
        return;
      }
      photoUrl = up.url;
      uploadedPath = up.path;
    }

    const finalCoords = locCoords
      || findMasterLocationByName(loc.trim())?.coords
      || resolveHospitalLocation(loc.trim()).coords
      || (loc.toLowerCase().includes('bubt') || loc.toLowerCase().includes('building') || loc.toLowerCase().includes('room') ? BUBT_COORDS : null);

    if (isEdit) {
      const { data, error } = await supabase
        .from('lost_found_items')
        .update({
          type,
          title:       title.trim(),
          category:    cat,
          description: desc.trim() || title.trim(),
          location:    loc.trim() || 'Campus',
          latitude:    finalCoords?.latitude ?? null,
          longitude:   finalCoords?.longitude ?? null,
          photo_url:   photoUrl,
        })
        .eq('id', editId)
        .select()
        .single();

      setBusy(false);
      if (error) {
        if (uploadedPath) {
          await deleteFile(BUCKETS.photos, uploadedPath).catch(() => {});
        }
        setErr(error.message);
      } else {
        if (originalPhotoUrl && originalPhotoUrl !== photoUrl) {
          const oldPath = extractPhotoStoragePath(originalPhotoUrl);
          if (oldPath) {
            await deleteFile(BUCKETS.photos, oldPath).catch(() => {});
          }
        }
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
          latitude:    finalCoords?.latitude ?? null,
          longitude:   finalCoords?.longitude ?? null,
          item_date:   localToday(),
          status:      'Open',
          poster_id:   user.id,
          photo_url:   photoUrl,
        })
        .select()
        .single();

      setBusy(false);
      if (error) {
        if (uploadedPath) {
          await deleteFile(BUCKETS.photos, uploadedPath).catch(() => {});
        }
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
          <SegmentedTabs<'Lost' | 'Found'>
            tabs={TYPE_TABS}
            activeTab={type}
            onTabChange={setType}
          />

          {/* 1. Category: 72dp Universal Dropdown Selector Card Standard */}
          <Text style={[styles.label, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>
            {t.lf.categoryLabel} *
          </Text>
          <TouchableOpacity
            style={[
              styles.dropdownCard72,
              {
                backgroundColor: C.surface,
                borderColor: cat ? LF_COLOR : C.border,
                borderWidth: cat ? 1.5 : 1,
              },
            ]}
            onPress={() => setCatModalVisible(true)}
            activeOpacity={0.75}
          >
            <View
              style={[
                styles.dropdownIconTile44,
                {
                  backgroundColor: cat ? LF_BG : (isDark ? 'rgba(255, 255, 255, 0.06)' : C.surface2),
                },
              ]}
            >
              <AnimatedIcon
                family="feather"
                name={selectedCatObj ? selectedCatObj.icon : 'inbox'}
                size={20}
                color={cat ? LF_COLOR : C.text2}
                animation="spring"
              />
            </View>
            <View style={styles.dropdownInfo}>
              <Text
                style={[
                  styles.dropdownTitle,
                  {
                    color: cat ? C.text : C.textMuted,
                    fontFamily: cat ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                  },
                ]}
                numberOfLines={1}
              >
                {selectedCatObj ? (isBn ? selectedCatObj.labelBn : selectedCatObj.label) : (isBn ? 'ক্যাটাগরি নির্বাচন করুন' : 'Select Category...')}
              </Text>
              <Text
                style={[
                  styles.dropdownSub,
                  { color: C.textMuted, fontFamily: FontFamily.jakartaRegular },
                ]}
                numberOfLines={1}
              >
                {selectedCatObj ? (isBn ? selectedCatObj.subBn : selectedCatObj.sub) : (isBn ? 'আইটেম ক্যাটাগরি বেছে নিতে ট্যাপ করুন' : 'Tap to select item category')}
              </Text>
            </View>
            <View style={styles.dropdownChevBox}>
              <Icon name="chevD" size={18} color={C.textMuted} />
            </View>
          </TouchableOpacity>

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
            <View style={[styles.matchWrap, { backgroundColor: isDark ? 'rgba(217, 135, 11, 0.14)' : '#fffbeb', borderColor: LF_COLOR }]}>
              <View style={styles.matchHeaderRow}>
                <Feather name="alert-circle" size={15} color={LF_COLOR} />
                <Text style={[styles.matchHead, { color: LF_COLOR, fontFamily: FontFamily.jakartaExtraBold }]}>
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
                    <View style={[styles.matchIcon, { backgroundColor: LF_BG }]}>
                      <Icon name={mc.icon} size={15} color={LF_COLOR} />
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

          {/* 2. Location: 72dp Universal Dropdown Selector Card Standard */}
          <Text style={[styles.label, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold, marginTop: 14 }]}>
            {t.lf.locationLabel} *
          </Text>
          <View
            style={[
              styles.dropdownCard72,
              {
                backgroundColor: C.surface,
                borderColor: loc ? LF_COLOR : C.border,
                borderWidth: loc ? 1.5 : 1,
              },
            ]}
          >
            <TouchableOpacity
              style={styles.dropdownMain}
              onPress={() => {
                setLocInputText(loc);
                setLocModalVisible(true);
              }}
              activeOpacity={0.75}
            >
              <View
                style={[
                  styles.dropdownIconTile44,
                  {
                    backgroundColor: loc ? LF_BG : (isDark ? 'rgba(255, 255, 255, 0.06)' : C.surface2),
                  },
                ]}
              >
                <AnimatedIcon
                  key={`loc-${loc}`}
                  family="feather"
                  name="map-pin"
                  size={20}
                  color={loc ? LF_COLOR : C.text2}
                  animation={loc ? 'spring' : 'entrance'}
                />
              </View>
              <View style={styles.dropdownInfo}>
                <Text
                  style={[
                    styles.dropdownTitle,
                    {
                      color: loc ? C.text : C.textMuted,
                      fontFamily: loc ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {loc || (type === 'Lost'
                    ? (isBn ? 'কোথায় হারিয়ে গেছে?' : 'Where was it lost?')
                    : (isBn ? 'কোথায় পাওয়া গেছে?' : 'Where was it found?'))}
                </Text>
                <Text
                  style={[
                    styles.dropdownSub,
                    { color: C.textMuted, fontFamily: FontFamily.jakartaRegular },
                  ]}
                  numberOfLines={1}
                >
                  {loc
                    ? (isBn ? 'স্থান বা রুম পরিবর্তন করতে ট্যাপ করুন' : 'Tap to change spot or room')
                    : (isBn ? 'BUBT স্পট, রুম নম্বর বা ম্যাপ থেকে বেছে নিন' : 'BUBT spot, room number, or map')}
                </Text>
              </View>
            </TouchableOpacity>
            <View style={styles.dropdownRightBtns}>
              {loc ? (
                <TouchableOpacity
                  onPress={() => {
                    setLoc('');
                    setLocInputText('');
                  }}
                  style={[styles.clearPill32, { backgroundColor: C.surface2, borderColor: C.border }]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Feather name="x" size={14} color={C.textMuted} />
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={[
                  styles.mapMiniBtn36,
                  {
                    backgroundColor: LF_BG,
                    borderColor: isDark ? `${LF_COLOR}40` : `${LF_COLOR}25`,
                  },
                ]}
                onPress={() => setMapModalVisible(true)}
                activeOpacity={0.75}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Feather name="map" size={16} color={LF_COLOR} />
              </TouchableOpacity>
            </View>
          </View>

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
              <Feather name="image" size={18} color={C.brand} />
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

      {/* Category Selection Modal (Strict 72dp Cards Inside) */}
      <Modal
        visible={catModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCatModalVisible(false)}
      >
        <View style={styles.sheetOverlay}>
          <TouchableOpacity
            style={styles.sheetBackdrop}
            activeOpacity={1}
            onPress={() => setCatModalVisible(false)}
          />
          <View
            style={[
              styles.sheetContent,
              {
                backgroundColor: C.surface,
                borderColor: C.border,
                paddingBottom: Math.max(insets.bottom, 16),
              },
            ]}
          >
            <View style={styles.sheetHandle}>
              <View style={[styles.sheetHandleBar, { backgroundColor: C.border }]} />
            </View>

            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderLeft}>
                <View style={[styles.sheetHeaderIcon, { backgroundColor: LF_BG }]}>
                  <Feather name="grid" size={18} color={LF_COLOR} />
                </View>
                <View>
                  <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    {isBn ? 'ক্যাটাগরি নির্বাচন করুন' : 'Select Category'}
                  </Text>
                  <Text style={[styles.sheetSub, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                    {isBn ? 'আইটেম অনুযায়ী সঠিক ক্যাটাগরি বেছে নিন' : 'Choose the best matching category'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.sheetCloseBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
                onPress={() => setCatModalVisible(false)}
                activeOpacity={0.75}
              >
                <Feather name="x" size={16} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 10, marginTop: 12 }}>
              {LF_CATS.map((item) => {
                const isSelected = cat === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.optionCard72,
                      {
                        backgroundColor: isSelected ? LF_BG : (isDark ? C.surface2 : '#ffffff'),
                        borderColor: isSelected ? LF_COLOR : C.border,
                        borderWidth: isSelected ? 1.5 : 1,
                      },
                    ]}
                    onPress={() => {
                      setCat(item.id);
                      setCatModalVisible(false);
                    }}
                    activeOpacity={0.75}
                  >
                    <View
                      style={[
                        styles.dropdownIconTile44,
                        {
                          backgroundColor: isSelected
                            ? (isDark ? 'rgba(217, 135, 11, 0.28)' : 'rgba(217, 135, 11, 0.16)')
                            : (isDark ? 'rgba(255, 255, 255, 0.06)' : C.surface2),
                        },
                      ]}
                    >
                      <AnimatedIcon
                        family="feather"
                        name={item.icon}
                        size={20}
                        color={isSelected ? LF_COLOR : C.text2}
                        animation={isSelected ? 'spring' : 'none'}
                      />
                    </View>
                    <View style={styles.dropdownInfo}>
                      <Text
                        style={[
                          styles.optionTitle,
                          {
                            color: isSelected ? (isDark ? '#fbbf24' : '#b45309') : C.text,
                            fontFamily: isSelected ? FontFamily.jakartaBold : FontFamily.jakartaSemiBold,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {isBn ? item.labelBn : item.label}
                      </Text>
                      <Text
                        style={[
                          styles.optionSub,
                          { color: C.textMuted, fontFamily: FontFamily.jakartaRegular },
                        ]}
                        numberOfLines={1}
                      >
                        {isBn ? item.subBn : item.sub}
                      </Text>
                    </View>
                    <View style={styles.dropdownChevBox}>
                      {isSelected ? (
                        <View style={[styles.checkCircle, { backgroundColor: LF_COLOR }]}>
                          <Feather name="check" size={13} color="#ffffff" />
                        </View>
                      ) : (
                        <View style={[styles.emptyCircle, { borderColor: C.border }]} />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* Location Selection Modal (58dp Text Input, 72dp Interactive Map Card, 72dp Campus Presets) */}
      <Modal
        visible={locModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLocModalVisible(false)}
      >
        <View style={styles.sheetOverlay}>
          <TouchableOpacity
            style={styles.sheetBackdrop}
            activeOpacity={1}
            onPress={() => setLocModalVisible(false)}
          />
          <View
            style={[
              styles.sheetContent,
              {
                backgroundColor: C.surface,
                borderColor: C.border,
                maxHeight: '88%',
                paddingBottom: Math.max(insets.bottom, 16),
              },
            ]}
          >
            <View style={styles.sheetHandle}>
              <View style={[styles.sheetHandleBar, { backgroundColor: C.border }]} />
            </View>

            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderLeft}>
                <View style={[styles.sheetHeaderIcon, { backgroundColor: LF_BG }]}>
                  <Feather name="map-pin" size={18} color={LF_COLOR} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    {type === 'Lost'
                      ? (isBn ? 'কোথায় হারিয়ে গেছে?' : 'Where was it lost?')
                      : (isBn ? 'কোথায় পাওয়া গেছে?' : 'Where was it found?')}
                  </Text>
                  <Text style={[styles.sheetSub, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                    {isBn ? 'রুম নম্বর, ম্যাপ বা BUBT স্পট নির্বাচন করুন' : 'Select room, map pin, or campus building'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.sheetCloseBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
                onPress={() => setLocModalVisible(false)}
                activeOpacity={0.75}
              >
                <Feather name="x" size={16} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingTop: 10, paddingBottom: 16 }}
            >
              {/* Option 1: Custom Room or Spot Text Input (Universal 58dp Standard) */}
              <Text style={[styles.sheetSectionLabel, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>
                {isBn ? 'নির্দিষ্ট রুম বা স্পট লিখুন' : 'CUSTOM ROOM OR SPOT'}
              </Text>
              <View style={styles.locInputRow58}>
                <TextInput
                  style={[
                    styles.locInputText58,
                    {
                      backgroundColor: isDark ? C.surface2 : '#ffffff',
                      borderColor: C.border,
                      color: C.text,
                      fontFamily: FontFamily.jakartaMedium,
                    },
                  ]}
                  value={locInputText}
                  onChangeText={setLocInputText}
                  placeholder={isBn ? 'রুম নম্বর লিখুন (যেমন: Room 402, B2)' : 'Enter room or spot (e.g. Room 402, B2)'}
                  placeholderTextColor={C.textMuted}
                />
                <TouchableOpacity
                  style={[
                    styles.locSetBtn,
                    {
                      backgroundColor: LF_COLOR,
                      opacity: locInputText.trim().length > 0 ? 1 : 0.6,
                    },
                  ]}
                  onPress={() => {
                    const clean = locInputText.trim();
                    if (clean) {
                      setLoc(clean);
                      setLocModalVisible(false);
                    }
                  }}
                  disabled={locInputText.trim().length === 0}
                  activeOpacity={0.75}
                >
                  <Feather name="check" size={16} color="#ffffff" />
                  <Text style={[styles.locSetBtnTxt, { fontFamily: FontFamily.jakartaBold }]}>
                    {isBn ? 'প্রয়োগ' : 'Set'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Option 2: Unified Interactive Vector Map & GPS (Strict 72dp Card) */}
              <Text style={[styles.sheetSectionLabel, { color: C.text2, fontFamily: FontFamily.jakartaBold, marginTop: 14 }]}>
                {isBn ? 'অফ-ক্যাম্পাস ও ম্যাপ লোকেশন' : 'OFF-CAMPUS & MAP LOCATION'}
              </Text>
              <TouchableOpacity
                style={[
                  styles.optionCard72,
                  styles.mapActionCard72,
                  {
                    backgroundColor: isDark ? 'rgba(217, 135, 11, 0.12)' : 'rgba(217, 135, 11, 0.08)',
                    borderColor: isDark ? 'rgba(217, 135, 11, 0.45)' : 'rgba(217, 135, 11, 0.35)',
                  },
                ]}
                onPress={() => {
                  setLocModalVisible(false);
                  setMapModalVisible(true);
                }}
                activeOpacity={0.75}
              >
                <View
                  style={[
                    styles.dropdownIconTile44,
                    {
                      backgroundColor: isDark ? 'rgba(217, 135, 11, 0.28)' : 'rgba(217, 135, 11, 0.18)',
                    },
                  ]}
                >
                  <AnimatedIcon
                    family="feather"
                    name="map"
                    size={20}
                    color={LF_COLOR}
                    animation="pulse"
                  />
                </View>
                <View style={styles.dropdownInfo}>
                  <Text
                    style={[
                      styles.optionTitle,
                      { color: isDark ? '#fbbf24' : '#b45309', fontFamily: FontFamily.jakartaBold },
                    ]}
                    numberOfLines={1}
                  >
                    {isBn ? 'ইন্টারেক্টিভ ম্যাপ ও জিপিএস' : 'Interactive Map & GPS'}
                  </Text>
                  <Text
                    style={[
                      styles.optionSub,
                      { color: C.textMuted, fontFamily: FontFamily.jakartaRegular },
                    ]}
                    numberOfLines={1}
                  >
                    {isBn ? 'মিরপুর বা ক্যাম্পাসের বাইরের সঠিক অবস্থান পিন করুন' : 'Pin exact off-campus, transit, or Mirpur spot'}
                  </Text>
                </View>
                <View style={styles.dropdownChevBox}>
                  <Feather name="arrow-up-right" size={18} color={LF_COLOR} />
                </View>
              </TouchableOpacity>

              {/* Option 3: BUBT Campus Presets (Strict 72dp Cards) */}
              <Text style={[styles.sheetSectionLabel, { color: C.text2, fontFamily: FontFamily.jakartaBold, marginTop: 14 }]}>
                {isBn ? 'BUBT ক্যাম্পাস স্পট সমূহ' : 'BUBT CAMPUS PRESETS'}
              </Text>
              <View style={{ gap: 9 }}>
                {BUBT_CAMPUS_HUBS.map((hub) => {
                  const hubName = isBn ? hub.nameBn : hub.name;
                  const isSelected = loc === hubName || loc === hub.name || loc === hub.nameBn;
                  return (
                    <TouchableOpacity
                      key={hub.id}
                      style={[
                        styles.optionCard72,
                        {
                          backgroundColor: isSelected ? LF_BG : (isDark ? C.surface2 : '#ffffff'),
                          borderColor: isSelected ? LF_COLOR : C.border,
                          borderWidth: isSelected ? 1.5 : 1,
                        },
                      ]}
                      onPress={() => {
                        setLoc(hubName);
                        setLocInputText(hubName);
                        setLocCoords(BUBT_COORDS);
                        setLocModalVisible(false);
                      }}
                      activeOpacity={0.75}
                    >
                      <View
                        style={[
                          styles.dropdownIconTile44,
                          {
                            backgroundColor: isSelected
                              ? (isDark ? 'rgba(217, 135, 11, 0.28)' : 'rgba(217, 135, 11, 0.16)')
                              : (isDark ? 'rgba(255, 255, 255, 0.06)' : C.surface2),
                          },
                        ]}
                      >
                        <AnimatedIcon
                          family="feather"
                          name={hub.icon}
                          size={20}
                          color={isSelected ? LF_COLOR : C.text2}
                          animation={isSelected ? 'spring' : 'none'}
                        />
                      </View>
                      <View style={styles.dropdownInfo}>
                        <Text
                          style={[
                            styles.optionTitle,
                            {
                              color: isSelected ? (isDark ? '#fbbf24' : '#b45309') : C.text,
                              fontFamily: isSelected ? FontFamily.jakartaBold : FontFamily.jakartaSemiBold,
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {hubName}
                        </Text>
                        <Text
                          style={[
                            styles.optionSub,
                            { color: C.textMuted, fontFamily: FontFamily.jakartaRegular },
                          ]}
                          numberOfLines={1}
                        >
                          {isBn ? hub.subBn : hub.sub}
                        </Text>
                      </View>
                      <View style={styles.dropdownChevBox}>
                        {isSelected ? (
                          <View style={[styles.checkCircle, { backgroundColor: LF_COLOR }]}>
                            <Feather name="check" size={13} color="#ffffff" />
                          </View>
                        ) : (
                          <View style={[styles.emptyCircle, { borderColor: C.border }]} />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Unified Interactive Map & GPS Picker Modal */}
      <LocationPickerModal
        visible={mapModalVisible}
        onClose={() => setMapModalVisible(false)}
        accentColor={SectorColors.lostfound}
        title={type === 'Lost' ? (isBn ? 'হারানোর স্থান নির্বাচন করুন' : 'Pick Lost Location') : (isBn ? 'পাওয়ার স্থান নির্বাচন করুন' : 'Pick Found Location')}
        initialPlaceName={loc}
        initialCoords={locCoords || undefined}
        onSelectLocation={(place) => {
          setLoc(place.formattedAddress);
          setLocInputText(place.formattedAddress);
          setLocCoords(place.coords);
          setMapModalVisible(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  content: { paddingTop: 10, paddingBottom: 24 } as ViewStyle,

  label: { fontSize: 13, marginBottom: 8, marginTop: 16 } as TextStyle,

  dropdownCard72: {
    height: 72,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  } as ViewStyle,

  dropdownMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
  } as ViewStyle,

  dropdownIconTile44: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  dropdownInfo: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  } as ViewStyle,

  dropdownTitle: {
    fontSize: 15,
    lineHeight: 20,
  } as TextStyle,

  dropdownSub: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  } as TextStyle,

  dropdownChevBox: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  dropdownRightBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  } as ViewStyle,

  clearPill32: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  mapMiniBtn36: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  optionCard72: {
    height: 72,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 12,
  } as ViewStyle,

  optionTitle: {
    fontSize: 15,
    lineHeight: 20,
  } as TextStyle,

  optionSub: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  } as TextStyle,

  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  emptyCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
  } as ViewStyle,

  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  } as ViewStyle,

  sheetBackdrop: {
    ...StyleSheet.absoluteFill as ViewStyle,
  } as ViewStyle,

  sheetHandle: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  } as ViewStyle,

  sheetHandleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
  } as ViewStyle,

  sheetContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 18,
    paddingTop: 4,
  } as ViewStyle,

  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.15)',
  } as ViewStyle,

  sheetHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  } as ViewStyle,

  sheetHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  sheetTitle: {
    fontSize: 16,
    lineHeight: 21,
  } as TextStyle,

  sheetSub: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  } as TextStyle,

  sheetCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  } as ViewStyle,

  sheetSectionLabel: {
    fontSize: 11.5,
    letterSpacing: 0.6,
    marginBottom: 8,
  } as TextStyle,

  locInputRow58: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  } as ViewStyle,

  locInputText58: {
    flex: 1,
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 14.5,
  } as TextStyle,

  locSetBtn: {
    height: 58,
    paddingHorizontal: 18,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  } as ViewStyle,

  locSetBtnTxt: {
    fontSize: 14,
    color: '#ffffff',
  } as TextStyle,

  mapActionCard72: {
    borderStyle: 'solid',
  } as ViewStyle,

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
    height: 58,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    fontSize: 14.5,
  } as TextStyle,

  textarea: {
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingTop: 14,
    fontSize: 14.5,
    minHeight: 100,
  } as TextStyle,

  errText: { fontSize: 13, marginTop: 8 } as TextStyle,

  submitBtn: {
    height: 58,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 9 } as ViewStyle,
  btnTxt: { fontSize: 15, color: '#fff' } as TextStyle,

  photoUploadBtn: {
    height: 58,
    borderRadius: 16,
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
    height: 58,
    borderRadius: 16,
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
