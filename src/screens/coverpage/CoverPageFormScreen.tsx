import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert,
  TextInput, KeyboardAvoidingView, ActivityIndicator,
  Modal, FlatList, Image, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Print from 'expo-print';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';
import { useToast } from '../../components/ui/Toast';
import { SubBar } from '../../components/layout/TopBar';
import { Avatar } from '../../components/ui/Avatar';
import { supabase } from '../../lib/supabase';
import { localToday } from '../../utils/format';
import { FontFamily, FontSize, Layout, Radius, Spacing, SectorColors, Accent, pillBg } from '../../theme';
import { sharePdf, savePdfToDevice } from '../../services/pdf/pdfFiles';
import { CampusPdfViewerModal } from '../../components/pdf/CampusPdfViewerModal';
import { BUBT_LOGO_CREST, BUBT_LOGO_HEADER } from './logos';

type DocType = 'assignment' | 'lab_report' | 'project_report' | 'index_page' | 'internship_report';
type TemplateStyle = 'default' | 'classic' | 'premium' | 'minimal' | 'modern';
type Member = { key?: string; name: string; id: string };

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

// Rendered template previews for document styles
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

function valOrBlank(val: string, fallbackDashes: string = '________________________________'): string {
  return (val ?? '').trim() ? esc(val.trim()) : fallbackDashes;
}

// YYYY-MM-DD -> MM/dd/yyyy
function fmtDate(s: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((s ?? '').trim());
  return m ? `${m[2]}/${m[3]}/${m[1]}` : s;
}

// PDF HTML Templates
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
.boxes{display:flex;gap:10mm;margin-top:12mm;}
.box{flex:1;border:1.5px solid #000;border-radius:6px;padding:10px 14px;min-height:40mm;}
.box .bh{text-align:center;font-weight:bold;font-size:16px;margin-bottom:10px;}
.box .row{font-weight:bold;font-size:14px;margin:6px 0;}
.box .uni{font-weight:normal;font-size:12px;margin-top:4px;}
.box .desig{font-weight:normal;font-style:italic;font-size:12px;margin:2px 0 6px;}
.gap{height:12px;}
.date{text-align:center;font-weight:bold;font-size:15px;margin-top:14mm;}
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
  const kv = f.docType === 'lab_report'
    ? `<div class="kv">
        <div class="row"><span class="k">Experiment Date</span>: ${valOrBlank(f.experimentDate, '____ / ____ / 2026')}</div>
        <div class="row"><span class="k">Experiment No</span>: ${valOrBlank(f.assignmentNo, '____')}</div>
        <div class="row"><span class="k">Course Title</span>: ${valOrBlank(f.courseTitle)}</div>
        <div class="row"><span class="k">Course Code</span>: ${valOrBlank(f.courseCode, '____________')}</div>
        <div class="row"><span class="k">Experiment Name</span>: ${valOrBlank(f.experimentName)}</div>
      </div>`
    : `<div class="kv">
        <div class="row"><span class="k">Assignment No</span>: ${valOrBlank(f.assignmentNo, '____')}</div>
        <div class="row"><span class="k">Course Code</span>: ${valOrBlank(f.courseCode, '____________')}</div>
        <div class="row"><span class="k">Course Title</span>: ${valOrBlank(f.courseTitle)}</div>
        ${f.experimentName ? `<div class="row"><span class="k">Topic</span>: ${valOrBlank(f.experimentName)}</div>` : ''}
      </div>`;

  const boxes = `<div class="boxes">
      <div class="box">
        <div class="bh">Submitted By:</div>
        <div class="row">Name : ${valOrBlank(f.studentName)}</div>
        <div class="row">ID No : ${valOrBlank(f.studentId, '____________________')}</div>
        <div class="row">Intake : ${valOrBlank(f.intake, '________')}</div>
        <div class="row">Section : ${valOrBlank(f.section, '____')}</div>
        <div class="row">Program : ${valOrBlank(f.program)}</div>
      </div>
      <div class="box">
        <div class="bh">Submitted To:</div>
        <div class="row">Name : ${valOrBlank(f.teacherName)}</div>
        ${f.teacherDesig ? `<div class="desig">(${esc(f.teacherDesig)})</div>` : '<div class="gap"></div>'}
        <div class="gap"></div>
        <div class="row">Dept. of ${valOrBlank(f.dept)}</div>
        <div class="uni">${esc(UNI)}</div>
      </div>
    </div>`;

  const date = `<div class="date">Date of Submission : ${valOrBlank(f.date, '____ / ____ / 2026')}</div>`;
  return wrap(cfg, headerBlock(cfg, f) + labelBlock(cfg, esc(f.docTypeLabel).toUpperCase()) + kv + boxes + date);
}

function bodyProject(f: HtmlData): string {
  const cfg = styleCfg('classic');
  const e = esc;
  const rows = f.members.map((m, i) =>
    `<tr><td>${i + 1}</td><td style="text-align:left">${valOrBlank(m.name)}</td><td>${valOrBlank(m.id, '____________')}</td></tr>`).join('');
  const inner = `<img class="hdr" src="${f.logoHeader}" />
    ${labelBlock(cfg, 'PROJECT REPORT')}
    <div class="ptitle">${valOrBlank(f.reportTitle, 'TITLE OF THE PROJECT REPORT')}</div>
    <div class="cc">Course Title : ${valOrBlank(f.courseTitle)}</div>
    <div class="cc">Course Code : ${valOrBlank(f.courseCode, '____________')}</div>
    <div class="subh">Submitted to:</div>
    <div class="ctrb">${valOrBlank(f.teacherName)}</div>
    ${f.teacherDesig ? `<div class="ctr">(${e(f.teacherDesig)})</div>` : ''}
    <div class="ctr">Department of ${valOrBlank(f.dept)}</div>
    <div class="ctr">${e(UNI)} (BUBT)</div>
    <div class="subh">Submitted by:</div>
    <table class="mt"><tr><th>Sl No</th><th>Name</th><th>ID</th></tr>${rows}</table>
    <div class="ctr" style="margin-top:10px">Intake : ${valOrBlank(f.intake, '____')}, Section : ${valOrBlank(f.section, '____')}</div>
    <div class="ctr">${valOrBlank(f.program)}</div>
    <div class="ctr">${e(UNI)} (BUBT)</div>
    <div class="date">Date of Submission : ${valOrBlank(f.date, '____ / ____ / 2026')}</div>`;
  return wrap(cfg, inner);
}

