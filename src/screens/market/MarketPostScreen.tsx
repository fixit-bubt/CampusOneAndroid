// Create / edit listing.
import { useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView, Switch, KeyboardAvoidingView, Platform,
  StyleSheet, Image, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout, Radius , Accent } from '../../theme';
import { useToast } from '../../components/ui/Toast';
import { supabase } from '../../lib/supabase';
import { uploadFile } from '../../utils/storage';
import type { Listing } from '../../types/database';

const CATEGORIES: { id: Listing['category']; label: string; icon: string; color: string }[] = [
  { id: 'Books',       label: 'Books',       icon: 'book-open', color: Accent.blue },
  { id: 'Electronics', label: 'Electronics', icon: 'cpu',       color: Accent.purple },
  { id: 'Furniture',   label: 'Furniture',   icon: 'layers',    color: Accent.amber },
  { id: 'Notes',       label: 'Notes',       icon: 'file-text', color: Accent.teal },
  { id: 'Other',       label: 'Other',       icon: 'package',   color: Accent.slate },
];

const CONDITIONS: { id: Listing['condition']; label: string }[] = [
  { id: 'New',      label: 'New' },
  { id: 'Like New', label: 'Like New' },
  { id: 'Used',     label: 'Used' },
];

export function MarketPostScreen({ route, navigation }: any) {
  const { listing } = (route.params ?? {}) as { listing?: Listing };
  const { C } = useTheme();
  const t = useT();
  const { user } = useAuth();
  const toast = useToast();

  const [cat, setCat] = useState<Listing['category'] | null>(listing?.category ?? null);
  const [title, setTitle] = useState(listing?.title ?? '');
  const [price, setPrice] = useState(listing?.price ? String(listing.price) : '');
  const [condition, setCondition] = useState<Listing['condition']>(listing?.condition ?? 'Used');
  const [negotiable, setNegotiable] = useState(listing?.negotiable ?? true);
  const [desc, setDesc] = useState(listing?.description ?? '');
  const [courseCode, setCourseCode] = useState(listing?.course_code ?? '');
  const [photoUri, setPhotoUri] = useState<string | null>(listing?.photo_url ?? null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  const isEdit = !!listing;
  const canSubmit = cat !== null && !!title.trim() && Number(price) > 0;
  // Course code only applies to study materials — links the listing to the
  // course's Study Hub page (mirrors web).
  const showCourse = cat === 'Books' || cat === 'Notes';

  async function pickImage() {
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
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setUploading(true);
    try {
      const ext = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const fileName = `${user!.id}_${Date.now()}.${ext}`;
      const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';
      const result2 = await uploadFile('photos', asset.uri, `marketplace/${user!.id}/${fileName}`, contentType);
      if (!result2.success) throw new Error(result2.error);
      setPhotoUri(result2.url);
    } catch {
      toast({ type: 'error', title: t.market2.uploadFailed, message: t.market2.uploadFailedBody });
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    if (!canSubmit || !user || loading) return;
    setLoading(true);
    try {
      const payload = {
        title:       title.trim(),
        price:       parseInt(price, 10),
        category:    cat,
        condition,
        negotiable,
        description: desc.trim(),
        photo_url:   photoUri ?? null,
        course_code: showCourse ? (courseCode.trim() || null) : null,
        seller_id:   user.id,
        status:      'Available' as Listing['status'],
      };
      if (isEdit) {
        const { error } = await supabase.from('listings').update(payload).eq('id', listing!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('listings').insert(payload);
        if (error) throw error;
      }
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

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Category */}
        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.market2.category}</Text>
        <View style={styles.catGrid}>
          {CATEGORIES.map(c => {
            const on = cat === c.id;
            return (
              <TouchableOpacity
                key={c.id}
                style={[
                  styles.catBtn,
                  { borderColor: on ? c.color : C.border, backgroundColor: on ? c.color + '1a' : C.surface },
                ]}
                onPress={() => setCat(c.id)}
                activeOpacity={0.75}
              >
                <View style={[styles.catIcon, { backgroundColor: c.color + (on ? '2e' : '18') }]}>
                  <Feather name={c.icon as any} size={16} color={c.color} />
                </View>
                <Text style={[styles.catLabel, { color: on ? c.color : C.text2, fontFamily: FontFamily.jakartaBold }]}>
                  {c.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Title */}
        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.market2.itemName}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
          value={title}
          onChangeText={setTitle}
          placeholder={t.market2.itemNamePlaceholder}
          placeholderTextColor={C.textMuted}
        />

        {/* Photo */}
        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.market2.photoOptional}</Text>
        <TouchableOpacity
          style={[styles.photoBtn, { backgroundColor: C.surface, borderColor: C.border }]}
          onPress={pickImage}
          disabled={uploading}
          activeOpacity={0.75}
        >
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Feather name="camera" size={22} color={C.textMuted} />
              <Text style={[styles.photoPlaceholderTxt, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                {uploading ? t.market2.uploading : t.market2.tapToAddPhoto}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Price */}
        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.market2.priceLabel}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
          value={price}
          onChangeText={t => setPrice(t.replace(/\D/g, ''))}
          placeholder={t.market2.pricePlaceholder}
          placeholderTextColor={C.textMuted}
          keyboardType="numeric"
        />

        {/* Condition */}
        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.market2.condition}</Text>
        <View style={[styles.segRow, { backgroundColor: C.surface2, borderColor: C.border }]}>
          {CONDITIONS.map(c => {
            const on = condition === c.id;
            return (
              <TouchableOpacity
                key={c.id}
                style={[styles.segBtn, on && { backgroundColor: C.brand }]}
                onPress={() => setCondition(c.id)}
                activeOpacity={0.75}
              >
                <Text style={[styles.segText, { color: on ? '#fff' : C.text2, fontFamily: FontFamily.jakartaBold }]}>
                  {c.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Negotiable */}
        <View style={[styles.switchRow, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[styles.switchLabel, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>{t.market2.negotiable}</Text>
          <Switch
            value={negotiable}
            onValueChange={setNegotiable}
            trackColor={{ false: C.border, true: C.brand }}
            thumbColor="#fff"
          />
        </View>

        {/* Description */}
        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.market2.description}</Text>
        <TextInput
          style={[styles.textarea, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
          value={desc}
          onChangeText={setDesc}
          placeholder={t.market2.descriptionPlaceholder}
          placeholderTextColor={C.textMuted}
          multiline
          textAlignVertical="top"
        />

        {/* Course code — books/notes only, links to Study Hub */}
        {showCourse && (
          <>
            <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.market2.courseCode}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
              value={courseCode}
              onChangeText={setCourseCode}
              placeholder={t.market2.courseCodePlaceholder}
              placeholderTextColor={C.textMuted}
              autoCapitalize="characters"
            />
            <Text style={[styles.hint, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>{t.market2.courseCodeHint}</Text>
          </>
        )}

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: canSubmit ? C.brand : C.surface2, opacity: loading ? 0.6 : 1 }]}
          onPress={handleSubmit}
          disabled={!canSubmit || loading}
          activeOpacity={0.8}
        >
          <Icon name="check" size={18} color={canSubmit ? C.white : C.textMuted} />
          <Text style={[styles.submitText, { color: canSubmit ? C.white : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {isEdit ? t.market2.saveChanges : t.market2.postListing}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  scroll: { paddingTop: 12, paddingBottom: 20 } as ViewStyle,

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
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  } as ViewStyle,

  catIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  catLabel: { fontSize: 13 } as any,

  hint: { fontSize: 11.5, marginTop: 6, marginLeft: 2, lineHeight: 16 } as any,

  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14.5,
  } as any,

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

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
  } as ViewStyle,

  switchLabel: { fontSize: 14.5 } as any,

  textarea: {
    minHeight: 100,
    borderRadius: 12,
    borderWidth: 1,
    padding: 13,
    fontSize: 14.5,
    lineHeight: 22,
  } as any,

  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 14,
    marginTop: 22,
  } as ViewStyle,

  submitText: { fontSize: 15 } as any,

  photoBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    overflow: 'hidden',
    height: 120,
  } as ViewStyle,

  photoPreview: {
    width: '100%',
    height: '100%',
  } as any,

  photoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  } as ViewStyle,

  photoPlaceholderTxt: { fontSize: 13 } as any,
});
