import { useState, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView, Switch, KeyboardAvoidingView,
  StyleSheet, Image, Modal, Animated, Dimensions, ActivityIndicator, type ViewStyle, type TextStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout, Accent, SectorColors } from '../../theme';
import { useToast } from '../../components/ui/Toast';
import { supabase } from '../../lib/supabase';
import { uploadFile } from '../../utils/storage';
import { getCache, setCache, CacheKeys } from '../../services/cacheService';
import { ALL_DHAKA_COMMUTE_AREAS } from '../rides/RidePostScreen';
import type { Listing } from '../../types/database';

const MARKET_COLOR = SectorColors.market;

export interface CategoryOption {
  id: string;
  labelKey: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
  subKey: string;
}

const CATEGORIES: CategoryOption[] = [
  { id: 'Books',       labelKey: 'catBooks',       icon: 'book-open', color: Accent.blue,   subKey: 'catBooksSub'     },
  { id: 'Electronics', labelKey: 'catElectronics', icon: 'cpu',       color: Accent.purple, subKey: 'catElectronicsSub' },
  { id: 'Notes',       labelKey: 'catNotes',       icon: 'file-text', color: Accent.teal,   subKey: 'catNotesSub'     },
  { id: 'Drafting',    labelKey: 'catDrafting',    icon: 'edit-3',    color: '#f59e0b',     subKey: 'catDraftingSub'  },
  { id: 'LabGear',     labelKey: 'catLabGear',     icon: 'shield',    color: '#10b981',     subKey: 'catLabGearSub'   },
  { id: 'Furniture',   labelKey: 'catFurniture',   icon: 'layers',    color: Accent.amber,  subKey: 'catFurnitureSub' },
  { id: 'Other',       labelKey: 'catOther',       icon: 'package',   color: Accent.slate,  subKey: 'catOtherSub'     },
];

const CONDITIONS = ['New', 'Like New', 'Used'] as const;

export const CAMPUS_SPECIFIC_SPOTS = [
  { name: 'BUBT Building 1 Cafeteria', nameBn: 'বিল্ডিং ১ ক্যাফেটেরিয়া', desc: 'Ground floor canteen & hangout area', icon: 'coffee' as const },
  { name: 'BUBT Building 2 Main Lobby', nameBn: 'বিল্ডিং ২ মেইন লবি', desc: 'Central atrium near elevator & reception', icon: 'home' as const },
  { name: 'BUBT Central Library', nameBn: 'সেন্ট্রাল লাইব্রেরি', desc: 'Building 2 · 4th Floor entrance corridor', icon: 'book' as const },
  { name: 'BUBT Campus 1 Front Gate', nameBn: 'ক্যাম্পাস ১ মেইন গেট', desc: 'Main entrance gate on Commerce College road', icon: 'map-pin' as const },
  { name: 'BUBT Playground / Field', nameBn: 'প্লেগ্রাউন্ড', desc: 'Open grounds between buildings', icon: 'compass' as const },
  { name: 'BUBT Building 3 Lobby', nameBn: 'বিল্ডিং ৩ লবি', desc: 'Academic building 3 ground floor', icon: 'map-pin' as const },
  { name: 'Mirpur-2 Sony Square', nameBn: 'সনি স্কয়ার', desc: 'Sony Square food court & pedestrian zone', icon: 'film' as const },
  { name: 'Mirpur-10 Metro Station', nameBn: 'মিরপুর-১০ মেট্রো', desc: 'MRT Line 6 station entrance / roundabout', icon: 'navigation' as const },
  { name: 'Mirpur-1 Muktodhara', nameBn: 'মিরপুর-১', desc: 'Muktodhara roundabout & Darussalam link', icon: 'map-pin' as const },
  { name: 'Rupnagar R/A Gate', nameBn: 'রূপনগর আবাসিক', desc: 'Rupnagar residential gate & Commerce College link', icon: 'home' as const },
  { name: 'Commerce College Road', nameBn: 'কমার্স কলেজ রোড', desc: 'Main varsity road corridor', icon: 'navigation' as const },
  { name: 'Rainkhola Zoo Road', nameBn: 'রাইনখোলা', desc: 'Zoo road intersection near campus', icon: 'compass' as const },
];

