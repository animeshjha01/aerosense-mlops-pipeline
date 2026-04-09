import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal, SafeAreaView, StatusBar, TextInput, ActivityIndicator, Platform } from 'react-native';
import { useTelemetry } from './useTelemetry';
import { Audio } from 'expo-av';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function App() {
  const { telemetry, mode, setMode, scenario, setScenario, backendResponse } = useTelemetry();
  
  // App State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSecurityChecking, setIsSecurityChecking] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [alertVisible, setAlertVisible] = useState(false);
  const [sound, setSound] = useState();
  
  // NEW: State to prevent button spamming
  const [isResolving, setIsResolving] = useState(false);

  // Bluetooth Fake State
  const [isScanning, setIsScanning] = useState(true);
  const [discoveredDevice, setDiscoveredDevice] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [btError, setBtError] = useState(null);

  // Theming Colors 
  const theme = {
    bg: isDarkMode ? '#050505' : '#F5F7FA',
    card: isDarkMode ? '#121212' : '#FFFFFF',
    text: isDarkMode ? '#FFFFFF' : '#1A1A1A',
    subtext: isDarkMode ? '#888888' : '#666666',
    border: isDarkMode ? '#2A2A2A' : '#E5E7EB',
    accent: '#00FF9D',
    danger: '#FF2A55',
    inputBg: isDarkMode ? '#1A1A1A' : '#F3F4F6'
  };

  // --- AUDIO ALERT SYSTEM ---
  async function playAlertSound() {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('./assets/warning.mp3'), 
        { shouldPlay: true, volume: 1.0, isLooping: true } 
      );
      setSound(sound);
    } catch (error) {
      console.log("Audio play error", error);
    }
  }

  useEffect(() => {
    return sound ? () => { sound.unloadAsync(); } : undefined;
  }, [sound]);

  // Monitor backend for anomalies
  useEffect(() => {
    if (backendResponse?.prediction === 'Anomaly' && !alertVisible) {
      setAlertVisible(true);
      playAlertSound();
    } else if (backendResponse?.prediction !== 'Anomaly') {
      setAlertVisible(false);
      setIsResolving(false); // Reset the button spinner when the cloud clears the error
      if (sound) {
        sound.stopAsync(); 
      }
    }
  }, [backendResponse, sound]);

  // --- MODAL ACTION ---
  const handleAcknowledge = () => {
    setIsResolving(true); // Lock the button and show spinner
    setScenario('NORMAL'); // Tell the backend the issue is fixed
  };

  // --- NAVIGATION & FAKE BLUETOOTH LOGIC ---
  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const switchToSimulator = () => {
    setIsSecurityChecking(true);
    setTimeout(() => {
      setIsSecurityChecking(false);
      setMode('DEMO');
      setScenario('NORMAL');
    }, 2000);
  };

  useEffect(() => {
    if (mode === 'BLUETOOTH') {
      setIsScanning(true);
      setDiscoveredDevice(null);
      setBtError(null);
      
      const scanTimer = setTimeout(() => {
        setIsScanning(false);
        setDiscoveredDevice({ name: 'OBDII-ELM327', mac: '00:1D:A5:68:98:8A' });
      }, 3500); 
      
      return () => clearTimeout(scanTimer);
    }
  }, [mode]);

  const handleFakeConnect = () => {
    setIsConnecting(true);
    setBtError(null);
    setTimeout(() => {
      setIsConnecting(false);
      setBtError("Connection Failed: ECU Handshake Timeout. Ensure vehicle ignition is ON and scanner is seated.");
    }, 2500);
  };

  // --- REUSABLE UI COMPONENTS ---
  const MetricCard = ({ title, value, unit, isCritical, icon, iconFamily }) => (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: isCritical ? theme.danger : theme.border }]}>
      <View style={styles.cardHeader}>
        {iconFamily === 'Material' ? (
          <MaterialCommunityIcons name={icon} size={18} color={isCritical ? theme.danger : theme.subtext} />
        ) : (
          <Ionicons name={icon} size={18} color={isCritical ? theme.danger : theme.subtext} />
        )}
        <Text style={[styles.cardTitle, { color: theme.subtext, marginLeft: 6 }]}>{title}</Text>
      </View>
      <View style={styles.cardValueContainer}>
        <Text style={[styles.cardValue, { color: isCritical ? theme.danger : theme.text }]}>
          {typeof value === 'number' ? value.toFixed(1) : value}
        </Text>
        <Text style={[styles.cardUnit, { color: theme.subtext }]}>{unit}</Text>
      </View>
    </View>
  );

  // --- SCREENS ---
  if (!isLoggedIn) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg, justifyContent: 'center' }]}>
        <View style={{ padding: 30 }}>
          <Ionicons name="car-sport" size={60} color={theme.accent} style={{ alignSelf: 'center', marginBottom: 10 }} />
          <Text style={[styles.logo, { fontSize: 36, textAlign: 'center', marginBottom: 40, color: theme.text }]}>
            AeroSense<Text style={styles.logoAccent}>.AI</Text>
          </Text>
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color={theme.subtext} style={styles.inputIcon} />
            <TextInput style={[styles.input, { color: theme.text }]} placeholder="Driver ID" placeholderTextColor={theme.subtext} />
          </View>
          <View style={[styles.inputContainer, { marginTop: 15 }]}>
            <Ionicons name="lock-closed-outline" size={20} color={theme.subtext} style={styles.inputIcon} />
            <TextInput style={[styles.input, { color: theme.text }]} secureTextEntry placeholder="Encryption PIN" placeholderTextColor={theme.subtext} />
          </View>
          <TouchableOpacity style={[styles.loginBtn, { marginTop: 40, shadowColor: theme.accent, shadowOpacity: 0.3, shadowRadius: 10 }]} onPress={handleLogin}>
            <Text style={{ color: '#000', fontWeight: '900', fontSize: 16, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1 }}>Initialize System</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (isSecurityChecking) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.accent} />
        <Text style={{ color: theme.text, marginTop: 25, fontSize: 18, fontWeight: 'bold' }}>Authenticating Developer Key...</Text>
        <Text style={{ color: theme.subtext, marginTop: 10 }}>Bypassing OBD-II handshake protocol.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={theme.bg} />
      
      {/* HEADER */}
      <View style={[styles.header, { borderColor: theme.border }]}>
        <Text style={[styles.logo, { color: theme.text, fontSize: 20 }]}>AeroSense<Text style={styles.logoAccent}>.AI</Text></Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => setIsDarkMode(!isDarkMode)} style={{ marginRight: 15 }}>
            <Ionicons name={isDarkMode ? "sunny" : "moon"} size={22} color={theme.subtext} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.modeToggle, { backgroundColor: theme.card, borderColor: theme.border }]} 
            onPress={() => mode === 'DEMO' ? setMode('BLUETOOTH') : switchToSimulator()}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.statusDot, { backgroundColor: mode === 'DEMO' ? theme.accent : '#007AFF' }]} />
              <Text style={[styles.modeText, { color: theme.text }]}>
                {mode === 'DEMO' ? 'SIMULATOR' : 'BLUETOOTH'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* BLUETOOTH PAIRING DASHBOARD */}
        {mode === 'BLUETOOTH' && (
          <View>
             <View style={[styles.healthSection, { backgroundColor: theme.card, borderColor: theme.border, paddingVertical: 40 }]}>
               {isScanning ? (
                 <>
                   <ActivityIndicator size="large" color="#007AFF" style={{ marginBottom: 20 }} />
                   <Text style={[styles.healthLabel, { color: theme.text }]}>Scanning Telemetry Network...</Text>
                   <Text style={{ color: theme.subtext, textAlign: 'center', marginTop: 10 }}>Listening for ELM327 Bluetooth broadcasts.</Text>
                 </>
               ) : (
                 <>
                   <Ionicons name="bluetooth" size={40} color="#007AFF" style={{ marginBottom: 15 }} />
                   <Text style={[styles.healthLabel, { color: theme.text }]}>Scan Complete</Text>
                   <Text style={{ color: theme.subtext, textAlign: 'center', marginTop: 10 }}>1 compatible diagnostic port found.</Text>
                 </>
               )}
             </View>

             {!isScanning && discoveredDevice && (
               <>
                 <Text style={[styles.demoTitle, { color: theme.subtext, textAlign: 'left', marginTop: 20, marginBottom: 10, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }]}>Available Devices</Text>
                 
                 <View style={[styles.deviceListCard, { backgroundColor: theme.card, borderColor: isConnecting ? '#007AFF' : theme.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.text, fontSize: 16, fontWeight: 'bold' }}>{discoveredDevice.name}</Text>
                      <Text style={{ color: theme.subtext, fontSize: 12, marginTop: 4 }}>MAC: {discoveredDevice.mac}</Text>
                    </View>
                    
                    <TouchableOpacity 
                      style={[styles.connectBtn, { backgroundColor: isConnecting ? 'transparent' : '#007AFF' }]}
                      onPress={handleFakeConnect}
                      disabled={isConnecting}
                    >
                      {isConnecting ? (
                         <ActivityIndicator size="small" color="#007AFF" />
                      ) : (
                         <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12 }}>CONNECT</Text>
                      )}
                    </TouchableOpacity>
                 </View>

                 {btError && (
                   <View style={{ marginTop: 15, padding: 15, backgroundColor: 'rgba(255, 42, 85, 0.1)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255, 42, 85, 0.3)' }}>
                     <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                       <Ionicons name="warning" size={20} color={theme.danger} />
                       <Text style={{ color: theme.danger, fontWeight: 'bold', marginLeft: 10 }}>Connection Refused</Text>
                     </View>
                     <Text style={{ color: theme.text, marginTop: 8, fontSize: 13, lineHeight: 20 }}>{btError}</Text>
                   </View>
                 )}
               </>
             )}
          </View>
        )}

        {/* SIMULATOR DASHBOARD */}
        {mode === 'DEMO' && (
          <>
            <View style={[styles.healthSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.healthLabel, { color: theme.subtext }]}>Powertrain Health</Text>
              <Text style={[styles.healthScore, backendResponse?.prediction === 'Anomaly' ? { color: theme.danger } : { color: theme.accent }]}>
                {backendResponse?.prediction === 'Anomaly' ? 'CRITICAL' : '100%'}
              </Text>
              <Text style={[styles.healthSubtext, { color: theme.subtext }]}>
                {backendResponse?.prediction === 'Anomaly' ? 'Imminent hardware failure predicted by ML Engine.' : 'All systems nominal. ML model predicting safe operation.'}
              </Text>
            </View>

            <View style={styles.grid}>
              <MetricCard title="Engine RPM" value={telemetry.RPM} unit="RPM" isCritical={telemetry.RPM > 5000} icon="speedometer-outline" iconFamily="Ionicons" />
              <MetricCard title="Speed" value={telemetry.Speed} unit="mph" isCritical={false} icon="car-sport-outline" iconFamily="Ionicons" />
              <MetricCard title="Coolant Temp" value={telemetry.Temperature} unit="°C" isCritical={telemetry.Temperature > 105} icon="thermometer-outline" iconFamily="Ionicons" />
              <MetricCard title="Oil Pressure" value={telemetry.Pressure} unit="PSI" isCritical={telemetry.Pressure < 20} icon="water-outline" iconFamily="Ionicons" />
              <MetricCard title="Vibration" value={telemetry.Vibration} unit="g" isCritical={telemetry.Vibration > 3.0} icon="pulse-outline" iconFamily="Ionicons" />
              <MetricCard title="Battery" value={telemetry.Battery_Voltage} unit="V" isCritical={telemetry.Battery_Voltage < 12.0} icon="car-battery" iconFamily="Material" />
            </View>

            <View style={[styles.demoControls, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                <Ionicons name="flask" size={18} color={theme.subtext} style={{ marginRight: 8 }} />
                <Text style={[styles.demoTitle, { color: theme.text, marginBottom: 0 }]}>ML Scenario Testing</Text>
              </View>
              
              <View style={styles.buttonRow}>
                <TouchableOpacity style={[styles.demoBtn, scenario === 'NORMAL' && { backgroundColor: theme.accent }]} onPress={() => setScenario('NORMAL')}><Text style={[styles.demoBtnText, scenario === 'NORMAL' && {color: '#000'}]}>Normal</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.demoBtn, scenario === 'OVERHEATING' && { backgroundColor: theme.danger }]} onPress={() => setScenario('OVERHEATING')}><Text style={styles.demoBtnText}>Overheat</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.demoBtn, scenario === 'COLD_START_ABUSE' && { backgroundColor: theme.danger }]} onPress={() => setScenario('COLD_START_ABUSE')}><Text style={styles.demoBtnText}>Cold Start</Text></TouchableOpacity>
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity style={[styles.demoBtn, scenario === 'TRANSMISSION_SLIP' && { backgroundColor: theme.danger }]} onPress={() => setScenario('TRANSMISSION_SLIP')}><Text style={styles.demoBtnText}>Gear Slip</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.demoBtn, scenario === 'OIL_LEAK' && { backgroundColor: theme.danger }]} onPress={() => setScenario('OIL_LEAK')}><Text style={styles.demoBtnText}>Oil Leak</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.demoBtn, scenario === 'BATTERY_DRAIN' && { backgroundColor: theme.danger }]} onPress={() => setScenario('BATTERY_DRAIN')}><Text style={styles.demoBtnText}>Alt. Fail</Text></TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* RAG AI ALERT MODAL */}
      <Modal visible={alertVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
              <Ionicons name="warning" size={30} color="#FFF" style={{ marginRight: 10 }} />
              <Text style={styles.modalWarningTitle}>AI DIAGNOSTIC ALERT</Text>
            </View>
            
            <View style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: 15, borderRadius: 10, marginBottom: 25 }}>
              {backendResponse?.recommended_fixes?.map((fix, index) => (
                <Text key={index} style={styles.modalText}>• {fix}</Text>
              ))}
            </View>
            
            <TouchableOpacity 
              style={[styles.dismissBtn, isResolving && { opacity: 0.8 }]} 
              onPress={handleAcknowledge}
              disabled={isResolving}
            >
              {isResolving ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 10 }} />
                  <Text style={styles.dismissBtnText}>RESOLVING...</Text>
                </View>
              ) : (
                <Text style={styles.dismissBtnText}>ACKNOWLEDGE & RESOLVE</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    paddingBottom: Platform.OS === 'android' ? 20 : 0 
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1 },
  logo: { fontSize: 24, fontWeight: '900', letterSpacing: 0.5 },
  logoAccent: { color: '#00FF9D' },
  modeToggle: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  modeText: { fontSize: 11, fontWeight: 'bold', letterSpacing: 1 },
  scrollContent: { padding: 20, paddingBottom: 50 },
  
  // Login Styles
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', borderRadius: 12, borderWidth: 1, borderColor: '#333' },
  inputIcon: { paddingHorizontal: 15 },
  input: { flex: 1, paddingVertical: 18, fontSize: 16 },
  loginBtn: { backgroundColor: '#00FF9D', padding: 18, borderRadius: 12 },
  
  // Bluetooth Fixes
  deviceListCard: { width: '100%', padding: 18, borderRadius: 15, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  connectBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20 },
  
  // Dashboard Styles
  healthSection: { alignItems: 'center', marginBottom: 25, padding: 25, borderRadius: 20, borderWidth: 1 },
  healthLabel: { fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 2 },
  healthScore: { fontSize: 56, fontWeight: '900', marginVertical: 5 },
  healthSubtext: { fontSize: 13, textAlign: 'center', lineHeight: 20 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { width: '48%', padding: 18, borderRadius: 18, marginBottom: 15, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  cardValueContainer: { flexDirection: 'row', alignItems: 'baseline' },
  cardValue: { fontSize: 26, fontWeight: '900' },
  cardUnit: { fontSize: 13, marginLeft: 4, fontWeight: '600' },

  demoControls: { marginTop: 10, padding: 20, borderRadius: 20, borderWidth: 1 },
  demoTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  demoBtn: { flex: 1, backgroundColor: '#222', paddingVertical: 14, borderRadius: 10, marginHorizontal: 4, alignItems: 'center' },
  demoBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FF2A55', padding: 30, borderTopLeftRadius: 35, borderTopRightRadius: 35, paddingBottom: 50 },
  modalWarningTitle: { color: '#FFF', fontSize: 20, fontWeight: '900', letterSpacing: 1 },
  modalText: { color: '#FFF', fontSize: 15, fontWeight: '600', marginBottom: 12, lineHeight: 22 },
  dismissBtn: { backgroundColor: '#000', padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 10, justifyContent: 'center' },
  dismissBtnText: { color: '#FFF', fontWeight: '900', fontSize: 14, letterSpacing: 1 }
});