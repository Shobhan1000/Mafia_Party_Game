import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  Alert,
  Switch,
} from "react-native";

const ROLES = [
  { id: "mafia", name: "Mafia", emoji: "🕶️", team: "mafia" },
  { id: "detective", name: "Detective", emoji: "🕵️", team: "town" },
  { id: "doctor", name: "Doctor", emoji: "⚕️", team: "town" },
  { id: "villager", name: "Villager", emoji: "👨‍🌾", team: "town" },
];

export default function RoleGenerator() {
  const router = useRouter();
  const [phase, setPhase] = useState("setup"); // setup, distribution, timer
  const [playerCount, setPlayerCount] = useState("5");
  const [enableTimer, setEnableTimer] = useState(false);
  const [timeLimit, setTimeLimit] = useState("5");
  const [players, setPlayers] = useState([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [showRole, setShowRole] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [timerMode, setTimerMode] = useState("discussion"); // discussion, voting

  // Timer effect
  useEffect(() => {
    let interval;
    if (timerActive && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setTimerActive(false);
            Alert.alert("Time's Up!", `${timerMode === "discussion" ? "Discussion" : "Voting"} time has ended`);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, timeRemaining]);

  const generateRoles = () => {
    const count = parseInt(playerCount);
    if (count < 3) {
      Alert.alert("Error", "Need at least 3 players");
      return;
    }

    const numMafia = Math.floor(count / 3);
    const roles = [];

    // Add mafia
    for (let i = 0; i < numMafia; i++) {
      roles.push(ROLES.find((r) => r.id === "mafia"));
    }

    // Add special roles
    if (count >= 5) roles.push(ROLES.find((r) => r.id === "detective"));
    if (count >= 7) roles.push(ROLES.find((r) => r.id === "doctor"));

    // Fill with villagers
    while (roles.length < count) {
      roles.push(ROLES.find((r) => r.id === "villager"));
    }

    // Shuffle
    const shuffled = roles.sort(() => Math.random() - 0.5);

    setPlayers(
      shuffled.map((role, i) => ({
        id: i + 1,
        name: `Player ${i + 1}`,
        role: role,
      }))
    );
    setPhase("distribution");
  };

  const showNextRole = () => {
    if (currentPlayerIndex < players.length - 1) {
      setCurrentPlayerIndex(currentPlayerIndex + 1);
      setShowRole(false);
    } else {
      if (enableTimer) {
        setPhase("timer");
      } else {
        Alert.alert(
          "Setup Complete",
          "All roles distributed! You can now start playing."
        );
        router.back();
      }
    }
  };

  const startTimer = (mode) => {
    setTimerMode(mode);
    const minutes = parseInt(timeLimit);
    setTimeRemaining(minutes * 60);
    setTimerActive(true);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Setup Phase
  if (phase === "setup") {
    return (
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <Text style={styles.title}>🎲 Role Generator</Text>
          <Text style={styles.subtitle}>Quick & Simple Setup</Text>

          <View style={styles.setupCard}>
            <Text style={styles.label}>Number of Players</Text>
            <TextInput
              style={styles.input}
              value={playerCount}
              onChangeText={setPlayerCount}
              keyboardType="number-pad"
              placeholder="5"
              placeholderTextColor="#666"
            />

            <View style={styles.switchContainer}>
              <Text style={styles.label}>Enable Discussion Timer</Text>
              <Switch
                value={enableTimer}
                onValueChange={setEnableTimer}
                trackColor={{ false: "#333", true: "#4CAF50" }}
                thumbColor={enableTimer ? "#fff" : "#f4f3f4"}
              />
            </View>

            {enableTimer && (
              <>
                <Text style={styles.label}>Timer Duration (minutes)</Text>
                <TextInput
                  style={styles.input}
                  value={timeLimit}
                  onChangeText={setTimeLimit}
                  keyboardType="number-pad"
                  placeholder="5"
                  placeholderTextColor="#666"
                />
              </>
            )}

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={generateRoles}
            >
              <Text style={styles.buttonText}>Generate Roles</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>ℹ️ About Role Generator</Text>
            <Text style={styles.infoText}>
              • Quickly assign random roles to all players{"\n"}
              • Each player reveals their role secretly{"\n"}
              • Optional timer for discussion phases{"\n"}
              • Perfect for experienced players{"\n"}
              • No game management - just roles!
            </Text>
          </View>
        </View>
      </ScrollView>
    );
  }

  // Role Distribution Phase
  if (phase === "distribution") {
    const currentPlayer = players[currentPlayerIndex];
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Role Distribution</Text>
        <Text style={styles.subtitle}>
          Player {currentPlayerIndex + 1} of {players.length}
        </Text>

        <View style={styles.roleCard}>
          {!showRole ? (
            <>
              <Text style={styles.roleCardTitle}>
                Ready, {currentPlayer.name}?
              </Text>
              <Text style={styles.roleCardText}>
                Tap below to reveal your secret role.{"\n"}
                Don't let others see!
              </Text>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => setShowRole(true)}
              >
                <Text style={styles.buttonText}>Reveal My Role</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.roleEmoji}>{currentPlayer.role.emoji}</Text>
              <Text style={styles.roleCardTitle}>You are the</Text>
              <Text style={styles.roleName}>{currentPlayer.role.name}</Text>
              <View style={styles.separator} />
              <Text style={styles.roleCardText}>
                Remember your role and keep it secret!
              </Text>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={showNextRole}
              >
                <Text style={styles.buttonText}>
                  {currentPlayerIndex < players.length - 1
                    ? "Next Player"
                    : enableTimer
                    ? "Continue to Timer"
                    : "Finish"}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            {currentPlayerIndex + 1} / {players.length} players
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${
                    ((currentPlayerIndex + 1) / players.length) * 100
                  }%`,
                },
              ]}
            />
          </View>
        </View>
      </View>
    );
  }

  // Timer Phase
  if (phase === "timer") {
    return (
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          <Text style={styles.title}>Discussion Timer</Text>
          <Text style={styles.subtitle}>Manage your game phases</Text>

          <View style={styles.timerDisplay}>
            {timerActive ? (
              <>
                <Text style={styles.timerModeText}>
                  {timerMode === "discussion"
                    ? "☀️ Discussion Phase"
                    : "🗳️ Voting Phase"}
                </Text>
                <Text
                  style={[
                    styles.timerText,
                    timeRemaining < 60 && styles.timerWarning,
                  ]}
                >
                  {formatTime(timeRemaining)}
                </Text>
                <View style={styles.timerButtons}>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => setTimerActive(false)}
                  >
                    <Text style={styles.buttonText}>⏸️ Pause</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.dangerButton}
                    onPress={() => {
                      setTimerActive(false);
                      setTimeRemaining(0);
                    }}
                  >
                    <Text style={styles.buttonText}>⏹️ Stop</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.timerIdleText}>Timer Ready</Text>
                <Text style={styles.timerSubtext}>
                  {parseInt(timeLimit)} minutes per phase
                </Text>
                <View style={styles.timerStartButtons}>
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => startTimer("discussion")}
                  >
                    <Text style={styles.buttonText}>
                      ☀️ Start Discussion
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.voteButton}
                    onPress={() => startTimer("voting")}
                  >
                    <Text style={styles.buttonText}>🗳️ Start Voting</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>

          <View style={styles.rolesCard}>
            <Text style={styles.rolesTitle}>Assigned Roles</Text>
            <Text style={styles.rolesSubtext}>
              {players.filter((p) => p.role.team === "mafia").length} Mafia,{" "}
              {players.filter((p) => p.role.team === "town").length} Town
            </Text>
          </View>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              Alert.alert(
                "End Session",
                "Are you sure you want to finish?",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Finish",
                    onPress: () => router.back(),
                    style: "destructive",
                  },
                ]
              );
            }}
          >
            <Text style={styles.buttonText}>Finish</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }
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
  },
  setupCard: {
    backgroundColor: "#1c2541",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "#2d3a5e",
    marginBottom: 20,
  },
  label: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#2d3a5e",
    borderRadius: 12,
    padding: 14,
    color: "#fff",
    fontSize: 18,
    borderWidth: 1,
    borderColor: "#3d4a6e",
  },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
  },
  primaryButton: {
    backgroundColor: "#e63946",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 24,
  },
  secondaryButton: {
    backgroundColor: "#457b9d",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
    flex: 1,
  },
  voteButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
    flex: 1,
  },
  dangerButton: {
    backgroundColor: "#dc2626",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
    flex: 1,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  infoCard: {
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(76, 175, 80, 0.3)",
  },
  infoTitle: {
    color: "#4CAF50",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  infoText: {
    color: "#89a",
    fontSize: 14,
    lineHeight: 22,
  },
  roleCard: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1c2541",
    borderRadius: 20,
    padding: 32,
    margin: 20,
  },
  roleEmoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  roleCardTitle: {
    color: "#bcd",
    fontSize: 20,
    marginBottom: 8,
  },
  roleName: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "800",
    marginBottom: 16,
  },
  roleCardText: {
    color: "#89a",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  separator: {
    width: "80%",
    height: 1,
    backgroundColor: "#2d3a5e",
    marginVertical: 16,
  },
  progressContainer: {
    position: "absolute",
    bottom: 40,
    left: 24,
    right: 24,
  },
  progressText: {
    color: "#89a",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: "#2d3a5e",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#4CAF50",
    borderRadius: 4,
  },
  timerDisplay: {
    backgroundColor: "#1c2541",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    marginBottom: 24,
  },
  timerModeText: {
    color: "#4ecdc4",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
  },
  timerText: {
    color: "#4ecdc4",
    fontSize: 64,
    fontWeight: "800",
    marginBottom: 24,
  },
  timerWarning: {
    color: "#e63946",
  },
  timerIdleText: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 8,
  },
  timerSubtext: {
    color: "#89a",
    fontSize: 16,
    marginBottom: 24,
  },
  timerButtons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  timerStartButtons: {
    width: "100%",
    gap: 12,
  },
  rolesCard: {
    backgroundColor: "#1c2541",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: "center",
  },
  rolesTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  rolesSubtext: {
    color: "#89a",
    fontSize: 14,
  },
});
