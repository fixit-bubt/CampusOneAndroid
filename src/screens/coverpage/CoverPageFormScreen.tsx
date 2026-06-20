import React, { useState, useEffect } from 'react';
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
import { BUBT_LOGO_CREST, BUBT_LOGO_HEADER } from './logos';

type DocType = 'assignment' | 'lab_report' | 'project_report' | 'index_page' | 'internship_report';
type TemplateStyle = 'default' | 'classic' | 'premium' | 'minimal' | 'modern';
type Member = { name: string; id: string };

const DOC_TYPES: DocType[] = ['assignment', 'lab_report', 'project_report', 'index_page', 'internship_report'];
const TEMPLATES: TemplateStyle[] = ['default', 'classic', 'premium', 'minimal', 'modern'];
const TEMPLATE_LABELS: Record<TemplateStyle, string> = {
  default: 'Default Style', classic: 'Classic Style', premium: 'Premium Style',
  minimal: 'Minimal Style', modern: 'Modern Style',
};
const DESIGNATIONS = [
  'Lecturer', 'Senior Lecturer', 'Assistant Professor', 'Assistant Professor & Chairman',
  'Associate Professor', 'Professor', 'Professor & Chairman', 'Professor & Dean',
];

const UNI = 'Bangladesh University of Business and Technology';
const SANS = 'Helvetica, Arial, sans-serif';
const SERIF = "'Times New Roman', Times, serif";

// Real rendered previews extracted from the BUBT Info source app.
const PREV: Record<string, any> = {
  assign_default: require('./previews/assign_default.jpg'),
  assign_classic: require('./previews/assign_classic.jpg'),
  assign_premium: require('./previews/assign_premium.jpg'),
  assign_minimal: require('./previews/assign_minimal.jpg'),
  assign_modern: require('./previews/assign_modern.jpg'),
  lab_default: require('./previews/lab_default.jpg'),
  lab_classic: require('./previews/lab_classic.jpg'),
  lab_premium: require('./previews/lab_premium.jpg'),
  lab_minimal: require('./previews/lab_minimal.jpg'),
  lab_modern: require('./previews/lab_modern.jpg'),
  project_default: require('./previews/project_default.jpg'),
  internship_default: require('./previews/internship_default.jpg'),
  pageindex_1: require('./previews/pageindex_1.jpg'),
};
const DOC_PREFIX: Record<DocType, string> = {
  assignment: 'assign', lab_report: 'lab', project_report: 'project',
  internship_report: 'internship', index_page: 'pageindex',
};
function previewFor(docType: DocType, tmpl: TemplateStyle): any {
  if (docType === 'index_page') return PREV.pageindex_1;
  if (docType === 'project_report' || docType === 'internship_report') return PREV[`${DOC_PREFIX[docType]}_default`];
  return PREV[`${DOC_PREFIX[docType]}_${tmpl}`];
}
const hasStyles = (d: DocType) => d === 'assignment' || d === 'lab_report';

interface FacultyRow {
  id: string; name: string; designation: string;
  department_id: string; photo_url: string | null; dept_name?: string;
}

