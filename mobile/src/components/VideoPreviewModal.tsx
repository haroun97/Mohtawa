import { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEventListener } from 'expo';
import { X } from 'lucide-react-native';
import { colors } from '../theme/colors';

type Props = {
  visible: boolean;
  videoUrl: string | null;
  title?: string;
  onClose: () => void;
};

/** Inner player so useVideoPlayer is only called when we have a valid source. */
function VideoPlayerInner({
  videoUrl,
  onStatusChange,
  onFirstFrame,
}: {
  videoUrl: string;
  onStatusChange: (status: 'loading' | 'ready' | 'error', error?: string) => void;
  onFirstFrame: () => void;
}) {
  const player = useVideoPlayer(videoUrl, (p) => {
    p.play();
  });

  useEventListener(player, 'statusChange', ({ status, error }) => {
    if (status === 'readyToPlay') {
      onStatusChange('ready');
    } else if (status === 'idle' || status === 'loading') {
      onStatusChange('loading');
    } else if (status === 'error') {
      onStatusChange('error', error?.message ?? 'Playback error');
    }
  });

  return (
    <VideoView
      style={styles.video}
      player={player}
      contentFit="contain"
      nativeControls
      onFirstFrameRender={onFirstFrame}
    />
  );
}

export function VideoPreviewModal({ visible, videoUrl, title, onClose }: Props) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleStatusChange = (s: 'loading' | 'ready' | 'error', error?: string) => {
    setStatus(s);
    if (s === 'error') setErrorMessage(error ?? 'Failed to load video');
  };

  const handleClose = () => {
    setStatus('loading');
    setErrorMessage(null);
    onClose();
  };

  useEffect(() => {
    if (visible && videoUrl) {
      setStatus('loading');
      setErrorMessage(null);
    }
  }, [visible, videoUrl]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>
            {title || 'Preview'}
          </Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <X color={colors.text} size={24} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {!videoUrl ? (
            <View style={styles.centered}>
              <Text style={styles.subtitle}>No video URL</Text>
            </View>
          ) : status === 'error' ? (
            <View style={styles.centered}>
              <Text style={styles.errorText}>
                {errorMessage || 'Video failed to load'}
              </Text>
              <Text style={styles.subtitle}>
                The link may be expired or invalid.
              </Text>
            </View>
          ) : (
            <>
              {status === 'loading' && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.loadingText}>Loading video…</Text>
                </View>
              )}
              <VideoPlayerInner
                videoUrl={videoUrl}
                onStatusChange={handleStatusChange}
                onFirstFrame={() => setStatus('ready')}
              />
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginRight: 12,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  video: {
    width: '100%',
    aspectRatio: 9 / 16,
    backgroundColor: '#000',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    zIndex: 1,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 8,
  },
  errorText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.error,
  },
});
