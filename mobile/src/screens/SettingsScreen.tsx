import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  TextInput,
  Alert,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { useAuthStore } from '../store/authStore';
import { settingsApi, type ApiKeyEntry } from '../lib/api/endpoints';
import { colors } from '../theme/colors';

const SERVICE_OPTIONS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'elevenlabs', label: 'ElevenLabs' },
  { value: 'google-tts', label: 'Google TTS' },
  { value: 'meta', label: 'Meta' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
];

function getServiceLabel(service: string): string {
  return SERVICE_OPTIONS.find((s) => s.value === service)?.label ?? service;
}

export function SettingsScreen() {
  const { user, logout } = useAuthStore();
  const [keys, setKeys] = useState<ApiKeyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newService, setNewService] = useState('openai');
  const [newKey, setNewKey] = useState('');
  const [newLabel, setNewLabel] = useState('');

  const fetchKeys = useCallback(async () => {
    try {
      const data = await settingsApi.listKeys();
      setKeys(data);
    } catch {
      setKeys([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleSaveKey = () => {
    if (!newKey.trim()) {
      Alert.alert('Error', 'Please enter an API key.');
      return;
    }
    setSaving(true);
    settingsApi
      .addKey({
        service: newService,
        key: newKey.trim(),
        label: newLabel.trim() || undefined,
      })
      .then(() => {
        setNewKey('');
        setNewLabel('');
        setShowForm(false);
        fetchKeys();
      })
      .catch((e) => Alert.alert('Error', (e as Error).message))
      .finally(() => setSaving(false));
  };

  const handleDeleteKey = (entry: ApiKeyEntry) => {
    Alert.alert(
      'Delete API key?',
      `Remove ${getServiceLabel(entry.service)} key?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            settingsApi
              .deleteKey(entry.id)
              .then(fetchKeys)
              .catch((e) => Alert.alert('Error', (e as Error).message)),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        {user ? (
          <>
            <Text style={styles.text}>{user.email}</Text>
            {user.name ? <Text style={styles.textSecondary}>{user.name}</Text> : null}
          </>
        ) : (
          <Text style={styles.textSecondary}>Not signed in</Text>
        )}
        <TouchableOpacity style={styles.logoutButton} onPress={() => logout()}>
          <Text style={styles.logoutButtonText}>Sign out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>API keys</Text>
          <TouchableOpacity style={styles.addButton} onPress={() => setShowForm(true)}>
            <Text style={styles.addButtonText}>Add key</Text>
          </TouchableOpacity>
        </View>
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
        ) : (
          <FlatList
            data={keys}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View style={styles.keyRow}>
                <View style={styles.keyInfo}>
                  <Text style={styles.keyService}>{getServiceLabel(item.service)}</Text>
                  <Text style={styles.keyMasked}>{item.maskedKey}</Text>
                  {item.label ? (
                    <Text style={styles.keyLabel}>{item.label}</Text>
                  ) : null}
                </View>
                <TouchableOpacity
                  style={styles.deleteKeyBtn}
                  onPress={() => handleDeleteKey(item)}
                >
                  <Text style={styles.deleteKeyBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            )}
            ListEmptyComponent={
              <Text style={styles.empty}>No API keys. Add one to use AI and publishing features.</Text>
            }
          />
        )}
      </View>

      <Modal visible={showForm} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowForm(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Add API key</Text>
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.inputLabel}>Service</Text>
              <View style={styles.pickerRow}>
                {SERVICE_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.pickerOpt,
                      newService === opt.value && styles.pickerOptActive,
                    ]}
                    onPress={() => setNewService(opt.value)}
                  >
                    <Text
                      style={[
                        styles.pickerOptText,
                        newService === opt.value && styles.pickerOptTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.inputLabel}>Key</Text>
              <TextInput
                style={styles.input}
                placeholder="Paste your API key"
                placeholderTextColor={colors.textSecondary}
                value={newKey}
                onChangeText={setNewKey}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
              />
              <Text style={styles.inputLabel}>Label (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Production"
                placeholderTextColor={colors.textSecondary}
                value={newLabel}
                onChangeText={setNewLabel}
              />
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowForm(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSave}
                onPress={handleSaveKey}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalSaveText}>Save</Text>
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
  container: { flex: 1, backgroundColor: colors.background, padding: 24 },
  section: { marginBottom: 32 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 8 },
  text: { fontSize: 16, color: colors.text },
  textSecondary: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  logoutButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  logoutButtonText: { fontSize: 16, fontWeight: '500', color: colors.error },
  addButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  addButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  loader: { marginTop: 8 },
  keyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  keyInfo: { flex: 1 },
  keyService: { fontSize: 15, fontWeight: '600', color: colors.text },
  keyMasked: { fontSize: 13, color: colors.textSecondary, marginTop: 2, fontFamily: 'monospace' },
  keyLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  deleteKeyBtn: { padding: 8 },
  deleteKeyBtnText: { fontSize: 14, color: colors.error, fontWeight: '500' },
  empty: { fontSize: 14, color: colors.textSecondary, marginTop: 8 },
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
  modalScroll: { maxHeight: 320 },
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
