import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

export default function MapLoadingState() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#2E7D32" />
      <Text style={styles.text}>Loading nearby places…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  text: {
    fontSize: 14,
    color: "#667085",
  },
});