export function MarketPostScreen({ route, navigation }: any) {
  const { listing } = (route.params ?? {}) as { listing?: Listing };
  const { C, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { user } = useAuth();
  const toast = useToast();

  const isEdit = !!listing;
  const initialPrice = listing?.price !== undefined ? listing.price : null;
  const isKnownCat = listing?.category ? CATEGORIES.some(c => c.id.toLowerCase() === listing.category.toLowerCase() && c.id !== 'Other') : true;
  const initialCat = listing ? (isKnownCat ? listing.category : 'Other') : 'Books';
  const initialCustomCat = listing && !isKnownCat ? listing.category : '';

  // Form states
  const [cat, setCat] = useState<string>(initialCat);
  const [customCat, setCustomCat] = useState(initialCustomCat);
  const [title, setTitle] = useState(listing?.title ?? '');
  const [isFree, setIsFree] = useState(initialPrice === 0);
  const [price, setPrice] = useState(initialPrice !== null && initialPrice > 0 ? String(initialPrice) : '');
  const [condition, setCondition] = useState<Listing['condition']>(listing?.condition ?? 'Used');
  const [negotiable, setNegotiable] = useState(listing?.negotiable ?? true);
  const [desc, setDesc] = useState(listing?.description ?? '');
  const [courseCode, setCourseCode] = useState(listing?.course_code ?? '');
  const [meetupSpot, setMeetupSpot] = useState(listing?.meetup_spot ?? '');
  const [photoUri, setPhotoUri] = useState<string | null>(listing?.photo_url ?? null);

  // Modals
  const [pickerModalOpen, setPickerModalOpen] = useState(false);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [locTab, setLocTab] = useState<'campus' | 'dhaka'>('campus');
  const [searchLoc, setSearchLoc] = useState('');

  // Loading states
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  // Condition spring animation
  const [condTrackWidth, setCondTrackWidth] = useState(0);
  const condAnimIndex = useRef(new Animated.Value(CONDITIONS.indexOf(listing?.condition ?? 'Used'))).current;

  useEffect(() => {
    const idx = CONDITIONS.indexOf(condition);
    if (idx >= 0) {
      Animated.spring(condAnimIndex, {
        toValue: idx,
        tension: 68,
        friction: 10,
        useNativeDriver: true,
      }).start();
    }
  }, [condition, condAnimIndex]);

  const condTabWidth = condTrackWidth > 6 ? (condTrackWidth - 6) / 3 : 0;
  const condTranslateX = condAnimIndex.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, condTabWidth, condTabWidth * 2],
  });

  // Location modal tab spring animation
  const [locTrackWidth, setLocTrackWidth] = useState(0);
  const locAnimIndex = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(locAnimIndex, {
      toValue: locTab === 'campus' ? 0 : 1,
      tension: 68,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [locTab, locAnimIndex]);

  const locTabWidth = locTrackWidth > 6 ? (locTrackWidth - 6) / 2 : 0;
  const locTranslateX = locAnimIndex.interpolate({
    inputRange: [0, 1],
    outputRange: [0, locTabWidth],
  });

  // Current category metadata
  const currentCategoryMeta = useMemo(() => {
    return CATEGORIES.find(c => c.id.toLowerCase() === cat.toLowerCase()) ?? CATEGORIES[0];
  }, [cat]);

  const currentCategoryLabel = useMemo(() => {
    return (t.market2 as any)[currentCategoryMeta.labelKey] ?? currentCategoryMeta.id;
  }, [currentCategoryMeta, t]);

  // Submission validation
  const cleanPriceNum = isFree ? 0 : parseInt(price.replace(/[^0-9]/g, ''), 10);
  const validPrice = isFree ? true : (!isNaN(cleanPriceNum) && cleanPriceNum > 0);
  const canSubmit = cat.length > 0 && title.trim().length >= 2 && validPrice && !uploading;

  // Course code only applies to study materials
  const showCourse = cat === 'Books' || cat === 'Notes';

  // Toggle free / donation mode
  function handleToggleFree(val: boolean) {
    setIsFree(val);
    if (val) {
      setPrice('0');
      setNegotiable(false);
    } else {
      setPrice('');
      setNegotiable(true);
    }
  }

  // Camera capture
  async function handleLaunchCamera() {
    setPickerModalOpen(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      toast({ type: 'info', title: t.market2.permissionRequired, message: 'Please grant camera access to take a photo.' });
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      await processAndUpload(result.assets[0].uri);
    }
  }

  // Gallery picker
  async function handleLaunchGallery() {
    setPickerModalOpen(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      toast({ type: 'info', title: t.market2.permissionRequired, message: t.market2.photoPermissionBody });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      await processAndUpload(result.assets[0].uri);
    }
  }

  // Process & upload image
  async function processAndUpload(uri: string) {
    if (!user) return;
    setUploading(true);
    try {
      const fileName = `${user.id}_${Date.now()}.jpg`;
      const res = await uploadFile('photos', uri, `marketplace/${user.id}/${fileName}`, 'image/jpeg', true, { preset: 'standard' });
      if (!res.success) throw new Error(res.error);
      setPhotoUri(res.url);
    } catch {
      toast({ type: 'error', title: t.market2.uploadFailed, message: t.market2.uploadFailedBody });
    } finally {
      setUploading(false);
    }
  }

  // Location selection helper
  function handleSelectLocation(name: string) {
    setMeetupSpot(name);
    setLocationModalOpen(false);
    setSearchLoc('');
  }

  // Filtered locations
  const filteredCampusSpots = useMemo(() => {
    const q = searchLoc.trim().toLowerCase();
    if (!q) return CAMPUS_SPECIFIC_SPOTS;
    return CAMPUS_SPECIFIC_SPOTS.filter(s =>
      s.name.toLowerCase().includes(q) || s.nameBn.includes(q) || s.desc.toLowerCase().includes(q)
    );
  }, [searchLoc]);

  const filteredDhakaAreas = useMemo(() => {
    const q = searchLoc.trim().toLowerCase();
    if (!q) return ALL_DHAKA_COMMUTE_AREAS.filter(a => a.zone !== 'Mirpur & Campus');
    return ALL_DHAKA_COMMUTE_AREAS.filter(a =>
      a.zone !== 'Mirpur & Campus' &&
      (a.name.toLowerCase().includes(q) || (a.nameBn ? a.nameBn.includes(q) : false) || a.desc.toLowerCase().includes(q))
    );
  }, [searchLoc]);

  // Save / Post listing
  async function handleSubmit() {
    if (!canSubmit || !user || loading || uploading) return;
    setLoading(true);
    try {
      const numericPrice = isFree ? 0 : (parseInt(price.replace(/[^0-9]/g, ''), 10) || 0);
      const finalCategory = cat === 'Other' && customCat.trim() ? customCat.trim() : cat;

      const payload: any = {
        title:       title.trim(),
        price:       numericPrice,
        category:    finalCategory,
        condition,
        negotiable:  isFree ? false : negotiable,
        description: desc.trim(),
        photo_url:   photoUri ?? null,
        photos:      photoUri ? [photoUri] : [],
        course_code: showCourse ? (courseCode.trim().toUpperCase() || null) : null,
        meetup_spot: meetupSpot.trim() || null,
        seller_id:   user.id,
        status:      listing?.status ?? 'Available',
      };

      if (isEdit) {
        const { data, error } = await supabase
          .from('listings')
          .update(payload)
          .eq('id', listing!.id)
          .select()
          .single();

        if (error) throw error;

        const cached = await getCache<Listing[]>(CacheKeys.MARKET_LISTINGS);
        if (cached && data) {
          const updated = cached.map(l => (l.id === listing!.id ? (data as Listing) : l));
          setCache(CacheKeys.MARKET_LISTINGS, updated);
        }
      } else {
        const { data, error } = await supabase
          .from('listings')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;

        const cached = await getCache<Listing[]>(CacheKeys.MARKET_LISTINGS);
        if (cached && data) {
          setCache(CacheKeys.MARKET_LISTINGS, [data as Listing, ...cached]);
        }
      }

      toast({
        type: 'success',
        title: t.common.done,
        message: isEdit ? 'Listing updated successfully' : 'Item posted successfully',
      });
      navigation.goBack();
    } catch {
      toast({ type: 'error', title: t.common.error, message: t.market2.saveListingFailed });
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar
        title={isEdit ? t.market2.editListing : t.market2.sellItem}
        onBack={() => navigation.goBack()}
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        >
          {/* 1. Category Selector Bar */}
          <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {t.market2.category}
          </Text>
          <TouchableOpacity
            style={[styles.pickerBar, { backgroundColor: C.surface, borderColor: C.border }]}
            onPress={() => setCatModalOpen(true)}
            activeOpacity={0.75}
          >
            <View style={styles.pickerBarLeft}>
              <View style={[styles.pickerIconBox, { backgroundColor: isDark ? `${currentCategoryMeta.color}25` : `${currentCategoryMeta.color}15` }]}>
                <Feather name={currentCategoryMeta.icon} size={16} color={currentCategoryMeta.color} />
              </View>
              <Text style={[styles.pickerBarTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                {cat === 'Other' && customCat.trim() ? customCat : currentCategoryLabel}
              </Text>
            </View>
            <View style={[styles.pickerBtnPill, { backgroundColor: C.surface2 }]}>
              <Text style={[styles.pickerBtnTxt, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
                {t.market2.selectCategoryBtn}
              </Text>
              <Icon name="chevD" size={13} color={C.brand} />
            </View>
          </TouchableOpacity>

          {/* Custom Category Input if 'Other' selected */}
          {cat === 'Other' && (
            <View style={{ marginTop: 8 }}>
              <Text style={[styles.subLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaSemiBold }]}>
                {t.market2.customCategoryLabel}
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                value={customCat}
                onChangeText={setCustomCat}
                placeholder={t.market2.customCategoryPlaceholder}
                placeholderTextColor={C.textMuted}
              />
            </View>
          )}

          {/* 2. Item Title */}
          <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold, marginTop: 14 }]}>
            {t.market2.itemName}
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
            value={title}
            onChangeText={setTitle}
            placeholder={t.market2.itemNamePlaceholder}
            placeholderTextColor={C.textMuted}
          />

          {/* 3. Photo Attachment */}
          <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold, marginTop: 14 }]}>
            {t.market2.photoOptional}
          </Text>
          <View style={[styles.photoBox, { backgroundColor: C.surface, borderColor: C.border }]}>
            {photoUri ? (
              <View style={styles.photoPreviewWrapper}>
                <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
                <TouchableOpacity
                  style={styles.photoRemoveBtn}
                  onPress={() => setPhotoUri(null)}
                  hitSlop={8}
                  activeOpacity={0.8}
                >
                  <Feather name="x" size={14} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.photoPlaceholder}
                onPress={() => setPickerModalOpen(true)}
                disabled={uploading}
                activeOpacity={0.75}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color={MARKET_COLOR} />
                ) : (
                  <Feather name="camera" size={24} color={MARKET_COLOR} />
                )}
                <Text style={[styles.photoPlaceholderTxt, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>
                  {uploading ? t.market2.uploading : t.market2.tapToAddPhoto}
                </Text>
                <Text style={[styles.photoSubTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                  Camera or Gallery
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* 4. Spring Animated Condition Selector Bar */}
          <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold, marginTop: 14 }]}>
            {t.market2.condition}
          </Text>
          <View
            style={[styles.condTrack, { backgroundColor: C.surface2 }]}
            onLayout={e => setCondTrackWidth(e.nativeEvent.layout.width)}
          >
            {condTabWidth > 0 && (
              <Animated.View
                style={[
                  styles.condIndicator,
                  {
                    width: condTabWidth,
                    transform: [{ translateX: condTranslateX }],
                    backgroundColor: C.surface,
                    borderColor: isDark ? `${MARKET_COLOR}55` : `${MARKET_COLOR}35`,
                  },
                ]}
              />
            )}

            {CONDITIONS.map(c => {
              const on = condition === c;
              const label = (t.market2 as any)[c === 'New' ? 'condNew' : c === 'Like New' ? 'condLikeNew' : 'condUsed'] ?? c;
              return (
                <TouchableOpacity
                  key={c}
                  style={styles.condBtn}
                  onPress={() => setCondition(c)}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.condBtnTxt,
                      {
                        color: on ? MARKET_COLOR : C.textMuted,
                        fontFamily: on ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                      },
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 5. Free Donation Mode Toggle */}
          <View style={[styles.switchRow, { backgroundColor: C.surface, borderColor: C.border, marginTop: 14 }]}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={[styles.switchLabel, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {t.market2.freeDonationToggle}
              </Text>
              <Text style={[styles.switchSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                {t.market2.freeDonationSubtitle}
              </Text>
            </View>
            <Switch
              value={isFree}
              onValueChange={handleToggleFree}
              trackColor={{ false: C.border, true: '#16a34a' }}
              thumbColor="#fff"
            />
          </View>

          {/* 6. Price & Negotiable */}
          {!isFree && (
            <>
              <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold, marginTop: 14 }]}>
                {t.market2.priceLabel}
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                value={price}
                onChangeText={v => setPrice(v.replace(/\D/g, ''))}
                placeholder={t.market2.pricePlaceholder}
                placeholderTextColor={C.textMuted}
                keyboardType="numeric"
              />

              <View style={[styles.switchRow, { backgroundColor: C.surface, borderColor: C.border, marginTop: 10 }]}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={[styles.switchLabel, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    {t.market2.negotiable}
                  </Text>
                  <Text style={[styles.switchSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                    Open to reasonable price negotiation with peers
                  </Text>
                </View>
                <Switch
                  value={negotiable}
                  onValueChange={setNegotiable}
                  trackColor={{ false: C.border, true: MARKET_COLOR }}
                  thumbColor="#fff"
                />
              </View>
            </>
          )}

          {/* 7. Dedicated Handover Location Picker Bar */}
          <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold, marginTop: 14 }]}>
            {t.market2.meetupSpot}
          </Text>
          <TouchableOpacity
            style={[styles.pickerBar, { backgroundColor: C.surface, borderColor: C.border }]}
            onPress={() => setLocationModalOpen(true)}
            activeOpacity={0.75}
          >
            <View style={styles.pickerBarLeft}>
              <View style={[styles.pickerIconBox, { backgroundColor: isDark ? `${Accent.amber}25` : `${Accent.amber}15` }]}>
                <Feather name="map-pin" size={16} color={Accent.amber} />
              </View>
              <Text
                style={[
                  styles.pickerBarTitle,
                  { color: meetupSpot ? C.text : C.textMuted, fontFamily: FontFamily.jakartaBold },
                ]}
                numberOfLines={1}
              >
                {meetupSpot || 'Select campus spot or Dhaka area'}
              </Text>
            </View>
            <View style={[styles.pickerBtnPill, { backgroundColor: C.surface2 }]}>
              <Text style={[styles.pickerBtnTxt, { color: Accent.amber, fontFamily: FontFamily.jakartaBold }]}>
                {t.market2.selectHandoverBtn}
              </Text>
              <Icon name="chevD" size={13} color={Accent.amber} />
            </View>
          </TouchableOpacity>

          {/* Optional custom spot details */}
          <TextInput
            style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium, marginTop: 8 }]}
            value={meetupSpot}
            onChangeText={setMeetupSpot}
            placeholder={t.market2.meetupSpotPlaceholder}
            placeholderTextColor={C.textMuted}
          />

          {/* 8. Description */}
          <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold, marginTop: 14 }]}>
            {t.market2.description}
          </Text>
          <TextInput
            style={[styles.textarea, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
            value={desc}
            onChangeText={setDesc}
            placeholder={t.market2.descriptionPlaceholder}
            placeholderTextColor={C.textMuted}
            multiline
            textAlignVertical="top"
          />

          {/* 9. Course Code - Books/Notes only */}
          {showCourse && (
            <>
              <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold, marginTop: 14 }]}>
                {t.market2.courseCode}
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                value={courseCode}
                onChangeText={v => setCourseCode(v.toUpperCase())}
                placeholder={t.market2.courseCodePlaceholder}
                placeholderTextColor={C.textMuted}
                autoCapitalize="characters"
              />
              <Text style={[styles.hint, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                {t.market2.courseCodeHint}
              </Text>
            </>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitBtn,
              {
                backgroundColor: canSubmit ? MARKET_COLOR : C.surface2,
                opacity: (loading || uploading) ? 0.7 : 1,
              },
            ]}
            onPress={handleSubmit}
            disabled={!canSubmit || loading || uploading}
            activeOpacity={0.85}
          >
            {loading || uploading ? (
              <ActivityIndicator color={canSubmit ? '#fff' : C.textMuted} size="small" />
            ) : (
              <Feather name={isEdit ? 'check' : 'plus-circle'} size={18} color={canSubmit ? '#fff' : C.textMuted} />
            )}
            <Text
              style={[
                styles.submitBtnTxt,
                {
                  color: canSubmit ? '#fff' : C.textMuted,
                  fontFamily: FontFamily.jakartaBold,
                },
              ]}
            >
              {uploading ? 'Uploading photo…' : loading ? t.common.save : isEdit ? t.market2.saveChanges : t.market2.postListing}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* MODAL 1: Camera vs Gallery Photo Picker */}
      <Modal
        visible={pickerModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerModalOpen(false)}
      >
        <View style={styles.photoModalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setPickerModalOpen(false)} />
          <View style={[styles.photoModalBox, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Text style={[styles.photoModalTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {t.market2.chooseSource}
            </Text>
            <TouchableOpacity style={styles.photoModalOption} onPress={handleLaunchCamera} activeOpacity={0.75}>
              <View style={[styles.photoModalIconBox, { backgroundColor: isDark ? `${MARKET_COLOR}25` : `${MARKET_COLOR}15` }]}>
                <Feather name="camera" size={18} color={MARKET_COLOR} />
              </View>
              <Text style={[styles.photoModalOptionTxt, { color: C.text, fontFamily: FontFamily.jakartaSemiBold }]}>
                {t.market2.takePhoto}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoModalOption} onPress={handleLaunchGallery} activeOpacity={0.75}>
              <View style={[styles.photoModalIconBox, { backgroundColor: isDark ? `${Accent.blue}25` : `${Accent.blue}15` }]}>
                <Feather name="image" size={18} color={Accent.blue} />
              </View>
              <Text style={[styles.photoModalOptionTxt, { color: C.text, fontFamily: FontFamily.jakartaSemiBold }]}>
                {t.market2.chooseGallery}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: Category Selector Bottom Sheet Modal */}
      <Modal
        visible={catModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setCatModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setCatModalOpen(false)} />
          <View
            style={[
              styles.modalSheet,
              {
                backgroundColor: C.surface,
                borderColor: C.border,
                paddingBottom: Math.max(insets.bottom, 20),
              },
            ]}
          >
            <View style={[styles.modalHandle, { backgroundColor: C.border }]} />
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={[styles.modalHeaderIcon, { backgroundColor: isDark ? `${MARKET_COLOR}25` : `${MARKET_COLOR}15` }]}>
                  <Feather name="grid" size={17} color={MARKET_COLOR} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    {t.market2.selectCategory}
                  </Text>
                  <Text style={[styles.modalSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                    Choose the item category for campus discovery
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setCatModalOpen(false)} style={[styles.modalCloseBtn, { backgroundColor: C.surface2 }]}>
                <Feather name="x" size={16} color={C.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
              {CATEGORIES.map(c => {
                const active = cat.toLowerCase() === c.id.toLowerCase();
                const label = (t.market2 as any)[c.labelKey] ?? c.id;
                const sub = (t.market2 as any)[c.subKey] ?? '';

                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.modalItemCard,
                      {
                        backgroundColor: active ? (isDark ? 'rgba(255, 255, 255, 0.04)' : `${c.color}08`) : C.surface,
                        borderColor: active ? c.color : C.border,
                        borderWidth: active ? 1.5 : 1,
                      },
                    ]}
                    onPress={() => {
                      setCat(c.id);
                      setCatModalOpen(false);
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.modalItemIconBox, { backgroundColor: isDark ? `${c.color}24` : `${c.color}15` }]}>
                      <Feather name={c.icon} size={18} color={c.color} />
                    </View>
                    <View style={styles.modalItemInfo}>
                      <Text style={[styles.modalItemNameTxt, { color: active ? c.color : C.text, fontFamily: FontFamily.jakartaBold }]}>
                        {label}
                      </Text>
                      {sub.length > 0 && (
                        <Text style={[styles.modalItemSubTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                          {sub}
                        </Text>
                      )}
                    </View>
                    {active && (
                      <View style={[styles.modalCheckCircle, { backgroundColor: c.color }]}>
                        <Feather name="check" size={11} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: Handover Location Area Picker Modal (Campus Hubs & Greater Dhaka) */}
      <Modal
        visible={locationModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setLocationModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setLocationModalOpen(false)} />
          <View
            style={[
              styles.modalSheet,
              {
                backgroundColor: C.surface,
                borderColor: C.border,
                paddingBottom: Math.max(insets.bottom, 20),
                maxHeight: '88%',
              },
            ]}
          >
            <View style={[styles.modalHandle, { backgroundColor: C.border }]} />

            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={[styles.modalHeaderIcon, { backgroundColor: isDark ? `${Accent.amber}25` : `${Accent.amber}15` }]}>
                  <Feather name="map-pin" size={17} color={Accent.amber} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    {t.market2.handoverModalTitle}
                  </Text>
                  <Text style={[styles.modalSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                    {t.market2.handoverModalSub}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setLocationModalOpen(false)} style={[styles.modalCloseBtn, { backgroundColor: C.surface2 }]}>
                <Feather name="x" size={16} color={C.text} />
              </TouchableOpacity>
            </View>

            {/* Search Box */}
            <View style={[styles.modalSearchBox, { backgroundColor: C.surface2, borderColor: C.border }]}>
              <Feather name="search" size={15} color={C.textMuted} />
              <TextInput
                style={[styles.modalSearchInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                placeholder={t.market2.searchLocationPlaceholder}
                placeholderTextColor={C.textMuted}
                value={searchLoc}
                onChangeText={setSearchLoc}
                autoCorrect={false}
              />
              {searchLoc.length > 0 && (
                <TouchableOpacity onPress={() => setSearchLoc('')} hitSlop={8}>
                  <Feather name="x" size={14} color={C.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Animated Tab Switcher: Campus vs Greater Dhaka */}
            <View
              style={[styles.categorySwitcherTrack, { backgroundColor: C.surface2 }]}
              onLayout={e => setLocTrackWidth(e.nativeEvent.layout.width)}
            >
              {locTabWidth > 0 && (
                <Animated.View
                  style={[
                    styles.categorySlidingIndicator,
                    {
                      width: locTabWidth,
                      transform: [{ translateX: locTranslateX }],
                      backgroundColor: C.surface,
                      borderColor: isDark ? `${Accent.amber}55` : `${Accent.amber}35`,
                    },
                  ]}
                />
              )}

              <TouchableOpacity
                style={styles.categorySwitcherBtn}
                onPress={() => setLocTab('campus')}
                activeOpacity={0.75}
              >
                <Feather name="map-pin" size={13} color={locTab === 'campus' ? Accent.amber : C.textMuted} />
                <Text
                  style={[
                    styles.categorySwitcherTxt,
                    {
                      color: locTab === 'campus' ? Accent.amber : C.textMuted,
                      fontFamily: locTab === 'campus' ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                    },
                  ]}
                >
                  {t.market2.tabCampusMirpur} (12)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.categorySwitcherBtn}
                onPress={() => setLocTab('dhaka')}
                activeOpacity={0.75}
              >
                <Feather name="compass" size={13} color={locTab === 'dhaka' ? Accent.amber : C.textMuted} />
                <Text
                  style={[
                    styles.categorySwitcherTxt,
                    {
                      color: locTab === 'dhaka' ? Accent.amber : C.textMuted,
                      fontFamily: locTab === 'dhaka' ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                    },
                  ]}
                >
                  {t.market2.tabGreaterDhaka} (44)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Use Custom Query Prompt */}
            {searchLoc.trim().length >= 2 && (
              <TouchableOpacity
                style={[styles.customLocPill, { backgroundColor: isDark ? `${Accent.amber}22` : `${Accent.amber}14`, borderColor: Accent.amber }]}
                onPress={() => handleSelectLocation(searchLoc.trim())}
                activeOpacity={0.8}
              >
                <Feather name="check" size={14} color={Accent.amber} />
                <Text style={[styles.customLocPillTxt, { color: Accent.amber, fontFamily: FontFamily.jakartaBold }]}>
                  {t.market2.useCustomLocation(searchLoc.trim())}
                </Text>
              </TouchableOpacity>
            )}

            {/* List of Locations */}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
              {locTab === 'campus' ? (
                filteredCampusSpots.map((spot, i) => {
                  const on = meetupSpot === spot.name;
                  return (
                    <TouchableOpacity
                      key={i}
                      style={[
                        styles.locCard,
                        {
                          backgroundColor: on ? (isDark ? 'rgba(255, 255, 255, 0.04)' : `${Accent.amber}08`) : C.surface,
                          borderColor: on ? Accent.amber : C.border,
                          borderWidth: on ? 1.5 : 1,
                        },
                      ]}
                      onPress={() => handleSelectLocation(spot.name)}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.locIconBox, { backgroundColor: isDark ? `${Accent.amber}22` : `${Accent.amber}14` }]}>
                        <Feather name={spot.icon} size={16} color={Accent.amber} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={[styles.locName, { color: on ? Accent.amber : C.text, fontFamily: FontFamily.jakartaBold }]}>
                            {spot.name}
                          </Text>
                          <Text style={[styles.locNameBn, { color: C.textMuted }]}>
                            ({spot.nameBn})
                          </Text>
                        </View>
                        <Text style={[styles.locDesc, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                          {spot.desc}
                        </Text>
                      </View>
                      {on && (
                        <View style={[styles.modalCheckCircle, { backgroundColor: Accent.amber }]}>
                          <Feather name="check" size={11} color="#fff" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })
              ) : (
                filteredDhakaAreas.map((area, i) => {
                  const on = meetupSpot === area.name;
                  return (
                    <TouchableOpacity
                      key={i}
                      style={[
                        styles.locCard,
                        {
                          backgroundColor: on ? (isDark ? 'rgba(255, 255, 255, 0.04)' : `${Accent.amber}08`) : C.surface,
                          borderColor: on ? Accent.amber : C.border,
                          borderWidth: on ? 1.5 : 1,
                        },
                      ]}
                      onPress={() => handleSelectLocation(area.name)}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.locIconBox, { backgroundColor: isDark ? `${Accent.amber}22` : `${Accent.amber}14` }]}>
                        <Feather name={area.icon as any} size={16} color={Accent.amber} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={[styles.locName, { color: on ? Accent.amber : C.text, fontFamily: FontFamily.jakartaBold }]}>
                            {area.name}
                          </Text>
                          <Text style={[styles.locNameBn, { color: C.textMuted }]}>
                            ({area.nameBn})
                          </Text>
                        </View>
                        <Text style={[styles.locDesc, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                          {area.desc}
                        </Text>
                      </View>
                      {on && (
                        <View style={[styles.modalCheckCircle, { backgroundColor: Accent.amber }]}>
                          <Feather name="check" size={11} color="#fff" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  scroll: { paddingBottom: 40, paddingTop: 6 } as ViewStyle,
  label: { fontSize: 11, letterSpacing: 0.5, marginBottom: 6 } as any,
  subLabel: { fontSize: 11, marginBottom: 5 } as any,
  hint: { fontSize: 11, marginTop: 4 } as any,

  // Picker Bar Style (Used for Category & Handover Location)
  pickerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
  } as ViewStyle,
  pickerBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 8,
  } as ViewStyle,
  pickerIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  pickerBarTitle: {
    fontSize: 13.5,
    flex: 1,
  } as any,
  pickerBtnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  } as ViewStyle,
  pickerBtnTxt: {
    fontSize: 12,
  } as any,

  // Text inputs
  input: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  } as TextStyle,
  textarea: {
    height: 90,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 10,
    fontSize: 13.5,
  } as TextStyle,

  // Photo
  photoBox: {
    height: 110,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  photoPreviewWrapper: { width: '100%', height: '100%', position: 'relative' } as ViewStyle,
  photoPreview: { width: '100%', height: '100%' } as any,
  photoRemoveBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  photoPlaceholder: { alignItems: 'center', justifyContent: 'center', gap: 4 } as ViewStyle,
  photoPlaceholderTxt: { fontSize: 13 } as any,
  photoSubTxt: { fontSize: 11 } as any,

  // Spring Animated Condition Bar
  condTrack: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 3,
    position: 'relative',
    height: 42,
  } as ViewStyle,
  condIndicator: {
    position: 'absolute',
    top: 3,
    left: 3,
    bottom: 3,
    borderRadius: 11,
    borderWidth: 1.5,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
  } as ViewStyle,
  condBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  } as ViewStyle,
  condBtnTxt: { fontSize: 13 } as any,

  // Switch row
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  } as ViewStyle,
  switchLabel: { fontSize: 13.5 } as any,
  switchSub: { fontSize: 11.5, marginTop: 2 } as any,

  // Submit button
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 14,
    marginTop: 22,
  } as ViewStyle,
  submitBtnTxt: { fontSize: 14.5 } as any,

  // Photo modal
  photoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  } as ViewStyle,
  photoModalBox: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    gap: 12,
  } as ViewStyle,
  photoModalTitle: { fontSize: 16, marginBottom: 4 } as any,
  photoModalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
  } as ViewStyle,
  photoModalIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  photoModalOptionTxt: { fontSize: 14 } as any,

  // Bottom Sheet Modal Shared Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  } as ViewStyle,
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  } as ViewStyle,
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingTop: 8,
    paddingHorizontal: 18,
  } as ViewStyle,
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  } as ViewStyle,
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  } as ViewStyle,
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  } as ViewStyle,
  modalHeaderIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  modalTitle: { fontSize: 16.5 } as any,
  modalSub: { fontSize: 12, marginTop: 1 } as any,
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  // Category item card
  modalItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    marginBottom: 8,
  } as ViewStyle,
  modalItemIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  modalItemInfo: { flex: 1 } as ViewStyle,
  modalItemNameTxt: { fontSize: 14 } as any,
  modalItemSubTxt: { fontSize: 11.5, marginTop: 2 } as any,
  modalCheckCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  // Location search box
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 38,
    borderRadius: 11,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 10,
  } as ViewStyle,
  modalSearchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  } as TextStyle,

  // 2-Bar Switcher
  categorySwitcherTrack: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    marginBottom: 10,
    position: 'relative',
    height: 38,
  } as ViewStyle,
  categorySlidingIndicator: {
    position: 'absolute',
    top: 3,
    left: 3,
    bottom: 3,
    borderRadius: 9,
    borderWidth: 1.5,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
  } as ViewStyle,
  categorySwitcherBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    zIndex: 1,
  } as ViewStyle,
  categorySwitcherTxt: { fontSize: 12 } as any,

  // Custom location query pill
  customLocPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  } as ViewStyle,
  customLocPillTxt: { fontSize: 12.5 } as any,

  // Location card
  locCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 11,
    borderRadius: 13,
    marginBottom: 7,
  } as ViewStyle,
  locIconBox: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  locName: { fontSize: 13.5 } as any,
  locNameBn: { fontSize: 12 } as any,
  locDesc: { fontSize: 11.5, marginTop: 2 } as any,
});