function bodyInternship(f: HtmlData): string {
  const cfg = styleCfg('default');
  const e = esc;
  const inner = `<div class="utitle">${e(UNI)} (BUBT)</div>
    <img class="crest" src="${f.logoCrest}" />
    <div class="ititle">Internship Report<br/>on<br/><b>${valOrBlank(f.reportTitle, 'INTERNSHIP TOPIC')}</b></div>
    ${f.company ? `<div class="ctrb" style="margin-bottom:4px">${e(f.company)}</div>` : ''}
    ${f.duration ? `<div class="ctr" style="margin-bottom:6px">Duration: ${e(f.duration)}</div>` : ''}
    <div class="subh2">Supervised By</div>
    <div class="ctrb">${valOrBlank(f.teacherName)}</div>
    ${f.teacherDesig ? `<div class="ctr">${e(f.teacherDesig)}</div>` : ''}
    <div class="ctr">Department of ${valOrBlank(f.dept)}</div>
    <div class="ctr">${e(UNI)} (BUBT)</div>
    <div class="subh2">Submitted By</div>
    <div class="ctrb">${valOrBlank(f.studentName)}</div>
    <div class="ctr">ID: ${valOrBlank(f.studentId, '____________________')}</div>
    <div class="ctr">Intake: ${valOrBlank(f.intake, '________')}</div>
    <div class="ctr">Program: ${valOrBlank(f.program)}</div>
    <div class="ctr">Section: ${valOrBlank(f.section, '____')}</div>
    <div class="ctr">Department of ${valOrBlank(f.dept)}</div>
    <div class="ctr">${e(UNI)} (BUBT)</div>
    <div class="date">Date of Submission : ${valOrBlank(f.date, '____ / ____ / 2026')}</div>`;
  return wrap(cfg, inner);
}

