import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { useAppTheme } from '@/context/ThemeContext';

export default function TabLayout() {
  const { authReady, notifications, reports } = useApp();
  const { colors, isDark } = useAppTheme();

  if (!authReady) {
    return null;
  }

  // Guests browse freely (Home / Map / search / place details). The screens
  // that contribute — report, verify, AI assistant, profile — redirect to
  // /login themselves, so router.push from Home is covered too.

  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;
  const pendingReportsCount = reports.filter((r) => r.status === 'pending').length;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.tabBarBg,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 1,
          height: 66,
          paddingBottom: 8,
          paddingTop: 6,
          elevation: isDark ? 0 : 2,
          shadowColor: '#000',
          shadowOpacity: isDark ? 0.3 : 0.05,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: -2 },
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarAccessibilityLabel: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarAccessibilityLabel: 'Map — find accessible places',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'map' : 'map-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="assistant"
        options={{
          title: 'AI',
          tabBarAccessibilityLabel: 'AI assistant',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'sparkles' : 'sparkles-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: 'Submit',
          tabBarAccessibilityLabel: 'Submit a new report',
          tabBarIcon: () => (
            <View style={[styles.elevatedSubmitBtn, { backgroundColor: colors.accent }]}>
              <Ionicons name="add" size={26} color="#FFFFFF" />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="verify"
        options={{
          title: 'Verify',
          tabBarAccessibilityLabel: `Verify places, ${pendingReportsCount} pending reports`,
          tabBarBadge: pendingReportsCount > 0 ? pendingReportsCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.badgePendingBg || '#78350F',
            color: colors.badgePendingText || '#F59E0B',
            fontSize: 10,
            fontWeight: '800',
          },
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'shield-checkmark' : 'shield-checkmark-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: 'Inbox',
          tabBarAccessibilityLabel: `Inbox, ${unreadNotificationsCount} unread notifications`,
          tabBarBadge: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.accent,
            color: '#FFFFFF',
            fontSize: 10,
            fontWeight: '800',
          },
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'notifications' : 'notifications-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarAccessibilityLabel: 'Your profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  elevatedSubmitBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
});
