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
  const [phase, setPhase] = useState("waiting"); // waiting | night | day | gameOver
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

  const myId = socket.id;

  // socket listeners
  useEffect(() => {
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

    const onPlayerEliminated = ({ playerId, name, role }) => {
      if (playerId === myId) setAlive(false);
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
  }, [roomId]);

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
    socket.emit("nightAction", { roomId: String(roomId).toUpperCase(), actionType, targetId });
  };

  const sendVote = (targetId) => {
    if (!alive || phase !== "day") return;
    socket.emit("dayVote", { roomId: String(roomId).toUpperCase(), votedId: targetId });
  };

  const renderPlayerRow = ({ item: id }) => {
    const p = players[id];
    if (!p) return null;
    const count = votes[id] || 0;

    // Night action buttons
    if (phase === "night" && alive) {
      if (role === "Mafia" && id !== myId && p.alive) {
        return row(id, p.name, `Kill ${p.name}`, () => sendNightAction("kill", id));
      }
      if (role === "Doctor" && p.alive) {
        return row(id, p.name, `Save ${p.name}`, () => sendNightAction("save", id));
      }
      if (role === "Detective" && id !== myId && p.alive) {
        return row(id, p.name, `Check ${p.name}`, () => sendNightAction("investigate", id));
      }
    }

    // Day voting
    if (phase === "day" && alive && id !== myId && p.alive) {
      return row(id, `${p.name}  •  Votes: ${count}`, `Vote ${p.name}`, () => sendVote(id), true);
    }

    // default display
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

      {/* Role Card modal */}
      <Modal visible={showRoleModal} transparent animationType="fade">
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <Text style={styles.roleTitle}>{ROLE_HELP[role]?.title || role}</Text>
            <Text style={styles.roleDesc}>{ROLE_HELP[role]?.desc || ""}</Text>
            {role === "Mafia" && mafias.length > 0 && (
              <View style={{ marginTop: 10 }}>
                <Text style={[styles.roleDesc,{fontWeight:'700'}]}>Your Mafia teammates:</Text>
                {mafias.map(m => <Text key={m.id} style={styles.roleDesc}>• {m.name}</Text>)}
              </View>
            )}
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowRoleModal(false)}>
              <Text style={styles.closeText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Elimination banner */}
      {eliminatedMsg ? (
        <View style={styles.banner}><Text style={styles.bannerText}>{eliminatedMsg}</Text></View>
      ) : null}

      {phase === "gameOver" ? (
        <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}>
          <Text style={{ color:'#fff', fontSize:28, fontWeight:'900', marginBottom:8 }}>{winner} win!</Text>
          {revealRoles && (
            <View style={{ backgroundColor:'#1c2541', padding:14, borderRadius:12, width:'100%', marginBottom:16 }}>
              <Text style={{ color:'#bcd', fontWeight:'700', marginBottom:8 }}>Roles revealed</Text>
              {Object.entries(revealRoles).map(([id, info]) => (
                <Text key={id} style={{ color:'#fff' }}>• {info.name}: {info.role}</Text>
              ))}
            </View>
          )}
          <TouchableOpacity style={styles.actionBtn} onPress={exitToLobby}><Text style={styles.actionText}>Play Again</Text></TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={Object.keys(players)}
          keyExtractor={(id) => id}
          renderItem={renderPlayerRow}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b132b", padding: 16, paddingTop: 36 },
  phaseBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  phaseText: { color: "#fff", fontSize: 22, fontWeight: "800" },
  timerText: { color: "#ffcc80", fontSize: 20, fontWeight: "800" },
  playerItem: { backgroundColor: "#1c2541", borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  playerName: { color: "#fff", fontSize: 16, fontWeight: "600" },
  actionBtn: { backgroundColor: "#e63946", paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
  actionText: { color: "#fff", fontWeight: "800" },
  highlight: { borderWidth: 2, borderColor: "#ff9800" },
  deadRow: { opacity: 0.35 },
  banner: { backgroundColor: "#ad1457", padding: 10, borderRadius: 10, marginBottom: 10 },
  bannerText: { color: "#fff", fontWeight: "700", textAlign:"center" },
  modalWrap: { flex:1, backgroundColor: "rgba(0,0,0,0.6)", alignItems:"center", justifyContent:"center", padding:20 },
  modalCard: { backgroundColor:"#1c2541", borderRadius: 16, padding: 18, width: "100%" },
  roleTitle: { color:"#fff", fontSize: 24, fontWeight:"900", marginBottom: 6 },
  roleDesc: { color:"#bcd", fontSize: 16, marginBottom: 4 },
  closeBtn: { marginTop: 12, backgroundColor:"#4CAF50", paddingVertical: 12, borderRadius: 12, alignItems:"center" },
  closeText: { color:"#fff", fontWeight:"800" },
});