import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, SafeAreaView, Alert, ScrollView, Vibration, Platform } from 'react-native';
import { Shield, ShieldAlert, Lock, Wifi, WifiOff, LogOut, Trash2, Activity } from 'lucide-react-native';
import * as Speech from 'expo-speech';
import { io } from 'socket.io-client';

// 📡 THE CLOUD CONNECTION
const socket = io("https://mohztec-backend-1.onrender.com",{
  transports: ["websocket"],
  reconnectionAttempts: 5,
  timeout: 10000,

});


export default function HomeScreen() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState('SECURE');
  const [logs, setLogs] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  const prevLogsCount = useRef(0);

  // useEffect(() => {
  //   socket.on('connect', () => setIsConnected(true));
  //   socket.on('disconnect', () => setIsConnected(false));

    // 🔊 VOICE LOGIC (Socket Instant Lane)
    // socket.on('mqtt/', (data) => {
    //   if (data.includes("Motion")) {
    //     setStatus('ALERT');
    //     Speech.speak("Warning: Motion detected in your compound", { rate: 0.9 });
    //     setTimeout(() => setStatus('SECURE'), 10000);
    //   }
    // });
// useEffect(() => {
//     // Check if we are already connected
//     if (socket.connected) setIsConnected(true);

//     socket.on('connect', () => {
//       console.log("✅ CLOUD CONNECTED");
//       setIsConnected(true);
//     });

//     socket.on('disconnect', () => {
//       console.log("❌ CLOUD DISCONNECTED");
//       setIsConnected(false);
//     });

//     socket.on('connect_error', (err) => {
//       console.log("⚠️ Connection Error:", err.message);
//       setIsConnected(false);
//     });

//     // LISTENING FOR MOTION
//     socket.on('mqtt/', (data) => {
//       if (data.includes("Motion")) {
//         setStatus('ALERT');
//         Speech.speak("Warning: Motion detected in your compound");
//         Vibration.vibrate(1000); 
//         setTimeout(() => setStatus('SECURE'), 10000);
//       }
//     });

