import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import socket from "../../socket";

export default function LobbyScreen() {
  const { roomId = "", name = "" } = useLocalSearchParams();
  const router = useRouter();

  const [players, setPlayers] = useState({});
  const [ready, setReady] = useState(false);
  const [hostId, setHostId] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [roleSettings, setRoleSettings] = useState({
    mafiaCount: 1,
    detectiveCount: 1,
    doctorCount: 1,
    villagerCount: 1
  });
  const [showRoleSettings, setShowRoleSettings] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [showChat, setShowChat] = useState(false);
  
  // Use ref to track if listeners are attached
  const listenersAttached = useRef(false);

  const sortedPlayerList = useMemo(() => {
    const playerArray = Object.values(players || {});
    
    const uniquePlayers = {};
    playerArray.forEach(player => {
      if (player && player.playerId) {
        uniquePlayers[player.playerId] = player;
      }
    });
    
    const uniqueArray = Object.values(uniquePlayers);
    return uniqueArray.sort((a, b) => {
      if (a.playerId === hostId) return -1;
      if (b.playerId === hostId) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [players, hostId]);

  const amHost = hostId && playerId && hostId === playerId;
  const myPlayer = playerId ? players[playerId] : null;

  const everyoneReady = useMemo(() => {
    const arr = sortedPlayerList;
    return arr.length >= 3 && arr.every(p => !!p.ready);
  }, [sortedPlayerList]);

  const minPlayersMet = useMemo(() => sortedPlayerList.length >= 3, [sortedPlayerList]);

  const savePlayerId = async (id) => {
    try {
      await AsyncStorage.setItem("playerId", id);
      setPlayerId(id);
    } catch (e) {
      console.error("Failed to save playerId", e);
    }
  };

  const joinRoom = useCallback(() => {
    const rn = String(roomId || "").toUpperCase();
    const nm = String(name || "Player").trim() || "Player";
    
    console.log(`Attempting to join room: ${rn} as ${nm}`);

    const storedPlayerId = playerId || `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    socket.emit("createOrJoinRoom", { 
      roomId: rn, 
      name: nm, 
      playerId: storedPlayerId 
    }, (ack) => {
      console.log("Join response:", ack);
      if (ack?.success) {
        savePlayerId(ack.playerId);
        setHasJoined(true);
        setReady(false);
        if (ack.roleSettings) {
          setRoleSettings(ack.roleSettings);
        }
      } else {
        Alert.alert("Error", ack?.message || "Could not create or join room");
      }
    });
  }, [roomId, name, playerId]);

  const leaveLobby = () => {
    if (isLeaving) return;
    
    setIsLeaving(true);
    Alert.alert(
      "Leave Lobby",
      "Are you sure you want to leave the lobby?",
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => setIsLeaving(false)
        },
        {
          text: "Leave",
          style: "destructive",
          onPress: () => {
            if (playerId && hasJoined) {
              socket.emit("leaveLobby", { 
                roomId: String(roomId || "").toUpperCase(), 
                playerId 
              });
            }
            router.replace("/");
          }
        }
      ]
    );
  };

  const updateRoleSettings = (newSettings) => {
    if (!playerId || !amHost || !hasJoined) return;
    
    socket.emit("updateRoleSettings", {
      roomId: String(roomId).toUpperCase(),
      playerId,
      roleSettings: newSettings
    }, (response) => {
      if (response?.success) {
        setRoleSettings(response.roleSettings);
      } else {
        Alert.alert("Error", response?.message || "Failed to update role settings");
      }
    });
  };

  const calculateTotalRoles = () => {
    return roleSettings.mafiaCount + roleSettings.detectiveCount + roleSettings.doctorCount;
  };

  const hasEnoughPlayersForRoles = () => {
    const totalRoles = calculateTotalRoles();
    return sortedPlayerList.length >= totalRoles;
  };

  const sendChatMessage = () => {
    if (!chatInput.trim() || !playerId || !hasJoined) return;
    
    socket.emit("lobbyChatMessage", {
      roomId: String(roomId).toUpperCase(),
      playerId,
      message: chatInput.trim()
    });
    
    setChatInput("");
  };

  // Load playerId from storage on mount
  useEffect(() => {
    const init = async () => {
      const storedId = await AsyncStorage.getItem("playerId");
      if (storedId) {
        setPlayerId(storedId);
      }
    };
    init();
  }, []);

  // FIXED: Separate effect for socket connection and listeners
  useEffect(() => {
    if (!roomId || !name) return;

    // Define all socket event handlers
    const onConnect = () => {
      console.log("Socket connected, joining room...");
      setIsConnected(true);
      
      if (playerId) {
        socket.emit("reconnectToRoom", { 
          roomId: String(roomId).toUpperCase(), 
          playerId 
        }, (ack) => {
          console.log("Reconnect response:", ack);
          if (!ack?.success) {
            if (!hasJoined) {
              joinRoom();
            }
          } else {
            setHasJoined(true);
          }
        });
      } else if (!hasJoined) {
        joinRoom();
      }
    };

    const onDisconnect = () => {
      console.log("Socket disconnected");
      setIsConnected(false);
    };

    const onLobbyUpdate = ({ players: playersData, hostId: newHostId, roleSettings: newRoleSettings }) => {
      console.log("Lobby update received:", { playersData, newHostId, newRoleSettings });
      setPlayers(playersData || {});
      setHostId(newHostId || null);
      
      if (newRoleSettings) {
        setRoleSettings(newRoleSettings);
      }

      if (playerId && playersData && playersData[playerId]) {
        const myReadyStatus = !!playersData[playerId].ready;
        console.log("My ready status updated:", myReadyStatus);
        setReady(myReadyStatus);
      }
    };

    const onHostAssigned = ({ hostId: newHostId }) => {
      console.log("Host assigned:", newHostId);
      setHostId(newHostId || null);
    };

    const onError = (msg) => {
      console.log("Socket error:", msg);
      Alert.alert("Error", String(msg || "An error occurred"));
    };

    const onGameStarted = (data) => {
      console.log("Game started:", data);
      router.replace({ 
        pathname: "/game/[roomId]", 
        params: { 
          roomId: String(roomId).toUpperCase(),
          playerId: playerId 
        } 
      });
    };

    const onLobbyChatMessage = ({ playerId: senderId, name: senderName, message, timestamp }) => {
      setChatMessages(prev => [...prev, { 
        senderId, 
        senderName, 
        message, 
        timestamp: timestamp || Date.now() 
      }]);
    };

    // Attach listeners only once
    if (!listenersAttached.current) {
      console.log("Attaching socket listeners");
      socket.on("connect", onConnect);
      socket.on("disconnect", onDisconnect);
      socket.on("lobbyUpdate", onLobbyUpdate);
      socket.on("hostAssigned", onHostAssigned);
      socket.on("errorMsg", onError);
      socket.on("gameStarted", onGameStarted);
      socket.on("lobbyChatMessage", onLobbyChatMessage);
      listenersAttached.current = true;
    }

    // Connect if not connected
    if (!socket.connected) {
      console.log("Connecting socket...");
      socket.connect();
    } else {
      onConnect();
    }

    // Cleanup function
    return () => {
      console.log("Cleaning up socket listeners");
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("lobbyUpdate", onLobbyUpdate);
      socket.off("hostAssigned", onHostAssigned);
      socket.off("errorMsg", onError);
      socket.off("gameStarted", onGameStarted);
      socket.off("lobbyChatMessage", onLobbyChatMessage);
      listenersAttached.current = false;
      
      if (playerId && hasJoined) {
        socket.emit("leaveLobby", {
          roomId: String(roomId).toUpperCase(),
          playerId
        });
      }
    };
  }, [roomId, name, playerId, router]); // Removed hasJoined from dependencies

  const toggleReady = () => {
    if (!playerId || !hasJoined) return;
    
    const newReady = !ready;
    setReady(newReady);
    
    socket.emit("playerReady", {
      roomId: String(roomId).toUpperCase(),
      playerId,
      ready: newReady
    });
  };

  const startGame = () => {
    if (!playerId || !hasJoined || !amHost) return;
    
    if (!hasEnoughPlayersForRoles()) {
      const totalRoles = calculateTotalRoles();
      Alert.alert(
        "Not Enough Players",
        `You have ${sortedPlayerList.length} players but your role settings require at least ${totalRoles} players.`,
        [{ text: "OK" }]
      );
      return;
    }
    
    socket.emit("startGame", {
      roomId: String(roomId).toUpperCase(),
      playerId
    });
  };

  // Rest of your component code stays the same...
  const copyRoomCode = async () => {
    const code = String(roomId).toUpperCase();
    try {
      await Clipboard.setStringAsync(code);
      Alert.alert("Copied!", `Room code ${code} copied to clipboard`);
    } catch (error) {
      Alert.alert("Error", "Could not copy room code");
    }
  };

  if (!isConnected && !hasJoined) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.connectingView}>
          <ActivityIndicator size="large" color="#e63946" />
          <Text style={styles.connectingText}>Connecting...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={leaveLobby}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Room {String(roomId).toUpperCase()}</Text>
            <Text style={styles.headerSubtitle}>
              {sortedPlayerList.length} {sortedPlayerList.length === 1 ? "player" : "players"}
            </Text>
          </View>
          <TouchableOpacity style={styles.chatButton} onPress={() => setShowChat(true)}>
            <Ionicons name="chatbubbles" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Connection Status Indicator */}
        {!isConnected && (
          <View style={styles.connectionWarning}>
            <Ionicons name="warning" size={20} color="#FFA500" />
            <Text style={styles.connectionWarningText}>Reconnecting...</Text>
          </View>
        )}

        {/* Players List */}
        <View style={styles.playersContainer}>
          {sortedPlayerList.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Waiting for players...</Text>
            </View>
          ) : (
            <FlatList
              data={sortedPlayerList}
              keyExtractor={(item) => item.playerId}
              renderItem={({ item }) => {
                const isMe = item.playerId === playerId;
                const isHost = item.playerId === hostId;

                return (
                  <View
                    style={[
                      styles.playerItem,
                      isHost && styles.hostItem,
                      isMe && styles.meItem,
                    ]}
                  >
                    <View style={styles.playerRow}>
                      <View style={styles.playerInfo}>
                        <Text style={styles.playerName}>{item.name}</Text>
                        {isMe && <Text style={styles.youText}>(You)</Text>}
                        {isHost && (
                          <View style={styles.hostBadge}>
                            <Ionicons name="crown" size={14} color="#FFD700" />
                            <Text style={styles.hostText}>Host</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.rightSection}>
                        <View
                          style={[
                            styles.statusIndicator,
                            { backgroundColor: item.ready ? "#4CAF50" : "#666" },
                          ]}
                        >
                          <Text style={styles.statusText}>
                            {item.ready ? "READY" : "NOT READY"}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              }}
              contentContainerStyle={styles.playerList}
            />
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {amHost && (
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => setShowRoleSettings(true)}
            >
              <Ionicons name="settings-outline" size={20} color="#fff" />
              <Text style={styles.settingsButtonText}>Role Settings</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.readyButton, ready && styles.readyButtonActive]}
            onPress={toggleReady}
            disabled={!hasJoined}
          >
            <Ionicons
              name={ready ? "checkmark-circle" : "radio-button-off"}
              size={24}
              color="#fff"
            />
            <Text style={styles.readyButtonText}>
              {ready ? "Ready!" : "Not Ready"}
            </Text>
          </TouchableOpacity>

          {amHost ? (
            <TouchableOpacity
              style={[
                styles.startButton,
                everyoneReady && minPlayersMet && hasEnoughPlayersForRoles()
                  ? styles.startButtonEnabled
                  : styles.startButtonDisabled,
              ]}
              onPress={startGame}
              disabled={!everyoneReady || !minPlayersMet || !hasEnoughPlayersForRoles()}
            >
              <Text style={styles.startButtonText}>
                {!minPlayersMet
                  ? "Need at least 3 players"
                  : !hasEnoughPlayersForRoles()
                  ? "Not enough players for role settings"
                  : !everyoneReady
                  ? "Waiting for players to be ready..."
                  : "Start Game"}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.waitingView}>
              <Text style={styles.waitingText}>
                Waiting for host to start the game...
              </Text>
            </View>
          )}
        </View>

        {/* Role Settings Modal */}
        <Modal
          visible={showRoleSettings}
          transparent
          animationType="slide"
          onRequestClose={() => setShowRoleSettings(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.roleSettingsModal}>
              <Text style={styles.roleSettingsTitle}>Role Settings</Text>

              <ScrollView style={styles.roleSettingsScroll}>
                {/* Mafia */}
                <View style={styles.roleSettingItem}>
                  <View style={styles.roleSettingLabelContainer}>
                    <Text style={styles.roleSettingEmoji}>🕶️</Text>
                    <Text style={styles.roleSettingLabel}>Mafia</Text>
                  </View>
                  <View style={styles.roleSettingControls}>
                    <TouchableOpacity
                      style={styles.roleSettingButton}
                      onPress={() =>
                        updateRoleSettings({
                          ...roleSettings,
                          mafiaCount: Math.max(1, roleSettings.mafiaCount - 1),
                        })
                      }
                    >
                      <Text style={styles.roleSettingButtonText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.roleSettingValue}>{roleSettings.mafiaCount}</Text>
                    <TouchableOpacity
                      style={styles.roleSettingButton}
                      onPress={() =>
                        updateRoleSettings({
                          ...roleSettings,
                          mafiaCount: roleSettings.mafiaCount + 1,
                        })
                      }
                    >
                      <Text style={styles.roleSettingButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Detective */}
                <View style={styles.roleSettingItem}>
                  <View style={styles.roleSettingLabelContainer}>
                    <Text style={styles.roleSettingEmoji}>🕵️</Text>
                    <Text style={styles.roleSettingLabel}>Detective</Text>
                  </View>
                  <View style={styles.roleSettingControls}>
                    <TouchableOpacity
                      style={styles.roleSettingButton}
                      onPress={() =>
                        updateRoleSettings({
                          ...roleSettings,
                          detectiveCount: Math.max(0, roleSettings.detectiveCount - 1),
                        })
                      }
                    >
                      <Text style={styles.roleSettingButtonText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.roleSettingValue}>{roleSettings.detectiveCount}</Text>
                    <TouchableOpacity
                      style={styles.roleSettingButton}
                      onPress={() =>
                        updateRoleSettings({
                          ...roleSettings,
                          detectiveCount: roleSettings.detectiveCount + 1,
                        })
                      }
                    >
                      <Text style={styles.roleSettingButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Doctor */}
                <View style={styles.roleSettingItem}>
                  <View style={styles.roleSettingLabelContainer}>
                    <Text style={styles.roleSettingEmoji}>⚕️</Text>
                    <Text style={styles.roleSettingLabel}>Doctor</Text>
                  </View>
                  <View style={styles.roleSettingControls}>
                    <TouchableOpacity
                      style={styles.roleSettingButton}
                      onPress={() =>
                        updateRoleSettings({
                          ...roleSettings,
                          doctorCount: Math.max(0, roleSettings.doctorCount - 1),
                        })
                      }
                    >
                      <Text style={styles.roleSettingButtonText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.roleSettingValue}>{roleSettings.doctorCount}</Text>
                    <TouchableOpacity
                      style={styles.roleSettingButton}
                      onPress={() =>
                        updateRoleSettings({
                          ...roleSettings,
                          doctorCount: roleSettings.doctorCount + 1,
                        })
                      }
                    >
                      <Text style={styles.roleSettingButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>

              <View style={styles.roleSettingsInfo}>
                <Text style={styles.roleSettingsInfoText}>
                  Total special roles: {calculateTotalRoles()}
                </Text>
                <Text style={styles.roleSettingsInfoText}>
                  Current players: {sortedPlayerList.length}
                </Text>
                {!hasEnoughPlayersForRoles() && (
                  <Text style={styles.roleSettingsWarning}>
                    Not enough players for current role settings!
                  </Text>
                )}
                <Text style={styles.roleSettingsNote}>
                  Remaining players will be Villagers
                </Text>
              </View>

              <TouchableOpacity
                style={styles.roleSettingsCloseButton}
                onPress={() => setShowRoleSettings(false)}
              >
                <Text style={styles.roleSettingsCloseText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Chat Modal */}
        <Modal
          visible={showChat}
          transparent
          animationType="slide"
          onRequestClose={() => setShowChat(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.chatModal}>
              <View style={styles.chatHeader}>
                <Text style={styles.chatTitle}>Lobby Chat</Text>
                <TouchableOpacity onPress={() => setShowChat(false)}>
                  <Ionicons name="close" size={28} color="#fff" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.chatMessages}>
                {chatMessages.length === 0 ? (
                  <Text style={styles.noChatText}>No messages yet...</Text>
                ) : (
                  chatMessages.map((msg, index) => (
                    <View
                      key={index}
                      style={[
                        styles.chatBubble,
                        msg.senderId === playerId && styles.myChatBubble,
                      ]}
                    >
                      {msg.senderId !== playerId && (
                        <Text style={styles.chatSender}>{msg.senderName}</Text>
                      )}
                      <Text style={styles.chatMessage}>{msg.message}</Text>
                    </View>
                  ))
                )}
              </ScrollView>

              <View style={styles.chatInputContainer}>
                <TextInput
                  style={styles.chatInput}
                  value={chatInput}
                  onChangeText={setChatInput}
                  placeholder="Type a message..."
                  placeholderTextColor="#666"
                  multiline
                  onSubmitEditing={sendChatMessage}
                />
                <TouchableOpacity style={styles.sendButton} onPress={sendChatMessage}>
                  <Ionicons name="send" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

// Styles remain the same as your original file
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0b132b",
  },
  container: {
    flex: 1,
    backgroundColor: "#0b132b",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#1c2541",
    borderBottomWidth: 1,
    borderBottomColor: "#2d3a5e",
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: "#89a",
    fontSize: 14,
    marginTop: 2,
  },
  chatButton: {
    padding: 8,
  },
  connectionWarning: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 165, 0, 0.2)",
    padding: 12,
    gap: 8,
  },
  connectionWarningText: {
    color: "#FFA500",
    fontSize: 14,
    fontWeight: "600",
  },
  playersContainer: {
    flex: 1,
    padding: 16,
  },
  settingsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#457b9d",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
  },
  settingsButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  actionsContainer: {
    padding: 16,
    backgroundColor: "#1c2541",
    borderTopWidth: 1,
    borderTopColor: "#2d3a5e",
  },
  connectingView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  connectingText: {
    color: "#fff",
    fontSize: 18,
    marginTop: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyStateText: {
    color: "#888",
    fontSize: 16,
  },
  playerList: {
    paddingBottom: 16,
  },
  playerItem: {
    backgroundColor: "#1c2541",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  hostItem: {
    borderWidth: 2,
    borderColor: "#FFD700",
  },
  meItem: {
    backgroundColor: "#2d3a5e",
  },
  playerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  youText: {
    color: "#4CAF50",
    fontSize: 14,
    fontStyle: "italic",
  },
  hostBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 215, 0, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  hostText: {
    color: "#FFD700",
    fontSize: 12,
    fontWeight: "600",
  },
  rightSection: {
    alignItems: "flex-end",
  },
  statusIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 80,
    alignItems: "center",
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  readyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "#444",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 12,
  },
  readyButtonActive: {
    backgroundColor: "#4CAF50",
  },
  readyButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  startButton: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
  },
  startButtonEnabled: {
    backgroundColor: "#e63946",
  },
  startButtonDisabled: {
    backgroundColor: "#333",
  },
  startButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },
  waitingView: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    backgroundColor: "#333",
    borderRadius: 12,
    alignItems: "center",
  },
  waitingText: {
    color: "#ccc",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  disabledButton: {
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  roleSettingsModal: {
    backgroundColor: "#1c2541",
    borderRadius: 20,
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
  },
  roleSettingsTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#2d3a5e",
  },
  roleSettingsScroll: {
    maxHeight: 300,
    paddingHorizontal: 20,
  },
  roleSettingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#2d3a5e",
  },
  roleSettingLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  roleSettingEmoji: {
    fontSize: 24,
  },
  roleSettingLabel: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  roleSettingControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  roleSettingButton: {
    backgroundColor: "#e63946",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  roleSettingButtonText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
  },
  roleSettingValue: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    minWidth: 30,
    textAlign: "center",
  },
  roleSettingsInfo: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#2d3a5e",
  },
  roleSettingsInfoText: {
    color: "#ccc",
    fontSize: 14,
    marginBottom: 5,
    textAlign: "center",
  },
  roleSettingsWarning: {
    color: "#FF5252",
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 10,
  },
  roleSettingsNote: {
    color: "#888",
    fontSize: 12,
    textAlign: "center",
    marginTop: 10,
    fontStyle: "italic",
  },
  roleSettingsCloseButton: {
    backgroundColor: "#4CAF50",
    margin: 20,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  roleSettingsCloseText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  chatModal: {
    backgroundColor: "#1c2541",
    borderRadius: 20,
    width: "100%",
    maxWidth: 400,
    height: "70%",
  },
  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#2d3a5e",
  },
  chatTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
  },
  chatMessages: {
    flex: 1,
    padding: 16,
  },
  noChatText: {
    color: "#666",
    fontSize: 16,
    textAlign: "center",
    marginTop: 40,
  },
  chatBubble: {
    backgroundColor: "#2d3a5e",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    maxWidth: "80%",
    alignSelf: "flex-start",
  },
  myChatBubble: {
    backgroundColor: "#457b9d",
    alignSelf: "flex-end",
  },
  chatSender: {
    color: "#FFD700",
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 4,
  },
  chatMessage: {
    color: "#fff",
    fontSize: 16,
  },
  chatInputContainer: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#2d3a5e",
    alignItems: "center",
  },
  chatInput: {
    flex: 1,
    backgroundColor: "#2d3a5e",
    borderRadius: 12,
    padding: 12,
    color: "#fff",
    maxHeight: 80,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: "#4CAF50",
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
});