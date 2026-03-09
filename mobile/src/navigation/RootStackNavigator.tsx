import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import { MainTabsNavigator } from './RootNavigator';
import { WorkflowDetailScreen } from '../screens/WorkflowDetailScreen';
import { RunDetailScreen } from '../screens/RunDetailScreen';
import { EdlEditorScreen } from '../screens/EdlEditorScreen';
import { VoiceProfilesScreen } from '../screens/VoiceProfilesScreen';
import { IdeasEditorScreen } from '../screens/IdeasEditorScreen';
import { IterationDetailScreen } from '../screens/IterationDetailScreen';
import { ImportFootageScreen } from '../screens/ImportFootageScreen';
import { BuilderCanvasScreen } from '../screens/BuilderCanvasScreen';
import { colors } from '../theme/colors';

const Stack = createNativeStackNavigator<RootStackParamList>();

const screenOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: colors.background },
};

export function RootStackNavigator() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="MainTabs" component={MainTabsNavigator} />
      <Stack.Screen name="WorkflowDetail" component={WorkflowDetailScreen} />
      <Stack.Screen name="RunDetail" component={RunDetailScreen} />
      <Stack.Screen name="EdlEditor" component={EdlEditorScreen} />
      <Stack.Screen name="VoiceProfiles" component={VoiceProfilesScreen} />
      <Stack.Screen name="IdeasEditor" component={IdeasEditorScreen} />
      <Stack.Screen name="IterationDetail" component={IterationDetailScreen} />
      <Stack.Screen name="ImportFootage" component={ImportFootageScreen} />
      <Stack.Screen name="BuilderCanvas" component={BuilderCanvasScreen} />
    </Stack.Navigator>
  );
}
