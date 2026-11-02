// Uploads route to a table per section:
// Materials -> study_materials, Questions -> study_question_bank (exam tag),
// Books -> study_books (author, optional external URL instead of a file).
import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, StyleSheet, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { useT } from '../../i18n';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { SegmentedTabs, type TabItem } from '../../components/ui/SegmentedTabs';
import { FontFamily, Layout } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/ui/Toast';
import { uploadFile } from '../../utils/storage';
import { isImageFile } from '../../utils/imageCompress';
import { MAX_FILE_SIZE_MB } from '../../constants/app';

const UPLOAD_TYPE_TABS: TabItem<string>[] = [
  { id: 'materials', label: 'Notes',     icon: 'file-text' },
  { id: 'questions', label: 'Questions', icon: 'help-circle' },
  { id: 'books',     label: 'Books',     icon: 'book-open' },
  { id: 'slides',    label: 'Slides',    icon: 'monitor' },
];

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/*',
];

// Must match the DB CHECK constraints exactly.
const NOTE_TYPE_OPTIONS = [
  { value: 'Class Note', label: 'Class Note', icon: 'file-text' },
  { value: 'Assignment', label: 'Assignment', icon: 'clipboard' },
  { value: 'Reference', label: 'Reference', icon: 'bookmark' },
  { value: 'Lab Manual', label: 'Lab Manual', icon: 'cpu' },
];

const BOOK_KIND_OPTIONS = [
  { value: 'Textbook', label: 'Textbook', icon: 'book-open' },
  { value: 'Reference', label: 'Reference Book', icon: 'bookmark' },
  { value: 'Syllabus', label: 'Course Syllabus', icon: 'list' },
];

interface DropdownOption {
  value: string;
  label: string;
  icon: string;
}

interface DropdownProps {
  label: string;
  value: string;
  options: DropdownOption[];
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (val: string) => void;
}

function DropdownSelect({
  label,
  value,
  options,
  isOpen,
  onToggle,
  onSelect,
}: DropdownProps) {
  const { C, isDark } = useTheme();
  const currentOpt = options.find(o => o.value === value) || options[0];

  return (
    <View style={styles.dropdownWrap}>
      <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
        {label}
      </Text>
      <View
        style={[
          styles.dropdownContainer,
          {
            backgroundColor: C.surface,
            borderColor: isOpen ? C.brand : C.border,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.dropdownBar}
          onPress={onToggle}
          activeOpacity={0.8}
        >
          <View style={styles.dropdownLeft}>
            <View style={styles.iconSlot}>
              <Feather name={currentOpt.icon as any} size={24} color={C.text} />
            </View>
            <Text
              style={[
                styles.dropdownValueTxt,
                { color: C.text, fontFamily: FontFamily.jakartaBold },
              ]}
              numberOfLines={1}
            >
              {currentOpt.label}
            </Text>
          </View>
          <Feather
            name={isOpen ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={isOpen ? C.brand : C.textMuted}
          />
        </TouchableOpacity>

        {isOpen && (
          <View
            style={[
              styles.dropdownMenu,
              { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
            ]}
          >
            {options.map((opt, idx) => {
              const isSelected = opt.value === value;
              const isLast = idx === options.length - 1;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.dropdownItem,
                    isSelected && {
                      backgroundColor: isDark
                        ? 'rgba(91, 133, 247, 0.12)'
                        : 'rgba(39, 94, 254, 0.08)',
                    },
                    !isLast && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: C.border,
                    },
                  ]}
                  onPress={() => onSelect(opt.value)}
                  activeOpacity={0.7}
                >
                  <View style={styles.dropdownLeft}>
                    <View style={styles.iconSlot}>
                      <Feather
                        name={opt.icon as any}
                        size={24}
                        color={isSelected ? C.brand : C.text}
                      />
                    </View>
                    <Text
                      style={[
                        styles.dropdownItemTxt,
                        {
                          color: isSelected ? C.brand : C.text,
                          fontFamily: isSelected
                            ? FontFamily.jakartaBold
                            : FontFamily.jakartaMedium,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {opt.label}
                    </Text>
                  </View>
                  {isSelected && (
                    <Feather name="check" size={18} color={C.brand} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}

// Lowercased file extension, used for the file-type icon + label on the course.
function fileKindFrom(name: string): string {
  return (name.split('.').pop() ?? '').toLowerCase().slice(0, 8);
}

interface PickedFile {
  uri: string;
  name: string;
  mimeType?: string;
  size?: number;
}

export function StudyUploadScreen({ route, navigation }: any) {
  const { courseId, courseCode, courseTitle, initialTab } = (route.params ?? {}) as {
    courseId?: string;
    courseCode?: string;
    courseTitle?: string;
    initialTab?: 'materials' | 'questions' | 'books' | 'slides';
  };
  const { C, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { user, profile } = useAuth();

  const toast = useToast();
  const [fileType, setFileType] = useState(initialTab ?? 'materials');
  const [name, setName] = useState('');
  const [materialType, setMaterialType] = useState('Class Note');
  const [bookKind, setBookKind] = useState('Textbook');
  const [exam, setExam] = useState('Midterm');
  const [author, setAuthor] = useState('');
  const [bookUrl, setBookUrl] = useState('');
  const [pickedFile, setPickedFile] = useState<PickedFile | null>(null);
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [intakeId, setIntakeId] = useState<string | null>(null);
  const [targetCourseId, setTargetCourseId] = useState<string | null>(courseId ?? null);
  const [loading, setLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [canUpload, setCanUpload] = useState<boolean | null>(null);

  // Questions need the course's section; books are intake-scoped too.
  useEffect(() => {
    let active = true;
    (async () => {
      if (!courseId) return;
      const { data: c } = await supabase.from('study_courses').select('id, section_id, code, name').eq('id', courseId).single();
      if (!active || !c) return;

      let resolvedCourse = c.id;
      let resolvedSec = c.section_id;

      if (user) {
        const { data: directMem } = await supabase
          .from('study_section_members')
          .select('role')
          .eq('section_id', c.section_id)
          .eq('user_id', user.id)
          .eq('status', 'approved')
          .maybeSingle();

        const isDirectPermitted = directMem?.role === 'cr' || directMem?.role === 'editor' || profile?.role === 'admin';

        // If not in this section, check user's own section for junior batch inheritance
        if (!directMem) {
          const { data: myMem } = await supabase
            .from('study_section_members')
            .select('section_id, role')
            .eq('user_id', user.id)
            .eq('status', 'approved')
            .maybeSingle();

          const isMyMemPermitted = myMem?.role === 'cr' || myMem?.role === 'editor' || profile?.role === 'admin';
          if (active) setCanUpload(isMyMemPermitted);

          if (myMem?.section_id) {
            resolvedSec = myMem.section_id;
            const { data: myCourse } = await supabase
              .from('study_courses')
              .select('id')
              .eq('section_id', myMem.section_id)
              .ilike('code', c.code)
              .maybeSingle();

            if (myCourse) {
              resolvedCourse = myCourse.id;
            } else {
              const { data: newC } = await supabase
                .from('study_courses')
                .insert({
                  section_id: myMem.section_id,
                  code: c.code,
                  name: c.name,
                  created_by: user.id,
                })
                .select('id')
                .maybeSingle();
              if (newC) resolvedCourse = newC.id;
            }
          }
        } else {
          if (active) setCanUpload(isDirectPermitted);
        }
      } else {
        if (active) setCanUpload(profile?.role === 'admin');
      }

      setTargetCourseId(resolvedCourse);
      setSectionId(resolvedSec);
      const { data: s } = await supabase.from('study_sections').select('intake_id').eq('id', resolvedSec).single();
      if (!active) return;
      if (s?.intake_id) setIntakeId(s.intake_id);
    })();
    return () => { active = false; };
  }, [courseId, user, profile?.role]);

  // Questions need the resolved section_id, books need the resolved intake_id
  // (both NOT NULL in the DB) - block submit until the async lookup finishes.
  const canSubmit = canUpload !== false && name.trim().length > 0 &&
    (fileType === 'books'
      ? ((pickedFile !== null || bookUrl.trim().length > 0) && !!intakeId)
      : fileType === 'questions'
        ? (pickedFile !== null && !!sectionId)
        : pickedFile !== null);

  async function pickFile() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ALLOWED_MIME_TYPES,
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets || result.assets.length === 0) return;
    const asset = result.assets[0];
    const size = asset.size ?? 0;
    const isImg = isImageFile(asset.name, asset.mimeType);
    if (!isImg && size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast({
        type: 'error',
        title: t.common.error,
        message: `File exceeds ${MAX_FILE_SIZE_MB}MB limit. Please compress or select a smaller document.`,
      });
      return;
    }
    setPickedFile({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType, size: asset.size });
    if (!name.trim()) {
      // Pre-fill name from filename (strip extension)
      setName(asset.name.replace(/\.[^.]+$/, ''));
    }
  }

  async function handleSubmit() {
    if (!canSubmit || !user || !courseId || loading) return;
    setLoading(true);
    try {
      let storagePath: string | null = null;
      if (pickedFile) {
        const isImg = isImageFile(pickedFile.name, pickedFile.mimeType);
        const ext = isImg ? 'jpg' : (pickedFile.name.split('.').pop() ?? 'bin');
        storagePath = `${user.id}/${courseId}/${Date.now()}_${name.trim().replace(/\s+/g, '_')}.${ext}`;
        // uploadFile reads real bytes via the SDK 56 File API; fetch().blob() on
        // a content:// URI can silently upload 0 bytes in RN.
        // study-materials is a private bucket → bucketIsPublic=false, store the path.
        const up = await uploadFile(
          'study-materials', pickedFile.uri, storagePath,
          isImg ? 'image/jpeg' : (pickedFile.mimeType ?? 'application/octet-stream'), false,
          isImg ? { preset: 'document' } : undefined
        );
        if (!up.success) throw new Error(up.error);
      }

      const finalCourseId = targetCourseId || courseId;
      let insertError = null as any;
      if (fileType === 'questions') {
        // canSubmit guarantees these; the checks make it visible to the compiler.
        if (!sectionId || !storagePath) throw new Error(t.study2.couldNotUpload);
        ({ error: insertError } = await supabase.from('study_question_bank').insert({
          course_id:    finalCourseId,
          section_id:   sectionId,
          exam,
          title:        name.trim(),
          storage_path: storagePath,
          file_kind:    pickedFile ? fileKindFrom(pickedFile.name) : null,
          size_bytes:   pickedFile?.size ?? null,
          uploaded_by:  user.id,
        }));
      } else if (fileType === 'books') {
        if (!intakeId) throw new Error(t.study2.couldNotUpload);
        ({ error: insertError } = await supabase.from('study_books').insert({
          course_id:    finalCourseId,
          intake_id:    intakeId,
          title:        name.trim(),
          author:       author.trim() || null,
          kind:         bookKind,
          storage_path: storagePath,
          url:          bookUrl.trim() || null,
          added_by:     user.id,
        }));
      } else {
        if (!storagePath) throw new Error(t.study2.couldNotUpload);
        const resolvedType = fileType === 'slides' ? 'Lecture Slide' : materialType;
        ({ error: insertError } = await supabase.from('study_materials').insert({
          course_id:    finalCourseId,
          type:         resolvedType,
          title:        name.trim(),
          storage_path: storagePath,
          file_kind:    pickedFile ? fileKindFrom(pickedFile.name) : null,
          size_bytes:   pickedFile?.size ?? null,
          uploaded_by:  user.id,
        }));
      }
      if (insertError) throw insertError;

      navigation.goBack();
    } catch (err: any) {
      toast({ type: 'error', title: t.common.error, message: err?.message ?? t.study2.couldNotUpload });
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.safe, { backgroundColor: C.bg, paddingTop: insets.top }]}>
      <SubBar title={t.study2.upload} onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        {/* Course hint */}
        {(courseCode || courseTitle) && (
          <Text style={[styles.courseHint, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>
            {courseCode ? `${courseCode} · ` : ''}{courseTitle ?? ''}
          </Text>
        )}

        {canUpload === false && (
          <View style={[styles.permissionCard, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2', borderColor: isDark ? 'rgba(239, 68, 68, 0.25)' : '#fee2e2' }]}>
            <Feather name="shield" size={18} color={C.danger} />
            <Text style={[styles.permissionTxt, { color: C.danger, fontFamily: FontFamily.jakartaMedium }]}>
              Upload is restricted to Section CRs and designated Editors. General students have view & download access only.
            </Text>
          </View>
        )}

        {/* Section / File type */}
        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.study2.section}</Text>
        <SegmentedTabs
          tabs={UPLOAD_TYPE_TABS}
          activeTab={fileType}
          onTabChange={(id) => {
            setFileType(id as any);
            setIsDropdownOpen(false);
          }}
        />

        {/* Material type (materials only) - must match DB CHECK */}
        {fileType === 'materials' && (
          <DropdownSelect
            label="TYPE"
            value={materialType}
            options={NOTE_TYPE_OPTIONS}
            isOpen={isDropdownOpen}
            onToggle={() => setIsDropdownOpen(prev => !prev)}
            onSelect={(val) => {
              setMaterialType(val);
              setIsDropdownOpen(false);
            }}
          />
        )}

        {/* Exam tag (questions only) */}
        {fileType === 'questions' && (
          <DropdownSelect
            label={t.study2.exam || 'EXAM'}
            value={exam}
            options={[
              { value: 'Midterm', label: t.study2.midterm ? `${t.study2.midterm} (Midterm)` : 'Midterm Exam', icon: 'calendar' },
              { value: 'Final', label: t.study2.final ? `${t.study2.final} (Final)` : 'Final Exam', icon: 'award' },
              { value: 'CT 1', label: 'Class Test 1 (CT 1)', icon: 'edit-2' },
              { value: 'CT 2', label: 'Class Test 2 (CT 2)', icon: 'edit-3' },
            ]}
            isOpen={isDropdownOpen}
            onToggle={() => setIsDropdownOpen(prev => !prev)}
            onSelect={(val) => {
              setExam(val);
              setIsDropdownOpen(false);
            }}
          />
        )}

        {/* Book extras */}
        {fileType === 'books' && (
          <>
            <DropdownSelect
              label="KIND"
              value={bookKind}
              options={BOOK_KIND_OPTIONS}
              isOpen={isDropdownOpen}
              onToggle={() => setIsDropdownOpen(prev => !prev)}
              onSelect={(val) => {
                setBookKind(val);
                setIsDropdownOpen(false);
              }}
            />
            <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.study2.authorOptional}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
              value={author}
              onChangeText={setAuthor}
              placeholder="e.g. Thomas H. Cormen"
              placeholderTextColor={C.textMuted}
            />
            <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.study2.linkInsteadOfFile}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
              value={bookUrl}
              onChangeText={setBookUrl}
              placeholder="https://..."
              placeholderTextColor={C.textMuted}
              autoCapitalize="none"
              keyboardType="url"
            />
          </>
        )}

        {/* Slides indicator */}
        {fileType === 'slides' && (
          <View style={styles.dropdownWrap}>
            <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
              TYPE
            </Text>
            <View
              style={[
                styles.dropdownContainer,
                { backgroundColor: C.surface, borderColor: C.border },
              ]}
            >
              <View style={styles.dropdownBar}>
                <View style={styles.dropdownLeft}>
                  <View style={styles.iconSlot}>
                    <Feather name="monitor" size={24} color={C.text} />
                  </View>
                  <Text
                    style={[
                      styles.dropdownValueTxt,
                      { color: C.text, fontFamily: FontFamily.jakartaBold },
                    ]}
                  >
                    Lecture Slide
                  </Text>
                </View>
                <Feather name="check" size={18} color={C.brand} />
              </View>
            </View>
          </View>
        )}

        {/* File picker */}
        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
          {fileType === 'books' ? t.study2.fileOptionalIfLink : t.study2.file}
        </Text>
        <TouchableOpacity
          style={[styles.filePicker, { backgroundColor: C.surface, borderColor: pickedFile ? C.brand : C.border }]}
          onPress={pickFile}
          activeOpacity={0.75}
        >
          <Icon name="layers" size={24} color={pickedFile ? C.brand : C.textMuted} />
          <Text style={[styles.filePickerTxt, { color: pickedFile ? C.brand : C.textMuted, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
            {pickedFile ? pickedFile.name : t.study2.chooseAFile}
          </Text>
        </TouchableOpacity>

        {/* File name / title */}
        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>{t.study2.title}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
          value={name}
          onChangeText={setName}
          placeholder={t.study2.titlePlaceholder}
          placeholderTextColor={C.textMuted}
        />

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: canSubmit ? C.brand : C.surface2, opacity: loading ? 0.6 : 1 }]}
          onPress={handleSubmit}
          disabled={!canSubmit || loading}
          activeOpacity={0.8}
        >
          <Icon name="check" size={18} color={canSubmit ? C.white : C.textMuted} />
          <Text style={[styles.submitText, { color: canSubmit ? C.white : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {loading ? t.study2.uploading : t.study2.upload}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  scroll: { paddingTop: 12, paddingBottom: 20 } as ViewStyle,

  courseHint: {
    fontSize: 13,
    marginBottom: 12,
    marginLeft: 2,
  } as any,

  permissionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 6,
    marginBottom: 14,
  } as ViewStyle,

  permissionTxt: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  } as any,

  label: {
    fontSize: 11,
    letterSpacing: 0.7,
    marginBottom: 8,
    marginTop: 18,
    marginLeft: 2,
  } as any,

  dropdownWrap: {
    width: '100%',
  } as ViewStyle,

  dropdownContainer: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  } as ViewStyle,

  dropdownBar: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  } as ViewStyle,

  dropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  } as ViewStyle,

  iconSlot: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  } as ViewStyle,

  dropdownValueTxt: {
    fontSize: 14.5,
  } as any,

  dropdownMenu: {
    width: '100%',
  } as ViewStyle,

  dropdownItem: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  } as ViewStyle,

  dropdownItemTxt: {
    fontSize: 14.5,
  } as any,

  input: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 14.5,
  } as any,

  filePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 58,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    marginTop: 14,
  } as ViewStyle,

  filePickerTxt: { fontSize: 14 } as any,

  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    height: 58,
    borderRadius: 16,
    marginTop: 22,
  } as ViewStyle,

  submitText: { fontSize: 15 } as any,
});
