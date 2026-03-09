import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { X } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import type { EDL } from '../../lib/edlLib';

type Props = {
  visible: boolean;
  onClose: () => void;
  edl: EDL | null;
  selectedClipIndex: number | null;
  onTrimApply: (index: number, inSec: number, outSec: number) => void;
};

export function TrimSheet({
  visible,
  onClose,
  edl,
  selectedClipIndex,
  onTrimApply,
}: Props) {
  const clip =
    edl && selectedClipIndex != null && selectedClipIndex < edl.timeline.length
      ? edl.timeline[selectedClipIndex]
      : null;
  const [localIn, setLocalIn] = useState(clip?.inSec ?? 0);
  const [localOut, setLocalOut] = useState(clip?.outSec ?? 0);

  useEffect(() => {
    if (clip) {
      setLocalIn(clip.inSec);
      setLocalOut(clip.outSec);
    }
  }, [clip?.inSec, clip?.outSec, selectedClipIndex]);

  const sourceMax = clip?.sourceDurationSec ?? (clip ? clip.outSec + 300 : 100);

  const handleCommit = () => {
    if (clip == null || selectedClipIndex == null) return;
    const inVal = Math.max(0, Math.min(sourceMax - 0.04, localIn));
    const outVal = Math.max(inVal + 0.04, Math.min(sourceMax, localOut));
    onTrimApply(selectedClipIndex, inVal, outVal);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="slide">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>
              Trim — Clip {selectedClipIndex != null ? selectedClipIndex + 1 : ''}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
          {clip && (
            <ScrollView style={styles.body}>
              <Text style={styles.label}>In (start) sec</Text>
              <TextInput
                style={styles.input}
                value={String(localIn.toFixed(2))}
                onChangeText={(t) => setLocalIn(parseFloat(t) || 0)}
                keyboardType="decimal-pad"
                placeholderTextColor={colors.textSecondary}
              />
              <Text style={styles.label}>Out (end) sec</Text>
              <TextInput
                style={styles.input}
                value={String(localOut.toFixed(2))}
                onChangeText={(t) => setLocalOut(parseFloat(t) || 0)}
                keyboardType="decimal-pad"
                placeholderTextColor={colors.textSecondary}
              />
              <Text style={styles.hint}>Duration: {(localOut - localIn).toFixed(2)}s</Text>
              <TouchableOpacity style={styles.applyBtn} onPress={handleCommit}>
                <Text style={styles.applyBtnText}>Apply</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 18, fontWeight: '600', color: colors.text },
  closeBtn: { padding: 8 },
  body: { padding: 16 },
  label: { fontSize: 14, color: colors.textSecondary, marginBottom: 4 },
  hint: { fontSize: 13, color: colors.textSecondary, marginTop: 8 },
  applyBtn: {
    marginTop: 24,
    paddingVertical: 14,
    backgroundColor: colors.primary,
    borderRadius: 10,
    alignItems: 'center',
  },
  applyBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
