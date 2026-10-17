// Shared pieces for the four PDF Maker tools. Reorder controls are arrow
// buttons rather than drag: drag needs a long press to start, which fights
// the scroll view on a phone.
import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, type ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../i18n';
import { FontFamily } from '../../theme';
import { formatFileSize } from '../../utils/format';

type Tone = 'info' | 'warn' | 'danger';

export function Notice({ tone = 'warn', children }: { tone?: Tone; children: React.ReactNode }) {
  const { C } = useTheme();
  const fg = tone === 'info' ? C.info : tone === 'danger' ? C.danger : C.warn;
  const bg = tone === 'info' ? C.infoBg : tone === 'danger' ? C.dangerBg : C.warnBg;
  return (
    <View style={[styles.notice, { borderColor: C.border, backgroundColor: bg }]}>
      <Feather name={tone === 'info' ? 'info' : 'alert-triangle'} size={16} color={fg} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

export function NoticeText({ children, bold }: { children: React.ReactNode; bold?: boolean }) {
  const { C } = useTheme();
  return (
    <Text style={{ color: C.text2, fontSize: 13.5, lineHeight: 19, fontFamily: bold ? FontFamily.jakartaBold : FontFamily.jakartaMedium }}>
      {children}
    </Text>
  );
}

export function ProgressPanel({ label, done, total, onCancel }: { label: string; done: number; total: number; onCancel?: () => void }) {
  const { C } = useTheme();
  const t = useT();
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
      <View style={styles.rowBetween}>
        <Text style={[styles.cardTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>{label}</Text>
        {onCancel ? (
          <TouchableOpacity onPress={onCancel} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[styles.linkText, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>{t.pdfmaker.common.cancel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <View style={[styles.track, { backgroundColor: C.surface2 }]}>
        <View style={[styles.fill, { backgroundColor: C.brand, width: `${pct}%` }]} />
      </View>
      {total > 0 ? (
        <Text style={[styles.meta, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]}>
          {t.pdfmaker.common.progress(done, total)}
        </Text>
      ) : null}
    </View>
  );
}

export function ResultPanel({
  title, bytesBefore, bytesAfter, pages, warning, onShare, onPreview, onSaveDevice, onReset,
}: {
  title: string; bytesBefore?: number; bytesAfter: number; pages: number;
  warning?: string | null; onShare: () => void; onPreview?: () => void; onSaveDevice?: () => void; onReset: () => void;
}) {
  const { C } = useTheme();
  const t = useT();
  const saved = bytesBefore && bytesAfter ? Math.round((1 - bytesAfter / bytesBefore) * 100) : 0;
  return (
    <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
      <Text style={[styles.resultTitle, { color: C.text, fontFamily: FontFamily.jakartaExtraBold }]}>{title}</Text>
      <Text style={[styles.meta, { color: C.text2, fontFamily: FontFamily.jakartaMedium }]}>
        {t.pdfmaker.common.pages(pages)}
        {'   '}
        {bytesBefore ? `${formatFileSize(bytesBefore)} > ${formatFileSize(bytesAfter)}` : formatFileSize(bytesAfter)}
        {saved > 0 ? `   ${t.pdfmaker.common.smaller(saved)}` : ''}
      </Text>
      {warning ? (
        <View style={{ marginTop: 2 }}>
          <Notice tone="warn"><NoticeText>{warning}</NoticeText></Notice>
        </View>
      ) : null}
      <View style={styles.resultActionsColumn}>
        {onPreview ? (
          <TouchableOpacity
            style={[styles.actionRowBar58, { backgroundColor: C.surface2, borderColor: C.border }]}
            onPress={onPreview}
            activeOpacity={0.82}
          >
            <Feather name="eye" size={18} color={C.brand} />
            <Text style={[styles.actionRowText, { color: C.brand, fontFamily: FontFamily.jakartaBold }]}>
              {t.pdfmaker.common.preview}
            </Text>
          </TouchableOpacity>
        ) : null}

        {onSaveDevice ? (
          <TouchableOpacity
            style={[styles.actionRowBar58, { backgroundColor: C.surface2, borderColor: C.border }]}
            onPress={onSaveDevice}
            activeOpacity={0.82}
          >
            <Feather name="download" size={18} color={C.text} />
            <Text style={[styles.actionRowText, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
              {t.pdfmaker.common.saveDevice}
            </Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={[styles.actionRowBar58, { backgroundColor: C.brand, borderColor: C.brand }]}
          onPress={onShare}
          activeOpacity={0.85}
        >
          <Feather name="share-2" size={18} color={C.white} />
          <Text style={[styles.actionRowText, { color: C.white, fontFamily: FontFamily.jakartaBold }]}>
            {t.pdfmaker.common.share}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionRowBar58, { borderColor: C.border }]}
          onPress={onReset}
          activeOpacity={0.82}
        >
          <Feather name="rotate-ccw" size={17} color={C.text2} />
          <Text style={[styles.actionRowText, { color: C.text2, fontFamily: FontFamily.jakartaBold }]}>
            {t.pdfmaker.common.startOver}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function ThumbGrid({ children }: { children: React.ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

export function ThumbCard({
  uri, caption, index, total, rotate = 0, dimmed, keep, badgeLabel,
  onFirst, onPrev, onNext, onRotate, onRemove, onToggle, onEdit,
}: {
  uri?: string; caption: string; index: number; total: number; rotate?: number;
  dimmed?: boolean; keep?: boolean; badgeLabel?: string | null;
  onFirst?: () => void; onPrev?: () => void; onNext?: () => void;
  onRotate?: () => void; onRemove?: () => void; onToggle?: () => void; onEdit?: () => void;
}) {
  const { C } = useTheme();
  const t = useT();
  const isQuarterRotated = rotate % 180 !== 0;
  return (
    <View style={[styles.thumb, { backgroundColor: C.surface, borderColor: C.border, opacity: dimmed ? 0.4 : 1 }]}>
      <TouchableOpacity
        style={[styles.thumbImgBox, { backgroundColor: C.surface2 }]}
        onPress={onEdit}
        disabled={!onEdit}
        activeOpacity={0.85}
      >
        {uri ? (
          <Image
            source={{ uri }}
            style={[
              styles.thumbImg,
              {
                transform: [
                  { rotate: `${rotate}deg` },
                  ...(isQuarterRotated ? [{ scale: 0.72 }] : []),
                ],
              },
            ]}
            resizeMode="contain"
          />
        ) : (
          <Feather name="file-text" size={22} color={C.textMuted} />
        )}
        <View style={styles.badge}><Text style={styles.badgeText}>{index + 1}</Text></View>
        {badgeLabel ? (
          <View style={[styles.studioBadge, { backgroundColor: C.brand }]}>
            <Feather name="sliders" size={9} color={C.white} />
            <Text style={styles.studioBadgeText} numberOfLines={1}>{badgeLabel}</Text>
          </View>
        ) : null}
        {onRemove ? (
          <TouchableOpacity style={styles.corner} onPress={onRemove} accessibilityLabel={t.pdfmaker.common.remove}>
            <Feather name="x" size={13} color={C.white} />
          </TouchableOpacity>
        ) : null}
        {onToggle ? (
          <TouchableOpacity
            style={[styles.corner, keep ? null : { backgroundColor: C.danger }]}
            onPress={onToggle}
            accessibilityLabel={keep ? t.pdfmaker.common.remove : t.pdfmaker.common.keep}
          >
            <Feather name={keep ? 'x' : 'rotate-ccw'} size={13} color={C.white} />
          </TouchableOpacity>
        ) : null}
      </TouchableOpacity>
      <View style={[styles.thumbFoot, { borderTopColor: C.border }]}>
        <Text numberOfLines={1} style={[styles.thumbCap, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]}>{caption}</Text>
        <View style={styles.thumbBtns}>
          <TileBtn icon="chevrons-left" onPress={onFirst} disabled={index === 0} label={t.pdfmaker.common.moveFirst} />
          <TileBtn icon="chevron-left" onPress={onPrev} disabled={index === 0} label={t.pdfmaker.common.moveBack} />
          <TileBtn icon="chevron-right" onPress={onNext} disabled={index === total - 1} label={t.pdfmaker.common.moveForward} />
          <TileBtn icon="rotate-cw" onPress={onRotate} label={t.pdfmaker.common.rotate} />
        </View>
      </View>
    </View>
  );
}

function TileBtn({
  icon, onPress, disabled, label,
}: { icon: React.ComponentProps<typeof Feather>['name']; onPress?: () => void; disabled?: boolean; label: string }) {
  const { C } = useTheme();
  if (!onPress) return null;
  return (
    <TouchableOpacity
      style={[styles.tileBtn, { opacity: disabled ? 0.3 : 1 }]}
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
      activeOpacity={0.7}
    >
      <Feather name={icon} size={15} color={C.text3} />
    </TouchableOpacity>
  );
}

export function FileRow({
  name, size, kind, note, index, total, onFirst, onPrev, onNext, onRemove,
}: {
  name: string; size: number; kind: 'pdf' | 'image'; note?: string | null;
  index: number; total: number;
  onFirst: () => void; onPrev: () => void; onNext: () => void; onRemove: () => void;
}) {
  const { C } = useTheme();
  const t = useT();
  return (
    <View style={[styles.fileRow, { backgroundColor: C.surface, borderColor: C.border }]}>
      <View style={[styles.fileIcon, { backgroundColor: C.surface2 }]}>
        <Feather name={kind === 'pdf' ? 'file-text' : 'image'} size={17} color={C.text2} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={[styles.fileName, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>{name}</Text>
        <Text numberOfLines={1} style={[styles.meta, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]}>
          {formatFileSize(size)}{note ? `   ${note}` : ''}
        </Text>
      </View>
      <View style={{ flexDirection: 'row' }}>
        <TileBtn icon="chevrons-up" onPress={onFirst} disabled={index === 0} label={t.pdfmaker.common.moveFirst} />
        <TileBtn icon="chevron-up" onPress={onPrev} disabled={index === 0} label={t.pdfmaker.common.moveBack} />
        <TileBtn icon="chevron-down" onPress={onNext} disabled={index === total - 1} label={t.pdfmaker.common.moveForward} />
        <TileBtn icon="x" onPress={onRemove} label={t.pdfmaker.common.remove} />
      </View>
    </View>
  );
}

export function SegmentToggle<T extends string>({
  value, options, onChange,
}: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  const { C } = useTheme();
  return (
    <View style={[styles.segment, { backgroundColor: C.surface2, borderColor: C.border }]}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <TouchableOpacity
            key={o.value}
            style={[styles.segmentItem, active ? { backgroundColor: C.surface } : null]}
            onPress={() => onChange(o.value)}
            activeOpacity={0.8}
          >
            <Text
              numberOfLines={1}
              style={[styles.segmentText, { color: active ? C.text : C.text3, fontFamily: active ? FontFamily.jakartaBold : FontFamily.jakartaMedium }]}
            >
              {o.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function PrivacyNote() {
  const { C } = useTheme();
  const t = useT();
  return (
    <Text style={[styles.meta, { color: C.text3, fontFamily: FontFamily.jakartaMedium, marginTop: 4 }]}>
      {t.pdfmaker.privacy}
    </Text>
  );
}

// One place that turns a PdfError code into copy, so every tool phrases the
// same failure identically.
export function usePdfErrorText() {
  const t = useT();
  return (code?: string, detail?: string) => {
    const e = t.pdfmaker.errors;
    switch (code) {
      case 'encrypted': return e.encrypted;
      case 'corrupt': return detail ? `${e.couldNotRead(detail)}. ${e.corrupt}` : e.corrupt;
      case 'unsupported-image': return e.unsupportedImage;
      case 'heic': return e.heic;
      case 'too-large': return e.tooLarge;
      case 'too-many-pages': return e.tooManyPages;
      case 'already-optimized': return e.alreadyOptimized;
      case 'cant-hit-target': return e.cantHitTarget;
      case 'engine-failed': return e.engineFailed;
      default: return e.unknown;
    }
  };
}

const styles = StyleSheet.create({
  notice: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', borderWidth: 1, borderRadius: 12, padding: 11 } as ViewStyle,
  card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 } as ViewStyle,
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' } as ViewStyle,
  cardTitle: { fontSize: 14.5 },
  resultTitle: { fontSize: 17 },
  linkText: { fontSize: 13.5 },
  meta: { fontSize: 12.5 },
  track: { height: 8, borderRadius: 99, overflow: 'hidden' } as ViewStyle,
  fill: { height: '100%', borderRadius: 99 } as ViewStyle,
  resultActionsColumn: { flexDirection: 'column', gap: 10, marginTop: 12, width: '100%' } as ViewStyle,
  actionRowBar58: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
  } as ViewStyle,
  actionRowText: { fontSize: 15 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 } as ViewStyle,
  thumb: { width: '31%', borderWidth: 1, borderRadius: 14, overflow: 'hidden' } as ViewStyle,
  thumbImgBox: { height: 104, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' } as ViewStyle,
  thumbImg: { width: '100%', height: '100%' },
  // Scrims sit on top of an image, so they are literal overlays rather than
  // theme colours.
  badge: { position: 'absolute', left: 5, top: 5, backgroundColor: 'rgba(0,0,0,0.62)', borderRadius: 99, paddingHorizontal: 7, paddingVertical: 1 } as ViewStyle,
  badgeText: { color: '#ffffff', fontSize: 10.5, fontWeight: '700' },
  studioBadge: { position: 'absolute', left: 5, bottom: 5, flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 99, paddingHorizontal: 6, paddingVertical: 2 } as ViewStyle,
  studioBadgeText: { color: '#ffffff', fontSize: 9.5, fontWeight: '700' },
  corner: { position: 'absolute', right: 5, top: 5, width: 24, height: 24, borderRadius: 99, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.62)' } as ViewStyle,
  thumbFoot: { borderTopWidth: 1, paddingHorizontal: 6, paddingVertical: 5 } as ViewStyle,
  thumbCap: { fontSize: 11 },
  thumbBtns: { flexDirection: 'row', marginTop: 2 } as ViewStyle,
  tileBtn: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderRadius: 16, padding: 12, minHeight: 72 } as ViewStyle,
  fileIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  fileName: { fontSize: 14.5 },
  segment: { flexDirection: 'row', alignItems: 'center', height: 58, padding: 4, borderRadius: 16, borderWidth: 1, gap: 4 } as ViewStyle,
  segmentItem: { flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%', borderRadius: 12 } as ViewStyle,
  segmentText: { fontSize: 13.5 },
});
