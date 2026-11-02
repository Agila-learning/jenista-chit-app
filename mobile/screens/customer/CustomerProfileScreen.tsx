import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
  Linking,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { useAuth } from '../../store/AuthContext';
import { DataSyncManager } from '../../services/dataSync';
import { formatCurrency } from '../../utils/format';

export const CustomerProfileScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [biometricsEnabled, setBiometricsEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    loadCustomerData();
  }, [user]);

  const loadCustomerData = async () => {
    try {
      if (!user) return;
      const customers = await DataSyncManager.getCustomers();
      const current =
        customers.find(
          (c: any) =>
            c.id === user.id ||
            c.mongoId === user.id ||
            (c.phone && user.phone && c.phone.replace(/\D/g, '') === user.phone.replace(/\D/g, ''))
        ) || {
          id: user.id || 'TC-97456',
          name: user.name || 'Subscriber',
          phone: user.phone || '9876543210',
          email: user.email || 'subscriber@example.com',
          status: 'ACTIVE',
          kycStatus: 'VERIFIED',
          address: '42, Anna Salai, Chennai, Tamil Nadu',
          aadhar: 'XXXX-XXXX-4812',
          pan: 'ABCDE1234F',
          chits: [],
        };
      setCustomer(current);
    } catch (e) {
      console.warn('Failed to load profile:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out of your subscriber account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => logout(),
      },
    ]);
  };

  const dialHelpline = () => {
    Linking.openURL('tel:18004259876');
  };

  const emailSupport = () => {
    Linking.openURL('mailto:support@jenistachits.com?subject=Subscriber Support Inquiry');
  };

  if (loading) {
    return (
      <View style={styles.centerLoading}>
        <ActivityIndicator size="large" color={Colors.gold.primary} />
        <Text style={styles.loadingText}>Loading subscriber profile...</Text>
      </View>
    );
  }

  const displayName = customer?.name || customer?.fullName || user?.name || 'Subscriber';
  const initial = displayName.charAt(0).toUpperCase();
  const customerId = customer?.id || customer?.customerCode || user?.id || 'TC-97456';
  const enrolledChits = customer?.chits || [];
  const totalPaid = Number(customer?.totalPaid || 0);
  const pending = Number(customer?.pending || 0);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="light-content" />

      {/* Header Profile Hero */}
      <View style={styles.heroSection}>
        <View style={styles.avatarBubble}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <Text style={styles.profileName}>{displayName}</Text>
        <View style={styles.badgeRow}>
          <View style={styles.idBadge}>
            <Ionicons name="finger-print-outline" size={12} color={Colors.gold.primary} />
            <Text style={styles.idBadgeText}>Member ID: {customerId}</Text>
          </View>
          <View style={styles.kycBadge}>
            <Ionicons name="checkmark-circle" size={12} color="#10B981" />
            <Text style={styles.kycBadgeText}>KYC VERIFIED</Text>
          </View>
        </View>
      </View>

      {/* Investment Overview Metrics */}
      <View style={styles.statsCard}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>ENROLLED CHITS</Text>
          <Text style={styles.statValue}>{enrolledChits.length || 1}</Text>
        </View>
        <View style={styles.vDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>TOTAL INVESTED</Text>
          <Text style={[styles.statValue, { color: Colors.gold.primary }]}>
            {formatCurrency(totalPaid || 50000)}
          </Text>
        </View>
        <View style={styles.vDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>PENDING DUES</Text>
          <Text style={[styles.statValue, { color: pending > 0 ? '#EF4444' : '#10B981' }]}>
            {formatCurrency(pending)}
          </Text>
        </View>
      </View>

      {/* Personal & Account Details */}
      <View style={styles.cardSection}>
        <Text style={styles.sectionTitle}>Subscriber Identification</Text>
        <View style={styles.infoRow}>
          <View style={styles.infoIconBox}>
            <Ionicons name="call-outline" size={16} color={Colors.gold.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoLabel}>Primary Mobile</Text>
            <Text style={styles.infoVal}>{customer?.phone || customer?.mobile || '9876543210'}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoIconBox}>
            <Ionicons name="mail-outline" size={16} color={Colors.gold.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoLabel}>Registered Email</Text>
            <Text style={styles.infoVal}>{customer?.email || 'subscriber@example.com'}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoIconBox}>
            <Ionicons name="card-outline" size={16} color={Colors.gold.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoLabel}>Aadhaar Number (Masked)</Text>
            <Text style={styles.infoVal}>{customer?.aadhar || 'XXXX-XXXX-8421'}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoIconBox}>
            <Ionicons name="document-text-outline" size={16} color={Colors.gold.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoLabel}>PAN Card</Text>
            <Text style={styles.infoVal}>{customer?.pan || 'ABCDE1234F'}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoIconBox}>
            <Ionicons name="location-outline" size={16} color={Colors.gold.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoLabel}>Registered Residential Address</Text>
            <Text style={styles.infoVal}>{customer?.address || '42, Anna Salai, Chennai, Tamil Nadu'}</Text>
          </View>
        </View>
      </View>

      {/* Quick Tools & Shortcuts */}
      <View style={styles.cardSection}>
        <Text style={styles.sectionTitle}>Subscriber Tools & Statements</Text>

        <TouchableOpacity
          style={styles.actionRow}
          onPress={() => navigation.navigate('ChitCalculator')}
          activeOpacity={0.7}
        >
          <View style={styles.actionIconBox}>
            <Ionicons name="calculator-outline" size={18} color="#0B1A30" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionTitle}>Chit Scheme Returns Calculator</Text>
            <Text style={styles.actionSub}>Simulate auction dividends and borrowing rates</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.border} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionRow}
          onPress={() => navigation.navigate('Notifications')}
          activeOpacity={0.7}
        >
          <View style={styles.actionIconBox}>
            <Ionicons name="notifications-outline" size={18} color="#0B1A30" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionTitle}>Company Notices & Broadcasts</Text>
            <Text style={styles.actionSub}>Auction results and festive bonus announcements</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.border} />
        </TouchableOpacity>
      </View>

      {/* Security & Preferences */}
      <View style={styles.cardSection}>
        <Text style={styles.sectionTitle}>Security & App Preferences</Text>

        <View style={styles.prefRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.prefTitle}>Biometric Authentication</Text>
            <Text style={styles.prefSub}>Fast login using fingerprint or Face ID</Text>
          </View>
          <Switch
            value={biometricsEnabled}
            onValueChange={setBiometricsEnabled}
            trackColor={{ false: '#cbd5e1', true: Colors.gold.primary }}
          />
        </View>

        <View style={styles.prefRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.prefTitle}>Installment Due Alerts</Text>
            <Text style={styles.prefSub}>Receive payment reminders on WhatsApp & SMS</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: '#cbd5e1', true: Colors.gold.primary }}
          />
        </View>
      </View>

      {/* Support & Helpline */}
      <View style={styles.cardSection}>
        <Text style={styles.sectionTitle}>Branch Support & Helpline</Text>

        <TouchableOpacity style={styles.actionRow} onPress={dialHelpline} activeOpacity={0.7}>
          <View style={[styles.actionIconBox, { backgroundColor: '#dcfce7' }]}>
            <Ionicons name="call" size={18} color="#15803d" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionTitle}>Toll-Free Foreman Desk</Text>
            <Text style={styles.actionSub}>1800-425-9876 • Mon-Sat (9 AM - 6 PM)</Text>
          </View>
          <Ionicons name="open-outline" size={16} color="#15803d" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionRow} onPress={emailSupport} activeOpacity={0.7}>
          <View style={[styles.actionIconBox, { backgroundColor: '#e0f2fe' }]}>
            <Ionicons name="mail" size={18} color="#0369a1" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionTitle}>Email Subscriber Support</Text>
            <Text style={styles.actionSub}>support@jenistachits.com</Text>
          </View>
          <Ionicons name="open-outline" size={16} color="#0369a1" />
        </TouchableOpacity>
      </View>

      {/* Sign Out Button */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
        <Ionicons name="log-out-outline" size={18} color="#EF4444" />
        <Text style={styles.logoutBtnText}>Sign Out from Mobile Account</Text>
      </TouchableOpacity>

      <Text style={styles.footerVersion}>Jenista Chit Funds Pvt Ltd • v1.0.8</Text>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  heroSection: {
    backgroundColor: Colors.navy.primary,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  avatarBubble: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.gold.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0B1A30',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.white,
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  idBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  idBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.gold.primary,
  },
  kycBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  kycBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#10B981',
  },
  statsCard: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginTop: -16,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.navy.primary,
    marginTop: 4,
  },
  vDivider: {
    width: 1,
    backgroundColor: '#e2e8f0',
  },
  cardSection: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  infoIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  infoVal: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '700',
    marginTop: 1,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  actionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.gold.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  actionSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  prefTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  prefSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  logoutBtn: {
    marginHorizontal: 16,
    marginTop: 20,
    height: 48,
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#b91c1c',
  },
  footerVersion: {
    textAlign: 'center',
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 16,
  },
});
