import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  StyleSheet,
  Image,
  Modal,
  ActivityIndicator,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';
import { useToast } from '../../components/ui/Toast';
import { SubBar } from '../../components/layout/TopBar';
import { FontFamily, Layout } from '../../theme';
import { supabase } from '../../lib/supabase';
import { uploadFile } from '../../utils/storage';
import { BUCKETS } from '../../constants/app';
import { localToday } from '../../utils/format';
import type { Event } from '../../types/database';

type FeatherName = React.ComponentProps<typeof Feather>['name'];

interface CategoryOption {
  id: Event['category'];
  label: string;
  icon: FeatherName;
}

const EVT_CATS: CategoryOption[] = [
  { id: 'Academic', label: 'Academic', icon: 'book-open' },
  { id: 'Cultural', label: 'Cultural', icon: 'music' },
  { id: 'Sports',   label: 'Sports',   icon: 'activity' },
  { id: 'Club',     label: 'Club',     icon: 'users' },
  { id: 'Career',   label: 'Career',   icon: 'briefcase' },
];

export function EventPostScreen({ navigation }: any) {
  const { C, isDark } = useTheme();
  const { user, profile } = useAuth();
  const t = useT();
  const toast = useToast();

  const [cat, setCat] = useState<Event['category']>('Academic');
  const [title, setTitle] = useState('');
  const [organizer, setOrganizer] = useState('');
  const [location, setLocation] = useState('');
  const [eventDate, setEventDate] = useState(localToday());
  const [time, setTime] = useState('10:00');
  const [endTime, setEndTime] = useState('12:00');
  const [capacity, setCapacity] = useState('');
  const [desc, setDesc] = useState('');
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [loading, setLoading] = useState(false);
  const [canCreate, setCanCreate] = useState<boolean | null>(null);

  // Dropdown bottom sheets
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [clubModalOpen, setClubModalOpen] = useState(false);

  // Club associations
  const [clubs, setClubs] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!user) {
        setCanCreate(false);
        return;
      }
      if (profile?.role === 'admin') {
        setCanCreate(true);
        // Load all active clubs for admin selection
        const { data: allClubs } = await supabase
          .from('clubs')
          .select('id, name')
          .eq('is_active', true)
          .order('name');
        setClubs(allClubs || []);
        return;
      }

      const [orgRes, leadRes] = await Promise.all([
        supabase.from('event_organizers').select('user_id').eq('user_id', user.id).maybeSingle(),
        supabase.from('club_members').select('club_id, role').eq('user_id', user.id).in('role', ['president', 'vp']),
      ]);

      const isLeader = (leadRes.data?.length ?? 0) > 0;
      setCanCreate(!!orgRes.data || isLeader);

      if (isLeader && leadRes.data) {
        const leadClubIds = leadRes.data.map((m) => m.club_id);
        const { data: myClubs } = await supabase
          .from('clubs')
          .select('id, name')
          .in('id', leadClubIds);
        setClubs(myClubs || []);
        if (myClubs && myClubs.length > 0) {
          setSelectedClubId(myClubs[0].id);
          setOrganizer(myClubs[0].name);
        }
      }
    })();
  }, [user, profile?.role]);

  async function pickBannerImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      toast({ type: 'info', title: 'Permission Required', message: 'Please grant photo library access.' });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];

    setUploadingImg(true);
    try {
      const up = await uploadFile(
        BUCKETS.photos,
        asset.uri,
        `events/${user!.id}/${Date.now()}.jpg`,
        'image/jpeg',
        true
      );
      if (!up.success) throw new Error(up.error);
      setBannerUrl(up.url);
      toast({ type: 'success', title: 'Flyer Uploaded' });
    } catch {
      toast({ type: 'error', title: 'Upload Failed', message: 'Could not upload poster image.' });
    } finally {
      setUploadingImg(false);
    }
  }

  // Security gate: strictly block form rendering during async check
  if (canCreate === null) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <SubBar title={t.events2.postAnEvent ?? 'Post an Event'} onBack={() => navigation.goBack()} />
        <View style={styles.centerPad}>
          <ActivityIndicator size="small" color={C.brand} />
        </View>
      </SafeAreaView>
    );
  }

  if (canCreate === false) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <SubBar title={t.events2.postAnEvent ?? 'Post an Event'} onBack={() => navigation.goBack()} />
        <View style={styles.centerPad}>
          <View style={styles.iconSlot32}>
            <Feather name="calendar" size={32} color={C.textMuted} />
          </View>
          <Text style={[styles.deniedTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
            {t.events2.organizersOnly}
          </Text>
          <Text style={[styles.deniedSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
            {t.events2.organizersOnlyBody}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const canSubmit = title.trim() && location.trim() && time.trim() && eventDate.trim();

  async function handleSubmit() {
    if (!canSubmit || !user || loading || uploadingImg) return;
    const capNum = capacity.trim() ? parseInt(capacity.trim(), 10) : null;
    if (capNum !== null && (!Number.isFinite(capNum) || capNum <= 0)) {
      toast({ type: 'error', title: t.common.error, message: t.events2.postEventError });
      return;
    }

    setLoading(true);
    try {
      const code = 'EVT-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const { error } = await supabase.from('events').insert({
        code,
        title: title.trim(),
        category: cat,
        organizer: organizer.trim() || 'BUBT Campus',
        venue: location.trim(),
        date: eventDate.trim(),
        time: time.trim(),
        end_time: endTime.trim() || null,
        capacity: capNum,
        banner_url: bannerUrl,
        club_id: selectedClubId,
        source: 'manual',
        description: desc.trim() || title.trim(),
        created_by: user.id,
      });

      if (error) throw error;

      toast({ type: 'success', title: 'Event Published' });
      navigation.goBack();
    } catch (err: any) {
      console.error('Post event error:', err);
      toast({ type: 'error', title: t.common.error, message: err?.message || t.events2.postEventError });
    } finally {
      setLoading(false);
    }
  }

  const selectedCategoryObj = EVT_CATS.find((c) => c.id === cat) || EVT_CATS[0];
  const selectedClubName =
    clubs.find((c) => c.id === selectedClubId)?.name || 'General / University-Wide';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title={t.events2.postAnEvent ?? 'Post an Event'} onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        >
          {/* Banner Flyer Upload Section */}
          <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            EVENT POSTER / FLYER
          </Text>
          {bannerUrl ? (
            <View style={styles.bannerPreviewWrap}>
              <Image source={{ uri: bannerUrl }} style={styles.bannerPreviewImg} resizeMode="cover" />
              <TouchableOpacity
                style={[styles.removeBannerBtn, { backgroundColor: C.danger }]}
                onPress={() => setBannerUrl(null)}
                hitSlop={8}
              >
                <Feather name="trash-2" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.uploadBox, { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={pickBannerImage}
              disabled={uploadingImg}
              activeOpacity={0.75}
            >
              {uploadingImg ? (
                <ActivityIndicator color={C.brand} />
              ) : (
                <View style={styles.uploadContent}>
                  <View style={styles.iconSlot32}>
                    <Feather name="image" size={28} color={C.text} />
                  </View>
                  <Text style={[styles.uploadText, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    Upload Event Flyer
                  </Text>
                  <Text style={[styles.uploadSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                    Supports PNG, JPG (16:9 ratio recommended)
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          {/* 1. Category Dropdown Bar (Strict 58dp) */}
          <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {t.events2.category} *
          </Text>
          <TouchableOpacity
            style={[styles.bar58, { backgroundColor: C.surface, borderColor: C.border }]}
            onPress={() => setCatModalOpen(true)}
            activeOpacity={0.75}
          >
            <View style={styles.iconSlot32}>
              <Feather name={selectedCategoryObj.icon} size={28} color={C.text} />
            </View>
            <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
              <Text style={[styles.barTitleTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                {selectedCategoryObj.label}
              </Text>
            </View>
            <Feather name="chevron-down" size={18} color={C.textMuted} />
          </TouchableOpacity>

          {/* 2. Associated Club Dropdown Bar (Strict 58dp) */}
          {clubs.length > 0 && (
            <View style={{ marginTop: 6 }}>
              <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                ASSOCIATED CLUB (OPTIONAL)
              </Text>
              <TouchableOpacity
                style={[styles.bar58, { backgroundColor: C.surface, borderColor: C.border }]}
                onPress={() => setClubModalOpen(true)}
                activeOpacity={0.75}
              >
                <View style={styles.iconSlot32}>
                  <Feather name="users" size={28} color={C.text} />
                </View>
                <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
                  <Text style={[styles.barTitleTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                    {selectedClubName}
                  </Text>
                </View>
                <Feather name="chevron-down" size={18} color={C.textMuted} />
              </TouchableOpacity>
            </View>
          )}

          {/* 3. Title (Strict 58dp Input Bar) */}
          <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {t.events2.eventTitleLabel} *
          </Text>
          <TextInput
            style={[
              styles.inputBar58,
              { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium },
            ]}
            value={title}
            onChangeText={setTitle}
            placeholder={t.events2.titlePlaceholder}
            placeholderTextColor={C.textMuted}
          />

          {/* 4. Organizer (Strict 58dp Input Bar) */}
          <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {t.events2.organizerLabel}
          </Text>
          <TextInput
            style={[
              styles.inputBar58,
              { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium },
            ]}
            value={organizer}
            onChangeText={setOrganizer}
            placeholder="Organizing club or department"
            placeholderTextColor={C.textMuted}
          />

          {/* 5. Venue / Location (Strict 58dp Input Bar) */}
          <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {t.events2.venueLabel} *
          </Text>
          <TextInput
            style={[
              styles.inputBar58,
              { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium },
            ]}
            value={location}
            onChangeText={setLocation}
            placeholder="Venue or auditorium"
            placeholderTextColor={C.textMuted}
          />

          {/* 6. Event Date (Strict 58dp Input Bar, Zero Presets) */}
          <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            EVENT DATE (YYYY-MM-DD) *
          </Text>
          <TextInput
            style={[
              styles.inputBar58,
              { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium },
            ]}
            value={eventDate}
            onChangeText={setEventDate}
            placeholder="2026-10-25"
            placeholderTextColor={C.textMuted}
          />

          {/* 7. Times (Strict 58dp Equal Half-Bars) */}
          <View style={styles.timesRow}>
            <View style={styles.halfCol}>
              <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                START TIME *
              </Text>
              <TextInput
                style={[
                  styles.inputBar58,
                  { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium },
                ]}
                value={time}
                onChangeText={setTime}
                placeholder="10:00"
                placeholderTextColor={C.textMuted}
              />
            </View>
            <View style={styles.halfCol}>
              <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                END TIME
              </Text>
              <TextInput
                style={[
                  styles.inputBar58,
                  { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium },
                ]}
                value={endTime}
                onChangeText={setEndTime}
                placeholder="12:00"
                placeholderTextColor={C.textMuted}
              />
            </View>
          </View>

          {/* 8. Capacity (Strict 58dp Input Bar) */}
          <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            CAPACITY LIMIT (OPTIONAL)
          </Text>
          <TextInput
            style={[
              styles.inputBar58,
              { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium },
            ]}
            value={capacity}
            onChangeText={setCapacity}
            placeholder="Maximum attendees (e.g. 150)"
            placeholderTextColor={C.textMuted}
            keyboardType="numeric"
          />

          {/* 9. Description (Clean Textarea) */}
          <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            DESCRIPTION / OVERVIEW *
          </Text>
          <TextInput
            style={[
              styles.textArea,
              { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium },
            ]}
            value={desc}
            onChangeText={setDesc}
            placeholder="Event details, agenda, and guidelines..."
            placeholderTextColor={C.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          {/* 10. Submit Button (Strict 58dp Bar) */}
          <TouchableOpacity
            style={[
              styles.submitBtn58,
              { backgroundColor: canSubmit ? C.brand : C.surface2, opacity: canSubmit ? 1 : 0.6 },
            ]}
            onPress={handleSubmit}
            disabled={!canSubmit || loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={C.white} />
            ) : (
              <Text style={[styles.submitTxt, { color: canSubmit ? C.white : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                Publish Campus Event
              </Text>
            )}
          </TouchableOpacity>

          <View style={{ height: 36 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Category Bottom Sheet Modal */}
      <Modal
        visible={catModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setCatModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={() => setCatModalOpen(false)}
            activeOpacity={1}
          />
          <View style={[styles.modalBox, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={[styles.handleBar, { backgroundColor: C.border }]} />
            <View style={[styles.modalHeader, { borderBottomColor: C.border }]}>
              <Text style={[styles.modalTitleTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                Select Category
              </Text>
              <TouchableOpacity
                onPress={() => setCatModalOpen(false)}
                style={[styles.modalCloseBtn, { backgroundColor: C.surface2 }]}
                hitSlop={8}
              >
                <Feather name="x" size={18} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 8, padding: 16 }}>
              {EVT_CATS.map((item) => {
                const isSelected = cat === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.bar58,
                      {
                        backgroundColor: isSelected
                          ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)')
                          : C.surface,
                        borderColor: isSelected ? C.text : C.border,
                      },
                    ]}
                    onPress={() => {
                      setCat(item.id);
                      setCatModalOpen(false);
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={styles.iconSlot32}>
                      <Feather name={item.icon} size={28} color={C.text} />
                    </View>
                    <Text
                      style={[
                        styles.barTitleTxt,
                        {
                          color: C.text,
                          fontFamily: isSelected ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                          flex: 1,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {item.label}
                    </Text>
                    {isSelected && <Feather name="check" size={18} color={C.text} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* Associated Club Bottom Sheet Modal */}
      <Modal
        visible={clubModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setClubModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={() => setClubModalOpen(false)}
            activeOpacity={1}
          />
          <View style={[styles.modalBox, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={[styles.handleBar, { backgroundColor: C.border }]} />
            <View style={[styles.modalHeader, { borderBottomColor: C.border }]}>
              <Text style={[styles.modalTitleTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                Select Associated Club
              </Text>
              <TouchableOpacity
                onPress={() => setClubModalOpen(false)}
                style={[styles.modalCloseBtn, { backgroundColor: C.surface2 }]}
                hitSlop={8}
              >
                <Feather name="x" size={18} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 360, padding: 16 }}>
              {/* General / University-Wide Option */}
              <TouchableOpacity
                style={[
                  styles.bar58,
                  {
                    backgroundColor: selectedClubId === null
                      ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)')
                      : C.surface,
                    borderColor: selectedClubId === null ? C.text : C.border,
                    marginBottom: 8,
                  },
                ]}
                onPress={() => {
                  setSelectedClubId(null);
                  setClubModalOpen(false);
                }}
                activeOpacity={0.75}
              >
                <View style={styles.iconSlot32}>
                  <Feather name="globe" size={28} color={C.text} />
                </View>
                <Text
                  style={[
                    styles.barTitleTxt,
                    {
                      color: C.text,
                      fontFamily: selectedClubId === null ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                      flex: 1,
                    },
                  ]}
                  numberOfLines={1}
                >
                  General / University-Wide
                </Text>
                {selectedClubId === null && <Feather name="check" size={18} color={C.text} />}
              </TouchableOpacity>

              {/* Clubs List */}
              {clubs.map((cl) => {
                const isSelected = selectedClubId === cl.id;
                return (
                  <TouchableOpacity
                    key={cl.id}
                    style={[
                      styles.bar58,
                      {
                        backgroundColor: isSelected
                          ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)')
                          : C.surface,
                        borderColor: isSelected ? C.text : C.border,
                        marginBottom: 8,
                      },
                    ]}
                    onPress={() => {
                      setSelectedClubId(cl.id);
                      setOrganizer(cl.name);
                      setClubModalOpen(false);
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={styles.iconSlot32}>
                      <Feather name="users" size={28} color={C.text} />
                    </View>
                    <Text
                      style={[
                        styles.barTitleTxt,
                        {
                          color: C.text,
                          fontFamily: isSelected ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                          flex: 1,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {cl.name}
                    </Text>
                    {isSelected && <Feather name="check" size={18} color={C.text} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  scroll: { paddingTop: 8, paddingBottom: 30 } as ViewStyle,
  centerPad: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 } as ViewStyle,
  deniedTitle: { fontSize: 16, marginTop: 14 } as TextStyle,
  deniedSub: { fontSize: 13.5, marginTop: 8, textAlign: 'center', lineHeight: 20 } as TextStyle,
  label: { fontSize: 11.5, letterSpacing: 0.4, marginTop: 14, marginBottom: 6 } as TextStyle,

  // Strict 58dp Interactive Bars
  bar58: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  } as ViewStyle,
  barTitleTxt: {
    fontSize: 14.5,
  } as TextStyle,
  inputBar58: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 14.5,
  } as TextStyle,

  iconSlot32: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  } as ViewStyle,

  // Half width columns for time
  timesRow: {
    flexDirection: 'row',
    gap: 12,
  } as ViewStyle,
  halfCol: {
    flex: 1,
  } as ViewStyle,

  textArea: {
    minHeight: 120,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    fontSize: 14.5,
  } as TextStyle,

  // Cover Image
  bannerPreviewWrap: {
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    marginTop: 4,
  } as ViewStyle,
  bannerPreviewImg: { width: '100%', height: '100%' } as any,
  removeBannerBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  uploadBox: {
    height: 120,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  } as ViewStyle,
  uploadContent: { alignItems: 'center', gap: 4 } as ViewStyle,
  uploadText: { fontSize: 14 } as TextStyle,
  uploadSub: { fontSize: 12 } as TextStyle,

  // Submit Button
  submitBtn58: {
    height: 58,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  } as ViewStyle,
  submitTxt: { fontSize: 15 } as TextStyle,

  // Bottom Sheet Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  } as ViewStyle,
  modalBox: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingBottom: 24,
    maxHeight: '80%',
    overflow: 'hidden',
  } as ViewStyle,
  handleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
  } as ViewStyle,
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  } as ViewStyle,
  modalTitleTxt: {
    fontSize: 16,
  } as TextStyle,
  modalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
});
