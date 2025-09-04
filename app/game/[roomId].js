import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import socket from "../../socket";

const ROLE_HELP = {
  Mafia: { title: "Mafia", desc: "At night, choose a victim. Win if Mafia are equal to or outnumber Villagers.", action: "Choose a victim" },
  Doctor: { title: "Doctor", desc: "At night, choose someone to save from elimination.", action: "Choose someone to save" },
  Detective: { title: "Detective", desc: "At night, investigate one player to learn their role.", action: "Investigate a player" },
  Villager: { title: "Villager", desc: "No night powers. Discuss and vote wisely during the day.", action: null },
};

export default function GameScreen() {
  const { roomId = "" } = useLocalSearchParams();
  const router = useRouter();
  const [phase, setPhase] = useState("waiting");
  const [players, setPlayers] = useState({});
  const [role, setRole] = useState(null);
  const [alive, setAlive] = useState(true);
  const [timer, setTimer] = useState(60);
  const [eliminatedMsg, setEliminatedMsg] = useState("");
  const [votes, setVotes] = useState({});
  const [mafias, setMafias] = useState([]);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [winner, setWinner] = useState(null);
  const [revealRoles, setRevealRoles] = useState(null);
  const [playerId, setPlayerId] = useState(null);

  // Load stored playerId
  useEffect(() => {
    AsyncStorage.getItem("playerId").then(stored => {
      if (stored) setPlayerId(stored);
    });
  }, []);

  // socket listeners
  useEffect(() => {
    const onConnect = () => {
      if (playerId) {
        socket.emit("reconnectToRoom", { roomId: String(roomId).toUpperCase(), playerId }, (ack) => {
          if (!ack?.success) {
            console.log("Reconnect failed, staying in spectator mode or awaiting rejoin");
          }
        });
      }
    };
    if (socket.connected) onConnect();
    socket.on("connect", onConnect);

    const onGameStarted = (playersObj) => {
      setPlayers(playersObj || {});
      setPhase("night");
      setTimer(60);
      setShowRoleModal(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };
    socket.on("gameStarted", onGameStarted);

    const onRole = (r) => setRole(r);
    socket.on("roleAssigned", onRole);

    const onPhase = ({ phase }) => {
      setPhase(phase);
      setTimer(phase === "day" ? 90 : 60);
      setVotes({});
    };
    socket.on("phaseChange", onPhase);

    const onLobbyUpdate = ({ players }) => setPlayers(players || {});
    socket.on("lobbyUpdate", onLobbyUpdate);

    const onPlayerEliminated = ({ playerId: eliminatedId, name, role }) => {
      if (eliminatedId === playerId) setAlive(false);
      setEliminatedMsg(`${name} was eliminated. They were ${role}.`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    };
    socket.on("playerEliminated", onPlayerEliminated);

    const onGameOver = ({ winner }) => {
      setWinner(winner);
      setPhase("gameOver");
    };
    socket.on("gameOver", onGameOver);

    const onVoteUpdate = ({ votes }) => setVotes(votes || {});
    socket.on("voteUpdate", onVoteUpdate);

    const onMafiaMembers = (list) => setMafias(list || []);
    socket.on("mafiaMembers", onMafiaMembers);

    const onRevealRoles = ({ roles }) => setRevealRoles(roles || {});
    socket.on("revealRoles", onRevealRoles);

    return () => {
      socket.off("connect", onConnect);
      socket.off("gameStarted", onGameStarted);
      socket.off("roleAssigned", onRole);
      socket.off("phaseChange", onPhase);
      socket.off("lobbyUpdate", onLobbyUpdate);
      socket.off("playerEliminated", onPlayerEliminated);
      socket.off("gameOver", onGameOver);
      socket.off("voteUpdate", onVoteUpdate);
      socket.off("mafiaMembers", onMafiaMembers);
      socket.off("revealRoles", onRevealRoles);
    };
  }, [roomId, playerId]);

  // local timer
  useEffect(() => {
    if (phase === "gameOver" || phase === "waiting") return;
    const id = setInterval(() => setTimer((t) => (t > 0 ? t - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [phase]);

  const alivePlayers = useMemo(
    () => Object.values(players || {}).filter((p) => p.alive),
    [players]
  );

  const canActAtNight = alive && phase === "night" && role && role !== "Villager";

  const sendNightAction = (actionType, targetId) => {
    if (!canActAtNight) return;
    socket.emit("nightAction", { roomId: String(roomId).toUpperCase(), playerId, actionType, targetId });
  };

  const sendVote = (targetId) => {
    if (!alive || phase !== "day") return;
    socket.emit("dayVote", { roomId: String(roomId).toUpperCase(), playerId, votedId: targetId });
  };

  const renderPlayerRow = ({ item: id }) => {
    const p = players[id];
    if (!p) return null;
    const count = votes[id] || 0;

    if (phase === "night" && alive) {
      if (role === "Mafia" && id !== playerId && p.alive) {
        return row(id, p.name, `Kill ${p.name}`, () => sendNightAction("kill", id));
      }
      if (role === "Doctor" && p.alive) {
        return row(id, p.name, `Save ${p.name}`, () => sendNightAction("save", id));
      }
      if (role === "Detective" && id !== playerId && p.alive) {
        return row(id, p.name, `Check ${p.name}`, () => sendNightAction("investigate", id));
      }
    }

    if (phase === "day" && alive && id !== playerId && p.alive) {
      return row(id, `${p.name}  •  Votes: ${count}`, `Vote ${p.name}`, () => sendVote(id), true);
    }

    return (
      <View style={[styles.playerItem, !p.alive && styles.deadRow]}>
        <Text style={styles.playerName}>{p.name}{!p.alive ? " (dead)" : ""}</Text>
      </View>
    );
  };

  const row = (id, title, cta, onPress, highlight=false) => (
    <View style={[styles.playerItem, highlight && styles.highlight]} key={id}>
      <Text style={styles.playerName}>{title}</Text>
      <TouchableOpacity style={styles.actionBtn} onPress={onPress}><Text style={styles.actionText}>{cta}</Text></TouchableOpacity>
    </View>
  );

  const exitToLobby = () => router.replace({ pathname: "/lobby/[roomId]", params: { roomId } });

  return (
    <View style={styles.container}>
      <View style={styles.phaseBar}>
        <Text style={styles.phaseText}>
          {phase === "night" ? "🌙 Night" : phase === "day" ? "☀️ Day" : phase === "gameOver" ? "🏁 Game Over" : "⏳ Waiting"}
        </Text>
        <Text style={styles.timerText}>{timer}s</Text>
      </View>

      <Modal visible={showRoleModal} transparent animationType="fade">
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{ROLE_HELP[role]?.title || "Your Role"}</Text>
            <Text style={styles.modalDesc}>{ROLE_HELP[role]?.desc || "You are a player in the game."}</Text>
            <TouchableOpacity onPress={() => setShowRoleModal(false)} style={styles.modalBtn}>
              <Text style={styles.modalBtnText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {eliminatedMsg ? (
        <View style={styles.eliminatedBanner}>
          <Text style={styles.eliminatedText}>{eliminatedMsg}</Text>
        </View>
      ) : null}

      {winner ? (
        <View style={styles.winnerBanner}>
          <Text style={styles.winnerText}>{winner} win!</Text>
          <TouchableOpacity onPress={exitToLobby} style={styles.modalBtn}>
            <Text style={styles.modalBtnText}>Back to Lobby</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {revealRoles ? (
        <FlatList
          data={Object.keys(revealRoles)}
          keyExtractor={(id) => id}
          renderItem={({ item: id }) => {
            const r = revealRoles[id];
            return (
              <View style={styles.playerItem}>
                <Text style={styles.playerName}>{r.name} — {r.role}</Text>
              </View>
            );
          }}
        />
      ) : (
        <FlatList
          data={Object.keys(players || {})}
          keyExtractor={(id) => id}
          renderItem={renderPlayerRow}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b132b", padding: 16 },
  phaseBar: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  phaseText: { color: "#fff", fontSize: 20, fontWeight: "700" },
  timerText: { color: "#fff", fontSize: 20, fontWeight: "700" },
  playerItem: { backgroundColor: "#1c2541", borderRadius: 12, padding: 12, marginBottom: 8 },
  playerName: { color: "#fff", fontSize: 16 },
  actionBtn: { marginTop: 8, backgroundColor: "#e63946", padding: 10, borderRadius: 8 },
  actionText: { color: "#fff", fontWeight: "700", textAlign: "center" },
  highlight: { borderWidth: 2, borderColor: "#4CAF50" },
  deadRow: { opacity: 0.5 },
  modalWrap: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.6)" },
  modalCard: { backgroundColor: "#1c2541", padding: 24, borderRadius: 16, width: "80%", alignItems: "center" },
  modalTitle: { color: "#fff", fontSize: 24, fontWeight: "800", marginBottom: 12 },
  modalDesc: { color: "#ccc", fontSize: 16, textAlign: "center", marginBottom: 20 },
  modalBtn: { backgroundColor: "#4CAF50", paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  modalBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  eliminatedBanner: { backgroundColor: "#333", padding: 12, borderRadius: 8, marginBottom: 12 },
  eliminatedText: { color: "#ffb703", fontSize: 16, textAlign: "center" },
  winnerBanner: { backgroundColor: "#4CAF50", padding: 16, borderRadius: 12, marginBottom: 12, alignItems: "center" },
  winnerText: { color: "#fff", fontSize: 20, fontWeight: "800", marginBottom: 8 },
});