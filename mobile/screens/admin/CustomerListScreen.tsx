import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Alert,
  TextInput,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { DataSyncManager, customerBelongsToScheme } from '../../services/dataSync';
import { formatCurrency } from '../../utils/format';
import { Customer } from '../../types';
import { showConfirmDialog, showAlert } from '../../utils/alert';

export const CustomerListScreen: React.FC<{ route?: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterTab, setFilterTab] = useState<'ALL' | 'PAID' | 'PENDING'>('ALL');
  const [schemeFilter, setSchemeFilter] = useState<'ALL' | 'FIXED' | 'REGULAR' | 'AUCTION'>(
    route?.params?.schemeFilter || 'ALL'
  );

  useEffect(() => {
    if (route?.params?.schemeFilter) {
      setSchemeFilter(route.params.schemeFilter);
    }
  }, [route?.params?.schemeFilter]);

  const fetchCustomers = async () => {
    try {
      const data = await DataSyncManager.getCustomers();
      setCustomers(data);
    } catch (e) {
      console.warn('Could not fetch customers:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCustomers();
  };

  const paidCount = customers.filter((c) => Number(c.pending || 0) <= 0).length;
  const pendingCount = customers.filter((c) => Number(c.pending || 0) > 0).length;

  const fixedCount = customers.filter((c) => customerBelongsToScheme(c, 'FIXED')).length;
  const regularCount = customers.filter((c) => customerBelongsToScheme(c, 'REGULAR')).length;
  const auctionCount = customers.filter((c) => customerBelongsToScheme(c, 'AUCTION')).length;

  const totalOverdue = customers.reduce((sum, c) => sum + (Number(c.pending) || 0), 0);

  const filteredCustomers = customers.filter((c) => {
    const q = search.toLowerCase();
    const matchesSearch =
      c.name.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q)) ||
      c.id.toLowerCase().includes(q);

    const hasDues = Number(c.pending || 0) > 0;
    const matchesStatus =
      filterTab === 'ALL' ? true : filterTab === 'PAID' ? !hasDues : hasDues;

    // Filter by scheme using unified function
    const matchesScheme = customerBelongsToScheme(c, schemeFilter);

    return matchesSearch && matchesStatus && matchesScheme;
  });

  const handleCall = (phone?: string) => {
    if (!phone) return;
    const clean = phone.replace(/[^\d+]/g, '');
    Linking.openURL(`tel:${clean}`).catch(() => {
      showAlert('Notice', `Unable to make phone call to ${clean}`);
    });
  };

  const handleWhatsApp = (phone?: string) => {
    if (!phone) return;
    const clean = phone.replace(/[^\d]/g, '');
    const target = clean.length === 10 ? `91${clean}` : clean;
    Linking.openURL(`https://wa.me/${target}?text=Hello%20from%20Jenista%20Chits`).catch(() => {
      showAlert('Notice', 'Unable to open WhatsApp messenger');
    });
  };

  const handleDeleteCustomer = (cust: Customer) => {
    showConfirmDialog(
      'Delete Customer',
      `Permanently delete member "${cust.name}" (${cust.id})? All active chits, payment requests, receipts, and ledger records for this member will also be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            try {
              await DataSyncManager.deleteCustomer({
                id: cust.id,
                mongoId: cust.mongoId,
                phone: cust.phone || cust.mobile,
                name: cust.name,
              });
              setCustomers((prev) => prev.filter((c) => c.id !== cust.id));
              showAlert('Deleted', `Customer "${cust.name}" was permanently removed.`);
            } catch (err: any) {
              showAlert('Error', err?.message || 'Failed to delete customer');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: Customer }) => {
    const pendingAmount = Number(item.pending || 0);
    const paidAmount = Number(item.totalPaid || 0);
    const hasActiveChits = Array.isArray(item.chits) && item.chits.length > 0;
    const hasDues = pendingAmount > 0;
    const initial = (item.name || 'M').charAt(0).toUpperCase();

    // Alternate avatar pastel background
    const avatarBgs = ['#FFECC2', '#FCE7F3', '#E0F2FE', '#EDE9FE', '#FEF3C7'];
    const charCode = initial.charCodeAt(0) || 0;
    const bg = avatarBgs[charCode % avatarBgs.length];

    const displayAmount = hasDues
      ? formatCurrency(pendingAmount)
      : paidAmount > 0
      ? formatCurrency(paidAmount)
      : '₹0';

    const statusText = hasDues
      ? 'Pending'
      : paidAmount > 0
      ? 'Paid'
      : hasActiveChits
      ? 'Enrolled'
      : 'No Chits';

    const pillStyle = hasDues
      ? styles.pillPending
      : paidAmount > 0
      ? styles.pillPaid
      : styles.pillNeutral;

    const pillTextStyle = hasDues
      ? styles.textPending
      : paidAmount > 0
      ? styles.textPaid
      : styles.textNeutral;

    const rawSch = String(item.scheme || item.chits?.[0]?.scheme || 'REGULAR').toUpperCase();
    const schemeUpper = rawSch.includes('FIX') ? 'FIXED' : rawSch.includes('AUC') ? 'AUCTION' : 'REGULAR';
    const schemeLabel = schemeUpper === 'FIXED' ? 'Fixed' : schemeUpper === 'REGULAR' ? 'Regular' : 'Auction';
    const groupName = item.interestedPlan || item.chits?.[0]?.groupName || `${schemeLabel} Plan`;
    const schemeIcon =
      schemeUpper === 'FIXED'
        ? 'shield-checkmark'
        : schemeUpper === 'REGULAR'
        ? 'trending-up'
        : 'hammer';

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.75}
        onPress={() => navigation.navigate('CustomerDetail', { customer: item })}
      >
        <View style={styles.cardHeaderRow}>
          {/* Avatar Bubble */}
          <View style={[styles.avatarBubble, { backgroundColor: bg }]}>
            <Text style={styles.avatarBubbleText}>{initial}</Text>
          </View>

          {/* Member Details */}
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.memberName} numberOfLines={1}>{item.name}</Text>
            <View style={styles.groupSchemeRow}>
              <View style={styles.schemeTagPill}>
                <Ionicons name={schemeIcon} size={11} color="#2563EB" />
                <Text style={styles.schemeTagText} numberOfLines={1}>
                  {groupName.toUpperCase().includes(schemeLabel.toUpperCase()) ? groupName : `${schemeLabel} • ${groupName}`}
                </Text>
              </View>
              <Text style={styles.memberIdText}>• {item.id}</Text>
            </View>
          </View>

          {/* Financial Status */}
          <View style={{ alignItems: 'flex-end', marginLeft: 8 }}>
            <Text
              style={[
                styles.dueAmountText,
                hasDues ? { color: '#DC2626' } : paidAmount > 0 ? { color: '#059669' } : { color: '#64748B' },
              ]}
            >
              {displayAmount}
            </Text>
            <View style={[styles.statusPill, pillStyle]}>
              <Text style={[styles.statusPillText, pillTextStyle]}>
                {statusText}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Contact & Action Footer on Card */}
        <View style={styles.cardFooterDivider} />
        <View style={styles.cardFooterRow}>
          <TouchableOpacity
            style={styles.quickContactBtn}
            onPress={() => handleCall(item.phone || item.mobile)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="call" size={13} color="#2563EB" />
            <Text style={styles.quickContactText}>
              {item.phone || item.mobile || 'No Mobile'}
            </Text>
          </TouchableOpacity>

          <View style={styles.cardActionsRight}>
            {(item.phone || item.mobile) && (
              <TouchableOpacity
                style={styles.waBtn}
                onPress={() => handleWhatsApp(item.phone || item.mobile)}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="logo-whatsapp" size={15} color="#16A34A" />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.trashBtn}
              onPress={() => handleDeleteCustomer(item)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={15} color="#EF4444" />
            </TouchableOpacity>

            <View style={styles.chevronWrap}>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Modern Search & Add Member Header */}
      <View style={styles.searchSection}>
        <View style={styles.searchBarContainer}>
          <Ionicons name="search" size={18} color="#64748B" style={{ marginLeft: 12 }} />
          <TextInput
            placeholder="Search members by name or mobile..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} style={{ padding: 6, marginRight: 6 }}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.addMemberBtn}
          onPress={() => navigation.navigate('AddCustomer')}
          activeOpacity={0.8}
        >
          <Ionicons name="person-add" size={16} color="#FFFFFF" />
          <Text style={styles.addMemberBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Tier 1: Scheme Selector Pills (Horizontally Scrollable) */}
      <View style={styles.schemeTabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.schemeTabsContent}>
          <TouchableOpacity
            style={[styles.schemeTabPill, schemeFilter === 'ALL' && styles.schemeTabPillActive]}
            onPress={() => setSchemeFilter('ALL')}
            activeOpacity={0.8}
          >
            <Ionicons name="apps" size={13} color={schemeFilter === 'ALL' ? '#FFFFFF' : '#64748B'} />
            <Text style={[styles.schemeTabText, schemeFilter === 'ALL' && styles.schemeTabTextActive]}>
              All Schemes ({customers.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.schemeTabPill, schemeFilter === 'FIXED' && styles.schemeTabPillActiveFixed]}
            onPress={() => setSchemeFilter('FIXED')}
            activeOpacity={0.8}
          >
            <Ionicons name="shield-checkmark" size={13} color={schemeFilter === 'FIXED' ? '#FFFFFF' : '#D97706'} />
            <Text style={[styles.schemeTabText, schemeFilter === 'FIXED' && styles.schemeTabTextActive]}>
              Fixed ({fixedCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.schemeTabPill, schemeFilter === 'REGULAR' && styles.schemeTabPillActiveRegular]}
            onPress={() => setSchemeFilter('REGULAR')}
            activeOpacity={0.8}
          >
            <Ionicons name="trending-up" size={13} color={schemeFilter === 'REGULAR' ? '#FFFFFF' : '#059669'} />
            <Text style={[styles.schemeTabText, schemeFilter === 'REGULAR' && styles.schemeTabTextActive]}>
              Regular ({regularCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.schemeTabPill, schemeFilter === 'AUCTION' && styles.schemeTabPillActiveAuction]}
            onPress={() => setSchemeFilter('AUCTION')}
            activeOpacity={0.8}
          >
            <Ionicons name="hammer" size={13} color={schemeFilter === 'AUCTION' ? '#FFFFFF' : '#7C3AED'} />
            <Text style={[styles.schemeTabText, schemeFilter === 'AUCTION' && styles.schemeTabTextActive]}>
              Auction ({auctionCount})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Tier 2: Payment Status Segmented Control */}
      <View style={styles.statusSegmentRow}>
        <View style={styles.segmentedControl}>
          {(['ALL', 'PAID', 'PENDING'] as const).map((tab) => {
            const active = filterTab === tab;
            const count = tab === 'ALL' ? customers.length : tab === 'PAID' ? paidCount : pendingCount;
            const label = tab === 'ALL' ? 'All' : tab === 'PAID' ? 'Paid' : 'Pending';
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                onPress={() => setFilterTab(tab)}
                activeOpacity={0.8}
              >
                <Text style={[styles.segmentBtnText, active && styles.segmentBtnTextActive]}>
                  {label} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {pendingCount > 0 && (
          <View style={styles.totalOverduePill}>
            <Text style={styles.totalOverdueText}>
              Overdue: {formatCurrency(totalOverdue)}
            </Text>
          </View>
        )}
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
        <FlatList
          data={filteredCustomers}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#2563EB"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No Members Found</Text>
              <Text style={styles.emptySub}>
                {search ? `No members matching "${search}"` : 'No customers enrolled under this scheme.'}
              </Text>
              {search.length > 0 && (
                <TouchableOpacity
                  style={styles.clearSearchBtn}
                  onPress={() => setSearch('')}
                >
                  <Text style={styles.clearSearchBtnText}>Clear Search</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  searchBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '500',
    paddingHorizontal: 10,
  },
  addMemberBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563EB',
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 14,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  addMemberBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  schemeTabsContainer: {
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  schemeTabsContent: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: 'row',
  },
  schemeTabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  schemeTabPillActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  schemeTabPillActiveFixed: {
    backgroundColor: '#D97706',
    borderColor: '#D97706',
  },
  schemeTabPillActiveRegular: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  schemeTabPillActiveAuction: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  schemeTabText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748B',
  },
  schemeTabTextActive: {
    color: '#FFFFFF',
  },
  statusSegmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    gap: 10,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    padding: 3,
    borderRadius: 12,
  },
  segmentBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9,
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748B',
  },
  segmentBtnTextActive: {
    color: '#0F172A',
  },
  totalOverduePill: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  totalOverdueText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 110,
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarBubble: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBubbleText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1E293B',
  },
  memberName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  groupSchemeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  schemeTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    maxWidth: 160,
  },
  schemeTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  memberIdText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  dueAmountText: {
    fontSize: 15,
    fontWeight: '900',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
    marginTop: 3,
  },
  pillPaid: {
    backgroundColor: '#DCFCE7',
  },
  pillPending: {
    backgroundColor: '#FEF3C7',
  },
  pillNeutral: {
    backgroundColor: '#F1F5F9',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  textPaid: {
    color: '#16A34A',
  },
  textPending: {
    color: '#D97706',
  },
  textNeutral: {
    color: '#64748B',
  },
  cardFooterDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginTop: 12,
    marginBottom: 8,
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quickContactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 8,
  },
  quickContactText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
  },
  cardActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  waBtn: {
    backgroundColor: '#DCFCE7',
    padding: 6,
    borderRadius: 8,
  },
  trashBtn: {
    backgroundColor: '#FEE2E2',
    padding: 6,
    borderRadius: 8,
  },
  chevronWrap: {
    paddingLeft: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 70,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 14,
  },
  emptySub: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
  clearSearchBtn: {
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#2563EB',
  },
  clearSearchBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
