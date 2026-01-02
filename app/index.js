import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function Home() {
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const router = useRouter();

  const buildInvite = (code) => {
    const c = String(code||"").trim().toUpperCase();
    const url = `https://mafia.party/join/${c}`; // change to your domain if you have one
    return { code: c, url };
  };

  const copyInvite = async () => {
    const { code, url } = buildInvite(roomCode);
    if (!code) return Alert.alert("Room code needed");
    await Clipboard.setStringAsync(url);
    Alert.alert("Copied!", `Invite link copied to clipboard:\n${url}`);
  };

  const shareInvite = async () => {
    const { code, url } = buildInvite(roomCode);
    if (!code) return Alert.alert("Room code needed");
    try { await Share.share({ message: `Join my Mafia room ${code}: ${url}` }); } catch {}
  };

  const ensureName = () => {
    if (!name.trim()) {
      Alert.alert("Missing Name", "Enter your name first!");
      return false;
    }
    return true;
  };

  const createRoom = () => {
    if (!ensureName()) return;
    const newRoom = Math.random().toString(36).substring(2, 7).toUpperCase();
    router.push({ pathname: "/lobby/[roomId]", params: { roomId: newRoom, name } });
  };

  const joinRoom = () => {
    if (!ensureName()) return;
    const code = roomCode.trim().toUpperCase();
    if (!code) {
      Alert.alert("Missing Code", "Enter a room code to join.");
      return;
    }
    router.push({ pathname: "/lobby/[roomId]", params: { roomId: code, name } });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mafia Party</Text>

      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Your name"
        autoCapitalize="words"
      />

      <TouchableOpacity style={styles.primaryButton} onPress={createRoom}>
        <Text style={styles.buttonText}>Create Room</Text>
      </TouchableOpacity>

      <View style={{ height: 30 }} />

      <TextInput
        style={styles.input}
        value={roomCode}  // Fixed: Changed from `name` to `roomCode`
        onChangeText={setRoomCode}  // Fixed: Changed from `setName` to `setRoomCode`
        placeholder="Enter room code"
        autoCapitalize="characters"
      />
      <TouchableOpacity style={[styles.primaryButton, styles.secondaryButton]} onPress={joinRoom}>
        <Text style={styles.buttonText}>Join Room</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#0b132b",
  },
  title: { color: "#fff", fontSize: 32, fontWeight: "800", marginBottom: 24 },
  input: {
    width: "100%", padding: 14, borderRadius: 12, backgroundColor: "#1c2541", color: "#fff",
    marginBottom: 12,
  },
  primaryButton: {
    width: "100%", backgroundColor: "#e63946", padding: 16, borderRadius: 12, alignItems: "center",
  },
  secondaryButton: { backgroundColor: "#457b9d" },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "600" },
});