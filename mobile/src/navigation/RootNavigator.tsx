import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  FolderOpen,
  PlayCircle,
  ListChecks,
  Settings,
} from 'lucide-react-native';
import { ProjectsScreen } from '../screens/ProjectsScreen';
import { RunsScreen } from '../screens/RunsScreen';
import { ReviewQueueScreen } from '../screens/ReviewQueueScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

export type RootTabParamList = {
  Projects: undefined;
  Runs: undefined;
  ReviewQueue: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

const tabIconSize = 24;

export function RootNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#64748b',
      }}
    >
      <Tab.Screen
        name="Projects"
        component={ProjectsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <FolderOpen color={color} size={size ?? tabIconSize} />
          ),
        }}
      />
      <Tab.Screen
        name="Runs"
        component={RunsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <PlayCircle color={color} size={size ?? tabIconSize} />
          ),
        }}
      />
      <Tab.Screen
        name="ReviewQueue"
        component={ReviewQueueScreen}
        options={{
          title: 'Review Queue',
          tabBarLabel: 'Review',
          tabBarIcon: ({ color, size }) => (
            <ListChecks color={color} size={size ?? tabIconSize} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Settings color={color} size={size ?? tabIconSize} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
