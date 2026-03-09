import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { colors } from '../../theme/colors';
import type { ExportResolution, ExportFps } from '../../lib/edlLib';

export type ExportColor = 'SDR' | 'HDR';

export type ExportOptions = {
  resolution: ExportResolution;
  fps: ExportFps;
  color?: ExportColor;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions) => void;
  initialResolution?: ExportResolution;
  initialFps?: ExportFps;
  initialColor?: ExportColor;
  exporting?: boolean;
};

const RESOLUTIONS: ExportResolution[] = ['HD', '2K', '4K'];
const FPS_OPTIONS: ExportFps[] = [24, 30, 60];
const COLOR_OPTIONS: ExportColor[] = ['SDR', 'HDR'];

export function ExportModal({
  visible,
  onClose,
  onExport,
  initialResolution = 'HD',
  initialFps = 30,
  initialColor = 'SDR',
  exporting = false,
}: Props) {
  const [resolution, setResolution] = useState<ExportResolution>(initialResolution);
  const [fps, setFps] = useState<ExportFps>(initialFps);
  const [exportColor, setExportColor] = useState<ExportColor>(initialColor ?? 'SDR');

  const handleExport = () => {
    onExport({ resolution, fps, color: exportColor });
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>Export</Text>
          <Text style={styles.label}>Resolution</Text>
          <View style={styles.segmented}>
            {RESOLUTIONS.map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.segBtn, resolution === r && styles.segBtnActive]}
                onPress={() => setResolution(r)}
              >
                <Text style={[styles.segText, resolution === r && styles.segTextActive]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.label}>Frame rate</Text>
          <View style={styles.segmented}>
            {FPS_OPTIONS.map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.segBtn, fps === f && styles.segBtnActive]}
                onPress={() => setFps(f)}
              >
                <Text style={[styles.segText, fps === f && styles.segTextActive]}>{f} fps</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.label}>Color</Text>
          <View style={styles.segmented}>
            {COLOR_OPTIONS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.segBtn, exportColor === c && styles.segBtnActive]}
                onPress={() => setExportColor(c)}
              >
                <Text style={[styles.segText, exportColor === c && styles.segTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.exportBtn, exporting && styles.exportBtnDisabled]}
              onPress={handleExport}
              disabled={exporting}
            >
              <Text style={styles.exportText}>{exporting ? 'Exporting…' : 'Export'}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  segmented: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 4,
  },
  segBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  segBtnActive: {
    backgroundColor: colors.primary,
  },
  segText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  segTextActive: {
    color: '#fff',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  cancelText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  exportBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  exportBtnDisabled: {
    opacity: 0.7,
  },
  exportText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
