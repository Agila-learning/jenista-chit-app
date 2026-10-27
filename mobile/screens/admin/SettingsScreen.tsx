import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';

export const SettingsScreen: React.FC = () => {
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

  const handleSave = () => {
    Alert.alert('Settings Saved', 'System configuration has been successfully updated.');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Organization Info */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="business" size={20} color={Colors.primary[700]} />
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

      {/* KYC & Compliance Policies */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="shield-checkmark" size={20} color={Colors.success} />
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
            trackColor={{ false: Colors.secondary[200], true: Colors.primary[500] }}
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
            trackColor={{ false: Colors.secondary[200], true: Colors.primary[500] }}
          />
        </View>
      </View>

      {/* Notifications */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="notifications" size={20} color={Colors.warning} />
          <Text style={styles.cardTitle}>Alert Notifications</Text>
        </View>

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchTitle}>SMS Due Date Reminders</Text>
            <Text style={styles.switchSub}>Send automated SMS 3 days before due day</Text>
          </View>
          <Switch
            value={smsAlerts}
            onValueChange={setSmsAlerts}
            trackColor={{ false: Colors.secondary[200], true: Colors.primary[500] }}
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
            trackColor={{ false: Colors.secondary[200], true: Colors.primary[500] }}
          />
        </View>
      </View>

      <Button title="Save Configuration" onPress={handleSave} style={{ marginTop: 8 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondary[50],
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.secondary[200],
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.secondary[900],
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: Colors.secondary[100],
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondary[900],
  },
  switchSub: {
    fontSize: 12,
    color: Colors.secondary[500],
    marginTop: 2,
  },
});
