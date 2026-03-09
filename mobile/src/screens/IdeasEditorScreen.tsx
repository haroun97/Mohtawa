import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import { ArrowLeft, FileText, Plus, Trash2, Code, FileCode } from 'lucide-react-native';
import { ideaDocsApi, type IdeaDocListItem, type IdeaDocFull } from '../lib/api/endpoints';
import { tiptapToMarkdown, markdownToTiptap } from '../lib/ideaDocMarkdown';
import { colors } from '../theme/colors';

type EditMode = 'json' | 'markdown';

type Nav = NativeStackNavigationProp<RootStackParamList, 'IdeasEditor'>;

const AUTOSAVE_MS = 800;

export function IdeasEditorScreen() {
  const nav = useNavigation<Nav>();
  const queryClient = useQueryClient();
  const [sidebarView, setSidebarView] = useState<'all' | 'trash'>('all');
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [editMode, setEditMode] = useState<EditMode>('markdown');
  const [contentJson, setContentJson] = useState('{}');
  const [contentMarkdown, setContentMarkdown] = useState('');
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: docs = [] } = useQuery({
    queryKey: ['idea-docs', false],
    queryFn: () => ideaDocsApi.list(false),
  });
  const { data: trashDocs = [] } = useQuery({
    queryKey: ['idea-docs', true],
    queryFn: () => ideaDocsApi.list(true),
  });

  const { data: currentDoc, isLoading: loadingDoc } = useQuery({
    queryKey: ['idea-doc', currentId],
    queryFn: () => ideaDocsApi.get(currentId!),
    enabled: !!currentId,
  });

  useEffect(() => {
    if (currentDoc) {
      setTitle(currentDoc.title ?? 'Untitled');
      const content = currentDoc.content;
      const obj = typeof content === 'object' && content !== null ? content : {};
      setContentJson(JSON.stringify(obj, null, 2));
      setContentMarkdown(tiptapToMarkdown(obj));
    }
  }, [currentDoc]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { title?: string; content?: object } }) =>
      ideaDocsApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['idea-docs', false] });
      queryClient.invalidateQueries({ queryKey: ['idea-docs', true] });
      queryClient.invalidateQueries({ queryKey: ['idea-doc', id] });
    },
    onError: (e) => Alert.alert('Error', (e as Error).message),
  });

  const scheduleSave = useCallback(() => {
    if (!currentId) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveTimeoutRef.current = null;
      let content: object;
      if (editMode === 'markdown') {
        content = markdownToTiptap(contentMarkdown);
      } else {
        try {
          content = JSON.parse(contentJson) as object;
        } catch {
          return;
        }
      }
      updateMutation.mutate({
        id: currentId,
        data: { title: title.trim() || 'Untitled', content },
      });
    }, AUTOSAVE_MS);
  }, [currentId, title, editMode, contentJson, contentMarkdown, updateMutation]);

  useEffect(() => {
    scheduleSave();
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [scheduleSave]);

  const createMutation = useMutation({
    mutationFn: () => ideaDocsApi.create('Untitled'),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['idea-docs', false] });
      setCurrentId(data.id);
      setSidebarView('all');
    },
    onError: (e) => Alert.alert('Error', (e as Error).message),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, permanent }: { id: string; permanent: boolean }) =>
      ideaDocsApi.delete(id, permanent),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['idea-docs', false] });
      queryClient.invalidateQueries({ queryKey: ['idea-docs', true] });
      if (currentId === id) {
        setCurrentId(null);
        setTitle('');
        setContentJson('{}');
        setContentMarkdown('');
      }
    },
    onError: (e) => Alert.alert('Error', (e as Error).message),
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => ideaDocsApi.restore(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['idea-docs', false] });
      queryClient.invalidateQueries({ queryKey: ['idea-docs', true] });
    },
    onError: (e) => Alert.alert('Error', (e as Error).message),
  });

  const list = sidebarView === 'all' ? docs : trashDocs;

  const handleDelete = (item: IdeaDocListItem) => {
    if (sidebarView === 'trash') {
      Alert.alert(
        'Delete permanently?',
        `"${item.title}" will be gone forever.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => deleteMutation.mutate({ id: item.id, permanent: true }),
          },
        ]
      );
    } else {
      Alert.alert(
        'Move to trash?',
        `"${item.title}" will be moved to trash.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Move to trash',
            onPress: () => deleteMutation.mutate({ id: item.id, permanent: false }),
          },
        ]
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <ArrowLeft color={colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>Ideas & Scripts</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.sidebar}>
          <View style={styles.sidebarTabs}>
            <TouchableOpacity
              style={[styles.sidebarTab, sidebarView === 'all' && styles.sidebarTabActive]}
              onPress={() => setSidebarView('all')}
            >
              <Text style={[styles.sidebarTabText, sidebarView === 'all' && styles.sidebarTabTextActive]}>
                All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sidebarTab, sidebarView === 'trash' && styles.sidebarTabActive]}
              onPress={() => setSidebarView('trash')}
            >
              <Text style={[styles.sidebarTabText, sidebarView === 'trash' && styles.sidebarTabTextActive]}>
                Trash
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.newDocBtn}
            onPress={() => createMutation.mutate()}
            disabled={createMutation.isPending}
          >
            <Plus color={colors.primary} size={20} />
            <Text style={styles.newDocBtnText}>New doc</Text>
          </TouchableOpacity>
          <FlatList
            data={list}
            keyExtractor={(item) => item.id}
            style={styles.docList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.docItem, currentId === item.id && styles.docItemActive]}
                onPress={() => setCurrentId(item.id)}
              >
                <FileText color={colors.textSecondary} size={18} />
                <Text style={styles.docItemTitle} numberOfLines={1}>{item.title}</Text>
                {sidebarView === 'trash' ? (
                  <TouchableOpacity
                    onPress={() => restoreMutation.mutate(item.id)}
                    style={styles.docItemAction}
                  >
                    <Text style={styles.restoreText}>Restore</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={() => handleDelete(item)}
                    style={styles.docItemAction}
                  >
                    <Trash2 color={colors.textSecondary} size={16} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            )}
          />
        </View>

        <View style={styles.editor}>
          {!currentId ? (
            <View style={styles.editorEmpty}>
              <Text style={styles.editorEmptyText}>Select a doc or create one</Text>
            </View>
          ) : loadingDoc ? (
            <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
          ) : (
            <ScrollView style={styles.editorScroll} contentContainerStyle={styles.editorScrollContent}>
              <TextInput
                style={styles.editorTitle}
                value={title}
                onChangeText={setTitle}
                placeholder="Title"
                placeholderTextColor={colors.textSecondary}
              />
              <View style={styles.modeTabs}>
                <TouchableOpacity
                  style={[styles.modeTab, editMode === 'markdown' && styles.modeTabActive]}
                  onPress={() => {
                    if (editMode === 'json') {
                      try {
                        const obj = JSON.parse(contentJson) as object;
                        setContentMarkdown(tiptapToMarkdown(obj));
                      } catch {
                        setContentMarkdown('');
                      }
                      setEditMode('markdown');
                    }
                  }}
                >
                  <FileCode color={editMode === 'markdown' ? '#fff' : colors.textSecondary} size={18} />
                  <Text style={[styles.modeTabText, editMode === 'markdown' && styles.modeTabTextActive]}>
                    Markdown
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modeTab, editMode === 'json' && styles.modeTabActive]}
                  onPress={() => {
                    if (editMode === 'markdown') {
                      const doc = markdownToTiptap(contentMarkdown);
                      setContentJson(JSON.stringify(doc, null, 2));
                      setEditMode('json');
                    }
                  }}
                >
                  <Code color={editMode === 'json' ? '#fff' : colors.textSecondary} size={18} />
                  <Text style={[styles.modeTabText, editMode === 'json' && styles.modeTabTextActive]}>
                    JSON
                  </Text>
                </TouchableOpacity>
              </View>
              {editMode === 'markdown' ? (
                <TextInput
                  style={styles.editorContentMarkdown}
                  value={contentMarkdown}
                  onChangeText={setContentMarkdown}
                  placeholder="Write in Markdown: use # for headings, --- for dividers"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  textAlignVertical="top"
                />
              ) : (
                <TextInput
                  style={styles.editorContent}
                  value={contentJson}
                  onChangeText={setContentJson}
                  placeholder="Content (JSON)"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  textAlignVertical="top"
                />
              )}
              {updateMutation.isPending ? (
                <Text style={styles.saveStatus}>Saving…</Text>
              ) : null}
            </ScrollView>
          )}
        </View>
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
  title: { fontSize: 18, fontWeight: '600', color: colors.text },
  body: { flex: 1, flexDirection: 'row' },
  sidebar: {
    width: 200,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  sidebarTabs: { flexDirection: 'row', marginBottom: 12 },
  sidebarTab: { paddingVertical: 8, paddingHorizontal: 12, marginRight: 4 },
  sidebarTabActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  sidebarTabText: { fontSize: 14, color: colors.textSecondary },
  sidebarTabTextActive: { fontSize: 14, color: colors.primary, fontWeight: '600' },
  newDocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  newDocBtnText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  docList: { flex: 1 },
  docItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  docItemActive: { backgroundColor: colors.surface },
  docItemTitle: { flex: 1, fontSize: 14, color: colors.text, marginLeft: 8 },
  docItemAction: { padding: 4 },
  restoreText: { fontSize: 13, color: colors.primary },
  editor: { flex: 1, padding: 16 },
  editorEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editorEmptyText: { fontSize: 16, color: colors.textSecondary },
  loader: { marginTop: 48 },
  editorScroll: { flex: 1 },
  editorScrollContent: { paddingBottom: 32 },
  editorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
    paddingVertical: 4,
  },
  modeTabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  modeTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modeTabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  modeTabText: { fontSize: 14, color: colors.text },
  modeTabTextActive: { fontSize: 14, color: '#fff', fontWeight: '600' },
  editorContent: {
    fontSize: 14,
    color: colors.text,
    fontFamily: 'monospace',
    minHeight: 300,
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editorContentMarkdown: {
    fontSize: 15,
    color: colors.text,
    minHeight: 300,
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  saveStatus: { fontSize: 13, color: colors.textSecondary, marginTop: 8 },
});
