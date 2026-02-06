//------LIST OF THINGS TO FIX/ADD:---------//
// - Fix the limits on the roles so it doesn't allow more special roles than players
// - Make it so that mafia cannot select themselves as a target and detective cannot select themselves for investigation and doctor cannot select themselves for saving
// - Give the rules from wikipedia so that the game can end as it should when all mafia are eliminated or when mafia equal or outnumber town
// - Get rid of the game log at the bottom of the screen
// - Implement the same voting system as in the generator mode and don't show the players roles when voting

import { useRouter } from "expo-router";
import * as Speech from 'expo-speech';
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

export default function NarratorMode() {
  const router = useRouter();
  const [phase, setPhase] = useState("setup"); // setup, names, roles, night, day, voting, gameOver
  const [playerCount, setPlayerCount] = useState("5");
  const [playerNames, setPlayerNames] = useState([]);
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
  
  // Kill mode and role customization
  const [killMode, setKillMode] = useState(false);
  const [roleConfig, setRoleConfig] = useState({
    mafia: 1,
    detective: 1,
    doctor: 1,
  });
  const [nightActions, setNightActions] = useState({});
  const [showNightActionModal, setShowNightActionModal] = useState(false);
  const [currentNightPlayer, setCurrentNightPlayer] = useState(null);
  
  // Audio narration
  const [sound, setSound] = useState(null);
  const [isNightSequenceActive, setIsNightSequenceActive] = useState(false);
  const [currentNarration, setCurrentNarration] = useState("");
  const [nightSequenceStep, setNightSequenceStep] = useState(0);
  const [showPlayerSelection, setShowPlayerSelection] = useState(false);
  const [currentRole, setCurrentRole] = useState(null);
  const [countdownTimer, setCountdownTimer] = useState(0);

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

  // Countdown timer for night actions
  useEffect(() => {
    let interval;
    if (countdownTimer > 0) {
      interval = setInterval(() => {
        setCountdownTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [countdownTimer]);

  // Text-to-speech function using expo-speech
  const speak = async (text, onComplete) => {
    try {
      // Stop any ongoing speech
      await Speech.stop();
      
      // Speak the text
      Speech.speak(text, {
        language: 'en-US',
        pitch: 1.0,
        rate: 0.85, // Slightly slower for clarity
        onDone: () => {
          if (onComplete) onComplete();
        },
        onStopped: () => {
          if (onComplete) onComplete();
        },
        onError: (error) => {
          console.error("Speech error:", error);
          if (onComplete) onComplete();
        }
      });
    } catch (error) {
      console.error("Speech error:", error);
      // Fallback to text-only
      if (onComplete) onComplete();
    }
  };

  // Automated night sequence
  const startAutomatedNightSequence = async () => {
    setIsNightSequenceActive(true);
    setNightSequenceStep(0);
    setNightActions({});
    
    // Sequence steps
    const sequence = [];
    
    // 1. Everyone close eyes
    sequence.push({
      type: 'narration',
      text: 'Night falls on the village. Everyone, close your eyes and go to sleep.',
      duration: 3000
    });

    // 2. Mafia wake up
    const mafiaPlayers = players.filter(p => p.alive && p.role.id === 'mafia');
    if (mafiaPlayers.length > 0) {
      sequence.push({
        type: 'narration',
        text: `Mafia, open your eyes and silently agree on someone to eliminate.`,
        duration: 2000
      });
      
      sequence.push({
        type: 'action',
        role: 'mafia',
        text: 'Mafia, select your target.',
        countdown: 10
      });
      
      sequence.push({
        type: 'narration',
        text: 'Mafia, close your eyes.',
        duration: 2000
      });
    }

    // 3. Detective wake up
    const detectivePlayers = players.filter(p => p.alive && p.role.id === 'detective');
    if (detectivePlayers.length > 0) {
      sequence.push({
        type: 'narration',
        text: 'Detective, open your eyes.',
        duration: 2000
      });
      
      sequence.push({
        type: 'action',
        role: 'detective',
        text: 'Detective, choose someone to investigate.',
        countdown: 8
      });
      
      sequence.push({
        type: 'narration',
        text: 'Detective, close your eyes.',
        duration: 2000
      });
    }

    // 4. Doctor wake up
    const doctorPlayers = players.filter(p => p.alive && p.role.id === 'doctor');
    if (doctorPlayers.length > 0) {
      sequence.push({
        type: 'narration',
        text: 'Doctor, open your eyes.',
        duration: 2000
      });
      
      sequence.push({
        type: 'action',
        role: 'doctor',
        text: 'Doctor, choose someone to save.',
        countdown: 8
      });
      
      sequence.push({
        type: 'narration',
        text: 'Doctor, close your eyes.',
        duration: 2000
      });
    }

    // 5. Morning
    sequence.push({
      type: 'narration',
      text: 'The sun rises. Everyone, open your eyes.',
      duration: 2000
    });

    // Execute sequence
    executeNightSequence(sequence, 0);
  };

  const executeNightSequence = async (sequence, stepIndex) => {
    if (stepIndex >= sequence.length) {
      // Sequence complete, process results
      setIsNightSequenceActive(false);
      processNightActions();
      return;
    }

    const step = sequence[stepIndex];
    setNightSequenceStep(stepIndex);
    
    if (step.type === 'narration') {
      setCurrentNarration(step.text);
      speak(step.text, () => {
        setTimeout(() => {
          executeNightSequence(sequence, stepIndex + 1);
        }, step.duration);
      });
    } else if (step.type === 'action') {
      setCurrentNarration(step.text);
      setCurrentRole(step.role);
      setCountdownTimer(step.countdown);
      setShowPlayerSelection(true);
      
      speak(step.text);
      
      // Auto-continue after countdown (or when action is taken)
      setTimeout(() => {
        setShowPlayerSelection(false);
        setCurrentRole(null);
        executeNightSequence(sequence, stepIndex + 1);
      }, step.countdown * 1000);
    }
  };

  const selectNightTarget = (targetId, role) => {
    // Record the action
    setNightActions(prev => ({
      ...prev,
      [role]: {
        role: role,
        targetId: targetId,
        targetName: players.find(p => p.id === targetId)?.name
      }
    }));
    
    // Clear selection UI
    setShowPlayerSelection(false);
    setCurrentRole(null);
    setCountdownTimer(0);
  };

  const addLog = (message) => {
    setGameLog((prev) => [...prev, { message, time: new Date().toLocaleTimeString() }]);
  };

  const proceedToNames = () => {
    const count = parseInt(playerCount);
    if (count < 3) {
      Alert.alert("Error", "Need at least 3 players");
      return;
    }
    
    // Initialize empty names array
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
    
    // Validate all names are filled
    const emptyNames = playerNames.filter(name => !name.trim());
    if (emptyNames.length > 0) {
      Alert.alert("Missing Names", "Please enter names for all players");
      return;
    }

    // Validate role counts
    const totalSpecialRoles = roleConfig.mafia + roleConfig.detective + roleConfig.doctor;
    if (totalSpecialRoles > count) {
      Alert.alert("Too Many Roles", `You have ${count} players but selected ${totalSpecialRoles} special roles. Please adjust.`);
      return;
    }

    if (roleConfig.mafia < 1) {
      Alert.alert("Need Mafia", "You need at least 1 Mafia member");
      return;
    }

    const roles = [];

    // Add mafia
    for (let i = 0; i < roleConfig.mafia; i++) {
      roles.push(ROLES.find((r) => r.id === "mafia"));
    }

    // Add detective
    for (let i = 0; i < roleConfig.detective; i++) {
      roles.push(ROLES.find((r) => r.id === "detective"));
    }

    // Add doctor
    for (let i = 0; i < roleConfig.doctor; i++) {
      roles.push(ROLES.find((r) => r.id === "doctor"));
    }

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
        name: playerNames[i].trim(),
        role: role,
        alive: true,
        revealedRole: false,
      }))
    );
    setPhase("roles");
    addLog(`🎲 Roles generated for ${count} players (${roleConfig.mafia} Mafia, ${roleConfig.detective} Detective, ${roleConfig.doctor} Doctor)`);
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
    setNightActions({});
    addLog(`🌙 Night ${currentRound} begins`);
    
    if (killMode) {
      // Start automated night sequence with audio
      startAutomatedNightSequence();
    }
  };

  const openNightAction = (player) => {
    if (!player.alive) {
      Alert.alert("Dead Players", "This player is eliminated and cannot take actions");
      return;
    }
    
    if (player.role.id === "villager") {
      Alert.alert("Villager", "Villagers have no night action. Sleep tight!");
      return;
    }
    
    setCurrentNightPlayer(player);
    setShowNightActionModal(true);
  };

  const submitNightAction = (targetId) => {
    if (!currentNightPlayer) return;
    
    setNightActions(prev => ({
      ...prev,
      [currentNightPlayer.id]: {
        actorId: currentNightPlayer.id,
        actorName: currentNightPlayer.name,
        actorRole: currentNightPlayer.role.id,
        targetId: targetId,
        targetName: players.find(p => p.id === targetId)?.name
      }
    }));
    
    setShowNightActionModal(false);
    setCurrentNightPlayer(null);
    
    Alert.alert("Action Recorded", "Night action has been recorded privately");
  };

  const processNightActions = () => {
    if (killMode) {
      const kills = new Set();
      const saves = new Set();
      
      // Process actions
      if (nightActions.mafia) {
        kills.add(nightActions.mafia.targetId);
      }
      if (nightActions.doctor) {
        saves.add(nightActions.doctor.targetId);
      }
      
      // Apply kills (excluding saved players)
      const actuallyKilled = [];
      kills.forEach(targetId => {
        if (!saves.has(targetId)) {
          const player = players.find(p => p.id === targetId);
          if (player && player.alive) {
            player.alive = false;
            actuallyKilled.push(player.name);
            setEliminatedPlayers(prev => [...prev, player]);
          }
        }
      });
      
      setPlayers([...players]); // Force update
      
      if (actuallyKilled.length > 0) {
        addLog(`💀 ${actuallyKilled.join(", ")} eliminated during the night`);
        setTimeout(() => {
          Alert.alert(
            "Night Results",
            `${actuallyKilled.join(", ")} was eliminated during the night.`,
            [{ text: "Continue" }]
          );
        }, 500);
      } else {
        addLog("😇 No one was killed last night");
        setTimeout(() => {
          Alert.alert(
            "Night Results",
            "No one was killed last night!",
            [{ text: "Continue" }]
          );
        }, 500);
      }
      
      // Show detective results if any
      if (nightActions.detective) {
        const target = players.find(p => p.id === nightActions.detective.targetId);
        const isMafia = target?.role.id === "mafia";
        setTimeout(() => {
          Alert.alert(
            "🕵️ Detective Report",
            `You investigated ${nightActions.detective.targetName}.\n\nResult: ${isMafia ? "🕶️ This person is MAFIA!" : "✅ This person is INNOCENT."}`,
            [{ text: "OK" }]
          );
        }, 1500);
      }
    }
    
    setNightActions({});
    startDayPhase();
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

            {/* Kill Mode Toggle */}
            <View style={styles.toggleContainer}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>🔪 Kill Mode</Text>
                <Text style={styles.toggleHint}>
                  Players take night actions privately on this device
                </Text>
              </View>
              <Switch
                value={killMode}
                onValueChange={setKillMode}
                trackColor={{ false: "#333", true: "#e63946" }}
                thumbColor={killMode ? "#fff" : "#f4f3f4"}
              />
            </View>

            {/* Role Customization */}
            <Text style={styles.sectionTitle}>Customize Roles</Text>
            
            <View style={styles.roleConfigItem}>
              <View style={styles.roleConfigLabel}>
                <Text style={styles.roleEmoji}>🕶️</Text>
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

            <View style={styles.roleConfigItem}>
              <View style={styles.roleConfigLabel}>
                <Text style={styles.roleEmoji}>🕵️</Text>
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

            <View style={styles.roleConfigItem}>
              <View style={styles.roleConfigLabel}>
                <Text style={styles.roleEmoji}>⚕️</Text>
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

            <Text style={styles.roleConfigNote}>
              Total special roles: {roleConfig.mafia + roleConfig.detective + roleConfig.doctor}
              {"\n"}Remaining players will be Villagers
            </Text>

            <TouchableOpacity style={styles.primaryButton} onPress={proceedToNames}>
              <Text style={styles.buttonText}>Continue to Names</Text>
            </TouchableOpacity>
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
          <TouchableOpacity style={styles.backButton} onPress={() => setPhase("setup")}>
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
                  returnKeyType={index < playerNames.length - 1 ? "next" : "done"}
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
            <>
              {killMode ? (
                <>
                  {!isNightSequenceActive ? (
                    <TouchableOpacity
                      style={styles.primaryButton}
                      onPress={startNightPhase}
                    >
                      <Text style={styles.buttonText}>🌙 Begin Automated Night Sequence</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.nightSequenceInfo}>
                      <Text style={styles.nightSequenceText}>Night sequence in progress...</Text>
                      <Text style={styles.nightSequenceSubtext}>Follow the voice instructions</Text>
                    </View>
                  )}
                </>
              ) : (
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={startDayPhase}
                >
                  <Text style={styles.buttonText}>☀️ Start Day Phase</Text>
                </TouchableOpacity>
              )}
            </>
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

        {/* Night Action Modal */}
        <Modal
          visible={isNightSequenceActive}
          transparent={false}
          animationType="fade"
        >
          <View style={styles.narrationOverlay}>
            <View style={styles.narrationContent}>
              <Text style={styles.narrationText}>{currentNarration}</Text>
              
              {countdownTimer > 0 && (
                <Text style={styles.countdownText}>{countdownTimer}s</Text>
              )}
              
              {showPlayerSelection && currentRole && (
                <View style={styles.playerSelectionContainer}>
                  <Text style={styles.selectionTitle}>
                    {currentRole === 'mafia' && '🕶️ Select target to eliminate'}
                    {currentRole === 'detective' && '🕵️ Select player to investigate'}
                    {currentRole === 'doctor' && '⚕️ Select player to save'}
                  </Text>
                  
                  <ScrollView style={styles.playerSelectionScroll}>
                    {players
                      .filter(p => p.alive)
                      .map((player) => (
                        <TouchableOpacity
                          key={player.id}
                          style={[
                            styles.playerSelectionButton,
                            nightActions[currentRole]?.targetId === player.id && styles.playerSelectionButtonSelected
                          ]}
                          onPress={() => selectNightTarget(player.id, currentRole)}
                        >
                          <Text style={styles.playerSelectionName}>{player.name}</Text>
                          {nightActions[currentRole]?.targetId === player.id && (
                            <Text style={styles.playerSelectionCheck}>✓</Text>
                          )}
                        </TouchableOpacity>
                      ))}
                  </ScrollView>
                </View>
              )}
              
              {!showPlayerSelection && (
                <View style={styles.narrationInstructions}>
                  <Text style={styles.instructionText}>
                    🔇 Listen to the narrator
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Modal>
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
  namesCard: {
    backgroundColor: "#1c2541",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "#2d3a5e",
  },
  nameInputGroup: {
    marginBottom: 16,
  },
  nameLabel: {
    color: "#4ecdc4",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
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
  disabledButton: {
    opacity: 0.5,
    backgroundColor: "#666",
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
  toggleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    marginTop: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#2d3a5e",
  },
  toggleInfo: {
    flex: 1,
    marginRight: 16,
  },
  toggleLabel: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  toggleHint: {
    color: "#89a",
    fontSize: 12,
    lineHeight: 18,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 24,
    marginBottom: 16,
  },
  roleConfigItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#2d3a5e",
  },
  roleConfigLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  roleEmoji: {
    fontSize: 24,
  },
  roleConfigText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  roleConfigControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  roleConfigButton: {
    backgroundColor: "#e63946",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  roleConfigButtonText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  roleConfigValue: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    minWidth: 25,
    textAlign: "center",
  },
  roleConfigNote: {
    color: "#89a",
    fontSize: 13,
    marginTop: 16,
    lineHeight: 20,
    textAlign: "center",
  },
  nightModeTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  nightModeInstructions: {
    color: "#89a",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 20,
  },
  nightSequenceInfo: {
    backgroundColor: "#1c2541",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
  },
  nightSequenceText: {
    color: "#4ecdc4",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  nightSequenceSubtext: {
    color: "#89a",
    fontSize: 14,
  },
  narrationOverlay: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  narrationContent: {
    width: "100%",
    padding: 40,
    alignItems: "center",
  },
  narrationText: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 44,
  },
  countdownText: {
    color: "#e63946",
    fontSize: 72,
    fontWeight: "800",
    marginVertical: 20,
  },
  narrationInstructions: {
    marginTop: 40,
  },
  instructionText: {
    color: "#89a",
    fontSize: 18,
    textAlign: "center",
  },
  playerSelectionContainer: {
    width: "100%",
    maxWidth: 500,
    marginTop: 20,
  },
  selectionTitle: {
    color: "#4ecdc4",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 20,
  },
  playerSelectionScroll: {
    maxHeight: 400,
  },
  playerSelectionButton: {
    backgroundColor: "#1c2541",
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    borderWidth: 3,
    borderColor: "#2d3a5e",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  playerSelectionButtonSelected: {
    borderColor: "#4CAF50",
    backgroundColor: "rgba(76, 175, 80, 0.2)",
  },
  playerSelectionName: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "600",
  },
  playerSelectionCheck: {
    color: "#4CAF50",
    fontSize: 32,
    fontWeight: "bold",
  },
});