// Manage Faculty (web parity: ManageFaculty.jsx) — admin-only. Search the
// scraped faculty list and patch the fields the scraper can't know: email,
// phone, designation, research interests, on-leave flag, and a profile photo.
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  Modal, Alert, Switch, ActivityIndicator, type ViewStyle, type TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../store/authStore';
import { uploadFile } from '../../utils/storage';
import { BUCKETS } from '../../constants/app';

interface FacultyRow {
  id: string;
  name: string;
  designation: string;
  email: string | null;
  phone: string | null;
  photo_url: string | null;
  research_interests: string[] | null;
  on_leave: boolean;
  departments?: { name: string } | null;
}

const shortDept = (name?: string | null) => (name ?? '').replace(/^Department of\s+/i, '');

export function ManageFacultyScreen({ navigation }: any) {
  const { C } = useTheme();
  const { profile } = useAuth();
  const [list, setList] = useState<FacultyRow[]>([]);
  const [query, setQuery] = useState('');
  const [target, setTarget] = useState<FacultyRow | null>(null);

  // Edit form
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [designation, setDesignation] = useState('');
  const [interests, setInterests] = useState('');
  const [onLeave, setOnLeave] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('faculty')
      .select('id, name, designation, email, phone, photo_url, research_interests, on_leave, departments(name)')
      .order('name');
    if (data) setList(data as any[]);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openEdit(f: FacultyRow) {
    setTarget(f);
    setEmail(f.email ?? '');
    setPhone(f.phone ?? '');
    setDesignation(f.designation ?? '');
    setInterests(Array.isArray(f.research_interests) ? f.research_interests.join(', ') : '');
    setOnLeave(f.on_leave);
    setPhotoUri(null);
  }

  async function pickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
  }

  async function save() {
    if (!target || saving) return;
    setSaving(true);
    try {
      let photoUrl: string | undefined;
      if (photoUri) {
        const up = await uploadFile(BUCKETS.photos, photoUri, `faculty/${target.id}/${Date.now()}.jpg`, 'image/jpeg');
        if (!up.success) { Alert.alert('Error', up.error); return; }
        photoUrl = up.url;
      }
      const payload: Record<string, any> = {
        email: email.trim() || null,
        phone: phone.trim() || null,
        designation: designation.trim() || target.designation,
        research_interests: interests.trim()
          ? interests.split(',').map(s => s.trim()).filter(Boolean)
          : [],
        on_leave: onLeave,
      };
      if (photoUrl) payload.photo_url = photoUrl;
      const { error } = await supabase.from('faculty').update(payload).eq('id', target.id);
      if (error) { Alert.alert('Error', error.message); return; }
      setTarget(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  if (profile && profile.role !== 'admin') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <SubBar title="Manage Faculty" onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <Text style={{ color: C.text, fontFamily: FontFamily.jakartaExtraBold, fontSize: 18 }}>Access Denied</Text>
        </View>
      </SafeAreaView>
    );
  }

  const q = query.trim().toLowerCase();
  const filtered = q
    ? list.filter(f => [f.name, f.designation, f.departments?.name].filter(Boolean).join(' ').toLowerCase().includes(q))
    : list;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title="Manage Faculty" onBack={() => navigation.goBack()} />

      <View style={{ paddingHorizontal: Layout.screenPadding, paddingTop: 8 }}>
        <View style={[styles.searchBar, { backgroundColor: C.surface2 }]}>
          <Icon name="search" size={17} color={C.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: C.text, fontFamily: FontFamily.jakartaMedium } as TextStyle]}
            placeholder="Search by name, designation, department..."
            placeholderTextColor={C.textMuted}
            value={query}
            onChangeText={setQuery}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          {filtered.slice(0, 80).map((f, i) => (
            <View key={f.id}>
              {i > 0 && <View style={[styles.divider, { backgroundColor: C.border }]} />}
              <View style={styles.row}>
                <Avatar uri={f.photo_url} name={f.name} size="sm" />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.name, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                    {f.name}
                  </Text>
                  <Text style={[styles.meta, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                    {f.designation} · {shortDept(f.departments?.name)}
                  </Text>
                </View>
                {!f.photo_url && (
                  <View style={[styles.noPhoto, { backgroundColor: C.warnBg }]}>
                    <Text style={[styles.noPhotoTxt, { color: C.warn, fontFamily: FontFamily.jakartaBold }]}>No photo</Text>
                  </View>
                )}
                <TouchableOpacity onPress={() => openEdit(f)} hitSlop={8} activeOpacity={0.7}>
                  <Feather name="edit-2" size={16} color={C.text2} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
        <View style={{ height: 16 }} />
      </ScrollView>

      {/* Edit sheet */}
      <Modal visible={!!target} transparent animationType="slide" onRequestClose={() => setTarget(null)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setTarget(null)} />
        <View style={[styles.sheet, { backgroundColor: C.surface }]}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
              {target?.name}
            </Text>

            <TouchableOpacity style={styles.photoRow} onPress={pickPhoto} activeOpacity={0.75}>
              <Avatar uri={photoUri ?? target?.photo_url} name={target?.name} size="lg" />
              <Text style={[styles.photoHint, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
                {photoUri ? 'Photo selected' : 'Change photo'}
              </Text>
            </TouchableOpacity>

            <Text style={[styles.fieldLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>EMAIL</Text>
            <TextInput
              style={[styles.field, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
              value={email} onChangeText={setEmail} placeholder="name@bubt.edu.bd" placeholderTextColor={C.textMuted}
              autoCapitalize="none" keyboardType="email-address"
            />
            <Text style={[styles.fieldLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>PHONE</Text>
            <TextInput
              style={[styles.field, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
              value={phone} onChangeText={setPhone} placeholder="+8801..." placeholderTextColor={C.textMuted}
              keyboardType="phone-pad"
            />
            <Text style={[styles.fieldLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>DESIGNATION</Text>
            <TextInput
              style={[styles.field, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
              value={designation} onChangeText={setDesignation} placeholder="Assistant Professor" placeholderTextColor={C.textMuted}
            />
            <Text style={[styles.fieldLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>RESEARCH INTERESTS (COMMA-SEPARATED)</Text>
            <TextInput
              style={[styles.field, { backgroundColor: C.bg, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
              value={interests} onChangeText={setInterests} placeholder="Machine Learning, IoT" placeholderTextColor={C.textMuted}
            />

            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLbl, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>On leave</Text>
              <Switch value={onLeave} onValueChange={setOnLeave} trackColor={{ true: C.brand }} />
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: C.brand, opacity: saving ? 0.6 : 1 }]}
              onPress={save}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving
                ? <ActivityIndicator color={C.white} size="small" />
                : <Text style={[styles.saveTxt, { color: C.white, fontFamily: FontFamily.jakartaBold }]}>Save changes</Text>}
            </TouchableOpacity>
            <View style={{ height: 8 }} />
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  scroll: { paddingTop: 10, paddingBottom: 20 } as ViewStyle,

  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 14, borderRadius: 14 } as ViewStyle,
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 11 } as TextStyle,

  card: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' } as ViewStyle,
  divider: { height: StyleSheet.hairlineWidth } as ViewStyle,
  row: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 12, paddingHorizontal: 14 } as ViewStyle,
  name: { fontSize: 14 } as TextStyle,
  meta: { fontSize: 11.5, marginTop: 2 } as TextStyle,
  noPhoto: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999, marginRight: 4 } as ViewStyle,
  noPhotoTxt: { fontSize: 9.5 } as TextStyle,

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' } as ViewStyle,
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Layout.screenPadding,
    paddingTop: 20,
    paddingBottom: 30,
    maxHeight: '85%',
  } as ViewStyle,
  sheetTitle: { fontSize: 17, marginBottom: 10 } as TextStyle,
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 6 } as ViewStyle,
  photoHint: { fontSize: 13 } as TextStyle,
  fieldLabel: { fontSize: 11, letterSpacing: 0.7, marginTop: 12, marginBottom: 6 } as TextStyle,
  field: { height: 46, borderRadius: 12, borderWidth: 1, paddingHorizontal: 13, fontSize: 14 } as TextStyle,
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 } as ViewStyle,
  toggleLbl: { fontSize: 14 } as TextStyle,
  saveBtn: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 18 } as ViewStyle,
  saveTxt: { fontSize: 15 } as TextStyle,
});
