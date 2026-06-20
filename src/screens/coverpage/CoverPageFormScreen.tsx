import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert,
  TextInput, Platform, KeyboardAvoidingView, ActivityIndicator,
  Modal, FlatList, Switch,
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
import { BUBT_LOGO_CREST, BUBT_LOGO_HEADER } from './logos';

type DocType = 'assignment' | 'lab_report' | 'project_report';
type TemplateStyle = 'default' | 'classic' | 'premium' | 'minimal' | 'modern';

const DOC_TYPES: DocType[] = ['assignment', 'lab_report', 'project_report'];
const TEMPLATES: TemplateStyle[] = ['default', 'classic', 'premium', 'minimal', 'modern'];
const TEMPLATE_LABELS: Record<TemplateStyle, string> = {
  default: 'Default Style', classic: 'Classic Style', premium: 'Premium Style',
  minimal: 'Minimal Style', modern: 'Modern Style',
};

interface FacultyRow {
  id: string; name: string; designation: string;
  department_id: string; photo_url: string | null; dept_name?: string;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── PDF HTML Templates ────────────────────────────────────────────
function buildHtml(f: {
  template: TemplateStyle; docTypeLabel: string; university: string;
  department: string; courseCode: string; courseTitle: string;
  assignmentNo: string; experiment: string; showTopic: boolean;
  studentName: string; studentId: string; intake: string;
  section: string; showSection: boolean; program: string;
  teacherName: string; teacherDesig: string; teacherDept: string;
  dateOfSubmission: string; showSignature: boolean; docType: DocType;
  logoCrest: string; logoHeader: string;
}): string {
  const e = esc;
  const isLab = f.docType === 'lab_report';
  const noLabel = isLab ? 'Experiment No' : 'Assignment No';
  const uni = 'Bangladesh University of Business and Technology';

  const css = `@page{size:A4;margin:0}
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Times New Roman',Times,serif;width:210mm;min-height:297mm;padding:20mm;
         background:#fff;color:#1a1a1a;display:flex;flex-direction:column;}
    h1{text-align:center;font-size:22px;margin:5px 0;}
    h2{text-align:center;font-size:18px;margin:5px 0;}
    .logo{width:200px;height:200px;margin:10px auto 15px;display:flex;justify-content:center;align-items:center;}
    .logo img{max-width:100%;max-height:100%;}
    .hdr-logo{margin:0 auto 5px;display:block;width:380px;height:auto;}
    .ci{text-align:center;margin:5px 0;}
    .ci p{margin:3px 0;font-size:14px;}
    .doc-label{text-align:center;margin:15px 0 20px;font-size:18px;font-weight:bold;}
    .tbl{width:100%;border-collapse:collapse;margin-top:25px;margin-bottom:auto;}
    .tbl th,.tbl td{border:1px solid #000;padding:10px;width:50%;vertical-align:top;text-align:left;}
    .tbl th{background:#f2f2f2;text-align:center;font-size:14px;}
    .tbl td p{margin:0 0 5px 0;font-size:13px;line-height:1.6;}
    .dt{text-align:center;font-size:14px;font-weight:bold;margin-top:auto;padding-top:20px;}
    .sg{text-align:right;margin-top:15px;}
    .sl{display:inline-block;text-align:center;width:150px;border-top:1px solid #333;padding-top:5px;font-size:11px;font-weight:normal;}`;

  const crest = `<div class="logo"><img src="${f.logoCrest}" /></div>`;
  const hdrLogo = `<img src="${f.logoHeader}" class="hdr-logo" />`;
  const docUp = e(f.docTypeLabel).toUpperCase();
  const dept = e(f.teacherDept || f.department);

  const courseBlock = `<div class="ci">
      <p><strong>${noLabel} :</strong> ${e(f.assignmentNo) || ''}</p>
      <p><strong>Course Code :</strong> ${e(f.courseCode)}</p>
      <p><strong>Course Title :</strong> ${e(f.courseTitle)}</p>
      ${f.showTopic && f.experiment ? `<p><strong>${isLab ? 'Experiment / Topic' : 'Topic'} :</strong> ${e(f.experiment)}</p>` : ''}
    </div>`;

  const tbl = `<table class="tbl"><tr>
      <th>Submitted By</th><th>Submitted To</th>
    </tr><tr>
      <td>
        <p><strong>Name :</strong> ${e(f.studentName)}</p>
        <p><strong>ID No :</strong> ${e(f.studentId)}</p>
        <p><strong>Intake :</strong> ${e(f.intake)}</p>
        ${f.showSection ? `<p><strong>Section :</strong> ${e(f.section)}</p>` : ''}
        <p><strong>Program :</strong> ${e(f.program)}</p>
      </td>
      <td>
        <p>${e(f.teacherName)}</p>
        ${f.teacherDesig ? `<p>${e(f.teacherDesig)}</p>` : ''}
        <p style="margin-top:8px;">Department of ${dept}</p>
        <p style="font-size:12px;">${e(uni)}</p>
      </td>
    </tr></table>`;

  const date = `<p class="dt">Date of Submission : ${e(f.dateOfSubmission)}</p>`;
  const sig = f.showSignature ? `<div class="sg"><div class="sl">Teacher's Signature</div></div>` : '';
  const bottom = `${date}${sig}`;

  const page = (header: string, extra = '') =>
    `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${css}${extra}</style></head><body>
${header}${courseBlock}${tbl}${bottom}</body></html>`;

  if (f.template === 'classic') {
    return page(`${hdrLogo}
      <p style="text-align:center;font-size:10px;font-style:italic;color:#555;margin-bottom:10px;">Committed to Academic Excellence</p>
      <h2 style="margin:15px 0 20px;">${docUp}</h2>`);
  }

  if (f.template === 'premium') {
    return page(`${hdrLogo}
      <p style="text-align:center;font-size:10px;font-style:italic;color:#555;margin-bottom:10px;">Committed to Academic Excellence</p>
      <div class="doc-label" style="display:inline-block;border:2px dashed #1a3a6b;padding:8px 30px;margin:15px auto 20px;color:#1a3a6b;">${docUp}</div>`,
      '.tbl th,.tbl td{border-style:dashed;border-color:#1a3a6b;}');
  }

  if (f.template === 'minimal') {
    return page(`<h1 style="font-style:italic;margin-bottom:5px;">${e(uni)}</h1>
      ${crest}
      <h2 style="text-decoration:underline;margin:10px 0 20px;">${docUp}</h2>`,
      '.tbl th{background:none;}');
  }

  if (f.template === 'modern') {
    return page(`<h1 style="margin-bottom:5px;">${e(uni)}</h1>
      ${crest}
      <p style="text-align:center;font-size:13px;color:#555;margin-bottom:10px;">Department of ${dept}</p>
      <div style="text-align:center;margin:10px 0 20px;"><span style="background:#2a2a2a;color:#fff;padding:8px 25px;font-size:15px;font-weight:bold;letter-spacing:2px;border-radius:3px;">${docUp}</span></div>`,
      'body{font-family:Georgia,serif;} .tbl th,.tbl td{border-color:#444;}');
  }

  // Default — matches real BUBT cover page from Scribd/APK
  return page(`<h1 style="font-style:italic;margin-bottom:5px;">${e(uni)}</h1>
    ${crest}
    <div class="doc-label"><span style="border:2px solid #333;padding:8px 25px;">${docUp}</span></div>`);
}

// ─── Main Screen ───────────────────────────────────────────────────
export function CoverPageFormScreen({ navigation }: any) {
  const { C, isDark } = useTheme();
  const { profile } = useAuth();
  const t = useT();

  const [docType, setDocType] = useState<DocType>('assignment');
  const [template, setTemplate] = useState<TemplateStyle>('default');
  const [courseCode, setCourseCode] = useState('');
  const [courseTitle, setCourseTitle] = useState('');
  const [assignmentNo, setAssignmentNo] = useState('');
  const [experiment, setExperiment] = useState('');
  const [showTopic, setShowTopic] = useState(false);
  const [studentName, setStudentName] = useState(profile?.full_name ?? '');
  const [studentId, setStudentId] = useState('');
  const [department, setDepartment] = useState(profile?.department ?? '');
  const [intake, setIntake] = useState(profile?.intake ?? '');
  const [section, setSection] = useState(profile?.section ?? '');
  const [showSection, setShowSection] = useState(true);
  const [program, setProgram] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [teacherDesig, setTeacherDesig] = useState('');
  const [teacherDept, setTeacherDept] = useState('');
  const [dateOfSubmission, setDateOfSubmission] = useState(new Date().toISOString().slice(0, 10));
  const [showSignature, setShowSignature] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [facultyList, setFacultyList] = useState<FacultyRow[]>([]);
  const [facultyModal, setFacultyModal] = useState(false);
  const [facultySearch, setFacultySearch] = useState('');
  const [courseList, setCourseList] = useState<{ code: string; name: string }[]>([]);
  const [courseModal, setCourseModal] = useState(false);
  const [courseSearch, setCourseSearch] = useState('');
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [deptModal, setDeptModal] = useState(false);

  useEffect(() => {
    (async () => {
      const [fR, dR, cR] = await Promise.all([
        supabase.from('faculty').select('id, name, designation, department_id, photo_url').eq('on_leave', false).order('name'),
        supabase.from('departments').select('id, name').order('name'),
        supabase.from('courses').select('code, name').order('code'),
      ]);
      const depts = (dR.data ?? []) as { id: string; name: string }[];
      setDepartments(depts);
      setCourseList((cR.data ?? []) as { code: string; name: string }[]);
      const dm = new Map(depts.map(d => [d.id, d.name]));
      setFacultyList(((fR.data ?? []) as FacultyRow[]).map(f => ({ ...f, dept_name: dm.get(f.department_id) ?? '' })));
    })();
  }, []);

  const docTypeLabel = (dt: DocType) => ({
    assignment: t.coverpage2.typeAssignment,
    lab_report: t.coverpage2.typeLabReport,
    project_report: t.coverpage2.typeProjectReport,
  }[dt]);

  const canGenerate = studentName.trim() && studentId.trim() && courseTitle.trim() && courseCode.trim();

  function selectCourse(c: { code: string; name: string }) {
    setCourseCode(c.code); setCourseTitle(c.name);
    setCourseModal(false); setCourseSearch('');
  }

  function selectTeacher(f: FacultyRow) {
    setTeacherName(f.name); setTeacherDesig(f.designation);
    const dn = (f.dept_name ?? '').replace(/^Department of\s*/i, '');
    if (dn) setTeacherDept(dn);
    if (dn && !department) setDepartment(dn);
    setFacultyModal(false); setFacultySearch('');
  }

  function selectProgram(d: { id: string; name: string }) {
    const s = d.name.replace(/^Department of\s*/i, '');
    setProgram(s); if (!department) setDepartment(s);
    setDeptModal(false);
  }

  const filteredFaculty = facultySearch
    ? facultyList.filter(f => f.name.toLowerCase().includes(facultySearch.toLowerCase()) || (f.dept_name ?? '').toLowerCase().includes(facultySearch.toLowerCase()))
    : facultyList;

  const filteredCourses = courseSearch
    ? courseList.filter(c => c.code.toLowerCase().includes(courseSearch.toLowerCase()) || c.name.toLowerCase().includes(courseSearch.toLowerCase()))
    : courseList;

  async function handleGenerate() {
    if (!canGenerate) return;
    setGenerating(true);
    try {
      const html = buildHtml({
        template, docType, docTypeLabel: docTypeLabel(docType),
        university: t.coverpage2.universityName,
        department: department.trim() || 'N/A',
        courseCode: courseCode.trim(), courseTitle: courseTitle.trim(),
        assignmentNo: assignmentNo.trim(), experiment: experiment.trim(), showTopic,
        studentName: studentName.trim(), studentId: studentId.trim(),
        intake: intake.trim() || 'N/A', section: section.trim() || 'N/A', showSection,
        program: program.trim() || department.trim() || 'N/A',
        teacherName: teacherName.trim() || 'N/A', teacherDesig: teacherDesig.trim(),
        teacherDept: teacherDept.trim(), dateOfSubmission: dateOfSubmission.trim() || 'N/A',
        showSignature, logoCrest: BUBT_LOGO_CREST, logoHeader: BUBT_LOGO_HEADER,
      });
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: t.coverpage2.shareOrSave, UTI: 'com.adobe.pdf' });
      } else { Alert.alert(t.coverpage2.preview, uri); }
    } catch { Alert.alert(t.common.error, t.coverpage2.generationFailed); }
    finally { setGenerating(false); }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title={t.coverpage2.title} onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]} showsVerticalScrollIndicator={false}>

          {/* Doc type tabs */}
          <View style={styles.typeRow}>
            {DOC_TYPES.map(dt => {
              const a = docType === dt;
              return (
                <TouchableOpacity key={dt} style={[styles.typeChip, { borderColor: a ? SectorColors.coverpage : C.border, backgroundColor: a ? SectorColors.coverpage : C.surface2 }]} onPress={() => setDocType(dt)}>
                  <Icon name={dt === 'lab_report' ? 'layers' : 'fileText'} size={14} color={a ? C.white : C.text2} />
                  <Text style={[styles.typeChipText, { color: a ? C.white : C.text2, fontFamily: a ? FontFamily.jakartaBold : FontFamily.jakartaMedium }]}>{docTypeLabel(dt)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Template selection */}
          <Sec icon="grid" label="Select Template" C={C} count={TEMPLATES.length} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing[3] }}>
            {TEMPLATES.map(tmpl => {
              const a = template === tmpl;
              return (
                <TouchableOpacity key={tmpl} style={[styles.tCard, { borderColor: a ? SectorColors.coverpage : C.border, borderWidth: a ? 2.5 : 1, backgroundColor: C.surface }]} onPress={() => setTemplate(tmpl)} activeOpacity={0.8}>
                  <MiniPage tmpl={tmpl} C={C} isDark={isDark} />
                  {a && <View style={[styles.chk, { backgroundColor: SectorColors.coverpage }]}><Icon name="check" size={12} color={C.white} /></View>}
                  <View style={[styles.freeBadge, { backgroundColor: Accent.teal }]}><Text style={styles.freeTxt}>FREE</Text></View>
                  <Text style={[styles.tLabel, { color: a ? SectorColors.coverpage : C.text2, fontFamily: a ? FontFamily.jakartaBold : FontFamily.jakartaMedium }]}>{TEMPLATE_LABELS[tmpl]}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Course Details */}
          <Sec icon="box" label="Course Details" C={C} />
          <IconField icon="chevR" C={C} value={courseCode} onChange={setCourseCode} placeholder="Course Code"
            badge="Autofill" onBadge={() => setCourseModal(true)} badgeIcon="chevD" />
          <IconField icon="sparkle" C={C} value={courseTitle} onChange={setCourseTitle} placeholder="Course Title" />

          {/* Assignment Details */}
          <Sec icon={docType === 'lab_report' ? 'layers' : 'fileText'} label={docType === 'lab_report' ? 'Lab Report Details' : 'Assignment Details'} C={C} />
          <IconField icon="flag" C={C} value={assignmentNo} onChange={setAssignmentNo}
            placeholder={docType === 'lab_report' ? 'Experiment No' : 'Assignment No'} />
          {(docType === 'lab_report' || showTopic) && (
            <IconField icon="layers" C={C} value={experiment} onChange={setExperiment} placeholder="Topic (optional)" />
          )}

          {/* Student Information */}
          <Sec icon="user" label="Student Information" C={C} />
          <IconField icon="user" C={C} value={studentName} onChange={setStudentName} placeholder="Student Name" />
          <IconField icon="idcard" C={C} value={studentId} onChange={setStudentId} placeholder="Student ID" />
          <View style={hStyles.row}>
            <View style={{ flex: 1 }}>
              <IconField icon="inbox" C={C} value={intake} onChange={setIntake} placeholder="Intake" />
            </View>
            <View style={{ flex: 1 }}>
              <IconField icon="grid" C={C} value={section} onChange={setSection} placeholder="Section" />
            </View>
          </View>
          <IconField icon="award" C={C} value={program} placeholder="Program" onPress={() => setDeptModal(true)} chevron />

          {/* Faculty Details */}
          <Sec icon="user" label="Faculty Details" C={C} />
          <IconField icon="user" C={C} value={teacherName} onChange={setTeacherName} placeholder="Teacher Name"
            badge="Autofill" onBadge={() => setFacultyModal(true)} badgeIcon="chevD" />
          <IconField icon="grid" C={C} value={teacherDept || department} onChange={setTeacherDept} placeholder="Department" />
          <IconField icon="award" C={C} value={teacherDesig} onChange={setTeacherDesig} placeholder="Designation" chevron />

          {/* Dates & Signature */}
          <Sec icon="calendar" label="Dates &amp; Signature" C={C} />
          <IconField icon="calendar" C={C} value={dateOfSubmission} onChange={setDateOfSubmission} placeholder="Date of Submission" />
          <View style={styles.switchRow}>
            <Text style={[styles.switchLabel, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>Include Teacher's Signature</Text>
            <Switch value={showSignature} onValueChange={setShowSignature} trackColor={{ false: C.surface3, true: SectorColors.coverpage + '66' }} thumbColor={showSignature ? SectorColors.coverpage : C.white} />
          </View>

          {/* Generate */}
          <TouchableOpacity style={[styles.genBtn, { backgroundColor: SectorColors.coverpage, opacity: !canGenerate || generating ? 0.5 : 1 }]} onPress={handleGenerate} disabled={!canGenerate || generating}>
            {generating ? <ActivityIndicator color={C.white} size="small" /> : <Icon name="sparkles" size={20} color={C.white} />}
            <Text style={[styles.genBtnText, { color: C.white, fontFamily: FontFamily.jakartaBold }]}>{generating ? t.coverpage2.generating : 'Generate Document'}</Text>
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Course picker */}
      <BottomSheet visible={courseModal} onClose={() => { setCourseModal(false); setCourseSearch(''); }} title="Select Course" C={C}>
        <View style={[styles.sBar, { backgroundColor: C.surface2, borderColor: C.border }]}>
          <Icon name="search" size={16} color={C.textMuted} />
          <TextInput style={[styles.sInput, { color: C.text, fontFamily: FontFamily.jakartaRegular }]} value={courseSearch} onChangeText={setCourseSearch} placeholder="Search course code or title..." placeholderTextColor={C.textMuted} autoFocus />
        </View>
        <FlatList data={filteredCourses} keyExtractor={i => i.code} style={{ maxHeight: 380 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={[styles.listRow, { borderBottomColor: C.border }]} onPress={() => selectCourse(item)} activeOpacity={0.7}>
              <Text style={[styles.courseCode, { color: SectorColors.coverpage, fontFamily: FontFamily.jakartaBold }]}>{item.code}</Text>
              <Text style={[styles.courseName, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>{item.name}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={[styles.empty, { color: C.textMuted }]}>No courses found</Text>}
        />
      </BottomSheet>

      {/* Faculty picker */}
      <BottomSheet visible={facultyModal} onClose={() => { setFacultyModal(false); setFacultySearch(''); }} title="Select Teacher" C={C}>
        <View style={[styles.sBar, { backgroundColor: C.surface2, borderColor: C.border }]}>
          <Icon name="search" size={16} color={C.textMuted} />
          <TextInput style={[styles.sInput, { color: C.text, fontFamily: FontFamily.jakartaRegular }]} value={facultySearch} onChangeText={setFacultySearch} placeholder="Search teacher name..." placeholderTextColor={C.textMuted} autoFocus />
        </View>
        <FlatList data={filteredFaculty} keyExtractor={i => i.id} style={{ maxHeight: 380 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={[styles.listRow, { borderBottomColor: C.border }]} onPress={() => selectTeacher(item)} activeOpacity={0.7}>
              <Avatar uri={item.photo_url} name={item.name} size="sm" />
              <View style={{ flex: 1, marginLeft: Spacing[3] }}>
                <Text style={[styles.fName, { color: C.text, fontFamily: FontFamily.jakartaSemiBold }]} numberOfLines={1}>{item.name}</Text>
                <Text style={[styles.fMeta, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>{(item.dept_name ?? '').replace(/^Department of\s*/i, '')}{item.designation ? ` · ${item.designation}` : ''}</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={[styles.empty, { color: C.textMuted }]}>No teachers found</Text>}
        />
      </BottomSheet>

      {/* Program picker */}
      <BottomSheet visible={deptModal} onClose={() => setDeptModal(false)} title="Select Program" C={C}>
        <FlatList data={departments} keyExtractor={i => i.id} style={{ maxHeight: 380 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={[styles.listRow, { borderBottomColor: C.border }]} onPress={() => selectProgram(item)} activeOpacity={0.7}>
              <Text style={[styles.deptText, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}>{item.name.replace(/^Department of\s*/i, '')}</Text>
            </TouchableOpacity>
          )}
        />
      </BottomSheet>
    </SafeAreaView>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────
function BottomSheet({ visible, onClose, title, C, children }: { visible: boolean; onClose: () => void; title: string; C: any; children: React.ReactNode }) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: C.surface }]}>
          <View style={styles.handle}><View style={[styles.handleBar, { backgroundColor: C.border }]} /></View>
          <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>{title}</Text>
          {children}
          <TouchableOpacity style={[styles.closeBtn, { borderColor: C.border }]} onPress={onClose}>
            <Text style={[styles.closeTxt, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function IconField({ icon, C, value, onChange, placeholder, badge, onBadge, badgeIcon, chevron, onPress }: {
  icon: string; C: any; value: string; onChange?: (v: string) => void;
  placeholder: string; badge?: string; onBadge?: () => void; badgeIcon?: string;
  chevron?: boolean; onPress?: () => void;
}) {
  const content = (
    <View style={[ifStyles.wrap, { backgroundColor: C.surface, borderColor: C.border }]}>
      <Icon name={icon} size={18} color={C.textMuted} />
      {onChange && !onPress ? (
        <TextInput
          style={[ifStyles.input, { color: C.text, fontFamily: FontFamily.jakartaRegular }]}
          value={value} onChangeText={onChange}
          placeholder={placeholder} placeholderTextColor={C.textMuted}
        />
      ) : (
        <Text style={[ifStyles.input, { color: value ? C.text : C.textMuted, fontFamily: FontFamily.jakartaRegular, paddingVertical: 14 }]} numberOfLines={1}>
          {value || placeholder}
        </Text>
      )}
      {badge && (
        <TouchableOpacity style={[ifStyles.badge, { backgroundColor: Accent.tealBg }]} onPress={onBadge}>
          <Icon name="sparkle" size={11} color={Accent.teal} />
          <Text style={[ifStyles.badgeTxt, { color: Accent.teal, fontFamily: FontFamily.jakartaBold }]}>{badge}</Text>
          {badgeIcon && <Icon name={badgeIcon} size={11} color={Accent.teal} />}
        </TouchableOpacity>
      )}
      {chevron && <Icon name="chevD" size={16} color={C.textMuted} />}
    </View>
  );
  if (onPress) return <TouchableOpacity onPress={onPress} activeOpacity={0.7}>{content}</TouchableOpacity>;
  return content;
}

const ifStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', height: 56, borderRadius: 14, borderWidth: 1.5, paddingHorizontal: Spacing[4], gap: Spacing[3], marginBottom: Spacing[3] },
  input: { flex: 1, fontSize: FontSize.base, padding: 0 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.full },
  badgeTxt: { fontSize: 11 },
});

function Sec({ icon, label, C, count }: { icon: string; label: string; C: any; count?: number }) {
  return (
    <View style={[hStyles.sec, { borderBottomColor: C.border }]}>
      <View style={[hStyles.dot, { backgroundColor: SectorColors.coverpage }]} />
      <Text style={[hStyles.secText, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>{label}</Text>
      {count !== undefined && (
        <View style={[hStyles.countBadge, { backgroundColor: SectorColors.coverpage }]}>
          <Text style={hStyles.countTxt}>{count}</Text>
        </View>
      )}
    </View>
  );
}

function MiniPage({ tmpl, C, isDark }: { tmpl: TemplateStyle; C: any; isDark: boolean }) {
  const bg = isDark ? '#1e2433' : '#fff';
  const bd = isDark ? '#3a4460' : '#888';
  const tx = isDark ? '#b0b8cc' : '#333';
  const lt = isDark ? '#6a7490' : '#999';
  const isClassic = tmpl === 'classic' || tmpl === 'premium';
  const accent = isClassic ? '#1a3a6b' : '#333';
  const dashed = tmpl === 'premium';

  return (
    <View style={[mpS.pg, { backgroundColor: bg, borderColor: bd, borderStyle: dashed ? 'dashed' : 'solid', borderRadius: tmpl === 'modern' ? 4 : 1 }]}>
      {isClassic ? (
        <Text style={[mpS.bold, { color: accent, fontSize: 8 }]}>BUBT</Text>
      ) : (
        <Text style={[mpS.it, { color: tx }]} numberOfLines={2}>Bangladesh University{'\n'}of Business and Technology</Text>
      )}
      <View style={[mpS.tag, { borderColor: bd, backgroundColor: tmpl === 'modern' ? '#2a2a2a' : 'transparent' }]}>
        <Text style={[mpS.tagT, { color: tmpl === 'modern' ? '#fff' : tx }]}>ASSIGNMENT</Text>
      </View>
      <View style={{ alignItems: 'flex-start', width: '100%', marginTop: 3 }}>
        <View style={[mpS.ln, { backgroundColor: lt, width: '55%' }]} />
        <View style={[mpS.ln, { backgroundColor: lt, width: '50%' }]} />
      </View>
      <View style={mpS.bxR}>
        <View style={[mpS.bx, { borderColor: bd, borderStyle: dashed ? 'dashed' : 'solid' }]}>
          <View style={[mpS.ln, { backgroundColor: tx, width: '60%' }]} />
          <View style={[mpS.ln, { backgroundColor: lt, width: '50%' }]} />
          <View style={[mpS.ln, { backgroundColor: lt, width: '40%' }]} />
        </View>
        <View style={[mpS.bx, { borderColor: bd, borderStyle: dashed ? 'dashed' : 'solid' }]}>
          <View style={[mpS.ln, { backgroundColor: tx, width: '60%' }]} />
          <View style={[mpS.ln, { backgroundColor: lt, width: '55%' }]} />
        </View>
      </View>
      <View style={[mpS.ln, { backgroundColor: lt, width: '60%', marginTop: 3 }]} />
    </View>
  );
}

const mpS = StyleSheet.create({
  pg: { height: 140, borderWidth: 1.5, padding: 8, alignItems: 'center', justifyContent: 'space-between' },
  bold: { fontWeight: 'bold', letterSpacing: 1 },
  it: { fontSize: 5.5, textAlign: 'center', fontStyle: 'italic', lineHeight: 7 },
  tag: { paddingHorizontal: 6, paddingVertical: 2, borderWidth: 0.8, borderRadius: 1.5, marginTop: 3 },
  tagT: { fontSize: 5, fontWeight: 'bold', letterSpacing: 0.5 },
  ln: { height: 2, borderRadius: 1, marginTop: 2 },
  bxR: { flexDirection: 'row', gap: 3, width: '100%', marginTop: 4 },
  bx: { flex: 1, borderWidth: 0.8, borderRadius: 2, padding: 3 },
});

const hStyles = StyleSheet.create({
  sec: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2], marginTop: Spacing[5], paddingBottom: Spacing[2], borderBottomWidth: StyleSheet.hairlineWidth },
  dot: { width: 4, height: 18, borderRadius: 2 },
  secText: { fontSize: FontSize.md, flex: 1 },
  countBadge: { width: 22, height: 22, borderRadius: 11, alignItems: 'center' as const, justifyContent: 'center' as const },
  countTxt: { color: '#fff', fontSize: 11, fontWeight: '700' as const },
  flRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing[3], marginBottom: Spacing[1] },
  flLabel: { fontSize: FontSize.xs, letterSpacing: 0.3 },
  flLink: { fontSize: 11 },
  toggleWrap: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  toggleLbl: { fontSize: 10 },
  row: { flexDirection: 'row', gap: Spacing[3] },
});

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: 20, paddingTop: Spacing[2] },
  input: { height: 56, borderRadius: 14, borderWidth: 1.5, paddingHorizontal: Spacing[4], fontSize: FontSize.base },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[2], marginBottom: Spacing[2] },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing[4], paddingVertical: Spacing[2], borderRadius: Radius.full, borderWidth: 1.5 },
  typeChipText: { fontSize: FontSize.sm },
  tCard: { width: 110, borderRadius: Radius.md, marginRight: Spacing[3], overflow: 'hidden' },
  chk: { position: 'absolute', top: 6, left: 6, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  freeBadge: { position: 'absolute', top: 6, right: 6, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  freeTxt: { color: '#fff', fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
  tLabel: { textAlign: 'center', fontSize: FontSize.xs, paddingVertical: Spacing[2] },
  picker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: Layout.inputHeight, borderRadius: Radius.sm, borderWidth: 1, paddingHorizontal: Spacing[3] },
  pickerText: { flex: 1, fontSize: FontSize.base },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing[2], marginTop: Spacing[1] },
  switchLabel: { fontSize: FontSize.base },
  genBtn: { flexDirection: 'row', height: 52, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', gap: Spacing[2], marginTop: Spacing[6] },
  genBtnText: { fontSize: FontSize.lg },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: Layout.screenPadding, paddingBottom: Layout.screenPadding, maxHeight: '80%' },
  handle: { alignItems: 'center', paddingVertical: Spacing[3] },
  handleBar: { width: 36, height: 4, borderRadius: 2 },
  sheetTitle: { fontSize: FontSize['2xl'], textAlign: 'center', marginBottom: Spacing[3] },
  sBar: { flexDirection: 'row', alignItems: 'center', height: 42, borderRadius: Radius.sm, borderWidth: 1, paddingHorizontal: Spacing[3], gap: Spacing[2], marginBottom: Spacing[3] },
  sInput: { flex: 1, fontSize: FontSize.base, padding: 0 },
  listRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing[3], borderBottomWidth: StyleSheet.hairlineWidth },
  courseCode: { fontSize: FontSize.md, width: 80 },
  courseName: { flex: 1, fontSize: FontSize.sm },
  fName: { fontSize: FontSize.md },
  fMeta: { fontSize: FontSize.xs, marginTop: 2 },
  deptText: { fontSize: FontSize.md },
  empty: { textAlign: 'center', marginTop: Spacing[6], fontSize: FontSize.base },
  closeBtn: { height: 44, borderRadius: Radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: Spacing[3] },
  closeTxt: { fontSize: FontSize.base },
});
