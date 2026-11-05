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
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { useAuth } from '../../store/AuthContext';
import { showConfirmDialog } from '../../utils/alert';
import { DataSyncManager } from '../../services/dataSync';
import { formatCurrency } from '../../utils/format';

export const StaffProfileScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [todayCollected, setTodayCollected] = useState(0);
  const [totalReceipts, setTotalReceipts] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStaffStats();
  }, [user]);

  const loadStaffStats = async () => {
    try {
      const ledger = await DataSyncManager.getLedgerTransactions();
      const credits = ledger.filter((l) => l.type === 'CREDIT');
      setTotalReceipts(credits.length);
      setTodayCollected(credits.reduce((s, l) => s + Number(l.amount || 0), 0));
    } catch (e) {
      console.warn('Failed to load staff profile stats:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    showConfirmDialog('Sign Out', 'Are you sure you want to log out of your field agent account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => logout(),
      },
    ]);
  };

  const displayName = user?.name || 'Field Collection Executive';
  const initial = displayName.charAt(0).toUpperCase();

  if (loading) {
    return (
      <View style={styles.centerLoading}>
        <ActivityIndicator size="large" color={Colors.gold.primary} />
      </View>
    );
  }

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
          <View style={styles.roleBadge}>
            <Ionicons name="shield-checkmark" size={12} color="#0B1A30" />
            <Text style={styles.roleBadgeText}>FIELD AGENT • BRANCH 01</Text>
          </View>
        </View>
      </View>

      {/* Collection Stats Card */}
      <View style={styles.statsCard}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>TODAY'S INFLOW</Text>
          <Text style={[styles.statValue, { color: Colors.gold.primary }]}>
            {formatCurrency(todayCollected)}
          </Text>
        </View>
        <View style={styles.vDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>VOUCHERS ISSUED</Text>
          <Text style={styles.statValue}>{totalReceipts}</Text>
        </View>
      </View>

      {/* Staff Operational Details */}
      <View style={styles.cardSection}>
        <Text style={styles.sectionTitle}>Agent Official Credentials</Text>

        <View style={styles.infoRow}>
          <Ionicons name="id-card-outline" size={18} color={Colors.gold.primary} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.infoLabel}>Employee ID</Text>
            <Text style={styles.infoVal}>EMP-{user?.id?.slice(-5) || '94810'}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="business-outline" size={18} color={Colors.gold.primary} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.infoLabel}>Base Branch Office</Text>
            <Text style={styles.infoVal}>Main Branch, Mount Road, Chennai</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="call-outline" size={18} color={Colors.gold.primary} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.infoLabel}>Registered Mobile</Text>
            <Text style={styles.infoVal}>{user?.phone || '9840192834'}</Text>
          </View>
        </View>
      </View>

      {/* Field Operations Shortcuts */}
      <View style={styles.cardSection}>
        <Text style={styles.sectionTitle}>Field Operations Tools</Text>

        <TouchableOpacity
          style={styles.actionRow}
          onPress={() => navigation.navigate('ReceiptEntry')}
          activeOpacity={0.7}
        >
          <View style={styles.actionIconBox}>
            <Ionicons name="receipt-outline" size={18} color="#0B1A30" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionTitle}>Issue Instant Digital Receipt</Text>
            <Text style={styles.actionSub}>Collect cash/UPI and share voucher via WhatsApp</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.border} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionRow}
          onPress={() => navigation.navigate('Reports')}
          activeOpacity={0.7}
        >
          <View style={styles.actionIconBox}>
            <Ionicons name="alert-circle-outline" size={18} color="#0B1A30" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionTitle}>Assigned Defaulters Queue</Text>
            <Text style={styles.actionSub}>Follow up with overdue subscribers on your route</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.border} />
        </TouchableOpacity>
      </View>

      {/* Sign Out Button */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
        <Ionicons name="log-out-outline" size={18} color="#EF4444" />
        <Text style={styles.logoutBtnText}>Sign Out from Field Agent App</Text>
      </TouchableOpacity>

      <Text style={styles.footerVersion}>Jenista Field Force App • v1.0.8</Text>
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
  },
  heroSection: {
    backgroundColor: Colors.navy.primary,
    paddingVertical: 26,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  avatarBubble: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.gold.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0B1A30',
  },
  profileName: {
    fontSize: 19,
    fontWeight: '800',
    color: Colors.white,
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: 'row',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.gold.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0B1A30',
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
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
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
