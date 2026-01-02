import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import socket from "../../socket";

const { width, height } = Dimensions.get('window');

const ROLE_INFO = {
  Mafia: {
    title: "Mafia",
    emoji: "🕶️",
    color: "#DC143C",
    description: "You work with other Mafia members to eliminate villagers at night.",
    nightAction: "Choose a victim to kill",
    winCondition: "Mafia win when they equal or outnumber villagers."
  },
  Detective: {
    title: "Detective",
    emoji: "🕵️",
    color: "#4169E1",
    description: "Each night, you can investigate one player to learn their allegiance.",
    nightAction: "Investigate a player",
    winCondition: "Villagers win when all Mafia are eliminated."
  },
  Doctor: {
    title: "Doctor",
    emoji: "⚕️",
    color: "#32CD32",
    description: "Each night, you can save one player from being killed by the Mafia.",
    nightAction: "Protect a player",
    winCondition: "Villagers win when all Mafia are eliminated."
  },
  Villager: {
    title: "Villager",
    emoji: "👨‍🌾",
    color: "#FFD700",
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
  const [gameLog, setGameLog] = useState([]);
  const [showGameLog, setShowGameLog] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [mafiaChat, setMafiaChat] = useState([]);
  const [mafiaMembers, setMafiaMembers] = useState([]);
  const [actionSubmitted, setActionSubmitted] = useState(false);
  const [investigationResults, setInvestigationResults] = useState([]);
  const [winner, setWinner] = useState(null);
  const [myVote, setMyVote] = useState(null);
  
  const scrollViewRef = useRef(null);
  const chatScrollRef = useRef(null);

  useEffect(() => {
    AsyncStorage.getItem("playerId").then(stored => {
      if (stored) setPlayerId(stored);
    });
  }, []);

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

    const onGameStarting = () => {
      console.log("Game starting...");
      setPhase("roleReveal");
      setShowRoleReveal(false);
      setCountdown(5);
      addToGameLog("🎮 Game is starting!");
    };
    socket.on("gameStarting", onGameStarting);

    const onRoleAssigned = ({ role: assignedRole, mafiaMembers: mafiaMembersList }) => {
      console.log("Role assigned:", assignedRole);
      setRole(assignedRole);
      setRoleInfo(ROLE_INFO[assignedRole] || ROLE_INFO.Villager);
      setShowRoleReveal(true);
      setCountdown(5);
      setAlive(true);
      addToGameLog(`🎭 You are the ${assignedRole}!`);
      
      if (assignedRole === "Mafia" && mafiaMembersList) {
        setMafiaMembers(mafiaMembersList);
        addToGameLog(`🤝 Your Mafia teammates: ${mafiaMembersList.filter(m => m.playerId !== playerId).map(m => m.name).join(", ")}`);
      }
    };
    socket.on("roleAssigned", onRoleAssigned);

    const onNightBegins = () => {
      console.log("Night begins");
      setPhase("night");
      setTimer(60);
      setVotes({});
      setMyVote(null);
      setActionSubmitted(false);
      setEliminatedMsg("");
      addToGameLog("🌙 Night falls. Special roles, make your moves...");
    };
    socket.on("nightBegins", onNightBegins);

    const onDayBegins = ({ players: playersData }) => {
      console.log("Day begins");
      setPhase("day");
      setTimer(90);
      setPlayers(playersData || {});
      setVotes({});
      setMyVote(null);
      setActionSubmitted(false);
      addToGameLog("☀️ Day breaks. Time to discuss and vote!");
    };
    socket.on("dayBegins", onDayBegins);

    const onGameOver = ({ winner: gameWinner, finalRoles }) => {
      console.log("Game over, winner:", gameWinner);
      setPhase("gameOver");
      setWinner(gameWinner);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      addToGameLog(`🏁 Game Over! ${gameWinner} wins!`);
      
      if (finalRoles) {
        const rolesList = Object.entries(finalRoles)
          .map(([pid, r]) => {
            const p = players[pid];
            return p ? `${p.name}: ${r}` : null;
          })
          .filter(Boolean)
          .join(", ");
        addToGameLog(`👥 Final roles: ${rolesList}`);
      }
    };
    socket.on("gameOver", onGameOver);

    const onLobbyUpdate = ({ players: playersData }) => {
      setPlayers(playersData || {});
    };
    socket.on("lobbyUpdate", onLobbyUpdate);

    const onPlayerEliminated = ({ playerId: eliminatedId, name, role: eliminatedRole }) => {
      if (eliminatedId === playerId) {
        setAlive(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        addToGameLog(`💀 You were eliminated! You were ${eliminatedRole}.`);
      }
      setEliminatedMsg(`${name} was eliminated. They were ${eliminatedRole}.`);
      addToGameLog(`⚰️ ${name} was eliminated. They were ${eliminatedRole}.`);
      setTimeout(() => setEliminatedMsg(""), 3000);
    };
    socket.on("playerEliminated", onPlayerEliminated);

    const onVoteUpdate = ({ votes: voteData }) => {
      setVotes(voteData || {});
    };
    socket.on("voteUpdate", onVoteUpdate);

    const onRevealRoles = ({ roles }) => {
      console.log("Roles revealed:", roles);
    };
    socket.on("revealRoles", onRevealRoles);

    const onInvestigationResult = ({ targetId, targetName, isMafia }) => {
      const result = `🔍 Investigation: ${targetName} is ${isMafia ? "🕶️ MAFIA" : "✅ INNOCENT"}`;
      setInvestigationResults(prev => [...prev, result]);
      addToGameLog(result);
      Alert.alert("Investigation Result", result);
    };
    socket.on("investigationResult", onInvestigationResult);

    const onActionConfirmed = ({ actionType }) => {
      setActionSubmitted(true);
      const actionMessages = {
        kill: "🎯 Kill order submitted",
        save: "🛡️ Protection submitted",
        investigate: "🔍 Investigation submitted"
      };
      addToGameLog(actionMessages[actionType] || "✓ Action submitted");
    };
    socket.on("actionConfirmed", onActionConfirmed);

    const onDayChatMessage = ({ playerId: senderId, name: senderName, message, timestamp }) => {
      setChatMessages(prev => [...prev, { 
        senderId, 
        senderName, 
        message, 
        timestamp: timestamp || Date.now() 
      }]);
    };
    socket.on("dayChatMessage", onDayChatMessage);

    const onMafiaChatMessage = ({ playerId: senderId, name: senderName, message, timestamp }) => {
      setMafiaChat(prev => [...prev, { 
        senderId, 
        senderName, 
        message, 
        timestamp: timestamp || Date.now() 
      }]);
    };
    socket.on("mafiaChatMessage", onMafiaChatMessage);

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
      socket.off("investigationResult", onInvestigationResult);
      socket.off("actionConfirmed", onActionConfirmed);
      socket.off("dayChatMessage", onDayChatMessage);
      socket.off("mafiaChatMessage", onMafiaChatMessage);
    };
  }, [roomId, playerId, players]);

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

  const addToGameLog = (message) => {
    setGameLog(prev => [...prev, { 
      message, 
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
  };

  const alivePlayers = useMemo(() => {
    return Object.values(players || {}).filter(p => p.alive);
  }, [players]);

  const canActAtNight = alive && phase === "night" && role && role !== "Villager" && !actionSubmitted;

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
    
    setMyVote(targetId);
    socket.emit("dayVote", { 
      roomId: String(roomId).toUpperCase(), 
      playerId, 
      targetId 
    });
    
    const target = players[targetId];
    if (target) {
      addToGameLog(`🗳️ You voted for ${target.name}`);
    }
  };

  const sendChatMessage = () => {
    if (!chatInput.trim() || !playerId || phase !== "day" || !alive) return;
    
    socket.emit("dayChatMessage", {
      roomId: String(roomId).toUpperCase(),
      playerId,
      message: chatInput.trim()
    });
    
    setChatInput("");
  };

  const sendMafiaChat = () => {
    if (!chatInput.trim() || !playerId || role !== "Mafia" || phase !== "night") return;
    
    socket.emit("mafiaChatMessage", {
      roomId: String(roomId).toUpperCase(),
      playerId,
      message: chatInput.trim()
    });
    
    setChatInput("");
  };

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

  const GameLogModal = () => (
    <Modal
      visible={showGameLog}
      transparent
      animationType="slide"
      onRequestClose={() => setShowGameLog(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.gameLogModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Game Log</Text>
            <TouchableOpacity onPress={() => setShowGameLog(false)}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.gameLogScroll} ref={scrollViewRef}>
            {gameLog.length === 0 ? (
              <Text style={styles.emptyLogText}>No events yet</Text>
            ) : (
              gameLog.map((log, index) => (
                <View key={index} style={styles.logEntry}>
                  <Text style={styles.logTimestamp}>{log.timestamp}</Text>
                  <Text style={styles.logMessage}>{log.message}</Text>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const ChatModal = () => (
    <Modal
      visible={showChat}
      transparent
      animationType="slide"
      onRequestClose={() => setShowChat(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.chatModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {phase === "night" && role === "Mafia" ? "🕶️ Mafia Chat" : "💬 Day Chat"}
            </Text>
            <TouchableOpacity onPress={() => setShowChat(false)}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.chatMessages} ref={chatScrollRef}>
            {(phase === "night" && role === "Mafia" ? mafiaChat : chatMessages).length === 0 ? (
              <Text style={styles.noChatText}>
                {phase === "night" && role === "Mafia" 
                  ? "Coordinate with your team..." 
                  : "Start the discussion!"}
              </Text>
            ) : (
              (phase === "night" && role === "Mafia" ? mafiaChat : chatMessages).map((msg, index) => (
                <View key={index} style={[
                  styles.chatBubble,
                  msg.senderId === playerId && styles.myChatBubble
                ]}>
                  <Text style={styles.chatSender}>{msg.senderName}</Text>
                  <Text style={styles.chatMessage}>{msg.message}</Text>
                </View>
              ))
            )}
          </ScrollView>
          
          {((phase === "day" && alive) || (phase === "night" && role === "Mafia" && alive)) && (
            <View style={styles.chatInputContainer}>
              <TextInput
                style={styles.chatInput}
                value={chatInput}
                onChangeText={setChatInput}
                placeholder="Type a message..."
                placeholderTextColor="#666"
                multiline
                maxLength={200}
              />
              <TouchableOpacity 
                style={styles.sendButton}
                onPress={phase === "night" ? sendMafiaChat : sendChatMessage}
                disabled={!chatInput.trim()}
              >
                <Ionicons name="send" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );

  const renderPlayerRow = ({ item: targetPlayerId }) => {
    const player = players[targetPlayerId];
    if (!player) return null;

    const isMe = targetPlayerId === playerId;
    const voteCount = votes[targetPlayerId] || 0;
    const hasVotedForThis = myVote === targetPlayerId;

    if (phase === "night" && alive && !isMe && player.alive && !actionSubmitted) {
      if (role === "Mafia") {
        return (
          <View style={styles.playerItem} key={targetPlayerId}>
            <Text style={styles.playerName}>{player.name}</Text>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => sendNightAction("kill", targetPlayerId)}
            >
              <Text style={styles.actionButtonText}>🎯 Kill</Text>
            </TouchableOpacity>
          </View>
        );
      }
      if (role === "Doctor") {
        return (
          <View style={styles.playerItem} key={targetPlayerId}>
            <Text style={styles.playerName}>{player.name}</Text>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => sendNightAction("save", targetPlayerId)}
            >
              <Text style={styles.actionButtonText}>🛡️ Save</Text>
            </TouchableOpacity>
          </View>
        );
      }
      if (role === "Detective") {
        return (
          <View style={styles.playerItem} key={targetPlayerId}>
            <Text style={styles.playerName}>{player.name}</Text>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => sendNightAction("investigate", targetPlayerId)}
            >
              <Text style={styles.actionButtonText}>🔍 Investigate</Text>
            </TouchableOpacity>
          </View>
        );
      }
    }

    if (phase === "day" && alive && !isMe && player.alive) {
      return (
        <View style={styles.playerItem} key={targetPlayerId}>
          <View style={styles.playerVoteInfo}>
            <Text style={styles.playerName}>{player.name}</Text>
            <Text style={styles.voteCountText}>Votes: {voteCount}</Text>
          </View>
          <TouchableOpacity 
            style={[
              styles.actionButton, 
              styles.voteButton,
              hasVotedForThis && styles.votedButton
            ]}
            onPress={() => sendVote(targetPlayerId)}
          >
            <Text style={styles.actionButtonText}>
              {hasVotedForThis ? "✓ Voted" : "🗳️ Vote"}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={[styles.playerItem, !player.alive && styles.deadPlayer]} key={targetPlayerId}>
        <Text style={[styles.playerName, !player.alive && styles.deadText]}>
          {player.name} {!player.alive && "💀"} {isMe && "(You)"}
        </Text>
      </View>
    );
  };

  const exitToLobby = () => {
    router.replace({
      pathname: "/lobby/[roomId]",
      params: { roomId: String(roomId).toUpperCase(), name: players[playerId]?.name || "Player" }
    });
  };

  return (
    <View style={styles.container}>
      <RoleRevealModal />
      <GameLogModal />
      <ChatModal />
      
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
        
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={() => setShowGameLog(true)} style={styles.iconButton}>
            <Ionicons name="list" size={24} color="#fff" />
          </TouchableOpacity>
          
          {((phase === "day" && alive) || (phase === "night" && role === "Mafia" && alive)) && (
            <TouchableOpacity onPress={() => setShowChat(true)} style={styles.iconButton}>
              <Ionicons name="chatbubbles" size={24} color="#fff" />
              {(phase === "night" && role === "Mafia" ? mafiaChat : chatMessages).length > 0 && (
                <View style={styles.chatBadge}>
                  <Text style={styles.chatBadgeText}>
                    {(phase === "night" && role === "Mafia" ? mafiaChat : chatMessages).length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {eliminatedMsg ? (
        <View style={styles.eliminationBanner}>
          <Text style={styles.eliminationText}>{eliminatedMsg}</Text>
        </View>
      ) : null}

      {actionSubmitted && phase === "night" && (
        <View style={styles.actionConfirmedBanner}>
          <Text style={styles.actionConfirmedText}>✓ Action submitted! Waiting for others...</Text>
        </View>
      )}

      {phase === "gameOver" ? (
        <View style={styles.gameOverContainer}>
          <Text style={styles.gameOverTitle}>Game Over!</Text>
          <Text style={styles.winnerText}>
            {winner === "Mafia" ? "🕶️ Mafia" : "👨‍🌾 Villagers"} Win!
          </Text>
          <TouchableOpacity 
            style={styles.returnButton}
            onPress={exitToLobby}
          >
            <Text style={styles.returnButtonText}>Return to Lobby</Text>
          </TouchableOpacity>
        </View>
      ) : (
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

      <View style={styles.statusBar}>
        <View style={styles.statusLeft}>
          <Text style={styles.statusText}>
            {alive ? "❤️ Alive" : "💀 Eliminated"}
          </Text>
          {role && (
            <View style={[styles.roleBadge, { backgroundColor: roleInfo?.color }]}>
              <Text style={styles.roleBadgeText}>{role}</Text>
            </View>
          )}
        </View>
        
        <Text style={styles.statusHint}>
          {phase === "night" && canActAtNight ? "Choose your target" : 
           phase === "night" && actionSubmitted ? "Waiting..." :
           phase === "day" && alive ? "Discuss & Vote" : 
           phase === "day" && !alive ? "Spectating" : ""}
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
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    padding: 8,
    position: 'relative',
  },
  chatBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#e63946',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatBadgeText: {
    color: '#fff',
    fontSize: 10,
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
  actionConfirmedBanner: {
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
    padding: 15,
    marginHorizontal: 20,
    marginVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  actionConfirmedText: {
    color: '#4CAF50',
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
  playerVoteInfo: {
    flex: 1,
  },
  playerName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  voteCountText: {
    color: '#FFD700',
    fontSize: 14,
    marginTop: 4,
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
  votedButton: {
    backgroundColor: '#4CAF50',
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
    marginBottom: 20,
  },
  winnerText: {
    color: '#FFD700',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 40,
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
    backgroundColor: 'rgba(28, 37, 65, 0.95)',
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  statusHint: {
    color: '#bcd',
    fontSize: 14,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  gameLogModal: {
    backgroundColor: '#1c2541',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
  },
  chatModal: {
    backgroundColor: '#1c2541',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    height: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2d3a5e',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  gameLogScroll: {
    flex: 1,
    padding: 16,
  },
  emptyLogText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
  logEntry: {
    marginBottom: 12,
    backgroundColor: '#2d3a5e',
    borderRadius: 8,
    padding: 12,
  },
  logTimestamp: {
    color: '#888',
    fontSize: 12,
    marginBottom: 4,
  },
  logMessage: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
  },
  chatMessages: {
    flex: 1,
    padding: 16,
  },
  noChatText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
  chatBubble: {
    backgroundColor: '#2d3a5e',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    maxWidth: '80%',
    alignSelf: 'flex-start',
  },
  myChatBubble: {
    backgroundColor: '#457b9d',
    alignSelf: 'flex-end',
  },
  chatSender: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  chatMessage: {
    color: '#fff',
    fontSize: 16,
  },
  chatInputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#2d3a5e',
    alignItems: 'center',
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#2d3a5e',
    borderRadius: 12,
    padding: 12,
    color: '#fff',
    maxHeight: 80,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#4CAF50',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
});