function bodyIndex(f: HtmlData): string {
  const cfg = styleCfg('classic');
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
    <div class="ixfoot">Generated by CampusOne on ${valOrBlank(f.date, 'Today')}</div>`;
  return wrap(cfg, inner);
}

function buildHtml(f: HtmlData): string {
  if (f.docType === 'project_report') return bodyProject(f);
  if (f.docType === 'internship_report') return bodyInternship(f);
  if (f.docType === 'index_page') return bodyIndex(f);
  return bodyAssignLab(f);
}

export function CoverPageFormScreen({ navigation }: any) {
  const { C, isDark } = useTheme();
  const { profile } = useAuth();
  const t = useT();
  const toast = useToast();

  const [docType, setDocType] = useState<DocType>('assignment');
  const [docTypeModal, setDocTypeModal] = useState(false);
  const [template, setTemplate] = useState<TemplateStyle>('default');

  const [courseCode, setCourseCode] = useState('');
  const [courseTitle, setCourseTitle] = useState('');
  const [assignmentNo, setAssignmentNo] = useState('');
  const [experimentDate, setExperimentDate] = useState(localToday());
  const [experimentName, setExperimentName] = useState('');
  const [reportTitle, setReportTitle] = useState('');
  const [company, setCompany] = useState('');
  const [duration, setDuration] = useState('');
  const [indexRows, setIndexRows] = useState('15');

  const [studentName, setStudentName] = useState(profile?.full_name ?? '');
  const [studentId, setStudentId] = useState(profile?.student_id ?? '');
  const [department, setDepartment] = useState(profile?.department ?? '');
  const [intake, setIntake] = useState(profile?.intake ?? '');
  const [section, setSection] = useState(profile?.section ?? '');
  const [program, setProgram] = useState(profile?.program ?? '');

  const [teacherName, setTeacherName] = useState('');
  const [teacherDesig, setTeacherDesig] = useState('');
  const [teacherDept, setTeacherDept] = useState('');
  const [members, setMembers] = useState<Member[]>([{ key: 'm-0', name: profile?.full_name ?? '', id: profile?.student_id ?? '' }]);
  const [dateOfSubmission, setDateOfSubmission] = useState(localToday());

  const [generating, setGenerating] = useState(false);
  const [lastPdfUri, setLastPdfUri] = useState<string | null>(null);
  const [lastHtml, setLastHtml] = useState<string | null>(null);
  const [viewerVisible, setViewerVisible] = useState(false);

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
    assignment: t.coverpage2?.typeAssignment ?? 'Assignment',
    lab_report: t.coverpage2?.typeLabReport ?? 'Lab Report',
    project_report: t.coverpage2?.typeProjectReport ?? 'Project Report',
    index_page: t.coverpage2?.typeIndexPage ?? 'Index Page',
    internship_report: t.coverpage2?.typeInternshipReport ?? 'Internship Report',
  }[dt]);

  const docTypeIcon = (dt: DocType): keyof typeof Feather.glyphMap => ({
    assignment: 'file-text' as const,
    lab_report: 'layers' as const,
    project_report: 'award' as const,
    index_page: 'list' as const,
    internship_report: 'briefcase' as const,
  }[dt]);

  const docTypeDesc = (dt: DocType) => ({
    assignment: 'Standard individual assignment cover for all BUBT courses',
    lab_report: 'Laboratory experiment report with experiment date and number',
    project_report: 'Semester project or capstone with group members list',
    index_page: 'Full-page printable experiment index table with rows',
    internship_report: 'Academic & company supervisor report with organization info',
  }[dt]);

  const needCourse = docType === 'assignment' || docType === 'lab_report' || docType === 'index_page';
  const needTitle = docType === 'project_report' || docType === 'internship_report';
  const needFaculty = docType !== 'index_page';

  function selectCourse(c: { code: string; name: string }) {
    setCourseCode(c.code);
    setCourseTitle(c.name);
    setCourseModal(false);
    setCourseSearch('');
  }

  function selectTeacher(f: FacultyRow) {
    setTeacherName(f.name ?? '');
    setTeacherDesig(f.designation ?? '');
    const dn = (f.dept_name ?? '').replace(/^Department of\s*/i, '');
    if (dn) setTeacherDept(dn);
    if (dn && !department) setDepartment(dn);
    setFacultyModal(false);
    setFacultySearch('');
  }

  function selectProgram(d: { id: string; name: string }) {
    const s = d.name.replace(/^Department of\s*/i, '');
    setProgram(s);
    if (!department) setDepartment(s);
    setDeptModal(false);
  }

  function updateMember(i: number, patch: Partial<Member>) {
    setMembers(prev => prev.map((m, idx) => idx === i ? { ...m, ...patch } : m));
  }
  function addMember() {
    setMembers(prev => [...prev, { key: `m-${Date.now()}-${prev.length}`, name: '', id: '' }]);
  }
  function removeMember(i: number) {
    setMembers(prev => prev.filter((_, idx) => idx !== i));
  }

  const filteredFaculty = facultySearch
    ? facultyList.filter(f => f.name.toLowerCase().includes(facultySearch.toLowerCase()) || (f.dept_name ?? '').toLowerCase().includes(facultySearch.toLowerCase()))
    : facultyList;

  const filteredCourses = courseSearch
    ? courseList.filter(c => c.code.toLowerCase().includes(courseSearch.toLowerCase()) || c.name.toLowerCase().includes(courseSearch.toLowerCase()))
    : courseList;

  async function handleGenerate() {
    setGenerating(true);
    try {
      const dept = (teacherDept.trim() || department.trim() || program.trim() || 'Computer Science and Engineering');
      const cleanMembers = members.filter(m => (m?.name ?? '').trim() || (m?.id ?? '').trim());
      const html = buildHtml({
        template,
        docType,
        docTypeLabel: docTypeLabel(docType),
        courseCode: courseCode.trim(),
        courseTitle: courseTitle.trim(),
        assignmentNo: assignmentNo.trim(),
        experimentDate: fmtDate(experimentDate),
        experimentName: experimentName.trim(),
        reportTitle: reportTitle.trim(),
        studentName: studentName.trim(),
        studentId: studentId.trim(),
        intake: intake.trim(),
        section: section.trim(),
        program: program.trim() || department.trim() || 'B.Sc. in CSE',
        dept,
        teacherName: teacherName.trim(),
        teacherDesig: teacherDesig.trim(),
        members: cleanMembers.length ? cleanMembers : [{ name: studentName.trim(), id: studentId.trim() }],
        company: company.trim(),
        duration: duration.trim(),
        indexRows: parseInt(indexRows, 10) || 15,
        date: fmtDate(dateOfSubmission),
        logoCrest: BUBT_LOGO_CREST,
        logoHeader: BUBT_LOGO_HEADER,
      });

      const { uri } = await Print.printToFileAsync({ html, base64: false });
      setLastPdfUri(uri);
      setLastHtml(html);
      toast({
        type: 'success',
        title: 'Cover Page Ready',
        message: 'You can now View, Download, or Share your document below',
      });
    } catch {
      Alert.alert(t.common?.error ?? 'Error', t.coverpage2?.generationFailed ?? 'Failed to generate PDF');
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveDevice() {
    if (!lastPdfUri) return;
    try {
      const name = `BUBT_${docTypeLabel(docType)}_${courseCode || 'Cover'}`;
      const res = await savePdfToDevice(lastPdfUri, name);
      if (res.success) {
        toast({ type: 'success', title: 'Saved to Downloads' });
      }
    } catch {
      toast({ type: 'error', title: 'Save Failed', message: 'Could not save file to device' });
    }
  }

  async function handleShare() {
    if (!lastPdfUri) return;
    try {
      await sharePdf(lastPdfUri, 'Share BUBT Cover Page');
    } catch {
      toast({ type: 'error', title: 'Share Failed' });
    }
  }

  async function handlePrintDirect() {
    if (!lastHtml) return;
    try {
      await Print.printAsync({ html: lastHtml });
    } catch {
      toast({ type: 'error', title: 'Print Cancelled' });
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar title={t.coverpage2?.title ?? 'Cover Page Generator'} onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        >

          {/* Section: Document Type */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionEyebrow, { color: C.text3, fontFamily: FontFamily.jakartaBold }]}>
              DOCUMENT TYPE
            </Text>
          </View>
          <Bar72
            icon={docTypeIcon(docType)}
            label="SELECT DOCUMENT TYPE"
            value={docTypeLabel(docType)}
            desc={docTypeDesc(docType)}
            onPress={() => setDocTypeModal(true)}
            accentColor={SectorColors.coverpage}
            C={C}
          />

          {/* Template selection (assignment & lab only) */}
          {hasStyles(docType) ? (
            <>
              <View style={[styles.sectionHeader, { marginTop: 14 }]}>
                <Text style={[styles.sectionEyebrow, { color: C.text3, fontFamily: FontFamily.jakartaBold }]}>
                  SELECT TEMPLATE
                </Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing[3] }}>
                {TEMPLATES.map(tmpl => {
                  const a = template === tmpl;
                  return (
                    <TouchableOpacity
                      key={tmpl}
                      style={[styles.tCard, { borderColor: a ? SectorColors.coverpage : C.border, borderWidth: a ? 2.5 : 1, backgroundColor: C.surface }]}
                      onPress={() => setTemplate(tmpl)}
                      activeOpacity={0.8}
                    >
                      <Image source={previewFor(docType, tmpl)} style={styles.tImg} resizeMode="contain" />
                      {a && (
                        <View style={[styles.chk, { backgroundColor: SectorColors.coverpage }]}>
                          <Feather name="check" size={12} color={C.white} />
                        </View>
                      )}
                      <View style={[styles.freeBadge, { backgroundColor: Accent.teal }]}>
                        <Text style={styles.freeTxt}>FREE</Text>
                      </View>
                      <Text style={[styles.tLabel, { color: a ? SectorColors.coverpage : C.text2, fontFamily: a ? FontFamily.jakartaBold : FontFamily.jakartaMedium }]}>
                        {TEMPLATE_LABELS[tmpl]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          ) : (
            <>
              <View style={[styles.sectionHeader, { marginTop: 14 }]}>
                <Text style={[styles.sectionEyebrow, { color: C.text3, fontFamily: FontFamily.jakartaBold }]}>
                  LAYOUT PREVIEW
                </Text>
              </View>
              <Image source={previewFor(docType, template)} style={[styles.bigPrev, { borderColor: C.border, backgroundColor: '#fff' }]} resizeMode="contain" />
            </>
          )}

          {/* Section: Course Details */}
          {needCourse && (
            <>
              <View style={[styles.sectionHeader, { marginTop: 14 }]}>
                <Text style={[styles.sectionEyebrow, { color: C.text3, fontFamily: FontFamily.jakartaBold }]}>
                  COURSE DETAILS
                </Text>
              </View>
              <Bar72
                icon="search"
                label="AUTOFILL COURSE"
                value={courseCode ? `${courseCode} · ${courseTitle}` : ''}
                placeholder="Tap to search & autofill course..."
                onPress={() => setCourseModal(true)}
                accentColor={SectorColors.coverpage}
                badge="Autofill"
                C={C}
              />
              <InputBar72
                icon="hash"
                label="COURSE CODE"
                value={courseCode}
                onChange={setCourseCode}
                placeholder="e.g. CSE 111"
                accentColor={SectorColors.coverpage}
                C={C}
              />
              <InputBar72
                icon="book-open"
                label="COURSE TITLE"
                value={courseTitle}
                onChange={setCourseTitle}
                placeholder="e.g. Structured Programming Language"
                accentColor={SectorColors.coverpage}
                C={C}
              />
            </>
          )}

          {/* Section: Project or Internship details */}
          {needTitle && (
            <>
              <View style={[styles.sectionHeader, { marginTop: 14 }]}>
                <Text style={[styles.sectionEyebrow, { color: C.text3, fontFamily: FontFamily.jakartaBold }]}>
                  {docType === 'project_report' ? 'PROJECT DETAILS' : 'INTERNSHIP DETAILS'}
                </Text>
              </View>
              <InputBar72
                icon="file-text"
                label={docType === 'project_report' ? 'PROJECT TITLE' : 'INTERNSHIP TOPIC'}
                value={reportTitle}
                onChange={setReportTitle}
                placeholder={docType === 'project_report' ? 'Enter project report title' : 'Enter internship topic'}
                accentColor={SectorColors.coverpage}
                C={C}
              />
              <Bar72
                icon="search"
                label="OPTIONAL COURSE AUTOFILL"
                value={courseCode ? `${courseCode} · ${courseTitle}` : ''}
                placeholder="Tap to autofill course (optional)..."
                onPress={() => setCourseModal(true)}
                accentColor={SectorColors.coverpage}
                badge="Autofill"
                C={C}
              />
              <InputBar72
                icon="hash"
                label="COURSE CODE"
                value={courseCode}
                onChange={setCourseCode}
                placeholder="Course code (optional)"
                accentColor={SectorColors.coverpage}
                C={C}
              />
              <InputBar72
                icon="book-open"
                label="COURSE TITLE"
                value={courseTitle}
                onChange={setCourseTitle}
                placeholder="Course title (optional)"
                accentColor={SectorColors.coverpage}
                C={C}
              />
              {docType === 'internship_report' && (
                <>
                  <InputBar72
                    icon="briefcase"
                    label="COMPANY / ORGANIZATION NAME"
                    value={company}
                    onChange={setCompany}
                    placeholder="e.g. Grameenphone Ltd."
                    accentColor={SectorColors.coverpage}
                    C={C}
                  />
                  <InputBar72
                    icon="calendar"
                    label="DURATION"
                    value={duration}
                    onChange={setDuration}
                    placeholder="e.g. 3 Months (Jan 2026 - Mar 2026)"
                    accentColor={SectorColors.coverpage}
                    C={C}
                  />
                </>
              )}
            </>
          )}

          {/* Section: Index Rows */}
          {docType === 'index_page' && (
            <>
              <View style={[styles.sectionHeader, { marginTop: 14 }]}>
                <Text style={[styles.sectionEyebrow, { color: C.text3, fontFamily: FontFamily.jakartaBold }]}>
                  INDEX TABLE ROWS
                </Text>
              </View>
              <InputBar72
                icon="list"
                label="NUMBER OF TABLE ROWS"
                value={indexRows}
                onChange={setIndexRows}
                placeholder="e.g. 15 (default is 15 rows)"
                accentColor={SectorColors.coverpage}
                keyboardType="numeric"
                C={C}
              />
            </>
          )}

          {/* Section: Assignment Details */}
          {docType === 'assignment' && (
            <>
              <View style={[styles.sectionHeader, { marginTop: 14 }]}>
                <Text style={[styles.sectionEyebrow, { color: C.text3, fontFamily: FontFamily.jakartaBold }]}>
                  ASSIGNMENT DETAILS
                </Text>
              </View>
              <InputBar72
                icon="hash"
                label="ASSIGNMENT NO"
                value={assignmentNo}
                onChange={setAssignmentNo}
                placeholder="e.g. 01 or 02"
                accentColor={SectorColors.coverpage}
                C={C}
              />
              <InputBar72
                icon="file-text"
                label="ASSIGNMENT TOPIC"
                value={experimentName}
                onChange={setExperimentName}
                placeholder="e.g. Memory Management & Pointers (optional)"
                accentColor={SectorColors.coverpage}
                C={C}
              />
            </>
          )}

          {/* Section: Lab Details */}
          {docType === 'lab_report' && (
            <>
              <View style={[styles.sectionHeader, { marginTop: 14 }]}>
                <Text style={[styles.sectionEyebrow, { color: C.text3, fontFamily: FontFamily.jakartaBold }]}>
                  LAB REPORT DETAILS
                </Text>
              </View>
              <InputBar72
                icon="calendar"
                label="EXPERIMENT DATE (PERFORMANCE)"
                value={experimentDate}
                onChange={setExperimentDate}
                placeholder="YYYY-MM-DD"
                accentColor={SectorColors.coverpage}
                C={C}
              />
              <InputBar72
                icon="hash"
                label="EXPERIMENT NO"
                value={assignmentNo}
                onChange={setAssignmentNo}
                placeholder="e.g. 01 or 03"
                accentColor={SectorColors.coverpage}
                C={C}
              />
              <InputBar72
                icon="layers"
                label="EXPERIMENT NAME"
                value={experimentName}
                onChange={setExperimentName}
                placeholder="e.g. Study of Logic Gates and Implementation"
                accentColor={SectorColors.coverpage}
                C={C}
              />
            </>
          )}

          {/* Section: Student Information */}
          <View style={[styles.sectionHeader, { marginTop: 14 }]}>
            <Text style={[styles.sectionEyebrow, { color: C.text3, fontFamily: FontFamily.jakartaBold }]}>
              STUDENT INFORMATION
            </Text>
          </View>
          <InputBar72
            icon="user"
            label="STUDENT FULL NAME"
            value={studentName}
            onChange={setStudentName}
            placeholder="Student Name (or leave blank to write with pen)"
            accentColor={SectorColors.coverpage}
            C={C}
          />
          <InputBar72
            icon="credit-card"
            label="STUDENT ID"
            value={studentId}
            onChange={setStudentId}
            placeholder="e.g. 22235103199"
            accentColor={SectorColors.coverpage}
            C={C}
          />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <InputBar72
                icon="grid"
                label="INTAKE"
                value={intake}
                onChange={setIntake}
                placeholder="e.g. 51"
                accentColor={SectorColors.coverpage}
                C={C}
              />
            </View>
            <View style={{ flex: 1 }}>
              <InputBar72
                icon="layers"
                label="SECTION"
                value={section}
                onChange={setSection}
                placeholder="e.g. 02"
                accentColor={SectorColors.coverpage}
                C={C}
              />
            </View>
          </View>
          {docType !== 'index_page' && (
            <Bar72
              icon="award"
              label="PROGRAM / DEGREE"
              value={program}
              placeholder="Select Program / Degree..."
              onPress={() => setDeptModal(true)}
              accentColor={SectorColors.coverpage}
              C={C}
            />
          )}

          {/* Section: Group Members (Project Only) */}
          {docType === 'project_report' && (
            <>
              <View style={[styles.sectionHeader, { marginTop: 14 }]}>
                <Text style={[styles.sectionEyebrow, { color: C.text3, fontFamily: FontFamily.jakartaBold }]}>
                  GROUP MEMBERS ({members.length})
                </Text>
              </View>
              {members.map((m, i) => (
                <View key={m.key ?? `m-${i}`} style={[styles.bar72, { backgroundColor: C.surface, borderColor: C.border, borderLeftColor: SectorColors.coverpage, marginBottom: 8 }]}>
                  <View style={[styles.toolIcon, { backgroundColor: C.surface2 }]}>
                    <Text style={{ fontFamily: FontFamily.jakartaBold, fontSize: 13, color: C.text }}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1.3, marginRight: 8 }}>
                    <Text style={[styles.barLabel, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                      MEMBER {i + 1} NAME
                    </Text>
                    <TextInput
                      style={[styles.barInput, { color: C.text, fontFamily: FontFamily.jakartaSemiBold }]}
                      value={m.name}
                      onChangeText={v => updateMember(i, { name: v })}
                      placeholder="Name"
                      placeholderTextColor={C.textMuted}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.barLabel, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                      ID
                    </Text>
                    <TextInput
                      style={[styles.barInput, { color: C.text, fontFamily: FontFamily.jakartaSemiBold }]}
                      value={m.id}
                      onChangeText={v => updateMember(i, { id: v })}
                      placeholder="ID"
                      placeholderTextColor={C.textMuted}
                    />
                  </View>
                  {members.length > 1 && (
                    <TouchableOpacity style={[styles.delMember, { borderColor: C.border }]} onPress={() => removeMember(i)}>
                      <Feather name="trash-2" size={16} color={C.danger ?? '#e23'} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              <TouchableOpacity
                style={[styles.childBar72, { backgroundColor: C.surface, borderColor: SectorColors.coverpage, borderStyle: 'dashed' }]}
                onPress={addMember}
                activeOpacity={0.8}
              >
                <View style={[styles.toolIcon, { backgroundColor: C.surface2 }]}>
                  <Feather name="plus" size={18} color={SectorColors.coverpage} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.childTitle, { color: SectorColors.coverpage, fontFamily: FontFamily.jakartaBold }]}>
                    Add Group Member
                  </Text>
                  <Text style={[styles.childDesc, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]}>
                    Add up to 5 project teammates with ID
                  </Text>
                </View>
                <Feather name="chevron-right" size={17} color={SectorColors.coverpage} />
              </TouchableOpacity>
            </>
          )}

          {/* Section: Faculty Details */}
          {needFaculty && (
            <>
              <View style={[styles.sectionHeader, { marginTop: 14 }]}>
                <Text style={[styles.sectionEyebrow, { color: C.text3, fontFamily: FontFamily.jakartaBold }]}>
                  {docType === 'internship_report' ? 'SUPERVISOR DETAILS' : 'FACULTY DETAILS'}
                </Text>
              </View>
              <Bar72
                icon="user-check"
                label="TEACHER / SUPERVISOR"
                value={teacherName ? `${teacherName} ${teacherDesig ? `(${teacherDesig})` : ''}` : ''}
                placeholder="Tap to select teacher from directory..."
                onPress={() => setFacultyModal(true)}
                accentColor={SectorColors.coverpage}
                badge="Autofill"
                C={C}
              />
              <InputBar72
                icon="user"
                label="TEACHER NAME"
                value={teacherName}
                onChange={setTeacherName}
                placeholder="Teacher Name"
                accentColor={SectorColors.coverpage}
                C={C}
              />
              <Bar72
                icon="bookmark"
                label="DESIGNATION"
                value={teacherDesig}
                placeholder="Select Designation (e.g. Assistant Professor)..."
                onPress={() => setDesigModal(true)}
                accentColor={SectorColors.coverpage}
                C={C}
              />
              <InputBar72
                icon="home"
                label="TEACHER DEPARTMENT"
                value={teacherDept}
                onChange={setTeacherDept}
                placeholder="e.g. Computer Science and Engineering"
                accentColor={SectorColors.coverpage}
                C={C}
              />
            </>
          )}

          {/* Section: Submission Date */}
          <View style={[styles.sectionHeader, { marginTop: 14 }]}>
            <Text style={[styles.sectionEyebrow, { color: C.text3, fontFamily: FontFamily.jakartaBold }]}>
              DATE OF SUBMISSION
            </Text>
          </View>
          <InputBar72
            icon="calendar"
            label="SUBMISSION DATE"
            value={dateOfSubmission}
            onChange={setDateOfSubmission}
            placeholder="YYYY-MM-DD"
            accentColor={SectorColors.coverpage}
            C={C}
          />

          {/* Primary Action Button */}
          <TouchableOpacity
            style={[styles.genBtn, { backgroundColor: SectorColors.coverpage }]}
            onPress={handleGenerate}
            disabled={generating}
            activeOpacity={0.85}
          >
            {generating ? (
              <ActivityIndicator color={C.white} size="small" />
            ) : (
              <Feather name="file-text" size={18} color={C.white} />
            )}
            <Text style={[styles.genBtnText, { color: C.white, fontFamily: FontFamily.jakartaBold }]}>
              {generating ? (t.coverpage2?.generating ?? 'Generating PDF…') : 'Generate Official Cover Page'}
            </Text>
          </TouchableOpacity>

          {/* Result Action Bars (72 Size) when generated */}
          {lastPdfUri && (
            <View style={{ marginTop: 18 }}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionEyebrow, { color: SectorColors.coverpage, fontFamily: FontFamily.jakartaBold }]}>
                  READY TO VIEW & EXPORT
                </Text>
              </View>

              {/* View Document Bar */}
              <TouchableOpacity
                style={[styles.childBar72, { backgroundColor: C.surface, borderColor: C.border, borderLeftColor: SectorColors.coverpage }]}
                onPress={() => setViewerVisible(true)}
                activeOpacity={0.75}
              >
                <View style={[styles.toolIcon, { backgroundColor: C.surface2 }]}>
                  <Feather name="eye" size={20} color={SectorColors.coverpage} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.childTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                    View Document
                  </Text>
                  <Text style={[styles.childDesc, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                    Open full-screen interactive preview with zoom & pan
                  </Text>
                </View>
                <Feather name="chevron-right" size={17} color={SectorColors.coverpage} />
              </TouchableOpacity>

              {/* Download Bar */}
              <TouchableOpacity
                style={[styles.childBar72, { backgroundColor: C.surface, borderColor: C.border, borderLeftColor: SectorColors.coverpage }]}
                onPress={handleSaveDevice}
                activeOpacity={0.75}
              >
                <View style={[styles.toolIcon, { backgroundColor: C.surface2 }]}>
                  <Feather name="download" size={20} color={SectorColors.coverpage} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.childTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                    Save to Device / Download
                  </Text>
                  <Text style={[styles.childDesc, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                    Save high-resolution PDF to phone Downloads
                  </Text>
                </View>
                <Feather name="chevron-right" size={17} color={SectorColors.coverpage} />
              </TouchableOpacity>

              {/* Share Bar */}
              <TouchableOpacity
                style={[styles.childBar72, { backgroundColor: C.surface, borderColor: C.border, borderLeftColor: SectorColors.coverpage }]}
                onPress={handleShare}
                activeOpacity={0.75}
              >
                <View style={[styles.toolIcon, { backgroundColor: C.surface2 }]}>
                  <Feather name="share-2" size={20} color={SectorColors.coverpage} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.childTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                    Share Cover Page
                  </Text>
                  <Text style={[styles.childDesc, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                    Send via WhatsApp, Telegram, Google Drive
                  </Text>
                </View>
                <Feather name="chevron-right" size={17} color={SectorColors.coverpage} />
              </TouchableOpacity>

              {/* Direct Print Bar */}
              <TouchableOpacity
                style={[styles.childBar72, { backgroundColor: C.surface, borderColor: C.border, borderLeftColor: SectorColors.coverpage }]}
                onPress={handlePrintDirect}
                activeOpacity={0.75}
              >
                <View style={[styles.toolIcon, { backgroundColor: C.surface2 }]}>
                  <Feather name="printer" size={20} color={SectorColors.coverpage} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.childTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                    Print Directly
                  </Text>
                  <Text style={[styles.childDesc, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                    Send directly to wireless printer or campus xerox
                  </Text>
                </View>
                <Feather name="chevron-right" size={17} color={SectorColors.coverpage} />
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Document Type Picker Sheet (Each item is a 72-size bar) */}
      <BottomSheet visible={docTypeModal} onClose={() => setDocTypeModal(false)} title="Select Document Type" C={C}>
        <FlatList
          data={DOC_TYPES}
          keyExtractor={i => i}
          style={{ maxHeight: 420 }}
          renderItem={({ item }) => {
            const isSel = docType === item;
            return (
              <TouchableOpacity
                style={[
                  styles.childBar72,
                  {
                    backgroundColor: C.surface,
                    borderColor: isSel ? SectorColors.coverpage : C.border,
                    borderLeftColor: SectorColors.coverpage,
                  },
                ]}
                onPress={() => { setDocType(item); setDocTypeModal(false); }}
                activeOpacity={0.75}
              >
                <View style={[styles.toolIcon, { backgroundColor: C.surface2 }]}>
                  <Feather name={docTypeIcon(item)} size={20} color={isSel ? SectorColors.coverpage : C.text2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.childTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                    {docTypeLabel(item)}
                  </Text>
                  <Text style={[styles.childDesc, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                    {docTypeDesc(item)}
                  </Text>
                </View>
                {isSel ? (
                  <Feather name="check" size={18} color={SectorColors.coverpage} />
                ) : (
                  <Feather name="chevron-right" size={17} color={C.textMuted} />
                )}
              </TouchableOpacity>
            );
          }}
        />
      </BottomSheet>

      {/* Course Picker Sheet (Each item is a 72-size bar) */}
      <BottomSheet visible={courseModal} onClose={() => { setCourseModal(false); setCourseSearch(''); }} title="Select Course" C={C}>
        <View style={[styles.sBar, { backgroundColor: C.surface2, borderColor: C.border }]}>
          <Feather name="search" size={18} color={C.textMuted} />
          <TextInput
            style={[styles.sInput, { color: C.text, fontFamily: FontFamily.jakartaRegular }]}
            value={courseSearch}
            onChangeText={setCourseSearch}
            placeholder="Search course code or title..."
            placeholderTextColor={C.textMuted}
            autoFocus
          />
        </View>
        <FlatList
          data={filteredCourses}
          keyExtractor={i => i.code}
          style={{ maxHeight: 380 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.childBar72,
                {
                  backgroundColor: C.surface,
                  borderColor: C.border,
                  borderLeftColor: SectorColors.coverpage,
                },
              ]}
              onPress={() => selectCourse(item)}
              activeOpacity={0.7}
            >
              <View style={[styles.toolIcon, { backgroundColor: C.surface2 }]}>
                <Feather name="book-open" size={18} color={SectorColors.coverpage} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.childTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                  {item.code}
                </Text>
                <Text style={[styles.childDesc, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                  {item.name}
                </Text>
              </View>
              <Feather name="chevron-right" size={17} color={C.textMuted} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={[styles.empty, { color: C.textMuted }]}>No courses found</Text>}
        />
      </BottomSheet>

      {/* Faculty Picker Sheet (Each item is a 72-size bar) */}
      <BottomSheet visible={facultyModal} onClose={() => { setFacultyModal(false); setFacultySearch(''); }} title="Select Faculty / Teacher" C={C}>
        <View style={[styles.sBar, { backgroundColor: C.surface2, borderColor: C.border }]}>
          <Feather name="search" size={18} color={C.textMuted} />
          <TextInput
            style={[styles.sInput, { color: C.text, fontFamily: FontFamily.jakartaRegular }]}
            value={facultySearch}
            onChangeText={setFacultySearch}
            placeholder="Search teacher name..."
            placeholderTextColor={C.textMuted}
            autoFocus
          />
        </View>
        <FlatList
          data={filteredFaculty}
          keyExtractor={i => i.id}
          style={{ maxHeight: 380 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.childBar72,
                {
                  backgroundColor: C.surface,
                  borderColor: C.border,
                  borderLeftColor: SectorColors.coverpage,
                },
              ]}
              onPress={() => selectTeacher(item)}
              activeOpacity={0.7}
            >
              <Avatar uri={item.photo_url} name={item.name} size="sm" />
              <View style={{ flex: 1, marginLeft: 4 }}>
                <Text style={[styles.childTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={[styles.childDesc, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                  {(item.dept_name ?? '').replace(/^Department of\s*/i, '')}{item.designation ? ` · ${item.designation}` : ''}
                </Text>
              </View>
              <Feather name="chevron-right" size={17} color={C.textMuted} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={[styles.empty, { color: C.textMuted }]}>No teachers found</Text>}
        />
      </BottomSheet>

      {/* Program Picker Sheet (Each item is a 72-size bar) */}
      <BottomSheet visible={deptModal} onClose={() => setDeptModal(false)} title="Select Program / Degree" C={C}>
        <FlatList
          data={departments}
          keyExtractor={i => i.id}
          style={{ maxHeight: 380 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.childBar72,
                {
                  backgroundColor: C.surface,
                  borderColor: C.border,
                  borderLeftColor: SectorColors.coverpage,
                },
              ]}
              onPress={() => selectProgram(item)}
              activeOpacity={0.7}
            >
              <View style={[styles.toolIcon, { backgroundColor: C.surface2 }]}>
                <Feather name="award" size={18} color={SectorColors.coverpage} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.childTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                  {item.name.replace(/^Department of\s*/i, '')}
                </Text>
              </View>
              <Feather name="chevron-right" size={17} color={C.textMuted} />
            </TouchableOpacity>
          )}
        />
      </BottomSheet>

      {/* Designation Picker Sheet (Each item is a 72-size bar) */}
      <BottomSheet visible={desigModal} onClose={() => setDesigModal(false)} title="Select Designation" C={C}>
        <FlatList
          data={DESIGNATIONS}
          keyExtractor={i => i}
          style={{ maxHeight: 380 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.childBar72,
                {
                  backgroundColor: C.surface,
                  borderColor: C.border,
                  borderLeftColor: SectorColors.coverpage,
                },
              ]}
              onPress={() => { setTeacherDesig(item); setDesigModal(false); }}
              activeOpacity={0.7}
            >
              <View style={[styles.toolIcon, { backgroundColor: C.surface2 }]}>
                <Feather name="bookmark" size={18} color={SectorColors.coverpage} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.childTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                  {item}
                </Text>
              </View>
              <Feather name="chevron-right" size={17} color={C.textMuted} />
            </TouchableOpacity>
          )}
        />
      </BottomSheet>

      {/* In-App Fullscreen Interactive PDF Viewer Modal */}
      <CampusPdfViewerModal
        visible={viewerVisible}
        onClose={() => setViewerVisible(false)}
        title="BUBT Cover Page"
        subtitle={docTypeLabel(docType)}
        fileUrl={lastPdfUri}
        fileName={`BUBT_${docTypeLabel(docType)}.pdf`}
      />
    </SafeAreaView>
  );
}

// 72-Size Clickable Bar Component
function Bar72({
  icon, label, value, desc, placeholder, onPress, accentColor, badge, onBadge, C,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value?: string;
  desc?: string;
  placeholder?: string;
  onPress?: () => void;
  accentColor?: string;
  badge?: string;
  onBadge?: () => void;
  C: any;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.bar72,
        {
          backgroundColor: C.surface,
          borderColor: C.border,
          borderLeftColor: accentColor ?? SectorColors.coverpage,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.toolIcon, { backgroundColor: C.surface2 }]}>
        <Feather name={icon} size={20} color={C.text2} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.barLabel, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
          {label}
        </Text>
        <Text style={[styles.barValue, { color: value ? C.text : C.textMuted, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
          {value || placeholder || ''}
        </Text>
        {desc && !value ? (
          <Text style={[styles.barDesc, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
            {desc}
          </Text>
        ) : null}
      </View>
      {badge ? (
        <TouchableOpacity style={[styles.badgePill, { backgroundColor: pillBg(Accent.teal, false) }]} onPress={onBadge}>
          <Feather name="zap" size={11} color={Accent.teal} />
          <Text style={[styles.badgeTxt, { color: Accent.teal, fontFamily: FontFamily.jakartaBold }]}>{badge}</Text>
        </TouchableOpacity>
      ) : (
        <Feather name="chevron-down" size={18} color={C.textMuted} />
      )}
    </TouchableOpacity>
  );
}

// 72-Size Editable Input Bar Component
function InputBar72({
  icon, label, value, onChange, placeholder, accentColor, keyboardType, C,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  accentColor?: string;
  keyboardType?: 'default' | 'numeric';
  C: any;
}) {
  return (
    <View
      style={[
        styles.bar72,
        {
          backgroundColor: C.surface,
          borderColor: C.border,
          borderLeftColor: accentColor ?? SectorColors.coverpage,
        },
      ]}
    >
      <View style={[styles.toolIcon, { backgroundColor: C.surface2 }]}>
        <Feather name={icon} size={20} color={C.text2} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.barLabel, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
          {label}
        </Text>
        <TextInput
          style={[styles.barInput, { color: C.text, fontFamily: FontFamily.jakartaSemiBold }]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={C.textMuted}
          keyboardType={keyboardType ?? 'default'}
        />
      </View>
    </View>
  );
}

// BottomSheet helper
function BottomSheet({
  visible, onClose, title, C, children,
}: {
  visible: boolean; onClose: () => void; title: string; C: any; children: React.ReactNode;
}) {
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

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  scroll: { paddingBottom: 24, paddingTop: 10 } as ViewStyle,

  sectionHeader: {
    paddingTop: 4,
    paddingBottom: 4,
    paddingHorizontal: 2,
    marginBottom: 6,
  } as ViewStyle,

  sectionEyebrow: {
    fontSize: 11,
    letterSpacing: 0.8,
  } as any,

  // 72-Size Bar (Matches Explore tool cards)
  bar72: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    height: 72,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderLeftWidth: 4.5,
    marginBottom: 10,
  } as ViewStyle,

  // 72-Size Child / Action Bar
  childBar72: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    height: 72,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderLeftWidth: 4.5,
    marginBottom: 8,
  } as ViewStyle,

  toolIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  barLabel: {
    fontSize: 11,
    lineHeight: 15,
  } as any,

  barValue: {
    fontSize: 14.5,
    lineHeight: 20,
    marginTop: 2,
  } as any,

  barDesc: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 1,
  } as any,

  barInput: {
    fontSize: 14.5,
    lineHeight: 20,
    padding: 0,
    marginTop: 2,
  } as any,

  childTitle: {
    fontSize: 14.5,
    lineHeight: 20,
  } as any,

  childDesc: {
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 2,
  } as any,

  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  } as ViewStyle,

  badgeTxt: {
    fontSize: 11,
  } as any,

  tCard: {
    width: 124,
    borderRadius: Radius.md,
    marginRight: Spacing[3],
    overflow: 'hidden',
  } as ViewStyle,

  tImg: {
    width: '100%',
    height: 160,
  } as any,

  bigPrev: {
    width: '100%',
    height: 460,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginTop: Spacing[2],
    marginBottom: Spacing[3],
  } as any,

  chk: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  freeBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  } as ViewStyle,

  freeTxt: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  } as any,

  tLabel: {
    textAlign: 'center',
    fontSize: FontSize.xs,
    paddingVertical: Spacing[2],
  } as any,

  delMember: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  genBtn: {
    flexDirection: 'row',
    height: 58,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    marginTop: Spacing[4],
  } as ViewStyle,

  genBtnText: {
    fontSize: FontSize.lg,
  } as any,

  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  } as ViewStyle,

  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Layout.screenPadding,
    paddingBottom: Layout.screenPadding,
    maxHeight: '82%',
  } as ViewStyle,

  handle: {
    alignItems: 'center',
    paddingVertical: Spacing[3],
  } as ViewStyle,

  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
  } as ViewStyle,

  sheetTitle: {
    fontSize: FontSize['2xl'],
    textAlign: 'center',
    marginBottom: Spacing[3],
  } as any,

  sBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: Spacing[3],
  } as ViewStyle,

  sInput: {
    flex: 1,
    fontSize: 14.5,
    padding: 0,
  } as any,

  empty: {
    textAlign: 'center',
    marginVertical: Spacing[6],
    fontSize: FontSize.base,
  } as any,

  closeBtn: {
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing[3],
  } as ViewStyle,

  closeTxt: {
    fontSize: FontSize.base,
  } as any,
});
