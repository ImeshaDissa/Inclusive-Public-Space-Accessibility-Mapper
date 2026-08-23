import { StyleSheet, Text, View } from "react-native";

export default function LocationPermissionPrompt() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        Location access is off — showing the default area. Enable location in
        settings to center the map on you.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.75)",
    borderRadius: 8,
    padding: 10,
  },
  text: {
    color: "#fff",
    fontSize: 12,
    textAlign: "center",
  },
});