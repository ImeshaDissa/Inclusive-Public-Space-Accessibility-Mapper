import { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Linking, Animated } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/context/ThemeContext';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { SafeAreaView } from 'react-native-safe-area-context';

type ScanResult = {
  data: string;
  type: string;
} | null;

export default function ScanScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { places } = useApp();
  const [permission, requestPermission] = useCameraPermissions();
  const [torchOn, setTorchOn] = useState(false);
  const [scannedResult, setScannedResult] = useState<ScanResult>(null);
  const [scanning, setScanning] = useState(true);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  if (!permission) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textSecondary }}>Loading camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
        <Ionicons name="camera-outline" size={64} color={colors.textMuted} />
        <Text style={[styles.permTitle, { color: colors.textPrimary }]}>Camera Access Required</Text>
        <Text style={[styles.permSubtitle, { color: colors.textSecondary }]}>
          To scan QR codes for places and accessibility information, we need access to your camera.
        </Text>
        <TouchableOpacity
          style={[styles.permButton, { backgroundColor: colors.accent }]}
          onPress={requestPermission}
        >
          <Text style={[styles.permButtonText, { color: '#FFFFFF' }]}>Grant Permission</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  function handleBarCodeScanned({ data, type }: { data: string; type: string }) {
    if (!scanning) return;
    setScanning(false);
    setScannedResult({ data, type });
  }

  function handleProcessResult() {
    if (!scannedResult) return;

    const data = scannedResult.data;

    const placeMatch = data.match(/place[:\/]([a-zA-Z0-9_-]+)/i);
    if (placeMatch) {
      const placeId = placeMatch[1];
      const found = places.find((p) => p.id === placeId);
      if (found) {
        setScannedResult(null);
        setScanning(true);
        router.push(`/place/${found.id}`);
        return;
      }
    }

    if (data.startsWith('http://') || data.startsWith('https://')) {
      Alert.alert('Open Link', `Open this URL in your browser?\n\n${data}`, [
        { text: 'Cancel', style: 'cancel', onPress: () => { setScannedResult(null); setScanning(true); } },
        { text: 'Open', onPress: () => { Linking.openURL(data); setScannedResult(null); setScanning(true); } },
      ]);
      return;
    }

    const matchedPlace = places.find(
      (p) => p.name.toLowerCase().includes(data.toLowerCase()) || p.address.toLowerCase().includes(data.toLowerCase())
    );
    if (matchedPlace) {
      setScannedResult(null);
      setScanning(true);
      router.push(`/place/${matchedPlace.id}`);
      return;
    }

    Alert.alert('Scanned Data', data, [
      { text: 'OK', onPress: () => { setScannedResult(null); setScanning(true); } },
    ]);
  }

  function handleRescan() {
    setScannedResult(null);
    setScanning(true);
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanning ? handleBarCodeScanned : undefined}
        enableTorch={torchOn}
      />

      <View style={styles.overlay}>
        <View style={styles.topBar}>
          <Text style={styles.topTitle}>Scan QR Code</Text>
          <TouchableOpacity
            style={styles.torchBtn}
            onPress={() => setTorchOn((prev) => !prev)}
          >
            <Ionicons
              name={torchOn ? 'flash' : 'flash-outline'}
              size={24}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>

        <View style={styles.scanAreaContainer}>
          <View style={styles.cornerRow}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
          </View>
          <Animated.View style={[styles.scanFrame, { transform: [{ scale: pulseAnim }] }]}>
            <Ionicons name="scan-outline" size={120} color="rgba(255,255,255,0.3)" />
          </Animated.View>
          <View style={styles.cornerRow}>
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
        </View>

        <Text style={styles.instructionText}>
          Point your camera at a QR code to scan
        </Text>
      </View>

      {scannedResult && (
        <View style={[styles.resultSheet, { backgroundColor: colors.card, borderTopColor: colors.cardBorder }]}>
          <View style={[styles.handleBar, { backgroundColor: colors.divider }]} />
          <View style={styles.resultHeader}>
            <Ionicons name="checkmark-circle" size={28} color={colors.success} />
            <Text style={[styles.resultTitle, { color: colors.textPrimary }]}>QR Code Scanned</Text>
          </View>
          <View style={[styles.resultDataBox, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
            <Text style={[styles.resultType, { color: colors.textMuted }]}>{scannedResult.type}</Text>
            <Text style={[styles.resultData, { color: colors.textPrimary }]} numberOfLines={4}>
              {scannedResult.data}
            </Text>
          </View>
          <View style={styles.resultActions}>
            <TouchableOpacity
              style={[styles.rescanBtn, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
              onPress={handleRescan}
            >
              <Ionicons name="refresh" size={18} color={colors.textSecondary} />
              <Text style={[styles.rescanBtnText, { color: colors.textSecondary }]}>Scan Again</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.processBtn, { backgroundColor: colors.accent }]}
              onPress={handleProcessResult}
            >
              <Text style={[styles.processBtnText, { color: '#FFFFFF' }]}>Open</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  permTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center',
  },
  permSubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  permButton: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  permButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  topTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  torchBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanAreaContainer: {
    alignSelf: 'center',
    width: 260,
    height: 260,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cornerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  corner: {
    width: 36,
    height: 36,
    borderColor: '#FFFFFF',
  },
  topLeft: {
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },
  topRight: {
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
  scanFrame: {
    position: 'absolute',
    alignSelf: 'center',
  },
  instructionText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    textAlign: 'center',
    paddingBottom: 80,
    paddingHorizontal: 40,
  },
  resultSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  resultDataBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  resultType: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  resultData: {
    fontSize: 15,
    lineHeight: 22,
  },
  resultActions: {
    flexDirection: 'row',
    gap: 12,
  },
  rescanBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  rescanBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  processBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  processBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
