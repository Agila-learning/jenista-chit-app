import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Alert,
  RefreshControl,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { formatDate } from '../../utils/format';
import {
  MobileNotificationsManager,
  WebsiteLead,
} from '../../services/notificationsData';
import { DataSyncManager } from '../../services/dataSync';
import { secureStorage } from '../../services/storage';

export const LeadsScreen: React.FC = () => {
  const [leads, setLeads] = useState<WebsiteLead[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'NEW' | 'CONVERTED' | 'REJECTED'>('ALL');
  const [refreshing, setRefreshing] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const loadLeads = async () => {
    try {
      const data = await MobileNotificationsManager.getLeads();
      setLeads(data);
    } catch (e) {
      console.warn('Failed to load leads:', e);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadLeads();
  };

  const handleConvertLead = async (lead: WebsiteLead) => {
    setActionInProgress(lead.id);
    try {
      const newCustomerId = `TC-${Math.floor(10000 + Math.random() * 90000)}`;

      // 1. Add to synced_customers
      const customers = await DataSyncManager.getCustomers();
      const newCustomer = {
        id: newCustomerId,
        customerCode: newCustomerId,
        name: lead.fullName,
        mobile: lead.phone,
        email: lead.email || '',
        status: 'ACTIVE',
        kycStatus: 'PENDING',
        totalPaid: 0,
        pending: 0,
        chits: [],
        createdAt: new Date().toISOString(),
      };
      const updatedCustomers = [newCustomer, ...customers.filter((c: any) => c.id !== newCustomerId)];
      await secureStorage.setItem('synced_customers', JSON.stringify(updatedCustomers));

      // 2. Mark Lead as CONVERTED
      await MobileNotificationsManager.updateLeadStatus(lead.id, 'CONVERTED', newCustomerId);

      // 3. Dispatch Notification
      await MobileNotificationsManager.addNotification({
        type: 'NEW_REGISTRATION',
        title: 'Lead Converted to Customer',
        message: `${lead.fullName} (${lead.phone}) was converted to Customer ${newCustomerId}.`,
        targetRole: 'ADMIN',
        metadata: {
          customerId: newCustomerId,
          customerName: lead.fullName,
        },
      });

      await loadLeads();
      Alert.alert(
        'Lead Converted Successfully! 🎉',
        `${lead.fullName} is now registered as customer ${newCustomerId} in your Customer Directory.`
      );
    } catch (e: any) {
      Alert.alert('Conversion Error', e?.message || 'Could not convert lead to customer.');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRejectLead = async (id: string) => {
    setActionInProgress(id);
    try {
      await MobileNotificationsManager.updateLeadStatus(id, 'REJECTED');
      await loadLeads();
      Alert.alert('Lead Rejected', 'Lead marked as rejected.');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not reject lead.');
    } finally {
      setActionInProgress(null);
    }
  };

  const filteredLeads = leads.filter((l) => {
    const q = search.toLowerCase();
    const matchesSearch =
      l.fullName.toLowerCase().includes(q) ||
      l.phone.includes(q) ||
      (l.email && l.email.toLowerCase().includes(q)) ||
      (l.interestedPlan && l.interestedPlan.toLowerCase().includes(q));

    if (statusFilter !== 'ALL' && l.status !== statusFilter) return false;
    return matchesSearch;
  });

  const totalCount = leads.length;
  const newCount = leads.filter((l) => l.status === 'NEW').length;
  const convertedCount = leads.filter((l) => l.status === 'CONVERTED').length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* KPI Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statBox}>
          <Text style={styles.statVal}>{totalCount}</Text>
          <Text style={styles.statLabel}>TOTAL LEADS</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statVal, { color: '#b45309' }]}>{newCount}</Text>
          <Text style={styles.statLabel}>NEW INQUIRIES</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statVal, { color: '#15803d' }]}>{convertedCount}</Text>
          <Text style={styles.statLabel}>CONVERTED</Text>
        </View>
      </View>

      {/* Search Input & Status Filter Pills */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search leads by name, phone, plan..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#94a3b8"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color="#94a3b8" />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.filterPillsRow}>
          {(['ALL', 'NEW', 'CONVERTED', 'REJECTED'] as const).map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.statusPill, statusFilter === s && styles.statusPillActive]}
              onPress={() => setStatusFilter(s)}
            >
              <Text style={[styles.statusPillText, statusFilter === s && styles.statusPillTextActive]}>
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Leads List */}
      <FlatList
        data={filteredLeads}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="people-outline" size={48} color="#94a3b8" />
            <Text style={styles.emptyTitle}>No Website Leads</Text>
            <Text style={styles.emptySubtitle}>Inquiries submitted on the website contact form will appear here.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isNew = item.status === 'NEW';
          const isConverted = item.status === 'CONVERTED';
          const isRejected = item.status === 'REJECTED';
          const isLoading = actionInProgress === item.id;

          return (
            <View style={styles.leadCard}>
              <View style={styles.leadHeaderRow}>
                <View>
                  <Text style={styles.leadName}>{item.fullName}</Text>
                  <Text style={styles.leadTime}>{formatDate(item.submittedAt)}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    isNew
                      ? { backgroundColor: '#fef3c7', borderColor: '#fde68a' }
                      : isConverted
                      ? { backgroundColor: '#dcfce7', borderColor: '#bbf7d0' }
                      : { backgroundColor: '#f1f5f9', borderColor: '#e2e8f0' },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      isNew
                        ? { color: '#b45309' }
                        : isConverted
                        ? { color: '#15803d' }
                        : { color: '#64748b' },
                    ]}
                  >
                    {item.status}
                  </Text>
                </View>
              </View>

              {/* Plan & Contact Details */}
              <View style={styles.detailsBox}>
                <View style={styles.detailItem}>
                  <Ionicons name="layers-outline" size={14} color="#6366f1" />
                  <Text style={styles.detailText}>
                    <strong>Plan:</strong> {item.interestedPlan || 'General Chit Scheme'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.detailItem}
                  onPress={() => Linking.openURL(`tel:${item.phone}`)}
                >
                  <Ionicons name="call-outline" size={14} color="#10b981" />
                  <Text style={[styles.detailText, { color: '#047857', fontWeight: '700' }]}>
                    {item.phone}
                  </Text>
                </TouchableOpacity>
                {item.email && (
                  <View style={styles.detailItem}>
                    <Ionicons name="mail-outline" size={14} color="#64748b" />
                    <Text style={styles.detailText}>{item.email}</Text>
                  </View>
                )}
                {item.message && (
                  <Text style={styles.messageText}>"{item.message}"</Text>
                )}
              </View>

              {/* Actions */}
              {isNew ? (
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={styles.rejectBtn}
                    onPress={() => handleRejectLead(item.id)}
                    disabled={isLoading}
                  >
                    <Text style={styles.rejectBtnText}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.convertBtn}
                    onPress={() => handleConvertLead(item)}
                    disabled={isLoading}
                  >
                    <Ionicons name="person-add" size={14} color={Colors.white} />
                    <Text style={styles.convertBtnText}>
                      {isLoading ? 'Converting...' : 'Convert to Customer'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : isConverted ? (
                <View style={styles.convertedInfoRow}>
                  <Ionicons name="checkmark-circle" size={16} color="#15803d" />
                  <Text style={styles.convertedInfoText}>
                    Converted to Member ID: {item.convertedCustomerId || 'TC-Active'}
                  </Text>
                </View>
              ) : null}
            </View>
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statVal: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.navy.primary,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94a3b8',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  searchContainer: {
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 38,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: '#0f172a',
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
  },
  statusPillActive: {
    backgroundColor: Colors.navy.primary,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  statusPillTextActive: {
    color: Colors.white,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 30,
  },
  leadCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    marginBottom: 12,
  },
  leadHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  leadName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  leadTime: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  detailsBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    gap: 6,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 12,
    color: '#334155',
  },
  messageText: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#64748b',
    marginTop: 4,
    paddingLeft: 4,
    borderLeftWidth: 2,
    borderLeftColor: '#cbd5e1',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  rejectBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
  },
  rejectBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#b91c1c',
  },
  convertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.primary[600],
  },
  convertBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.white,
  },
  convertedInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  convertedInfoText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803d',
  },
});
