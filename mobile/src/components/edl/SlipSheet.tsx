import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { X } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import type { EdlTimelineClip } from '../../lib/edlLib';

type Props = {
  visible: boolean;
  clip: EdlTimelineClip | null;
  clipIndex: number;
  originalInSec: number;
  onConfirm: (newInSec: number) => void;
  onCancel: () => void;
};

export function SlipSheet({
  visible,
  clip,
  clipIndex,
  originalInSec,
  onConfirm,
  onCancel,
}: Props) {
  const [localIn, setLocalIn] = useState(originalInSec);
  useEffect(() => {
    if (clip) setLocalIn(clip.inSec);
  }, [clip?.inSec, visible]);

  if (!visible || !clip) return null;
  const duration = Math.max(0.04, clip.outSec - clip.inSec);
  const sourceMax = clip.sourceDurationSec ?? clip.outSec + 300;
  const maxIn = Math.max(0, sourceMax - duration);

  const handleConfirm = () => {
    const inVal = Math.max(0, Math.min(maxIn, localIn));
    onConfirm(inVal);
  };

  return (
    <Modal visible transparent animationType="slide">
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>Slip — Clip {clipIndex + 1}</Text>
            <TouchableOpacity onPress={onCancel} style={styles.closeBtn}>
              <X size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.body}>
            <Text style={styles.hint}>
              Change source in-point. Duration stays the same.
            </Text>
            <Text style={styles.label}>In (source start) sec</Text>
            <TextInput
              style={styles.input}
              value={String(localIn.toFixed(2))}
              onChangeText={(t) => setLocalIn(parseFloat(t) || 0)}
              keyboardType="decimal-pad"
            />
            <View style={styles.buttons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
                <Text style={styles.confirmBtnText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
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
  hint: { fontSize: 13, color: colors.textSecondary, marginBottom: 12 },
  label: { fontSize: 14, color: colors.textSecondary, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    marginBottom: 16,
  },
  buttons: { flexDirection: 'row', gap: 12, justifyContent: 'flex-end' },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 20 },
  cancelBtnText: { fontSize: 16, color: colors.textSecondary },
  confirmBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: colors.primary,
    borderRadius: 10,
  },
  confirmBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