function esc(s: string): string {
  return (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// YYYY-MM-DD -> MM/dd/yyyy (matches the BUBT Info app output).
function fmtDate(s: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((s ?? '').trim());
  return m ? `${m[2]}/${m[3]}/${m[1]}` : s;
}

// ─── PDF HTML Templates ────────────────────────────────────────────
interface HtmlData {
  template: TemplateStyle; docType: DocType; docTypeLabel: string;
  courseCode: string; courseTitle: string; assignmentNo: string;
  experimentDate: string; experimentName: string; reportTitle: string;
  studentName: string; studentId: string; intake: string; section: string;
  program: string; dept: string; teacherName: string; teacherDesig: string;
  members: Member[]; date: string; company: string; duration: string; indexRows: number;
  logoCrest: string; logoHeader: string;
}

interface StyleCfg {
  font: string; logo: 'crest' | 'header';
  label: 'box' | 'box-round' | 'underline' | 'underline-rule';
  round: boolean; title: boolean;
}

function styleCfg(t: TemplateStyle): StyleCfg {
  switch (t) {
    case 'classic': return { font: SANS, logo: 'header', label: 'box', round: false, title: false };
    case 'premium': return { font: SERIF, logo: 'header', label: 'underline', round: false, title: false };
    case 'minimal': return { font: SERIF, logo: 'crest', label: 'underline-rule', round: false, title: true };
    case 'modern': return { font: SERIF, logo: 'crest', label: 'box-round', round: true, title: true };
    default: return { font: SANS, logo: 'crest', label: 'box', round: false, title: true };
  }
}

const CSS = `@page{size:A4;margin:0}
*{margin:0;padding:0;box-sizing:border-box}
body{color:#000;width:210mm;min-height:297mm;padding:10mm;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
.page{border:1.5px solid #000;width:100%;min-height:277mm;padding:12mm 14mm;display:flex;flex-direction:column;}
.utitle{text-align:center;font-weight:bold;font-size:20px;margin:6px 0 12px;}
.crest{display:block;margin:6px auto 12px;width:150px;height:auto;}
.hdr{display:block;margin:4px auto 16px;width:150mm;max-width:100%;height:auto;}
.lblwrap{text-align:center;margin:6px 0 20px;}
.lblbox{display:inline-block;border:1.5px solid #000;padding:8px 28px;font-weight:bold;font-size:17px;letter-spacing:1px;}
.lblu{font-weight:bold;font-size:18px;text-decoration:underline;letter-spacing:1px;}
.rule{border-bottom:1.5px solid #000;width:62mm;margin:7px auto 0;}
.kv{margin:8px 0 0 8mm;}
.kv .row{font-weight:bold;font-size:15px;margin:6px 0;}
.kv .k{display:inline-block;min-width:128px;}
.boxes{display:flex;gap:10mm;margin-top:16mm;}
.box{flex:1;border:1.5px solid #000;border-radius:6px;padding:10px 14px;min-height:52mm;}
.box .bh{text-align:center;font-weight:bold;font-size:16px;margin-bottom:12px;}
.box .row{font-weight:bold;font-size:14px;margin:8px 0;}
.box .uni{font-weight:normal;font-size:12px;margin-top:4px;}
.box .desig{font-weight:normal;font-style:italic;font-size:12px;margin:2px 0 6px;}
.gap{height:12px;}
.date{text-align:center;font-weight:bold;font-size:15px;margin-top:auto;padding-top:16mm;}
.ptitle{text-align:center;font-weight:bold;font-size:17px;margin:12px 16mm;}
.cc{text-align:center;font-weight:bold;font-size:14px;margin:4px 0;}
.subh{text-align:center;font-weight:bold;font-size:15px;margin:16px 0 6px;text-decoration:underline;}
.subh2{text-align:center;font-weight:bold;font-size:15px;margin:16px 0 6px;}
.ctr{text-align:center;font-size:14px;margin:3px 0;}
.ctrb{text-align:center;font-weight:bold;font-size:15px;margin:3px 0;}
table.mt{border-collapse:collapse;margin:8px auto;width:80%;}
table.mt th,table.mt td{border:1px solid #000;padding:7px 10px;font-size:13px;text-align:center;}
.ititle{text-align:center;font-size:15px;margin:12px 0;line-height:2;}
.ititle b{font-size:16px;}
.ixtitle{text-align:center;font-weight:bold;font-size:20px;margin:6px 0 16px;}
.ixf{font-size:13px;font-weight:bold;margin:10px 0;}
.ixf u{font-weight:normal;}
table.ix{border-collapse:collapse;width:100%;margin-top:12px;}
table.ix th,table.ix td{border:1px solid #000;font-size:12px;padding:6px 4px;text-align:center;height:26px;}
table.ix td.t{text-align:left;}
.ixfoot{text-align:center;font-size:9px;color:#444;margin-top:auto;padding-top:8mm;}`;

function wrap(cfg: StyleCfg, inner: string): string {
  const round = cfg.round ? '.page{border-radius:16px}' : '';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>${CSS}body{font-family:${cfg.font};}${round}</style></head>
<body><div class="page">${inner}</div></body></html>`;
}

function headerBlock(cfg: StyleCfg, f: HtmlData): string {
  if (cfg.logo === 'header') return `<img class="hdr" src="${f.logoHeader}" />`;
  return `${cfg.title ? `<div class="utitle">${esc(UNI)}</div>` : ''}<img class="crest" src="${f.logoCrest}" />`;
}

function labelBlock(cfg: StyleCfg, text: string): string {
  if (cfg.label === 'underline') return `<div class="lblwrap"><span class="lblu">${text}</span></div>`;
  if (cfg.label === 'underline-rule') return `<div class="lblwrap"><span class="lblu">${text}</span><div class="rule"></div></div>`;
  const r = cfg.label === 'box-round' ? ' style="border-radius:14px"' : '';
  return `<div class="lblwrap"><span class="lblbox"${r}>${text}</span></div>`;
}

function bodyAssignLab(f: HtmlData): string {
  const cfg = styleCfg(f.template);
  const e = esc;
  const kv = f.docType === 'lab_report'
    ? `<div class="kv">
        <div class="row"><span class="k">Experiment Date</span>: ${e(f.experimentDate)}</div>
        <div class="row"><span class="k">Experiment No</span>: ${e(f.assignmentNo)}</div>
        <div class="row"><span class="k">Course Title</span>: ${e(f.courseTitle)}</div>
        <div class="row"><span class="k">Course Code</span>: ${e(f.courseCode)}</div>
        <div class="row"><span class="k">Experiment Name</span>: ${e(f.experimentName)}</div>
      </div>`
    : `<div class="kv">
        <div class="row"><span class="k">Assignment No</span>: ${e(f.assignmentNo)}</div>
        <div class="row"><span class="k">Course Code</span>: ${e(f.courseCode)}</div>
        <div class="row"><span class="k">Course Title</span>: ${e(f.courseTitle)}</div>
        ${f.experimentName ? `<div class="row"><span class="k">Topic</span>: ${e(f.experimentName)}</div>` : ''}
      </div>`;

  const boxes = `<div class="boxes">
      <div class="box">
        <div class="bh">Submitted By:</div>
        <div class="row">Name : ${e(f.studentName)}</div>
        <div class="row">ID No : ${e(f.studentId)}</div>
        <div class="row">Intake : ${e(f.intake)}</div>
        <div class="row">Section : ${e(f.section)}</div>
        <div class="row">Program : ${e(f.program)}</div>
      </div>
      <div class="box">
        <div class="bh">Submitted To:</div>
        <div class="row">Name : ${e(f.teacherName)}</div>
        ${f.teacherDesig ? `<div class="desig">(${e(f.teacherDesig)})</div>` : '<div class="gap"></div>'}
        <div class="gap"></div>
        <div class="row">Dept. of ${e(f.dept)}</div>
        <div class="uni">${e(UNI)}</div>
      </div>
    </div>`;

  const date = `<div class="date">Date of Submission : ${e(f.date)}</div>`;
  return wrap(cfg, headerBlock(cfg, f) + labelBlock(cfg, e(f.docTypeLabel).toUpperCase()) + kv + boxes + date);
}

function bodyProject(f: HtmlData): string {
  const cfg = styleCfg('classic'); // header logo, sans, sharp border
  const e = esc;
  const rows = f.members.map((m, i) =>
    `<tr><td>${i + 1}</td><td style="text-align:left">${e(m.name)}</td><td>${e(m.id)}</td></tr>`).join('');
  const inner = `<img class="hdr" src="${f.logoHeader}" />
    ${labelBlock(cfg, 'PROJECT REPORT')}
    <div class="ptitle">${e(f.reportTitle)}</div>
    <div class="cc">Course Title : ${e(f.courseTitle)}</div>
    <div class="cc">Course Code : ${e(f.courseCode)}</div>
    <div class="subh">Submitted to:</div>
    <div class="ctrb">${e(f.teacherName)}</div>
    ${f.teacherDesig ? `<div class="ctr">(${e(f.teacherDesig)})</div>` : ''}
    <div class="ctr">Department of ${e(f.dept)}</div>
    <div class="ctr">${e(UNI)} (BUBT)</div>
    <div class="subh">Submitted by:</div>
    <table class="mt"><tr><th>Sl No</th><th>Name</th><th>ID</th></tr>${rows}</table>
    <div class="ctr" style="margin-top:10px">Intake : ${e(f.intake)}, Section : ${e(f.section)}</div>
    <div class="ctr">${e(f.program)}</div>
    <div class="ctr">${e(UNI)} (BUBT)</div>
    <div class="date">Date of Submission : ${e(f.date)}</div>`;
  return wrap(cfg, inner);
}

function bodyInternship(f: HtmlData): string {
  const cfg = styleCfg('default'); // crest, sans, has title
  const e = esc;
  const inner = `<div class="utitle">${e(UNI)} (BUBT)</div>
    <img class="crest" src="${f.logoCrest}" />
    <div class="ititle">Internship Report<br/>on<br/><b>${e(f.reportTitle)}</b></div>
    ${f.company ? `<div class="ctrb" style="margin-bottom:4px">${e(f.company)}</div>` : ''}
    ${f.duration ? `<div class="ctr" style="margin-bottom:6px">Duration: ${e(f.duration)}</div>` : ''}
    <div class="subh2">Supervised By</div>
    <div class="ctrb">${e(f.teacherName)}</div>
    ${f.teacherDesig ? `<div class="ctr">${e(f.teacherDesig)}</div>` : ''}
    <div class="ctr">Department of ${e(f.dept)}</div>
    <div class="ctr">${e(UNI)} (BUBT)</div>
    <div class="subh2">Submitted By</div>
    <div class="ctrb">${e(f.studentName)}</div>
    <div class="ctr">ID: ${e(f.studentId)}</div>
    <div class="ctr">Intake: ${e(f.intake)}</div>
    <div class="ctr">Program: ${e(f.program)}</div>
    <div class="ctr">Section: ${e(f.section)}</div>
    <div class="ctr">Department of ${e(f.dept)}</div>
    <div class="ctr">${e(UNI)} (BUBT)</div>
    <div class="date">Date of Submission : ${e(f.date)}</div>`;
  return wrap(cfg, inner);
}

function bodyIndex(f: HtmlData): string {
  const cfg = styleCfg('classic'); // header logo, sans
  const e = esc;
  const ul = (v: string) => `<u>&nbsp;${e(v) || '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'}&nbsp;</u>`;
  let rows = '';
  const n = Math.min(Math.max(f.indexRows || 15, 1), 40);
  for (let i = 1; i <= n; i++) {
    rows += `<tr><td>${i}</td><td></td><td class="t"></td><td></td><td></td></tr>`;
  }
  const inner = `<img class="hdr" src="${f.logoHeader}" />
    <div class="ixtitle">INDEX</div>
    <div class="ixf">Name : ${ul(f.studentName)} &nbsp;&nbsp;&nbsp;&nbsp; ID No : ${ul(f.studentId)}</div>
    <div class="ixf">Intake : ${ul(f.intake)} &nbsp;&nbsp; Section : ${ul(f.section)} &nbsp;&nbsp; Course Code : ${ul(f.courseCode)}</div>
    <div class="ixf">Course Title : ${ul(f.courseTitle)}</div>
    <table class="ix">
      <tr><th style="width:8%">SL</th><th style="width:18%">Date</th><th>Title of Experiment / Topic</th><th style="width:10%">Page</th><th style="width:16%">Remarks</th></tr>
      ${rows}
    </table>
    <div class="ixfoot">Generated by BUBT Info App on ${e(f.date)}</div>`;
  return wrap(cfg, inner);
}

function buildHtml(f: HtmlData): string {
  if (f.docType === 'project_report') return bodyProject(f);
  if (f.docType === 'internship_report') return bodyInternship(f);
  if (f.docType === 'index_page') return bodyIndex(f);
  return bodyAssignLab(f);
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
  const [experimentDate, setExperimentDate] = useState(new Date().toISOString().slice(0, 10));
  const [experimentName, setExperimentName] = useState('');
  const [reportTitle, setReportTitle] = useState('');
  const [company, setCompany] = useState('');
  const [duration, setDuration] = useState('');
  const [indexRows, setIndexRows] = useState('15');
  const [studentName, setStudentName] = useState(profile?.full_name ?? '');
  const [studentId, setStudentId] = useState('');
  const [department, setDepartment] = useState(profile?.department ?? '');
  const [intake, setIntake] = useState(profile?.intake ?? '');
  const [section, setSection] = useState(profile?.section ?? '');
  const [program, setProgram] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [teacherDesig, setTeacherDesig] = useState('');
  const [teacherDept, setTeacherDept] = useState('');
  const [members, setMembers] = useState<Member[]>([{ name: profile?.full_name ?? '', id: '' }]);
  const [dateOfSubmission, setDateOfSubmission] = useState(new Date().toISOString().slice(0, 10));
  const [generating, setGenerating] = useState(false);

  const [facultyList, setFacultyList] = useState<FacultyRow[]>([]);
  const [facultyModal, setFacultyModal] = useState(false);
  const [facultySearch, setFacultySearch] = useState('');
  const [courseList, setCourseList] = useState<{ code: string; name: string }[]>([]);
  const [courseModal, setCourseModal] = useState(false);
  const [courseSearch, setCourseSearch] = useState('');
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [deptModal, setDeptModal] = useState(false);
  const [desigModal, setDesigModal] = useState(false);

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
    index_page: t.coverpage2.typeIndexPage,
    internship_report: t.coverpage2.typeInternshipReport,
  }[dt]);

  const needCourse = docType === 'assignment' || docType === 'lab_report' || docType === 'index_page';
  const needTitle = docType === 'project_report' || docType === 'internship_report';
  const needFaculty = docType !== 'index_page';
  const canGenerate = !!(studentName.trim() && studentId.trim()
    && (!needCourse || (courseTitle.trim() && courseCode.trim()))
    && (!needTitle || reportTitle.trim()));

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

  function updateMember(i: number, patch: Partial<Member>) {
    setMembers(prev => prev.map((m, idx) => idx === i ? { ...m, ...patch } : m));
  }
  function addMember() { setMembers(prev => [...prev, { name: '', id: '' }]); }
  function removeMember(i: number) { setMembers(prev => prev.filter((_, idx) => idx !== i)); }

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
      const dept = (teacherDept.trim() || department.trim() || program.trim() || 'N/A');
      const cleanMembers = members.filter(m => m.name.trim() || m.id.trim());
      const html = buildHtml({
        template, docType, docTypeLabel: docTypeLabel(docType),
        courseCode: courseCode.trim(), courseTitle: courseTitle.trim(),
        assignmentNo: assignmentNo.trim(),
        experimentDate: fmtDate(experimentDate), experimentName: experimentName.trim(),
        reportTitle: reportTitle.trim(),
        studentName: studentName.trim(), studentId: studentId.trim(),
        intake: intake.trim(), section: section.trim(),
        program: program.trim() || department.trim() || 'N/A',
        dept,
        teacherName: teacherName.trim() || 'N/A', teacherDesig: teacherDesig.trim(),
        members: cleanMembers.length ? cleanMembers : [{ name: studentName.trim(), id: studentId.trim() }],
        company: company.trim(), duration: duration.trim(),
        indexRows: parseInt(indexRows, 10) || 15,
        date: fmtDate(dateOfSubmission),
        logoCrest: BUBT_LOGO_CREST, logoHeader: BUBT_LOGO_HEADER,
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
                  <Icon name={dt === 'lab_report' ? 'layers' : dt === 'index_page' ? 'inbox' : dt === 'internship_report' ? 'bag' : 'fileText'} size={14} color={a ? C.white : C.text2} />
                  <Text style={[styles.typeChipText, { color: a ? C.white : C.text2, fontFamily: a ? FontFamily.jakartaBold : FontFamily.jakartaMedium }]}>{docTypeLabel(dt)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Template selection (assignment & lab only) */}
          {hasStyles(docType) ? (
            <>
              <Sec icon="grid" label="Select Template" C={C} count={TEMPLATES.length} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing[3] }}>
                {TEMPLATES.map(tmpl => {
                  const a = template === tmpl;
                  return (
                    <TouchableOpacity key={tmpl} style={[styles.tCard, { borderColor: a ? SectorColors.coverpage : C.border, borderWidth: a ? 2.5 : 1, backgroundColor: C.surface }]} onPress={() => setTemplate(tmpl)} activeOpacity={0.8}>
                      <Image source={previewFor(docType, tmpl)} style={styles.tImg} resizeMode="contain" />
                      {a && <View style={[styles.chk, { backgroundColor: SectorColors.coverpage }]}><Icon name="check" size={12} color={C.white} /></View>}
                      <View style={[styles.freeBadge, { backgroundColor: Accent.teal }]}><Text style={styles.freeTxt}>FREE</Text></View>
                      <Text style={[styles.tLabel, { color: a ? SectorColors.coverpage : C.text2, fontFamily: a ? FontFamily.jakartaBold : FontFamily.jakartaMedium }]}>{TEMPLATE_LABELS[tmpl]}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          ) : (
            <>
              <Sec icon="eye" label="Layout Preview" C={C} />
              <Image source={previewFor(docType, template)} style={[styles.bigPrev, { borderColor: C.border, backgroundColor: '#fff' }]} resizeMode="contain" />
            </>
          )}

          {/* Course Details */}
          {needCourse && (
            <>
              <Sec icon="box" label="Course Details" C={C} />
              <IconField icon="chevR" C={C} value={courseCode} onChange={setCourseCode} placeholder="Course Code"
                badge="Autofill" onBadge={() => setCourseModal(true)} badgeIcon="chevD" />
              <IconField icon="sparkle" C={C} value={courseTitle} onChange={setCourseTitle} placeholder="Course Title" />
            </>
          )}

          {/* Report Title (project / internship) */}
          {needTitle && (
            <>
              <Sec icon="fileText" label={docType === 'project_report' ? 'Project Details' : 'Internship Details'} C={C} />
              <IconField icon="fileText" C={C} value={reportTitle} onChange={setReportTitle}
                placeholder={docType === 'project_report' ? 'Project Title' : 'Internship Topic'} />
              <IconField icon="chevR" C={C} value={courseCode} onChange={setCourseCode} placeholder="Course Code (optional)"
                badge="Autofill" onBadge={() => setCourseModal(true)} badgeIcon="chevD" />
              <IconField icon="sparkle" C={C} value={courseTitle} onChange={setCourseTitle} placeholder="Course Title (optional)" />
              {docType === 'internship_report' && (
                <>
                  <IconField icon="box" C={C} value={company} onChange={setCompany} placeholder="Company / Organization Name (optional)" />
                  <IconField icon="calendar" C={C} value={duration} onChange={setDuration} placeholder="Duration (optional)" />
                </>
              )}
            </>
          )}

          {/* Index rows */}
          {docType === 'index_page' && (
            <>
              <Sec icon="inbox" label="Index Table" C={C} />
              <IconField icon="layers" C={C} value={indexRows} onChange={setIndexRows} placeholder="Number of Rows (e.g. 15)" />
            </>
          )}

          {/* Assignment / Lab details */}
          {docType === 'assignment' && (
            <>
              <Sec icon="fileText" label="Assignment Details" C={C} />
              <IconField icon="flag" C={C} value={assignmentNo} onChange={setAssignmentNo} placeholder="Assignment No" />
              <IconField icon="layers" C={C} value={experimentName} onChange={setExperimentName} placeholder="Topic (optional)" />
            </>
          )}
          {docType === 'lab_report' && (
            <>
              <Sec icon="layers" label="Lab Report Details" C={C} />
              <IconField icon="calendar" C={C} value={experimentDate} onChange={setExperimentDate} placeholder="Experiment Date (YYYY-MM-DD)" />
              <IconField icon="flag" C={C} value={assignmentNo} onChange={setAssignmentNo} placeholder="Experiment No" />
              <IconField icon="layers" C={C} value={experimentName} onChange={setExperimentName} placeholder="Experiment Name" />
            </>
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
          {docType !== 'index_page' && (
            <IconField icon="award" C={C} value={program} placeholder="Program" onPress={() => setDeptModal(true)} chevron />
          )}

          {/* Group Members (project only) */}
          {docType === 'project_report' && (
            <>
              <Sec icon="user" label="Group Members" C={C} count={members.length} />
              {members.map((m, i) => (
                <View key={i} style={hStyles.row}>
                  <View style={{ flex: 1.4 }}>
                    <IconField icon="user" C={C} value={m.name} onChange={v => updateMember(i, { name: v })} placeholder={`Member ${i + 1} Name`} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <IconField icon="idcard" C={C} value={m.id} onChange={v => updateMember(i, { id: v })} placeholder="ID" />
                  </View>
                  {members.length > 1 && (
                    <TouchableOpacity style={[styles.delMember, { borderColor: C.border }]} onPress={() => removeMember(i)}>
                      <Icon name="trash" size={16} color={C.danger ?? '#e23'} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              <TouchableOpacity style={[styles.addBtn, { borderColor: SectorColors.coverpage }]} onPress={addMember}>
                <Icon name="plus" size={16} color={SectorColors.coverpage} />
                <Text style={[styles.addTxt, { color: SectorColors.coverpage, fontFamily: FontFamily.jakartaBold }]}>Add Member</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Faculty Details */}
          {needFaculty && (
            <>
              <Sec icon="user" label={docType === 'internship_report' ? 'Supervisor Details' : 'Faculty Details'} C={C} />
              <IconField icon="user" C={C} value={teacherName} onChange={setTeacherName} placeholder="Teacher Name"
                badge="Autofill" onBadge={() => setFacultyModal(true)} badgeIcon="chevD" />
              <IconField icon="grid" C={C} value={teacherDept} onChange={setTeacherDept} placeholder="Department" />
              <IconField icon="award" C={C} value={teacherDesig} placeholder="Designation" onPress={() => setDesigModal(true)} chevron />
            </>
          )}

          {/* Date */}
          <Sec icon="calendar" label="Date of Submission" C={C} />
          <IconField icon="calendar" C={C} value={dateOfSubmission} onChange={setDateOfSubmission} placeholder="YYYY-MM-DD" />

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

      {/* Designation picker */}
      <BottomSheet visible={desigModal} onClose={() => setDesigModal(false)} title="Select Designation" C={C}>
        <FlatList data={DESIGNATIONS} keyExtractor={i => i} style={{ maxHeight: 380 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={[styles.listRow, { borderBottomColor: C.border }]} onPress={() => { setTeacherDesig(item); setDesigModal(false); }} activeOpacity={0.7}>
              <Text style={[styles.deptText, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}>{item}</Text>
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

const hStyles = StyleSheet.create({
  sec: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2], marginTop: Spacing[5], paddingBottom: Spacing[2], borderBottomWidth: StyleSheet.hairlineWidth },
  dot: { width: 4, height: 18, borderRadius: 2 },
  secText: { fontSize: FontSize.md, flex: 1 },
  countBadge: { width: 22, height: 22, borderRadius: 11, alignItems: 'center' as const, justifyContent: 'center' as const },
  countTxt: { color: '#fff', fontSize: 11, fontWeight: '700' as const },
  row: { flexDirection: 'row', gap: Spacing[3], alignItems: 'center' },
});

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: 20, paddingTop: Spacing[2] },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[2], marginBottom: Spacing[2] },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing[4], paddingVertical: Spacing[2], borderRadius: Radius.full, borderWidth: 1.5 },
  typeChipText: { fontSize: FontSize.sm },
  tCard: { width: 124, borderRadius: Radius.md, marginRight: Spacing[3], overflow: 'hidden' },
  tImg: { width: '100%', height: 160 },
  bigPrev: { width: '100%', height: 460, borderRadius: Radius.md, borderWidth: 1, marginTop: Spacing[3] },
  chk: { position: 'absolute', top: 6, left: 6, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  freeBadge: { position: 'absolute', top: 6, right: 6, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  freeTxt: { color: '#fff', fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
  tLabel: { textAlign: 'center', fontSize: FontSize.xs, paddingVertical: Spacing[2] },
  delMember: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing[3] },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 46, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', marginTop: Spacing[1] },
  addTxt: { fontSize: FontSize.sm },
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
