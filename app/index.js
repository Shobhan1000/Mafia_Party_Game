import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function Home() {
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <Text style={styles.title}>🎭 Mafia Party</Text>
        <Text style={styles.subtitle}>Choose Your Game Mode</Text>

        <View style={styles.modeContainer}>
          {/* Offline Mode Card */}
          <TouchableOpacity
            style={styles.modeCard}
            onPress={() => router.push("/offline")}
          >
            <Text style={styles.modeEmoji}>🎮</Text>
            <Text style={styles.modeTitle}>Offline Mode</Text>
            <Text style={styles.modeDescription}>
              Play in person with friends using one device
            </Text>
            <View style={styles.featureList}>
              <Text style={styles.featureItem}>• Narrator Mode</Text>
              <Text style={styles.featureItem}>• Role Generator</Text>
              <Text style={styles.featureItem}>• Discussion Timers</Text>
              <Text style={styles.featureItem}>• Vote Tracking</Text>
            </View>
          </TouchableOpacity>

          {/* Online Mode Card */}
          <TouchableOpacity
            style={styles.modeCard}
            onPress={() => router.push("/online")}
          >
            <Text style={styles.modeEmoji}>🌐</Text>
            <Text style={styles.modeTitle}>Online Mode</Text>
            <Text style={styles.modeDescription}>
              Play remotely with multiple devices
            </Text>
            <View style={styles.featureList}>
              <Text style={styles.featureItem}>• Multi-Device Support</Text>
              <Text style={styles.featureItem}>• Real-Time Sync</Text>
              <Text style={styles.featureItem}>• Auto Game Flow</Text>
              <Text style={styles.featureItem}>• Voice Chat (Soon)</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Rules Button */}
        <TouchableOpacity
          style={styles.rulesButton}
          onPress={() => router.push("/rules")}
        >
          <Text style={styles.rulesText}>📖 How to Play</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#0b132b",
    minHeight: "100%",
  },
  title: {
    color: "#fff",
    fontSize: 42,
    fontWeight: "800",
    marginBottom: 8,
    textShadowColor: "rgba(230, 57, 70, 0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  subtitle: {
    color: "#bcd",
    fontSize: 18,
    marginBottom: 40,
    fontStyle: "italic",
  },
  modeContainer: {
    width: "100%",
    gap: 20,
  },
  modeCard: {
    backgroundColor: "#1c2541",
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    borderColor: "#2d3a5e",
    alignItems: "center",
  },
  modeEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  modeTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
  },
  modeDescription: {
    color: "#89a",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 20,
  },
  featureList: {
    width: "100%",
    paddingLeft: 20,
  },
  featureItem: {
    color: "#4CAF50",
    fontSize: 14,
    marginBottom: 6,
  },
  rulesButton: {
    marginTop: 32,
    paddingVertical: 14,
    paddingHorizontal: 28,
    backgroundColor: "rgba(76, 175, 80, 0.2)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#4CAF50",
  },
  rulesText: {
    color: "#4CAF50",
    fontSize: 16,
    fontWeight: "600",
  },
});