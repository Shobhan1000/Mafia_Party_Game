import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import socket from "../../socket";

const { width, height } = Dimensions.get('window');

// Role information with emojis (you can replace with actual images)
const ROLE_INFO = {
  Mafia: {
    title: "Mafia",
    emoji: "👤",
    color: "#DC143C", // Crimson red
    description: "You work with other Mafia members to eliminate villagers at night.",
    nightAction: "Choose a victim to kill",
    winCondition: "Mafia win when they equal or outnumber villagers."
  },
  Detective: {
    title: "Detective",
    emoji: "🕵️",
    color: "#4169E1", // Royal blue
    description: "Each night, you can investigate one player to learn their allegiance.",
    nightAction: "Investigate a player",
    winCondition: "Villagers win when all Mafia are eliminated."
  },
  Doctor: {
    title: "Doctor",
    emoji: "⚕️",
    color: "#32CD32", // Lime green
    description: "Each night, you can save one player from being killed by the Mafia.",
    nightAction: "Protect a player",
    winCondition: "Villagers win when all Mafia are eliminated."
  },
  Villager: {
    title: "Villager",
    emoji: "👨‍🌾",
    color: "#FFD700", // Gold
    description: "You have no special abilities. Use your vote wisely during the day.",
    nightAction: "No night action - sleep tight!",
    winCondition: "Villagers win when all Mafia are eliminated."
  }
};

