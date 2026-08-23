import { Stack } from 'expo-router';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useColorScheme, StatusBar } from 'react-native';
import { AppProvider } from '@/context/AppContext';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AppProvider>
      <ThemeProvider value={colorScheme === 'light' ? DefaultTheme : DarkTheme}>
        <StatusBar barStyle={colorScheme === 'light' ? 'dark-content' : 'light-content'} />
        <Stack screenOptions={{ headerShown: false }} />
      </ThemeProvider>
    </AppProvider>
  );
}