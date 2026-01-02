import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function Home() {
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [showRules, setShowRules] = useState(false);
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
        <Text style={styles.title}>🎭 Mafia Party</Text>
        <Text style={styles.subtitle}>Social Deduction Game</Text>

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

        <TouchableOpacity 
          style={styles.rulesButton} 
          onPress={() => setShowRules(!showRules)}
        >
          <Text style={styles.rulesButtonText}>
            {showRules ? "Hide Rules ▲" : "How to Play ▼"}
          </Text>
        </TouchableOpacity>

        {showRules && (
          <View style={styles.rulesContainer}>
            <Text style={styles.rulesTitle}>Game Rules</Text>
            
            <View style={styles.roleSection}>
              <Text style={styles.roleHeader}>🕶️ Mafia</Text>
              <Text style={styles.roleText}>
                Work with other Mafia to eliminate villagers at night. Win when you equal or outnumber villagers.
              </Text>
            </View>

            <View style={styles.roleSection}>
              <Text style={styles.roleHeader}>🕵️ Detective</Text>
              <Text style={styles.roleText}>
                Investigate one player each night to learn if they're Mafia or innocent.
              </Text>
            </View>

            <View style={styles.roleSection}>
              <Text style={styles.roleHeader}>⚕️ Doctor</Text>
              <Text style={styles.roleText}>
                Save one player from elimination each night. You can save yourself!
              </Text>
            </View>

            <View style={styles.roleSection}>
              <Text style={styles.roleHeader}>👨‍🌾 Villager</Text>
              <Text style={styles.roleText}>
                No special abilities. Use discussion and voting to eliminate Mafia members.
              </Text>
            </View>

            <Text style={styles.howToPlay}>
              {"\n"}🌙 Night Phase: Special roles take actions secretly{"\n"}
              ☀️ Day Phase: Everyone discusses and votes to eliminate someone{"\n"}
              🎯 Goal: Villagers eliminate all Mafia, or Mafia outnumber villagers
            </Text>
          </View>
        )}
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
    alignItems: "center", 
    justifyContent: "center", 
    padding: 24, 
    backgroundColor: "#0b132b",
    minHeight: "100%",
  },
  title: { 
    color: "#fff", 
    fontSize: 38, 
    fontWeight: "800", 
    marginBottom: 8,
    textShadowColor: 'rgba(230, 57, 70, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  subtitle: {
    color: "#bcd",
    fontSize: 16,
    marginBottom: 32,
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
    shadowColor: "#e63946",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  secondaryButton: { 
    backgroundColor: "#457b9d",
    shadowColor: "#457b9d",
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
  rulesButton: {
    marginTop: 24,
    padding: 12,
  },
  rulesButtonText: {
    color: "#4CAF50",
    fontSize: 16,
    fontWeight: "600",
  },
  rulesContainer: {
    width: "100%",
    backgroundColor: "#1c2541",
    borderRadius: 12,
    padding: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#2d3a5e",
  },
  rulesTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  roleSection: {
    marginBottom: 16,
  },
  roleHeader: {
    color: "#FFD700",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  roleText: {
    color: "#bcd",
    fontSize: 14,
    lineHeight: 20,
  },
  howToPlay: {
    color: "#89a",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
  },
});