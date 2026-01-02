import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
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
  const [isConnected, setIsConnected] = useState(false);

  // Load playerId from storage
  useEffect(() => {
    AsyncStorage.getItem("playerId").then(id => {
      if (id) setPlayerId(id);
    });
  }, []);

  // Handle socket connection and room joining
  useEffect(() => {
    if (!roomId || !name) return;

    const onConnect = () => {
      console.log("Socket connected, joining room...");
      setIsConnected(true);
      
      // Generate or use existing playerId
      const storedPlayerId = playerId || `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      if (playerId) {
        AsyncStorage.setItem("playerId", storedPlayerId);
        setPlayerId(storedPlayerId);
      }

      // Join the room
      socket.emit("createOrJoinRoom", {
        roomId: String(roomId).toUpperCase(),
        name: String(name || "Player").trim() || "Player",
        playerId: storedPlayerId
      }, (response) => {
        console.log("Join response:", response);
        if (response?.success) {
          setPlayerId(response.playerId);
          setHostId(response.hostId);
          setIsConnected(true);
        } else {
          Alert.alert("Error", response?.message || "Failed to join room");
        }
      });
    };

    const onDisconnect = () => {
      console.log("Socket disconnected");
      setIsConnected(false);
    };

    const onLobbyUpdate = (data) => {
      console.log("Lobby update received:", data);
      setPlayers(data.players || {});
      setHostId(data.hostId || null);
      
      // Update my ready status
      if (playerId && data.players && data.players[playerId]) {
        setReady(!!data.players[playerId].ready);
      }
    };

    const onHostAssigned = (data) => {
      console.log("Host assigned:", data);
      setHostId(data.hostId);
    };

    const onGameStarted = (data) => {
      console.log("Game started:", data);
      router.replace({
        pathname: "/game/[roomId]",
        params: { roomId: String(roomId).toUpperCase() }
      });
    };

    const onError = (msg) => {
      console.log("Error:", msg);
      Alert.alert("Error", String(msg || "Something went wrong"));
    };

    // Setup event listeners
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("lobbyUpdate", onLobbyUpdate);
    socket.on("hostAssigned", onHostAssigned);
    socket.on("gameStarted", onGameStarted);
    socket.on("errorMsg", onError);

    // Connect if not already connected
    if (!socket.connected) {
      socket.connect();
    } else {
      onConnect();
    }

    // Cleanup
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("lobbyUpdate", onLobbyUpdate);
      socket.off("hostAssigned", onHostAssigned);
      socket.off("gameStarted", onGameStarted);
      socket.off("errorMsg", onError);
      
      // Leave room on unmount
      if (playerId) {
        socket.emit("leaveLobby", {
          roomId: String(roomId).toUpperCase(),
          playerId
        });
      }
    };
  }, [roomId, name]);

  const toggleReady = () => {
    if (!playerId || !isConnected) return;
    
    const newReady = !ready;
    setReady(newReady);
    
    socket.emit("playerReady", {
      roomId: String(roomId).toUpperCase(),
      playerId,
      ready: newReady
    });
  };

  const startGame = () => {
    if (!playerId || !isConnected) return;
    
    socket.emit("startGame", {
      roomId: String(roomId).toUpperCase(),
      playerId
    });
  };

  const leaveLobby = () => {
    Alert.alert(
      "Leave Lobby",
      "Are you sure you want to leave?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: () => {
            if (playerId) {
              socket.emit("leaveLobby", {
                roomId: String(roomId).toUpperCase(),
                playerId
              });
            }
            router.back();
          }
        }
      ]
    );
  };

  // Prepare player list
  const playerList = useMemo(() => {
    return Object.values(players || {}).sort((a, b) => {
      // Host first
      if (a.playerId === hostId) return -1;
      if (b.playerId === hostId) return 1;
      // Then by name
      return a.name.localeCompare(b.name);
    });
  }, [players, hostId]);

  const amHost = playerId && hostId && playerId === hostId;
  const canStart = playerList.length >= 3 && playerList.every(p => p.ready);

  // Render player item
  const renderPlayer = ({ item }) => {
    const isHost = item.playerId === hostId;
    const isMe = item.playerId === playerId;

    return (
      <View style={[
        styles.playerItem,
        isHost && styles.hostItem,
        isMe && styles.meItem
      ]}>
        <View style={styles.playerRow}>
          <View style={styles.playerInfo}>
            <Text style={styles.playerName}>
              {item.name} {isMe && "(You)"}
            </Text>
            {isHost && (
              <View style={styles.hostBadge}>
                <Ionicons name="star" size={14} color="#FFD700" />
                <Text style={styles.hostText}>Host</Text>
              </View>
            )}
          </View>
          <View style={[
            styles.statusBadge,
            { backgroundColor: item.ready ? "#4CAF50" : "#FF9800" }
          ]}>
            <Text style={styles.statusText}>
              {item.ready ? "READY" : "NOT READY"}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={leaveLobby} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
          <Text style={styles.backButtonText}>Leave</Text>
        </TouchableOpacity>
        
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Room: {String(roomId).toUpperCase()}</Text>
          <View style={styles.connectionStatus}>
            <View style={[
              styles.connectionDot,
              { backgroundColor: isConnected ? "#4CAF50" : "#FF5252" }
            ]} />
            <Text style={styles.connectionText}>
              {isConnected ? "Connected" : "Connecting..."}
            </Text>
          </View>
        </View>
        
        <View style={styles.placeholder} />
      </View>

      {/* Player List */}
      <View style={styles.playerListContainer}>
        <View style={styles.playerCount}>
          <Text style={styles.playerCountText}>
            Players: {playerList.length}/10
          </Text>
          <Text style={styles.readyCountText}>
            Ready: {playerList.filter(p => p.ready).length}/{playerList.length}
          </Text>
        </View>
        
        {playerList.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No players yet</Text>
          </View>
        ) : (
          <FlatList
            data={playerList}
            keyExtractor={(item) => item.playerId}
            renderItem={renderPlayer}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          onPress={toggleReady}
          style={[styles.readyButton, ready && styles.readyButtonActive]}
          disabled={!isConnected}
        >
          <Text style={styles.readyButtonText}>
            {ready ? "READY ✓" : "MARK AS READY"}
          </Text>
        </TouchableOpacity>

        {amHost ? (
          <TouchableOpacity
            onPress={startGame}
            style={[styles.startButton, canStart && styles.startButtonActive]}
            disabled={!canStart || !isConnected}
          >
            <Text style={styles.startButtonText}>
              {canStart ? "START GAME" : "WAITING FOR PLAYERS"}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.waitingContainer}>
            <Text style={styles.waitingText}>
              Waiting for host to start...
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b132b",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1c2541",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButtonText: {
    color: "#fff",
    fontSize: 16,
    marginLeft: 4,
  },
  titleContainer: {
    alignItems: "center",
  },
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  connectionStatus: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  connectionText: {
    color: "#ccc",
    fontSize: 12,
  },
  placeholder: {
    width: 60,
  },
  playerListContainer: {
    flex: 1,
    padding: 16,
  },
  playerCount: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  playerCountText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  readyCountText: {
    color: "#4CAF50",
    fontSize: 16,
    fontWeight: "600",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyStateText: {
    color: "#666",
    fontSize: 18,
  },
  listContent: {
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
  hostBadge: {
    flexDirection: "row",
    alignItems: "center",
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
    marginLeft: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 80,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  controls: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#1c2541",
  },
  readyButton: {
    backgroundColor: "#444",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
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
    backgroundColor: "#333",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  startButtonActive: {
    backgroundColor: "#e63946",
  },
  startButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },
  waitingContainer: {
    backgroundColor: "#333",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  waitingText: {
    color: "#ccc",
    fontSize: 16,
    fontWeight: "600",
  },
});