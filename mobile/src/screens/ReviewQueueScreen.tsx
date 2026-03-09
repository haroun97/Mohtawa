import { useState, useEffect, useMemo } from 'react';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootTabParamList, RootStackParamList } from '../navigation/types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import { RefreshCw } from 'lucide-react-native';
import type { ReviewQueueItem } from '@mohtawa/shared';
import { runsApi, workflowsApi } from '../lib/api/endpoints';
import { colors } from '../theme/colors';
import { VideoPreviewModal } from '../components/VideoPreviewModal';
import { usePlayableVideoUrl } from '../lib/playableUrl';

function statusPillColor(status: ReviewQueueItem['status']) {
  switch (status) {
    case 'needs_review':
      return colors.statusNeedsReview;
    case 'approved':
      return colors.statusApproved;
    case 'skipped':
      return colors.statusSkipped;
    case 'rendered':
      return colors.statusRendered;
    case 'failed':
      return colors.statusFailed;
    default:
      return colors.surfaceElevated;
  }
}

type FilterTab = 'all' | 'needs_review' | 'approved' | 'rendered' | 'skipped' | 'failed';

function filterItems(items: ReviewQueueItem[], filter: FilterTab, search: string): ReviewQueueItem[] {
  let list = filter === 'all' ? items : items.filter((i) => i.status === filter);
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    list = list.filter((i) => (i.title ?? '').toLowerCase().includes(q));
  }
  return list;
}

function ReviewQueueRow({
  item,
  runId,
  onPreview,
  onApprove,
  onSkip,
  onEdit,
  onRegenerate,
  onOpenDetail,
  isMutating,
  isRegenerating,
}: {
  item: ReviewQueueItem;
  runId: string;
  onPreview: (item: ReviewQueueItem) => void;
  onApprove: (item: ReviewQueueItem) => void;
  onSkip: (item: ReviewQueueItem) => void;
  onEdit: (item: ReviewQueueItem) => void;
  onRegenerate: (item: ReviewQueueItem) => void;
  onOpenDetail?: (item: ReviewQueueItem) => void;
  isMutating: boolean;
  isRegenerating: boolean;
}) {
  const canAct = item.status === 'needs_review';
  const isFailed = item.status === 'failed';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onOpenDetail?.(item)}
      activeOpacity={0.9}
    >
      <View style={styles.cardMain}>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        <View style={[styles.pill, { backgroundColor: statusPillColor(item.status) }]}>
          <Text style={styles.pillText}>{item.status}</Text>
        </View>
      </View>
      {isFailed && (item.errorMessage ?? item.failedNodeTitle) ? (
        <Text style={styles.errorLine} numberOfLines={2}>
          {item.failedNodeTitle ? `${item.failedNodeTitle}: ` : ''}
          {item.errorMessage ?? 'Unknown error'}
        </Text>
      ) : null}
      <View style={styles.actions}>
        {isFailed && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnRow]}
            onPress={() => onRegenerate(item)}
            disabled={isRegenerating}
          >
            {isRegenerating ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <RefreshCw color={colors.text} size={14} />
            )}
            <Text style={styles.actionBtnText}>Regenerate</Text>
          </TouchableOpacity>
        )}
        {(item.draftVideoUrl || item.finalVideoUrl) && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onPreview(item)}
            disabled={isMutating}
          >
            <Text style={styles.actionBtnText}>Preview</Text>
          </TouchableOpacity>
        )}
        {canAct && (
          <>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnPrimary]}
              onPress={() => onApprove(item)}
              disabled={isMutating}
            >
              <Text style={styles.actionBtnTextPrimary}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => onSkip(item)}
              disabled={isMutating}
            >
              <Text style={styles.actionBtnText}>Skip</Text>
            </TouchableOpacity>
          </>
        )}
        {item.projectId && item.status !== 'failed' && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onEdit(item)}
            disabled={isMutating}
          >
            <Text style={styles.actionBtnText}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

type ReviewQueueRoute = RouteProp<RootTabParamList, 'ReviewQueue'>;

