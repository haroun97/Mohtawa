import { useState, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type RootNav = NativeStackNavigationProp<RootStackParamList, 'MainTabs'>;
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
  Modal,
  Pressable,
} from 'react-native';
import { FolderOpen, Plus, MoreHorizontal, FileText, Mic, Settings, LogOut, UploadCloud, Film } from 'lucide-react-native';
import type { WorkflowListItem } from '@mohtawa/shared';
import { useAuthStore } from '../store/authStore';
import { workflowsApi, projectsApi } from '../lib/api/endpoints';
import { colors } from '../theme/colors';

type StackNav = NativeStackNavigationProp<RootStackParamList, 'MainTabs'>;

type Filter = 'all' | 'draft' | 'active';

function filterWorkflows(list: WorkflowListItem[], filter: Filter, search: string): WorkflowListItem[] {
  let out = list;
  if (filter !== 'all') {
    out = out.filter((w) => w.status?.toLowerCase() === filter);
  }
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    out = out.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        (w.description ?? '').toLowerCase().includes(q)
    );
  }
  return out;
}

export function ProjectsScreen() {
  const navigation = useNavigation<StackNav>();
  const rootNav = navigation.getParent() as RootNav | undefined;
  const tabNav = navigation;
  const queryClient = useQueryClient();
  const { user, logout } = useAuthStore();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [menuOpen, setMenuOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const { data: workflows, isLoading, error } = useQuery({
    queryKey: ['workflows'],
    queryFn: () => workflowsApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: () => workflowsApi.create(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      rootNav?.navigate('WorkflowDetail', { workflowId: data.id });
    },
    onError: (e) => Alert.alert('Error', (e as Error).message),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => workflowsApi.duplicate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workflows'] }),
    onError: (e) => Alert.alert('Error', (e as Error).message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => workflowsApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workflows'] }),
    onError: (e) => Alert.alert('Error', (e as Error).message),
  });

  const list = workflows ?? [];
  const filtered = useMemo(
    () => filterWorkflows(list, filter, search),
    [list, filter, search]
  );

  const handleCreate = () => {
    setCreating(true);
    createMutation.mutate(undefined, {
      onSettled: () => setCreating(false),
    });
  };

  const handleOpen = (wf: WorkflowListItem) => {
    navigation.navigate('WorkflowDetail', { workflowId: wf.id });
  };

  const handleDuplicate = (e: unknown, wf: WorkflowListItem) => {
    (e as { stopPropagation?: () => void }).stopPropagation?.();
    duplicateMutation.mutate(wf.id);
  };

  const handleDelete = (e: unknown, wf: WorkflowListItem) => {
    (e as { stopPropagation?: () => void }).stopPropagation?.();
    Alert.alert(
      'Delete workflow?',
      'This cannot be undone. The workflow and all its data will be removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(wf.id),
        },
      ]
    );
  };

  const openIdeas = () => {
    setMenuOpen(false);
    rootNav?.navigate('IdeasEditor');
  };
  const openVoiceProfiles = () => {
    setMenuOpen(false);
    rootNav?.navigate('VoiceProfiles');
  };
  const openSettings = () => {
    setMenuOpen(false);
    tabNav.navigate('Settings');
  };
  const openImportFootage = () => {
    setMenuOpen(false);
    rootNav?.navigate('ImportFootage');
  };
  const handleLogout = () => {
    setMenuOpen(false);
    logout();
  };

  const openEditDraftTest = async () => {
    if (!rootNav) return;
    try {
      const projects = await projectsApi.list();
      const first = projects?.[0];
      if (first) {
        rootNav.navigate('EdlEditor', { projectId: first.id });
      } else {
        Alert.alert(
          'No video projects',
          'Run a workflow with Auto Edit to create a draft, or open a project from the Review Queue.'
        );
      }
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.subtitle}>Loading workflows…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>Failed to load workflows</Text>
        <Text style={styles.subtitle}>{(error as Error).message}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Modal visible={menuOpen} transparent animationType="fade">
        <Pressable style={styles.menuOverlay} onPress={() => setMenuOpen(false)}>
          <View style={styles.menuCard}>
            {user ? (
              <>
                <Text style={styles.menuUser}>{user.name || user.email}</Text>
                <Text style={styles.menuEmail}>{user.email}</Text>
              </>
            ) : null}
            <TouchableOpacity style={styles.menuItem} onPress={openIdeas}>
              <FileText color={colors.text} size={20} />
              <Text style={styles.menuItemText}>Ideas & Scripts</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={openVoiceProfiles}>
              <Mic color={colors.text} size={20} />
              <Text style={styles.menuItemText}>Voice profiles</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={openSettings}>
              <Settings color={colors.text} size={20} />
              <Text style={styles.menuItemText}>Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={openImportFootage}>
              <UploadCloud color={colors.text} size={20} />
              <Text style={styles.menuItemText}>Import footage</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.menuItem, styles.menuItemDanger]} onPress={handleLogout}>
              <LogOut color={colors.error} size={20} />
              <Text style={styles.menuItemTextDanger}>Sign out</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <View style={styles.toolbar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search workflows..."
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
        <View style={styles.filterRow}>
          {(['all', 'draft', 'active'] as const).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterPill, filter === f && styles.filterPillActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterPillText, filter === f && styles.filterPillTextActive]}>
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Workflows</Text>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setMenuOpen(true)}
          hitSlop={12}
        >
          <MoreHorizontal color={colors.text} size={24} />
        </TouchableOpacity>
      </View>

      {list.length > 0 && (
        <TouchableOpacity
          style={styles.editDraftTestButton}
          onPress={openEditDraftTest}
          activeOpacity={0.7}
        >
          <Film color={colors.primary} size={18} />
          <Text style={styles.editDraftTestText}>Edit draft (test)</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.newButton}
        onPress={handleCreate}
        disabled={creating}
      >
        {creating ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Plus color="#fff" size={20} />
            <Text style={styles.newButtonText}>New Workflow</Text>
          </>
        )}
      </TouchableOpacity>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => handleOpen(item)}
          >
            <FolderOpen color={colors.primary} size={24} style={styles.cardIcon} />
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.cardMeta} numberOfLines={2}>
                {item.description || 'No description'} · {item.status}
              </Text>
              <Text style={styles.cardMetaSmall}>
                {Array.isArray(item.nodes) ? item.nodes.length : 0} nodes
              </Text>
            </View>
            <TouchableOpacity
              style={styles.cardMenu}
              onPress={(e) => {
                e.stopPropagation();
                Alert.alert(item.name, undefined, [
                  { text: 'Open', onPress: () => handleOpen(item) },
                  { text: 'Duplicate', onPress: () => handleDuplicate(e, item) },
                  { text: 'Delete', style: 'destructive', onPress: () => handleDelete(e, item) },
                  { text: 'Cancel', style: 'cancel' },
                ]);
              }}
            >
              <MoreHorizontal color={colors.textSecondary} size={20} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.subtitle}>
              {list.length === 0
                ? 'No workflows yet. Create one to get started.'
                : 'No workflows match the current filter.'}
            </Text>
            {list.length === 0 && (
              <TouchableOpacity style={styles.newButton} onPress={handleCreate} disabled={creating}>
                <Plus color="#fff" size={20} />
                <Text style={styles.newButtonText}>New Workflow</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  toolbar: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  searchInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    marginBottom: 8,
  },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterPillText: { fontSize: 14, color: colors.text },
  filterPillTextActive: { fontSize: 14, color: '#fff', fontWeight: '600' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.text },
  menuButton: { padding: 4 },
  editDraftTestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
  },
  editDraftTestText: { fontSize: 14, color: colors.primary, fontWeight: '500' },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 10,
  },
  newButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  listContent: { padding: 16, paddingTop: 0, paddingBottom: 32 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardIcon: { marginRight: 12 },
  cardBody: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 17, fontWeight: '600', color: colors.text },
  cardMeta: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  cardMetaSmall: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  cardMenu: { padding: 4 },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 56,
    paddingRight: 16,
  },
  menuCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    minWidth: 220,
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuUser: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 2 },
  menuEmail: { fontSize: 13, color: colors.textSecondary, marginBottom: 12 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  menuItemDanger: {},
  menuItemText: { fontSize: 16, color: colors.text },
  menuItemTextDanger: { fontSize: 16, color: colors.error, fontWeight: '500' },
  subtitle: { fontSize: 16, color: colors.textSecondary, textAlign: 'center' },
  error: { fontSize: 17, fontWeight: '600', color: colors.error, marginBottom: 8 },
});
