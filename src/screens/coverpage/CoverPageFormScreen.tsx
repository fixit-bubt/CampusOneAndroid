import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert,
  TextInput, Platform, KeyboardAvoidingView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, FontSize, Layout, Radius, Spacing, SectorColors } from '../../theme';

type DocType = 'assignment' | 'lab_report' | 'project_report';

const DOC_TYPES: DocType[] = ['assignment', 'lab_report', 'project_report'];

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildHtml(fields: {
  docType: DocType;
  university: string;
  departmentOf: string;
  department: string;
  courseTitle: string;
  courseCode: string;
  submittedTo: string;
  studentName: string;
  studentId: string;
  intake: string;
  section: string;
  dateOfSubmission: string;
  experiment: string;
  docTypeLabel: string;
  labels: {
    submittedTo: string;
    submittedBy: string;
    name: string;
    studentId: string;
    department: string;
    intake: string;
    section: string;
    dateOfSubmission: string;
  };
}): string {
  const e = (s: string) => escapeHtml(s);
  const f = fields;
  const docTitle = e(f.docTypeLabel);
  const showExperiment = f.docType === 'lab_report' && f.experiment;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  @page { size: A4; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Times New Roman', serif;
    width: 210mm; min-height: 297mm;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: 30mm 25mm;
    color: #1a1a1a;
  }
  .border-frame {
    border: 2.5px solid #1a3a6b;
    padding: 28mm 20mm;
    width: 100%; min-height: 237mm;
    display: flex; flex-direction: column;
    align-items: center; justify-content: space-between;
  }
  .header { text-align: center; margin-bottom: 12mm; }
  .uni-name { font-size: 20pt; font-weight: bold; color: #1a3a6b; margin-bottom: 3mm; }
  .dept { font-size: 13pt; color: #333; margin-bottom: 6mm; }
  .doc-type {
    font-size: 16pt; font-weight: bold; color: #fff;
    background: #1a3a6b; padding: 3mm 10mm;
    border-radius: 2mm; display: inline-block;
    margin-top: 4mm; letter-spacing: 0.5pt;
  }
  .course-block { text-align: center; margin: 8mm 0; }
  .course-title { font-size: 15pt; font-weight: bold; margin-bottom: 2mm; }
  .course-code { font-size: 12pt; color: #555; }
  .experiment { font-size: 11pt; color: #444; margin-top: 3mm; font-style: italic; }
  .info-section { width: 100%; margin-top: 6mm; }
  .info-block { margin-bottom: 8mm; }
  .info-label {
    font-size: 10pt; font-weight: bold; color: #1a3a6b;
    text-transform: uppercase; letter-spacing: 1pt;
    border-bottom: 1.5px solid #1a3a6b;
    padding-bottom: 1.5mm; margin-bottom: 3mm;
  }
  .info-table { width: 100%; font-size: 11pt; }
  .info-table td { padding: 1.5mm 0; vertical-align: top; }
  .info-table td:first-child { width: 40%; font-weight: bold; color: #333; }
  .info-table td:last-child { color: #1a1a1a; }
  .date-block { text-align: center; margin-top: 10mm; font-size: 11pt; color: #555; }
</style>
</head>
<body>
<div class="border-frame">
  <div class="header">
    <div class="uni-name">${e(f.university)}</div>
    <div class="dept">${e(f.departmentOf)} ${e(f.department)}</div>
    <div class="doc-type">${docTitle}</div>
  </div>

  <div class="course-block">
    <div class="course-title">${e(f.courseTitle)}</div>
    <div class="course-code">${e(f.courseCode)}</div>
    ${showExperiment ? `<div class="experiment">${e(f.experiment)}</div>` : ''}
  </div>

  <div class="info-section">
    <div class="info-block">
      <div class="info-label">${e(f.labels.submittedTo)}</div>
      <table class="info-table"><tr><td colspan="2">${e(f.submittedTo)}</td></tr></table>
    </div>
    <div class="info-block">
      <div class="info-label">${e(f.labels.submittedBy)}</div>
      <table class="info-table">
        <tr><td>${e(f.labels.name)}</td><td>${e(f.studentName)}</td></tr>
        <tr><td>${e(f.labels.studentId)}</td><td>${e(f.studentId)}</td></tr>
        <tr><td>${e(f.labels.department)}</td><td>${e(f.department)}</td></tr>
        <tr><td>${e(f.labels.intake)}</td><td>${e(f.intake)}</td></tr>
        <tr><td>${e(f.labels.section)}</td><td>${e(f.section)}</td></tr>
      </table>
    </div>
  </div>

  <div class="date-block">
    ${e(f.labels.dateOfSubmission)}: ${e(f.dateOfSubmission)}
  </div>
</div>
</body>
</html>`;
}

export function CoverPageFormScreen({ navigation }: any) {
  const { C } = useTheme();
  const { profile } = useAuth();
  const t = useT();

  const [docType, setDocType] = useState<DocType>('assignment');
  const [submittedTo, setSubmittedTo] = useState('');
  const [studentName, setStudentName] = useState(profile?.full_name ?? '');
  const [studentId, setStudentId] = useState('');
  const [department, setDepartment] = useState(profile?.department ?? '');
  const [intake, setIntake] = useState(profile?.intake ?? '');
  const [section, setSection] = useState(profile?.section ?? '');
  const [courseTitle, setCourseTitle] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [dateOfSubmission, setDateOfSubmission] = useState(new Date().toISOString().slice(0, 10));
  const [experiment, setExperiment] = useState('');
  const [generating, setGenerating] = useState(false);

  const docTypeLabel = (dt: DocType) => {
    const map: Record<DocType, string> = {
      assignment: t.coverpage2.typeAssignment,
      lab_report: t.coverpage2.typeLabReport,
      project_report: t.coverpage2.typeProjectReport,
    };
    return map[dt];
  };

  const canGenerate = studentName.trim() && studentId.trim() && courseTitle.trim() && courseCode.trim();

  async function handleGenerate() {
    if (!canGenerate) return;
    setGenerating(true);
    try {
      const html = buildHtml({
        docType,
        university: t.coverpage2.universityName,
        departmentOf: t.coverpage2.departmentOf,
        department: department.trim() || 'N/A',
        courseTitle: courseTitle.trim(),
        courseCode: courseCode.trim(),
        submittedTo: submittedTo.trim() || 'N/A',
        studentName: studentName.trim(),
        studentId: studentId.trim(),
        intake: intake.trim() || 'N/A',
        section: section.trim() || 'N/A',
        dateOfSubmission: dateOfSubmission.trim() || 'N/A',
        experiment: experiment.trim(),
        docTypeLabel: docTypeLabel(docType),
        labels: {
          submittedTo: t.coverpage2.submittedTo,
          submittedBy: t.coverpage2.submittedBy,
          name: t.coverpage2.studentName,
          studentId: t.coverpage2.studentId,
          department: t.coverpage2.department,
          intake: t.coverpage2.intake,
          section: t.coverpage2.section,
          dateOfSubmission: t.coverpage2.dateOfSubmission,
        },
      });

      const { uri } = await Print.printToFileAsync({ html, base64: false });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: t.coverpage2.shareOrSave,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert(t.coverpage2.preview, uri);
      }
    } catch {
      Alert.alert(t.common.error, t.coverpage2.generationFailed);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title={t.coverpage2.title} onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Doc type */}
          <Text style={[styles.fieldLabel, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
            {t.coverpage2.docType}
          </Text>
          <View style={styles.typeRow}>
            {DOC_TYPES.map(dt => (
              <TouchableOpacity
                key={dt}
                style={[styles.typeChip, {
                  borderColor: docType === dt ? SectorColors.coverpage : C.border,
                  backgroundColor: docType === dt ? SectorColors.coverpage + '18' : C.surface2,
                }]}
                onPress={() => setDocType(dt)}
              >
                <Text style={[styles.typeChipText, {
                  color: docType === dt ? SectorColors.coverpage : C.text2,
                  fontFamily: FontFamily.jakartaMedium,
                }]}>
                  {docTypeLabel(dt)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Course info */}
          <Text style={[styles.fieldLabel, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
            {t.coverpage2.courseTitle}
          </Text>
          <TextInput
            style={[styles.input, { color: C.text, backgroundColor: C.surface2, borderColor: C.border, fontFamily: FontFamily.jakartaRegular }]}
            value={courseTitle} onChangeText={setCourseTitle}
            placeholder={t.coverpage2.courseTitlePlaceholder} placeholderTextColor={C.textMuted}
          />

          <Text style={[styles.fieldLabel, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
            {t.coverpage2.courseCode}
          </Text>
          <TextInput
            style={[styles.input, { color: C.text, backgroundColor: C.surface2, borderColor: C.border, fontFamily: FontFamily.jakartaRegular }]}
            value={courseCode} onChangeText={setCourseCode}
            placeholder={t.coverpage2.courseCodePlaceholder} placeholderTextColor={C.textMuted}
          />

          {docType === 'lab_report' && (
            <>
              <Text style={[styles.fieldLabel, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
                {t.coverpage2.experimentTopic}
              </Text>
              <TextInput
                style={[styles.input, { color: C.text, backgroundColor: C.surface2, borderColor: C.border, fontFamily: FontFamily.jakartaRegular }]}
                value={experiment} onChangeText={setExperiment}
                placeholder={t.coverpage2.experimentPlaceholder} placeholderTextColor={C.textMuted}
              />
            </>
          )}

          {/* Submitted to */}
          <Text style={[styles.fieldLabel, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
            {t.coverpage2.submittedTo}
          </Text>
          <TextInput
            style={[styles.input, styles.multiline, { color: C.text, backgroundColor: C.surface2, borderColor: C.border, fontFamily: FontFamily.jakartaRegular }]}
            value={submittedTo} onChangeText={setSubmittedTo}
            placeholder={t.coverpage2.teacherPlaceholder} placeholderTextColor={C.textMuted}
            multiline numberOfLines={2}
          />

          {/* Student info section */}
          <View style={[styles.sectionHeader, { borderBottomColor: C.border }]}>
            <Icon name="user" size={16} color={SectorColors.coverpage} />
            <Text style={[styles.sectionTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {t.coverpage2.submittedBy}
            </Text>
          </View>

          <Text style={[styles.fieldLabel, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
            {t.coverpage2.studentName}
          </Text>
          <TextInput
            style={[styles.input, { color: C.text, backgroundColor: C.surface2, borderColor: C.border, fontFamily: FontFamily.jakartaRegular }]}
            value={studentName} onChangeText={setStudentName}
            placeholder={t.coverpage2.studentNamePlaceholder} placeholderTextColor={C.textMuted}
          />

          <Text style={[styles.fieldLabel, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
            {t.coverpage2.studentId}
          </Text>
          <TextInput
            style={[styles.input, { color: C.text, backgroundColor: C.surface2, borderColor: C.border, fontFamily: FontFamily.jakartaRegular }]}
            value={studentId} onChangeText={setStudentId}
            placeholder={t.coverpage2.studentIdPlaceholder} placeholderTextColor={C.textMuted}
          />

          <View style={styles.halfRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
                {t.coverpage2.department}
              </Text>
              <TextInput
                style={[styles.input, { color: C.text, backgroundColor: C.surface2, borderColor: C.border, fontFamily: FontFamily.jakartaRegular }]}
                value={department} onChangeText={setDepartment}
                placeholder={t.coverpage2.departmentPlaceholder} placeholderTextColor={C.textMuted}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
                {t.coverpage2.intake}
              </Text>
              <TextInput
                style={[styles.input, { color: C.text, backgroundColor: C.surface2, borderColor: C.border, fontFamily: FontFamily.jakartaRegular }]}
                value={intake} onChangeText={setIntake}
                placeholder={t.coverpage2.intakePlaceholder} placeholderTextColor={C.textMuted}
              />
            </View>
          </View>

          <Text style={[styles.fieldLabel, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
            {t.coverpage2.section}
          </Text>
          <TextInput
            style={[styles.input, { color: C.text, backgroundColor: C.surface2, borderColor: C.border, fontFamily: FontFamily.jakartaRegular }]}
            value={section} onChangeText={setSection}
            placeholder={t.coverpage2.sectionPlaceholder} placeholderTextColor={C.textMuted}
          />

          <Text style={[styles.fieldLabel, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
            {t.coverpage2.dateOfSubmission}
          </Text>
          <TextInput
            style={[styles.input, { color: C.text, backgroundColor: C.surface2, borderColor: C.border, fontFamily: FontFamily.jakartaRegular }]}
            value={dateOfSubmission} onChangeText={setDateOfSubmission}
            placeholder={t.coverpage2.datePlaceholder} placeholderTextColor={C.textMuted}
          />

          {/* Generate button */}
          <TouchableOpacity
            style={[styles.genBtn, { backgroundColor: SectorColors.coverpage, opacity: !canGenerate || generating ? 0.5 : 1 }]}
            onPress={handleGenerate}
            disabled={!canGenerate || generating}
          >
            {generating ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Icon name="fileText" size={20} color="#fff" />
            )}
            <Text style={[styles.genBtnText, { fontFamily: FontFamily.jakartaBold }]}>
              {generating ? t.coverpage2.generating : t.coverpage2.generatePdf}
            </Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: 20, paddingTop: Spacing[2] },
  fieldLabel: { fontSize: FontSize.xs, letterSpacing: 0.5, marginBottom: Spacing[1], marginTop: Spacing[3] },
  input: { height: Layout.inputHeight, borderRadius: Radius.sm, borderWidth: 1, paddingHorizontal: Spacing[3], fontSize: FontSize.base },
  multiline: { height: 72, paddingTop: Spacing[2], textAlignVertical: 'top' },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[2] },
  typeChip: { paddingHorizontal: Spacing[3], paddingVertical: Spacing[2], borderRadius: Radius.full, borderWidth: 1 },
  typeChipText: { fontSize: FontSize.sm },
  halfRow: { flexDirection: 'row', gap: Spacing[3] },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2], marginTop: Spacing[5], paddingBottom: Spacing[2], borderBottomWidth: StyleSheet.hairlineWidth },
  sectionTitle: { fontSize: FontSize.md },
  genBtn: { flexDirection: 'row', height: 52, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', gap: Spacing[2], marginTop: Spacing[6] },
  genBtnText: { color: '#fff', fontSize: FontSize.lg },
});
