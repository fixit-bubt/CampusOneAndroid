import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, FlatList, StyleSheet, Alert,
  TextInput, Modal, Platform, KeyboardAvoidingView,
  RefreshControl, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { Pill } from '../../components/ui/Pill';
import { supabase } from '../../lib/supabase';
import { uploadFile } from '../../utils/storage';
import { formatRelativeTime } from '../../utils/format';
import { openUrl } from '../../utils/link';
import { FontFamily, FontSize, Layout, Radius, Spacing, SectorColors } from '../../theme';

interface Routine {
  id: string;
  type: 'class' | 'exam';
  title: string;
  department: string | null;
  semester: string | null;
  intake: string | null;
  section: string | null;
  file_url: string | null;
  image_url: string | null;
  published_by: string | null;
  created_at: string;
}

type Tab = 'class' | 'exam';

export function RoutinesBrowseScreen({ navigation }: any) {
  const { C, isDark } = useTheme();
  const { user, profile } = useAuth();
  const t = useT();
  const canPost = profile?.role === 'admin' || profile?.role === 'staff';

  const [tab, setTab] = useState<Tab>('class');
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // Form
  const [fTitle, setFTitle] = useState('');
  const [fDept, setFDept] = useState('');
  const [fSemester, setFSemester] = useState('');
  const [fIntake, setFIntake] = useState('');
  const [fSection, setFSection] = useState('');
  const [fType, setFType] = useState<Tab>('class');
  const [pickedFile, setPickedFile] = useState<{ uri: string; name: string; mimeType: string } | null>(null);
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('routines')
      .select('*')
      .order('created_at', { ascending: false });
    setRoutines((data as Routine[]) ?? []);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const q = search.toLowerCase();
  const filtered = routines
    .filter(r => r.type === tab)
    .filter(r =>
      !q ||
      r.title.toLowerCase().includes(q) ||
      (r.department ?? '').toLowerCase().includes(q) ||
      (r.semester ?? '').toLowerCase().includes(q) ||
      (r.intake ?? '').toLowerCase().includes(q)
    );

  function openPost() {
    setFTitle(''); setFDept(''); setFSemester(''); setFIntake(''); setFSection('');
    setFType('class'); setPickedFile(null);
    setModalVisible(true);
  }

  async function pickFile() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setPickedFile({ uri: asset.uri, name: asset.name ?? 'file', mimeType: asset.mimeType ?? 'application/octet-stream' });
  }

  async function handlePost() {
    if (!fTitle.trim() || !user) return;
    setPosting(true);
    try {
      let fileUrl: string | null = null;
      let imageUrl: string | null = null;

      if (pickedFile) {
        const ext = pickedFile.name.split('.').pop() ?? 'bin';
        const safeName = fTitle.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
        // 'photos' is a public bucket with an open authenticated-upload policy;
        // study-materials is private and its RLS requires a uid-prefixed path, so a
        // routines/ path there is denied. Routine sheets are public reference data.
        const storagePath = `routines/${user.id}/${Date.now()}_${safeName}.${ext}`;
        const up = await uploadFile('photos', pickedFile.uri, storagePath, pickedFile.mimeType, true);
        if (!up.success) throw new Error(up.error);
        if (pickedFile.mimeType.startsWith('image/')) {
          imageUrl = up.url;
        } else {
          fileUrl = up.url;
        }
      }

      const { error } = await supabase.from('routines').insert({
        type: fType,
        title: fTitle.trim(),
        department: fDept.trim() || null,
        semester: fSemester.trim() || null,
        intake: fIntake.trim() || null,
        section: fSection.trim() || null,
        file_url: fileUrl,
        image_url: imageUrl,
        published_by: user.id,
      });
      if (error) throw error;
      setModalVisible(false);
      load();
    } catch {
      Alert.alert(t.common.error, t.routines2.postFailed);
    } finally {
      setPosting(false);
    }
  }

  function handleDelete(r: Routine) {
    Alert.alert(t.routines2.deleteTitle, t.routines2.deleteBody, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete, style: 'destructive',
        onPress: async () => {
          await supabase.from('routines').delete().eq('id', r.id);
          load();
        },
      },
    ]);
  }

  function openFile(r: Routine) {
    const url = r.file_url || r.image_url;
    if (url) openUrl(url);
  }

  function renderRoutine({ item }: { item: Routine }) {
    const isOwner = item.published_by === user?.id;
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}
        onPress={() => openFile(item)}
        onLongPress={() => (canPost && isOwner) ? handleDelete(item) : undefined}
        activeOpacity={0.75}
      >
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.thumb} resizeMode="cover" />
        ) : (
          <View style={[styles.thumbPlaceholder, { backgroundColor: SectorColors.routines + '18' }]}>
            <Icon name="clipboard" size={28} color={SectorColors.routines} />
          </View>
        )}
        <View style={styles.cardBody}>
          <Text style={[styles.cardTitle, { color: C.text, fontFamily: FontFamily.jakartaSemiBold }]} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={styles.metaRow}>
            {item.department ? (
              <Pill label={item.department} customColor={SectorColors.routines} />
            ) : null}
            {item.semester ? (
              <Text style={[styles.metaText, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]}>
                {item.semester}
              </Text>
            ) : null}
          </View>
          <Text style={[styles.timeText, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
            {formatRelativeTime(item.created_at)}
          </Text>
        </View>
        <View style={styles.cardChev}>
          <Icon name="chevR" size={18} color={C.textMuted} />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar
        title={t.routines2.title}
        onBack={() => navigation.goBack()}
        rightSlot={canPost ? (
          <TouchableOpacity onPress={openPost} hitSlop={8}>
            <Icon name="plus" size={22} color={C.brand} />
          </TouchableOpacity>
        ) : undefined}
      />

      {/* Tabs */}
      <View style={[styles.tabRow, { paddingHorizontal: Layout.screenPadding, borderBottomColor: C.border }]}>
        {(['class', 'exam'] as Tab[]).map(t2 => {
          const active = tab === t2;
          const count = routines.filter(r => r.type === t2).length;
          return (
            <TouchableOpacity
              key={t2}
              style={[styles.tab, active && { borderBottomColor: SectorColors.routines }]}
              onPress={() => setTab(t2)}
            >
              <Text style={[styles.tabText, {
                color: active ? SectorColors.routines : C.text3,
                fontFamily: active ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
              }]}>
                {t2 === 'class' ? t.routines2.classRoutines : t.routines2.examRoutines}
                {count > 0 ? ` (${count})` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Search */}
      <View style={[styles.searchRow, { paddingHorizontal: Layout.screenPadding }]}>
        <View style={[styles.searchBar, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Icon name="search" size={16} color={C.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: C.text, fontFamily: FontFamily.jakartaRegular }]}
            value={search}
            onChangeText={setSearch}
            placeholder={t.routines2.searchPlaceholder}
            placeholderTextColor={C.textMuted}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
              <Icon name="x" size={16} color={C.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        renderItem={renderRoutine}
        contentContainerStyle={{ paddingHorizontal: Layout.screenPadding, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
            {t.routines2.noRoutines}
          </Text>
        }
      />

      {/* Post modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: C.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {t.routines2.addRoutine}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={8}>
                <Icon name="x" size={22} color={C.text2} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              <Text style={[styles.fieldLabel, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
                {t.routines2.type}
              </Text>
              <View style={styles.typeRow}>
                {(['class', 'exam'] as Tab[]).map(ty => (
                  <TouchableOpacity
                    key={ty}
                    style={[styles.typeChip, {
                      borderColor: fType === ty ? SectorColors.routines : C.border,
                      backgroundColor: fType === ty ? SectorColors.routines + '18' : C.surface2,
                    }]}
                    onPress={() => setFType(ty)}
                  >
                    <Text style={[styles.typeChipText, {
                      color: fType === ty ? SectorColors.routines : C.text2,
                      fontFamily: FontFamily.jakartaMedium,
                    }]}>
                      {ty === 'class' ? t.routines2.typeClass : t.routines2.typeExam}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.fieldLabel, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
                {t.routines2.routineTitle}
              </Text>
              <TextInput
                style={[styles.input, { color: C.text, backgroundColor: C.surface2, borderColor: C.border, fontFamily: FontFamily.jakartaRegular }]}
                value={fTitle} onChangeText={setFTitle}
                placeholder={t.routines2.titlePlaceholder} placeholderTextColor={C.textMuted}
              />

              <Text style={[styles.fieldLabel, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
                {t.routines2.department}
              </Text>
              <TextInput
                style={[styles.input, { color: C.text, backgroundColor: C.surface2, borderColor: C.border, fontFamily: FontFamily.jakartaRegular }]}
                value={fDept} onChangeText={setFDept}
                placeholder={t.routines2.deptPlaceholder} placeholderTextColor={C.textMuted}
              />

              <Text style={[styles.fieldLabel, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
                {t.routines2.semester}
              </Text>
              <TextInput
                style={[styles.input, { color: C.text, backgroundColor: C.surface2, borderColor: C.border, fontFamily: FontFamily.jakartaRegular }]}
                value={fSemester} onChangeText={setFSemester}
                placeholder={t.routines2.semesterPlaceholder} placeholderTextColor={C.textMuted}
              />

              <View style={styles.halfRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
                    {t.routines2.intake}
                  </Text>
                  <TextInput
                    style={[styles.input, { color: C.text, backgroundColor: C.surface2, borderColor: C.border, fontFamily: FontFamily.jakartaRegular }]}
                    value={fIntake} onChangeText={setFIntake}
                    placeholder={t.routines2.intakePlaceholder} placeholderTextColor={C.textMuted}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
                    {t.routines2.section}
                  </Text>
                  <TextInput
                    style={[styles.input, { color: C.text, backgroundColor: C.surface2, borderColor: C.border, fontFamily: FontFamily.jakartaRegular }]}
                    value={fSection} onChangeText={setFSection}
                    placeholder={t.routines2.sectionPlaceholder} placeholderTextColor={C.textMuted}
                  />
                </View>
              </View>

              <Text style={[styles.fieldLabel, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
                {t.routines2.fileLabel}
              </Text>
              <TouchableOpacity
                style={[styles.filePicker, { borderColor: pickedFile ? SectorColors.routines : C.border }]}
                onPress={pickFile}
              >
                <Icon name="layers" size={20} color={pickedFile ? SectorColors.routines : C.textMuted} />
                <Text style={[styles.fileText, {
                  color: pickedFile ? C.text : C.textMuted,
                  fontFamily: FontFamily.jakartaMedium,
                }]} numberOfLines={1}>
                  {pickedFile ? pickedFile.name : t.routines2.chooseFile}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.postBtn, { backgroundColor: SectorColors.routines, opacity: posting || !fTitle.trim() ? 0.5 : 1 }]}
                onPress={handlePost}
                disabled={posting || !fTitle.trim()}
              >
                <Text style={[styles.postBtnText, { fontFamily: FontFamily.jakartaBold }]}>
                  {t.routines2.postRoutine}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  tabRow: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, alignItems: 'center', paddingVertical: Spacing[3], borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: FontSize.md },
  searchRow: { paddingVertical: Spacing[3] },
  searchBar: { flexDirection: 'row', alignItems: 'center', height: 42, borderRadius: Radius.sm, borderWidth: 1, paddingHorizontal: Spacing[3], gap: Spacing[2] },
  searchInput: { flex: 1, fontSize: FontSize.base, padding: 0 },
  empty: { textAlign: 'center', marginTop: Spacing[10], fontSize: FontSize.base },
  card: { flexDirection: 'row', borderRadius: Radius.md, borderWidth: 1, marginBottom: Spacing[2], overflow: 'hidden' },
  thumb: { width: 72, height: 72 },
  thumbPlaceholder: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1, padding: Spacing[3] },
  cardTitle: { fontSize: FontSize.md, marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2], marginBottom: 2 },
  metaText: { fontSize: FontSize.xs },
  timeText: { fontSize: FontSize.xs },
  cardChev: { alignSelf: 'center', paddingRight: Spacing[3] },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Layout.screenPadding, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing[4] },
  modalTitle: { fontSize: FontSize['2xl'] },
  fieldLabel: { fontSize: FontSize.xs, letterSpacing: 0.5, marginBottom: Spacing[1], marginTop: Spacing[3] },
  input: { height: Layout.inputHeight, borderRadius: Radius.sm, borderWidth: 1, paddingHorizontal: Spacing[3], fontSize: FontSize.base },
  typeRow: { flexDirection: 'row', gap: Spacing[2] },
  typeChip: { paddingHorizontal: Spacing[3], paddingVertical: Spacing[2], borderRadius: Radius.full, borderWidth: 1 },
  typeChipText: { fontSize: FontSize.sm },
  halfRow: { flexDirection: 'row', gap: Spacing[3] },
  filePicker: { flexDirection: 'row', alignItems: 'center', height: Layout.inputHeight, borderRadius: Radius.sm, borderWidth: 1, borderStyle: 'dashed', paddingHorizontal: Spacing[3], gap: Spacing[2], marginTop: 4 },
  fileText: { flex: 1, fontSize: FontSize.base },
  postBtn: { height: Layout.inputHeight, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', marginTop: Spacing[5] },
  postBtnText: { color: '#fff', fontSize: FontSize.base },
});
