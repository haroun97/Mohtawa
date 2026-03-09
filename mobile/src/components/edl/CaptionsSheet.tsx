import React, { useState } from 'react';
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
import { X, Plus, Trash2 } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import type { EDL, EdlTextOverlay } from '../../lib/edlLib';
import { SUBTITLE_PRESETS } from '../../lib/edlLib';

type Props = {
  visible: boolean;
  onClose: () => void;
  edl: EDL | null;
  onEdlChange: (patch: Partial<EDL>) => void;
  onDeleteOverlay: (index: number) => void;
};

export function CaptionsSheet({
  visible,
  onClose,
  edl,
  onEdlChange,
  onDeleteOverlay,
}: Props) {
  if (!edl || !visible) return null;
  const overlays = edl.overlays as EdlTextOverlay[];

  const updateOverlay = (index: number, patch: Partial<EdlTextOverlay>) => {
    const next = overlays.map((o, i) =>
      i === index ? { ...o, ...patch } : o
    ) as EdlTextOverlay[];
    onEdlChange({ overlays: next });
  };
  const addOverlay = () => {
    const totalDuration = edl.timeline.reduce(
      (acc, c) => acc + Math.max(0.04, c.outSec - c.inSec),
      0
    );
    const newOverlay: EdlTextOverlay = {
      id: `overlay-${overlays.length}-${Date.now()}`,
      type: 'text',
      text: 'New caption',
      startSec: 0,
      endSec: Math.max(5, totalDuration * 0.2),
      stylePreset: 'bold_white_shadow',
    };
    onEdlChange({ overlays: [...overlays, newOverlay] });
  };

  return (
    <Modal visible transparent animationType="slide">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>Captions</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.body}>
            <TouchableOpacity style={styles.addBtn} onPress={addOverlay}>
              <Plus size={18} color={colors.primary} />
              <Text style={styles.addBtnText}>Add caption</Text>
            </TouchableOpacity>
            {overlays.map((ov, i) => (
              <View key={ov.id ?? `ov-${i}`} style={styles.overlayCard}>
                <Text style={styles.overlayIndex}>Caption {i + 1}</Text>
                <TextInput
                  style={styles.input}
                  value={ov.text}
                  onChangeText={(t) => updateOverlay(i, { text: t })}
                  placeholder="Text"
                  placeholderTextColor={colors.textSecondary}
                />
                <View style={styles.row}>
                  <Text style={styles.label}>Style</Text>
                  <View style={styles.presetRow}>
                    {SUBTITLE_PRESETS.map((p) => (
                      <TouchableOpacity
                        key={p.value}
                        style={[
                          styles.presetBtn,
                          ov.stylePreset === p.value && styles.presetBtnActive,
                        ]}
                        onPress={() => updateOverlay(i, { stylePreset: p.value })}
                      >
                        <Text
                          style={[
                            styles.presetBtnText,
                            ov.stylePreset === p.value && styles.presetBtnTextActive,
                          ]}
                        >
                          {p.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={styles.inOutRow}>
                  <TextInput
                    style={styles.smallInput}
                    value={String(ov.startSec.toFixed(1))}
                    onChangeText={(t) =>
                      updateOverlay(i, { startSec: Math.max(0, parseFloat(t) || 0) })
                    }
                    placeholder="Start"
                    keyboardType="decimal-pad"
                  />
                  <Text style={styles.toText}>–</Text>
                  <TextInput
                    style={styles.smallInput}
                    value={String(ov.endSec.toFixed(1))}
                    onChangeText={(t) =>
                      updateOverlay(i, { endSec: Math.max(ov.startSec + 0.1, parseFloat(t) || 0) })
                    }
                    placeholder="End"
                    keyboardType="decimal-pad"
                  />
                </View>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => onDeleteOverlay(i)}
                >
                  <Trash2 size={18} color={colors.error} />
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
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
    maxHeight: '75%',
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
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.background,
    borderRadius: 10,
  },
  addBtnText: { fontSize: 16, color: colors.primary, fontWeight: '600' },
  overlayCard: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  overlayIndex: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    color: colors.text,
    marginBottom: 8,
  },
  label: { fontSize: 12, color: colors.textSecondary, marginBottom: 4 },
  row: { marginBottom: 8 },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  presetBtn: { paddingVertical: 6, paddingHorizontal: 10, backgroundColor: colors.surface, borderRadius: 8 },
  presetBtnActive: { backgroundColor: colors.primary },
  presetBtnText: { fontSize: 13, color: colors.text },
  presetBtnTextActive: { color: '#fff' },
  inOutRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  smallInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    color: colors.text,
  },
  toText: { fontSize: 14, color: colors.textSecondary },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  deleteBtnText: { fontSize: 14, color: colors.error, fontWeight: '500' },
});
