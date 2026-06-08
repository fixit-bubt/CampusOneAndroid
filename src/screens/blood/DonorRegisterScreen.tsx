// Matches design screens-g.jsx — DonorRegister
import { useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView,
  StyleSheet, Alert, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout } from '../../theme';
import { supabase } from '../../lib/supabase';
import type { BloodRequest } from '../../types/database';

const GROUPS: BloodRequest['blood_group'][] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export function DonorRegisterScreen({ navigation }: any) {
  const { C } = useTheme();
  const { user } = useAuth();

  const [group, setGroup] = useState<BloodRequest['blood_group'] | null>(null);
  const [area, setArea] = useState('');
  const [phone, setPhone] = useState('');
  const [lastDonated, setLastDonated] = useState('');
  const [loading, setLoading] = useState(false);

  const canSubmit = group !== null && area.trim();

  async function handleSubmit() {
    if (!canSubmit || !user) return;
    setLoading(true);
    try {
      const [donorRes, profileRes] = await Promise.all([
        supabase.from('donors').upsert({
          user_id:      user.id,
          blood_group:  group,
          area:         area.trim(),
          last_donated: lastDonated.trim() || null,
        }, { onConflict: 'user_id' }),
        phone.trim()
          ? supabase.from('profiles').update({ whatsapp: phone.trim() }).eq('id', user.id)
          : Promise.resolve({ error: null }),
      ]);
      if (donorRes.error) throw donorRes.error;
      if (profileRes.error) throw profileRes.error;
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Could not register. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title="Register as Donor" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>YOUR BLOOD GROUP</Text>
        <View style={styles.groupGrid}>
          {GROUPS.map(g => {
            const on = group === g;
            return (
              <TouchableOpacity
                key={g}
                style={[styles.groupBtn, {
                  backgroundColor: on ? '#c7344a' : 'transparent',
                  borderColor: on ? 'transparent' : C.border,
                }]}
                onPress={() => setGroup(g)}
                activeOpacity={0.75}
              >
                <Text style={[styles.groupTxt, { color: on ? '#fff' : C.text2, fontFamily: FontFamily.jakartaExtraBold }]}>
                  {g}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>AREA</Text>
        <TextInput
          style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
          value={area}
          onChangeText={setArea}
          placeholder="e.g. Mirpur"
          placeholderTextColor={C.textMuted}
        />

        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>PHONE / WHATSAPP</Text>
        <TextInput
          style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
          value={phone}
          onChangeText={setPhone}
          placeholder="+880 1700-000000"
          placeholderTextColor={C.textMuted}
          keyboardType="phone-pad"
        />

        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>LAST DONATED (OPTIONAL)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
          value={lastDonated}
          onChangeText={setLastDonated}
          placeholder="e.g. 3 months ago"
          placeholderTextColor={C.textMuted}
        />

        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: canSubmit ? '#c7344a' : C.surface2, opacity: loading ? 0.6 : 1 }]}
          onPress={handleSubmit}
          disabled={!canSubmit || loading}
          activeOpacity={0.8}
        >
          <Icon name="blood" size={18} color={canSubmit ? '#fff' : C.textMuted} />
          <Text style={[styles.submitText, { color: canSubmit ? '#fff' : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            Register as Donor
          </Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>
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

  groupGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  } as ViewStyle,

  groupBtn: {
    width: '22%',
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1.5,
  } as ViewStyle,

  groupTxt: { fontSize: 15 } as any,

  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14.5,
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
});
