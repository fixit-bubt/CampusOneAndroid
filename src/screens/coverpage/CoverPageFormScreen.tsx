import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert,
  TextInput, KeyboardAvoidingView, ActivityIndicator,
  Modal, FlatList, Image, Platform, BackHandler,
  type ViewStyle, type TextStyle,
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
import { AnimatedIcon } from '../../components/ui/AnimatedIcon';
import { supabase } from '../../lib/supabase';
import { localToday } from '../../utils/format';
import { FontFamily, FontSize, Layout, Radius, Spacing, SectorColors, Accent, pillBg } from '../../theme';
import { sharePdf, savePdfToDevice, saveLatestCoverPage } from '../../services/pdf/pdfFiles';
import { CampusPdfViewerModal } from '../../components/pdf/CampusPdfViewerModal';
import { getCache, setCache, CacheKeys } from '../../services/cacheService';
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
  short_code?: string | null;
}

function getDeptIcon(name: string): keyof typeof Feather.glyphMap {
  const s = (name ?? '').toLowerCase();
  if (s.includes('computer') || s.includes('cse')) return 'cpu';
  if (s.includes('electrical') || s.includes('eee')) return 'zap';
  if (s.includes('business') || s.includes('bba') || s.includes('management') || s.includes('marketing') || s.includes('finance') || s.includes('accounting')) return 'briefcase';
  if (s.includes('english')) return 'book-open';
  if (s.includes('law')) return 'shield';
  if (s.includes('civil')) return 'compass';
  if (s.includes('textile')) return 'layers';
  if (s.includes('economics')) return 'pie-chart';
  if (s.includes('mathematics') || s.includes('math') || s.includes('statistics')) return 'grid';
  return 'award';
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

function cleanDeptName(name: string): string {
  return (name ?? '').replace(/^(Department|Dept\.?)\s*(of)?\s*/i, '').trim();
}

function fmtDesig(d: string): string {
  const clean = (d ?? '').trim().replace(/^\(+/, '').replace(/\)+$/, '').trim();
  return clean ? `(${esc(clean)})` : '';
}

function rawDesig(d: string): string {
  return (d ?? '').trim().replace(/^\(+/, '').replace(/\)+$/, '').trim();
}

const DEFAULT_BUBT_DEPARTMENTS: { id: string; name: string }[] = [
  { id: 'cse', name: 'Computer Science and Engineering' },
  { id: 'eee', name: 'Electrical and Electronic Engineering' },
  { id: 'textile', name: 'Textile Engineering' },
  { id: 'civil', name: 'Civil Engineering' },
  { id: 'bba', name: 'Business Administration' },
  { id: 'law', name: 'Law and Human Rights' },
  { id: 'english', name: 'English' },
  { id: 'economics', name: 'Economics' },
  { id: 'math', name: 'Mathematics and Statistics' },
];

const DEFAULT_BUBT_COURSES: { code: string; name: string }[] = [
  { code: 'CSE 101', name: 'Structured Programming Language' },
  { code: 'CSE 102', name: 'Structured Programming Language Practical' },
  { code: 'CSE 111', name: 'Object Oriented Programming' },
  { code: 'CSE 112', name: 'Object Oriented Programming Practical' },
  { code: 'CSE 201', name: 'Discrete Mathematics' },
  { code: 'CSE 207', name: 'Data Structures' },
  { code: 'CSE 208', name: 'Data Structures Practical' },
  { code: 'CSE 209', name: 'Algorithms' },
  { code: 'CSE 210', name: 'Algorithms Practical' },
  { code: 'CSE 215', name: 'Database Management Systems' },
  { code: 'CSE 216', name: 'Database Management Systems Practical' },
  { code: 'CSE 301', name: 'Operating Systems' },
  { code: 'CSE 302', name: 'Operating Systems Practical' },
  { code: 'CSE 305', name: 'Computer Architecture' },
  { code: 'CSE 311', name: 'Software Engineering' },
  { code: 'CSE 313', name: 'Computer Networks' },
  { code: 'CSE 314', name: 'Computer Networks Practical' },
  { code: 'CSE 400', name: 'Project / Thesis' },
  { code: 'EEE 101', name: 'Electrical Circuits I' },
  { code: 'EEE 102', name: 'Electrical Circuits I Laboratory' },
  { code: 'MAT 101', name: 'Differential and Integral Calculus' },
  { code: 'PHY 101', name: 'Physics I' },
  { code: 'ENG 101', name: 'English Language Skills' },
];

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
        ${f.teacherDesig ? `<div class="desig">${fmtDesig(f.teacherDesig)}</div>` : '<div class="gap"></div>'}
        <div class="gap"></div>
        <div class="row">Dept. of ${valOrBlank(cleanDeptName(f.dept))}</div>
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
  const deptClean = cleanDeptName(f.dept);
  const progClean = cleanDeptName(f.program);
  const inner = `<img class="hdr" src="${f.logoHeader}" />
    ${labelBlock(cfg, 'PROJECT REPORT')}
    <div class="ptitle">${valOrBlank(f.reportTitle, 'TITLE OF THE PROJECT REPORT')}</div>
    <div class="cc">Course Title : ${valOrBlank(f.courseTitle)}</div>
    <div class="cc">Course Code : ${valOrBlank(f.courseCode, '____________')}</div>
    <div class="subh">Submitted to:</div>
    <div class="ctrb">${valOrBlank(f.teacherName)}</div>
    ${f.teacherDesig ? `<div class="ctr">${fmtDesig(f.teacherDesig)}</div>` : ''}
    <div class="ctr">Department of ${valOrBlank(deptClean)}</div>
    <div class="ctr">${e(UNI)} (BUBT)</div>
    <div class="subh">Submitted by:</div>
    <table class="mt"><tr><th>Sl No</th><th>Name</th><th>ID</th></tr>${rows}</table>
    <div class="ctr" style="margin-top:10px">Intake : ${valOrBlank(f.intake, '____')}, Section : ${valOrBlank(f.section, '____')}</div>
    <div class="ctr">${valOrBlank(progClean)}</div>
    <div class="ctr">${e(UNI)} (BUBT)</div>
    <div class="date">Date of Submission : ${valOrBlank(f.date, '____ / ____ / 2026')}</div>`;
  return wrap(cfg, inner);
}

