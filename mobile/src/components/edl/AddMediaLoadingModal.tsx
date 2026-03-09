import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../../theme/colors';

type Props = {
  visible: boolean;
  statusText?: string;
  /** 0–100; when set, shows progress bar and percentage instead of only spinner */
  progress?: number;
  onCancel?: () => void;
};

export function AddMediaLoadingModal({
  visible,
  statusText = 'Loading media',
  progress,
  onCancel,
}: Props) {
  const showProgress = typeof progress === 'number';
  const percent = showProgress ? Math.min(100, Math.max(0, Math.round(progress))) : 0;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.overlay}>
        <View style={styles.card}>
          <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} />
          <Text style={styles.statusText}>{statusText}</Text>
          {showProgress && (
            <View style={styles.progressSection}>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${percent}%` }]} />
              </View>
              <Text style={styles.progressPct}>{percent}%</Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.cancelBtn, !onCancel && styles.cancelBtnDisabled]}
            onPress={onCancel}
            disabled={!onCancel}
            activeOpacity={0.7}
          >
            <Text style={[styles.cancelText, !onCancel && styles.cancelTextDisabled]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 28,
    paddingHorizontal: 32,
    minWidth: 260,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  spinner: {
    marginBottom: 16,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  progressSection: {
    width: '100%',
    marginBottom: 20,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  progressPct: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  cancelBtnDisabled: {
    opacity: 0.5,
  },
  cancelText: {
    fontSize: 15,
    color: colors.primary,
  },
  cancelTextDisabled: {
    color: colors.textSecondary,
  },
});
