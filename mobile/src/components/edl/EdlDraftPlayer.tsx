import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEventListener } from 'expo';
import { colors } from '../../theme/colors';

type Props = {
  playUrl: string | null;
  /** Optional URL to preload (e.g. next clip) so switching to it has less delay. */
  preloadUrl?: string | null;
  playing: boolean;
  onPlayingChange: (playing: boolean) => void;
  onTimeUpdate: (sec: number) => void;
  onDurationChange: (sec: number) => void;
  /** When parent sets this ref to a number, player seeks to that time (sec) and ref is cleared. */
  seekToRef: React.MutableRefObject<number | null>;
};

export function EdlDraftPlayer({
  playUrl,
  preloadUrl,
  playing,
  onPlayingChange,
  onTimeUpdate,
  onDurationChange,
  seekToRef,
}: Props) {
  if (!playUrl) {
    return (
      <View style={[styles.container, styles.placeholder]}>
        <Text style={styles.placeholderText}>No draft video</Text>
        <Text style={styles.placeholderSubtext}>Save and render to preview</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <EdlDraftPlayerInner
        playUrl={playUrl}
        playing={playing}
        onPlayingChange={onPlayingChange}
        onTimeUpdate={onTimeUpdate}
        onDurationChange={onDurationChange}
        seekToRef={seekToRef}
      />
      {preloadUrl && preloadUrl !== playUrl ? (
        <View style={styles.preloadWrap} pointerEvents="none">
          <PreloadVideoView url={preloadUrl} />
        </View>
      ) : null}
    </View>
  );
}

/** Hidden player that only loads the URL to warm the cache for when we switch to it. */
function PreloadVideoView({ url }: { url: string }) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = false;
    p.muted = true;
  });
  return (
    <View style={styles.preloadVideo}>
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls={false} />
    </View>
  );
}

function EdlDraftPlayerInner({
  playUrl,
  playing,
  onPlayingChange,
  onTimeUpdate,
  onDurationChange,
  seekToRef,
}: Props) {
  const player = useVideoPlayer(playUrl, (p) => {
    p.loop = false;
    p.timeUpdateEventInterval = 0.25; // 4 times per second
  });

  useEventListener(player, 'statusChange', ({ status }) => {
    if (status === 'readyToPlay') {
      const dur = player.duration ?? 0;
      if (dur > 0) onDurationChange(dur);
    }
  });

  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    onTimeUpdate(currentTime);
  });

  useEventListener(player, 'playingChange', (payload: { isPlaying?: boolean }) => {
    onPlayingChange(payload?.isPlaying ?? player.playing);
  });

  // Sync playing state from parent
  useEffect(() => {
    if (playing && player.playing === false) player.play();
    if (!playing && player.playing === true) player.pause();
  }, [playing, player]);

  // Seek when parent sets seekToRef
  useEffect(() => {
    const interval = setInterval(() => {
      const target = seekToRef.current;
      if (target !== null) {
        seekToRef.current = null;
        player.currentTime = target;
      }
    }, 100);
    return () => clearInterval(interval);
  }, [player, seekToRef]);

  return (
    <View style={styles.container}>
      <VideoView
        style={StyleSheet.absoluteFill}
        player={player}
        contentFit="contain"
        nativeControls={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 9 / 16,
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
  },
  preloadWrap: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 1,
    height: 1,
    opacity: 0,
    overflow: 'hidden',
  },
  preloadVideo: {
    width: 1,
    height: 1,
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  placeholderSubtext: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
});
