import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const ROLES = [
  { id: "mafia", name: "Mafia", emoji: "🕶️", team: "mafia" },
  { id: "detective", name: "Detective", emoji: "🕵️", team: "town" },
  { id: "doctor", name: "Doctor", emoji: "⚕️", team: "town" },
  { id: "villager", name: "Villager", emoji: "👨‍🌾", team: "town" },
];

export default function RoleGenerator() {
  const router = useRouter();
  const [phase, setPhase] = useState("setup"); // setup, names, distribution, timer
  const [playerCount, setPlayerCount] = useState("5");
  const [playerNames, setPlayerNames] = useState([]);
  const [enableTimer, setEnableTimer] = useState(false);
  const [timeLimit, setTimeLimit] = useState("5");
  const [players, setPlayers] = useState([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [showRole, setShowRole] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [timerMode, setTimerMode] = useState("discussion"); // discussion, voting
  
  // Role configuration state - structured like narrator.js to fix the undefined error
  const [roleConfig, setRoleConfig] = useState({
    mafia: 1,
    detective: 1,
    doctor: 1,
  });

  // Timer effect
  useEffect(() => {
    let interval;
    if (timerActive && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setTimerActive(false);
            Alert.alert(
              "Time's Up!", 
              `${timerMode === "discussion" ? "Discussion" : "Voting"} time has ended`
            );
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, timeRemaining]);

  const proceedToNames = () => {
    const count = parseInt(playerCount);
    const totalSpecial = roleConfig.mafia + roleConfig.detective + roleConfig.doctor;

    if (isNaN(count) || count < 3) {
      Alert.alert("Error", "Need at least 3 players");
      return;
    }

    if (totalSpecial > count) {
      Alert.alert(
        "Too Many Roles",
        `You have ${count} players but selected ${totalSpecial} special roles.`
      );
      return;
    }

    setPlayerNames(Array(count).fill(""));
    setPhase("names");
  };

  const updatePlayerName = (index, name) => {
    const newNames = [...playerNames];
    newNames[index] = name;
    setPlayerNames(newNames);
  };

  const generateRoles = () => {
    const count = parseInt(playerCount);

    // Validate names
    const emptyNames = playerNames.filter(name => !name.trim());
    if (emptyNames.length > 0) {
      Alert.alert("Missing Names", "Please enter names for all players");
      return;
    }

    const roles = [];

    // Add roles based on roleConfig
    for (let i = 0; i < roleConfig.mafia; i++) {
      roles.push(ROLES.find((r) => r.id === "mafia"));
    }
    for (let i = 0; i < roleConfig.detective; i++) {
      roles.push(ROLES.find((r) => r.id === "detective"));
    }
    for (let i = 0; i < roleConfig.doctor; i++) {
      roles.push(ROLES.find((r) => r.id === "doctor"));
    }

    // Fill rest with villagers
    while (roles.length < count) {
      roles.push(ROLES.find((r) => r.id === "villager"));
    }

    // Shuffle roles
    const shuffled = roles.sort(() => Math.random() - 0.5);

    setPlayers(
      shuffled.map((role, i) => ({
        id: i + 1,
        name: playerNames[i].trim(),
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
            
            <Text style={styles.sectionTitle}>Customize Roles</Text>
            
            {/* Mafia Selector */}
            <View style={styles.roleConfigItem}>
              <View style={styles.roleConfigLabel}>
                <Text style={styles.roleEmojiSmall}>🕶️</Text>
                <Text style={styles.roleConfigText}>Mafia</Text>
              </View>
              <View style={styles.roleConfigControls}>
                <TouchableOpacity
                  style={styles.roleConfigButton}
                  onPress={() => setRoleConfig(prev => ({ ...prev, mafia: Math.max(1, prev.mafia - 1) }))}
                >
                  <Text style={styles.roleConfigButtonText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.roleConfigValue}>{roleConfig.mafia}</Text>
                <TouchableOpacity
                  style={styles.roleConfigButton}
                  onPress={() => setRoleConfig(prev => ({ ...prev, mafia: prev.mafia + 1 }))}
                >
                  <Text style={styles.roleConfigButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Detective Selector */}
            <View style={styles.roleConfigItem}>
              <View style={styles.roleConfigLabel}>
                <Text style={styles.roleEmojiSmall}>🕵️</Text>
                <Text style={styles.roleConfigText}>Detective</Text>
              </View>
              <View style={styles.roleConfigControls}>
                <TouchableOpacity
                  style={styles.roleConfigButton}
                  onPress={() => setRoleConfig(prev => ({ ...prev, detective: Math.max(0, prev.detective - 1) }))}
                >
                  <Text style={styles.roleConfigButtonText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.roleConfigValue}>{roleConfig.detective}</Text>
                <TouchableOpacity
                  style={styles.roleConfigButton}
                  onPress={() => setRoleConfig(prev => ({ ...prev, detective: prev.detective + 1 }))}
                >
                  <Text style={styles.roleConfigButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Doctor Selector */}
            <View style={styles.roleConfigItem}>
              <View style={styles.roleConfigLabel}>
                <Text style={styles.roleEmojiSmall}>⚕️</Text>
                <Text style={styles.roleConfigText}>Doctor</Text>
              </View>
              <View style={styles.roleConfigControls}>
                <TouchableOpacity
                  style={styles.roleConfigButton}
                  onPress={() => setRoleConfig(prev => ({ ...prev, doctor: Math.max(0, prev.doctor - 1) }))}
                >
                  <Text style={styles.roleConfigButtonText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.roleConfigValue}>{roleConfig.doctor}</Text>
                <TouchableOpacity
                  style={styles.roleConfigButton}
                  onPress={() => setRoleConfig(prev => ({ ...prev, doctor: prev.doctor + 1 }))}
                >
                  <Text style={styles.roleConfigButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

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
              onPress={proceedToNames}
            >
              <Text style={styles.buttonText}>Continue to Names</Text>
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

  // Player Names Phase
  if (phase === "names") {
    return (
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setPhase("setup")}
          >
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Enter Player Names</Text>
          <Text style={styles.subtitle}>
            {playerNames.filter(n => n.trim()).length} of {playerCount} names entered
          </Text>

          <View style={styles.namesCard}>
            {playerNames.map((name, index) => (
              <View key={index} style={styles.nameInputGroup}>
                <Text style={styles.nameLabel}>Player {index + 1}</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={(text) => updatePlayerName(index, text)}
                  placeholder={`Enter name for Player ${index + 1}`}
                  placeholderTextColor="#666"
                  autoCapitalize="words"
                />
              </View>
            ))}

            <TouchableOpacity 
              style={[
                styles.primaryButton,
                playerNames.filter(n => n.trim()).length < playerNames.length && styles.disabledButton
              ]} 
              onPress={generateRoles}
              disabled={playerNames.filter(n => n.trim()).length < playerNames.length}
            >
              <Text style={styles.buttonText}>Generate Roles</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  }

  // Distribution Phase
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
                    : "Finish Setup"}
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
                { width: `${((currentPlayerIndex + 1) / players.length) * 100}%` },
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
            onPress={() => router.back()}
          >
            <Text style={styles.buttonText}>End Game</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }
}

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1 },
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#0b132b",
    minHeight: "100%",
  },
  backButton: {
    alignSelf: "flex-start",
    padding: 10,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 8,
    marginBottom: 16,
  },
  backText: { color: "#fff", fontWeight: "600" },
  title: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: { color: "#bcd", fontSize: 16, textAlign: "center", marginBottom: 24 },
  setupCard: {
    backgroundColor: "#1c2541",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "#2d3a5e",
    marginBottom: 20,
  },
  sectionTitle: {
    color: "#4ecdc4",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 20,
    marginBottom: 10,
  },
  roleConfigItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#2d3a5e",
  },
  roleConfigLabel: { flexDirection: "row", alignItems: "center" },
  roleEmojiSmall: { fontSize: 24, marginRight: 10 },
  roleConfigText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  roleConfigControls: { flexDirection: "row", alignItems: "center" },
  roleConfigButton: {
    backgroundColor: "#e63946", // Color matched to narrator.js primary action
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  roleConfigButtonText: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  roleConfigValue: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    minWidth: 25,
    textAlign: "center",
    marginHorizontal: 15,
  },
  label: { color: "#fff", fontSize: 16, fontWeight: "600", marginTop: 16, marginBottom: 8 },
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
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
  },
  dangerButton: {
    backgroundColor: "#dc2626",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
    flex: 1,
  },
  voteButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
  },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  disabledButton: { opacity: 0.5 },
  infoCard: {
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
  },
  infoTitle: { color: "#4CAF50", fontSize: 18, fontWeight: "700", marginBottom: 8 },
  infoText: { color: "#89a", fontSize: 14, lineHeight: 22 },
  namesCard: { backgroundColor: "#1c2541", borderRadius: 16, padding: 24 },
  nameInputGroup: { marginBottom: 16 },
  nameLabel: { color: "#4ecdc4", marginBottom: 6 },
  roleCard: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1c2541",
    borderRadius: 20,
    padding: 32,
    marginVertical: 40,
  },
  roleEmoji: { fontSize: 80, marginBottom: 20 },
  roleCardTitle: { color: "#bcd", fontSize: 20, marginBottom: 8 },
  roleName: { color: "#fff", fontSize: 36, fontWeight: "800", marginBottom: 16 },
  roleCardText: { color: "#89a", fontSize: 16, textAlign: "center", lineHeight: 24 },
  separator: { width: "80%", height: 1, backgroundColor: "#2d3a5e", marginVertical: 16 },
  progressContainer: { marginTop: 20 },
  progressText: { color: "#89a", textAlign: "center", marginBottom: 8 },
  progressBar: { height: 8, backgroundColor: "#2d3a5e", borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: "#4CAF50" },
  timerDisplay: {
    backgroundColor: "#1c2541",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    marginBottom: 24,
  },
  timerModeText: { color: "#4ecdc4", fontSize: 20, fontWeight: "700", marginBottom: 16 },
  timerText: { color: "#4ecdc4", fontSize: 64, fontWeight: "800", marginBottom: 24 },
  timerWarning: { color: "#e63946" },
  timerIdleText: { color: "#fff", fontSize: 32, fontWeight: "700" },
  timerSubtext: { color: "#89a", fontSize: 16, marginBottom: 24 },
  timerButtons: { flexDirection: "row", gap: 12 },
  timerStartButtons: { width: "100%", gap: 12 },
  rolesCard: {
    backgroundColor: "#1c2541",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: "center",
  },
  rolesTitle: { color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 8 },
  rolesSubtext: { color: "#89a" },
});