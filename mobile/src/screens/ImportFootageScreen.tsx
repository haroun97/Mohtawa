import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import * as ImagePicker from 'expo-image-picker';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { ArrowLeft, UploadCloud } from 'lucide-react-native';
import { mediaApi } from '../lib/api/endpoints';
import { colors } from '../theme/colors';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ImportFootage'>;

export function ImportFootageScreen() {
  const nav = useNavigation<Nav>();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  const pickAndUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to your media library to import video.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: false,
      quality: 1,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setUploading(true);
    setProgress('Uploading…');
    try {
      const res = await mediaApi.upload({
        uri: asset.uri,
        name: asset.fileName ?? 'video.mp4',
        type: asset.mimeType ?? 'video/mp4',
      });
      setProgress(null);
      Alert.alert(
        'Upload complete',
        `Video uploaded.\nKey: ${res.key}\nYou can use this in workflows that accept video assets.`,
        [{ text: 'OK', onPress: () => nav.goBack() }]
      );
    } catch (e) {
      setProgress(null);
      Alert.alert('Upload failed', (e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <ArrowLeft color={colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>Import footage</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.hint}>
          Pick a video from your device. It will be uploaded and stored for use in workflows (e.g. Auto Edit).
        </Text>
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={pickAndUpload}
          disabled={uploading}
        >
          {uploading ? (
            <>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.uploadButtonText}>{progress ?? 'Uploading…'}</Text>
            </>
          ) : (
            <>
              <UploadCloud color="#fff" size={22} />
              <Text style={styles.uploadButtonText}>Pick video</Text>
            </>
          )}
        </TouchableOpacity>
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
  body: { flex: 1, padding: 24 },
  hint: { fontSize: 15, color: colors.textSecondary, marginBottom: 24 },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  uploadButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
