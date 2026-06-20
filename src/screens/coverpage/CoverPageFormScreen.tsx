import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert,
  TextInput, Platform, KeyboardAvoidingView, ActivityIndicator,
  Modal, FlatList, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { Avatar } from '../../components/ui/Avatar';
import { supabase } from '../../lib/supabase';
import { FontFamily, FontSize, Layout, Radius, Spacing, SectorColors, Accent } from '../../theme';

type DocType = 'assignment' | 'lab_report' | 'project_report';
type TemplateStyle = 'default' | 'classic' | 'modern';

const DOC_TYPES: DocType[] = ['assignment', 'lab_report', 'project_report'];
const TEMPLATES: TemplateStyle[] = ['default', 'classic', 'modern'];

interface FacultyRow {
  id: string;
  name: string;
  designation: string;
  department_id: string;
  photo_url: string | null;
  dept_name?: string;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildHtml(f: {
  template: TemplateStyle;
  docTypeLabel: string;
  university: string;
  department: string;
  courseCode: string;
  courseTitle: string;
  assignmentNo: string;
  experiment: string;
  studentName: string;
  studentId: string;
  intake: string;
  section: string;
  program: string;
  teacherName: string;
  teacherDesig: string;
  dateOfSubmission: string;
  showSignature: boolean;
  docType: DocType;
}): string {
  const e = escapeHtml;
  const isLab = f.docType === 'lab_report';
  const noLabel = isLab ? 'Experiment No' : 'Assignment No';
  const uni = e(f.university);
  const dept = e(f.department);
  const docLabel = e(f.docTypeLabel);

  const base = `@page{size:A4;margin:0}*{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Times New Roman',serif;width:210mm;min-height:297mm;color:#1a1a1a;}
    .page{display:flex;flex-direction:column;align-items:center;justify-content:space-between;}
    .course-info{text-align:left;width:100%;padding:0 22mm;margin:8mm 0;}
    .course-info p{font-size:12pt;margin:2.5mm 0;}
    .boxes{width:86%;margin:0 auto;}
    .boxes td{width:50%;border:2px solid #333;border-radius:3mm;padding:5mm 6mm;vertical-align:top;}
    .boxes .hdr{font-size:12.5pt;font-weight:bold;margin-bottom:4mm;}
    .boxes p{font-size:11pt;line-height:2.0;margin:0;}
    .date{text-align:center;font-size:12pt;font-weight:bold;margin-top:8mm;}
    .sig{text-align:right;margin-top:8mm;padding-right:18mm;}
    .sig-line{display:inline-block;text-align:center;width:45mm;border-top:1px solid #333;padding-top:2mm;font-size:9pt;font-weight:normal;}`;

  const courseInfo = `
    <div class="course-info">
      <p><b>${noLabel} :</b> ${e(f.assignmentNo) || ''}</p>
      <p><b>Course Code &nbsp;&nbsp;:</b> ${e(f.courseCode)}</p>
      <p><b>Course Title &nbsp;&nbsp;:</b> ${e(f.courseTitle)}</p>
      ${isLab && f.experiment ? `<p><b>Experiment / Topic :</b> ${e(f.experiment)}</p>` : ''}
    </div>`;

  const boxes = `
    <table class="boxes" cellspacing="6"><tr>
      <td>
        <div class="hdr">Submitted By:</div>
        <p><b>Name :</b> ${e(f.studentName)}</p>
        <p><b>ID No :</b> ${e(f.studentId)}</p>
        <p><b>Intake :</b> ${e(f.intake)}</p>
        <p><b>Section :</b> ${e(f.section)}</p>
        <p><b>Program :</b> ${e(f.program)}</p>
      </td>
      <td>
        <div class="hdr">Submitted To:</div>
        <p><b>Name :</b> ${e(f.teacherName)}</p>
        ${f.teacherDesig ? `<p>${e(f.teacherDesig)}</p>` : ''}
        <p style="margin-top:5mm;"><b>Dept. of</b> ${dept}</p>
        <p style="font-size:9.5pt;">${uni}</p>
      </td>
    </tr></table>`;

  const date = `<p class="date">Date of Submission : ${e(f.dateOfSubmission)}</p>`;
  const sig = f.showSignature ? `<div class="sig"><div class="sig-line">Teacher's Signature</div></div>` : '';

  if (f.template === 'classic') {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${base}
      body{padding:12mm 16mm;}</style></head><body>
<div class="page" style="border:2.5px solid #1a3a6b;min-height:273mm;padding:14mm 10mm;">
  <div style="text-align:center;">
    <table style="margin:0 auto;"><tr>
      <td style="padding-right:4mm;vertical-align:middle;"><span style="font-size:30pt;font-weight:bold;color:#1a3a6b;letter-spacing:2pt;">BUBT</span></td>
      <td style="text-align:left;vertical-align:middle;border-left:2px solid #1a3a6b;padding-left:4mm;">
        <span style="font-size:9pt;font-weight:bold;color:#1a3a6b;line-height:1.4;">BANGLADESH UNIVERSITY OF<br/>BUSINESS AND TECHNOLOGY</span>
      </td>
    </tr></table>
    <p style="font-size:9pt;font-style:italic;color:#555;margin:3mm 0 10mm;">Committed to Academic Excellence</p>
    <div style="display:inline-block;border:2px solid #1a3a6b;padding:3mm 16mm;">
      <span style="font-size:14pt;font-weight:bold;color:#1a3a6b;">${docLabel.toUpperCase()}</span>
    </div>
  </div>
  ${courseInfo}
  ${boxes}
  ${date}
  ${sig}
</div></body></html>`;
  }

  if (f.template === 'modern') {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${base}
      body{font-family:Georgia,serif;padding:14mm 18mm;}
      .boxes td{border-color:#444;}</style></head><body>
<div class="page" style="border:2px solid #444;border-radius:4mm;min-height:269mm;padding:16mm 12mm;">
  <div style="text-align:center;">
    <p style="font-size:16pt;font-weight:bold;color:#2a2a2a;margin-bottom:3mm;">${uni}</p>
    <p style="font-size:11pt;color:#555;margin-bottom:10mm;">Department of ${dept}</p>
    <div style="background:#2a2a2a;color:#fff;padding:3.5mm 18mm;display:inline-block;border-radius:2mm;">
      <span style="font-size:13pt;font-weight:bold;letter-spacing:2pt;">${docLabel.toUpperCase()}</span>
    </div>
  </div>
  ${courseInfo}
  ${boxes}
  ${date}
  ${sig}
</div></body></html>`;
  }

  // Default — matches real BUBT template from Scribd/APK preview
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${base}
    body{padding:12mm 16mm;}</style></head><body>
<div class="page" style="border:2px solid #333;min-height:273mm;padding:14mm 10mm;">
  <div style="text-align:center;">
    <p style="font-size:18pt;font-weight:bold;font-style:italic;margin-bottom:14mm;">${uni}</p>
    <div style="display:inline-block;border:2px solid #333;padding:3mm 14mm;">
      <span style="font-size:14pt;font-weight:bold;">${docLabel.toUpperCase()}</span>
    </div>
  </div>
  ${courseInfo}
  ${boxes}
  ${date}
  ${sig}
</div></body></html>`;
}

const TEMPLATE_LABELS: Record<TemplateStyle, string> = {
  default: 'Default',
  classic: 'Classic',
  modern: 'Modern',
};

export function CoverPageFormScreen({ navigation }: any) {
  const { C, isDark } = useTheme();
  const { profile } = useAuth();
  const t = useT();

  // Form state
  const [docType, setDocType] = useState<DocType>('assignment');
  const [template, setTemplate] = useState<TemplateStyle>('default');
  const [courseCode, setCourseCode] = useState('');
  const [courseTitle, setCourseTitle] = useState('');
  const [assignmentNo, setAssignmentNo] = useState('');
  const [experiment, setExperiment] = useState('');
  const [studentName, setStudentName] = useState(profile?.full_name ?? '');
  const [studentId, setStudentId] = useState('');
  const [department, setDepartment] = useState(profile?.department ?? '');
  const [intake, setIntake] = useState(profile?.intake ?? '');
  const [section, setSection] = useState(profile?.section ?? '');
  const [program, setProgram] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [teacherDesig, setTeacherDesig] = useState('');
  const [dateOfSubmission, setDateOfSubmission] = useState(new Date().toISOString().slice(0, 10));
  const [showSignature, setShowSignature] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Faculty picker
  const [facultyList, setFacultyList] = useState<FacultyRow[]>([]);
  const [facultyModal, setFacultyModal] = useState(false);
  const [facultySearch, setFacultySearch] = useState('');

  // Departments for program dropdown
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [deptModal, setDeptModal] = useState(false);

  // Course picker
  const [courseList, setCourseList] = useState<{ code: string; name: string }[]>([]);
  const [courseModal, setCourseModal] = useState(false);
  const [courseSearch, setCourseSearch] = useState('');

  useEffect(() => {
    (async () => {
      const [fRes, dRes, cRes] = await Promise.all([
        supabase.from('faculty').select('id, name, designation, department_id, photo_url').eq('on_leave', false).order('name'),
        supabase.from('departments').select('id, name').order('name'),
        supabase.from('courses').select('code, name').order('code'),
      ]);
      const depts = (dRes.data ?? []) as { id: string; name: string }[];
      setDepartments(depts);
      setCourseList((cRes.data ?? []) as { code: string; name: string }[]);
      const deptMap = new Map(depts.map(d => [d.id, d.name]));
      setFacultyList(
        ((fRes.data ?? []) as FacultyRow[]).map(f => ({ ...f, dept_name: deptMap.get(f.department_id) ?? '' }))
      );
    })();
  }, []);

  const docTypeLabel = (dt: DocType) => {
    const map: Record<DocType, string> = {
      assignment: t.coverpage2.typeAssignment,
      lab_report: t.coverpage2.typeLabReport,
      project_report: t.coverpage2.typeProjectReport,
    };
    return map[dt];
  };

  const canGenerate = studentName.trim() && studentId.trim() && courseTitle.trim() && courseCode.trim();

  function selectTeacher(f: FacultyRow) {
    setTeacherName(f.name);
    setTeacherDesig(f.designation);
    if (f.dept_name && !department) setDepartment(f.dept_name.replace(/^Department of\s*/i, ''));
    setFacultyModal(false);
    setFacultySearch('');
  }

  function selectCourse(c: { code: string; name: string }) {
    setCourseCode(c.code);
    setCourseTitle(c.name);
    setCourseModal(false);
    setCourseSearch('');
  }

  const filteredCourses = courseSearch
    ? courseList.filter(c =>
        c.code.toLowerCase().includes(courseSearch.toLowerCase()) ||
        c.name.toLowerCase().includes(courseSearch.toLowerCase())
      )
    : courseList;

  function selectProgram(d: { id: string; name: string }) {
    const short = d.name.replace(/^Department of\s*/i, '');
    setProgram(short);
    if (!department) setDepartment(short);
    setDeptModal(false);
  }

  const filteredFaculty = facultySearch
    ? facultyList.filter(f =>
        f.name.toLowerCase().includes(facultySearch.toLowerCase()) ||
        (f.dept_name ?? '').toLowerCase().includes(facultySearch.toLowerCase())
      )
    : facultyList;

  async function handleGenerate() {
    if (!canGenerate) return;
    setGenerating(true);
    try {
      const html = buildHtml({
        template,
        docType,
        docTypeLabel: docTypeLabel(docType),
        university: t.coverpage2.universityName,
        department: department.trim() || 'N/A',
        courseCode: courseCode.trim(),
        courseTitle: courseTitle.trim(),
        assignmentNo: assignmentNo.trim(),
        experiment: experiment.trim(),
        studentName: studentName.trim(),
        studentId: studentId.trim(),
        intake: intake.trim() || 'N/A',
        section: section.trim() || 'N/A',
        program: program.trim() || department.trim() || 'N/A',
        teacherName: teacherName.trim() || 'N/A',
        teacherDesig: teacherDesig.trim(),
        dateOfSubmission: dateOfSubmission.trim() || 'N/A',
        showSignature,
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

  const inputStyle = [styles.input, { color: C.text, backgroundColor: C.surface2, borderColor: C.border, fontFamily: FontFamily.jakartaRegular }] as any;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title={t.coverpage2.title} onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Doc type tabs */}
          <View style={styles.typeRow}>
            {DOC_TYPES.map(dt => {
              const active = docType === dt;
              return (
                <TouchableOpacity
                  key={dt}
                  style={[styles.typeChip, {
                    borderColor: active ? SectorColors.coverpage : C.border,
                    backgroundColor: active ? SectorColors.coverpage : C.surface2,
                  }]}
                  onPress={() => setDocType(dt)}
                >
                  <Icon name={dt === 'lab_report' ? 'layers' : 'fileText'} size={14}
                    color={active ? C.white : C.text2} />
                  <Text style={[styles.typeChipText, {
                    color: active ? C.white : C.text2,
                    fontFamily: active ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                  }]}>
                    {docTypeLabel(dt)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Template selection */}
          <SectionLabel icon="grid" label="Select Template" C={C} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing[3] }}>
            {TEMPLATES.map(tmpl => {
              const active = template === tmpl;
              return (
                <TouchableOpacity
                  key={tmpl}
                  style={[styles.templateCard, {
                    borderColor: active ? SectorColors.coverpage : C.border,
                    borderWidth: active ? 2.5 : 1,
                    backgroundColor: C.surface,
                  }]}
                  onPress={() => setTemplate(tmpl)}
                  activeOpacity={0.8}
                >
                  <MiniCoverPreview template={tmpl} C={C} isDark={isDark} />
                  {active && (
                    <View style={[styles.checkBadge, { backgroundColor: SectorColors.coverpage }]}>
                      <Icon name="check" size={12} color={C.white} />
                    </View>
                  )}
                  <Text style={[styles.templateLabel, {
                    color: active ? SectorColors.coverpage : C.text2,
                    fontFamily: active ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                  }]}>
                    {TEMPLATE_LABELS[tmpl]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Course Details */}
          <SectionLabel icon="box" label="Course Details" C={C} />

          <FieldLabel label={t.coverpage2.courseCode} C={C} autofill onAutofill={() => setCourseModal(true)} />
          <TextInput style={inputStyle} value={courseCode} onChangeText={setCourseCode}
            placeholder={t.coverpage2.courseCodePlaceholder} placeholderTextColor={C.textMuted} />

          <FieldLabel label={t.coverpage2.courseTitle} C={C} />
          <TextInput style={inputStyle} value={courseTitle} onChangeText={setCourseTitle}
            placeholder={t.coverpage2.courseTitlePlaceholder} placeholderTextColor={C.textMuted} />

          {/* Assignment / Lab details */}
          <SectionLabel icon={docType === 'lab_report' ? 'layers' : 'fileText'}
            label={docType === 'lab_report' ? 'Lab Report Details' : 'Assignment Details'} C={C} />

          <FieldLabel label={docType === 'lab_report' ? 'EXPERIMENT NO' : 'ASSIGNMENT NO'} C={C} />
          <TextInput style={inputStyle} value={assignmentNo} onChangeText={setAssignmentNo}
            placeholder="e.g. 1" placeholderTextColor={C.textMuted} />

          {docType === 'lab_report' && (
            <>
              <FieldLabel label={t.coverpage2.experimentTopic} C={C} />
              <TextInput style={inputStyle} value={experiment} onChangeText={setExperiment}
                placeholder={t.coverpage2.experimentPlaceholder} placeholderTextColor={C.textMuted} />
            </>
          )}

          {/* Student Information */}
          <SectionLabel icon="user" label="Student Information" C={C} />

          <FieldLabel label={t.coverpage2.studentName} C={C} />
          <TextInput style={inputStyle} value={studentName} onChangeText={setStudentName}
            placeholder={t.coverpage2.studentNamePlaceholder} placeholderTextColor={C.textMuted} />

          <FieldLabel label={t.coverpage2.studentId} C={C} />
          <TextInput style={inputStyle} value={studentId} onChangeText={setStudentId}
            placeholder={t.coverpage2.studentIdPlaceholder} placeholderTextColor={C.textMuted} />

          <View style={styles.halfRow}>
            <View style={{ flex: 1 }}>
              <FieldLabel label={t.coverpage2.intake} C={C} />
              <TextInput style={inputStyle} value={intake} onChangeText={setIntake}
                placeholder={t.coverpage2.intakePlaceholder} placeholderTextColor={C.textMuted} />
            </View>
            <View style={{ flex: 1 }}>
              <FieldLabel label={t.coverpage2.section} C={C} />
              <TextInput style={inputStyle} value={section} onChangeText={setSection}
                placeholder={t.coverpage2.sectionPlaceholder} placeholderTextColor={C.textMuted} />
            </View>
          </View>

          {/* Program picker */}
          <FieldLabel label="PROGRAM" C={C} />
          <TouchableOpacity style={[styles.pickerBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
            onPress={() => setDeptModal(true)}>
            <Icon name="grid" size={16} color={C.textMuted} />
            <Text style={[styles.pickerText, {
              color: program ? C.text : C.textMuted,
              fontFamily: FontFamily.jakartaRegular,
            }]} numberOfLines={1}>
              {program || 'Select program'}
            </Text>
            <Icon name="chevD" size={16} color={C.textMuted} />
          </TouchableOpacity>

          {/* Faculty Details */}
          <SectionLabel icon="user" label="Faculty Details" C={C} />

          <FieldLabel label="TEACHER NAME" C={C} autofill onAutofill={() => setFacultyModal(true)} />
          <TextInput style={inputStyle} value={teacherName} onChangeText={setTeacherName}
            placeholder={t.coverpage2.teacherPlaceholder} placeholderTextColor={C.textMuted} />

          <FieldLabel label={t.coverpage2.department} C={C} />
          <TextInput style={inputStyle} value={department} onChangeText={setDepartment}
            placeholder={t.coverpage2.departmentPlaceholder} placeholderTextColor={C.textMuted} />

          <FieldLabel label="DESIGNATION" C={C} />
          <TextInput style={inputStyle} value={teacherDesig} onChangeText={setTeacherDesig}
            placeholder="e.g. Associate Professor" placeholderTextColor={C.textMuted} />

          {/* Dates & Signature */}
          <SectionLabel icon="calendar" label="Dates &amp; Signature" C={C} />

          <FieldLabel label={t.coverpage2.dateOfSubmission} C={C} />
          <TextInput style={inputStyle} value={dateOfSubmission} onChangeText={setDateOfSubmission}
            placeholder={t.coverpage2.datePlaceholder} placeholderTextColor={C.textMuted} />

          <TouchableOpacity
            style={[styles.switchRow, { borderColor: C.border }]}
            onPress={() => setShowSignature(!showSignature)}
            activeOpacity={0.7}
          >
            <Text style={[styles.switchLabel, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
              Include Teacher's Signature
            </Text>
            <View style={[styles.toggle, {
              backgroundColor: showSignature ? SectorColors.coverpage : C.surface3,
            }]}>
              <View style={[styles.toggleKnob, {
                backgroundColor: C.white,
                transform: [{ translateX: showSignature ? 18 : 2 }],
              }]} />
            </View>
          </TouchableOpacity>

          {/* Generate button */}
          <TouchableOpacity
            style={[styles.genBtn, { backgroundColor: SectorColors.coverpage, opacity: !canGenerate || generating ? 0.5 : 1 }]}
            onPress={handleGenerate}
            disabled={!canGenerate || generating}
          >
            {generating ? (
              <ActivityIndicator color={C.white} size="small" />
            ) : (
              <Icon name="fileText" size={20} color={C.white} />
            )}
            <Text style={[styles.genBtnText, { color: C.white, fontFamily: FontFamily.jakartaBold }]}>
              {generating ? t.coverpage2.generating : t.coverpage2.generatePdf}
            </Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Faculty picker modal */}
      <Modal visible={facultyModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: C.surface }]}>
            <View style={styles.modalHandle}>
              <View style={[styles.handle, { backgroundColor: C.border }]} />
            </View>
            <Text style={[styles.modalTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              Select Teacher
            </Text>
            <View style={[styles.searchBar, { backgroundColor: C.surface2, borderColor: C.border }]}>
              <Icon name="search" size={16} color={C.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: C.text, fontFamily: FontFamily.jakartaRegular }]}
                value={facultySearch} onChangeText={setFacultySearch}
                placeholder="Search teacher name..." placeholderTextColor={C.textMuted}
                autoFocus
              />
            </View>
            <FlatList
              data={filteredFaculty}
              keyExtractor={i => i.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.facultyRow, { borderBottomColor: C.border }]}
                  onPress={() => selectTeacher(item)}
                  activeOpacity={0.7}
                >
                  <Avatar uri={item.photo_url} name={item.name} size="sm" />
                  <View style={{ flex: 1, marginLeft: Spacing[3] }}>
                    <Text style={[styles.facultyName, { color: C.text, fontFamily: FontFamily.jakartaSemiBold }]}
                      numberOfLines={1}>{item.name}</Text>
                    <Text style={[styles.facultyMeta, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}
                      numberOfLines={1}>
                      {(item.dept_name ?? '').replace(/^Department of\s*/i, '')}
                      {item.designation ? ` · ${item.designation}` : ''}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={[styles.emptyText, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                  No teachers found
                </Text>
              }
              style={{ maxHeight: 400 }}
            />
            <TouchableOpacity style={[styles.closeBtn, { borderColor: C.border }]}
              onPress={() => { setFacultyModal(false); setFacultySearch(''); }}>
              <Text style={[styles.closeBtnText, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {t.common.close}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Program picker modal */}
      <Modal visible={deptModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: C.surface }]}>
            <View style={styles.modalHandle}>
              <View style={[styles.handle, { backgroundColor: C.border }]} />
            </View>
            <Text style={[styles.modalTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              Select Program
            </Text>
            <FlatList
              data={departments}
              keyExtractor={i => i.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.deptRow, { borderBottomColor: C.border }]}
                  onPress={() => selectProgram(item)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.deptText, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}>
                    {item.name.replace(/^Department of\s*/i, '')}
                  </Text>
                </TouchableOpacity>
              )}
              style={{ maxHeight: 400 }}
            />
            <TouchableOpacity style={[styles.closeBtn, { borderColor: C.border }]}
              onPress={() => setDeptModal(false)}>
              <Text style={[styles.closeBtnText, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {t.common.close}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Course picker modal */}
      <Modal visible={courseModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: C.surface }]}>
            <View style={styles.modalHandle}>
              <View style={[styles.handle, { backgroundColor: C.border }]} />
            </View>
            <Text style={[styles.modalTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              Select Course
            </Text>
            <View style={[styles.searchBar, { backgroundColor: C.surface2, borderColor: C.border }]}>
              <Icon name="search" size={16} color={C.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: C.text, fontFamily: FontFamily.jakartaRegular }]}
                value={courseSearch} onChangeText={setCourseSearch}
                placeholder="Search course code or title..." placeholderTextColor={C.textMuted}
                autoFocus
              />
            </View>
            <FlatList
              data={filteredCourses}
              keyExtractor={i => i.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.facultyRow, { borderBottomColor: C.border }]}
                  onPress={() => selectCourse(item)}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.facultyName, { color: SectorColors.coverpage, fontFamily: FontFamily.jakartaBold }]}>
                      {item.code}
                    </Text>
                    <Text style={[styles.facultyMeta, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}
                      numberOfLines={1}>{item.name}</Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={[styles.emptyText, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                  No courses found
                </Text>
              }
              style={{ maxHeight: 400 }}
            />
            <TouchableOpacity style={[styles.closeBtn, { borderColor: C.border }]}
              onPress={() => { setCourseModal(false); setCourseSearch(''); }}>
              <Text style={[styles.closeBtnText, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                {t.common.close}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function MiniCoverPreview({ template, C, isDark }: { template: TemplateStyle; C: any; isDark: boolean }) {
  const pageBg = isDark ? '#1e2433' : '#fff';
  const borderC = isDark ? '#3a4460' : '#888';
  const textC = isDark ? '#b0b8cc' : '#333';
  const lightC = isDark ? '#6a7490' : '#999';
  const accentC = template === 'classic' ? '#1a3a6b' : template === 'modern' ? '#2a2a2a' : '#333';
  const tagBg = template === 'classic' ? '#1a3a6b' : template === 'modern' ? '#2a2a2a' : 'transparent';
  const tagBorder = template === 'default' ? borderC : 'transparent';
  const tagText = tagBg !== 'transparent' ? '#fff' : textC;

  return (
    <View style={[pvStyles.page, { backgroundColor: pageBg, borderColor: borderC }]}>
      {template === 'classic' ? (
        <Text style={[pvStyles.uniSmall, { color: accentC, fontWeight: 'bold' }]}>BUBT</Text>
      ) : (
        <Text style={[pvStyles.uni, { color: textC }]} numberOfLines={1}>
          Bangladesh University of{'\n'}Business and Technology
        </Text>
      )}
      <View style={[pvStyles.tag, { backgroundColor: tagBg, borderColor: tagBorder, borderWidth: tagBg === 'transparent' ? 1 : 0 }]}>
        <Text style={[pvStyles.tagText, { color: tagText }]}>ASSIGNMENT</Text>
      </View>
      <View style={{ alignItems: 'flex-start', width: '100%', marginTop: 4 }}>
        <View style={[pvStyles.line, { backgroundColor: lightC, width: '55%' }]} />
        <View style={[pvStyles.line, { backgroundColor: lightC, width: '50%' }]} />
        <View style={[pvStyles.line, { backgroundColor: lightC, width: '45%' }]} />
      </View>
      <View style={pvStyles.boxes}>
        <View style={[pvStyles.box, { borderColor: borderC }]}>
          <View style={[pvStyles.boxLine, { backgroundColor: textC, width: '60%' }]} />
          <View style={[pvStyles.boxLine, { backgroundColor: lightC, width: '50%' }]} />
          <View style={[pvStyles.boxLine, { backgroundColor: lightC, width: '40%' }]} />
          <View style={[pvStyles.boxLine, { backgroundColor: lightC, width: '45%' }]} />
        </View>
        <View style={[pvStyles.box, { borderColor: borderC }]}>
          <View style={[pvStyles.boxLine, { backgroundColor: textC, width: '60%' }]} />
          <View style={[pvStyles.boxLine, { backgroundColor: lightC, width: '50%' }]} />
          <View style={[pvStyles.boxLine, { backgroundColor: lightC, width: '55%' }]} />
        </View>
      </View>
      <View style={[pvStyles.line, { backgroundColor: lightC, width: '60%', marginTop: 3 }]} />
    </View>
  );
}

const pvStyles = StyleSheet.create({
  page: { height: 140, borderWidth: 1.5, borderRadius: 4, padding: 8, alignItems: 'center', justifyContent: 'space-between' },
  uni: { fontSize: 5.5, textAlign: 'center', fontStyle: 'italic', lineHeight: 7 },
  uniSmall: { fontSize: 8, letterSpacing: 1 },
  tag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 1.5, marginTop: 3 },
  tagText: { fontSize: 5, fontWeight: 'bold', letterSpacing: 0.5 },
  line: { height: 2, borderRadius: 1, marginTop: 2 },
  boxes: { flexDirection: 'row', gap: 3, width: '100%', marginTop: 4 },
  box: { flex: 1, borderWidth: 0.8, borderRadius: 2, padding: 3 },
  boxLine: { height: 1.5, borderRadius: 1, marginTop: 1.5 },
});

function SectionLabel({ icon, label, C }: { icon: string; label: string; C: any }) {
  return (
    <View style={[secStyles.header, { borderBottomColor: C.border }]}>
      <View style={[secStyles.dot, { backgroundColor: SectorColors.coverpage }]} />
      <Text style={[secStyles.title, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>{label}</Text>
    </View>
  );
}

function FieldLabel({ label, C, autofill, onAutofill }: { label: string; C: any; autofill?: boolean; onAutofill?: () => void }) {
  return (
    <View style={secStyles.fieldRow}>
      <Text style={[secStyles.fieldLabel, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>{label}</Text>
      {autofill && (
        <TouchableOpacity style={[secStyles.autofillBtn, { backgroundColor: Accent.tealBg }]} onPress={onAutofill}>
          <Icon name="sparkle" size={12} color={Accent.teal} />
          <Text style={[secStyles.autofillText, { color: Accent.teal, fontFamily: FontFamily.jakartaBold }]}>Autofill</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const secStyles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2], marginTop: Spacing[5], paddingBottom: Spacing[2], borderBottomWidth: StyleSheet.hairlineWidth },
  dot: { width: 4, height: 18, borderRadius: 2 },
  title: { fontSize: FontSize.md },
  fieldRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing[3], marginBottom: Spacing[1] },
  fieldLabel: { fontSize: FontSize.xs, letterSpacing: 0.5 },
  autofillBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  autofillText: { fontSize: 11 },
});

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: 20, paddingTop: Spacing[2] },
  input: { height: Layout.inputHeight, borderRadius: Radius.sm, borderWidth: 1, paddingHorizontal: Spacing[3], fontSize: FontSize.base },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[2], marginBottom: Spacing[2] },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing[4], paddingVertical: Spacing[2], borderRadius: Radius.full, borderWidth: 1.5 },
  typeChipText: { fontSize: FontSize.sm },
  halfRow: { flexDirection: 'row', gap: Spacing[3] },
  templateCard: { width: 110, borderRadius: Radius.md, marginRight: Spacing[3], overflow: 'hidden' },
  templatePreview: { overflow: 'hidden' },
  checkBadge: { position: 'absolute', top: 6, left: 6, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  templateLabel: { textAlign: 'center', fontSize: FontSize.xs, paddingVertical: Spacing[2] },
  pickerBtn: { flexDirection: 'row', alignItems: 'center', height: Layout.inputHeight, borderRadius: Radius.sm, borderWidth: 1, paddingHorizontal: Spacing[3], gap: Spacing[2] },
  pickerText: { flex: 1, fontSize: FontSize.base },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing[3], marginTop: Spacing[2] },
  switchLabel: { fontSize: FontSize.base },
  toggle: { width: 44, height: 24, borderRadius: 12, justifyContent: 'center' },
  toggleKnob: { width: 20, height: 20, borderRadius: 10 },
  genBtn: { flexDirection: 'row', height: 52, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', gap: Spacing[2], marginTop: Spacing[6] },
  genBtnText: { fontSize: FontSize.lg },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: Layout.screenPadding, paddingBottom: Layout.screenPadding, maxHeight: '80%' },
  modalHandle: { alignItems: 'center', paddingVertical: Spacing[3] },
  handle: { width: 36, height: 4, borderRadius: 2 },
  modalTitle: { fontSize: FontSize['2xl'], textAlign: 'center', marginBottom: Spacing[3] },
  searchBar: { flexDirection: 'row', alignItems: 'center', height: 42, borderRadius: Radius.sm, borderWidth: 1, paddingHorizontal: Spacing[3], gap: Spacing[2], marginBottom: Spacing[3] },
  searchInput: { flex: 1, fontSize: FontSize.base, padding: 0 },
  facultyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing[3], borderBottomWidth: StyleSheet.hairlineWidth },
  facultyName: { fontSize: FontSize.md },
  facultyMeta: { fontSize: FontSize.xs, marginTop: 2 },
  deptRow: { paddingVertical: Spacing[3], borderBottomWidth: StyleSheet.hairlineWidth },
  deptText: { fontSize: FontSize.md },
  emptyText: { textAlign: 'center', marginTop: Spacing[6], fontSize: FontSize.base },
  closeBtn: { height: 44, borderRadius: Radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: Spacing[3] },
  closeBtnText: { fontSize: FontSize.base },
});
