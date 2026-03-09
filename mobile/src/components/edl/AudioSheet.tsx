import React from 'react';
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
  onEdlChange: (patch: Partial<EDL>) => void;
};

export function AudioSheet({ visible, onClose, edl, onEdlChange }: Props) {
  const audio = edl?.audio;
  if (!audio) return null;
  if (!visible) return null;

  const voiceVol = Math.round((audio.voiceVolume ?? 1) * 100);
  const musicVol = Math.round((audio.musicVolume ?? 0.5) * 100);
  const setVoice = (v: number) =>
    onEdlChange({ audio: { ...audio, voiceVolume: v / 100 } });
  const setMusic = (v: number) =>
    onEdlChange({ audio: { ...audio, musicVolume: v / 100 } });
  const setMusicEnabled = (e: boolean) =>
    onEdlChange({ audio: { ...audio, musicEnabled: e } });
  const setVideoMuted = (m: boolean) =>
    onEdlChange({ audio: { ...audio, videoTrackMuted: m } });
  const setAudioMuted = (m: boolean) =>
    onEdlChange({ audio: { ...audio, audioTrackMuted: m } });

  return (
    <Modal visible transparent animationType="slide">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>Audio</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.body}>
            <Text style={styles.label}>Voice volume %</Text>
            <TextInput
              style={styles.input}
              value={String(voiceVol)}
              onChangeText={(t) => setVoice(Math.max(0, Math.min(100, parseInt(t, 10) || 0)))}
              keyboardType="number-pad"
            />
            <Text style={styles.label}>Music volume %</Text>
            <TextInput
              style={styles.input}
              value={String(musicVol)}
              onChangeText={(t) => setMusic(Math.max(0, Math.min(100, parseInt(t, 10) || 0)))}
              keyboardType="number-pad"
            />
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Music enabled</Text>
              <TouchableOpacity
                style={[styles.toggle, audio.musicEnabled && styles.toggleOn]}
                onPress={() => setMusicEnabled(!audio.musicEnabled)}
              >
                <Text style={styles.toggleText}>{audio.musicEnabled ? 'On' : 'Off'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Video track muted</Text>
              <TouchableOpacity
                style={[styles.toggle, audio.videoTrackMuted && styles.toggleOn]}
                onPress={() => setVideoMuted(!audio.videoTrackMuted)}
              >
                <Text style={styles.toggleText}>{audio.videoTrackMuted ? 'Yes' : 'No'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Audio track muted</Text>
              <TouchableOpacity
                style={[styles.toggle, audio.audioTrackMuted && styles.toggleOn]}
                onPress={() => setAudioMuted(!audio.audioTrackMuted)}
              >
                <Text style={styles.toggleText}>{audio.audioTrackMuted ? 'Yes' : 'No'}</Text>
              </TouchableOpacity>
            </View>
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
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    marginBottom: 12,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  rowLabel: { fontSize: 15, color: colors.text },
  toggle: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: colors.background, borderRadius: 8 },
  toggleOn: { backgroundColor: colors.primary },
  toggleText: { fontSize: 14, color: colors.text },
});
