import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { Input } from '../../components/common/Input';
import { secureStorage } from '../../services/storage';
import { showAlert } from '../../utils/alert';

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

  // Operational Rules
  const [gracePeriodDays, setGracePeriodDays] = useState('5');
  const [latePenaltyRate, setLatePenaltyRate] = useState('1.5');
  const [foremanCommissionRate, setForemanCommissionRate] = useState('5.0');

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
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
        if (parsed.gracePeriodDays) setGracePeriodDays(String(parsed.gracePeriodDays));
        if (parsed.latePenaltyRate) setLatePenaltyRate(String(parsed.latePenaltyRate));
        if (parsed.foremanCommissionRate) setForemanCommissionRate(String(parsed.foremanCommissionRate));
      }
    } catch (e) {
      console.warn('Failed to load settings:', e);
    }
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
        gracePeriodDays: Number(gracePeriodDays) || 5,
        latePenaltyRate: Number(latePenaltyRate) || 1.5,
        foremanCommissionRate: Number(foremanCommissionRate) || 5.0,
        updatedAt: new Date().toISOString(),
      };
      await secureStorage.setItem('app_system_settings', JSON.stringify(payload));
      showAlert('Settings Saved', 'System configuration and policies have been saved persistently.');
    } catch (e: any) {
      showAlert('Error', e?.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* 1. Organization Profile */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.headerIconBox}>
            <Ionicons name="business" size={18} color={Colors.primary[600]} />
          </View>
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

      {/* 2. KYC & Compliance Policies */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.headerIconBox}>
            <Ionicons name="shield-checkmark" size={18} color={Colors.primary[600]} />
          </View>
          <Text style={styles.cardTitle}>KYC & Compliance Rules</Text>
        </View>

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchTitle}>Aadhaar Card Mandatory</Text>
            <Text style={styles.switchSub}>Require 12-digit Aadhaar for subscriber registration</Text>
          </View>
          <Switch
            value={aadharRequired}
            onValueChange={setAadharRequired}
            trackColor={{ false: Colors.secondary[200], true: Colors.primary[600] }}
          />
        </View>

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchTitle}>PAN Card Mandatory</Text>
            <Text style={styles.switchSub}>Required for chit values exceeding ₹50,000</Text>
          </View>
          <Switch
            value={panRequired}
            onValueChange={setPanRequired}
            trackColor={{ false: Colors.secondary[200], true: Colors.primary[600] }}
          />
        </View>
      </View>

      {/* 3. Operational Chit Fund Rules */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.headerIconBox}>
            <Ionicons name="calculator" size={18} color={Colors.primary[600]} />
          </View>
          <Text style={styles.cardTitle}>Chit Operations & Policies</Text>
        </View>

        <Input
          label="Installment Grace Period (Days)"
          value={gracePeriodDays}
          onChangeText={setGracePeriodDays}
          keyboardType="numeric"
          placeholder="e.g. 5"
        />

        <Input
          label="Late Payment Penalty Rate (% / month)"
          value={latePenaltyRate}
          onChangeText={setLatePenaltyRate}
          keyboardType="numeric"
          placeholder="e.g. 1.5"
        />

        <Input
          label="Foreman Commission Rate (%)"
          value={foremanCommissionRate}
          onChangeText={setForemanCommissionRate}
          keyboardType="numeric"
          placeholder="e.g. 5.0"
        />
      </View>

      {/* 4. Notification Automations */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.headerIconBox}>
            <Ionicons name="notifications" size={18} color={Colors.primary[600]} />
          </View>
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
            trackColor={{ false: Colors.secondary[200], true: Colors.primary[600] }}
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
            trackColor={{ false: Colors.secondary[200], true: Colors.primary[600] }}
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
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="save-outline" size={18} color="#FFFFFF" />
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
  card: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
    shadowColor: Colors.navy.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  headerIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingVertical: 10,
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
    backgroundColor: Colors.primary[600],
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    shadowColor: Colors.primary[700],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  saveAllBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
});
