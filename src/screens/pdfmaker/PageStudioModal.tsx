import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../i18n';
import { FontFamily } from '../../theme';
import {
  type FilterMode,
  type ScanPoint,
  type ScanQuad,
  type WhiteoutStroke,
} from '../../services/pdf/presets';
import type { EngineHandle } from '../../services/pdf/rasterEngine';

const FULL_QUAD: ScanQuad = [
  { x: 0.005, y: 0.005 },
  { x: 0.995, y: 0.005 },
  { x: 0.995, y: 0.995 },
  { x: 0.005, y: 0.995 },
];

type StudioTab = 'crop' | 'whiteout' | 'preview';

export interface PageStudioTarget {
  index: number;
  uri: string;
  width: number;
  height: number;
  rotate: 0 | 90 | 180 | 270;
  filter?: FilterMode;
  quad?: ScanQuad | null;
  whiteoutStrokes?: WhiteoutStroke[];
}

export interface PageStudioResult {
  rotate: 0 | 90 | 180 | 270;
  filter?: FilterMode;
  quad: ScanQuad | null;
  whiteoutStrokes: WhiteoutStroke[];
  previewDataUri?: string | null;
}

interface Props {
  visible: boolean;
  target: PageStudioTarget | null;
  defaultFilter: FilterMode;
  autoCropDefault: boolean;
  engine: EngineHandle;
  onClose: () => void;
  onApply: (index: number, res: PageStudioResult) => void;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function EdgeLine({ p1, p2, color }: { p1: { x: number; y: number }; p2: { x: number; y: number }; color: string }) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.hypot(dx, dy);
  if (len < 1) return null;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  const cx = (p1.x + p2.x) / 2;
  const cy = (p1.y + p2.y) / 2;
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: cx - len / 2,
        top: cy - 1.25,
        width: len,
        height: 2.5,
        backgroundColor: color,
        transform: [{ rotate: `${angle}deg` }],
      }}
    />
  );
}