function bodyInternship(f: HtmlData): string {
  const cfg = styleCfg('default');
  const e = esc;
  const deptClean = cleanDeptName(f.dept);
  const progClean = cleanDeptName(f.program);
  const inner = `<div class="utitle">${e(UNI)} (BUBT)</div>
    <img class="crest" src="${f.logoCrest}" />
    <div class="ititle">Internship Report<br/>on<br/><b>${valOrBlank(f.reportTitle, 'INTERNSHIP TOPIC')}</b></div>
    ${f.company ? `<div class="ctrb" style="margin-bottom:4px">${e(f.company)}</div>` : ''}
    ${f.duration ? `<div class="ctr" style="margin-bottom:6px">Duration: ${e(f.duration)}</div>` : ''}
    <div class="subh2">Supervised By</div>
    <div class="ctrb">${valOrBlank(f.teacherName)}</div>
    ${f.teacherDesig ? `<div class="ctr">${e(rawDesig(f.teacherDesig))}</div>` : ''}
    <div class="ctr">Department of ${valOrBlank(deptClean)}</div>
    <div class="ctr">${e(UNI)} (BUBT)</div>
    <div class="subh2">Submitted By</div>
    <div class="ctrb">${valOrBlank(f.studentName)}</div>
    <div class="ctr">ID: ${valOrBlank(f.studentId, '____________________')}</div>
    <div class="ctr">Intake: ${valOrBlank(f.intake, '________')}</div>
    <div class="ctr">Program: ${valOrBlank(progClean)}</div>
    <div class="ctr">Section: ${valOrBlank(f.section, '____')}</div>
    <div class="ctr">Department of ${valOrBlank(deptClean)}</div>
    <div class="ctr">${e(UNI)} (BUBT)</div>
    <div class="date">Date of Submission : ${valOrBlank(f.date, '____ / ____ / 2026')}</div>`;
  return wrap(cfg, inner);
}