export default function GameScreen() {
  const { roomId = "" } = useLocalSearchParams();
  const router = useRouter();
  
  const [phase, setPhase] = useState("waiting");
  const [players, setPlayers] = useState({});
  const [role, setRole] = useState(null);
  const [roleInfo, setRoleInfo] = useState(null);
  const [showRoleReveal, setShowRoleReveal] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [alive, setAlive] = useState(true);
  const [timer, setTimer] = useState(60);
  const [eliminatedMsg, setEliminatedMsg] = useState("");
  const [votes, setVotes] = useState({});
  const [playerId, setPlayerId] = useState(null);
  const [fadeAnim] = useState(new Animated.Value(0));

  // Load playerId
  useEffect(() => {
    AsyncStorage.getItem("playerId").then(stored => {
      if (stored) setPlayerId(stored);
    });
  }, []);

  // Role reveal animation
  useEffect(() => {
    if (showRoleReveal) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.delay(4000),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        })
      ]).start(() => {
        setShowRoleReveal(false);
      });
    }
  }, [showRoleReveal]);

  // Countdown timer for role reveal
  useEffect(() => {
    let interval;
    if (showRoleReveal && countdown > 0) {
      interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showRoleReveal, countdown]);

  // Socket listeners
  useEffect(() => {
    const onConnect = () => {
      if (playerId) {
        socket.emit("reconnectToRoom", { 
          roomId: String(roomId).toUpperCase(), 
          playerId 
        });
      }
    };
    
    if (socket.connected) onConnect();
    socket.on("connect", onConnect);

    // Game is starting - reset states
    const onGameStarting = () => {
      console.log("Game starting...");
      setPhase("roleReveal");
      setShowRoleReveal(false);
      setCountdown(5);
    };
    socket.on("gameStarting", onGameStarting);

    // Role assigned
    const onRoleAssigned = ({ role: assignedRole, roleImage, roleDescription }) => {
      console.log("Role assigned:", assignedRole);
      setRole(assignedRole);
      setRoleInfo(ROLE_INFO[assignedRole] || ROLE_INFO.Villager);
      setShowRoleReveal(true);
      setCountdown(5);
      setAlive(true);
    };
    socket.on("roleAssigned", onRoleAssigned);

    // Night begins
    const onNightBegins = () => {
      console.log("Night begins");
      setPhase("night");
      setTimer(60);
      setVotes({});
      setEliminatedMsg("");
    };
    socket.on("nightBegins", onNightBegins);

    // Day begins
    const onDayBegins = ({ players: playersData }) => {
      console.log("Day begins");
      setPhase("day");
      setTimer(90);
      setPlayers(playersData || {});
      setVotes({});
    };
    socket.on("dayBegins", onDayBegins);

    // Game over
    const onGameOver = ({ winner }) => {
      console.log("Game over, winner:", winner);
      setPhase("gameOver");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    };
    socket.on("gameOver", onGameOver);

    // Lobby update
    const onLobbyUpdate = ({ players: playersData }) => {
      setPlayers(playersData || {});
    };
    socket.on("lobbyUpdate", onLobbyUpdate);

    // Player eliminated
    const onPlayerEliminated = ({ playerId: eliminatedId, name, role: eliminatedRole }) => {
      if (eliminatedId === playerId) {
        setAlive(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      setEliminatedMsg(`${name} was eliminated. They were ${eliminatedRole}.`);
      setTimeout(() => setEliminatedMsg(""), 3000);
    };
    socket.on("playerEliminated", onPlayerEliminated);

    // Vote update
    const onVoteUpdate = ({ votes: voteData }) => {
      setVotes(voteData || {});
    };
    socket.on("voteUpdate", onVoteUpdate);

    // Reveal roles at game end
    const onRevealRoles = ({ roles }) => {
      console.log("Roles revealed:", roles);
    };
    socket.on("revealRoles", onRevealRoles);

    return () => {
      socket.off("connect", onConnect);
      socket.off("gameStarting", onGameStarting);
      socket.off("roleAssigned", onRoleAssigned);
      socket.off("nightBegins", onNightBegins);
      socket.off("dayBegins", onDayBegins);
      socket.off("gameOver", onGameOver);
      socket.off("lobbyUpdate", onLobbyUpdate);
      socket.off("playerEliminated", onPlayerEliminated);
      socket.off("voteUpdate", onVoteUpdate);
      socket.off("revealRoles", onRevealRoles);
    };
  }, [roomId, playerId]);

  // Game timer
  useEffect(() => {
    if (phase === "night" || phase === "day") {
      const interval = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [phase]);

  const alivePlayers = useMemo(() => {
    return Object.values(players || {}).filter(p => p.alive);
  }, [players]);

  const canActAtNight = alive && phase === "night" && role && role !== "Villager";

  const sendNightAction = (actionType, targetId) => {
    if (!canActAtNight) return;
    socket.emit("nightAction", { 
      roomId: String(roomId).toUpperCase(), 
      playerId, 
      actionType, 
      targetId 
    });
  };

  const sendVote = (targetId) => {
    if (!alive || phase !== "day") return;
    socket.emit("dayVote", { 
      roomId: String(roomId).toUpperCase(), 
      playerId, 
      targetId 
    });
  };

  // Role Reveal Modal
  const RoleRevealModal = () => (
    <Modal
      visible={showRoleReveal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowRoleReveal(false)}
    >
      <Animated.View style={[styles.roleRevealContainer, { opacity: fadeAnim }]}>
        <View style={[styles.roleCard, { backgroundColor: roleInfo?.color || '#1c2541' }]}>
          <Text style={styles.roleEmoji}>{roleInfo?.emoji || "❓"}</Text>
          <Text style={styles.roleTitle}>You are the</Text>
          <Text style={styles.roleName}>{roleInfo?.title || "Unknown"}</Text>
          
          <View style={styles.roleDescriptionBox}>
            <Text style={styles.roleDescription}>{roleInfo?.description}</Text>
            <Text style={styles.roleAction}>{roleInfo?.nightAction}</Text>
            <Text style={styles.roleWinCondition}>{roleInfo?.winCondition}</Text>
          </View>
          
          <View style={styles.countdownContainer}>
            <Text style={styles.countdownText}>Game starts in</Text>
            <Text style={styles.countdownNumber}>{countdown}</Text>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );

  // Render player row for night/day actions
  const renderPlayerRow = ({ item: playerId }) => {
    const player = players[playerId];
    if (!player) return null;

    const isMe = playerId === playerId;
    const voteCount = votes[playerId] || 0;

    // Night phase actions
    if (phase === "night" && alive && !isMe && player.alive) {
      if (role === "Mafia") {
        return (
          <View style={styles.playerItem} key={playerId}>
            <Text style={styles.playerName}>{player.name}</Text>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => sendNightAction("kill", playerId)}
            >
              <Text style={styles.actionButtonText}>🎯 Kill</Text>
            </TouchableOpacity>
          </View>
        );
      }
      if (role === "Doctor") {
        return (
          <View style={styles.playerItem} key={playerId}>
            <Text style={styles.playerName}>{player.name}</Text>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => sendNightAction("save", playerId)}
            >
              <Text style={styles.actionButtonText}>🛡️ Save</Text>
            </TouchableOpacity>
          </View>
        );
      }
      if (role === "Detective") {
        return (
          <View style={styles.playerItem} key={playerId}>
            <Text style={styles.playerName}>{player.name}</Text>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => sendNightAction("investigate", playerId)}
            >
              <Text style={styles.actionButtonText}>🔍 Investigate</Text>
            </TouchableOpacity>
          </View>
        );
      }
    }

    // Day phase voting
    if (phase === "day" && alive && !isMe && player.alive) {
      return (
        <View style={styles.playerItem} key={playerId}>
          <Text style={styles.playerName}>
            {player.name} • Votes: {voteCount}
          </Text>
          <TouchableOpacity 
            style={[styles.actionButton, styles.voteButton]}
            onPress={() => sendVote(playerId)}
          >
            <Text style={styles.actionButtonText}>🗳️ Vote</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Default display (dead players or spectators)
    return (
      <View style={[styles.playerItem, !player.alive && styles.deadPlayer]} key={playerId}>
        <Text style={[styles.playerName, !player.alive && styles.deadText]}>
          {player.name} {!player.alive && "💀"}
        </Text>
      </View>
    );
  };

  const exitToLobby = () => {
    router.replace({
      pathname: "/lobby/[roomId]",
      params: { roomId: String(roomId).toUpperCase() }
    });
  };

  return (
    <View style={styles.container}>
      <RoleRevealModal />
      
      {/* Game Header */}
      <View style={styles.header}>
        <View style={styles.phaseIndicator}>
          <Text style={styles.phaseText}>
            {phase === "night" ? "🌙 Night" : 
             phase === "day" ? "☀️ Day" : 
             phase === "gameOver" ? "🏁 Game Over" : 
             phase === "roleReveal" ? "🎭 Role Reveal" : 
             "⏳ Waiting"}
          </Text>
          {(phase === "night" || phase === "day") && (
            <Text style={styles.timer}>{timer}s</Text>
          )}
        </View>
        
        {role && (
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{role}</Text>
          </View>
        )}
      </View>

      {/* Elimination Message */}
      {eliminatedMsg ? (
        <View style={styles.eliminationBanner}>
          <Text style={styles.eliminationText}>{eliminatedMsg}</Text>
        </View>
      ) : null}

      {/* Game Over Screen */}
      {phase === "gameOver" ? (
        <View style={styles.gameOverContainer}>
          <Text style={styles.gameOverTitle}>Game Over!</Text>
          <TouchableOpacity 
            style={styles.returnButton}
            onPress={exitToLobby}
          >
            <Text style={styles.returnButtonText}>Return to Lobby</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* Player List */
        <FlatList
          data={Object.keys(players)}
          keyExtractor={(id) => id}
          renderItem={renderPlayerRow}
          contentContainerStyle={styles.playerList}
          ListEmptyComponent={
            <Text style={styles.emptyList}>Waiting for players...</Text>
          }
        />
      )}

      {/* Status Bar */}
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          {alive ? "❤️ Alive" : "💀 Eliminated"} • {phase === "night" ? "Choose your action" : phase === "day" ? "Vote to eliminate" : ""}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b132b",
  },
  // Role Reveal Styles
  roleRevealContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  roleCard: {
    width: width * 0.85,
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  roleEmoji: {
    fontSize: 100,
    marginBottom: 20,
  },
  roleTitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 18,
    marginBottom: 5,
  },
  roleName: {
    color: '#fff',
    fontSize: 42,
    fontWeight: 'bold',
    marginBottom: 30,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 5,
  },
  roleDescriptionBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 15,
    padding: 20,
    width: '100%',
    marginBottom: 30,
  },
  roleDescription: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 22,
  },
  roleAction: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  roleWinCondition: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  countdownContainer: {
    alignItems: 'center',
  },
  countdownText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    marginBottom: 5,
  },
  countdownNumber: {
    color: '#fff',
    fontSize: 48,
    fontWeight: 'bold',
  },
  // Game Screen Styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#1c2541',
  },
  phaseIndicator: {
    alignItems: 'center',
  },
  phaseText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  timer: {
    color: '#FFD700',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 5,
  },
  roleBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  roleBadgeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  eliminationBanner: {
    backgroundColor: 'rgba(220, 20, 60, 0.3)',
    padding: 15,
    marginHorizontal: 20,
    marginVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DC143C',
  },
  eliminationText: {
    color: '#FF6B6B',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  playerList: {
    padding: 20,
    paddingBottom: 100,
  },
  playerItem: {
    backgroundColor: '#1c2541',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deadPlayer: {
    backgroundColor: 'rgba(44, 62, 80, 0.5)',
    opacity: 0.7,
  },
  playerName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  deadText: {
    color: '#95a5a6',
    textDecorationLine: 'line-through',
  },
  actionButton: {
    backgroundColor: '#e63946',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  voteButton: {
    backgroundColor: '#4169E1',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyList: {
    color: '#666',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 50,
  },
  gameOverContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  gameOverTitle: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  returnButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
  },
  returnButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(28, 37, 65, 0.9)',
    padding: 15,
    alignItems: 'center',
  },
  statusText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});