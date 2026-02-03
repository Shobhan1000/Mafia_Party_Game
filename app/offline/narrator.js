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
  Modal,
} from "react-native";

const ROLES = [
  { id: "mafia", name: "Mafia", emoji: "🕶️", team: "mafia" },
  { id: "detective", name: "Detective", emoji: "🕵️", team: "town" },
  { id: "doctor", name: "Doctor", emoji: "⚕️", team: "town" },
  { id: "villager", name: "Villager", emoji: "👨‍🌾", team: "town" },
];

export default function NarratorMode() {
  const router = useRouter();
  const [phase, setPhase] = useState("setup"); // setup, roles, night, day, voting, gameOver
  const [playerCount, setPlayerCount] = useState("5");
  const [players, setPlayers] = useState([]);
  const [assignedRoles, setAssignedRoles] = useState([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [showRole, setShowRole] = useState(false);
  const [timeLimit, setTimeLimit] = useState("5");
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [eliminatedPlayers, setEliminatedPlayers] = useState([]);
  const [votes, setVotes] = useState({});
  const [currentRound, setCurrentRound] = useState(1);
  const [gameLog, setGameLog] = useState([]);

  // Timer effect
  useEffect(() => {
    let interval;
    if (timerActive && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setTimerActive(false);
            addLog("⏰ Time's up!");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, timeRemaining]);

  const addLog = (message) => {
    setGameLog((prev) => [...prev, { message, time: new Date().toLocaleTimeString() }]);
  };

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

    setAssignedRoles(shuffled);
    setPlayers(
      shuffled.map((role, i) => ({
        id: i + 1,
        name: `Player ${i + 1}`,
        role: role,
        alive: true,
        revealedRole: false,
      }))
    );
    setPhase("roles");
    addLog(`🎲 Roles generated for ${count} players (${numMafia} Mafia)`);
  };

  const showNextRole = () => {
    if (currentPlayerIndex < players.length - 1) {
      setCurrentPlayerIndex(currentPlayerIndex + 1);
      setShowRole(false);
    } else {
      setPhase("night");
      setCurrentRound(1);
      addLog("🌙 Night 1 begins");
      Alert.alert("Setup Complete", "All roles have been distributed. The game begins!");
    }
  };

  const startNightPhase = () => {
    setPhase("night");
    addLog(`🌙 Night ${currentRound} begins`);
  };

  const startDayPhase = () => {
    setPhase("day");
    setVotes({});
    addLog(`☀️ Day ${currentRound} - Discussion phase`);
    
    const minutes = parseInt(timeLimit);
    if (minutes > 0) {
      setTimeRemaining(minutes * 60);
      setTimerActive(true);
    }
  };

  const startVoting = () => {
    setPhase("voting");
    setVotes({});
    addLog("🗳️ Voting phase begins");
  };

  const castVote = (playerId) => {
    setVotes((prev) => ({
      ...prev,
      [playerId]: (prev[playerId] || 0) + 1,
    }));
  };

  const processVotes = () => {
    const voteCounts = Object.entries(votes);
    if (voteCounts.length === 0) {
      Alert.alert("No Votes", "No votes were cast");
      return;
    }

    const maxVotes = Math.max(...voteCounts.map(([_, count]) => count));
    const tied = voteCounts.filter(([_, count]) => count === maxVotes);

    if (tied.length > 1) {
      Alert.alert("Tie Vote", "Vote was tied! No one eliminated.");
      addLog("🤝 Vote tied - no elimination");
    } else {
      const [playerId, voteCount] = tied[0];
      const player = players.find((p) => p.id === parseInt(playerId));
      
      setPlayers((prev) =>
        prev.map((p) => (p.id === player.id ? { ...p, alive: false } : p))
      );
      setEliminatedPlayers((prev) => [...prev, player]);
      
      addLog(`☠️ ${player.name} eliminated with ${voteCount} votes`);
      Alert.alert("Eliminated", `${player.name} was eliminated!`);
    }

    setCurrentRound((prev) => prev + 1);
    setPhase("night");
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const alivePlayers = players.filter((p) => p.alive);
  const aliveMafia = alivePlayers.filter((p) => p.role.team === "mafia");
  const aliveTown = alivePlayers.filter((p) => p.role.team === "town");

  // Setup Phase
  if (phase === "setup") {
    return (
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <Text style={styles.title}>📖 Narrator Mode</Text>
          <Text style={styles.subtitle}>Complete Game Management</Text>

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

            <Text style={styles.label}>Discussion Time (minutes)</Text>
            <TextInput
              style={styles.input}
              value={timeLimit}
              onChangeText={setTimeLimit}
              keyboardType="number-pad"
              placeholder="5"
              placeholderTextColor="#666"
            />
            <Text style={styles.hint}>Set to 0 for no timer</Text>

            <TouchableOpacity style={styles.primaryButton} onPress={generateRoles}>
              <Text style={styles.buttonText}>Generate Roles & Start</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  }

  // Role Distribution Phase
  if (phase === "roles") {
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
                  {currentPlayerIndex < players.length - 1 ? "Next Player" : "Start Game"}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  }

  // Main Game Phases
  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Round {currentRound}</Text>
          <Text style={styles.phaseIndicator}>
            {phase === "night" && "🌙 Night Phase"}
            {phase === "day" && "☀️ Day Phase"}
            {phase === "voting" && "🗳️ Voting Phase"}
          </Text>
        </View>

        {/* Game Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{alivePlayers.length}</Text>
            <Text style={styles.statLabel}>Alive</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: "#e63946" }]}>
              {aliveMafia.length}
            </Text>
            <Text style={styles.statLabel}>Mafia</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: "#4CAF50" }]}>
              {aliveTown.length}
            </Text>
            <Text style={styles.statLabel}>Town</Text>
          </View>
        </View>

        {/* Timer */}
        {timerActive && (
          <View style={styles.timerContainer}>
            <Text
              style={[
                styles.timerText,
                timeRemaining < 60 && styles.timerWarning,
              ]}
            >
              {formatTime(timeRemaining)}
            </Text>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setTimerActive(false)}
            >
              <Text style={styles.buttonText}>Stop Timer</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Player List */}
        <View style={styles.playersSection}>
          <Text style={styles.sectionTitle}>Players</Text>
          {players.map((player) => (
            <View
              key={player.id}
              style={[
                styles.playerItem,
                !player.alive && styles.playerItemDead,
              ]}
            >
              <View style={styles.playerInfo}>
                <Text style={styles.playerName}>
                  {player.role.emoji} {player.name}
                </Text>
                {!player.alive && (
                  <Text style={styles.deadText}>💀 Eliminated</Text>
                )}
              </View>
              {phase === "voting" && player.alive && (
                <View style={styles.voteInfo}>
                  <Text style={styles.voteCount}>
                    {votes[player.id] || 0} votes
                  </Text>
                  <TouchableOpacity
                    style={styles.voteButton}
                    onPress={() => castVote(player.id)}
                  >
                    <Text style={styles.voteButtonText}>Vote</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {phase === "night" && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={startDayPhase}
            >
              <Text style={styles.buttonText}>☀️ Start Day Phase</Text>
            </TouchableOpacity>
          )}

          {phase === "day" && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={startVoting}
            >
              <Text style={styles.buttonText}>🗳️ Start Voting</Text>
            </TouchableOpacity>
          )}

          {phase === "voting" && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={processVotes}
            >
              <Text style={styles.buttonText}>Count Votes</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              Alert.alert(
                "End Game",
                "Are you sure you want to end this game?",
                [
                  { text: "Cancel", style: "cancel" },
                  { text: "End Game", onPress: () => router.back(), style: "destructive" },
                ]
              );
            }}
          >
            <Text style={styles.buttonText}>End Game</Text>
          </TouchableOpacity>
        </View>

        {/* Game Log */}
        {gameLog.length > 0 && (
          <View style={styles.logContainer}>
            <Text style={styles.sectionTitle}>Game Log</Text>
            <ScrollView style={styles.logScroll}>
              {gameLog.slice().reverse().map((log, i) => (
                <View key={i} style={styles.logItem}>
                  <Text style={styles.logTime}>{log.time}</Text>
                  <Text style={styles.logMessage}>{log.message}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}
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
  hint: {
    color: "#888",
    fontSize: 12,
    marginTop: 4,
    fontStyle: "italic",
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
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
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
  header: {
    marginBottom: 20,
  },
  phaseIndicator: {
    color: "#4ecdc4",
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
  },
  statBox: {
    alignItems: "center",
    backgroundColor: "#1c2541",
    borderRadius: 12,
    padding: 16,
    flex: 1,
    marginHorizontal: 4,
  },
  statValue: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
  },
  statLabel: {
    color: "#89a",
    fontSize: 12,
    marginTop: 4,
  },
  timerContainer: {
    backgroundColor: "#1c2541",
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    alignItems: "center",
  },
  timerText: {
    color: "#4ecdc4",
    fontSize: 48,
    fontWeight: "800",
    marginBottom: 16,
  },
  timerWarning: {
    color: "#e63946",
  },
  playersSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
  },
  playerItem: {
    backgroundColor: "#1c2541",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  playerItemDead: {
    opacity: 0.5,
    backgroundColor: "#111",
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  deadText: {
    color: "#e63946",
    fontSize: 14,
    marginTop: 4,
  },
  voteInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  voteCount: {
    color: "#4ecdc4",
    fontSize: 16,
    fontWeight: "600",
  },
  voteButton: {
    backgroundColor: "#e63946",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  voteButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  actionsContainer: {
    marginTop: 20,
  },
  logContainer: {
    marginTop: 24,
    backgroundColor: "#1c2541",
    borderRadius: 12,
    padding: 16,
    maxHeight: 200,
  },
  logScroll: {
    maxHeight: 150,
  },
  logItem: {
    flexDirection: "row",
    marginBottom: 8,
    gap: 12,
  },
  logTime: {
    color: "#666",
    fontSize: 12,
  },
  logMessage: {
    color: "#89a",
    fontSize: 14,
    flex: 1,
  },
});
