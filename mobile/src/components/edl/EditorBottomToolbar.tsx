import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';

export type EditorToolDef = {
  key: string;
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  active?: boolean;
  disabled?: boolean;
};

type EditorToolItemProps = {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  disabled: boolean;
  onPress: () => void;
};

function EditorToolItem({ icon, label, active, disabled, onPress }: EditorToolItemProps) {
  return (
    <TouchableOpacity
      style={styles.toolItem}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <View style={[styles.iconWrap, (active || disabled) && styles.iconWrapMuted]}>
        {icon}
      </View>
      <Text
        style={[
          styles.label,
          active && styles.labelActive,
          disabled && styles.labelDisabled,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

type EditorBottomToolbarProps = {
  tools: EditorToolDef[];
};

export function EditorBottomToolbar({ tools }: EditorBottomToolbarProps) {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 8);

  if (tools.length === 0) return null;

  return (
    <View style={[styles.container, { paddingBottom: bottomPadding }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {tools.map((t) => (
          <EditorToolItem
            key={t.key}
            icon={t.icon}
            label={t.label}
            active={t.active ?? false}
            disabled={t.disabled ?? false}
            onPress={t.onPress}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const ICON_SIZE = 20;
const styles = StyleSheet.create({
  container: {
    paddingTop: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingRight: 12,
  },
  toolItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 52,
    paddingVertical: 4,
  },
  iconWrap: {
    width: 40,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolItemDisabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  labelActive: {
    color: colors.primary,
  },
  labelDisabled: {
    color: colors.textSecondary,
    opacity: 0.6,
  },
});