export function ReviewQueueScreen() {
  const queryClient = useQueryClient();
  const route = useRoute<ReviewQueueRoute>();
  const navigation = useNavigation();
  const rootNav = navigation.getParent() as NativeStackNavigationProp<RootStackParamList, 'MainTabs'> | undefined;
  const paramRunId = route.params?.runId ?? '';
  const [runIdInput, setRunIdInput] = useState(paramRunId);
  const [previewItem, setPreviewItem] = useState<ReviewQueueItem | null>(null);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (paramRunId) setRunIdInput(paramRunId);
  }, [paramRunId]);

  const rawPreviewUrl = previewItem?.finalVideoUrl ?? previewItem?.draftVideoUrl ?? null;
  const { playUrl: previewPlayUrl, loading: previewUrlLoading } = usePlayableVideoUrl(rawPreviewUrl);

  const { data: workflows } = useQuery({
    queryKey: ['workflows'],
    queryFn: () => workflowsApi.list(),
  });

  const runId = runIdInput.trim() || undefined;

  const {
    data: queue,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['review-queue', runId!],
    queryFn: () => runsApi.getReviewQueue(runId!),
    enabled: !!runId,
  });

  const decideMutation = useMutation({
    mutationFn: ({
      runId: rId,
      iterationId,
      decision,
    }: {
      runId: string;
      iterationId: string;
      decision: 'approved' | 'skipped';
    }) => runsApi.decideReview(rId, iterationId, { decision }),
    onMutate: async ({ runId: rId, iterationId, decision }) => {
      await queryClient.cancelQueries({ queryKey: ['review-queue', rId] });
      const prev = queryClient.getQueryData<typeof queue>(['review-queue', rId]);
      if (prev) {
        queryClient.setQueryData(['review-queue', rId], {
          ...prev,
          items: prev.items.map((it) =>
            it.iterationId === iterationId
              ? {
                  ...it,
                  status: decision === 'approved' ? 'approved' as const : 'skipped' as const,
                  decision: decision as 'approved' | 'skipped',
                }
              : it
          ),
        });
      }
      return { prev };
    },
    onError: (_err, { runId: rId }, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['review-queue', rId], ctx.prev);
      Alert.alert('Error', 'Failed to save decision. Please try again.');
    },
    onSettled: (_, __, { runId: rId }) => {
      queryClient.invalidateQueries({ queryKey: ['review-queue', rId] });
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: ({ runId: rId, iterationId }: { runId: string; iterationId: string }) =>
      runsApi.regenerateDraft(rId, iterationId),
    onSettled: (_, __, { runId: rId }) => {
      queryClient.invalidateQueries({ queryKey: ['review-queue', rId] });
    },
    onError: (e) => Alert.alert('Error', (e as Error).message),
  });

  const handleApprove = (item: ReviewQueueItem) => {
    if (!runId) return;
    decideMutation.mutate({
      runId,
      iterationId: item.iterationId,
      decision: 'approved',
    });
  };

  const handleSkip = (item: ReviewQueueItem) => {
    if (!runId) return;
    decideMutation.mutate({
      runId,
      iterationId: item.iterationId,
      decision: 'skipped',
    });
  };

  const handlePreview = (item: ReviewQueueItem) => {
    setPreviewItem(item);
  };

  const handleEdit = (item: ReviewQueueItem) => {
    if (item.projectId) rootNav?.navigate('EdlEditor', { projectId: item.projectId });
  };

  const handleRegenerate = (item: ReviewQueueItem) => {
    if (runId) regenerateMutation.mutate({ runId, iterationId: item.iterationId });
  };

  const handleOpenDetail = (item: ReviewQueueItem) => {
    rootNav?.navigate('IterationDetail', {
      runId: runId!,
      iterationId: item.iterationId,
      title: item.title,
      draftVideoUrl: item.draftVideoUrl,
      finalVideoUrl: item.finalVideoUrl,
      projectId: item.projectId,
    });
  };

  const allItems = queue?.items ?? [];
  const items = useMemo(
    () => filterItems(allItems, filter, search),
    [allItems, filter, search]
  );

  return (
    <View style={styles.container}>
      <VideoPreviewModal
        visible={!!previewItem}
        videoUrl={previewUrlLoading ? null : previewPlayUrl}
        title={previewItem?.title}
        onClose={() => setPreviewItem(null)}
      />
      <View style={styles.controls}>
        <TextInput
          style={styles.input}
          placeholder="Run ID (or pick from Runs tab)"
          placeholderTextColor={colors.textSecondary}
          value={runIdInput}
          onChangeText={setRunIdInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {runId && queue ? (
          <>
            <TextInput
              style={[styles.input, styles.searchInput]}
              placeholder="Search by title…"
              placeholderTextColor={colors.textSecondary}
              value={search}
              onChangeText={setSearch}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              {(['all', 'needs_review', 'approved', 'rendered', 'skipped', 'failed'] as const).map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterPill, filter === f && styles.filterPillActive]}
                  onPress={() => setFilter(f)}
                >
                  <Text style={[styles.filterPillText, filter === f && styles.filterPillTextActive]}>
                    {f === 'all' ? 'All' : f.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        ) : null}
        {workflows && workflows.length > 0 && !runIdInput.trim() && (
          <Text style={styles.hint}>
            Or go to Runs, pick a run, then tap "Review queue".
          </Text>
        )}
      </View>

      {!runId ? (
        <View style={styles.centered}>
          <Text style={styles.subtitle}>Enter a run ID to load the review queue</Text>
        </View>
      ) : isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.subtitle}>Loading review queue…</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.error}>Failed to load review queue</Text>
          <Text style={styles.subtitle}>{(error as Error).message}</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.iterationId}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            queue ? (
              <Text style={styles.sectionTitle}>
                {queue.workflowName || 'Review queue'} · {queue.totalItems} items
                {queue.counts?.needsReview > 0 ? ` · ${queue.counts.needsReview} need review` : ''}
              </Text>
            ) : null
          }
          renderItem={({ item }) => (
            <ReviewQueueRow
              item={item}
              runId={runId}
              onPreview={handlePreview}
              onApprove={handleApprove}
              onSkip={handleSkip}
              onEdit={handleEdit}
              onRegenerate={handleRegenerate}
              onOpenDetail={handleOpenDetail}
              isMutating={decideMutation.isPending}
              isRegenerating={regenerateMutation.isPending}
            />
          )}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.subtitle}>No items in review queue</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  controls: {
    padding: 16,
    paddingBottom: 8,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
  },
  hint: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 8,
  },
  searchInput: { marginTop: 8 },
  filterScroll: { marginTop: 8, marginBottom: 4 },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterPillText: { fontSize: 13, color: colors.text },
  filterPillTextActive: { fontSize: 13, color: '#fff', fontWeight: '600' },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
    marginHorizontal: 16,
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginRight: 10,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  errorLine: {
    fontSize: 11,
    color: colors.error,
    marginBottom: 8,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.surfaceElevated,
  },
  actionBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtnPrimary: {
    backgroundColor: colors.primary,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  actionBtnTextPrimary: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  error: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.error,
    marginBottom: 8,
  },
});
