import { useState } from 'react';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { ArrowLeft, Film, Pencil } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { VideoPreviewModal } from '../components/VideoPreviewModal';
import { usePlayableVideoUrl } from '../lib/playableUrl';

type Route = RouteProp<RootStackParamList, 'IterationDetail'>;
type Nav = NativeStackNavigationProp<RootStackParamList, 'IterationDetail'>;

export function IterationDetailScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { runId, iterationId, title, draftVideoUrl, finalVideoUrl, projectId } = route.params;
  const [previewOpen, setPreviewOpen] = useState(false);

  const rawVideoUrl = finalVideoUrl ?? draftVideoUrl ?? null;
  const { playUrl } = usePlayableVideoUrl(rawVideoUrl);

  const openEdit = () => {
    if (projectId) nav.navigate('EdlEditor', { projectId });
  };

  return (
    <View style={styles.container}>
      <VideoPreviewModal
        visible={previewOpen}
        videoUrl={playUrl}
        title={title}
        onClose={() => setPreviewOpen(false)}
      />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <ArrowLeft color={colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{title || 'Iteration'}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.meta}>Run: {runId}</Text>
        <Text style={styles.meta}>Iteration: {iterationId}</Text>
        {(draftVideoUrl || finalVideoUrl) && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setPreviewOpen(true)}
          >
            <Film color={colors.text} size={20} />
            <Text style={styles.actionBtnText}>Preview video</Text>
          </TouchableOpacity>
        )}
        {projectId && (
          <TouchableOpacity style={styles.actionBtn} onPress={openEdit}>
            <Pencil color={colors.text} size={20} />
            <Text style={styles.actionBtnText}>Edit draft</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { padding: 4, marginRight: 8 },
  title: { flex: 1, fontSize: 18, fontWeight: '600', color: colors.text },
  body: { flex: 1, padding: 24 },
  meta: { fontSize: 14, color: colors.textSecondary, fontFamily: 'monospace' },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionBtnText: { fontSize: 16, fontWeight: '600', color: colors.text },
});
