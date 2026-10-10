<<<<<<< HEAD
import { Text, View } from "react-native";

export default function AuthLayout() {
  return (
    <View>
      <Text>Login screen (placeholder)</Text>
    </View>
  );
}
=======
import { ActivityIndicator, View } from 'react-native';
import { Redirect, Stack } from 'expo-router';
import { useApp } from '@/context/AppContext';

export default function AuthLayout() {
	const { authReady, isAuthenticated } = useApp();

	if (!authReady) {
		return (
			<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0B0F19' }}>
				<ActivityIndicator color="#FF5A36" />
			</View>
		);
	}

	if (isAuthenticated) {
		return <Redirect href="/map" />;
	}

	return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0B0F19' } }} />;
}
>>>>>>> 744f926984dd6c25fa44c0e284a64b9731a6a9f2