//     return () => {
//       socket.off('connect');
//       socket.off('disconnect');
//       socket.off('connect_error');
//       socket.off('mqtt/');
//     };
//   }, []);



 useEffect(() => {
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    socket.on('mqtt/', (data) => {
      if (data.includes("Motion")) {
        setStatus('ALERT');
        Speech.speak("Warning: Motion detected in your compound");
        Vibration.vibrate(1000); 
        setTimeout(() => setStatus('SECURE'), 10000);
      }
    });

    const fetchHistory = async () => {
      try {
        const res = await fetch("https://mohztec-backend-1.onrender.com/api/data"); // 📍 FIXED: Uses API_URL variable
        const result = await res.json();
        const currentLogs = result.logs || [];
        // setLogs(result.logs || []);
         // 📍 NEW NOTIFICATION LOGIC (Line 42)
        if (currentLogs.length > prevLogsCount.current && prevLogsCount.current !== 0) {
          Vibration.vibrate(800);
          Speech.speak("New intrusion recorded in vault");
        }
        
        prevLogsCount.current = currentLogs.length; // Update the record
        setLogs(currentLogs);
      } catch (err) { console.log("Fetch Error"); }
    };

    fetchHistory();
    const interval = setInterval(fetchHistory, 5000); 
    return () => { 
        socket.off('connect');
        socket.off('disconnect');
        socket.off('mqtt/');
        clearInterval(interval);
    };
  }, []);



  const handleLogin = async () => {
    try {
      const res = await fetch("https://mohztec-backend-1.onrender.com/api/login", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const result = await res.json();
      if (result.success) setIsLoggedIn(true);
      else Alert.alert("ACCESS DENIED", "Incorrect Master Key");
    } catch (err) { Alert.alert("OFFLINE", "Cloud Factory Unreachable"); }
  };

  // const triggerSiren = (state: 'ON' | 'OFF') => {
  //   socket.emit('trigger_siren', state);
  //   Alert.alert("COMMAND SENT", `Siren turned ${state}`);
  // };
  const triggerSiren = async (state: 'ON' | 'OFF') => {
  console.log(`Attempting to send ${state} command...`);

  // Try the Fast Lane (Socket)
  if (isConnected) {
    socket.emit('trigger_siren', state);
    console.log("Fast Lane: Socket signal emitted.");
  } 

  // ALSO use the Reliable Lane (Fetch) just in case
  try {
    const res = await fetch("https://mohztec-backend-1.onrender.com/api/trigger", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state })
    });
    const result = await res.json();
    if (result.success) {
       Alert.alert("COMMAND SENT", `Siren is now ${state}`);
    }
  } catch (err) {
    console.log("Reliable Lane Error:", err.message);
    if (!isConnected) Alert.alert("OFFLINE", "Both connection lanes failed.");
  }
};

 // 📍 LINE 90: THE DELETE LOGIC
  const handleDelete = (id: string) => {
    Alert.alert("SHRED LOG", "Delete this evidence?", [
      { text: "Cancel", style: "cancel" },
      { text: "DELETE", style: "destructive", onPress: async () => {
          await fetch(`https://mohztec-backend-1.onrender.com/api/logs/${id}`, { method: 'DELETE' });
          setLogs(logs.filter(log => log._id !== id));
      }}
    ]);
  };


 


  // --- LOGIN SCREEN ---
  if (!isLoggedIn) {
    return (
      <View style={styles.loginContainer}>
        <Lock size={60} color="#38bdf8" style={{ alignSelf: 'center', marginBottom: 20 }} />
        <Text style={styles.loginTitle}>MOHZTEC AUTH</Text>
        <TextInput
          style={styles.input}
          placeholder="Master Key"
          placeholderTextColor="#64748b"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity style={styles.authButton} onPress={handleLogin}>
          <Text style={styles.buttonText}>AUTHENTICATE</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- DASHBOARD ---
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.topRow}>
           <Text style={styles.title}>MOHZTEC GUARD</Text>
             {/* 📍 THE EXIT/LOGOUT BUTTON (Line 132) */}
            <TouchableOpacity onPress={() => setIsLoggedIn(false)} style={styles.exitBtn}>
              <LogOut size={22} color="#f87171" />
            </TouchableOpacity>
             </View>
          <View style={styles.connBox}>
             <View style={[styles.dot, { backgroundColor: isConnected ? '#10b981' : '#ef4444' }]} />
            {isConnected ? <Wifi size={12} color="#10b981" /> : <WifiOff size={12} color="#ef4444" />}
            <Text style={{color: isConnected ? '#10b981' : '#ef4444', fontSize: 10, fontWeight: 'bold'}}>
              {isConnected ? " ONLINE" : " OFFLINE"}
            </Text>
             </View>
          </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>TOTAL DETECTIONS TODAY</Text>
          <Text style={styles.statValue}>{logs.filter(l => l.action.includes("Motion")).length}</Text>
        </View>

        <View style={styles.shieldBox}>
          {status === 'SECURE' ? <Shield size={140} color="#10b981" /> : <ShieldAlert size={140} color="#ef4444" />}
          <Text style={[styles.statusText, { color: status === 'SECURE' ? '#10b981' : '#ef4444' }]}>{status}</Text>
        </View>

        <View style={styles.controlRow}>
          <TouchableOpacity style={styles.btnOn} onPress={() => triggerSiren('ON')}>
            <Text style={styles.buttonText}>🚨 SIREN ON</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnOff} onPress={() => triggerSiren('OFF')}>
            <Text style={styles.buttonText}>🛡️ SILENCE</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.tableTitle}>LIVE INCIDENT FEED</Text>
        {logs.map((log) => (
  <View key={log._id} style={styles.logRow}>
    <View>
      <Text style={styles.logTime}>{new Date(log.timestamp).toLocaleTimeString()}</Text>
      <Text style={styles.logEvent}>{log.action}</Text>
    </View>

    {/* 📍 THE FIX: Connect the handleDelete function to the button */}
    <TouchableOpacity 
      onPress={() => handleDelete(log._id)} 
      style={styles.deleteBtn}
    >
      <Trash2 size={18} color="#64748b" />
    </TouchableOpacity>
  </View>
))}
        {/* {logs.map((log) => (
          <View key={log._id} style={styles.logRow}>
            <Text style={styles.logTime}>{new Date(log.timestamp).toLocaleTimeString()}</Text>
            <Text style={styles.logEvent}>{log.action}</Text>
          </View>
        ))} */}
        <View style={{height: 40}} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617', paddingHorizontal: 20 },
  loginContainer: { flex: 1, backgroundColor: '#020617', justifyContent: 'center', padding: 40 },
  loginTitle: { color: '#38bdf8', fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginBottom: 30 },
  input: { backgroundColor: '#1e293b', color: 'white', padding: 20, borderRadius: 15, marginBottom: 15, textAlign: 'center', fontSize: 18 },
  authButton: { backgroundColor: '#0284c7', padding: 20, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  authButtonText: { color: 'white', fontWeight: 'bold', fontSize: 18, textAlign: 'center' },
  header: { marginTop: Platform.OS === 'android' ? 50 : 20, marginBottom: 20 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  exitBtn: { padding: 10 },
  title: { color: '#38bdf8', fontSize: 26, fontWeight: 'bold' },
  connBox: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statCard: { backgroundColor: '#0f172a', padding: 25, borderRadius: 25, alignItems: 'center', marginBottom: 25 },
  statLabel: { color: '#64748b', fontSize: 11, letterSpacing: 2 },
  statValue: { color: 'white', fontSize: 50, fontWeight: '900' },
  shieldBox: { alignItems: 'center', marginVertical: 30 },
  statusText: { fontSize: 36, fontWeight: '900', marginTop: 15, letterSpacing: 2 },
  controlRow: { flexDirection: 'row', gap: 12, marginBottom: 40 },
  btnOn: { flex: 1, backgroundColor: '#ef4444', padding: 22, borderRadius: 18, alignItems: 'center' },
  btnOff: { flex: 1, backgroundColor: '#10b981', padding: 22, borderRadius: 18, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  tableTitle: { color: '#38bdf8', fontSize: 14, fontWeight: 'bold', marginBottom: 15, letterSpacing: 1 },
  logRow: { backgroundColor: '#0f172a', padding: 20, borderRadius: 15, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logTime: { color: '#64748b', fontSize: 12, marginBottom: 4 },
   deleteBtn: { padding: 10, marginLeft: 10 },
  logEvent: { color: 'white', fontSize: 14, fontWeight: 'bold' }
});