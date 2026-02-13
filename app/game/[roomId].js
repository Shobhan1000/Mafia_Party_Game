import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import socket from "../../socket";

export default function GameScreen() {
  const { roomId = "", playerId: paramPlayerId = "" } = useLocalSearchParams();
  const router = useRouter();

  const [players, setPlayers] = useState([]);
  const [myRole, setMyRole] = useState(null);
  const [phase, setPhase] = useState('loading');
  const [round, setRound] = useState(1);
  const [playerId, setPlayerId] = useState(paramPlayerId);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [actionConfirmed, setActionConfirmed] = useState(false);
  const [winner, setWinner] = useState(null);
  const [nightResults, setNightResults] = useState(null);
  const [voteResults, setVoteResults] = useState(null);
  const [detectiveReport, setDetectiveReport] = useState(null);
  const [voteProgress, setVoteProgress] = useState({ current: 0, total: 0 });
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState('playing');
  
  const listenersAttached = useRef(false);

  // Load playerId from storage
  useEffect(() => {
    const init = async () => {
      const storedId = await AsyncStorage.getItem("playerId");
      if (storedId) {
        setPlayerId(storedId);
      }
    };
    init();
  }, []);

  // Socket event listeners
  useEffect(() => {
    if (!roomId || !playerId) return;

    const onConnect = () => {
      console.log("Game: Socket connected");
      setIsConnected(true);
      
      // Reconnect to room
      socket.emit("reconnectToRoom", {
        roomId: String(roomId).toUpperCase(),
        playerId
      }, (ack) => {
        if (!ack?.success) {
          Alert.alert("Connection Error", "Could not reconnect to game", [
            { text: "OK", onPress: () => router.replace("/") }
          ]);
        }
      });
    };

    const onDisconnect = () => {
      console.log("Game: Socket disconnected");
      setIsConnected(false);
    };

    const onYourRole = (role) => {
      console.log("Your role:", role);
      setMyRole(role);
    };

    const onGameStateUpdate = (state) => {
      console.log("Game state update:", state);
      setPhase(state.phase || 'roleReveal');
      setRound(state.round || 1);
      setPlayers(state.players || []);
      setStatus(state.status || 'playing');
      
      if (state.status === 'finished') {
        setWinner(state.winner);
      }
    };

    const onGameStarted = ({ phase: newPhase, round: newRound }) => {
      console.log("Game started:", newPhase, newRound);
      setPhase(newPhase || 'roleReveal');
      setRound(newRound || 1);
    };

    const onNightBegins = ({ round: nightRound }) => {
      console.log(`Night ${nightRound} begins`);
      setPhase('night');
      setRound(nightRound);
      setSelectedTarget(null);
      setActionConfirmed(false);
      setNightResults(null);
      setDetectiveReport(null);
    };

    const onNightResults = ({ eliminated }) => {
      console.log("Night results:", eliminated);
      setNightResults(eliminated);
      
      if (eliminated && eliminated.length > 0) {
        setTimeout(() => {
          Alert.alert(
            "Night Results",
            `💀 ${eliminated.join(", ")} was eliminated during the night.`,
            [{ text: "Continue" }]
          );
        }, 500);
      } else {
        setTimeout(() => {
          Alert.alert(
            "Night Results",
            "😇 No one was killed last night!",
            [{ text: "Continue" }]
          );
        }, 500);
      }
    };

    const onDetectiveReport = ({ targetName, role }) => {
      console.log("Detective report:", targetName, role);
      setDetectiveReport({ targetName, role });
      
      setTimeout(() => {
        Alert.alert(
          "🕵️ Detective Report",
          `You investigated ${targetName}.\n\n` +
          `Role: ${role.emoji} ${role.name}\n` +
          `Team: ${role.team === "mafia" ? "🕶️ MAFIA" : "✅ TOWN"}`,
          [{ text: "OK" }]
        );
      }, 500);
    };

    const onDayBegins = ({ round: dayRound }) => {
      console.log(`Day ${dayRound} begins`);
      setPhase('day');
      setRound(dayRound);
      setSelectedTarget(null);
      setVoteResults(null);
      setVoteProgress({ current: 0, total: 0 });
    };

    const onVotingBegins = () => {
      console.log("Voting begins");
      setPhase('voting');
      setSelectedTarget(null);
      setVoteProgress({ current: 0, total: 0 });
    };

    const onVoteProgress = ({ current, total }) => {
      setVoteProgress({ current, total });
    };

    const onVoteResults = ({ eliminated, tied, votes }) => {
      console.log("Vote results:", { eliminated, tied, votes });
      setVoteResults({ eliminated, tied, votes });
      
      setTimeout(() => {
        if (tied) {
          Alert.alert(
            "Voting Results",
            "🤝 Vote was tied - no one eliminated",
            [{ text: "Continue" }]
          );
        } else if (eliminated) {
          Alert.alert(
            "Voting Results",
            `☠️ ${eliminated} was eliminated with ${votes} vote(s)`,
            [{ text: "Continue" }]
          );
        }
      }, 500);
    };

    const onGameOver = ({ winner: gameWinner, players: finalPlayers }) => {
      console.log("Game over:", gameWinner);
      setWinner(gameWinner);
      setPhase('gameOver');
      setStatus('finished');
      
      if (finalPlayers) {
        setPlayers(finalPlayers);
      }
    };

    const onActionConfirmed = () => {
      setActionConfirmed(true);
    };

    const onError = (msg) => {
      Alert.alert("Error", String(msg || "An error occurred"));
    };

    // Attach listeners once
    if (!listenersAttached.current) {
      socket.on("connect", onConnect);
      socket.on("disconnect", onDisconnect);
      socket.on("yourRole", onYourRole);
      socket.on("gameStateUpdate", onGameStateUpdate);
      socket.on("gameStarted", onGameStarted);
      socket.on("nightBegins", onNightBegins);
      socket.on("nightResults", onNightResults);
      socket.on("detectiveReport", onDetectiveReport);
      socket.on("dayBegins", onDayBegins);
      socket.on("votingBegins", onVotingBegins);
      socket.on("voteProgress", onVoteProgress);
      socket.on("voteResults", onVoteResults);
      socket.on("gameOver", onGameOver);
      socket.on("actionConfirmed", onActionConfirmed);
      socket.on("errorMsg", onError);
      listenersAttached.current = true;
    }

    // Connect if needed
    if (!socket.connected) {
      socket.connect();
    } else {
      onConnect();
    }

    // Cleanup
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("yourRole", onYourRole);
      socket.off("gameStateUpdate", onGameStateUpdate);
      socket.off("gameStarted", onGameStarted);
      socket.off("nightBegins", onNightBegins);
      socket.off("nightResults", onNightResults);
      socket.off("detectiveReport", onDetectiveReport);
      socket.off("dayBegins", onDayBegins);
      socket.off("votingBegins", onVotingBegins);
      socket.off("voteProgress", onVoteProgress);
      socket.off("voteResults", onVoteResults);
      socket.off("gameOver", onGameOver);
      socket.off("actionConfirmed", onActionConfirmed);
      socket.off("errorMsg", onError);
      listenersAttached.current = false;
    };
  }, [roomId, playerId, router]);

  // Helper functions
  const myPlayer = players.find(p => p.playerId === playerId);
  const amAlive = myPlayer?.alive ?? true;
  const amHost = players.length > 0 && players[0]?.playerId === playerId;

  const submitNightAction = () => {
    if (!selectedTarget || actionConfirmed) return;
    
    socket.emit("nightAction", {
      roomId: String(roomId).toUpperCase(),
      playerId,
      targetId: selectedTarget
    });
  };

  const processNight = () => {
    if (!amHost) return;
    
    socket.emit("processNight", {
      roomId: String(roomId).toUpperCase(),
      playerId
    });
  };

  const startVoting = () => {
    if (!amHost) return;
    
    socket.emit("startVoting", {
      roomId: String(roomId).toUpperCase(),
      playerId
    });
  };

  const castVote = () => {
    if (!selectedTarget) return;
    
    socket.emit("castVote", {
      roomId: String(roomId).toUpperCase(),
      playerId,
      targetId: selectedTarget
    });
    
    setActionConfirmed(true);
  };

  const processVotes = () => {
    if (!amHost) return;
    
    socket.emit("processVotes", {
      roomId: String(roomId).toUpperCase(),
      playerId
    });
  };

  const returnToLobby = () => {
    socket.emit("resetGame", {
      roomId: String(roomId).toUpperCase(),
      playerId
    });
    
    router.replace({
      pathname: "/lobby/[roomId]",
      params: { roomId, playerId }
    });
  };

  const leaveGame = () => {
    Alert.alert(
      "Leave Game",
      "Are you sure you want to leave this game?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: () => {
            socket.emit("leaveLobby", {
              roomId: String(roomId).toUpperCase(),
              playerId
            });
            router.replace("/");
          }
        }
      ]
    );
  };

  // Loading state
  if (!isConnected || !myRole) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4ecdc4" />
          <Text style={styles.loadingText}>
            {!isConnected ? "Connecting to server..." : "Loading game..."}
          </Text>
        </View>
      </View>
    );
  }

  // Role Reveal Phase
  if (phase === 'roleReveal') {
    return (
      <View style={styles.container}>
        <View style={styles.roleRevealContainer}>
          <Text style={styles.roleEmoji}>{myRole.emoji}</Text>
          <Text style={styles.roleTitle}>You are the</Text>
          <Text style={styles.roleName}>{myRole.name}</Text>
          <View style={styles.separator} />
          <Text style={styles.roleDescription}>
            {myRole.team === 'mafia' ? 
              "Work with other Mafia to eliminate villagers at night." :
              myRole.id === 'detective' ?
              "Investigate one player each night to learn their role." :
              myRole.id === 'doctor' ?
              "Protect one player each night from being eliminated." :
              "Use your vote wisely during the day to find the Mafia."}
          </Text>
          
          {amHost && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => {
                socket.emit("startNight", {
                  roomId: String(roomId).toUpperCase(),
                  playerId
                });
              }}
            >
              <Text style={styles.buttonText}>🌙 Start Night Phase</Text>
            </TouchableOpacity>
          )}
          
          {!amHost && (
            <View style={styles.waitingContainer}>
              <Text style={styles.waitingText}>Waiting for host to start night phase...</Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  // Night Phase
  if (phase === 'night') {
    const canAct = amAlive && myRole.id !== 'villager';
    const alivePlayers = players.filter(p => p.alive && p.playerId !== playerId);
    
    // Filter eligible targets based on role
    const eligibleTargets = alivePlayers.filter(p => {
      if (myRole.id === 'mafia') {
        // Mafia can't target other mafia
        const targetPlayer = players.find(pl => pl.playerId === p.playerId);
        return targetPlayer?.role?.team !== 'mafia';
      }
      if (myRole.id === 'detective' || myRole.id === 'doctor') {
        // Detective and doctor can't target same role
        const targetPlayer = players.find(pl => pl.playerId === p.playerId);
        return targetPlayer?.role?.id !== myRole.id;
      }
      return true;
    });

    return (
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>🌙 Night {round}</Text>
            <Text style={styles.subtitle}>
              {canAct ? `${myRole.emoji} Take your night action` : "Sleep tight..."}
            </Text>
          </View>

          {canAct && !actionConfirmed && (
            <View style={styles.actionCard}>
              <Text style={styles.actionTitle}>
                {myRole.id === 'mafia' && '🕶️ Choose who to eliminate'}
                {myRole.id === 'detective' && '🕵️ Choose who to investigate'}
                {myRole.id === 'doctor' && '⚕️ Choose who to protect'}
              </Text>

              <ScrollView style={styles.playerList}>
                {eligibleTargets.map((player) => (
                  <TouchableOpacity
                    key={player.playerId}
                    style={[
                      styles.playerCard,
                      selectedTarget === player.playerId && styles.playerCardSelected
                    ]}
                    onPress={() => setSelectedTarget(player.playerId)}
                  >
                    <Text style={styles.playerCardName}>{player.name}</Text>
                    {selectedTarget === player.playerId && (
                      <Text style={styles.checkMark}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  !selectedTarget && styles.disabledButton
                ]}
                onPress={submitNightAction}
                disabled={!selectedTarget}
              >
                <Text style={styles.buttonText}>Confirm Action</Text>
              </TouchableOpacity>
            </View>
          )}

          {canAct && actionConfirmed && (
            <View style={styles.confirmedCard}>
              <Text style={styles.confirmedText}>✓ Action Confirmed</Text>
              <Text style={styles.confirmedSubtext}>Waiting for other players...</Text>
            </View>
          )}

          {!canAct && amAlive && (
            <View style={styles.infoCard}>
              <Text style={styles.infoText}>
                👨‍🌾 As a Villager, you have no night action. Rest well!
              </Text>
            </View>
          )}

          {!amAlive && (
            <View style={styles.deadCard}>
              <Text style={styles.deadText}>💀 You have been eliminated</Text>
              <Text style={styles.deadSubtext}>Watch as the game continues...</Text>
            </View>
          )}

          {amHost && (
            <TouchableOpacity
              style={[styles.hostButton, styles.processButton]}
              onPress={processNight}
            >
              <Text style={styles.buttonText}>⏭️ Process Night & Continue</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.leaveButton} onPress={leaveGame}>
            <Text style={styles.leaveButtonText}>Leave Game</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // Day Phase
  if (phase === 'day') {
    return (
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>☀️ Day {round}</Text>
            <Text style={styles.subtitle}>Discuss and find the Mafia</Text>
          </View>

          <View style={styles.playersCard}>
            <Text style={styles.cardTitle}>Players</Text>
            {players.map((player) => (
              <View
                key={player.playerId}
                style={[
                  styles.playerItem,
                  !player.alive && styles.playerItemDead
                ]}
              >
                <Text style={styles.playerItemName}>
                  {player.name}
                  {player.playerId === playerId && " (You)"}
                </Text>
                {!player.alive && <Text style={styles.deadBadge}>💀</Text>}
              </View>
            ))}
          </View>

          {amHost && (
            <TouchableOpacity
              style={[styles.hostButton, styles.processButton]}
              onPress={startVoting}
            >
              <Text style={styles.buttonText}>🗳️ Start Voting</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.leaveButton} onPress={leaveGame}>
            <Text style={styles.leaveButtonText}>Leave Game</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // Voting Phase
  if (phase === 'voting') {
    const alivePlayers = players.filter(p => p.alive && p.playerId !== playerId);

    return (
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>🗳️ Voting</Text>
            <Text style={styles.subtitle}>Choose who to eliminate</Text>
            {voteProgress.total > 0 && (
              <Text style={styles.voteProgress}>
                {voteProgress.current} / {voteProgress.total} votes cast
              </Text>
            )}
          </View>

          {amAlive && !actionConfirmed && (
            <View style={styles.actionCard}>
              <Text style={styles.actionTitle}>Cast Your Vote</Text>

              <ScrollView style={styles.playerList}>
                {alivePlayers.map((player) => (
                  <TouchableOpacity
                    key={player.playerId}
                    style={[
                      styles.playerCard,
                      selectedTarget === player.playerId && styles.playerCardSelected
                    ]}
                    onPress={() => setSelectedTarget(player.playerId)}
                  >
                    <Text style={styles.playerCardName}>{player.name}</Text>
                    {selectedTarget === player.playerId && (
                      <Text style={styles.checkMark}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  !selectedTarget && styles.disabledButton
                ]}
                onPress={castVote}
                disabled={!selectedTarget}
              >
                <Text style={styles.buttonText}>Cast Vote</Text>
              </TouchableOpacity>
            </View>
          )}

          {amAlive && actionConfirmed && (
            <View style={styles.confirmedCard}>
              <Text style={styles.confirmedText}>✓ Vote Cast</Text>
              <Text style={styles.confirmedSubtext}>Waiting for other players...</Text>
            </View>
          )}

          {!amAlive && (
            <View style={styles.deadCard}>
              <Text style={styles.deadText}>💀 You have been eliminated</Text>
              <Text style={styles.deadSubtext}>Watch as the game continues...</Text>
            </View>
          )}

          {amHost && (
            <TouchableOpacity
              style={[styles.hostButton, styles.processButton]}
              onPress={processVotes}
            >
              <Text style={styles.buttonText}>⏭️ Process Votes & Continue</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.leaveButton} onPress={leaveGame}>
            <Text style={styles.leaveButtonText}>Leave Game</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // Game Over Phase
  if (phase === 'gameOver' || status === 'finished') {
    return (
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          <Text style={styles.title}>Game Over</Text>
          <Text style={styles.subtitle}>
            {winner === 'town' ? "🎉 Town Wins!" : "👿 Mafia Wins!"}
          </Text>

          <View style={styles.gameOverCard}>
            <Text style={styles.gameOverTitle}>
              {winner === 'town' 
                ? "All Mafia members have been eliminated!" 
                : "The Mafia has taken over the town!"}
            </Text>
            
            <View style={styles.gameOverStats}>
              <Text style={styles.gameOverStatsTitle}>Final Stats</Text>
              <Text style={styles.gameOverStatsText}>
                Rounds Played: {round}
              </Text>
              <Text style={styles.gameOverStatsText}>
                Players Eliminated: {players.filter(p => !p.alive).length}
              </Text>
            </View>
          </View>

          <View style={styles.finalPlayersCard}>
            <Text style={styles.finalPlayersTitle}>Final Player Roster</Text>
            {players.map((player) => (
              <View
                key={player.playerId}
                style={[
                  styles.finalPlayerItem,
                  !player.alive && styles.finalPlayerItemDead
                ]}
              >
                <Text style={styles.finalPlayerEmoji}>{player.role?.emoji || "❓"}</Text>
                <View style={styles.finalPlayerInfo}>
                  <Text style={styles.finalPlayerName}>
                    {player.name}
                    {player.playerId === playerId && " (You)"}
                  </Text>
                  <Text style={styles.finalPlayerRole}>
                    {player.role?.name || "Unknown"} • {player.role?.team === "mafia" ? "Mafia Team" : "Town Team"}
                  </Text>
                </View>
                <Text style={styles.finalPlayerStatus}>
                  {player.alive ? "✅" : "💀"}
                </Text>
              </View>
            ))}
          </View>

          {amHost && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={returnToLobby}
            >
              <Text style={styles.buttonText}>🎮 Back to Lobby</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.replace("/")}
          >
            <Text style={styles.buttonText}>Return to Menu</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // Default loading
  return (
    <View style={styles.container}>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4ecdc4" />
        <Text style={styles.loadingText}>Loading game state...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1 },
  container: { flex: 1, padding: 24, backgroundColor: "#0b132b", minHeight: "100%" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { color: "#fff", fontSize: 18, marginTop: 16 },
  header: { marginBottom: 24, alignItems: "center" },
  title: { color: "#fff", fontSize: 32, fontWeight: "800", textAlign: "center", marginBottom: 8 },
  subtitle: { color: "#bcd", fontSize: 16, textAlign: "center", marginBottom: 8 },
  voteProgress: { color: "#4ecdc4", fontSize: 14, marginTop: 8 },
  roleRevealContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  roleEmoji: { fontSize: 80, marginBottom: 20 },
  roleTitle: { color: "#bcd", fontSize: 20, marginBottom: 8 },
  roleName: { color: "#fff", fontSize: 36, fontWeight: "800", marginBottom: 16 },
  roleDescription: { color: "#89a", fontSize: 16, textAlign: "center", lineHeight: 24, marginTop: 16, paddingHorizontal: 20 },
  separator: { width: "80%", height: 1, backgroundColor: "#2d3a5e", marginVertical: 16 },
  waitingContainer: { marginTop: 32, padding: 20, backgroundColor: "#1c2541", borderRadius: 12 },
  waitingText: { color: "#ccc", fontSize: 16, textAlign: "center" },
  actionCard: { backgroundColor: "#1c2541", borderRadius: 16, padding: 20, marginBottom: 16 },
  actionTitle: { color: "#4ecdc4", fontSize: 20, fontWeight: "700", marginBottom: 16, textAlign: "center" },
  playerList: { maxHeight: 300, marginBottom: 16 },
  playerCard: { backgroundColor: "#2d3a5e", borderRadius: 12, padding: 16, marginBottom: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 2, borderColor: "transparent" },
  playerCardSelected: { borderColor: "#4CAF50", backgroundColor: "rgba(76, 175, 80, 0.2)" },
  playerCardName: { color: "#fff", fontSize: 18, fontWeight: "600" },
  checkMark: { color: "#4CAF50", fontSize: 28, fontWeight: "bold" },
  confirmedCard: { backgroundColor: "rgba(76, 175, 80, 0.2)", borderRadius: 12, padding: 24, marginBottom: 16, alignItems: "center" },
  confirmedText: { color: "#4CAF50", fontSize: 24, fontWeight: "700", marginBottom: 8 },
  confirmedSubtext: { color: "#89a", fontSize: 16 },
  infoCard: { backgroundColor: "#1c2541", borderRadius: 12, padding: 20, marginBottom: 16 },
  infoText: { color: "#fff", fontSize: 16, textAlign: "center", lineHeight: 24 },
  deadCard: { backgroundColor: "rgba(230, 57, 70, 0.2)", borderRadius: 12, padding: 24, marginBottom: 16, alignItems: "center" },
  deadText: { color: "#e63946", fontSize: 24, fontWeight: "700", marginBottom: 8 },
  deadSubtext: { color: "#89a", fontSize: 16 },
  playersCard: { backgroundColor: "#1c2541", borderRadius: 16, padding: 20, marginBottom: 16 },
  cardTitle: { color: "#fff", fontSize: 20, fontWeight: "700", marginBottom: 12 },
  playerItem: { backgroundColor: "#2d3a5e", borderRadius: 12, padding: 16, marginBottom: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  playerItemDead: { opacity: 0.5 },
  playerItemName: { color: "#fff", fontSize: 16, fontWeight: "600" },
  deadBadge: { fontSize: 20 },
  primaryButton: { backgroundColor: "#e63946", paddingVertical: 16, borderRadius: 12, alignItems: "center", marginTop: 8 },
  secondaryButton: { backgroundColor: "#457b9d", paddingVertical: 16, borderRadius: 12, alignItems: "center", marginTop: 12 },
  hostButton: { backgroundColor: "#4CAF50", paddingVertical: 16, borderRadius: 12, alignItems: "center", marginTop: 16 },
  processButton: { marginTop: 24 },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  disabledButton: { opacity: 0.5 },
  leaveButton: { backgroundColor: "rgba(255, 255, 255, 0.1)", paddingVertical: 12, borderRadius: 12, alignItems: "center", marginTop: 24 },
  leaveButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  gameOverCard: { backgroundColor: "#1c2541", borderRadius: 16, padding: 24, marginBottom: 20, borderWidth: 1, borderColor: "#2d3a5e" },
  gameOverTitle: { color: "#fff", fontSize: 20, fontWeight: "700", textAlign: "center", lineHeight: 28, marginBottom: 20 },
  gameOverStats: { alignItems: "center" },
  gameOverStatsTitle: { color: "#4ecdc4", fontSize: 18, fontWeight: "700", marginBottom: 12 },
  gameOverStatsText: { color: "#89a", fontSize: 16, marginBottom: 8 },
  finalPlayersCard: { backgroundColor: "#1c2541", borderRadius: 16, padding: 24, marginBottom: 20, borderWidth: 1, borderColor: "#2d3a5e" },
  finalPlayersTitle: { color: "#fff", fontSize: 20, fontWeight: "700", marginBottom: 16, textAlign: "center" },
  finalPlayerItem: { flexDirection: "row", alignItems: "center", backgroundColor: "#2d3a5e", borderRadius: 12, padding: 16, marginBottom: 8 },
  finalPlayerItemDead: { opacity: 0.6 },
  finalPlayerEmoji: { fontSize: 32, marginRight: 12 },
  finalPlayerInfo: { flex: 1 },
  finalPlayerName: { color: "#fff", fontSize: 18, fontWeight: "600", marginBottom: 4 },
  finalPlayerRole: { color: "#89a", fontSize: 14 },
  finalPlayerStatus: { fontSize: 24 },
});