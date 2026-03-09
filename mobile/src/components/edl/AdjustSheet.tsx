/**
 * Adjust panel — §18.10.22 reference-style bottom sheet.
 * Drag handle, "Apply to all clips" row, tabs, slider controls, confirm action.
 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeViewGestureHandler } from 'react-native-gesture-handler';
import Slider from '@react-native-community/slider';
import BottomSheet, {
  BottomSheetScrollView,
  BottomSheetView,
  BottomSheetHandle,
  BottomSheetBackdrop,
  TouchableOpacity,
} from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { Check } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import type { EDL, EdlColor } from '../../lib/edlLib';

const DEFAULT_COLOR: EdlColor = { saturation: 1, contrast: 1, vibrance: 1 };

const ADJUST_TABS = ['Adjust', 'White balance', 'HSL', 'Style'] as const;
type AdjustTab = (typeof ADJUST_TABS)[number];

/** Single row: label | slider | value. EDL-backed (saturation, contrast, vibrance) or scaffold. */
function AdjustmentRow({
  label,
  value,
  min,
  max,
  step = 0.01,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  const display = value.toFixed(2);
  return (
    <View style={styles.controlRow}>
      <Text style={styles.controlLabel} numberOfLines={1}>
        {label}
      </Text>
      <Slider
        style={styles.slider}
        minimumValue={min}
        maximumValue={max}
        step={step}
        value={value}
        onValueChange={onChange}
        minimumTrackTintColor={colors.border}
        maximumTrackTintColor={colors.surfaceElevated}
        thumbTintColor="#fff"
      />
      <Text style={styles.controlValue}>{display}</Text>
    </View>
  );
}

type Props = {
  visible: boolean;
  onClose: () => void;
  edl: EDL | null;
  onEdlChange: (patch: Partial<EDL>) => void;
};

type BottomSheetRef = { close: () => void };

function RenderBackdrop(props: BottomSheetBackdropProps) {
  return (
    <BottomSheetBackdrop
      {...props}
      appearsOnIndex={0}
      disappearsOnIndex={-1}
      opacity={0.5}
      pressBehavior="close"
    />
  );
}

export function AdjustSheet({ visible, onClose, edl, onEdlChange }: Props) {
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useRef<BottomSheetRef | null>(null);
  const color = edl?.color ?? DEFAULT_COLOR;
  const [activeTab, setActiveTab] = useState<AdjustTab>('Adjust');
  const [applyToAllClips, setApplyToAllClips] = useState(true);

  const snapPoints = useMemo(() => ['65%'], []);
  const sheetIndex = visible ? 0 : -1;

  const setColor = useCallback(
    (key: keyof EdlColor, value: number) => {
      const next = { ...color, [key]: Math.max(0.5, Math.min(2, value)) };
      onEdlChange({ color: next });
    },
    [color, onEdlChange]
  );

  const handleConfirm = useCallback(() => {
    (bottomSheetRef.current as BottomSheetRef | null)?.close?.();
    onClose();
  }, [onClose]);

  const handleChange = useCallback(
    (index: number) => {
      if (index <= 0) onClose();
    },
    [onClose]
  );

  const sat = color.saturation ?? 1;
  const con = color.contrast ?? 1;
  const vib = color.vibrance ?? 1;

  return (
    <BottomSheet
      ref={bottomSheetRef as never}
      index={sheetIndex}
      snapPoints={snapPoints}
      enablePanDownToClose
      onChange={handleChange}
      handleComponent={(props) => (
        <BottomSheetHandle {...props} style={styles.handle} indicatorStyle={styles.handleIndicator} />
      )}
      backgroundStyle={styles.sheetBackground}
      backdropComponent={RenderBackdrop}
    >
      <View style={styles.sheetContent}>
        <NativeViewGestureHandler disallowInterruption>
          <View style={styles.applySection}>
            <View style={styles.applyAllRow}>
              <TouchableOpacity
                style={styles.applyLeft}
                onPress={() => setApplyToAllClips((v) => !v)}
                activeOpacity={0.8}
              >
                <View style={[styles.radio, applyToAllClips && styles.radioChecked]} />
                <Text style={styles.toggleText} numberOfLines={1}>
                  Apply adjustments to all clips
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleConfirm}
                activeOpacity={0.8}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Check size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </NativeViewGestureHandler>

        <View style={styles.tabSection}>
          {ADJUST_TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab && styles.tabTextActive,
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'Adjust' && (
          <BottomSheetScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: 24 + insets.bottom }]}
            showsVerticalScrollIndicator={false}
          >
            <AdjustmentRow
            label="Exposure"
            value={1}
            min={0.5}
            max={2}
            onChange={() => {}}
          />
          <AdjustmentRow
            label="Clarity"
            value={1}
            min={0.5}
            max={2}
            onChange={() => {}}
          />
          <AdjustmentRow
            label="Highlights"
            value={1}
            min={0}
            max={2}
            onChange={() => {}}
          />
          <AdjustmentRow
            label="Shadows"
            value={1}
            min={0}
            max={2}
            onChange={() => {}}
          />
          <AdjustmentRow
            label="Contrast"
            value={con}
            min={0.5}
            max={2}
            onChange={(v) => setColor('contrast', v)}
          />
          <AdjustmentRow
            label="Brightness"
            value={1}
            min={0.5}
            max={2}
            onChange={() => {}}
          />
          <AdjustmentRow
            label="Saturation"
            value={sat}
            min={0.5}
            max={2}
            onChange={(v) => setColor('saturation', v)}
          />
          <AdjustmentRow
            label="Vibrance"
            value={vib}
            min={0.5}
            max={2}
            onChange={(v) => setColor('vibrance', v)}
          />
          </BottomSheetScrollView>
        )}

        {(activeTab === 'White balance' || activeTab === 'HSL' || activeTab === 'Style') && (
          <BottomSheetView style={styles.placeholder}>
            <Text style={styles.placeholderText}>{activeTab} — coming soon</Text>
          </BottomSheetView>
        )}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  handle: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  handleIndicator: {
    backgroundColor: colors.border,
    width: 36,
  },
  sheetBackground: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  sheetContent: {
    flex: 1,
    flexDirection: 'column',
  },
  applySection: {
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  applyAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  applyLeft: {
    flex: 1,
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
  },
  radioChecked: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '30',
  },
  toggleText: {
    fontSize: 15,
    color: colors.text,
    flexShrink: 1,
  },
  confirmBtn: {
    padding: 8,
    marginLeft: 8,
  },
  tabSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 14,
    gap: 8,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: colors.surfaceElevated,
  },
  tabText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.text,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 12,
  },
  controlLabel: {
    fontSize: 15,
    color: colors.text,
    minWidth: 88,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  controlValue: {
    fontSize: 14,
    color: colors.textSecondary,
    minWidth: 40,
    textAlign: 'right',
  },
  placeholder: {
    padding: 24,
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 15,
    color: colors.textSecondary,
  },
});
