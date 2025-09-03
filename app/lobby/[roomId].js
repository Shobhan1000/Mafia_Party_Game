import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import socket from "../../socket";

export default function LobbyScreen() {
  const { roomId = "", name = "" } = useLocalSearchParams();
  const router = useRouter();

  // Store players as a dictionary keyed by socketId: { [id]: { id, name } }
  const [players, setPlayers] = useState({}); // SAFE default = {}
  const [ready, setReady] = useState(false);
  const [hostId, setHostId] = useState(null);
  const [myId, setMyId] = useState(socket.id ?? null);

  // Convert players map to array safely
  const playerList = useMemo(() => Object.values(players ?? {}), [players]);

  useEffect(() => {
    // Update myId on reconnects
    const handleConnect = () => setMyId(socket.id ?? null);
    socket.on("connect", handleConnect);

    // Join (or rejoin) the lobby on mount/connect
    const joinPayload = { roomId: String(roomId || "").toUpperCase(), name: String(name || "").trim() };
    socket.emit("joinLobby", joinPayload);

    // Receive lobby updates
    const onLobbyUpdate = (payload = {}) => {
      const safePlayers = payload?.players && typeof payload.players === "object" ? payload.players : {};
      setPlayers(safePlayers);
      setHostId(payload?.hostId ?? null);
    };
    socket.on("lobbyUpdate", onLobbyUpdate);

    // keep my id updated
    const onConnect = () => setMyId(socket.id);
    socket.on("connect", onConnect);

    // Navigate when game starts
    const onGameStarted = () => router.replace({ pathname: "/game/[roomId]", params: { roomId } });
    socket.on("gameStarted", onGameStarted);

    // Clean up
    return () => {
      socket.off("connect", handleConnect);
      socket.off("lobbyUpdate", onLobbyUpdate);
      socket.off("gameStarted", onGameStarted);
    };
  }, [roomId, name, router]);

  
  const toggleReady = () => {
    const next = !ready;
    setReady(next);
    socket.emit("playerReady", { roomId: String(roomId || "").toUpperCase(), ready: next });
  };

  const allReady = useMemo(() => {
    const ps = Object.values(players||{});
    return ps.length > 0 && ps.every(p => p.ready);
  }, [players]);
const isHost = hostId && myId && hostId === myId;

  const startGame = () => {
    if (!isHost) {
      Alert.alert("Only the host can start the game.");
      return;
    }
    const count = Object.keys(players ?? {}).length;
    if (count < 4) {
      Alert.alert("Need at least 4 players to start.");
      return;
    }
    socket.emit("startGame", { roomId });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lobby — {String(roomId).toUpperCase()}</Text>
      <Text style={styles.subtitle}>Players</Text>

      <FlatList
        data={playerList}
        keyExtractor={(p, idx) => (p?.id ?? String(idx))}
        renderItem={({ item }) => (
          <View style={[styles.playerItem, item?.id === hostId && styles.hostItem]}>
            <Text style={styles.playerText}>
              {item?.name ?? "Unknown"}{item?.id === hostId ? " (Host)" : ""}
            </Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Waiting for players…</Text>}
        contentContainerStyle={playerList.length === 0 && { flexGrow: 1, justifyContent: "center" }}
      />

      {isHost ? (
        <TouchableOpacity style={styles.startButton} onPress={startGame}>
          <Text style={styles.startButtonText}>Start Game</Text>
        </TouchableOpacity>
      ) : (
        <Text style={{ color: "#9fb", marginTop: 16 }}>Waiting for host to start…</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b132b", padding: 20, paddingTop: 48 },
  title: { color: "#fff", fontSize: 22, fontWeight: "800", marginBottom: 16 },
  subtitle: { color: "#bcd", fontSize: 18, marginBottom: 12 },
  empty: { color: "#8aa", textAlign: "center" },
  playerItem: {
    backgroundColor: "#1c2541", padding: 14, borderRadius: 12, marginBottom: 10,
  },
  hostItem: { borderWidth: 2, borderColor: "#4CAF50" },
  playerText: { color: "#fff", fontSize: 16 },
  startButton: {
    marginTop: 20, backgroundColor: "#4CAF50", paddingVertical: 15, paddingHorizontal: 40, borderRadius: 12,
  },
  startButtonText: { color: "#fff", fontSize: 18, fontWeight: "600" },
});