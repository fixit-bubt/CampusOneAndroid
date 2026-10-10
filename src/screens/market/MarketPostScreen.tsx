// Create / edit marketplace listing with camera capture, free giveaway mode,
// and meetup spot selection.
import { useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView, Switch, KeyboardAvoidingView,
  StyleSheet, Image, Modal, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import type { Listing } from '../../types/database';

const MARKET_COLOR = SectorColors.market;

const CATEGORIES: { id: Listing['category']; labelKey: string; icon: keyof typeof Feather.glyphMap; color: string }[] = [
  { id: 'Books',       labelKey: 'catBooks',       icon: 'book-open', color: Accent.blue   },
  { id: 'Electronics', labelKey: 'catElectronics', icon: 'cpu',       color: Accent.purple },
  { id: 'Notes',       labelKey: 'catNotes',       icon: 'file-text', color: Accent.teal   },
  { id: 'Furniture',   labelKey: 'catFurniture',   icon: 'layers',    color: Accent.amber  },
  { id: 'Other',       labelKey: 'catOther',       icon: 'package',   color: Accent.slate  },
];

const CONDITIONS: { id: Listing['condition']; labelKey: string }[] = [
  { id: 'New',      labelKey: 'condNew'      },
  { id: 'Like New', labelKey: 'condLikeNew'  },
  { id: 'Used',     labelKey: 'condUsed'     },
];

const MEETUP_SPOTS = [
  'Cafeteria',
  'Library',
  'Building 2 Lobby',
  'Main Gate',
  'Campus Front',
  'Anywhere on Campus',
];

export function MarketPostScreen({ route, navigation }: any) {
  const { listing } = (route.params ?? {}) as { listing?: Listing };
  const { C, isDark } = useTheme();
  const t = useT();
  const { user } = useAuth();
  const toast = useToast();

  const isEdit = !!listing;
  const initialPrice = listing?.price !== undefined ? listing.price : null;
  const [cat, setCat] = useState<Listing['category'] | null>(listing?.category ?? null);
  const [title, setTitle] = useState(listing?.title ?? '');
  const [isFree, setIsFree] = useState(initialPrice === 0);
  const [price, setPrice] = useState(initialPrice !== null && initialPrice > 0 ? String(initialPrice) : '');
  const [condition, setCondition] = useState<Listing['condition']>(listing?.condition ?? 'Used');
  const [negotiable, setNegotiable] = useState(listing?.negotiable ?? true);
  const [desc, setDesc] = useState(listing?.description ?? '');
  const [courseCode, setCourseCode] = useState(listing?.course_code ?? '');
  const [meetupSpot, setMeetupSpot] = useState(listing?.meetup_spot ?? '');
  const [photoUri, setPhotoUri] = useState<string | null>(listing?.photo_url ?? null);

  const [pickerModalOpen, setPickerModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  // Submission validation
  const validPrice = isFree ? true : Number(price) > 0;
  const canSubmit = cat !== null && title.trim().length >= 2 && validPrice;

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
      const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const fileName = `${user.id}_${Date.now()}.${ext}`;
      const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';
      const res = await uploadFile('photos', uri, `marketplace/${user.id}/${fileName}`, contentType);
      if (!res.success) throw new Error(res.error);
      setPhotoUri(res.url);
    } catch {
      toast({ type: 'error', title: t.market2.uploadFailed, message: t.market2.uploadFailedBody });
    } finally {
      setUploading(false);
    }
  }

  // Save / Post listing
  async function handleSubmit() {
    if (!canSubmit || !user || loading) return;
    setLoading(true);
    try {
      const numericPrice = isFree ? 0 : parseInt(price, 10);
      const payload: any = {
        title:       title.trim(),
        price:       numericPrice,
        category:    cat,
        condition,
        negotiable:  isFree ? false : negotiable,
        description: desc.trim(),
        photo_url:   photoUri ?? null,
        course_code: showCourse ? (courseCode.trim().toUpperCase() || null) : null,
        meetup_spot: meetupSpot.trim() || null,
        seller_id:   user.id,
        // Preserve existing status if editing (e.g. don't revive a 'Sold' item)
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

        // Synchronously update local cache
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

        // Prepend to local cache
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
          {/* Category */}
          <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {t.market2.category}
          </Text>
          <View style={styles.catGrid}>
            {CATEGORIES.map(c => {
              const on = cat === c.id;
              const label = (t.market2 as any)[c.labelKey] ?? c.id;
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    styles.catBtn,
                    {
                      borderColor: on ? c.color : C.border,
                      backgroundColor: on ? (isDark ? `${c.color}2e` : `${c.color}14`) : C.surface,
                    },
                  ]}
                  onPress={() => setCat(c.id)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.catIcon, { backgroundColor: `${c.color}1f` }]}>
                    <Feather name={c.icon} size={15} color={c.color} />
                  </View>
                  <Text style={[styles.catLabel, { color: on ? c.color : C.text2, fontFamily: FontFamily.jakartaBold }]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Title */}
          <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {t.market2.itemName}
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
            value={title}
            onChangeText={setTitle}
            placeholder={t.market2.itemNamePlaceholder}
            placeholderTextColor={C.textMuted}
          />

          {/* Photo */}
          <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
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
                <Feather name="camera" size={24} color={MARKET_COLOR} />
                <Text style={[styles.photoPlaceholderTxt, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>
                  {uploading ? t.market2.uploading : t.market2.tapToAddPhoto}
                </Text>
                <Text style={[styles.photoSubTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                  Camera or Gallery
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Free Donation Mode Toggle */}
          <View style={[styles.switchRow, { backgroundColor: C.surface, borderColor: C.border, marginTop: 18 }]}>
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

          {/* Price */}
          {!isFree && (
            <>
              <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
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
            </>
          )}

          {/* Condition */}
          <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {t.market2.condition}
          </Text>
          <View style={[styles.segRow, { backgroundColor: C.surface2, borderColor: C.border }]}>
            {CONDITIONS.map(c => {
              const on = condition === c.id;
              const label = (t.market2 as any)[c.labelKey] ?? c.id;
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.segBtn, on && { backgroundColor: MARKET_COLOR }]}
                  onPress={() => setCondition(c.id)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.segText, { color: on ? '#fff' : C.text2, fontFamily: FontFamily.jakartaBold }]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Negotiable (only if not free) */}
          {!isFree && (
            <View style={[styles.switchRow, { backgroundColor: C.surface, borderColor: C.border, marginTop: 12 }]}>
              <Text style={[styles.switchLabel, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {t.market2.negotiable}
              </Text>
              <Switch
                value={negotiable}
                onValueChange={setNegotiable}
                trackColor={{ false: C.border, true: MARKET_COLOR }}
                thumbColor="#fff"
              />
            </View>
          )}

          {/* Handover Meetup Spot */}
          <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {t.market2.meetupSpotOptional}
          </Text>
          <View style={styles.spotChipsRow}>
            {MEETUP_SPOTS.map(spot => {
              const on = meetupSpot === spot;
              return (
                <TouchableOpacity
                  key={spot}
                  style={[
                    styles.spotChip,
                    {
                      backgroundColor: on ? (isDark ? 'rgba(217,119,6,0.2)' : 'rgba(217,119,6,0.1)') : C.surface,
                      borderColor: on ? MARKET_COLOR : C.border,
                    },
                  ]}
                  onPress={() => setMeetupSpot(on ? '' : spot)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.spotChipTxt, { color: on ? MARKET_COLOR : C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>
                    {spot}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TextInput
            style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium, marginTop: 8 }]}
            value={meetupSpot}
            onChangeText={setMeetupSpot}
            placeholder={t.market2.meetupSpotPlaceholder}
            placeholderTextColor={C.textMuted}
          />

          {/* Description */}
          <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
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

          {/* Course code - books/notes only */}
          {showCourse && (
            <>
              <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
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
              { backgroundColor: canSubmit ? MARKET_COLOR : C.surface2, opacity: loading ? 0.6 : 1 },
            ]}
            onPress={handleSubmit}
            disabled={!canSubmit || loading}
            activeOpacity={0.8}
          >
            <Icon name="check" size={18} color={canSubmit ? '#fff' : C.textMuted} />
            <Text style={[styles.submitText, { color: canSubmit ? '#fff' : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
              {isEdit ? t.market2.saveChanges : t.market2.postListing}
            </Text>
          </TouchableOpacity>

          <View style={{ height: 36 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Photo Picker Modal (Camera vs Gallery) */}
      <Modal visible={pickerModalOpen} transparent animationType="fade" onRequestClose={() => setPickerModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setPickerModalOpen(false)} />
          <View style={[styles.modalContent, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Text style={[styles.modalTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {t.market2.chooseSource}
            </Text>

            <TouchableOpacity style={[styles.modalOption, { borderBottomColor: C.border }]} onPress={handleLaunchCamera} activeOpacity={0.75}>
              <Feather name="camera" size={20} color={MARKET_COLOR} />
              <Text style={[styles.modalOptionTxt, { color: C.text, fontFamily: FontFamily.jakartaSemiBold }]}>
                {t.market2.takePhoto}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalOption} onPress={handleLaunchGallery} activeOpacity={0.75}>
              <Feather name="image" size={20} color={Accent.blue} />
              <Text style={[styles.modalOptionTxt, { color: C.text, fontFamily: FontFamily.jakartaSemiBold }]}>
                {t.market2.chooseGallery}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalCancelBtn, { backgroundColor: C.surface2 }]}
              onPress={() => setPickerModalOpen(false)}
              activeOpacity={0.8}
            >
              <Text style={[styles.modalCancelTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                {t.common.cancel}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  scroll: { paddingTop: 10, paddingBottom: 20 } as ViewStyle,

  label: {
    fontSize: 11,
    letterSpacing: 0.7,
    marginBottom: 8,
    marginTop: 18,
    marginLeft: 2,
  } as any,

  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  } as ViewStyle,
  catBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1.5,
  } as ViewStyle,
  catIcon: {
    width: 26,
    height: 26,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  catLabel: { fontSize: 13 } as any,

  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14.5,
  } as any,

  photoBox: {
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    overflow: 'hidden',
    minHeight: 125,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  photoPreviewWrapper: {
    width: '100%',
    height: 180,
    position: 'relative',
  } as ViewStyle,
  photoPreview: {
    width: '100%',
    height: '100%',
  } as any,
  photoRemoveBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 4,
  } as ViewStyle,
  photoPlaceholderTxt: { fontSize: 14 } as any,
  photoSubTxt: { fontSize: 11 } as any,

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 13,
    borderRadius: 14,
    borderWidth: 1,
  } as ViewStyle,
  switchLabel: { fontSize: 14 } as any,
  switchSub: { fontSize: 11.5, marginTop: 2, lineHeight: 16 } as any,

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
  segText: { fontSize: 13.5 } as any,

  spotChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  } as ViewStyle,
  spotChip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  } as ViewStyle,
  spotChipTxt: { fontSize: 12 } as any,

  textarea: {
    minHeight: 96,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    lineHeight: 21,
  } as any,

  hint: { fontSize: 11.5, marginTop: 6, marginLeft: 2, lineHeight: 16 } as any,

  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 14,
    marginTop: 24,
  } as ViewStyle,
  submitText: { fontSize: 15 } as any,

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  } as ViewStyle,
  modalBackdrop: { flex: 1 } as ViewStyle,
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    padding: 18,
    paddingBottom: 30,
  } as ViewStyle,
  modalTitle: { fontSize: 15, marginBottom: 12, textAlign: 'center' } as any,
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  } as ViewStyle,
  modalOptionTxt: { fontSize: 14.5 } as any,
  modalCancelBtn: {
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  } as ViewStyle,
  modalCancelTxt: { fontSize: 14 } as any,
});
