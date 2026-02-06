import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Modal,
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
  const [phase, setPhase] = useState("setup"); // setup, names, distribution, timer, gameOver
  const [playerCount, setPlayerCount] = useState("5");
  const [playerNames, setPlayerNames] = useState([]);
  const [enableTimer, setEnableTimer] = useState(false);
  const [timeLimit, setTimeLimit] = useState("5");
  const [players, setPlayers] = useState([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [showRole, setShowRole] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [timerMode, setTimerMode] = useState("discussion");
  const [gameResult, setGameResult] = useState({ winner: "", message: "" });
  
  // Role configuration state
  const [roleConfig, setRoleConfig] = useState({
    mafia: 1,
    detective: 1,
    doctor: 1,
  });
  
  // Voting state
  const [showVotingModal, setShowVotingModal] = useState(false);
  const [votes, setVotes] = useState({});
  const [currentVoterIndex, setCurrentVoterIndex] = useState(0);
  const [votingComplete, setVotingComplete] = useState(false);

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

  // COMPLETE RESET FUNCTION
  const resetGame = () => {
    setPhase("setup");
    setPlayers([]);
    setPlayerNames([]);
    setVotes({});
    setCurrentVoterIndex(0);
    setCurrentPlayerIndex(0);
    setShowRole(false);
    setVotingComplete(false);
    setTimerActive(false);
    setTimeRemaining(0);
    setGameResult({ winner: "", message: "" });
  };

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
        alive: true,
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

  // Voting functions
  const startVoting = () => {
    setVotes({});
    setCurrentVoterIndex(0);
    setVotingComplete(false);
    setShowVotingModal(true);
  };

  const castVote = (targetId) => {
    const voter = players[currentVoterIndex];
    
    setVotes(prev => ({
      ...prev,
      [voter.id]: targetId
    }));

    // Move to next voter
    if (currentVoterIndex < players.length - 1) {
      setCurrentVoterIndex(currentVoterIndex + 1);
    } else {
      // All players have voted
      setVotingComplete(true);
    }
  };

  // Helper function to determine if the game is over
  const checkWinCondition = (currentPlayers) => {
    const alivePlayers = currentPlayers.filter(p => p.alive);
    const mCount = alivePlayers.filter(p => p.role.team === "mafia").length;
    const tCount = alivePlayers.length - mCount;

    if (mCount === 0) {
      setGameResult({ 
        winner: "Town", 
        message: "The shadows have been cleared. All Mafia members are gone!" 
      });
      setPhase("gameOver");
      return true;
    }

    if (mCount >= tCount) {
      setGameResult({ 
        winner: "Mafia", 
        message: "The Town has fallen. The Mafia now controls the streets." 
      });
      setPhase("gameOver");
      return true;
    }
    return false;
  };

  const closeVoting = () => {
    setShowVotingModal(false);
    const voteCounts = {};
    Object.values(votes).forEach(targetId => {
      voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
    });

    const maxVotes = Math.max(...Object.values(voteCounts));
    const eliminatedIds = Object.keys(voteCounts).filter(id => voteCounts[id] === maxVotes);

    if (eliminatedIds.length === 1) {
      const eliminatedPlayer = players.find(p => p.id === parseInt(eliminatedIds[0]));
      const updatedPlayers = players.map(p => 
        p.id === eliminatedPlayer.id ? { ...p, alive: false } : p
      );
      
      setPlayers(updatedPlayers);
      setVotes({}); // Clear votes after elimination
      setVotingComplete(false);
      setCurrentVoterIndex(0);

      if (!checkWinCondition(updatedPlayers)) {
        Alert.alert("Voting Results", `${eliminatedPlayer.name} was eliminated!`);
      }
    } else {
      Alert.alert("Voting Results", "The vote was tied! No one was eliminated.");
      setVotes({});
      setVotingComplete(false);
      setCurrentVoterIndex(0);
    }
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
              • Private voting system{"\n"}
              • Perfect for experienced players!
            </Text>
          </View>
        </View>
      </ScrollView>
    );
  }

  // Game Over Phase
  if (phase === "gameOver") {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Game Over</Text>
        <Text style={styles.subtitle}>Final Result</Text>

        <View style={styles.gameOverCard}>
          <Text style={styles.roleEmoji}>
            {gameResult.winner === "Town" ? "🎉" : "☠️"}
          </Text>

          <Text
            style={[
              styles.gameOverTitle,
              {
                color:
                  gameResult.winner === "Town" ? "#4CAF50" : "#e63946",
              },
            ]}
          >
            {gameResult.winner.toUpperCase()} VICTORY
          </Text>

          <View style={styles.separator} />

          <Text style={styles.gameOverMessage}>
            {gameResult.message}
          </Text>
        </View>

        <View style={styles.gameOverButtons}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={resetGame}
          >
            <Text style={styles.buttonText}>Start New Game</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.replace("/offline")}
          >
            <Text style={styles.buttonText}>Return to Menu</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    const alivePlayers = players.filter(p => p.alive);
    const voteCounts = {};
    Object.values(votes).forEach(targetId => {
      voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
    });

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
                    onPress={startVoting}
                  >
                    <Text style={styles.buttonText}>🗳️ Start Voting</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>

          {/* Player Status */}
          <View style={styles.playersCard}>
            <Text style={styles.rolesTitle}>Players</Text>
            {players.map((player) => (
              <View key={player.id} style={[
                styles.playerItem,
                !player.alive && styles.playerItemDead
              ]}>
                <Text style={styles.playerName}>
                  {player.name}
                  {!player.alive && " 💀"}
                </Text>
                {voteCounts[player.id] > 0 && (
                  <Text style={styles.voteCount}>
                    {voteCounts[player.id]} vote{voteCounts[player.id] !== 1 ? 's' : ''}
                  </Text>
                )}
              </View>
            ))}
          </View>

          <View style={styles.rolesCard}>
            <Text style={styles.rolesTitle}>Assigned Roles</Text>
            <Text style={styles.rolesSubtext}>
              {alivePlayers.filter((p) => p.role.team === "mafia").length} Mafia,{" "}
              {alivePlayers.filter((p) => p.role.team === "town").length} Town
            </Text>
          </View>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.buttonText}>End Game</Text>
          </TouchableOpacity>
        </View>

        {/* Voting Modal */}
        <Modal
          visible={showVotingModal}
          transparent
          animationType="slide"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.votingModal}>
              {!votingComplete ? (
                <>
                  <Text style={styles.votingTitle}>
                    {players[currentVoterIndex]?.name}'s Vote
                  </Text>
                  <Text style={styles.votingSubtitle}>
                    Choose who to eliminate
                  </Text>
                  <Text style={styles.votingProgress}>
                    Vote {currentVoterIndex + 1} of {players.length}
                  </Text>

                  <ScrollView style={styles.votingScroll}>
                    {players
                      .filter(p => p.alive && p.id !== players[currentVoterIndex]?.id)
                      .map((player) => (
                        <TouchableOpacity
                          key={player.id}
                          style={styles.voteOption}
                          onPress={() => castVote(player.id)}
                        >
                          <Text style={styles.voteOptionName}>{player.name}</Text>
                          <Text style={styles.voteOptionArrow}>→</Text>
                        </TouchableOpacity>
                      ))}
                  </ScrollView>
                </>
              ) : (
                <>
                  <Text style={styles.votingTitle}>✅ All Votes Cast!</Text>
                  <Text style={styles.votingSubtitle}>
                    {Object.keys(votes).length} players voted
                  </Text>
                  
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={closeVoting}
                  >
                    <Text style={styles.buttonText}>View Results</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Modal>
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
    backgroundColor: "#e63946",
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
    paddingHorizontal: 24,
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
  playersCard: {
    backgroundColor: "#1c2541",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  playerItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#2d3a5e",
  },
  playerItemDead: {
    opacity: 0.5,
  },
  playerName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  voteCount: {
    color: "#4ecdc4",
    fontSize: 14,
    fontWeight: "600",
  },
  rolesCard: {
    backgroundColor: "#1c2541",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: "center",
  },
  rolesTitle: { color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 8 },
  rolesSubtext: { color: "#89a" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  votingModal: {
    backgroundColor: "#1c2541",
    borderRadius: 20,
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
    padding: 24,
  },
  votingTitle: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },
  votingSubtitle: {
    color: "#89a",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 8,
  },
  votingProgress: {
    color: "#4ecdc4",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
  },
  votingScroll: {
    maxHeight: 400,
  },
  voteOption: {
    backgroundColor: "#2d3a5e",
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  voteOptionName: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
  },
  voteOptionArrow: {
    color: "#e63946",
    fontSize: 28,
    fontWeight: "bold",
  },
  gameOverCard: {
  backgroundColor: "#1c2541",
  borderRadius: 20,
  padding: 28,
  alignItems: "center",
  borderWidth: 1,
  borderColor: "#2d3a5e",
  marginVertical: 24,
  },
  gameOverTitle: {
    fontSize: 32,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 12,
  },
  gameOverMessage: {
    color: "#bcd",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginTop: 8,
  },
  gameOverButtons: {
    marginTop: 10,
  },
});