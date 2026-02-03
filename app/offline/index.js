import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View, ScrollView } from "react-native";

export default function OfflineMode() {
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>🎮 Offline Mode</Text>
        <Text style={styles.subtitle}>Choose Your Playing Style</Text>

        <View style={styles.optionsContainer}>
          {/* Narrator Mode */}
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => router.push("/offline/narrator")}
          >
            <Text style={styles.optionEmoji}>📖</Text>
            <Text style={styles.optionTitle}>Narrator Mode</Text>
            <Text style={styles.optionDescription}>
              Full game experience with guided narration
            </Text>
            <View style={styles.detailsList}>
              <Text style={styles.detailItem}>✓ Assign roles to everyone</Text>
              <Text style={styles.detailItem}>✓ Guide through day/night cycles</Text>
              <Text style={styles.detailItem}>✓ Manage discussion timers</Text>
              <Text style={styles.detailItem}>✓ Track voting & eliminations</Text>
              <Text style={styles.detailItem}>✓ Complete game management</Text>
            </View>
          </TouchableOpacity>

          {/* Role Generator */}
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => router.push("/offline/generator")}
          >
            <Text style={styles.optionEmoji}>🎲</Text>
            <Text style={styles.optionTitle}>Role Generator</Text>
            <Text style={styles.optionDescription}>
              Quick and simple role assignment tool
            </Text>
            <View style={styles.detailsList}>
              <Text style={styles.detailItem}>✓ Generate random roles</Text>
              <Text style={styles.detailItem}>✓ Optional discussion timer</Text>
              <Text style={styles.detailItem}>✓ Customize role distribution</Text>
              <Text style={styles.detailItem}>✓ Perfect for experienced players</Text>
              <Text style={styles.detailItem}>✓ Quick setup</Text>
            </View>
          </TouchableOpacity>
        </View>
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
    padding: 24,
    backgroundColor: "#0b132b",
    minHeight: "100%",
  },
  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 8,
    marginBottom: 24,
  },
  backText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  title: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    color: "#bcd",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 32,
    fontStyle: "italic",
  },
  optionsContainer: {
    gap: 20,
  },
  optionCard: {
    backgroundColor: "#1c2541",
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    borderColor: "#2d3a5e",
  },
  optionEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  optionTitle: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 8,
  },
  optionDescription: {
    color: "#89a",
    fontSize: 15,
    marginBottom: 20,
    lineHeight: 22,
  },
  detailsList: {
    gap: 8,
  },
  detailItem: {
    color: "#4ecdc4",
    fontSize: 14,
    lineHeight: 20,
  },
});
