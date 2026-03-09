import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { ArrowLeft, PlayCircle, Box } from 'lucide-react-native';
import { workflowsApi, executionsApi } from '../lib/api/endpoints';
import { colors } from '../theme/colors';

type Route = RouteProp<RootStackParamList, 'WorkflowDetail'>;
type Nav = NativeStackNavigationProp<RootStackParamList, 'WorkflowDetail'>;

function getNodeLabel(node: unknown): string {
  if (node && typeof node === 'object' && 'data' in node) {
    const data = (node as { data?: { definition?: { title?: string }; type?: string } }).data;
    if (data?.definition?.title) return String(data.definition.title);
    if (data?.type) return String(data.type);
  }
  if (node && typeof node === 'object' && 'type' in node)
    return String((node as { type: string }).type);
  if (node && typeof node === 'object' && 'id' in node)
    return String((node as { id: string }).id).slice(0, 12);
  return 'Node';
}

function getNodeType(node: unknown): string {
  if (node && typeof node === 'object' && 'data' in node) {
    const data = (node as { data?: { definition?: { type?: string; category?: string } } }).data;
    if (data?.definition?.type) return String(data.definition.type);
    if (data?.definition?.category) return String(data.definition.category);
  }
  if (node && typeof node === 'object' && 'type' in node)
    return String((node as { type: string }).type);
  return '';
}

export function WorkflowDetailScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Route>();
  const queryClient = useQueryClient();
  const { workflowId } = route.params;

  const { data: workflow, isLoading: loadingWf, error: errorWf } = useQuery({
    queryKey: ['workflows', workflowId],
    queryFn: () => workflowsApi.get(workflowId),
    enabled: !!workflowId,
  });

  const { data: executions, isLoading: loadingRuns } = useQuery({
    queryKey: ['workflows', workflowId, 'executions'],
    queryFn: () => executionsApi.list(workflowId),
    enabled: !!workflowId,
  });

  const runMutation = useMutation({
    mutationFn: () => workflowsApi.execute(workflowId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows', workflowId, 'executions'] });
      queryClient.invalidateQueries({ queryKey: ['workflows', workflowId] });
    },
    onError: (e) => Alert.alert('Run failed', (e as Error).message),
  });

  const runs = executions ?? [];
  const nodes = Array.isArray(workflow?.nodes) ? workflow.nodes : [];
  const workflowName = workflow?.name ?? 'Workflow';

  const openRunDetail = (runId: string) => {
    nav.navigate('RunDetail', { runId, workflowId, workflowName });
  };

  const openReviewQueue = (runId: string) => {
    nav.navigate('MainTabs', { screen: 'ReviewQueue', params: { runId } });
    nav.goBack();
  };

  if (loadingWf && !workflow) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.subtitle}>Loading workflow…</Text>
      </View>
    );
  }

  if (errorWf || !workflow) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>Workflow not found</Text>
        <TouchableOpacity style={styles.backBtnStandalone} onPress={() => nav.goBack()}>
          <Text style={styles.backBtnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <ArrowLeft color={colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{workflow.name}</Text>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.meta}>
          {workflow.description || 'No description'} · {workflow.status}
        </Text>
        <Text style={styles.metaSmall}>
          {nodes.length} node{nodes.length !== 1 ? 's' : ''}
        </Text>

        <TouchableOpacity
          style={styles.runButton}
          onPress={() => runMutation.mutate()}
          disabled={runMutation.isPending}
        >
          {runMutation.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <PlayCircle color="#fff" size={22} />
              <Text style={styles.runButtonText}>Run workflow</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.canvasButton}
          onPress={() => nav.navigate('BuilderCanvas', { workflowId })}
        >
          <Text style={styles.canvasButtonText}>Edit canvas</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Nodes</Text>
        {nodes.length === 0 ? (
          <Text style={styles.empty}>No nodes in this workflow.</Text>
        ) : (
          nodes.map((node, index) => {
            const id = (node as { id?: string })?.id ?? `node-${index}`;
            return (
              <View key={id} style={styles.nodeCard}>
                <Box color={colors.primary} size={20} style={styles.nodeIcon} />
                <View style={styles.nodeCardBody}>
                  <Text style={styles.nodeCardTitle} numberOfLines={1}>
                    {getNodeLabel(node)}
                  </Text>
                  {getNodeType(node) ? (
                    <Text style={styles.nodeCardType} numberOfLines={1}>
                      {getNodeType(node)}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })
        )}

        <Text style={styles.sectionTitle}>Runs</Text>
        {loadingRuns ? (
          <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
        ) : runs.length === 0 ? (
          <Text style={styles.empty}>No runs yet. Tap "Run workflow" to start.</Text>
        ) : (
          runs.map((item) => (
            <View key={item.id} style={styles.runCard}>
              <TouchableOpacity
                style={styles.runCardMain}
                onPress={() => openRunDetail(item.id)}
                activeOpacity={0.7}
              >
                <PlayCircle color={colors.primary} size={20} />
                <View style={styles.runCardBody}>
                  <Text style={styles.runCardId}>{item.id.slice(0, 8)}…</Text>
                  <Text style={styles.runCardMeta}>
                    {item.status} · {new Date(item.startedAt).toLocaleString()}
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.reviewLink}
                onPress={() => openReviewQueue(item.id)}
              >
                <Text style={styles.reviewLinkText}>Review queue</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
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
  backBtnStandalone: { marginTop: 16, padding: 12 },
  backBtnText: { fontSize: 16, color: colors.primary, fontWeight: '500' },
  title: { flex: 1, fontSize: 18, fontWeight: '600', color: colors.text },
  body: { flex: 1 },
  bodyContent: { padding: 24, paddingBottom: 32 },
  meta: { fontSize: 14, color: colors.textSecondary },
  metaSmall: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  runButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: colors.primary,
    borderRadius: 10,
  },
  runButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  canvasButton: {
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
  },
  canvasButtonText: { fontSize: 15, fontWeight: '600', color: colors.primary },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 24, marginBottom: 12 },
  loader: { marginTop: 12 },
  nodeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  nodeIcon: { marginRight: 12 },
  nodeCardBody: { flex: 1, minWidth: 0 },
  nodeCardTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  nodeCardType: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  runCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  runCardMain: { flexDirection: 'row', alignItems: 'center' },
  runCardBody: { flex: 1, marginLeft: 12 },
  runCardId: { fontSize: 15, fontWeight: '600', color: colors.text, fontFamily: 'monospace' },
  runCardMeta: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  reviewLink: { marginTop: 10, paddingVertical: 6 },
  reviewLinkText: { fontSize: 14, color: colors.primary, fontWeight: '500' },
  empty: { fontSize: 14, color: colors.textSecondary },
  subtitle: { fontSize: 16, color: colors.textSecondary, marginTop: 12 },
  error: { fontSize: 17, fontWeight: '600', color: colors.error },
});
