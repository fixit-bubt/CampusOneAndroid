import { useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView,
  StyleSheet, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout, SectorColors } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/ui/Toast';
import { AreaPickerModal } from '../../components/blood/AreaPickerModal';
import type { BloodRequest } from '../../types/database';

const GROUPS: BloodRequest['blood_group'][] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const URGENCIES: { id: BloodRequest['urgency']; label: string }[] = [
  { id: 'Urgent',    label: 'Urgent' },
  { id: 'Today',     label: 'Today' },
  { id: 'This week', label: 'This week' },
];

export function BloodRequestScreen({ navigation }: any) {
  const { C } = useTheme();
  const { user } = useAuth();
  const t = useT();
  const toast = useToast();

  const [group, setGroup] = useState<BloodRequest['blood_group'] | null>(null);
  const [units, setUnits] = useState('1');
  const [patient, setPatient] = useState('');
  const [hospital, setHospital] = useState('');
  const [area, setArea] = useState('');
  const [areaModalVisible, setAreaModalVisible] = useState(false);
  const [urgency, setUrgency] = useState<BloodRequest['urgency']>('Today');
  const [isPlatelets, setIsPlatelets] = useState(false);
  const [loading, setLoading] = useState(false);

  const canSubmit = group !== null && patient.trim() && hospital.trim();

  async function handleSubmit() {
    if (!canSubmit || !user) return;
    setLoading(true);
    try {
      const finalPatient = isPlatelets ? `[Platelets] ${patient.trim()}` : patient.trim();
      const { error } = await supabase.from('blood_requests').insert({
        blood_group:  group,
        units:        parseInt(units, 10) || 1,
        patient:      finalPatient,
        hospital:     hospital.trim(),
        area:         area.trim() || 'Near campus',
        urgency,
        requester_id: user.id,
      });
      if (error) throw error;
      navigation.goBack();
    } catch {
      toast({ type: 'error', title: t.common.error, message: t.blood2.postRequestError });
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title={t.blood2.requestBlood} onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Blood group grid */}
        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.blood2.bloodGroup}</Text>
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

        {/* Units + Urgency */}
        <View style={styles.row}>
          <View style={[styles.halfField, { flex: 1 }]}>
            <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold, marginTop: 0 }]}>{t.blood2.units}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
              value={units}
              onChangeText={t => setUnits(t.replace(/\D/g, ''))}
              keyboardType="numeric"
              placeholderTextColor={C.textMuted}
            />
          </View>
          <View style={[styles.halfField, { flex: 2 }]}>
            <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold, marginTop: 0 }]}>{t.blood2.urgency}</Text>
            <View style={[styles.segRow, { backgroundColor: C.surface2, borderColor: C.border }]}>
              {URGENCIES.map(u => {
                const on = urgency === u.id;
                return (
                  <TouchableOpacity
                    key={u.id}
                    style={[styles.segBtn, on && { backgroundColor: SectorColors.blood }]}
                    onPress={() => setUrgency(u.id)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.segTxt, { color: on ? '#fff' : C.text2, fontFamily: FontFamily.jakartaBold }]}>
                      {u.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* Patient */}
        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.blood2.patient}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
          value={patient}
          onChangeText={setPatient}
          placeholder={t.blood2.patientPlaceholder}
          placeholderTextColor={C.textMuted}
        />

        {/* Hospital */}
        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.blood2.hospital}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
          value={hospital}
          onChangeText={setHospital}
          placeholder={t.blood2.hospitalPlaceholder}
          placeholderTextColor={C.textMuted}
        />

        {/* Area */}
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

        {/* Dengue Platelet (Apheresis) Toggle Card */}
        <TouchableOpacity
          style={[styles.plateletCard, {
            backgroundColor: isPlatelets ? C.warnBg : C.surface,
            borderColor: isPlatelets ? C.warn : C.border,
          }]}
          onPress={() => setIsPlatelets(!isPlatelets)}
          activeOpacity={0.8}
        >
          <View style={styles.plateletLeft}>
            <View style={[styles.plateletIcon, { backgroundColor: isPlatelets ? C.warn : C.surface2 }]}>
              <Icon name="blood" size={16} color={isPlatelets ? '#fff' : C.textMuted} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.plateletTitle, { color: isPlatelets ? C.warn : C.text, fontFamily: FontFamily.jakartaBold }]}>
                {t.blood2.denguePlateletUrgent} (Apheresis)
              </Text>
              <Text style={[styles.plateletDesc, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                {t.blood2.denguePlateletNote}
              </Text>
            </View>
          </View>
          <View style={[styles.checkbox, {
            backgroundColor: isPlatelets ? C.warn : 'transparent',
            borderColor: isPlatelets ? C.warn : C.border,
          }]}>
            {isPlatelets && <Icon name="check" size={12} color="#fff" />}
          </View>
        </TouchableOpacity>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: canSubmit ? SectorColors.blood : C.surface2, opacity: loading ? 0.6 : 1 }]}
          onPress={handleSubmit}
          disabled={!canSubmit || loading}
          activeOpacity={0.8}
        >
          <Icon name="blood" size={18} color={canSubmit ? '#fff' : C.textMuted} />
          <Text style={[styles.submitText, { color: canSubmit ? '#fff' : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {t.blood2.postRequest}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>
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
  scroll: { paddingTop: 12, paddingBottom: 20 } as ViewStyle,

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

  row: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
    alignItems: 'flex-start',
  } as ViewStyle,

  halfField: {} as ViewStyle,

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
    height: 48,
    alignItems: 'center',
  } as ViewStyle,

  segBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 7,
    borderRadius: 9,
  } as ViewStyle,

  segTxt: { fontSize: 12 } as any,

  plateletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 18,
    gap: 10,
  } as ViewStyle,

  plateletLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  } as ViewStyle,

  plateletIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  plateletTitle: {
    fontSize: 13,
  } as any,

  plateletDesc: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  } as any,

  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

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
