import { useState, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView,
  StyleSheet, Image, Modal, Animated, Dimensions, ActivityIndicator, type ViewStyle, type TextStyle,
} from 'react-native';
import { TactileSwitch } from '../../components/ui/TactileSwitch';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { SegmentedTabs, type TabItem } from '../../components/ui/SegmentedTabs';
import { LocationPickerModal } from '../../components/location/LocationPickerModal';
import { AnimatedIcon } from '../../components/ui/AnimatedIcon';
import { FontFamily, Layout, Accent, SectorColors } from '../../theme';
import { useToast } from '../../components/ui/Toast';
import { supabase } from '../../lib/supabase';
import { uploadPhoto, uploadFile } from '../../utils/storage';
import { getCache, setCache, CacheKeys } from '../../services/cacheService';
import { ALL_DHAKA_COMMUTE_AREAS } from '../rides/RidePostScreen';
import { BUBT_COORDS, type Coordinates } from '../../services/locationService';
import { findMasterLocationByName } from '../../constants/dhakaMasterLocations';
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
  const [meetupCoords, setMeetupCoords] = useState<Coordinates | null>(
    (listing?.latitude && listing?.longitude) ? { latitude: listing.latitude, longitude: listing.longitude } : null
  );
  const [customMode, setCustomMode] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(listing?.photo_url ?? null);
  const [isLocalPhoto, setIsLocalPhoto] = useState(false);

  // Modals
  const [pickerModalOpen, setPickerModalOpen] = useState(false);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [locTab, setLocTab] = useState<'campus' | 'dhaka'>('campus');
  const [searchLoc, setSearchLoc] = useState('');

  // Loading states
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  const CONDITION_TABS: TabItem<Listing['condition']>[] = useMemo(() => [
    { id: 'New',      label: t.market2.condNew,     color: '#059669' },
    { id: 'Like New', label: t.market2.condLikeNew, color: '#2563EB' },
    { id: 'Used',     label: t.market2.condUsed,    color: '#64748B' },
  ], [t]);

  const LOC_TABS: TabItem<'campus' | 'dhaka'>[] = useMemo(() => [
    { id: 'campus', label: t.market2.tabCampusMirpur, color: Accent.amber },
    { id: 'dhaka',  label: t.market2.tabGreaterDhaka, color: Accent.amber },
  ], [t]);

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
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        toast({ type: 'info', title: t.market2.permissionRequired, message: 'Please grant camera access to take a photo.' });
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.85,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setPhotoUri(result.assets[0].uri);
        setIsLocalPhoto(true);
      }
    } catch (e: any) {
      toast({ type: 'error', title: 'Camera Error', message: e?.message || 'Could not launch camera.' });
    }
  }

  // Gallery picker
  async function handleLaunchGallery() {
    setPickerModalOpen(false);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        toast({ type: 'info', title: t.market2.permissionRequired, message: t.market2.photoPermissionBody });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.85,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setPhotoUri(result.assets[0].uri);
        setIsLocalPhoto(true);
      }
    } catch (e: any) {
      toast({ type: 'error', title: 'Gallery Error', message: e?.message || 'Could not access photo library.' });
    }
  }

  function handleRemovePhoto() {
    setPhotoUri(null);
    setIsLocalPhoto(false);
  }

  // Location selection helper
  function handleSelectLocation(name: string) {
    setMeetupSpot(name);
    const found = findMasterLocationByName(name);
    if (found) {
      setMeetupCoords(found.coords);
    } else if (name.toLowerCase().includes('bubt')) {
      setMeetupCoords(BUBT_COORDS);
    }
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
      let finalPhotoUrl = listing?.photo_url ?? null;
      if (photoUri && isLocalPhoto) {
        setUploading(true);
        const up = await uploadPhoto(photoUri, 'marketplace', user.id);
        setUploading(false);
        if (!up.success) {
          setLoading(false);
          toast({ type: 'error', title: t.market2.uploadFailed, message: up.error || t.market2.uploadFailedBody });
          return;
        }
        finalPhotoUrl = up.url;
      } else if (!photoUri) {
        finalPhotoUrl = null;
      }

      const numericPrice = isFree ? 0 : (parseInt(price.replace(/[^0-9]/g, ''), 10) || 0);
      const finalCategory = cat === 'Other' && customCat.trim() ? customCat.trim() : cat;

      const finalCoords = meetupCoords || (meetupSpot ? findMasterLocationByName(meetupSpot.trim())?.coords : null) || (meetupSpot?.toLowerCase().includes('bubt') ? BUBT_COORDS : null);

      const payload: any = {
        title:       title.trim(),
        price:       numericPrice,
        category:    finalCategory,
        condition,
        negotiable:  isFree ? false : negotiable,
        description: desc.trim(),
        photo_url:   finalPhotoUrl,
        photos:      finalPhotoUrl ? [finalPhotoUrl] : [],
        course_code: showCourse ? (courseCode.trim().toUpperCase() || null) : null,
        meetup_spot: meetupSpot.trim() || null,
        latitude:    finalCoords?.latitude ?? null,
        longitude:   finalCoords?.longitude ?? null,
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

          {/* Custom Category Input if 'Other' selected (Universal 58dp Standard) */}
          {cat === 'Other' && (
            <View style={{ marginTop: 8 }}>
              <Text style={[styles.subLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaSemiBold }]}>
                {t.market2.customCategoryLabel}
              </Text>
              <View style={[styles.input58WithIcon, { backgroundColor: C.surface, borderColor: customCat ? MARKET_COLOR : C.border }]}>
                <Feather name="folder-plus" size={18} color={customCat ? MARKET_COLOR : C.textMuted} />
                <TextInput
                  style={[styles.innerInput58, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                  value={customCat}
                  onChangeText={setCustomCat}
                  placeholder={t.market2.customCategoryPlaceholder}
                  placeholderTextColor={C.textMuted}
                />
              </View>
            </View>
          )}

          {/* 2. Item Title (Universal 58dp Standard) */}
          <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold, marginTop: 14 }]}>
            {t.market2.itemName} *
          </Text>
          <View style={[styles.input58WithIcon, { backgroundColor: C.surface, borderColor: title ? MARKET_COLOR : C.border }]}>
            <Feather name="tag" size={18} color={title ? MARKET_COLOR : C.textMuted} />
            <TextInput
              style={[styles.innerInput58, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
              value={title}
              onChangeText={setTitle}
              placeholder={t.market2.itemNamePlaceholder}
              placeholderTextColor={C.textMuted}
            />
          </View>

          {/* 3. Photo Attachment */}
          <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold, marginTop: 14 }]}>
            {t.market2.photoOptional}
          </Text>
          <View style={[styles.photoBox, { backgroundColor: C.surface, borderColor: photoUri ? MARKET_COLOR : C.border }]}>
            {photoUri ? (
              <View style={styles.photoPreviewWrapper}>
                <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
                <TouchableOpacity
                  style={styles.photoRemoveBtn}
                  onPress={handleRemovePhoto}
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
          <SegmentedTabs<Listing['condition']>
            tabs={CONDITION_TABS}
            activeTab={condition}
            onTabChange={setCondition}
          />

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
            <TactileSwitch
              value={isFree}
              onValueChange={handleToggleFree}
              variant="success"
            />

          </View>

          {/* 6. Price & Negotiable (Universal 58dp Standard) */}
          {!isFree && (
            <>
              <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold, marginTop: 14 }]}>
                {t.market2.priceLabel} *
              </Text>
              <View style={[styles.input58WithIcon, { backgroundColor: C.surface, borderColor: price ? MARKET_COLOR : C.border }]}>
                <Text style={[styles.currencyPrefix, { color: MARKET_COLOR, fontFamily: FontFamily.jakartaExtraBold }]}>৳</Text>
                <TextInput
                  style={[styles.innerInput58, { color: C.text, fontFamily: FontFamily.jakartaBold, fontSize: 16 }]}
                  value={price}
                  onChangeText={v => setPrice(v.replace(/\D/g, ''))}
                  placeholder={t.market2.pricePlaceholder}
                  placeholderTextColor={C.textMuted}
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.switchRow, { backgroundColor: C.surface, borderColor: C.border, marginTop: 10 }]}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={[styles.switchLabel, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    {t.market2.negotiable}
                  </Text>
                  <Text style={[styles.switchSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                    Open to reasonable price negotiation with peers
                  </Text>
                </View>
                <TactileSwitch
                  value={negotiable}
                  onValueChange={setNegotiable}
                  trackColor={{ true: MARKET_COLOR }}
                />
              </View>
            </>
          )}

          {/* 7. Dedicated Handover Location (Blood Donation 72dp Standard) */}
          <View style={styles.labelRow}>
            <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold, marginTop: 0 }]}>
              {t.market2.meetupSpot || 'HANDOVER LOCATION'}
            </Text>
            <TouchableOpacity
              onPress={() => setCustomMode(!customMode)}
              style={styles.toggleModeBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name={customMode ? 'list' : 'edit-2'} size={11} color={C.text2} />
              <Text style={[styles.toggleModeTxt, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>
                {customMode ? 'Choose from list' : 'Type custom'}
              </Text>
            </TouchableOpacity>
          </View>

          {customMode ? (
            <View style={[styles.input58WithIcon, { backgroundColor: C.surface, borderColor: meetupSpot ? MARKET_COLOR : C.border }]}>
              <Feather name="edit-3" size={18} color={meetupSpot ? MARKET_COLOR : C.textMuted} />
              <TextInput
                style={[styles.innerInput58, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                value={meetupSpot}
                onChangeText={setMeetupSpot}
                placeholder="Enter custom handover or meetup spot..."
                placeholderTextColor={C.textMuted}
                autoFocus
              />
              {meetupSpot.length > 0 && (
                <TouchableOpacity onPress={() => setMeetupSpot('')} hitSlop={8}>
                  <Feather name="x" size={16} color={C.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View
              style={[
                styles.dropdownCard,
                {
                  backgroundColor: C.surface,
                  borderColor: meetupSpot ? MARKET_COLOR : C.border,
                  borderWidth: meetupSpot ? 1.5 : 1,
                },
              ]}
            >
              <TouchableOpacity
                style={styles.dropdownMain}
                onPress={() => setLocationModalOpen(true)}
                activeOpacity={0.75}
              >
                <View
                  style={[
                    styles.dropdownIconBox,
                    {
                      backgroundColor: meetupSpot ? (isDark ? 'rgba(5, 150, 105, 0.22)' : 'rgba(5, 150, 105, 0.12)') : C.surface2,
                      borderColor: meetupSpot ? MARKET_COLOR : C.border,
                      borderWidth: 1,
                    },
                  ]}
                >
                  <AnimatedIcon
                    key={`spot-${meetupSpot}`}
                    family="feather"
                    name="map-pin"
                    size={22}
                    color={meetupSpot ? MARKET_COLOR : C.text2}
                    animation={meetupSpot ? 'spring' : 'entrance'}
                  />
                </View>
                <View style={styles.dropdownInfo}>
                  <Text
                    style={[
                      styles.dropdownValue,
                      {
                        color: meetupSpot ? C.text : C.textMuted,
                        fontFamily: meetupSpot ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {meetupSpot || 'Select campus spot or Dhaka area...'}
                  </Text>
                  <Text style={[styles.dropdownHint, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                    {meetupSpot ? 'Tap to change handover spot' : 'BUBT campus hubs, gates & commute points'}
                  </Text>
                </View>
              </TouchableOpacity>
              <View style={styles.dropdownRight}>
                {meetupSpot ? (
                  <TouchableOpacity
                    onPress={() => setMeetupSpot('')}
                    style={[styles.clearPill, { backgroundColor: C.surface2, borderColor: C.border, borderWidth: 1 }]}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather name="x" size={14} color={C.textMuted} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={() => setLocationModalOpen(true)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather name="chevron-down" size={18} color={C.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

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

          {/* 9. Course Code - Books/Notes only (Universal 58dp Standard) */}
          {showCourse && (
            <>
              <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold, marginTop: 14 }]}>
                {t.market2.courseCode}
              </Text>
              <View style={[styles.input58WithIcon, { backgroundColor: C.surface, borderColor: courseCode ? MARKET_COLOR : C.border }]}>
                <Feather name="book" size={18} color={courseCode ? MARKET_COLOR : C.textMuted} />
                <TextInput
                  style={[styles.innerInput58, { color: C.text, fontFamily: FontFamily.jakartaBold }]}
                  value={courseCode}
                  onChangeText={v => setCourseCode(v.toUpperCase())}
                  placeholder={t.market2.courseCodePlaceholder}
                  placeholderTextColor={C.textMuted}
                  autoCapitalize="characters"
                />
              </View>
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
                      <Text style={[styles.modalItemNameTxt, { color: active ? c.color : C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                        {label}
                      </Text>
                      {sub.length > 0 && (
                        <Text style={[styles.modalItemSubTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]} numberOfLines={1}>
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
          <KeyboardAvoidingView behavior="padding" style={{ width: '100%', justifyContent: 'flex-end' }}>
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

            {/* Universal 72dp Interactive Map & GPS Trigger */}
            <TouchableOpacity
              style={[
                styles.mapTriggerCard72,
                {
                  backgroundColor: isDark ? `${Accent.amber}18` : `${Accent.amber}0f`,
                  borderColor: isDark ? `${Accent.amber}44` : `${Accent.amber}30`,
                },
              ]}
              onPress={() => {
                setLocationModalOpen(false);
                setMapModalOpen(true);
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.mapTriggerIconWrap, { backgroundColor: `${Accent.amber}24` }]}>
                <Feather name="map" size={18} color={Accent.amber} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.mapTriggerTitle, { color: Accent.amber, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                  Pick on Interactive Map or Use GPS
                </Text>
                <Text style={[styles.mapTriggerSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                  Pinpoint exact campus gate, canteen, or Dhaka meetup spot
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={Accent.amber} />
            </TouchableOpacity>

            {/* Search Box */}
            <View style={[styles.modalSearchBox, { backgroundColor: C.surface2, borderColor: C.border }]}>
              <Feather name="search" size={18} color={C.textMuted} />
              <TextInput
                style={[styles.modalSearchInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                placeholder={t.market2.searchLocationPlaceholder}
                placeholderTextColor={C.textMuted}
                value={searchLoc}
                onChangeText={setSearchLoc}
                autoCorrect={false}
                multiline={false}
                numberOfLines={1}
              />
              {searchLoc.length > 0 && (
                <TouchableOpacity onPress={() => setSearchLoc('')} hitSlop={8}>
                  <Feather name="x" size={14} color={C.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Animated Tab Switcher: Campus vs Greater Dhaka */}
            <View style={{ marginBottom: 12 }}>
              <SegmentedTabs<'campus' | 'dhaka'>
                size="sm"
                tabs={LOC_TABS}
                activeTab={locTab}
                onTabChange={setLocTab}
              />
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
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 16 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
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
                        <Feather name={spot.icon} size={18} color={Accent.amber} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={[styles.locName, { color: on ? Accent.amber : C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                            {spot.name}
                          </Text>
                          <Text style={[styles.locNameBn, { color: C.textMuted }]} numberOfLines={1}>
                            ({spot.nameBn})
                          </Text>
                        </View>
                        <Text style={[styles.locDesc, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]} numberOfLines={1}>
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
                        <Feather name={area.icon as any} size={18} color={Accent.amber} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={[styles.locName, { color: on ? Accent.amber : C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                            {area.name}
                          </Text>
                          <Text style={[styles.locNameBn, { color: C.textMuted }]} numberOfLines={1}>
                            ({area.nameBn})
                          </Text>
                        </View>
                        <Text style={[styles.locDesc, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]} numberOfLines={1}>
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
        </KeyboardAvoidingView>
      </View>
    </Modal>

    {/* Interactive Map & GPS Picker Modal */}
    <LocationPickerModal
      visible={mapModalOpen}
      onClose={() => setMapModalOpen(false)}
      accentColor={Accent.amber}
      title="Select Meetup Location"
      initialPlaceName={meetupSpot}
      onSelectLocation={(place) => {
        setMeetupSpot(place.formattedAddress);
        setMeetupCoords(place.coords);
      }}
    />
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
    height: 58,
    paddingHorizontal: 14,
    borderRadius: 16,
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

  // Universal 58dp Inputs
  input58WithIcon: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  } as ViewStyle,
  innerInput58: {
    flex: 1,
    height: '100%',
    fontSize: 14.5,
    paddingVertical: 0,
  } as TextStyle,
  currencyPrefix: {
    fontSize: 19,
    width: 20,
    textAlign: 'center',
  } as TextStyle,

  // Handover Location 72dp Dropdown (Matches Blood Request Dropdown Standard)
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 6,
  } as ViewStyle,
  toggleModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
  } as ViewStyle,
  toggleModeTxt: {
    fontSize: 11,
  } as TextStyle,
  dropdownCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 72,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    gap: 12,
  } as ViewStyle,
  dropdownMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  } as ViewStyle,
  dropdownIconBox: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  dropdownInfo: {
    flex: 1,
    justifyContent: 'center',
  } as ViewStyle,
  dropdownValue: {
    fontSize: 14.5,
  } as TextStyle,
  dropdownHint: {
    fontSize: 11.5,
    marginTop: 2,
    lineHeight: 16,
  } as TextStyle,
  dropdownRight: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 4,
  } as ViewStyle,
  clearPill: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

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
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    fontSize: 14,
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
    gap: 9,
    height: 58,
    borderRadius: 16,
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

  // Category item card (Universal 72dp Standard)
  modalItemCard: {
    height: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginBottom: 8,
  } as ViewStyle,
  modalItemIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  modalItemInfo: { flex: 1, justifyContent: 'center' } as ViewStyle,
  modalItemNameTxt: { fontSize: 14, includeFontPadding: false } as any,
  modalItemSubTxt: { fontSize: 11.5, marginTop: 2, includeFontPadding: false } as any,
  modalCheckCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  /* Universal 72dp Map & GPS Trigger Card Standard */
  mapTriggerCard72: {
    height: 72,
    borderRadius: 16,
    borderWidth: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 10,
    gap: 12,
  } as ViewStyle,
  mapTriggerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  mapTriggerTitle: {
    fontSize: 14,
    lineHeight: 18,
    includeFontPadding: false,
  } as TextStyle,
  mapTriggerSub: {
    fontSize: 11.5,
    lineHeight: 15,
    marginTop: 2,
    includeFontPadding: false,
  } as TextStyle,

  // Location search box
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    marginBottom: 10,
  } as ViewStyle,
  modalSearchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14.5,
    paddingVertical: 0,
    textAlignVertical: 'center',
    includeFontPadding: false,
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

  // Universal 72dp Location Card Standard
  locCard: {
    height: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginBottom: 8,
  } as ViewStyle,
  locIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  locName: { fontSize: 14, includeFontPadding: false } as any,
  locNameBn: { fontSize: 12, includeFontPadding: false } as any,
  locDesc: { fontSize: 11.5, marginTop: 2, includeFontPadding: false } as any,
});
