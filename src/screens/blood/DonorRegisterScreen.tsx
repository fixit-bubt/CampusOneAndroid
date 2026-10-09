import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView,
  StyleSheet, ActivityIndicator, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';
import { useToast } from '../../components/ui/Toast';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout, SectorColors } from '../../theme';
import { supabase } from '../../lib/supabase';
import { getMyDonor } from '../../services/bloodService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { scheduleRechargedReminder, cancelRechargedReminder } from '../../utils/bloodReminder';
import { AreaPickerModal } from '../../components/blood/AreaPickerModal';
import type { BloodRequest } from '../../types/database';

const GROUPS: BloodRequest['blood_group'][] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export function DonorRegisterScreen({ navigation }: any) {
  const { C } = useTheme();
  const { user, refreshProfile } = useAuth();
  const t = useT();
  const toast = useToast();

  const [group, setGroup] = useState<BloodRequest['blood_group'] | null>(null);
  const [area, setArea] = useState('');
  const [areaModalVisible, setAreaModalVisible] = useState(false);
  const [phone, setPhone] = useState('');
  const [lastDonated, setLastDonated] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadCurrent() {
      if (!user) {
        if (active) setInitialLoading(false);
        return;
      }
      try {
        const [res, savedGender] = await Promise.all([
          getMyDonor(user.id),
          AsyncStorage.getItem(`@donor_gender_${user.id}`),
        ]);
        if (active) {
          if (savedGender === 'female' || savedGender === 'male') {
            setGender(savedGender);
          }
          if (res.ok && res.data) {
            if (res.data.donor) {
              setIsRegistered(true);
              setGroup(res.data.donor.blood_group);
              setArea(res.data.donor.area || '');
              setLastDonated(res.data.donor.last_donated || '');
            }
            if (res.data.phone) {
              setPhone(res.data.phone);
            }
          }
        }
      } finally {
        if (active) setInitialLoading(false);
      }
    }
    loadCurrent();
    return () => { active = false; };
  }, [user]);

  const canSubmit = group !== null && area.trim();

  async function handleSubmit() {
    if (!canSubmit || !user) return;
    setLoading(true);
    try {
      // last_donated is a DATE column - only send a valid YYYY-MM-DD, else null.
      const ld = lastDonated.trim();
      const lastDonatedDate = /^\d{4}-\d{2}-\d{2}$/.test(ld) ? ld : null;
      if (ld && !lastDonatedDate) {
        toast({ type: 'error', title: t.common.error, message: `${t.blood2.lastDonatedOptional}: YYYY-MM-DD` });
        setLoading(false);
        return;
      }
      // Registering as a donor is consent to be reached. donor_contact only
      // reveals the number when show_whatsapp is true, so opt in here.
      const profilePatch: { show_whatsapp: boolean; whatsapp: string | null; blood_group: string } = {
        show_whatsapp: true,
        blood_group: group,
        whatsapp: phone.trim() || null,
      };
      const [donorRes, profileRes] = await Promise.all([
        supabase.from('donors').upsert({
          user_id:      user.id,
          blood_group:  group,
          area:         area.trim(),
          last_donated: lastDonatedDate,
        }, { onConflict: 'user_id' }),
        supabase.from('profiles').update(profilePatch).eq('id', user.id),
        AsyncStorage.setItem(`@donor_gender_${user.id}`, gender),
      ]);
      if (donorRes.error) throw donorRes.error;
      if (profileRes.error) throw profileRes.error;

      if (lastDonatedDate) {
        await scheduleRechargedReminder(
          lastDonatedDate,
          gender,
          t.blood2.rechargedNotificationTitle,
          t.blood2.rechargedNotificationBody,
        );
      } else {
        await cancelRechargedReminder();
      }

      await refreshProfile();
      navigation.goBack();
    } catch {
      toast({ type: 'error', title: t.common.error, message: t.blood2.registerError });
    } finally {
      setLoading(false);
    }
  }

  const screenTitle = isRegistered ? t.blood2.updateDonorTitle : t.blood2.registerAsDonorTitle;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title={screenTitle} onBack={() => navigation.goBack()} />

      {initialLoading ? (
        <View style={styles.centerLoad}>
          <ActivityIndicator size="small" color={C.brand} />
        </View>
      ) : (

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {isRegistered ? (
          <View style={[styles.lockedCard, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={[styles.lockedBadge, { backgroundColor: SectorColors.blood + '20' }]}>
              <Text style={[styles.lockedGroupTxt, { color: SectorColors.blood, fontFamily: FontFamily.jakartaExtraBold }]}>
                {group}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.lockedTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  {group} {t.blood2.donorsTab}
                </Text>
                <View style={[styles.permPill, { backgroundColor: C.successBg }]}>
                  <Text style={[styles.permTxt, { color: C.success, fontFamily: FontFamily.jakartaBold }]}>
                    Verified
                  </Text>
                </View>
              </View>
              <Text style={[styles.lockedNote, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                {t.blood2.bloodGroupLockedNote}
              </Text>
            </View>
          </View>
        ) : (
          <>
            <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.blood2.yourBloodGroup}</Text>
            <View style={styles.groupGrid}>
              {GROUPS.map(g => {
                const on = group === g;
                return (
                  <TouchableOpacity
                    key={g}
                    style={[styles.groupBtn, {
                      backgroundColor: on ? SectorColors.blood : 'transparent',
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
            <Text style={[styles.consent, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
              {t.blood2.bloodGroupPermanent}
            </Text>
          </>
        )}

        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.blood2.recoveryStandard}</Text>
        <View style={styles.genderRow}>
          {(['male', 'female'] as const).map(g => {
            const on = gender === g;
            return (
              <TouchableOpacity
                key={g}
                style={[styles.genderBtn, {
                  backgroundColor: on ? SectorColors.blood : 'transparent',
                  borderColor: on ? 'transparent' : C.border,
                }]}
                onPress={() => setGender(g)}
                activeOpacity={0.75}
              >
                <Text style={[styles.genderTxt, { color: on ? '#fff' : C.text2, fontFamily: FontFamily.jakartaBold }]}>
                  {g === 'male' ? t.blood2.male90d : t.blood2.female120d}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={[styles.consent, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
          {t.blood2.whoGuidelineNote}
        </Text>

        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold, marginTop: 0 }]}>{t.blood2.area}</Text>
          <TouchableOpacity
            onPress={() => setAreaModalVisible(true)}
            style={styles.pickAreaBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="pin" size={12} color={SectorColors.blood} />
            <Text style={[styles.pickAreaTxt, { color: SectorColors.blood, fontFamily: FontFamily.jakartaBold }]}>
              {t.blood2.pickAreaAction}
            </Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
          value={area}
          onChangeText={setArea}
          placeholder={t.blood2.areaPlaceholder}
          placeholderTextColor={C.textMuted}
        />

        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.blood2.phoneWhatsapp}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
          value={phone}
          onChangeText={setPhone}
          placeholder="+880 1700-000000"
          placeholderTextColor={C.textMuted}
          keyboardType="phone-pad"
        />
        <Text style={[styles.consent, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
          {t.blood2.whatsappConsent}
        </Text>

        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.blood2.lastDonatedOptional}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
          value={lastDonated}
          onChangeText={setLastDonated}
          placeholder={t.blood2.lastDonatedPlaceholder}
          placeholderTextColor={C.textMuted}
        />

        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: canSubmit ? SectorColors.blood : C.surface2, opacity: loading ? 0.6 : 1 }]}
          onPress={handleSubmit}
          disabled={!canSubmit || loading}
          activeOpacity={0.8}
        >
          <Icon name="blood" size={18} color={canSubmit ? '#fff' : C.textMuted} />
          <Text style={[styles.submitText, { color: canSubmit ? '#fff' : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {isRegistered ? t.blood2.updateDonorBtn : t.blood2.registerAsDonorBtnFull}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>
      )}
      <AreaPickerModal
        visible={areaModalVisible}
        onClose={() => setAreaModalVisible(false)}
        selectedArea={area}
        onSelectArea={setArea}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  centerLoad: { flex: 1, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  scroll: { paddingTop: 12, paddingBottom: 20 } as ViewStyle,

  lockedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 6,
    marginBottom: 4,
  } as ViewStyle,
  lockedBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  lockedGroupTxt: { fontSize: 16 } as any,
  lockedTitle: { fontSize: 14 } as any,
  lockedNote: { fontSize: 11.5, marginTop: 2 } as any,
  permPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  } as ViewStyle,
  permTxt: { fontSize: 10 } as any,

  label: {
    fontSize: 11,
    letterSpacing: 0.7,
    marginBottom: 8,
    marginTop: 18,
    marginLeft: 2,
  } as any,

  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 8,
    marginHorizontal: 2,
  } as ViewStyle,

  pickAreaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  } as ViewStyle,

  pickAreaTxt: {
    fontSize: 11.5,
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

  consent: { fontSize: 11.5, lineHeight: 16, marginTop: 8, marginLeft: 2 } as any,

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

  genderRow: {
    flexDirection: 'row',
    gap: 8,
  } as ViewStyle,

  genderBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1.5,
  } as ViewStyle,

  genderTxt: { fontSize: 13 } as any,
});