function bodyIndex(f: HtmlData): string {
  const cfg = styleCfg('classic');
  const e = esc;
  const ul = (v: string) => `<u>&nbsp;${e(v) || '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'}&nbsp;</u>`;
  let rows = '';
  const n = Math.min(Math.max(f.indexRows || 15, 1), 20);
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
  const [department, setDepartment] = useState(cleanDeptName(profile?.department ?? ''));
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
  const [courseList, setCourseList] = useState<{ code: string; name: string }[]>(DEFAULT_BUBT_COURSES);
  const [courseModal, setCourseModal] = useState(false);
  const [courseSearch, setCourseSearch] = useState('');
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>(DEFAULT_BUBT_DEPARTMENTS);
  const [deptModal, setDeptModal] = useState(false);
  const [desigModal, setDesigModal] = useState(false);

  // Late Profile Hydration Watcher (when AsyncStorage profile loads after mount)
  useEffect(() => {
    if (profile) {
      if (!studentName && profile.full_name) setStudentName(profile.full_name);
      if (!studentId && profile.student_id) setStudentId(profile.student_id);
      if (!department && profile.department) setDepartment(cleanDeptName(profile.department));
      if (!intake && profile.intake) setIntake(profile.intake);
      if (!section && profile.section) setSection(profile.section);
      if (!program && profile.program) setProgram(profile.program);
    }
  }, [profile]);

  // Offline-First Data Loading: Instant Cache/Fallback Hydration + Background Fresh Network Sync
  useEffect(() => {
    let isMounted = true;
    (async () => {
      // 1. Instant Cache Hydration
      try {
        const [cDepts, cCourses, cFaculty] = await Promise.all([
          getCache<{ id: string; name: string }[]>(CacheKeys.COVER_DEPTS),
          getCache<{ code: string; name: string }[]>(CacheKeys.COVER_COURSES),
          getCache<FacultyRow[]>(CacheKeys.COVER_FACULTY),
        ]);
        if (isMounted) {
          if (cDepts && cDepts.length > 0) setDepartments(cDepts);
          if (cCourses && cCourses.length > 0) setCourseList(cCourses);
          if (cFaculty && cFaculty.length > 0) setFacultyList(cFaculty);
        }
      } catch {
        // Fallbacks already initialized in state
      }

      // 2. Fresh Network Sync (safely catches when device is offline)
      try {
        const [fR, dR, cR] = await Promise.all([
          supabase.from('faculty').select('id, name, designation, department_id, photo_url, short_code').eq('on_leave', false).order('name').limit(1000),
          supabase.from('departments').select('id, name').order('name'),
          supabase.from('courses').select('code, name').order('code').limit(1000),
        ]);
        if (!isMounted) return;

        let dm = new Map<string, string>();
        if (dR.data && dR.data.length > 0) {
          const depts = dR.data as { id: string; name: string }[];
          setDepartments(depts);
          setCache(CacheKeys.COVER_DEPTS, depts);
          dm = new Map(depts.map(d => [d.id, d.name]));
        }

        if (dm.size === 0) {
          DEFAULT_BUBT_DEPARTMENTS.forEach(d => dm.set(d.id, d.name));
        }

        if (fR.data && fR.data.length > 0) {
          const fac = (fR.data as FacultyRow[]).map(f => ({ ...f, dept_name: dm.get(f.department_id) ?? '' }));
          setFacultyList(fac);
          setCache(CacheKeys.COVER_FACULTY, fac);
        }

        if (cR.data && cR.data.length > 0) {
          const courses = cR.data as { code: string; name: string }[];
          setCourseList(courses);
          setCache(CacheKeys.COVER_COURSES, courses);
        }
      } catch {
        // Device is offline - cache or default datasets remain active with zero interruption
      }
    })();
    return () => { isMounted = false; };
  }, []);

  // Hardware and gesture back button dismisses active bottom sheet modal immediately
  useEffect(() => {
    const onBackPress = () => {
      if (viewerVisible) {
        setViewerVisible(false);
        return true;
      }
      if (facultyModal) {
        setFacultyModal(false);
        setFacultySearch('');
        return true;
      }
      if (courseModal) {
        setCourseModal(false);
        setCourseSearch('');
        return true;
      }
      if (deptModal) {
        setDeptModal(false);
        return true;
      }
      if (desigModal) {
        setDesigModal(false);
        return true;
      }
      if (docTypeModal) {
        setDocTypeModal(false);
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [viewerVisible, facultyModal, courseModal, deptModal, desigModal, docTypeModal]);

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
    const dn = cleanDeptName(f.dept_name ?? '');
    if (dn) setTeacherDept(dn);
    if (dn && !department) setDepartment(dn);
    setFacultyModal(false);
    setFacultySearch('');
  }

  function selectProgram(d: { id: string; name: string }) {
    const s = cleanDeptName(d.name);
    setProgram(s);
    if (!department) setDepartment(s);
    setDeptModal(false);
  }

  function updateMember(i: number, patch: Partial<Member>) {
    setMembers(prev => prev.map((m, idx) => idx === i ? { ...m, ...patch } : m));
  }
  function addMember() {
    setMembers(prev => {
      if (prev.length >= 6) return prev;
      return [...prev, { key: `m-${Date.now()}-${prev.length}`, name: '', id: '' }];
    });
  }
  function removeMember(i: number) {
    setMembers(prev => prev.filter((_, idx) => idx !== i));
  }

  const filteredFaculty = useMemo(() => {
    const rawQ = facultySearch.trim().toLowerCase();
    if (!rawQ) return facultyList;
    const cleanQ = rawQ.replace(/[^a-z0-9]/g, '');
    const words = rawQ.split(/[\s.]+/).filter(Boolean);

    return facultyList.filter(f => {
      const lowerName = (f.name || '').toLowerCase();
      const cleanName = lowerName.replace(/[^a-z0-9]/g, '');
      const lowerCode = (f.short_code || '').toLowerCase();
      const cleanCode = lowerCode.replace(/[^a-z0-9]/g, '');
      const dept = (f.dept_name || '').toLowerCase();
      const cleanDept = dept.replace(/[^a-z0-9]/g, '');
      const desig = (f.designation || '').toLowerCase();

      // 1. Direct name match (exact substring OR punctuation-stripped e.g. "Md.As" -> "mdashikkhan")
      const nameMatch = lowerName.includes(rawQ) || (cleanQ.length > 0 && cleanName.includes(cleanQ));

      // 2. Multi-word token match (e.g. "Md As" or "Ashik Khan" or "Md Ashik" matching "Md. Ashik Khan")
      const allWordsMatch = words.length > 1 && words.every(w => {
        const cw = w.replace(/[^a-z0-9]/g, '');
        return lowerName.includes(w) || cleanName.includes(cw) || lowerCode.includes(cw);
      });

      // 3. Short routine code match (e.g. MDAK, MDAR, SR)
      const codeMatch = Boolean(
        cleanCode &&
        cleanQ.length > 0 &&
        (lowerCode.includes(rawQ) || cleanCode.includes(cleanQ) || cleanQ.includes(cleanCode))
      );

      // 4. Department match (e.g. "CSE", "EEE", "Computer Science")
      const deptMatch = dept.includes(rawQ) || (cleanQ.length > 0 && cleanDept.includes(cleanQ));

      // 5. Designation match (e.g. "Professor", "Lecturer")
      const desigMatch = desig.includes(rawQ);

      return nameMatch || allWordsMatch || codeMatch || deptMatch || desigMatch;
    });
  }, [facultySearch, facultyList]);

  const filteredCourses = useMemo(() => {
    const rawQ = courseSearch.trim().toLowerCase();
    if (!rawQ) return courseList;
    const cleanQ = rawQ.replace(/[^a-z0-9]/g, '');
    const words = rawQ.split(/[\s.]+/).filter(Boolean);

    return courseList.filter(c => {
      const lowerCode = (c.code || '').toLowerCase();
      const cleanCode = lowerCode.replace(/[^a-z0-9]/g, '');
      const lowerName = (c.name || '').toLowerCase();
      const cleanName = lowerName.replace(/[^a-z0-9]/g, '');

      const codeMatch = lowerCode.includes(rawQ) || (cleanQ.length > 0 && cleanCode.includes(cleanQ));
      const nameMatch = lowerName.includes(rawQ) || (cleanQ.length > 0 && cleanName.includes(cleanQ));
      const allWordsMatch = words.length > 1 && words.every(w => {
        const cw = w.replace(/[^a-z0-9]/g, '');
        return lowerCode.includes(w) || cleanCode.includes(cw) || lowerName.includes(w) || cleanName.includes(cw);
      });

      return codeMatch || nameMatch || allWordsMatch;
    });
  }, [courseSearch, courseList]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const dept = cleanDeptName(teacherDept.trim() || department.trim() || program.trim() || 'Computer Science and Engineering');
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
      const coverLabel = courseCode.trim()
        ? `${docTypeLabel(docType)} · ${courseCode.trim()}`
        : docTypeLabel(docType);
      await saveLatestCoverPage(uri, coverLabel).catch(() => {});
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
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding, paddingBottom: 100 }]}
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
            statValue="5"
            statLabel="TYPES"
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
                      style={[styles.tCard, { borderColor: a ? C.text : C.border, borderWidth: a ? 2 : 1, backgroundColor: C.surface }]}
                      onPress={() => setTemplate(tmpl)}
                      activeOpacity={0.8}
                    >
                      <Image source={previewFor(docType, tmpl)} style={styles.tImg} resizeMode="contain" />
                      {a && (
                        <View style={[styles.chk, { backgroundColor: C.text }]}>
                          <Feather name="check" size={12} color={C.bg} />
                        </View>
                      )}
                      <View style={[styles.freeBadge, { backgroundColor: Accent.teal }]}>
                        <Text style={styles.freeTxt}>FREE</Text>
                      </View>
                      <Text style={[styles.tLabel, { color: a ? C.text : C.text2, fontFamily: a ? FontFamily.jakartaBold : FontFamily.jakartaMedium }]}>
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
                statValue={courseCode ? courseCode.split(' ')[0] : 'CRS'}
                statLabel={courseCode ? 'ACTIVE' : 'AUTOFILL'}
                C={C}
              />
              <InputBar72
                icon="hash"
                label="COURSE CODE"
                value={courseCode}
                onChange={setCourseCode}
                placeholder="e.g. CSE 111"
                C={C}
              />
              <InputBar72
                icon="book-open"
                label="COURSE TITLE"
                value={courseTitle}
                onChange={setCourseTitle}
                placeholder="e.g. Structured Programming Language"
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
                C={C}
              />
              <Bar72
                icon="search"
                label="OPTIONAL COURSE AUTOFILL"
                value={courseCode ? `${courseCode} · ${courseTitle}` : ''}
                placeholder="Tap to autofill course (optional)..."
                onPress={() => setCourseModal(true)}
                statValue={courseCode ? courseCode.split(' ')[0] : 'CRS'}
                statLabel={courseCode ? 'ACTIVE' : 'AUTOFILL'}
                C={C}
              />
              <InputBar72
                icon="hash"
                label="COURSE CODE"
                value={courseCode}
                onChange={setCourseCode}
                placeholder="Course code (optional)"
                C={C}
              />
              <InputBar72
                icon="book-open"
                label="COURSE TITLE"
                value={courseTitle}
                onChange={setCourseTitle}
                placeholder="Course title (optional)"
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
                    C={C}
                  />
                  <InputBar72
                    icon="calendar"
                    label="DURATION"
                    value={duration}
                    onChange={setDuration}
                    placeholder="e.g. 3 Months (Jan 2026 - Mar 2026)"
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
                C={C}
              />
              <InputBar72
                icon="file-text"
                label="ASSIGNMENT TOPIC"
                value={experimentName}
                onChange={setExperimentName}
                placeholder="e.g. Memory Management & Pointers (optional)"
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
                C={C}
              />
              <InputBar72
                icon="hash"
                label="EXPERIMENT NO"
                value={assignmentNo}
                onChange={setAssignmentNo}
                placeholder="e.g. 01 or 03"
                C={C}
              />
              <InputBar72
                icon="layers"
                label="EXPERIMENT NAME"
                value={experimentName}
                onChange={setExperimentName}
                placeholder="e.g. Study of Logic Gates and Implementation"
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
            C={C}
          />
          <InputBar72
            icon="credit-card"
            label="STUDENT ID"
            value={studentId}
            onChange={setStudentId}
            placeholder="e.g. 22235103199"
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
                C={C}
              />
            </View>
          </View>
          {docType !== 'index_page' && (
            <Bar72
              icon={getDeptIcon(program || department)}
              label="PROGRAM / DEGREE"
              value={program}
              placeholder="Select Program / Degree..."
              onPress={() => setDeptModal(true)}
              statValue="DEPT"
              statLabel="SELECT"
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
                <View key={m.key ?? `m-${i}`} style={[styles.bar72, { backgroundColor: C.surface, borderColor: C.border, marginBottom: 8 }]}>
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
              {members.length < 6 ? (
                <TouchableOpacity
                  style={[styles.childBar72, { backgroundColor: C.surface, borderColor: C.border, borderStyle: 'dashed' }]}
                  onPress={addMember}
                  activeOpacity={0.8}
                >
                  <View style={[styles.toolIcon, { backgroundColor: C.surface2 }]}>
                    <AnimatedIcon family="feather" name="plus" size={18} color={C.text} animation="entrance" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.childTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                      Add Group Member
                    </Text>
                    <Text style={[styles.childDesc, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]}>
                      Add up to 6 project teammates with ID
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={17} color={C.textMuted} />
                </TouchableOpacity>
              ) : (
                <View style={[styles.childBar72, { backgroundColor: C.surface, borderColor: C.border, opacity: 0.75 }]}>
                  <View style={[styles.toolIcon, { backgroundColor: C.surface2 }]}>
                    <Feather name="info" size={17} color={C.textMuted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.childTitle, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>
                      Maximum Group Size Reached
                    </Text>
                    <Text style={[styles.childDesc, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]}>
                      Limited to 6 members to fit standard single-page format
                    </Text>
                  </View>
                </View>
              )}
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
                statValue={teacherName ? 'FAC' : 'DIR'}
                statLabel={teacherName ? 'ACTIVE' : 'AUTOFILL'}
                C={C}
              />
              <InputBar72
                icon="user"
                label="TEACHER NAME"
                value={teacherName}
                onChange={setTeacherName}
                placeholder="Teacher Name"
                C={C}
              />
              <Bar72
                icon="bookmark"
                label="DESIGNATION"
                value={teacherDesig}
                placeholder="Select Designation (e.g. Assistant Professor)..."
                onPress={() => setDesigModal(true)}
                statValue="ROLE"
                statLabel="SELECT"
                C={C}
              />
              <InputBar72
                icon="home"
                label="TEACHER DEPARTMENT"
                value={teacherDept}
                onChange={setTeacherDept}
                placeholder="e.g. Computer Science and Engineering"
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
                <Text style={[styles.sectionEyebrow, { color: C.text3, fontFamily: FontFamily.jakartaBold }]}>
                  READY TO VIEW & EXPORT
                </Text>
              </View>

              {/* View Document Bar */}
              <TouchableOpacity
                style={[styles.childBar72, { backgroundColor: C.surface, borderColor: C.border }]}
                onPress={() => setViewerVisible(true)}
                activeOpacity={0.75}
              >
                <View style={[styles.toolIcon, { backgroundColor: C.surface2 }]}>
                  <AnimatedIcon family="feather" name="eye" size={20} color={C.text} animation="entrance" delay={0} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.childTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                    View Document
                  </Text>
                  <Text style={[styles.childDesc, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                    Open full-screen interactive preview with zoom & pan
                  </Text>
                </View>
                <Feather name="chevron-right" size={17} color={C.textMuted} />
              </TouchableOpacity>

              {/* Download Bar */}
              <TouchableOpacity
                style={[styles.childBar72, { backgroundColor: C.surface, borderColor: C.border }]}
                onPress={handleSaveDevice}
                activeOpacity={0.75}
              >
                <View style={[styles.toolIcon, { backgroundColor: C.surface2 }]}>
                  <AnimatedIcon family="feather" name="download" size={20} color={C.text} animation="entrance" delay={40} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.childTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                    Save to Device / Download
                  </Text>
                  <Text style={[styles.childDesc, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                    Save high-resolution PDF to phone Downloads
                  </Text>
                </View>
                <Feather name="chevron-right" size={17} color={C.textMuted} />
              </TouchableOpacity>

              {/* Share Bar */}
              <TouchableOpacity
                style={[styles.childBar72, { backgroundColor: C.surface, borderColor: C.border }]}
                onPress={handleShare}
                activeOpacity={0.75}
              >
                <View style={[styles.toolIcon, { backgroundColor: C.surface2 }]}>
                  <AnimatedIcon family="feather" name="share-2" size={20} color={C.text} animation="entrance" delay={80} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.childTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                    Share Cover Page
                  </Text>
                  <Text style={[styles.childDesc, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                    Send via WhatsApp, Telegram, Google Drive
                  </Text>
                </View>
                <Feather name="chevron-right" size={17} color={C.textMuted} />
              </TouchableOpacity>

              {/* Direct Print Bar */}
              <TouchableOpacity
                style={[styles.childBar72, { backgroundColor: C.surface, borderColor: C.border }]}
                onPress={handlePrintDirect}
                activeOpacity={0.75}
              >
                <View style={[styles.toolIcon, { backgroundColor: C.surface2 }]}>
                  <AnimatedIcon family="feather" name="printer" size={20} color={C.text} animation="entrance" delay={120} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.childTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                    Print Directly
                  </Text>
                  <Text style={[styles.childDesc, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                    Send directly to wireless printer or campus xerox
                  </Text>
                </View>
                <Feather name="chevron-right" size={17} color={C.textMuted} />
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
          keyboardShouldPersistTaps="handled"
          renderItem={({ item, index }) => {
            const isSel = docType === item;
            return (
              <TouchableOpacity
                style={[
                  styles.childBar72,
                  {
                    backgroundColor: C.surface,
                    borderColor: isSel ? C.text : C.border,
                  },
                ]}
                onPress={() => { setDocType(item); setDocTypeModal(false); }}
                activeOpacity={0.75}
              >
                <View style={[styles.toolIcon, { backgroundColor: C.surface2 }]}>
                  <AnimatedIcon
                    family="feather"
                    name={docTypeIcon(item)}
                    size={20}
                    color={C.text}
                    animation="entrance"
                    delay={index * 35}
                  />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.childTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                    {docTypeLabel(item)}
                  </Text>
                  <Text style={[styles.childDesc, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                    {docTypeDesc(item)}
                  </Text>
                </View>
                {isSel ? (
                  <Feather name="check" size={18} color={C.text} />
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
          />
          {courseSearch.length > 0 && (
            <TouchableOpacity onPress={() => setCourseSearch('')} hitSlop={8}>
              <Feather name="x-circle" size={16} color={C.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <FlatList
          data={filteredCourses}
          keyExtractor={i => i.code}
          style={{ maxHeight: 380 }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item, index }) => (
            <TouchableOpacity
              style={[
                styles.childBar72,
                {
                  backgroundColor: C.surface,
                  borderColor: C.border,
                },
              ]}
              onPress={() => selectCourse(item)}
              activeOpacity={0.7}
            >
              <View style={[styles.toolIcon, { backgroundColor: C.surface2 }]}>
                <AnimatedIcon
                  family="feather"
                  name="book-open"
                  size={18}
                  color={C.text}
                  animation="entrance"
                  delay={Math.min(index, 8) * 35}
                />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
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

      {/* Faculty Picker Sheet (Each item is a 72-size bar with teacher avatar & routine short code) */}
      <BottomSheet visible={facultyModal} onClose={() => { setFacultyModal(false); setFacultySearch(''); }} title="Select Faculty / Teacher" C={C}>
        <View style={[styles.sBar, { backgroundColor: C.surface2, borderColor: C.border }]}>
          <Feather name="search" size={18} color={C.textMuted} />
          <TextInput
            style={[styles.sInput, { color: C.text, fontFamily: FontFamily.jakartaRegular }]}
            value={facultySearch}
            onChangeText={setFacultySearch}
            placeholder="Search by teacher name or short code..."
            placeholderTextColor={C.textMuted}
          />
          {facultySearch.length > 0 && (
            <TouchableOpacity onPress={() => setFacultySearch('')} hitSlop={8}>
              <Feather name="x-circle" size={16} color={C.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <FlatList
          data={filteredFaculty}
          keyExtractor={i => i.id}
          style={{ maxHeight: 380 }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.childBar72,
                {
                  backgroundColor: C.surface,
                  borderColor: C.border,
                },
              ]}
              onPress={() => selectTeacher(item)}
              activeOpacity={0.7}
            >
              <Avatar uri={item.photo_url} name={item.name} size="md" />
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.childTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {item.short_code ? (
                    <View style={[styles.codeBadge, { backgroundColor: C.surface2, borderColor: C.border, borderWidth: 1 }]}>
                      <Text style={[styles.codeBadgeTxt, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
                        {item.short_code}
                      </Text>
                    </View>
                  ) : null}
                </View>
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

      {/* Program Picker Sheet (Each item is a 72-size bar with official vector icon) */}
      <BottomSheet visible={deptModal} onClose={() => setDeptModal(false)} title="Select Program / Degree" C={C}>
        <FlatList
          data={departments}
          keyExtractor={i => i.id}
          style={{ maxHeight: 380 }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item, index }) => (
            <TouchableOpacity
              style={[
                styles.childBar72,
                {
                  backgroundColor: C.surface,
                  borderColor: C.border,
                },
              ]}
              onPress={() => selectProgram(item)}
              activeOpacity={0.7}
            >
              <View style={[styles.toolIcon, { backgroundColor: C.surface2 }]}>
                <AnimatedIcon
                  family="feather"
                  name={getDeptIcon(item.name)}
                  size={18}
                  color={C.text}
                  animation="entrance"
                  delay={Math.min(index, 8) * 35}
                />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
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
          keyboardShouldPersistTaps="handled"
          renderItem={({ item, index }) => (
            <TouchableOpacity
              style={[
                styles.childBar72,
                {
                  backgroundColor: C.surface,
                  borderColor: C.border,
                },
              ]}
              onPress={() => { setTeacherDesig(item); setDesigModal(false); }}
              activeOpacity={0.7}
            >
              <View style={[styles.toolIcon, { backgroundColor: C.surface2 }]}>
                <AnimatedIcon
                  family="feather"
                  name="bookmark"
                  size={18}
                  color={C.text}
                  animation="entrance"
                  delay={Math.min(index, 8) * 35}
                />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
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
        category="Cover Page"
        fileUrl={lastPdfUri}
        fileName={`BUBT_${docTypeLabel(docType)}.pdf`}
      />
    </SafeAreaView>
  );
}

// 72-Size Clickable Bar Component (Matches Academics card with right-side divider & stat column)
function Bar72({
  icon, label, value, desc, placeholder, onPress, statValue, statLabel, C,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value?: string;
  desc?: string;
  placeholder?: string;
  onPress?: () => void;
  statValue?: string | number;
  statLabel?: string;
  C: any;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.bar72,
        {
          backgroundColor: C.surface,
          borderColor: C.border,
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
      {statValue !== undefined ? (
        <>
          <View style={[styles.verticalDivider, { backgroundColor: C.border }]} />
          <View style={styles.statCol}>
            <Text style={[styles.statVal, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>
              {statValue}
            </Text>
            <Text style={[styles.statSub, { color: C.text3, fontFamily: FontFamily.jakartaBold }]}>
              {statLabel ?? 'SELECT'}
            </Text>
          </View>
        </>
      ) : null}
      <View style={styles.chevBox}>
        <Feather name="chevron-down" size={18} color={C.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

// 72-Size Editable Input Bar Component (Clean normal border, zero side color stripes)
function InputBar72({
  icon, label, value, onChange, placeholder, keyboardType, C,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
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

// BottomSheet helper with Backdrop Tap Dismiss, Hardware Back Button Dismiss, Top-Right X, and Zero Keyboard Blocking
function BottomSheet({
  visible, onClose, title, C, children,
}: {
  visible: boolean; onClose: () => void; title: string; C: any; children: React.ReactNode;
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={[styles.sheet, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={styles.handle}>
            <View style={[styles.handleBar, { backgroundColor: C.border }]} />
          </View>
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {title}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={[styles.closeXBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
            >
              <Feather name="x" size={17} color={C.text} />
            </TouchableOpacity>
          </View>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  scroll: { paddingTop: 10 } as ViewStyle,

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

  // 72-Size Bar (Matches Academics card in Explore)
  bar72: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    height: 72,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
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

  codeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  } as ViewStyle,

  codeBadgeTxt: {
    fontSize: 10,
    letterSpacing: 0.4,
  } as TextStyle,

  verticalDivider: {
    width: 1,
    height: 28,
    marginHorizontal: 3,
  } as ViewStyle,

  statCol: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 38,
    marginRight: 2,
  } as ViewStyle,

  statVal: {
    fontSize: 15,
    lineHeight: 18,
    textAlign: 'center',
  } as TextStyle,

  statSub: {
    fontSize: 9,
    lineHeight: 11,
    letterSpacing: 0.5,
    textAlign: 'center',
    marginTop: 1,
  } as TextStyle,

  chevBox: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

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
  } as ViewStyle,

  backdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  } as ViewStyle,

  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingHorizontal: Layout.screenPadding,
    paddingBottom: 24,
    maxHeight: '84%',
  } as ViewStyle,

  handle: {
    alignItems: 'center',
    paddingVertical: 10,
  } as ViewStyle,

  handleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
  } as ViewStyle,

  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  } as ViewStyle,

  sheetTitle: {
    fontSize: 18,
    letterSpacing: -0.2,
  } as TextStyle,

  closeXBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  sBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
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
});
