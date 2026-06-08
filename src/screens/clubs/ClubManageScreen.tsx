// Matches design screens-d.jsx — ClubManage (edit details + transfer presidency)
import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  Modal, ActivityIndicator, type ViewStyle, type TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout } from '../../theme';
import { supabase } from '../../lib/supabase';

interface Member {
  user_id: string;
  role: string;
  profiles: { full_name: string };
}

export function ClubManageScreen({ route, navigation }: any) {
  const { C } = useTheme();
  const { id } = route.params;
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [confirm, setConfirm] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [clubRes, membersRes] = await Promise.all([
        supabase.from('clubs').select('name, about').eq('id', id).single(),
        supabase.from('club_members').select('*, profiles:user_id(full_name)').eq('club_id', id),
      ]);
      if (clubRes.data) {
        setName(clubRes.data.name ?? '');
        setDesc(clubRes.data.about ?? '');
      }
      if (membersRes.data) setMembers(membersRes.data as any);
      setLoading(false);
    })();
  }, [id]);

  async function saveChanges() {
    if (!name.trim()) return;
    setSaving(true);
    await supabase.from('clubs').update({ name: name.trim(), about: desc.trim() }).eq('id', id);
    setSaving(false);
    navigation.goBack();
  }

  async function transferPresidency(memberId: string) {
    await supabase.from('club_members').update({ role: 'president' }).eq('club_id', id).eq('user_id', memberId);
    setConfirm(null);
    navigation.goBack();
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <SubBar title="Manage Club" onBack={() => navigation.goBack()} />
        <View style={styles.center}><ActivityIndicator color={C.brand} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title="Manage Club" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Club details section */}
        <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>CLUB DETAILS</Text>

        <Text style={[styles.fieldLabel, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>Name</Text>
        <TextInput
          style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium } as TextStyle]}
          value={name}
          onChangeText={setName}
          placeholder="Club name"
          placeholderTextColor={C.textMuted}
        />

        <Text style={[styles.fieldLabel, { color: C.text2, fontFamily: FontFamily.jakartaSemiBold }]}>Description</Text>
        <TextInput
          style={[styles.textarea, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium } as TextStyle]}
          value={desc}
          onChangeText={setDesc}
          placeholder="Club description"
          placeholderTextColor={C.textMuted}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: C.brand, opacity: name.trim() && !saving ? 1 : 0.5 }]}
          onPress={saveChanges}
          disabled={!name.trim() || saving}
          activeOpacity={0.85}
        >
          <Icon name="check" size={18} color="#fff" />
          <Text style={[styles.saveBtnTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>Save changes</Text>
        </TouchableOpacity>

        {/* Transfer presidency */}
        <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaExtraBold }]}>TRANSFER PRESIDENCY</Text>
        <View style={[styles.membersCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          {members.map((m, i) => {
            const isPresident = m.role === 'president';
            return (
              <View key={m.user_id}>
                {i > 0 && <View style={[styles.divider, { backgroundColor: C.border }]} />}
                <View style={styles.memberRow}>
                  <Avatar name={(m as any).profiles?.full_name} size="sm" />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.memberName, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                      {(m as any).profiles?.full_name ?? 'Member'}
                    </Text>
                    <Text style={[styles.memberRole, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                      {m.role}
                    </Text>
                  </View>
                  {isPresident ? (
                    <View style={[styles.pres, { backgroundColor: '#eef3ff' }]}>
                      <View style={[styles.presDot, { backgroundColor: '#2b5be3' }]} />
                      <Text style={[styles.presTxt, { color: '#2b5be3', fontFamily: FontFamily.jakartaBold }]}>President</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.makeBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
                      onPress={() => setConfirm(m)}
                      activeOpacity={0.75}
                    >
                      <Icon name="clubs" size={14} color={C.text} />
                      <Text style={[styles.makeBtnTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>Make president</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        <View style={{ height: 26 }} />
      </ScrollView>

      {/* Confirm transfer modal */}
      <Modal visible={!!confirm} transparent animationType="slide" onRequestClose={() => setConfirm(null)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setConfirm(null)} />
        <View style={[styles.sheet, { backgroundColor: C.surface }]}>
          <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>Transfer presidency?</Text>
          <Text style={[styles.sheetBody, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
            Make <Text style={{ fontFamily: FontFamily.jakartaBold }}>{(confirm as any)?.profiles?.full_name}</Text> the club president? You will become Vice President.
          </Text>
          <TouchableOpacity
            style={[styles.confirmBtn, { backgroundColor: C.brand }]}
            onPress={() => confirm && transferPresidency(confirm.user_id)}
            activeOpacity={0.85}
          >
            <Icon name="check" size={18} color="#fff" />
            <Text style={[styles.confirmTxt, { color: '#fff', fontFamily: FontFamily.jakartaBold }]}>Confirm transfer</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  scroll: { paddingTop: 4, paddingBottom: 20 } as ViewStyle,
  sectionLabel: { fontSize: 11, letterSpacing: 0.8, marginTop: 20, marginBottom: 10 } as any,
  fieldLabel: { fontSize: 13, marginBottom: 6 } as any,
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 12 } as TextStyle,
  textarea: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, minHeight: 90, marginBottom: 0 } as TextStyle,
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 14, marginTop: 16 } as ViewStyle,
  saveBtnTxt: { fontSize: 15 } as any,
  membersCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' } as ViewStyle,
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, paddingHorizontal: 14 } as ViewStyle,
  memberName: { fontSize: 14 } as any,
  memberRole: { fontSize: 12, marginTop: 1 } as any,
  divider: { height: StyleSheet.hairlineWidth } as ViewStyle,
  pres: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 } as ViewStyle,
  presDot: { width: 6, height: 6, borderRadius: 3 } as ViewStyle,
  presTxt: { fontSize: 11 } as any,
  makeBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 10, borderWidth: 1 } as ViewStyle,
  makeBtnTxt: { fontSize: 12 } as any,
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' } as ViewStyle,
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 } as ViewStyle,
  sheetTitle: { fontSize: 16, marginBottom: 10 } as any,
  sheetBody: { fontSize: 14, lineHeight: 21, marginBottom: 16 } as any,
  confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 14 } as ViewStyle,
  confirmTxt: { fontSize: 15 } as any,
});
