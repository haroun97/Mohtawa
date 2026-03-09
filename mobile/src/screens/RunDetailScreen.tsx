import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { useQuery } from '@tanstack/react-query';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { ArrowLeft, CheckCircle2, XCircle, Loader2, Clock, ClipboardCheck, Download } from 'lucide-react-native';
import { executionsApi, type ExecutionStepLog } from '../lib/api/endpoints';
import { storageApi } from '../lib/api/endpoints';
import { colors } from '../theme/colors';

type Route = RouteProp<RootStackParamList, 'RunDetail'>;
type Nav = NativeStackNavigationProp<RootStackParamList, 'RunDetail'>;

const statusIcon: Record<string, React.ComponentType<{ color: string; size: number }>> = {
  idle: Clock,
  running: Loader2,
  success: CheckCircle2,
  error: XCircle,
  waiting_review: ClipboardCheck,
};

function getFinalVideoFromLogs(logs: ExecutionStepLog[]): { url?: string; key?: string } | null {
  for (const step of logs) {
    const out = step.output as { finalVideoUrl?: string; finalVideoKey?: string } | undefined;
    if (!out || typeof out !== 'object') continue;
    if (typeof out.finalVideoUrl === 'string' && out.finalVideoUrl.trim()) return { url: out.finalVideoUrl };
    if (typeof out.finalVideoKey === 'string' && out.finalVideoKey.trim()) return { key: out.finalVideoKey };
    if (typeof out.finalVideoUrl === 'string' && out.finalVideoUrl.startsWith('s3://')) {
      const m = out.finalVideoUrl.match(/^s3:\/\/([^/]+)\/(.+)$/);
      if (m) return { key: m[2] };
    }
  }
  return null;
}

export function RunDetailScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { runId, workflowId, workflowName } = route.params;

  const { data: execution, isLoading, error } = useQuery({
    queryKey: ['workflows', workflowId, 'executions', runId],
    queryFn: () => executionsApi.get(workflowId!, runId),
    enabled: !!workflowId && !!runId,
  });

  const openReviewQueue = () => {
    nav.navigate('MainTabs', { screen: 'ReviewQueue', params: { runId } });
    nav.goBack();
  };

  const handleDownloadFinalVideo = async () => {
    if (!execution?.logs?.length) return;
    const final = getFinalVideoFromLogs(execution.logs);
    if (!final) return;
    try {
      const url = final.url?.startsWith('http')
        ? final.url
        : final.key
          ? (await storageApi.playUrl(final.key)).url
          : null;
      if (url) await Linking.openURL(url);
      else Alert.alert('Error', 'Could not get video URL.');
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    }
  };

  const finalVideo = execution?.logs ? getFinalVideoFromLogs(execution.logs) : null;
  const steps = execution?.logs ?? [];
  const statusLabel = execution?.status?.replace(/_/g, ' ') ?? '—';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <ArrowLeft color={colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>Run</Text>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        <Text style={styles.id}>Run ID: {runId.slice(0, 12)}…</Text>
        {workflowName ? <Text style={styles.meta}>{workflowName}</Text> : null}

        {!workflowId ? (
          <Text style={styles.hint}>Open this run from a workflow to see step logs.</Text>
        ) : isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.subtitle}>Loading run…</Text>
          </View>
        ) : error ? (
          <Text style={styles.errorText}>Failed to load run: {(error as Error).message}</Text>
        ) : execution ? (
          <>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Status</Text>
              <Text style={styles.statusValue}>{statusLabel}</Text>
            </View>
            {execution.startedAt ? (
              <Text style={styles.time}>
                Started {new Date(execution.startedAt).toLocaleString()}
                {execution.completedAt
                  ? ` · Completed ${new Date(execution.completedAt).toLocaleString()}`
                  : ''}
              </Text>
            ) : null}
            {execution.error ? (
              <Text style={styles.runError}>{execution.error}</Text>
            ) : null}

            <TouchableOpacity style={styles.primaryBtn} onPress={openReviewQueue}>
              <Text style={styles.primaryBtnText}>Open Review Queue</Text>
            </TouchableOpacity>

            {finalVideo ? (
              <TouchableOpacity style={styles.secondaryBtn} onPress={handleDownloadFinalVideo}>
                <Download color={colors.primary} size={20} />
                <Text style={styles.secondaryBtnText}>Open final video</Text>
              </TouchableOpacity>
            ) : null}

            <Text style={styles.sectionTitle}>Steps</Text>
            {steps.length === 0 ? (
              <Text style={styles.empty}>No steps recorded.</Text>
            ) : (
              steps.map((step) => {
                const Icon = statusIcon[step.status] ?? Clock;
                return (
                  <View key={step.nodeId} style={styles.stepCard}>
                    <Icon
                      color={
                        step.status === 'success'
                          ? colors.primary
                          : step.status === 'error'
                            ? colors.error
                            : step.status === 'waiting_review'
                              ? '#d97706'
                              : colors.textSecondary
                      }
                      size={20}
                      style={styles.stepIcon}
                    />
                    <View style={styles.stepBody}>
                      <Text style={styles.stepTitle} numberOfLines={1}>
                        {step.nodeTitle || step.nodeType || step.nodeId}
                      </Text>
                      <Text style={styles.stepMeta}>
                        {step.status.replace(/_/g, ' ')}
                        {step.completedAt
                          ? ` · ${new Date(step.completedAt).toLocaleTimeString()}`
                          : ''}
                      </Text>
                      {step.error ? (
                        <Text style={styles.stepError} numberOfLines={2}>
                          {step.error}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                );
              })
            )}
          </>
        ) : null}
      </ScrollView>
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
  title: { fontSize: 18, fontWeight: '600', color: colors.text },
  body: { flex: 1 },
  bodyContent: { padding: 24, paddingBottom: 32 },
  id: { fontSize: 14, color: colors.textSecondary, fontFamily: 'monospace' },
  meta: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  hint: { fontSize: 14, color: colors.textSecondary, marginTop: 12 },
  centered: { paddingVertical: 24, alignItems: 'center' },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 8 },
  errorText: { fontSize: 14, color: colors.error, marginTop: 12 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 8 },
  statusLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  statusValue: { fontSize: 14, color: colors.textSecondary, textTransform: 'capitalize' },
  time: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  runError: { fontSize: 14, color: colors.error, marginTop: 8 },
  primaryBtn: {
    marginTop: 20,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: colors.primary,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  primaryBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
  },
  secondaryBtnText: { fontSize: 15, fontWeight: '600', color: colors.primary },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 24, marginBottom: 12 },
  empty: { fontSize: 14, color: colors.textSecondary },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepIcon: { marginRight: 12 },
  stepBody: { flex: 1, minWidth: 0 },
  stepTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  stepMeta: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  stepError: { fontSize: 13, color: colors.error, marginTop: 4 },
});
