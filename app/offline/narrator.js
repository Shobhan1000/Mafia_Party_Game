import { useRouter } from "expo-router";
import * as Speech from 'expo-speech';
import { useEffect, useRef, useState } from "react";
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
  const sequenceRef = useRef([]); // To keep track of the sequence across re-renders
  
  const [phase, setPhase] = useState("setup");
  const [playerCount, setPlayerCount] = useState("5");
  const [playerNames, setPlayerNames] = useState([]);
  const [players, setPlayers] = useState([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [showRole, setShowRole] = useState(false);
  const [timeLimit, setTimeLimit] = useState("5");
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [eliminatedPlayers, setEliminatedPlayers] = useState([]);
  const [votes, setVotes] = useState({});
  const [currentRound, setCurrentRound] = useState(1);
  
  const [killMode, setKillMode] = useState(false);
  const [roleConfig, setRoleConfig] = useState({
    mafia: 1,
    detective: 1,
    doctor: 1,
  });
  const [nightActions, setNightActions] = useState({});
  
  const [isNightSequenceActive, setIsNightSequenceActive] = useState(false);
  const [currentNarration, setCurrentNarration] = useState("");
  const [nightSequenceStep, setNightSequenceStep] = useState(0);
  const [showPlayerSelection, setShowPlayerSelection] = useState(false);
  const [currentRole, setCurrentRole] = useState(null);
  const [countdownTimer, setCountdownTimer] = useState(0);

  const [showVotingModal, setShowVotingModal] = useState(false);
  const [currentVoterIndex, setCurrentVoterIndex] = useState(0);
  const [votingComplete, setVotingComplete] = useState(false);
  const [winner, setWinner] = useState(null);

  useEffect(() => {
    let interval;
    if (timerActive && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => (prev <= 1 ? 0 : prev - 1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, timeRemaining]);

  useEffect(() => {
    let interval;
    if (countdownTimer > 0) {
      interval = setInterval(() => {
        setCountdownTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [countdownTimer]);

  useEffect(() => {
    if (!["setup", "names", "roles", "gameOver"].includes(phase) && players.length > 0) {
      const alivePlayers = players.filter(p => p.alive);
      const aliveMafia = alivePlayers.filter(p => p.role.team === "mafia");
      const aliveTown = alivePlayers.filter(p => p.role.team === "town");

      if (aliveMafia.length === 0 && alivePlayers.length > 0) {
        setPhase("gameOver");
        setWinner("town");
      } else if (aliveMafia.length >= aliveTown.length && alivePlayers.length > 0) {
        setPhase("gameOver");
        setWinner("mafia");
      }
    }
  }, [players, phase]);

  const speak = async (text, onComplete) => {
    try {
      await Speech.stop();
      Speech.speak(text, {
        language: 'en-US',
        pitch: 1.0,
        rate: 0.85,
        onDone: () => onComplete?.(),
      });
    } catch (error) {
      onComplete?.();
    }
  };

  const startAutomatedNightSequence = async () => {
    setIsNightSequenceActive(true);
    setNightSequenceStep(0);
    setNightActions({});
    
    const sequence = [];
    sequence.push({ type: 'narration', text: 'Night falls on the village. Everyone, close your eyes.', duration: 2000 });

    const mafiaPlayers = players.filter(p => p.alive && p.role.id === 'mafia');
    if (mafiaPlayers.length > 0) {
      sequence.push({ type: 'narration', text: 'Mafia, open your eyes.', duration: 1500 });
      // FIX 1: Only prompt agreement if > 1 mafia
      if (mafiaPlayers.length > 1) {
        sequence.push({ type: 'narration', text: 'Silently agree on someone to eliminate.', duration: 3000 });
      }
      sequence.push({ type: 'action', role: 'mafia', text: 'Mafia, select your target.', countdown: 10 });
      sequence.push({ type: 'narration', text: 'Mafia, close your eyes.', duration: 1500 });
    }

    // FIX 5: Detective and Doctor narration always plays, but action only shows if alive
    const detExists = players.some(p => p.role.id === 'detective');
    if (detExists) {
      sequence.push({ type: 'narration', text: 'Detective, open your eyes.', duration: 1500 });
      const isDetAlive = players.some(p => p.alive && p.role.id === 'detective');
      if (isDetAlive) {
        sequence.push({ type: 'action', role: 'detective', text: 'Detective, choose someone to investigate.', countdown: 8 });
      } else {
        sequence.push({ type: 'narration', text: 'Detective, choose someone to investigate.', duration: 4000 });
      }
      sequence.push({ type: 'narration', text: 'Detective, close your eyes.', duration: 1500 });
    }

    const docExists = players.some(p => p.role.id === 'doctor');
    if (docExists) {
      sequence.push({ type: 'narration', text: 'Doctor, open your eyes.', duration: 1500 });
      const isDocAlive = players.some(p => p.alive && p.role.id === 'doctor');
      if (isDocAlive) {
        sequence.push({ type: 'action', role: 'doctor', text: 'Doctor, choose someone to save.', countdown: 8 });
      } else {
        sequence.push({ type: 'narration', text: 'Doctor, choose someone to save.', duration: 4000 });
      }
      sequence.push({ type: 'narration', text: 'Doctor, close your eyes.', duration: 1500 });
    }

    sequence.push({ type: 'narration', text: 'The sun rises. Everyone, open your eyes.', duration: 2000 });
    sequenceRef.current = sequence;
    executeNightSequence(0);
  };

  const executeNightSequence = async (stepIndex) => {
    const sequence = sequenceRef.current;
    if (stepIndex >= sequence.length) {
      setIsNightSequenceActive(false);
      processNightActions();
      return;
    }

    const step = sequence[stepIndex];
    setNightSequenceStep(stepIndex);
    
    if (step.type === 'narration') {
      setCurrentNarration(step.text);
      speak(step.text, () => {
        setTimeout(() => executeNightSequence(stepIndex + 1), step.duration);
      });
    } else if (step.type === 'action') {
      setCurrentNarration(step.text);
      setCurrentRole(step.role);
      setCountdownTimer(step.countdown);
      setShowPlayerSelection(true);
      speak(step.text);
    }
  };

  const selectNightTarget = (targetId, role) => {
    const target = players.find(p => p.id === targetId);
    
    setNightActions(prev => ({
      ...prev,
      [role]: { role: role, targetId: targetId, targetName: target?.name }
    }));
    
    // FIX 2: Immediate Detective result
    if (role === 'detective') {
      const isMafia = target?.role.id === "mafia";
      Alert.alert(
        "🕵️ Investigation",
        `${target.name} is ${isMafia ? "MAFIA" : "INNOCENT"}.`,
        [{ text: "OK", onPress: () => finishAction() }]
      );
    } else {
      finishAction();
    }

    function finishAction() {
      setShowPlayerSelection(false);
      setCurrentRole(null);
      setCountdownTimer(0);
      executeNightSequence(nightSequenceStep + 1);
    }
  };

  const processNightActions = () => {
    if (killMode) {
      const killedId = nightActions.mafia?.targetId;
      const savedId = nightActions.doctor?.targetId;
      
      let message = "No one was killed last night!";
      if (killedId && killedId !== savedId) {
        const victim = players.find(p => p.id === killedId);
        if (victim) {
          victim.alive = false;
          // FIX 4: Just show name, no role
          message = `${victim.name} was eliminated during the night.`;
          setEliminatedPlayers(prev => [...prev, victim]);
        }
      } else if (killedId && killedId === savedId) {
        message = "The Mafia attacked, but the Doctor saved the target!";
      }
      
      setPlayers([...players]);
      setTimeout(() => {
        Alert.alert("Night Results", message, [{ text: "Continue" }]);
      }, 500);
    }
    startDayPhase();
  };

  // FIX 7: New Roles, Same Players
  const restartSamePlayers = () => {
    setPhase("setup");
    setEliminatedPlayers([]);
    setCurrentRound(1);
    setWinner(null);
    setNightActions({});
    generateRoles(); // Re-use names already in playerNames
  };

  const proceedToNames = () => {
    const count = parseInt(playerCount);
    if (count < 3) return Alert.alert("Error", "Need 3+ players");
    setPlayerNames(Array(count).fill(""));
    setPhase("names");
  };

  const generateRoles = () => {
    const count = playerNames.length;
    const roles = [];
    for (let i = 0; i < roleConfig.mafia; i++) roles.push(ROLES.find(r => r.id === "mafia"));
    for (let i = 0; i < roleConfig.detective; i++) roles.push(ROLES.find(r => r.id === "detective"));
    for (let i = 0; i < roleConfig.doctor; i++) roles.push(ROLES.find(r => r.id === "doctor"));
    while (roles.length < count) roles.push(ROLES.find(r => r.id === "villager"));

    const shuffled = roles.sort(() => Math.random() - 0.5);
    setPlayers(shuffled.map((role, i) => ({
      id: i + 1,
      name: playerNames[i].trim(),
      role: role,
      alive: true,
    })));
    setPhase("roles");
    setCurrentPlayerIndex(0);
  };

  const showNextRole = () => {
    if (currentPlayerIndex < players.length - 1) {
      setCurrentPlayerIndex(currentPlayerIndex + 1);
      setShowRole(false);
    } else {
      setPhase("night");
    }
  };

  const startDayPhase = () => {
    setPhase("day");
    if (parseInt(timeLimit) > 0) {
      setTimeRemaining(parseInt(timeLimit) * 60);
      setTimerActive(true);
    }
  };

  const startVoting = () => {
    setVotes({});
    setCurrentVoterIndex(0);
    setVotingComplete(false);
    setShowVotingModal(true);
  };

  const castVote = (targetId) => {
    const alivePlayers = players.filter(p => p.alive);
    setVotes(prev => ({ ...prev, [alivePlayers[currentVoterIndex].id]: targetId }));
    if (currentVoterIndex < alivePlayers.length - 1) {
      setCurrentVoterIndex(currentVoterIndex + 1);
    } else {
      setVotingComplete(true);
    }
  };

  const closeVoting = () => {
    setShowVotingModal(false);
    const counts = {};
    Object.values(votes).forEach(id => counts[id] = (counts[id] || 0) + 1);
    const max = Math.max(...Object.values(counts));
    const ties = Object.keys(counts).filter(id => counts[id] === max);

    if (ties.length === 1) {
      const victim = players.find(p => p.id === parseInt(ties[0]));
      victim.alive = false;
      Alert.alert("Result", `${victim.name} was eliminated.`);
    } else {
      Alert.alert("Result", "It was a tie. No one leaves.");
    }
    setPlayers([...players]);
    setCurrentRound(r => r + 1);
    setPhase("night");
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (phase === "setup") {
    return (
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backText}>← Menu</Text>
          </TouchableOpacity>
          <Text style={styles.title}>📖 Setup</Text>
          <View style={styles.setupCard}>
            <Text style={styles.label}>Players</Text>
            <TextInput style={styles.input} value={playerCount} onChangeText={setPlayerCount} keyboardType="number-pad" />
            <View style={styles.toggleContainer}>
              <Text style={styles.toggleLabel}>🔪 Kill Mode</Text>
              <Switch value={killMode} onValueChange={setKillMode} />
            </View>
            <TouchableOpacity style={styles.primaryButton} onPress={proceedToNames}>
              <Text style={styles.buttonText}>Enter Names</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  }

  if (phase === "names") {
    return (
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          <Text style={styles.title}>Names</Text>
          {playerNames.map((n, i) => (
            <TextInput
              key={i}
              style={[styles.input, { marginBottom: 10 }]}
              placeholder={`Player ${i + 1}`}
              value={n}
              onChangeText={t => {
                const arr = [...playerNames];
                arr[i] = t;
                setPlayerNames(arr);
              }}
              placeholderTextColor="#666"
            />
          ))}
          <TouchableOpacity style={styles.primaryButton} onPress={generateRoles}>
            <Text style={styles.buttonText}>Assign Roles</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  if (phase === "roles") {
    const p = players[currentPlayerIndex];
    return (
      <View style={styles.container}>
        <View style={styles.roleCard}>
          {!showRole ? (
            <TouchableOpacity style={styles.primaryButton} onPress={() => setShowRole(true)}>
              <Text style={styles.buttonText}>Reveal {p.name}</Text>
            </TouchableOpacity>
          ) : (
            <>
              <Text style={styles.roleEmojiLarge}>{p.role.emoji}</Text>
              <Text style={styles.roleName}>{p.role.name}</Text>
              <TouchableOpacity style={styles.secondaryButton} onPress={showNextRole}>
                <Text style={styles.buttonText}>Next</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  }

  if (phase === "gameOver") {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Game Over</Text>
        <Text style={[styles.subtitle, { color: winner === 'town' ? '#4CAF50' : '#e63946', fontSize: 24 }]}>
          {winner === 'town' ? 'Town Wins! 🎉' : 'Mafia Wins! 🕶️'}
        </Text>
        
        {/* FIX 6: Stats removed, just roster remains */}
        <View style={styles.finalPlayersCard}>
          {players.map(p => (
            <View key={p.id} style={styles.finalPlayerItem}>
              <Text style={{ color: '#fff' }}>{p.alive ? '✅' : '💀'} {p.name} ({p.role.name})</Text>
            </View>
          ))}
        </View>

        {/* FIX 7: Restart Button */}
        <TouchableOpacity style={styles.primaryButton} onPress={restartSamePlayers}>
          <Text style={styles.buttonText}>🔄 Play Again (New Roles)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.secondaryButton, { marginTop: 10 }]} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Exit to Main Menu</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Round {currentRound}</Text>
      <Text style={styles.phaseIndicator}>{phase.toUpperCase()}</Text>
      {timerActive && <Text style={styles.timerText}>{formatTime(timeRemaining)}</Text>}

      <ScrollView style={{ marginTop: 20 }}>
        {players.map(p => (
          <View key={p.id} style={[styles.playerItem, !p.alive && styles.playerItemDead]}>
            <Text style={styles.playerName}>{p.alive ? '👤' : '💀'} {p.name}</Text>
          </View>
        ))}
      </ScrollView>

      {phase === "night" && (
        <TouchableOpacity style={styles.primaryButton} onPress={startAutomatedNightSequence}>
          <Text style={styles.buttonText}>🌙 Begin Night</Text>
        </TouchableOpacity>
      )}
      {phase === "day" && (
        <TouchableOpacity style={styles.primaryButton} onPress={startVoting}>
          <Text style={styles.buttonText}>🗳️ Voting</Text>
        </TouchableOpacity>
      )}

      <Modal visible={isNightSequenceActive} transparent={false}>
        <View style={styles.narrationOverlay}>
          <Text style={styles.narrationText}>{currentNarration}</Text>
          {countdownTimer > 0 && <Text style={styles.countdownText}>{countdownTimer}s</Text>}
          
          {showPlayerSelection && (
            <ScrollView style={{ width: '100%', padding: 20 }}>
              {players.filter(p => p.alive).map(p => {
                // FIX 3: Detective/Doctor cannot choose themselves
                const actor = players.find(ap => ap.alive && ap.role.id === currentRole);
                if (currentRole !== 'mafia' && p.id === actor?.id) return null;

                return (
                  <TouchableOpacity key={p.id} style={styles.playerSelectionButton} onPress={() => selectNightTarget(p.id, currentRole)}>
                    <Text style={styles.playerSelectionName}>{p.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      </Modal>

      <Modal visible={showVotingModal} transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.votingModal}>
            {!votingComplete ? (
              <>
                <Text style={styles.votingTitle}>{players.filter(p => p.alive)[currentVoterIndex]?.name}'s Vote</Text>
                {players.filter(p => p.alive).map(p => (
                  <TouchableOpacity key={p.id} style={styles.voteOption} onPress={() => castVote(p.id)}>
                    <Text style={styles.voteOptionName}>{p.name}</Text>
                  </TouchableOpacity>
                ))}
              </>
            ) : (
              <TouchableOpacity style={styles.primaryButton} onPress={closeVoting}>
                <Text style={styles.buttonText}>Finish Voting</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1 },
  container: { flex: 1, padding: 24, backgroundColor: "#0b132b" },
  backButton: { marginBottom: 10 },
  backText: { color: "#fff" },
  title: { color: "#fff", fontSize: 28, fontWeight: "800", textAlign: "center" },
  subtitle: { color: "#89a", textAlign: "center", marginBottom: 20 },
  setupCard: { backgroundColor: "#1c2541", padding: 20, borderRadius: 15 },
  label: { color: "#fff", marginBottom: 5 },
  input: { backgroundColor: "#2d3a5e", color: "#fff", padding: 15, borderRadius: 10 },
  primaryButton: { backgroundColor: "#e63946", padding: 15, borderRadius: 10, alignItems: 'center' },
  secondaryButton: { backgroundColor: "#457b9d", padding: 15, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: "#fff", fontWeight: "bold" },
  playerItem: { backgroundColor: "#1c2541", padding: 15, borderRadius: 10, marginBottom: 10 },
  playerItemDead: { opacity: 0.4 },
  playerName: { color: "#fff", fontSize: 18 },
  timerText: { color: "#4ecdc4", fontSize: 40, textAlign: 'center', fontWeight: 'bold' },
  narrationOverlay: { flex: 1, backgroundColor: "#000", justifyContent: 'center', alignItems: 'center', padding: 20 },
  narrationText: { color: "#fff", fontSize: 24, textAlign: 'center' },
  countdownText: { color: "#e63946", fontSize: 60, fontWeight: 'bold' },
  playerSelectionButton: { backgroundColor: "#2d3a5e", padding: 20, borderRadius: 10, marginBottom: 10 },
  playerSelectionName: { color: "#fff", fontSize: 20, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  votingModal: { backgroundColor: '#1c2541', padding: 20, borderRadius: 20 },
  voteOption: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#2d3a5e' },
  voteOptionName: { color: '#fff', fontSize: 18 },
  roleEmojiLarge: { fontSize: 80 },
  roleName: { color: '#fff', fontSize: 30, fontWeight: 'bold' },
  roleCard: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  phaseIndicator: { color: '#4ecdc4', textAlign: 'center', fontWeight: 'bold' },
  toggleContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 15 },
  toggleLabel: { color: '#fff' },
  finalPlayersCard: { backgroundColor: '#1c2541', padding: 15, borderRadius: 10, marginVertical: 20 },
  finalPlayerItem: { paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: '#2d3a5e' }
});