import { Pressable, StyleSheet, Text, View } from "react-native";

type MapErrorStateProps = {
  onRetry?: () => void;
};

export default function MapErrorState({ onRetry }: MapErrorStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Couldn't load places</Text>
      <Text style={styles.text}>
        Check your connection and try again.
      </Text>
      {onRetry && (
        <Pressable style={styles.button} onPress={onRetry}>
          <Text style={styles.buttonText}>Retry</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#C62828",
  },
  text: {
    fontSize: 14,
    color: "#667085",
    textAlign: "center",
  },
  button: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: "#2E7D32",
    borderRadius: 8,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
});