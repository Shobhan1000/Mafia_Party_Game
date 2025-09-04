import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import socket from "../../socket";

export default function LobbyScreen() {
  const { roomId = "", name = "", mode = "join" } = useLocalSearchParams();
  const router = useRouter();

  const [players, setPlayers] = useState({});
  const [ready, setReady] = useState(false);
  const [hostId, setHostId] = useState(null);
  const [myId, setMyId] = useState(socket.id ?? null);
  const [playerId, setPlayerId] = useState(null);

  const playerList = useMemo(() => Object.values(players ?? {}), [players]);
  const hostName = hostId && players[hostId]?.name ? players[hostId].name : null;
  const amHost = hostId && myId && hostId === myId;

  const everyoneReady = useMemo(() => {
    const arr = Object.values(players || {});
    return arr.length >= 3 && arr.every(p => !!p.ready);
  }, [players]);

  const minPlayersMet = useMemo(() => Object.keys(players||{}).length >= 3, [players]);

  const savePlayerId = async (id) => {
    try {
      await AsyncStorage.setItem("playerId", id);
      setPlayerId(id);
    } catch (e) {
      console.error("Failed to save playerId", e);
    }
  };

  const join = useCallback(() => {
    const rn = String(roomId || "").toUpperCase();
    const nm = String(name || "Player").trim() || "Player";

    if (mode === "create") {
      socket.emit("createRoom", { roomId: rn, name: nm, playerId }, (ack) => {
        if (ack?.success) {
          savePlayerId(ack.playerId);
          setHostId(socket.id);
          setPlayers({ [socket.id]: { id: socket.id, name: nm, ready: false } });
        } else {
          Alert.alert("Error", ack?.message || "Could not create room");
        }
      });
    } else {
      socket.emit("joinRoom", { roomId: rn, name: nm, playerId }, (ack) => {
        if (ack?.success) {
          savePlayerId(ack.playerId);
        } else {
          Alert.alert("Error", ack?.message || "Lobby not found");
        }
      });
    }
  }, [roomId, name, mode, playerId]);

  useEffect(() => {
    const init = async () => {
      const storedId = await AsyncStorage.getItem("playerId");
      if (storedId) {
        setPlayerId(storedId);
      }
    };
    init();
  }, []);

  useEffect(() => {
    const onConnect = () => {
      setMyId(socket.id);
      if (playerId) {
        socket.emit("reconnectToRoom", { roomId: String(roomId).toUpperCase(), playerId }, (ack) => {
          if (!ack?.success) {
            join();
          }
        });
      } else {
        join();
      }
    };

    if (socket.connected) onConnect();
    socket.on("connect", onConnect);

    const onLobby = ({ players, hostId }) => {
      setPlayers(players || {});
      setHostId(hostId || null);

      const me = Object.values(players || {}).find(p => p.playerId === playerId);
      if (me && typeof me.ready === "boolean") setReady(!!me.ready);
    };

    const onHostAssigned = ({ hostId }) => setHostId(hostId || null);
    const onError = (msg) => Alert.alert("Lobby", String(msg || "Error"));
    const onStarted = () => {
      router.replace({ pathname: "/game/[roomId]", params: { roomId: String(roomId).toUpperCase() } });
    };

    socket.on("lobbyUpdate", onLobby);
    socket.on("hostAssigned", onHostAssigned);
    socket.on("errorMsg", onError);
    socket.on("gameStarted", onStarted);

    return () => {
      socket.off("connect", onConnect);
      socket.off("lobbyUpdate", onLobby);
      socket.off("hostAssigned", onHostAssigned);
      socket.off("errorMsg", onError);
      socket.off("gameStarted", onStarted);
      socket.emit("leaveLobby", { roomId: String(roomId || "").toUpperCase(), playerId });
    };
  }, [roomId, name, join, router, playerId]);

  const toggleReady = () => {
    const next = !ready;
    setReady(next);
    socket.emit("playerReady", { roomId: String(roomId||"").toUpperCase(), playerId, ready: next });
  };

  const startGame = () => {
    if (!everyoneReady) return;
    socket.emit("startGame", { roomId: String(roomId||"").toUpperCase(), playerId });
  };

  const renderPlayer = ({ item }) => {
    const isHost = hostId && item.playerId === hostId;
    const isMe = playerId && item.playerId === playerId;

    return (
      <View style={[styles.playerItem, isHost && styles.hostItem]}>
        <View style={styles.playerRow}>
          <View style={[styles.statusDot, { backgroundColor: item.ready ? "#4CAF50" : "#FFC107" }]} />
          <Text style={styles.playerText}>
            {item.name}{isMe ? " (You)" : ""}{isHost ? " — Host" : ""}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Room {String(roomId).toUpperCase()}</Text>
      <Text style={styles.subtitle}>
        {amHost ? "You are the host" : hostName ? `Waiting for host: ${hostName}` : "Picking a host..."}
      </Text>

      <FlatList
        data={playerList}
        keyExtractor={(item) => item.playerId || item.id}
        renderItem={renderPlayer}
        style={{ width: "100%", marginTop: 10 }}
      />

      <TouchableOpacity onPress={toggleReady} style={[styles.readyButton, ready && styles.readyButtonActive]}>
        <Text style={styles.readyText}>{ready ? "Ready ✔" : "Tap to Ready"}</Text>
      </TouchableOpacity>

      {amHost ? (
        <TouchableOpacity
          onPress={startGame}
          style={[styles.startButton, everyoneReady ? styles.startEnabled : styles.startDisabled]}
          disabled={!everyoneReady}
        >
          <Text style={styles.startButtonText}>{everyoneReady ? "Start Game" : "Waiting for everyone…"}</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity disabled style={[styles.startButton, styles.startDisabled]}>
          <Text style={styles.startButtonText}>
            {minPlayersMet ? (hostName ? `Waiting for ${hostName}…` : "Waiting for host…") : "Waiting for players…"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, backgroundColor:"#0b132b", padding:16, gap:12 },
  title: { color:"#fff", fontSize:28, fontWeight:"900" },
  subtitle: { color:"#bcd", fontSize:14, marginBottom: 6 },
  playerItem: { backgroundColor:"#1c2541", borderRadius: 12, padding: 12, marginBottom: 8 },
  hostItem: { borderWidth: 2, borderColor: "#4CAF50" },
  playerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusDot: { width: 14, height: 14, borderRadius: 7 },
  playerText: { color:"#fff", fontSize:16 },
  readyButton: { marginTop:8, paddingVertical:10, borderRadius:12, alignItems:"center", backgroundColor:"#444" },
  readyButtonActive: { backgroundColor: "#4CAF50" },
  startButton: { marginTop:12, paddingVertical:14, borderRadius: 12, alignItems:"center" },
  startEnabled: { backgroundColor:"#e63946" },
  startDisabled: { backgroundColor:"#333" },
  readyText: { color:"#fff", fontSize:16, fontWeight:"700" },
  startButtonText: { color:"#fff", fontSize:18, fontWeight:"800" },
});