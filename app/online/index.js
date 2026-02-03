import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function OnlineMode() {
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const router = useRouter();

  const buildInvite = (code) => {
    const c = String(code||"").trim().toUpperCase();
    const url = `https://mafia.party/join/${c}`;
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
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>🌐 Online Mode</Text>
        <Text style={styles.subtitle}>Play with Multiple Devices</Text>

        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor="#666"
          autoCapitalize="words"
        />

        <TouchableOpacity style={styles.primaryButton} onPress={createRoom}>
          <Text style={styles.buttonText}>Create Room</Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        <TextInput
          style={styles.input}
          value={roomCode}
          onChangeText={setRoomCode}
          placeholder="Enter room code"
          placeholderTextColor="#666"
          autoCapitalize="characters"
        />
        <TouchableOpacity style={[styles.primaryButton, styles.secondaryButton]} onPress={joinRoom}>
          <Text style={styles.buttonText}>Join Room</Text>
        </TouchableOpacity>

        <View style={styles.featuresCard}>
          <Text style={styles.featuresTitle}>✨ Online Features</Text>
          <Text style={styles.featureText}>• Real-time multi-device gameplay</Text>
          <Text style={styles.featureText}>• Synchronized game state</Text>
          <Text style={styles.featureText}>• Automatic role assignment</Text>
          <Text style={styles.featureText}>• Day/Night cycle management</Text>
          <Text style={styles.featureText}>• Built-in lobby chat</Text>
          <Text style={styles.featureText}>• Host controls & settings</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1, 
    padding: 24, 
    backgroundColor: "#0b132b",
    minHeight: "100%",
  },
  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 8,
    marginBottom: 16,
  },
  backText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  title: { 
    color: "#fff", 
    fontSize: 32, 
    fontWeight: "800", 
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    color: "#bcd",
    fontSize: 16,
    marginBottom: 32,
    textAlign: "center",
    fontStyle: "italic",
  },
  input: {
    width: "100%", 
    padding: 14, 
    borderRadius: 12, 
    backgroundColor: "#1c2541", 
    color: "#fff",
    marginBottom: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#2d3a5e",
  },
  primaryButton: {
    width: "100%", 
    backgroundColor: "#e63946", 
    padding: 16, 
    borderRadius: 12, 
    alignItems: "center",
  },
  secondaryButton: { 
    backgroundColor: "#457b9d",
  },
  buttonText: { 
    color: "#fff", 
    fontSize: 18, 
    fontWeight: "600" 
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#2d3a5e",
  },
  dividerText: {
    color: "#666",
    paddingHorizontal: 16,
    fontSize: 14,
    fontWeight: "600",
  },
  featuresCard: {
    backgroundColor: "#1c2541",
    borderRadius: 12,
    padding: 20,
    marginTop: 32,
    borderWidth: 1,
    borderColor: "#2d3a5e",
  },
  featuresTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
  },
  featureText: {
    color: "#4ecdc4",
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
});