export function PageStudioModal({
  visible,
  target,
  defaultFilter,
  autoCropDefault,
  engine,
  onClose,
  onApply,
}: Props) {
  const { C } = useTheme();
  const t = useT();

  const [tab, setTab] = useState<StudioTab>('crop');
  const [rotate, setRotate] = useState<0 | 90 | 180 | 270>(0);
  const [filter, setFilter] = useState<FilterMode>(defaultFilter);
  const [quad, setQuad] = useState<ScanQuad>(FULL_QUAD);
  const [strokes, setStrokes] = useState<WhiteoutStroke[]>([]);
  const [brushSize, setBrushSize] = useState<number>(0.042);
  const [brushMode, setBrushMode] = useState<'erase' | 'mosaic'>('erase');
  const [stageBox, setStageBox] = useState({ w: 320, h: 420 });
  const [detecting, setDetecting] = useState(false);
  const [renderingPreview, setRenderingPreview] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [activeCorner, setActiveCorner] = useState<number>(-1);

  const activeCornerRef = useRef<number>(-1);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const currentStrokeRef = useRef<ScanPoint[]>([]);

  useEffect(() => {
    if (!visible || !target) return;
    setTab('crop');
    setRotate(target.rotate ?? 0);
    setFilter(target.filter ?? defaultFilter);
    setStrokes(target.whiteoutStrokes ? target.whiteoutStrokes.slice() : []);
    setPreviewUri(null);

    if (target.quad && target.quad.length === 4) {
      setQuad(target.quad);
    } else if (autoCropDefault && engine.detectQuad) {
      setQuad(FULL_QUAD);
      setDetecting(true);
      engine
        .detectQuad(target.uri, target.rotate ?? 0)
        .then((res) => {
          if (res?.quad && res.quad.length === 4) setQuad(res.quad);
        })
        .catch(() => {})
        .finally(() => setDetecting(false));
    } else {
      setQuad(FULL_QUAD);
    }
  }, [visible, target, defaultFilter, autoCropDefault, engine]);

  useEffect(() => {
    if (!visible || !target || tab !== 'preview' || !engine.scanPhoto) return;
    let alive = true;
    setRenderingPreview(true);
    engine
      .scanPhoto({
        uri: target.uri,
        rotate,
        maxDim: 1400,
        quality: 0.85,
        filter,
        autoCrop: false,
        quad,
        whiteoutStrokes: strokes,
      })
      .then((res) => {
        if (alive && res?.base64) {
          setPreviewUri(`data:image/jpeg;base64,${res.base64}`);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setRenderingPreview(false);
      });
    return () => {
      alive = false;
    };
  }, [visible, target, tab, rotate, filter, quad, strokes, engine]);

  if (!visible || !target) return null;

  const isQuarter = rotate % 180 !== 0;
  const rawW = Math.max(1, target.width || 1200);
  const rawH = Math.max(1, target.height || 1600);
  const orientW = isQuarter ? rawH : rawW;
  const orientH = isQuarter ? rawW : rawH;

  const pad = 20;
  const availW = Math.max(100, stageBox.w - pad * 2);
  const availH = Math.max(100, stageBox.h - pad * 2);
  const fitScale = Math.min(availW / orientW, availH / orientH);
  const imgRectW = Math.max(60, Math.round(orientW * fitScale));
  const imgRectH = Math.max(60, Math.round(orientH * fitScale));
  const imgLeft = Math.round((stageBox.w - imgRectW) / 2);
  const imgTop = Math.round((stageBox.h - imgRectH) / 2);

  const toNorm = (pageX: number, pageY: number): ScanPoint => ({
    x: clamp01((pageX - imgLeft) / Math.max(1, imgRectW)),
    y: clamp01((pageY - imgTop) / Math.max(1, imgRectH)),
  });

  const toScreen = (pt: ScanPoint) => ({
    x: imgLeft + pt.x * imgRectW,
    y: imgTop + pt.y * imgRectH,
  });

  const screenCorners = quad.map(toScreen);

  const handleStageTouchStart = (e: any) => {
    const { locationX, locationY } = e.nativeEvent;
    if (tab === 'crop') {
      let bestIdx = 0;
      let bestDist = Infinity;
      screenCorners.forEach((sc, idx) => {
        const d = Math.hypot(sc.x - locationX, sc.y - locationY);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = idx;
        }
      });
      if (bestDist <= 76) {
        activeCornerRef.current = bestIdx;
        setActiveCorner(bestIdx);
        dragOffsetRef.current = {
          x: screenCorners[bestIdx].x - locationX,
          y: screenCorners[bestIdx].y - locationY,
        };
      } else {
        activeCornerRef.current = -1;
        setActiveCorner(-1);
      }
    } else if (tab === 'whiteout') {
      const np = toNorm(locationX, locationY);
      currentStrokeRef.current = [np];
      setStrokes((prev) => [...prev, { points: [np], size: brushSize, mode: brushMode }]);
    }
  };

  const handleStageTouchMove = (e: any) => {
    const { locationX, locationY } = e.nativeEvent;
    if (tab === 'crop') {
      const idx = activeCornerRef.current;
      if (idx < 0) return;
      const targetScreenX = locationX + dragOffsetRef.current.x;
      const targetScreenY = locationY + dragOffsetRef.current.y;
      const np = toNorm(targetScreenX, targetScreenY);
      setQuad((prev) => prev.map((p, i) => (i === idx ? np : p)) as ScanQuad);
    } else if (tab === 'whiteout') {
      const np = toNorm(locationX, locationY);
      const pts = currentStrokeRef.current;
      const last = pts[pts.length - 1];
      if (!last || Math.hypot(np.x - last.x, np.y - last.y) > 0.008) {
        currentStrokeRef.current = [...pts, np];
        const updatedPoints = currentStrokeRef.current;
        setStrokes((prev) => {
          if (!prev.length) return [{ points: updatedPoints, size: brushSize, mode: brushMode }];
          const copy = prev.slice();
          copy[copy.length - 1] = { points: updatedPoints, size: brushSize, mode: brushMode };
          return copy;
        });
      }
    }
  };

  const handleStageTouchEnd = () => {
    activeCornerRef.current = -1;
    setActiveCorner(-1);
    currentStrokeRef.current = [];
  };

  const runAutoEdge = async () => {
    if (!engine.detectQuad || detecting) return;
    setDetecting(true);
    try {
      const res = await engine.detectQuad(target.uri, rotate);
      if (res?.quad && res.quad.length === 4) setQuad(res.quad);
    } catch {
      // Keep current quad
    } finally {
      setDetecting(false);
    }
  };

  const handleRotate90 = () => {
    const nextRot = ((rotate + 90) % 360) as 0 | 90 | 180 | 270;
    setRotate(nextRot);
    setPreviewUri(null);
    if (engine.detectQuad) {
      setDetecting(true);
      engine
        .detectQuad(target.uri, nextRot)
        .then((res) => {
          if (res?.quad && res.quad.length === 4) setQuad(res.quad);
        })
        .catch(() => {})
        .finally(() => setDetecting(false));
    }
  };

  const filterOptions: { key: FilterMode; label: string; icon: React.ComponentProps<typeof Feather>['name'] }[] = [
    { key: 'magic', label: t.pdfmaker.images.filterMagic, icon: 'zap' },
    { key: 'bleed_erase', label: t.pdfmaker.images.filterBleedErase, icon: 'feather' },
    { key: 'bw', label: t.pdfmaker.images.filterBw, icon: 'file-text' },
    { key: 'whiteboard', label: t.pdfmaker.images.filterWhiteboard, icon: 'monitor' },
    { key: 'grayscale', label: t.pdfmaker.images.filterGrayscale, icon: 'sliders' },
    { key: 'original', label: t.pdfmaker.images.filterOriginal, icon: 'image' },
  ];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: C.border, backgroundColor: C.surface }]}>
          <TouchableOpacity onPress={onClose} style={[styles.iconBtn, { backgroundColor: C.surface2 }]}>
            <Feather name="x" size={18} color={C.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
            {t.pdfmaker.images.studioTitle(target.index + 1)}
          </Text>
          <TouchableOpacity onPress={handleRotate90} style={[styles.iconBtn, { backgroundColor: C.surface2 }]}>
            <Feather name="rotate-cw" size={17} color={C.brand} />
          </TouchableOpacity>
        </View>

        {/* Studio Mode Tabs */}
        <View style={[styles.tabRow, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
          {(
            [
              { key: 'crop' as StudioTab, label: t.pdfmaker.images.studioTabCrop, icon: 'maximize' as const },
              { key: 'whiteout' as StudioTab, label: t.pdfmaker.images.studioTabWhiteout, icon: 'edit-3' as const },
              { key: 'preview' as StudioTab, label: t.pdfmaker.images.studioTabFilter, icon: 'eye' as const },
            ]
          ).map((item) => {
            const active = tab === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.tabBtn, active ? { backgroundColor: C.brand } : { backgroundColor: C.surface2 }]}
                onPress={() => setTab(item.key)}
                activeOpacity={0.85}
              >
                <Feather name={item.icon} size={14} color={active ? C.white : C.text2} />
                <Text
                  style={[
                    styles.tabBtnText,
                    { color: active ? C.white : C.text2, fontFamily: active ? FontFamily.jakartaBold : FontFamily.jakartaMedium },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Interactive Canvas Stage */}
        <View
          style={[styles.stage, { backgroundColor: '#09090b' }]}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            if (width > 0 && height > 0) setStageBox({ w: width, h: height });
          }}
          onStartShouldSetResponder={() => tab === 'crop' || tab === 'whiteout'}
          onMoveShouldSetResponder={() => tab === 'crop' || tab === 'whiteout'}
          onResponderGrant={handleStageTouchStart}
          onResponderMove={handleStageTouchMove}
          onResponderRelease={handleStageTouchEnd}
        >
          {tab === 'preview' && previewUri ? (
            <Image
              source={{ uri: previewUri }}
              style={{ width: stageBox.w - 24, height: stageBox.h - 24 }}
              resizeMode="contain"
            />
          ) : (
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: imgLeft,
                top: imgTop,
                width: imgRectW,
                height: imgRectH,
                overflow: 'hidden',
                backgroundColor: '#ffffff',
              }}
            >
              <Image
                source={{ uri: target.uri }}
                style={{
                  width: isQuarter ? imgRectH : imgRectW,
                  height: isQuarter ? imgRectW : imgRectH,
                  position: 'absolute',
                  left: isQuarter ? (imgRectW - imgRectH) / 2 : 0,
                  top: isQuarter ? (imgRectH - imgRectW) / 2 : 0,
                  transform: [{ rotate: `${rotate}deg` }],
                }}
                resizeMode="stretch"
              />
              {/* Render Smart Erase & Mosaic Brush Strokes */}
              {strokes.map((st, sIdx) => {
                const diam = Math.max(8, (st.size || 0.04) * Math.min(imgRectW, imgRectH));
                const isMosaic = st.mode === 'mosaic';
                const strokeCol = isMosaic ? 'rgba(91, 133, 247, 0.55)' : '#ffffff';
                return st.points.map((pt, pIdx) => {
                  const prevPt = pIdx > 0 ? st.points[pIdx - 1] : null;
                  return (
                    <React.Fragment key={`${sIdx}-${pIdx}`}>
                      {prevPt ? (
                        <EdgeLine
                          p1={{ x: prevPt.x * imgRectW, y: prevPt.y * imgRectH }}
                          p2={{ x: pt.x * imgRectW, y: pt.y * imgRectH }}
                          color={strokeCol}
                        />
                      ) : null}
                      <View
                        style={{
                          position: 'absolute',
                          left: pt.x * imgRectW - diam / 2,
                          top: pt.y * imgRectH - diam / 2,
                          width: diam,
                          height: diam,
                          borderRadius: isMosaic ? 4 : diam / 2,
                          backgroundColor: strokeCol,
                        }}
                      />
                    </React.Fragment>
                  );
                });
              })}
            </View>
          )}

          {/* 4-Corner Perspective Quad Overlay */}
          {tab === 'crop' ? (
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              <EdgeLine p1={screenCorners[0]} p2={screenCorners[1]} color={C.brand} />
              <EdgeLine p1={screenCorners[1]} p2={screenCorners[2]} color={C.brand} />
              <EdgeLine p1={screenCorners[2]} p2={screenCorners[3]} color={C.brand} />
              <EdgeLine p1={screenCorners[3]} p2={screenCorners[0]} color={C.brand} />
              {screenCorners.map((sc, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.cornerHandle,
                    {
                      left: sc.x - 16,
                      top: sc.y - 16,
                      borderColor: C.brand,
                      backgroundColor: 'rgba(91, 133, 247, 0.28)',
                    },
                  ]}
                >
                  <View style={[styles.cornerDot, { backgroundColor: C.white }]} />
                </View>
              ))}
            </View>
          ) : null}

          {/* Floating Magnifier Loupe when dragging a corner handle */}
          {tab === 'crop' && activeCorner >= 0 && activeCorner < 4 ? (() => {
            const sc = screenCorners[activeCorner];
            const np = quad[activeCorner];
            const LOUPE_SIZE = 108;
            const LOUPE_RADIUS = LOUPE_SIZE / 2;
            const ZOOM = 2.4;
            const loupeX = Math.max(12, Math.min(stageBox.w - LOUPE_SIZE - 12, sc.x - LOUPE_RADIUS));
            const loupeY = sc.y < stageBox.h * 0.38
              ? Math.min(stageBox.h - LOUPE_SIZE - 12, sc.y + 54)
              : Math.max(12, sc.y - LOUPE_SIZE - 54);
            const zoomedW = imgRectW * ZOOM;
            const zoomedH = imgRectH * ZOOM;
            const innerLeft = LOUPE_RADIUS - np.x * zoomedW;
            const innerTop = LOUPE_RADIUS - np.y * zoomedH;

            return (
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: loupeX,
                  top: loupeY,
                  width: LOUPE_SIZE,
                  height: LOUPE_SIZE,
                  borderRadius: LOUPE_RADIUS,
                  borderWidth: 2.5,
                  borderColor: C.brand,
                  backgroundColor: '#ffffff',
                  overflow: 'hidden',
                  elevation: 16,
                  shadowColor: '#000000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.35,
                  shadowRadius: 8,
                }}
              >
                <View
                  style={{
                    position: 'absolute',
                    left: innerLeft,
                    top: innerTop,
                    width: zoomedW,
                    height: zoomedH,
                  }}
                >
                  <Image
                    source={{ uri: target.uri }}
                    style={{
                      width: isQuarter ? zoomedH : zoomedW,
                      height: isQuarter ? zoomedW : zoomedH,
                      position: 'absolute',
                      left: isQuarter ? (zoomedW - zoomedH) / 2 : 0,
                      top: isQuarter ? (zoomedH - zoomedW) / 2 : 0,
                      transform: [{ rotate: `${rotate}deg` }],
                    }}
                    resizeMode="stretch"
                  />
                </View>
                {/* Crosshairs */}
                <View
                  style={{
                    position: 'absolute',
                    left: LOUPE_RADIUS - 12,
                    top: LOUPE_RADIUS - 1,
                    width: 24,
                    height: 2,
                    backgroundColor: C.brand,
                  }}
                />
                <View
                  style={{
                    position: 'absolute',
                    left: LOUPE_RADIUS - 1,
                    top: LOUPE_RADIUS - 12,
                    width: 2,
                    height: 24,
                    backgroundColor: C.brand,
                  }}
                />
                <View
                  style={{
                    position: 'absolute',
                    left: LOUPE_RADIUS - 3,
                    top: LOUPE_RADIUS - 3,
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: '#ffffff',
                    borderWidth: 1.5,
                    borderColor: C.brand,
                  }}
                />
              </View>
            );
          })() : null}

          {(detecting || renderingPreview) ? (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="small" color={C.white} />
              <Text style={[styles.loadingText, { color: C.white, fontFamily: FontFamily.jakartaBold }]}>
                {t.pdfmaker.images.studioRendering}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Bottom Contextual Controls */}
        <View style={[styles.footer, { backgroundColor: C.surface, borderTopColor: C.border }]}>
          {tab === 'crop' ? (
            <>
              <Text style={[styles.hintText, { color: C.text3, fontFamily: FontFamily.jakartaMedium }]}>
                {t.pdfmaker.images.studioCropHint}
              </Text>
              <View style={styles.toolRow}>
                <TouchableOpacity
                  style={[styles.toolBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
                  onPress={runAutoEdge}
                  activeOpacity={0.8}
                >
                  <Feather name="cpu" size={15} color={C.brand} />
                  <Text style={[styles.toolBtnText, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    {t.pdfmaker.images.studioAutoDetect}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toolBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
                  onPress={() => setQuad(FULL_QUAD)}
                  activeOpacity={0.8}
                >
                  <Feather name="maximize-2" size={15} color={C.text2} />
                  <Text style={[styles.toolBtnText, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    {t.pdfmaker.images.studioFullPage}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : null}

          {tab === 'whiteout' ? (
            <>
              <View style={styles.toolRow}>
                <TouchableOpacity
                  style={[
                    styles.toolBtn,
                    {
                      backgroundColor: brushMode === 'erase' ? C.brand : C.surface2,
                      borderColor: brushMode === 'erase' ? C.brand : C.border,
                    },
                  ]}
                  onPress={() => setBrushMode('erase')}
                >
                  <Feather name="edit-3" size={14} color={brushMode === 'erase' ? C.white : C.text2} />
                  <Text
                    style={[
                      styles.toolBtnText,
                      { color: brushMode === 'erase' ? C.white : C.text, fontFamily: FontFamily.jakartaBold },
                    ]}
                  >
                    {t.pdfmaker.images.studioTabWhiteout}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.toolBtn,
                    {
                      backgroundColor: brushMode === 'mosaic' ? C.brand : C.surface2,
                      borderColor: brushMode === 'mosaic' ? C.brand : C.border,
                    },
                  ]}
                  onPress={() => setBrushMode('mosaic')}
                >
                  <Feather name="grid" size={14} color={brushMode === 'mosaic' ? C.white : C.text2} />
                  <Text
                    style={[
                      styles.toolBtnText,
                      { color: brushMode === 'mosaic' ? C.white : C.text, fontFamily: FontFamily.jakartaBold },
                    ]}
                  >
                    Mosaic Blur
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.toolRow}>
                {[
                  { label: 'S', val: 0.026 },
                  { label: 'M', val: 0.044 },
                  { label: 'L', val: 0.068 },
                ].map((b) => {
                  const active = Math.abs(brushSize - b.val) < 0.005;
                  return (
                    <TouchableOpacity
                      key={b.label}
                      style={[
                        styles.sizePill,
                        {
                          backgroundColor: active ? C.brand : C.surface2,
                          borderColor: active ? C.brand : C.border,
                        },
                      ]}
                      onPress={() => setBrushSize(b.val)}
                    >
                      <Text style={{ color: active ? C.white : C.text, fontFamily: FontFamily.jakartaBold, fontSize: 12 }}>
                        {b.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  style={[styles.toolBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
                  onPress={() => setStrokes((prev) => prev.slice(0, -1))}
                  disabled={!strokes.length}
                >
                  <Feather name="corner-up-left" size={15} color={strokes.length ? C.text : C.textMuted} />
                  <Text style={[styles.toolBtnText, { color: strokes.length ? C.text : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                    {t.pdfmaker.images.studioUndoStroke}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toolBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
                  onPress={() => setStrokes([])}
                  disabled={!strokes.length}
                >
                  <Feather name="trash-2" size={15} color={strokes.length ? C.danger : C.textMuted} />
                </TouchableOpacity>
              </View>
            </>
          ) : null}

          {tab === 'preview' ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
              {filterOptions.map((fo) => {
                const active = filter === fo.key;
                return (
                  <TouchableOpacity
                    key={fo.key}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: active ? C.brand : C.surface2,
                        borderColor: active ? C.brand : C.border,
                      },
                    ]}
                    onPress={() => setFilter(fo.key)}
                    activeOpacity={0.85}
                  >
                    <Feather name={fo.icon} size={13} color={active ? C.white : C.text2} />
                    <Text
                      style={{
                        color: active ? C.white : C.text,
                        fontFamily: active ? FontFamily.jakartaBold : FontFamily.jakartaMedium,
                        fontSize: 12.5,
                      }}
                    >
                      {fo.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : null}

          <TouchableOpacity
            style={[styles.applyBtn, { backgroundColor: C.brand }]}
            onPress={() => {
              onApply(target.index, {
                rotate,
                filter,
                quad,
                whiteoutStrokes: strokes,
                previewDataUri: previewUri,
              });
              onClose();
            }}
            activeOpacity={0.85}
          >
            <Feather name="check" size={17} color={C.white} />
            <Text style={[styles.applyBtnText, { color: C.white, fontFamily: FontFamily.jakartaBold }]}>
              {t.pdfmaker.images.studioApply}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 58,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  } as ViewStyle,
  headerTitle: { fontSize: 16 } as TextStyle,
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  } as ViewStyle,
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: 12,
  } as ViewStyle,
  tabBtnText: { fontSize: 12.5 } as TextStyle,
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  } as ViewStyle,
  cornerHandle: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  cornerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  } as ViewStyle,
  loadingOverlay: {
    position: 'absolute',
    bottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 99,
  } as ViewStyle,
  loadingText: { fontSize: 12.5 } as TextStyle,
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 10,
    borderTopWidth: 1,
  } as ViewStyle,
  hintText: { fontSize: 12, textAlign: 'center' } as TextStyle,
  toolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  } as ViewStyle,
  toolBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
  } as ViewStyle,
  toolBtnText: { fontSize: 13 } as TextStyle,
  sizePill: {
    width: 42,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  filterScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  } as ViewStyle,
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 42,
    paddingHorizontal: 13,
    borderRadius: 12,
    borderWidth: 1,
  } as ViewStyle,
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 54,
    borderRadius: 14,
  } as ViewStyle,
  applyBtnText: { fontSize: 15 } as TextStyle,
});
