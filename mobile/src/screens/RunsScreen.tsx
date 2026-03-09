import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { useQuery } from '@tanstack/react-query';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { PlayCircle } from 'lucide-react-native';
import { workflowsApi, executionsApi } from '../lib/api/endpoints';
import { colors } from '../theme/colors';

type Nav = NativeStackNavigationProp<RootStackParamList, 'MainTabs'>;

export function RunsScreen() {
  const navigation = useNavigation<Nav>();
  const rootNav = navigation.getParent() as Nav | undefined;
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);

  const { data: workflows, isLoading: loadingWorkflows } = useQuery({
    queryKey: ['workflows'],
    queryFn: () => workflowsApi.list(),
  });

  const workflowId = selectedWorkflowId ?? workflows?.[0]?.id ?? null;

  const { data: executions, isLoading: loadingRuns } = useQuery({
    queryKey: ['workflows', workflowId, 'executions'],
    queryFn: () => executionsApi.list(workflowId!),
    enabled: !!workflowId,
  });

  const workflowList = workflows ?? [];
  const runList = executions ?? [];
  const selectedWorkflow = workflowList.find((w) => w.id === workflowId);

  if (loadingWorkflows) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.subtitle}>Loading…</Text>
      </View>
    );
  }

  if (workflowList.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.subtitle}>No workflows. Create one on the web or in Projects.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.pickerRow}>
        <Text style={styles.pickerLabel}>Workflow</Text>
        <FlatList
          horizontal
          data={workflowList}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pickerList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.pill,
                workflowId === item.id && styles.pillActive,
              ]}
              onPress={() => setSelectedWorkflowId(item.id)}
            >
              <Text
                style={[styles.pillText, workflowId === item.id && styles.pillTextActive]}
                numberOfLines={1}
              >
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {loadingRuns ? (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={runList}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            selectedWorkflow ? (
              <Text style={styles.sectionTitle}>Runs for {selectedWorkflow.name}</Text>
            ) : null
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.7}
              onPress={() =>
                rootNav?.navigate('RunDetail', {
                  runId: item.id,
                  workflowId: selectedWorkflow?.id,
                  workflowName: selectedWorkflow?.name,
                })
              }
            >
              <PlayCircle color={colors.primary} size={22} style={styles.cardIcon} />
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>Run {item.id.slice(0, 8)}</Text>
                <Text style={styles.cardMeta}>
                  {item.status} · {new Date(item.startedAt).toLocaleDateString()}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.subtitle}>No runs yet for this workflow</Text>
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
  pickerRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  pickerLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  pickerList: {
    gap: 8,
    paddingBottom: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  pillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillText: {
    fontSize: 14,
    color: colors.text,
  },
  pillTextActive: {
    color: '#fff',
  },
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardIcon: {
    marginRight: 12,
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  cardMeta: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
});
