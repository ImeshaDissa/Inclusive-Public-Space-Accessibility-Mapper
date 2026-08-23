import { Stack } from 'expo-router';
import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { StatusBar, View, StyleSheet } from 'react-native';
import { AppProvider } from '@/context/AppContext';
import { ThemeProvider, useAppTheme } from '@/context/ThemeContext';
import { ToastProvider } from '@/context/ToastContext';
import { NotificationBanner } from '@/components/NotificationBanner';

function RootLayoutInner() {
  const { isDark, colors } = useAppTheme();

  return (
    <NavThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#090D16' : '#F8FAFC'} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack screenOptions={{ headerShown: false }} />
        <NotificationBanner />
      </View>
    </NavThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default function RootLayout() {
  return (
    <AppProvider>
      <ThemeProvider>
        <ToastProvider>
          <RootLayoutInner />
        </ToastProvider>
      </ThemeProvider>
    </AppProvider>
  );
}
