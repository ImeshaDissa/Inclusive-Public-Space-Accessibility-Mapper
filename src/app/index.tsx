import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useApp } from '@/context/AppContext';

export default function Index() {
  const { authReady, isAuthenticated } = useApp();

  if (!authReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#090D16' }}>
        <ActivityIndicator color="#818CF8" />
      </View>
    );
  }

  return <Redirect href={isAuthenticated ? '/map' : '/login'} />;
}
