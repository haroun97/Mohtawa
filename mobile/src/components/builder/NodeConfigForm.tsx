import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  Pressable,
  Switch,
} from 'react-native';
import { colors } from '../../theme/colors';
import {
  getFieldsForType,
  VOICE_PROFILE_FIELD,
  IDEA_DOC_FIELD,
  type FieldDef,
} from '../../lib/nodeDefinitionsFields';
import { useQuery } from '@tanstack/react-query';
import { voiceProfilesApi, ideaDocsApi } from '../../lib/api/endpoints';
import type { CanvasNode } from './BuilderInspector';

interface NodeConfigFormProps {
  node: CanvasNode;
  onConfigChange: (nodeId: string, config: Record<string, unknown>) => void;
}

function getConfigValue(config: Record<string, unknown> | undefined, field: FieldDef): string | number | boolean {
  const v = config?.[field.name];
  if (v !== undefined && v !== null) return v as string | number | boolean;
  if (field.defaultValue !== undefined) return field.defaultValue;
  if (field.type === 'number') return 0;
  if (field.type === 'toggle') return false;
  return '';
}

export function NodeConfigForm({ node, onConfigChange }: NodeConfigFormProps) {
  const nodeType = node.data?.definition?.type ?? node.type;
  const config = node.data?.config ?? {};
  const fields = getFieldsForType(nodeType);
  const [selectModal, setSelectModal] = useState<{ field: FieldDef; options: { label: string; value: string }[] } | null>(null);

  const { data: voiceProfiles = [] } = useQuery({
    queryKey: ['voice-profiles'],
    queryFn: () => voiceProfilesApi.list(),
    enabled: nodeType === 'voice.tts',
  });

  const { data: ideaDocs = [] } = useQuery({
    queryKey: ['idea-docs'],
    queryFn: () => ideaDocsApi.list(false),
    enabled: nodeType === 'ideas.source',
  });

  const handleChange = (name: string, value: unknown) => {
    onConfigChange(node.id, { ...config, [name]: value });
  };

  const openSelect = (field: FieldDef, options: { label: string; value: string }[]) => {
    setSelectModal({ field, options });
  };

  if (fields.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={styles.hint}>No configurable fields for this node type.</Text>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      {fields.map((field) => {
        const value = getConfigValue(config, field);
        const isVoiceProfile = nodeType === 'voice.tts' && field.name === VOICE_PROFILE_FIELD;
        const isIdeaDoc = nodeType === 'ideas.source' && field.name === IDEA_DOC_FIELD;

        if (field.type === 'text') {
          if (isVoiceProfile) {
            const profile = voiceProfiles.find((p) => p.id === value);
            return (
              <View key={field.name} style={styles.fieldBlock}>
                <Text style={styles.label}>{field.label}{field.required ? ' *' : ''}</Text>
                <TouchableOpacity
                  style={styles.selectTrigger}
                  onPress={() =>
                    openSelect(
                      field,
                      voiceProfiles.map((p) => ({ label: `${p.name} ${p.trainingStatus === 'ready' ? '✓' : ''}`, value: p.id }))
                    )
                  }
                >
                  <Text style={styles.selectTriggerText} numberOfLines={1}>
                    {profile ? `${profile.name} ${profile.trainingStatus === 'ready' ? '✓' : ''}` : 'Select voice profile...'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          }
          if (isIdeaDoc) {
            const doc = ideaDocs.find((d) => d.id === value);
            return (
              <View key={field.name} style={styles.fieldBlock}>
                <Text style={styles.label}>{field.label}{field.required ? ' *' : ''}</Text>
                <TouchableOpacity
                  style={styles.selectTrigger}
                  onPress={() =>
                    openSelect(
                      field,
                      ideaDocs.map((d) => ({ label: d.title || 'Untitled', value: d.id }))
                    )
                  }
                >
                  <Text style={styles.selectTriggerText} numberOfLines={1}>
                    {doc ? (doc.title || 'Untitled') : 'Select document...'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          }
          return (
            <View key={field.name} style={styles.fieldBlock}>
              <Text style={styles.label}>{field.label}{field.required ? ' *' : ''}</Text>
              <TextInput
                style={styles.input}
                value={String(value ?? '')}
                onChangeText={(t) => handleChange(field.name, t)}
                placeholder={field.placeholder}
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          );
        }

        if (field.type === 'textarea') {
          return (
            <View key={field.name} style={styles.fieldBlock}>
              <Text style={styles.label}>{field.label}{field.required ? ' *' : ''}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={String(value ?? '')}
                onChangeText={(t) => handleChange(field.name, t)}
                placeholder={field.placeholder}
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
              />
            </View>
          );
        }

        if (field.type === 'number') {
          return (
            <View key={field.name} style={styles.fieldBlock}>
              <Text style={styles.label}>{field.label}{field.required ? ' *' : ''}</Text>
              <TextInput
                style={styles.input}
                value={value !== '' && value !== undefined ? String(value) : ''}
                onChangeText={(t) => handleChange(field.name, t === '' ? undefined : parseFloat(t))}
                placeholder={field.placeholder}
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
              />
            </View>
          );
        }

        if (field.type === 'select') {
          const options = (field.options ?? []).map((opt) => ({ label: opt, value: opt }));
          const currentLabel = options.find((o) => o.value === value)?.label ?? (value ? String(value) : '');
          return (
            <View key={field.name} style={styles.fieldBlock}>
              <Text style={styles.label}>{field.label}{field.required ? ' *' : ''}</Text>
              <TouchableOpacity style={styles.selectTrigger} onPress={() => openSelect(field, options)}>
                <Text style={styles.selectTriggerText} numberOfLines={1}>
                  {currentLabel || 'Select...'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        }

        if (field.type === 'toggle') {
          return (
            <View key={field.name} style={styles.toggleRow}>
              <Text style={styles.label}>{field.label}</Text>
              <Switch
                value={!!value}
                onValueChange={(v) => handleChange(field.name, v)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
          );
        }

        return null;
      })}

      <Modal visible={!!selectModal} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setSelectModal(null)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>{selectModal?.field.label ?? 'Select'}</Text>
            <FlatList
              data={selectModal?.options ?? []}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={() => {
                    if (selectModal?.field) {
                      const v = item.value === '__none__' ? undefined : item.value;
                      handleChange(selectModal.field.name, v);
                    }
                    setSelectModal(null);
                  }}
                >
                  <Text style={styles.modalOptionText}>{item.label}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.modalCancel} onPress={() => setSelectModal(null)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 8 },
  hint: { fontSize: 14, color: colors.textSecondary },
  fieldBlock: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.background,
  },
  textArea: { minHeight: 72 },
  selectTrigger: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: colors.background,
  },
  selectTriggerText: { fontSize: 15, color: colors.text },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, maxHeight: '70%' },
  modalTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 12 },
  modalOption: { paddingVertical: 14, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalOptionText: { fontSize: 16, color: colors.text },
  modalCancel: { marginTop: 12, paddingVertical: 12, alignItems: 'center' },
  modalCancelText: { fontSize: 16, color: colors.primary, fontWeight: '600' },
});
