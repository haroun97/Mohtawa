import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  FolderOpen,
  PlayCircle,
  ListChecks,
  Settings,
} from 'lucide-react-native';
import type { RootTabParamList } from './types';
import { ProjectsScreen } from '../screens/ProjectsScreen';
import { RunsScreen } from '../screens/RunsScreen';
import { ReviewQueueScreen } from '../screens/ReviewQueueScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator<RootTabParamList>();

const tabIconSize = 24;

export function MainTabsNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: '#1e293b' },
        headerTintColor: '#f1f5f9',
        tabBarStyle: { backgroundColor: '#1e293b' },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#94a3b8',
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
