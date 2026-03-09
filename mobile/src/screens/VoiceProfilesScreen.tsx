import { useState, useCallback } from 'react';
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
  Alert,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { ArrowLeft, Mic, Plus, UploadCloud } from 'lucide-react-native';
import { voiceProfilesApi, type VoiceProfile } from '../lib/api/endpoints';
import { colors } from '../theme/colors';

const PROVIDERS = [
  { value: 'elevenlabs', label: 'ElevenLabs' },
  { value: 'azure', label: 'Azure TTS' },
];

type Nav = NativeStackNavigationProp<RootStackParamList, 'VoiceProfiles'>;

export function VoiceProfilesScreen() {
  const nav = useNavigation<Nav>();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createProvider, setCreateProvider] = useState('elevenlabs');
  const [createVoiceId, setCreateVoiceId] = useState('');
  const [createLanguage, setCreateLanguage] = useState('en');

  const { data: profiles, isLoading, error } = useQuery({
    queryKey: ['voice-profiles'],
    queryFn: () => voiceProfilesApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      voiceProfilesApi.create({
        name: createName.trim() || 'Untitled',
        provider: createProvider,
        providerVoiceId: createVoiceId.trim() || undefined,
        language: createLanguage.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voice-profiles'] });
      setShowCreate(false);
      setCreateName('');
      setCreateVoiceId('');
      setCreateLanguage('en');
    },
    onError: (e) => Alert.alert('Error', (e as Error).message),
  });

  const [uploadingProfileId, setUploadingProfileId] = useState<string | null>(null);

  const trainMutation = useMutation({
    mutationFn: (profileId: string) => voiceProfilesApi.train(profileId),
    onSuccess: (_, profileId) => {
      queryClient.invalidateQueries({ queryKey: ['voice-profiles'] });
      queryClient.invalidateQueries({ queryKey: ['voice-profile', profileId] });
      Alert.alert('Training started', 'Voice clone training has been started.');
    },
    onError: (e) => Alert.alert('Error', (e as Error).message),
  });

  const uploadMutation = useMutation({
    mutationFn: ({
      profileId,
      file,
    }: {
      profileId: string;
      file: { uri: string; name?: string; type?: string };
    }) => voiceProfilesApi.uploadAssets(profileId, file),
    onSuccess: (_, { profileId }) => {
      queryClient.invalidateQueries({ queryKey: ['voice-profiles'] });
      queryClient.invalidateQueries({ queryKey: ['voice-profile', profileId] });
      setUploadingProfileId(null);
      Alert.alert('Uploaded', 'Audio sample added. You can train the voice when ready.');
    },
    onError: (e) => {
      setUploadingProfileId(null);
      Alert.alert('Upload failed', (e as Error).message);
    },
  });

  const handleUploadAsset = useCallback(
    async (profileId: string) => {
      try {
        const result = await DocumentPicker.getDocumentAsync({
          type: 'audio/*',
          copyToCacheDirectory: true,
        });
        if (result.canceled) return;
        const file = result.assets[0];
        setUploadingProfileId(profileId);
        uploadMutation.mutate({
          profileId,
          file: {
            uri: file.uri,
            name: file.name ?? undefined,
            type: file.mimeType ?? undefined,
          },
        });
      } catch (e) {
        Alert.alert('Error', (e as Error).message);
      }
    },
    [uploadMutation]
  );

  const handleCreate = useCallback(() => {
    createMutation.mutate(undefined);
  }, [createMutation]);

  const list = profiles ?? [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <ArrowLeft color={colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>Voice profiles</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreate(true)}>
          <Plus color={colors.text} size={24} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>Failed to load voice profiles</Text>
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Mic color={colors.primary} size={22} style={styles.cardIcon} />
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardMeta}>
                  {PROVIDERS.find((p) => p.value === item.provider)?.label ?? item.provider}
                  {item.trainingStatus ? ` · ${item.trainingStatus}` : ''}
                  {item.assetCount != null ? ` · ${item.assetCount} sample(s)` : ''}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.uploadBtn}
                onPress={() => handleUploadAsset(item.id)}
                disabled={uploadingProfileId !== null}
              >
                {uploadingProfileId === item.id ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <UploadCloud color={colors.primary} size={20} />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.trainBtn}
                onPress={() => trainMutation.mutate(item.id)}
                disabled={trainMutation.isPending}
              >
                {trainMutation.isPending ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={styles.trainBtnText}>Train</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.empty}>No voice profiles. Add one to clone your voice.</Text>
            </View>
          }
        />
      )}

      <Modal visible={showCreate} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowCreate(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>New voice profile</Text>
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Profile name"
                placeholderTextColor={colors.textSecondary}
                value={createName}
                onChangeText={setCreateName}
              />
              <Text style={styles.inputLabel}>Provider</Text>
              <View style={styles.pickerRow}>
                {PROVIDERS.map((p) => (
                  <TouchableOpacity
                    key={p.value}
                    style={[
                      styles.pickerOpt,
                      createProvider === p.value && styles.pickerOptActive,
                    ]}
                    onPress={() => setCreateProvider(p.value)}
                  >
                    <Text
                      style={[
                        styles.pickerOptText,
                        createProvider === p.value && styles.pickerOptTextActive,
                      ]}
                    >
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.inputLabel}>Voice ID (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Provider voice ID"
                placeholderTextColor={colors.textSecondary}
                value={createVoiceId}
                onChangeText={setCreateVoiceId}
                autoCapitalize="none"
              />
              <Text style={styles.inputLabel}>Language (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. en"
                placeholderTextColor={colors.textSecondary}
                value={createLanguage}
                onChangeText={setCreateLanguage}
                autoCapitalize="none"
              />
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowCreate(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSave}
                onPress={handleCreate}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalSaveText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  addBtn: { padding: 4 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  listContent: { padding: 16, paddingBottom: 32 },
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
  cardIcon: { marginRight: 12 },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  cardMeta: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  uploadBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trainBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 8,
  },
  trainBtnText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  empty: { fontSize: 16, color: colors.textSecondary, textAlign: 'center' },
  errorText: { fontSize: 16, color: colors.error },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 16 },
  modalScroll: { maxHeight: 360 },
  inputLabel: { fontSize: 14, fontWeight: '500', color: colors.textSecondary, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
  },
  pickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pickerOpt: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickerOptActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pickerOptText: { fontSize: 14, color: colors.text },
  pickerOptTextActive: { fontSize: 14, color: '#fff', fontWeight: '600' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 20 },
  modalCancel: { paddingVertical: 10, paddingHorizontal: 16 },
  modalCancelText: { fontSize: 16, color: colors.textSecondary },
  modalSave: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 80,
    alignItems: 'center',
  },
  modalSaveText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
