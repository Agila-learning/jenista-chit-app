import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { secureStorage } from '../../services/storage';
import { DataSyncManager, getActiveBaseUrl } from '../../services/dataSync';

export const SettingsScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  // Organization Info
  const [companyName, setCompanyName] = useState('Jenista Chits Pvt. Ltd.');
  const [cin, setCin] = useState('U67190TZ2020PTC033361');
  const [gstin, setGstin] = useState('33AAAAJ0000A1Z5');
  const [foremanReg, setForemanReg] = useState('FR-TN-2020-0042');
  const [city, setCity] = useState('Thoothukudi');
  const [state, setState] = useState('Tamil Nadu');
  const [email, setEmail] = useState('jenistachits@gmail.com');

  // Policy toggles
  const [aadharRequired, setAadharRequired] = useState(true);
  const [panRequired, setPanRequired] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);

  // Server Connectivity State
  const [activeUrl, setActiveUrl] = useState('');
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [serverStatus, setServerStatus] = useState<'CHECKING' | 'ONLINE' | 'OFFLINE'>('CHECKING');
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [statusText, setStatusText] = useState('Checking connection...');
  const [testingConnection, setTestingConnection] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
    checkConnection();
  }, []);

  const loadSettings = async () => {
    try {
      const saved = await secureStorage.getItem('app_system_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.companyName) setCompanyName(parsed.companyName);
        if (parsed.cin) setCin(parsed.cin);
        if (parsed.gstin) setGstin(parsed.gstin);
        if (parsed.foremanReg) setForemanReg(parsed.foremanReg);
        if (parsed.city) setCity(parsed.city);
        if (parsed.state) setState(parsed.state);
        if (parsed.email) setEmail(parsed.email);
        if (typeof parsed.aadharRequired === 'boolean') setAadharRequired(parsed.aadharRequired);
        if (typeof parsed.panRequired === 'boolean') setPanRequired(parsed.panRequired);
        if (typeof parsed.smsAlerts === 'boolean') setSmsAlerts(parsed.smsAlerts);
        if (typeof parsed.emailAlerts === 'boolean') setEmailAlerts(parsed.emailAlerts);
      }

      const customUrl = await secureStorage.getItem('custom_api_base_url');
      if (customUrl) {
        setCustomUrlInput(customUrl);
      }
    } catch (e) {
      console.warn('Failed to load settings:', e);
    }
  };

  const checkConnection = async () => {
    setTestingConnection(true);
    setServerStatus('CHECKING');
    try {
      const res = await DataSyncManager.testServerConnection();
      setActiveUrl(res.url);
      setLatencyMs(res.latencyMs);
      setStatusText(res.statusText);
      setServerStatus(res.connected ? 'ONLINE' : 'OFFLINE');
    } catch (e: any) {
      setServerStatus('OFFLINE');
      setStatusText(e?.message || 'Connection failed');
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveCustomUrl = async () => {
    if (customUrlInput.trim()) {
      if (!customUrlInput.trim().startsWith('http')) {
        Alert.alert('Invalid URL', 'URL must start with http:// or https://');
        return;
      }
      await secureStorage.setItem('custom_api_base_url', customUrlInput.trim());
      Alert.alert('Backend URL Saved', `Mobile app will now connect to:\n${customUrlInput.trim()}`);
    } else {
      await secureStorage.removeItem('custom_api_base_url');
      Alert.alert('Reset to Auto-Discovery', 'Mobile app will automatically discover the local or live backend.');
    }
    await checkConnection();
  };

  const handleResetUrl = async () => {
    await secureStorage.removeItem('custom_api_base_url');
    setCustomUrlInput('');
    await checkConnection();
    Alert.alert('Auto-Discovery Active', 'Restored default backend discovery.');
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        companyName,
        cin,
        gstin,
        foremanReg,
        city,
        state,
        email,
        aadharRequired,
        panRequired,
        smsAlerts,
        emailAlerts,
        updatedAt: new Date().toISOString(),
      };
      await secureStorage.setItem('app_system_settings', JSON.stringify(payload));
      Alert.alert('Settings Saved', 'System configuration and policies have been saved persistently.');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* 1. BACKEND & MONGODB LIVE CONNECTIVITY CARD */}
      <View style={styles.serverCard}>
        <View style={styles.serverCardHeader}>
          <View style={styles.serverIconBox}>
            <Ionicons name="server" size={20} color={Colors.gold.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.serverTitle}>Backend & Database Connectivity</Text>
            <Text style={styles.serverSubtitle}>Shared Backend for Mobile & Web</Text>
          </View>
          <View
            style={[
              styles.statusPill,
              serverStatus === 'ONLINE'
                ? styles.pillOnline
                : serverStatus === 'OFFLINE'
                ? styles.pillOffline
                : styles.pillChecking,
            ]}
          >
            <View
              style={[
                styles.statusDot,
                serverStatus === 'ONLINE' ? styles.dotOnline : styles.dotOffline,
              ]}
            />
            <Text
              style={[
                styles.statusPillText,
                serverStatus === 'ONLINE' ? styles.textOnline : styles.textOffline,
              ]}
            >
              {serverStatus === 'ONLINE' ? 'ONLINE' : serverStatus === 'OFFLINE' ? 'OFFLINE' : 'PINGING...'}
            </Text>
          </View>
        </View>

        <View style={styles.serverDetailsBox}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Active Server Endpoint:</Text>
            <Text style={styles.detailValue} numberOfLines={1}>
              {activeUrl || 'Resolving...'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Database Engine:</Text>
            <Text style={styles.detailValueHighlight}>MongoDB Atlas Cluster</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Network Latency:</Text>
            <Text style={styles.detailValue}>{latencyMs !== null ? `${latencyMs} ms` : '—'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Health Diagnostic:</Text>
            <Text style={styles.detailValue}>{statusText}</Text>
          </View>
        </View>

        {/* Custom Server Endpoint Input */}
        <View style={styles.customUrlWrap}>
          <Text style={styles.customUrlLabel}>Custom Backend API URL (Optional Override):</Text>
          <View style={styles.urlInputRow}>
            <TextInput
              style={styles.urlInput}
              placeholder="e.g. http://localhost:3000/api/v1"
              placeholderTextColor={Colors.textSecondary}
              value={customUrlInput}
              onChangeText={setCustomUrlInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity style={styles.saveUrlBtn} onPress={handleSaveCustomUrl} activeOpacity={0.8}>
              <Text style={styles.saveUrlBtnText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.serverActionsRow}>
          <TouchableOpacity
            style={styles.testBtn}
            onPress={checkConnection}
            disabled={testingConnection}
            activeOpacity={0.8}
          >
            {testingConnection ? (
              <ActivityIndicator size="small" color="#0B1A30" />
            ) : (
              <>
                <Ionicons name="refresh" size={16} color="#0B1A30" />
                <Text style={styles.testBtnText}>Test Server Connection</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.resetUrlBtn} onPress={handleResetUrl} activeOpacity={0.8}>
            <Text style={styles.resetUrlBtnText}>Auto Detect</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Organization Info */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="business" size={20} color={Colors.gold.primary} />
          <Text style={styles.cardTitle}>Organization Profile</Text>
        </View>

        <Input label="Company Legal Name" value={companyName} onChangeText={setCompanyName} />
        <Input label="Corporate Identity No (CIN)" value={cin} onChangeText={setCin} />
        <Input label="GSTIN Number" value={gstin} onChangeText={setGstin} />
        <Input label="Foreman Registration No" value={foremanReg} onChangeText={setForemanReg} />
        <Input label="Head Office City" value={city} onChangeText={setCity} />
        <Input label="State" value={state} onChangeText={setState} />
        <Input label="Official Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
      </View>

      {/* 3. KYC & Compliance Policies */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="shield-checkmark" size={20} color={Colors.gold.primary} />
          <Text style={styles.cardTitle}>KYC & Compliance Rules</Text>
        </View>

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchTitle}>Aadhaar Card Mandatory</Text>
            <Text style={styles.switchSub}>Require 12-digit Aadhaar for membership</Text>
          </View>
          <Switch
            value={aadharRequired}
            onValueChange={setAadharRequired}
            trackColor={{ false: Colors.secondary[200], true: Colors.gold.primary }}
          />
        </View>

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchTitle}>PAN Card Mandatory</Text>
            <Text style={styles.switchSub}>Required for chit values above ₹50,000</Text>
          </View>
          <Switch
            value={panRequired}
            onValueChange={setPanRequired}
            trackColor={{ false: Colors.secondary[200], true: Colors.gold.primary }}
          />
        </View>
      </View>

      {/* 4. Notifications */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="notifications" size={20} color={Colors.gold.primary} />
          <Text style={styles.cardTitle}>Alert Notifications & Automations</Text>
        </View>

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchTitle}>SMS Due Date Reminders</Text>
            <Text style={styles.switchSub}>Send automated SMS 3 days before due day</Text>
          </View>
          <Switch
            value={smsAlerts}
            onValueChange={setSmsAlerts}
            trackColor={{ false: Colors.secondary[200], true: Colors.gold.primary }}
          />
        </View>

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchTitle}>Email Payment Receipts</Text>
            <Text style={styles.switchSub}>Auto-email PDF copy of voucher upon collection</Text>
          </View>
          <Switch
            value={emailAlerts}
            onValueChange={setEmailAlerts}
            trackColor={{ false: Colors.secondary[200], true: Colors.gold.primary }}
          />
        </View>
      </View>

      <TouchableOpacity
        style={[styles.saveAllBtn, isSaving && { opacity: 0.7 }]}
        onPress={handleSave}
        disabled={isSaving}
        activeOpacity={0.85}
      >
        {isSaving ? (
          <ActivityIndicator size="small" color="#0B1A30" />
        ) : (
          <>
            <Ionicons name="save-outline" size={18} color="#0B1A30" />
            <Text style={styles.saveAllBtnText}>Save All Configuration</Text>
          </>
        )}
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
    gap: 16,
  },

  // Server Connectivity Card
  serverCard: {
    backgroundColor: '#0A1322',
    padding: 18,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(217, 119, 6, 0.35)',
    shadowColor: Colors.gold.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  serverCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  serverIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(217, 119, 6, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  serverTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.white,
  },
  serverSubtitle: {
    fontSize: 11,
    color: Colors.gold.primary,
    marginTop: 1,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  pillOnline: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  pillOffline: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  pillChecking: {
    backgroundColor: 'rgba(217, 119, 6, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.4)',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotOnline: {
    backgroundColor: '#10B981',
  },
  dotOffline: {
    backgroundColor: '#EF4444',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  textOnline: {
    color: '#10B981',
  },
  textOffline: {
    color: '#EF4444',
  },
  serverDetailsBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 12,
    color: Colors.white,
    fontWeight: '700',
    maxWidth: '55%',
  },
  detailValueHighlight: {
    fontSize: 12,
    color: Colors.gold.primary,
    fontWeight: '700',
  },
  customUrlWrap: {
    marginTop: 14,
    gap: 6,
  },
  customUrlLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  urlInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  urlInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    height: 42,
    color: Colors.white,
    fontSize: 13,
  },
  saveUrlBtn: {
    backgroundColor: Colors.gold.primary,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveUrlBtnText: {
    color: '#0B1A30',
    fontSize: 13,
    fontWeight: '800',
  },
  serverActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  testBtn: {
    flex: 1,
    backgroundColor: Colors.gold.primary,
    height: 44,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  testBtnText: {
    color: '#0B1A30',
    fontSize: 13,
    fontWeight: '800',
  },
  resetUrlBtn: {
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetUrlBtnText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },

  // Standard Form Cards
  card: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  switchSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  saveAllBtn: {
    backgroundColor: Colors.gold.primary,
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
    shadowColor: Colors.gold.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveAllBtnText: {
    color: '#0B1A30',
    fontSize: 16,
    fontWeight: '800',
  },
});
