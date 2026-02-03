import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View, ScrollView } from "react-native";

export default function Rules() {
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

        <Text style={styles.title}>📖 How to Play Mafia</Text>
        <Text style={styles.subtitle}>Social Deduction Game</Text>

        {/* Game Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Game Objective</Text>
          <Text style={styles.bodyText}>
            Mafia is a social deduction game where players are secretly assigned roles. The goal is simple:
          </Text>
          <Text style={styles.goalText}>🕶️ <Text style={styles.boldText}>Mafia:</Text> Eliminate all villagers</Text>
          <Text style={styles.goalText}>👥 <Text style={styles.boldText}>Villagers:</Text> Eliminate all mafia members</Text>
        </View>

        {/* Roles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎭 Roles</Text>
          
          <View style={styles.roleCard}>
            <Text style={styles.roleHeader}>🕶️ Mafia</Text>
            <Text style={styles.roleDescription}>
              Work secretly with other Mafia members to eliminate villagers at night. During the day, pretend to be innocent and avoid suspicion.
            </Text>
            <Text style={styles.roleWin}>Win when Mafia equal or outnumber villagers</Text>
          </View>

          <View style={styles.roleCard}>
            <Text style={styles.roleHeader}>🕵️ Detective</Text>
            <Text style={styles.roleDescription}>
              Each night, investigate one player to learn if they're Mafia or innocent. Use this information wisely during day discussions.
            </Text>
            <Text style={styles.roleWin}>Win when all Mafia are eliminated</Text>
          </View>

          <View style={styles.roleCard}>
            <Text style={styles.roleHeader}>⚕️ Doctor</Text>
            <Text style={styles.roleDescription}>
              Each night, choose one player to protect from Mafia elimination. You can even save yourself! Your protection lasts one night.
            </Text>
            <Text style={styles.roleWin}>Win when all Mafia are eliminated</Text>
          </View>

          <View style={styles.roleCard}>
            <Text style={styles.roleHeader}>👨‍🌾 Villager</Text>
            <Text style={styles.roleDescription}>
              No special abilities. Pay attention during discussions, use logic and intuition to identify Mafia members, and vote wisely.
            </Text>
            <Text style={styles.roleWin}>Win when all Mafia are eliminated</Text>
          </View>
        </View>

        {/* Game Flow */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔄 Game Flow</Text>
          
          <View style={styles.phaseCard}>
            <Text style={styles.phaseTitle}>🌙 Night Phase</Text>
            <Text style={styles.phaseText}>
              • Everyone closes their eyes{"\n"}
              • Mafia wake up, silently choose a victim{"\n"}
              • Detective investigates one player{"\n"}
              • Doctor protects one player{"\n"}
              • Everyone goes back to sleep
            </Text>
          </View>

          <View style={styles.phaseCard}>
            <Text style={styles.phaseTitle}>☀️ Day Phase</Text>
            <Text style={styles.phaseText}>
              • Everyone wakes up{"\n"}
              • Night results are revealed{"\n"}
              • Open discussion about who might be Mafia{"\n"}
              • Players share suspicions and defend themselves{"\n"}
              • Time-limited discussion
            </Text>
          </View>

          <View style={styles.phaseCard}>
            <Text style={styles.phaseTitle}>🗳️ Voting Phase</Text>
            <Text style={styles.phaseText}>
              • Each player votes to eliminate someone{"\n"}
              • Player with most votes is eliminated{"\n"}
              • Their role is revealed{"\n"}
              • Check win conditions{"\n"}
              • Next night begins
            </Text>
          </View>
        </View>

        {/* Strategy Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💡 Strategy Tips</Text>
          
          <View style={styles.tipCard}>
            <Text style={styles.tipTitle}>For Villagers:</Text>
            <Text style={styles.tipText}>
              • Pay attention to voting patterns{"\n"}
              • Listen for contradictions in stories{"\n"}
              • Trust your instincts{"\n"}
              • Work together with other villagers{"\n"}
              • Protect special roles
            </Text>
          </View>

          <View style={styles.tipCard}>
            <Text style={styles.tipTitle}>For Mafia:</Text>
            <Text style={styles.tipText}>
              • Stay consistent with your story{"\n"}
              • Blend in with villagers{"\n"}
              • Create doubt about innocent players{"\n"}
              • Target special roles (Detective, Doctor){"\n"}
              • Coordinate with other Mafia members
            </Text>
          </View>
        </View>

        {/* Player Count */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👥 Recommended Setup</Text>
          <Text style={styles.bodyText}>
            <Text style={styles.boldText}>5-6 players:</Text> 1 Mafia, 1 Detective, rest Villagers{"\n\n"}
            <Text style={styles.boldText}>7-9 players:</Text> 2 Mafia, 1 Detective, 1 Doctor, rest Villagers{"\n\n"}
            <Text style={styles.boldText}>10+ players:</Text> 3 Mafia, 1 Detective, 1 Doctor, rest Villagers
          </Text>
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
  },
  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 8,
    marginBottom: 16,
  },
  backText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  title: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    color: "#bcd",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
    fontStyle: "italic",
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 16,
  },
  bodyText: {
    color: "#bcd",
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 12,
  },
  boldText: {
    fontWeight: "700",
    color: "#fff",
  },
  goalText: {
    color: "#4ecdc4",
    fontSize: 15,
    lineHeight: 26,
    marginBottom: 8,
  },
  roleCard: {
    backgroundColor: "#1c2541",
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#FFD700",
  },
  roleHeader: {
    color: "#FFD700",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  roleDescription: {
    color: "#bcd",
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 8,
  },
  roleWin: {
    color: "#4CAF50",
    fontSize: 13,
    fontStyle: "italic",
  },
  phaseCard: {
    backgroundColor: "#1c2541",
    borderRadius: 12,
    padding: 18,
    marginBottom: 12,
  },
  phaseTitle: {
    color: "#4ecdc4",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
  },
  phaseText: {
    color: "#bcd",
    fontSize: 14,
    lineHeight: 22,
  },
  tipCard: {
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    borderRadius: 12,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(76, 175, 80, 0.3)",
  },
  tipTitle: {
    color: "#4CAF50",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
  },
  tipText: {
    color: "#bcd",
    fontSize: 14,
    lineHeight: 22,
  },
});
