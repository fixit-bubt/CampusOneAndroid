import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView,
  StyleSheet, Image, ActivityIndicator, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';
import { useToast } from '../../components/ui/Toast';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout, SectorColors } from '../../theme';
import { supabase } from '../../lib/supabase';
import { uploadFile } from '../../utils/storage';
import { BUCKETS } from '../../constants/app';
import { localToday } from '../../utils/format';
import type { Event } from '../../types/database';

const EVT_CATS: { id: Event['category']; label: string; color: string; icon: string }[] = [
  { id: 'Academic', label: 'Academic', color: SectorColors.reports, icon: 'study' },
  { id: 'Cultural', label: 'Cultural', color: SectorColors.events, icon: 'sparkle' },
  { id: 'Sports', label: 'Sports', color: SectorColors.market, icon: 'pulse' },
  { id: 'Club', label: 'Club', color: SectorColors.clubs, icon: 'clubs' },
  { id: 'Career', label: 'Career', color: SectorColors.jobs, icon: 'jobs' },
];

export function EventPostScreen({ navigation }: any) {
  const { C } = useTheme();
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
        const leadClubIds = leadRes.data.map(m => m.club_id);
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

  function setDatePreset(daysFromNow: number) {
    const [y, m, d] = localToday().split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + daysFromNow));
    setEventDate(dt.toISOString().split('T')[0]);
  }

  if (canCreate === false) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <SubBar title="Post an Event" onBack={() => navigation.goBack()} />
        <View style={styles.centerPad}>
          <Icon name="events" size={36} color={C.textMuted} />
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
      toast({ type: 'success', title: 'Event Published', message: 'Your event is now live on the campus feed!' });
      navigation.goBack();
    } catch (err: any) {
      toast({ type: 'error', title: t.common.error, message: err?.message || t.events2.postEventError });
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title="Post an Event" onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        >
          {/* Banner Flyer Upload Section */}
          <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            Event Poster / Flyer
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
                  <Feather name="image" size={24} color={C.brand} />
                  <Text style={[styles.uploadText, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    Upload Cover Flyer
                  </Text>
                  <Text style={[styles.uploadSub, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                    Supports PNG, JPG (Recommended 16:9 ratio)
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          {/* Category Selector */}
          <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {t.events2.category}
          </Text>
          <View style={styles.catRow}>
            {EVT_CATS.map(c => {
              const on = cat === c.id;
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    styles.catBtn,
                    {
                      borderColor: on ? c.color : C.border,
                      backgroundColor: on ? c.color + '1a' : C.surface,
                    },
                  ]}
                  onPress={() => setCat(c.id)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.catIcon, { backgroundColor: c.color + '22' }]}>
                    <Icon name={c.icon} size={15} color={c.color} />
                  </View>
                  <Text
                    style={[
                      styles.catLabel,
                      { color: on ? c.color : C.text2, fontFamily: FontFamily.jakartaBold },
                    ]}
                  >
                    {c.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Club Association if clubs available */}
          {clubs.length > 0 && (
            <View style={{ marginTop: 14 }}>
              <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold, marginTop: 0 }]}>
                Associated Club (Optional)
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                <TouchableOpacity
                  style={[
                    styles.clubChip,
                    {
                      borderColor: selectedClubId === null ? C.brand : C.border,
                      backgroundColor: selectedClubId === null ? `${C.brand}18` : C.surface,
                    },
                  ]}
                  onPress={() => setSelectedClubId(null)}
                >
                  <Text
                    style={[
                      styles.clubChipTxt,
                      {
                        color: selectedClubId === null ? C.brand : C.textMuted,
                        fontFamily: FontFamily.jakartaBold,
                      },
                    ]}
                  >
                    General / University-Wide
                  </Text>
                </TouchableOpacity>
                {clubs.map(cl => {
                  const on = selectedClubId === cl.id;
                  return (
                    <TouchableOpacity
                      key={cl.id}
                      style={[
                        styles.clubChip,
                        {
                          borderColor: on ? C.brand : C.border,
                          backgroundColor: on ? `${C.brand}18` : C.surface,
                        },
                      ]}
                      onPress={() => {
                        setSelectedClubId(cl.id);
                        setOrganizer(cl.name);
                      }}
                    >
                      <Text
                        style={[
                          styles.clubChipTxt,
                          { color: on ? C.brand : C.textMuted, fontFamily: FontFamily.jakartaBold },
                        ]}
                      >
                        {cl.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Title */}
          <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {t.events2.eventTitleLabel} *
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
            value={title}
            onChangeText={setTitle}
            placeholder={t.events2.titlePlaceholder}
            placeholderTextColor={C.textMuted}
          />

          {/* Organizer */}
          <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {t.events2.organizerLabel}
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
            value={organizer}
            onChangeText={setOrganizer}
            placeholder="e.g. BUBT IT Club, Cultural Club"
            placeholderTextColor={C.textMuted}
          />

          {/* Venue / Location */}
          <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {t.events2.venueLabel} *
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
            value={location}
            onChangeText={setLocation}
            placeholder="e.g. Campus Auditorium, Building 1"
            placeholderTextColor={C.textMuted}
          />

          {/* Date & Presets */}
          <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            Event Date (YYYY-MM-DD) *
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
            value={eventDate}
            onChangeText={setEventDate}
            placeholder="2026-10-25"
            placeholderTextColor={C.textMuted}
          />
          <View style={styles.presetsRow}>
            <TouchableOpacity style={[styles.presetChip, { backgroundColor: C.surface2 }]} onPress={() => setDatePreset(0)}>
              <Text style={[styles.presetTxt, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}>Today</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.presetChip, { backgroundColor: C.surface2 }]} onPress={() => setDatePreset(1)}>
              <Text style={[styles.presetTxt, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}>Tomorrow</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.presetChip, { backgroundColor: C.surface2 }]} onPress={() => setDatePreset(7)}>
              <Text style={[styles.presetTxt, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}>In 1 Week</Text>
            </TouchableOpacity>
          </View>

          {/* Times */}
          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold, marginTop: 10 }]}>
                Start Time *
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                value={time}
                onChangeText={setTime}
                placeholder="10:00"
                placeholderTextColor={C.textMuted}
              />
            </View>
            <View style={styles.halfField}>
              <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold, marginTop: 10 }]}>
                End Time
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                value={endTime}
                onChangeText={setEndTime}
                placeholder="13:00"
                placeholderTextColor={C.textMuted}
              />
            </View>
          </View>

          {/* Capacity */}
          <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            Capacity Limit (Optional)
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
            value={capacity}
            onChangeText={setCapacity}
            placeholder="e.g. 150 (Leave blank for unlimited)"
            placeholderTextColor={C.textMuted}
            keyboardType="numeric"
          />

          {/* Description */}
          <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            Description / Overview *
          </Text>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium },
            ]}
            value={desc}
            onChangeText={setDesc}
            placeholder="Outline schedule, special guests, requirements..."
            placeholderTextColor={C.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          {/* Submit Action Button */}
          <TouchableOpacity
            style={[
              styles.submitBtn,
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

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  scroll: { paddingTop: 8, paddingBottom: 30 } as ViewStyle,
  centerPad: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 } as ViewStyle,
  deniedTitle: { fontSize: 16, marginTop: 14 } as any,
  deniedSub: { fontSize: 13.5, marginTop: 8, textAlign: 'center' } as any,
  label: { fontSize: 12, letterSpacing: 0.3, marginTop: 14, marginBottom: 6 } as any,
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  } as ViewStyle,
  textArea: { height: 110, paddingTop: 12 } as ViewStyle,
  bannerPreviewWrap: {
    height: 150,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    marginTop: 4,
  } as ViewStyle,
  bannerPreviewImg: { width: '100%', height: '100%' } as any,
  removeBannerBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  uploadBox: {
    height: 120,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  } as ViewStyle,
  uploadContent: { alignItems: 'center', gap: 4 } as ViewStyle,
  uploadText: { fontSize: 14 } as any,
  uploadSub: { fontSize: 11.5 } as any,
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 } as ViewStyle,
  catBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  } as ViewStyle,
  catIcon: { width: 24, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  catLabel: { fontSize: 12.5 } as any,
  clubChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 8,
  } as ViewStyle,
  clubChipTxt: { fontSize: 12 } as any,
  presetsRow: { flexDirection: 'row', gap: 8, marginTop: 8 } as ViewStyle,
  presetChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 } as ViewStyle,
  presetTxt: { fontSize: 12 } as any,
  row: { flexDirection: 'row', gap: 12 } as ViewStyle,
  halfField: { flex: 1 } as ViewStyle,
  submitBtn: {
    height: 58,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
  } as ViewStyle,
  submitTxt: { fontSize: 15 } as any,
});
