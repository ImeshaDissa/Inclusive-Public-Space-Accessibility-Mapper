import React, { useEffect, useState } from 'react';
import {
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform,
	SafeAreaView,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';

export default function LoginScreen() {
	const router = useRouter();
	const { authReady, isAuthenticated, signIn } = useApp();
	const [email, setEmail] = useState('alex.morgan@accessibility.org');
	const [password, setPassword] = useState('demo1234');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	useEffect(() => {
		if (authReady && isAuthenticated) {
			router.replace('/map');
		}
	}, [authReady, isAuthenticated, router]);

	const handleLogin = async () => {
		setError('');
		setLoading(true);

		try {
			const result = await signIn({ email, password });
			if (!result.success) {
				setError(result.message || 'Unable to sign in.');
				return;
			}

			router.replace('/map');
		} finally {
			setLoading(false);
		}
	};

	return (
		<SafeAreaView style={styles.container}>
			<KeyboardAvoidingView
				style={styles.flex}
				behavior={Platform.OS === 'ios' ? 'padding' : undefined}
			>
				<ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
					<View style={styles.heroCard}>
						<View style={styles.heroIconWrap}>
							<Ionicons name="shield-checkmark" size={30} color="#E0E7FF" />
						</View>
						<Text style={styles.title}>Welcome back</Text>
						<Text style={styles.subtitle}>
							Sign in to save places, submit reports, and keep your accessibility data local to this device.
						</Text>
					</View>

					<View style={styles.formCard}>
						<Text style={styles.label}>Email</Text>
						<TextInput
							style={styles.input}
							placeholder="alex.morgan@accessibility.org"
							placeholderTextColor="#64748B"
							keyboardType="email-address"
							autoCapitalize="none"
							value={email}
							onChangeText={setEmail}
						/>

						<Text style={styles.label}>Password</Text>
						<TextInput
							style={styles.input}
							placeholder="demo1234"
							placeholderTextColor="#64748B"
							secureTextEntry
							value={password}
							onChangeText={setPassword}
						/>

						{!!error && <Text style={styles.errorText}>{error}</Text>}

						<TouchableOpacity style={styles.primaryButton} onPress={handleLogin} disabled={loading}>
							{loading ? (
								<ActivityIndicator color="#05131F" />
							) : (
								<Text style={styles.primaryButtonText}>Sign In</Text>
							)}
						</TouchableOpacity>

						<TouchableOpacity
							style={styles.secondaryButton}
							onPress={() => router.push('/signup')}
						>
							<Text style={styles.secondaryButtonText}>Create a local account</Text>
						</TouchableOpacity>

						<View style={styles.demoBox}>
							<Text style={styles.demoTitle}>Demo account</Text>
							<Text style={styles.demoText}>alex.morgan@accessibility.org</Text>
							<Text style={styles.demoText}>Password: demo1234</Text>
						</View>
					</View>
				</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#090D16',
	},
	flex: {
		flex: 1,
	},
	content: {
		flexGrow: 1,
		padding: 20,
		justifyContent: 'center',
		gap: 16,
	},
	heroCard: {
		alignItems: 'center',
		backgroundColor: '#0F172A',
		borderRadius: 24,
		borderWidth: 1,
		borderColor: '#1E293B',
		padding: 22,
		gap: 12,
	},
	heroIconWrap: {
		width: 58,
		height: 58,
		borderRadius: 18,
		backgroundColor: '#4F46E5',
		alignItems: 'center',
		justifyContent: 'center',
	},
	title: {
		color: '#F8FAFC',
		fontSize: 28,
		fontWeight: '800',
		textAlign: 'center',
	},
	subtitle: {
		color: '#94A3B8',
		fontSize: 13,
		lineHeight: 19,
		textAlign: 'center',
	},
	formCard: {
		backgroundColor: '#0F172A',
		borderRadius: 24,
		borderWidth: 1,
		borderColor: '#1E293B',
		padding: 18,
		gap: 12,
	},
	label: {
		color: '#CBD5E1',
		fontSize: 12,
		fontWeight: '700',
		marginTop: 4,
	},
	input: {
		backgroundColor: '#111827',
		borderRadius: 16,
		borderWidth: 1,
		borderColor: '#1F2937',
		color: '#F8FAFC',
		paddingHorizontal: 14,
		paddingVertical: 14,
		fontSize: 15,
	},
	errorText: {
		color: '#FCA5A5',
		fontSize: 12,
		fontWeight: '600',
	},
	primaryButton: {
		backgroundColor: '#10B981',
		borderRadius: 16,
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 14,
		marginTop: 4,
	},
	primaryButtonText: {
		color: '#05131F',
		fontSize: 15,
		fontWeight: '800',
	},
	secondaryButton: {
		backgroundColor: '#111827',
		borderRadius: 16,
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 14,
		borderWidth: 1,
		borderColor: '#334155',
	},
	secondaryButtonText: {
		color: '#E2E8F0',
		fontSize: 14,
		fontWeight: '700',
	},
	demoBox: {
		marginTop: 4,
		backgroundColor: '#111827',
		borderRadius: 16,
		padding: 14,
		borderWidth: 1,
		borderColor: '#1F2937',
	},
	demoTitle: {
		color: '#A5B4FC',
		fontSize: 12,
		fontWeight: '800',
		marginBottom: 4,
	},
	demoText: {
		color: '#CBD5E1',
		fontSize: 12,
		lineHeight: 18,
	},
});
