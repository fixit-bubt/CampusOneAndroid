// CGPA calculator — a self-contained client tool. Add courses, credits and
// grades; the GPA is credit-weighted on the BUBT / UGC Bangladesh scale.
// Nothing is stored or sent.
import { useState, useRef, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Modal,
  KeyboardAvoidingView, Platform, type ViewStyle, type TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { SubBar } from '../../components/layout/TopBar';
import { FontFamily, Layout } from '../../theme';
import { useT } from '../../i18n';

const GRADE_POINTS: [string, number][] = [
  ['A+', 4.0], ['A', 3.75], ['A-', 3.5], ['B+', 3.25], ['B', 3.0],
  ['B-', 2.75], ['C+', 2.5], ['C', 2.25], ['D', 2.0], ['F', 0.0],
];
const GRADE_MAP: Record<string, number> = Object.fromEntries(GRADE_POINTS);

interface Row { id: number; name: string; credit: string; grade: string; }

export function CgpaScreen({ navigation }: any) {
  const { C } = useTheme();
  const t = useT();
  const [rows, setRows] = useState<Row[]>([
    { id: 1, name: '', credit: '3', grade: 'A' },
    { id: 2, name: '', credit: '3', grade: 'A' },
    { id: 3, name: '', credit: '3', grade: 'A' },
  ]);
  const nextId = useRef(4);
  const [gradeTarget, setGradeTarget] = useState<number | null>(null);

  const addRow = () => setRows(r => [...r, { id: nextId.current++, name: '', credit: '3', grade: 'A' }]);
  const removeRow = (id: number) => setRows(r => (r.length > 1 ? r.filter(x => x.id !== id) : r));
  const update = (id: number, patch: Partial<Row>) => setRows(r => r.map(x => (x.id === id ? { ...x, ...patch } : x)));

  const { gpa, totalCredits } = useMemo(() => {
    let qp = 0, cr = 0;
    for (const r of rows) {
      const c = parseFloat(r.credit);
      if (!Number.isFinite(c) || c <= 0) continue;
      const p = GRADE_MAP[r.grade];
      if (p === undefined) continue;
      qp += c * p;
      cr += c;
    }
    return { gpa: cr > 0 ? qp / cr : 0, totalCredits: cr };
  }, [rows]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title={t.cgpa.title} onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.subtitle, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
            {t.cgpa.subtitle}
          </Text>

          {/* Result */}
          <View style={[styles.resultCard, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Text style={[styles.resultLabel, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
              {t.cgpa.yourGpa}
            </Text>
            <Text style={[styles.resultGpa, { color: C.brand, fontFamily: FontFamily.jakartaExtraBold }]}>
              {gpa.toFixed(2)}
            </Text>
            <Text style={[styles.resultSub, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
              {totalCredits} {t.cgpa.credits} · {rows.length} {t.cgpa.courses}
            </Text>
          </View>

          {/* Rows */}
          <View style={{ gap: 8, marginTop: 16 }}>
            {rows.map(r => (
              <View key={r.id} style={styles.row}>
                <TextInput
                  style={[styles.nameInput, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium } as TextStyle]}
                  value={r.name}
                  onChangeText={v => update(r.id, { name: v })}
                  placeholder={t.cgpa.coursePlaceholder}
                  placeholderTextColor={C.textMuted}
                  autoCapitalize="characters"
                />
                <TextInput
                  style={[styles.creditInput, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaBold } as TextStyle]}
                  value={r.credit}
                  onChangeText={v => update(r.id, { credit: v.replace(/[^0-9.]/g, '') })}
                  keyboardType="decimal-pad"
                  textAlign="center"
                />
                <TouchableOpacity
                  style={[styles.gradeBtn, { backgroundColor: C.surface, borderColor: C.border }]}
                  onPress={() => setGradeTarget(r.id)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.gradeTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>{r.grade}</Text>
                  <Feather name="chevron-down" size={13} color={C.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.removeBtn, { borderColor: C.border }]}
                  onPress={() => removeRow(r.id)}
                  activeOpacity={0.7}
                  hitSlop={6}
                >
                  <Feather name="trash-2" size={15} color={C.textMuted} />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
            onPress={addRow}
            activeOpacity={0.8}
          >
            <Feather name="plus" size={16} color={C.text2} />
            <Text style={[styles.addTxt, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>{t.cgpa.addCourse}</Text>
          </TouchableOpacity>

          <Text style={[styles.note, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
            {t.cgpa.note}
          </Text>
          <View style={{ height: 24 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Grade picker */}
      <Modal visible={gradeTarget !== null} transparent animationType="slide" onRequestClose={() => setGradeTarget(null)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setGradeTarget(null)} />
        <View style={[styles.sheet, { backgroundColor: C.surface }]}>
          <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>{t.cgpa.grade}</Text>
          <ScrollView style={{ maxHeight: 380 }}>
            {GRADE_POINTS.map(([g, p]) => {
              const on = gradeTarget !== null && rows.find(r => r.id === gradeTarget)?.grade === g;
              return (
                <TouchableOpacity
                  key={g}
                  style={[styles.gradeOption, { borderBottomColor: C.border, backgroundColor: on ? C.surface2 : 'transparent' }]}
                  onPress={() => { if (gradeTarget !== null) update(gradeTarget, { grade: g }); setGradeTarget(null); }}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.gradeOptTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>{g}</Text>
                  <Text style={[styles.gradeOptPts, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium, flex: 1 }]}>
                    {p.toFixed(2)}
                  </Text>
                  {on && <Feather name="check" size={16} color={C.brand} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  scroll: { paddingTop: 10, paddingBottom: 20 } as ViewStyle,
  subtitle: { fontSize: 13, lineHeight: 19, marginBottom: 16, marginHorizontal: 2 } as TextStyle,

  resultCard: { alignItems: 'center', padding: 20, borderRadius: 18, borderWidth: 1 } as ViewStyle,
  resultLabel: { fontSize: 11, letterSpacing: 0.8 } as TextStyle,
  resultGpa: { fontSize: 46, letterSpacing: -1, marginTop: 6 } as TextStyle,
  resultSub: { fontSize: 13, marginTop: 4 } as TextStyle,

  row: { flexDirection: 'row', alignItems: 'center', gap: 8 } as ViewStyle,
  nameInput: { flex: 1, height: 46, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, fontSize: 14 } as TextStyle,
  creditInput: { width: 56, height: 46, borderRadius: 12, borderWidth: 1, fontSize: 14 } as TextStyle,
  gradeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, width: 68, height: 46, borderRadius: 12, borderWidth: 1 } as ViewStyle,
  gradeTxt: { fontSize: 14 } as TextStyle,
  removeBtn: { width: 40, height: 46, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' } as ViewStyle,

  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, height: 46, borderRadius: 13, borderWidth: 1, marginTop: 14 } as ViewStyle,
  addTxt: { fontSize: 14 } as TextStyle,

  note: { fontSize: 11.5, lineHeight: 17, marginTop: 18, marginHorizontal: 2 } as TextStyle,

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' } as ViewStyle,
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Layout.screenPadding,
    paddingTop: 20,
    paddingBottom: 34,
  } as ViewStyle,
  sheetTitle: { fontSize: 17, marginBottom: 12 } as TextStyle,
  gradeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  } as ViewStyle,
  gradeOptTxt: { fontSize: 15, width: 44 } as TextStyle,
  gradeOptPts: { fontSize: 13 } as TextStyle,
});
