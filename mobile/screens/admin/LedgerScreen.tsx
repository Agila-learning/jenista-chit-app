import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  TextInput,
  ScrollView,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { formatCurrency, formatDate } from '../../utils/format';
import { DataSyncManager } from '../../services/dataSync';

export const LedgerScreen: React.FC = () => {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'COMPLETED' | 'PENDING' | 'FAILED'>('ALL');
  const [paymentModeFilter, setPaymentModeFilter] = useState<'ALL' | 'Cash' | 'UPI' | 'Bank Transfer'>('ALL');
  const [planFilter, setPlanFilter] = useState<'ALL' | 'Regular' | 'Fixed' | 'Auction'>('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL');

  const [transactions, setTransactions] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // New Ledger Entry Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [entryType, setEntryType] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
  const [entryAmount, setEntryAmount] = useState('');
  const [entryCustomer, setEntryCustomer] = useState('');
  const [entryGroup, setEntryGroup] = useState('');
  const [entryCategory, setEntryCategory] = useState('INSTALLMENT');
  const [entryMode, setEntryMode] = useState<'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque'>('UPI');
  const [entryRef, setEntryRef] = useState('');
  const [entryNotes, setEntryNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadLedger = async () => {
    try {
      const [data, customers, groups] = await Promise.all([
        DataSyncManager.getLedgerTransactions(),
        DataSyncManager.getCustomers().catch(() => []),
        DataSyncManager.getChitGroups().catch(() => []),
      ]);

      const customerMap = new Map<string, string>();
      customers.forEach((c: any) => {
        if (c.id) customerMap.set(c.id, c.name);
        if (c.mongoId) customerMap.set(c.mongoId, c.name);
        if (c.phone) customerMap.set(c.phone.replace(/\D/g, ''), c.name);
      });

      const groupMap = new Map<string, { name: string; scheme?: string }>();
      groups.forEach((g: any) => {
        if (g.id) groupMap.set(g.id, { name: g.name, scheme: g.scheme });
      });

      const mapped = data.map((t: any) => {
        // Customer Name Resolution
        let resolvedCustName = t.customerName || t.customer?.name || t.memberName;
        if (!resolvedCustName && t.customerId && customerMap.has(t.customerId)) {
          resolvedCustName = customerMap.get(t.customerId);
        }
        if (!resolvedCustName && t.customerMobile) {
          const cleanMobile = t.customerMobile.replace(/\D/g, '');
          if (customerMap.has(cleanMobile)) {
            resolvedCustName = customerMap.get(cleanMobile);
          }
        }
        if (!resolvedCustName && t.reference?.includes('/')) {
          resolvedCustName = t.reference.split('/')[0]?.trim();
        }
        if (!resolvedCustName && t.description?.includes('-')) {
          const parts = t.description.split('-');
          const part2 = parts[1]?.trim();
          if (part2 && !part2.toLowerCase().includes('chit') && !part2.toLowerCase().includes('group')) {
            resolvedCustName = part2;
          }
        }
        if (!resolvedCustName) {
          resolvedCustName = t.customerId ? `Member (${t.customerId})` : 'Member';
        }

        // Group & Scheme Resolution
        let resolvedGroupName = t.groupName || t.reference?.split('/')[1]?.trim() || 'Chit Group';
        let resolvedScheme = t.scheme || 'Auction';
        if (t.groupId && groupMap.has(t.groupId)) {
          const gInfo = groupMap.get(t.groupId);
          if (gInfo) {
            resolvedGroupName = gInfo.name || resolvedGroupName;
            resolvedScheme = gInfo.scheme || resolvedScheme;
          }
        }

        return {
          id: t.id,
          customerName: resolvedCustName,
          customerId: t.customerId || '',
          groupName: resolvedGroupName,
          scheme: resolvedScheme,
          dateRaw: t.date,
          date: formatDate(t.date),
          type: t.type || 'CREDIT',
          category: t.category || 'INSTALLMENT',
          amount: Number(t.amount || 0),
          status: (t.status || 'COMPLETED').toUpperCase(),
          reference: t.reference || t.id,
          description: t.description || 'Installment Payment',
          collectedBy: t.collectedBy || 'Jenista Admin',
          paymentMode: t.paymentMode || 'Bank Transfer',
        };
      });

      setTransactions(mapped);
    } catch (e) {
      console.warn('Failed to load ledger:', e);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadLedger();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadLedger();
  };

  const handleVoidTransaction = (item: any) => {
    Alert.alert(
      'Void / Delete Transaction',
      `Permanently void and remove ${item.type} entry for ${item.customerName} of ${formatCurrency(item.amount)}?\n\nThis will remove the transaction from the general ledger records.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Void & Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await DataSyncManager.voidReceipt(item.id);
              await loadLedger();
              Alert.alert('Voided', 'Transaction entry has been removed from ledger.');
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Failed to void transaction');
            }
          },
        },
      ]
    );
  };

  const handleCreateEntry = async () => {
    const parsedAmount = parseFloat(entryAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid numeric transaction amount.');
      return;
    }
    if (!entryCustomer.trim()) {
      Alert.alert('Required Field', 'Please enter a subscriber or counterparty name.');
      return;
    }

    setIsSubmitting(true);
    try {
      await DataSyncManager.addManualLedgerEntry({
        type: entryType,
        amount: parsedAmount,
        category: entryCategory,
        description: entryNotes.trim() || `${entryType === 'CREDIT' ? 'Receipt' : 'Payment'} Entry - ${entryCustomer.trim()}`,
        customerName: entryCustomer.trim(),
        groupName: entryGroup.trim() || 'General Ledger Account',
        paymentMode: entryMode,
        reference: entryRef.trim() || `LED-${Date.now().toString().slice(-6)}`,
      });

      setIsAddModalOpen(false);
      setEntryAmount('');
      setEntryCustomer('');
      setEntryGroup('');
      setEntryCategory('INSTALLMENT');
      setEntryMode('UPI');
      setEntryRef('');
      setEntryNotes('');
      await loadLedger();
      Alert.alert('Entry Recorded', 'New entry recorded into general ledger.');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to add ledger entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;

    return transactions.filter((t) => {
      // 1. Search Query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matches =
          t.id.toLowerCase().includes(q) ||
          t.customerName.toLowerCase().includes(q) ||
          t.groupName.toLowerCase().includes(q) ||
          t.reference.toLowerCase().includes(q) ||
          t.paymentMode.toLowerCase().includes(q);
        if (!matches) return false;
      }

      // 2. Status Tab
      if (activeTab !== 'ALL' && t.status !== activeTab) {
        return false;
      }

      // 3. Payment Mode
      if (paymentModeFilter !== 'ALL') {
        const mode = (t.paymentMode || '').toLowerCase();
        if (paymentModeFilter === 'Cash' && !mode.includes('cash')) return false;
        if (paymentModeFilter === 'UPI' && !mode.includes('upi')) return false;
        if (paymentModeFilter === 'Bank Transfer' && !mode.includes('bank') && !mode.includes('transfer')) return false;
      }

      // 4. Scheme Plan
      if (planFilter !== 'ALL') {
        const scheme = (t.scheme || '').toLowerCase();
        const group = (t.groupName || '').toLowerCase();
        const target = planFilter.toLowerCase();
        if (!scheme.includes(target) && !group.includes(target)) return false;
      }

      // 5. Date Filter
      if (dateFilter !== 'ALL') {
        const tTime = new Date(t.dateRaw).getTime();
        if (isNaN(tTime)) return true;
        if (dateFilter === 'TODAY' && tTime < startOfToday) return false;
        if (dateFilter === 'WEEK' && tTime < sevenDaysAgo) return false;
        if (dateFilter === 'MONTH' && tTime < thirtyDaysAgo) return false;
      }

      return true;
    });
  }, [transactions, search, activeTab, paymentModeFilter, planFilter, dateFilter]);

  const totalCollected = useMemo(() => {
    return filtered
      .filter((t) => t.status === 'COMPLETED')
      .reduce((s, t) => s + t.amount, 0);
  }, [filtered]);

  const renderTxn = ({ item }: { item: any }) => {
    const isCompleted = item.status === 'COMPLETED';
    const isPending = item.status === 'PENDING';

    const initial = (item.customerName || 'M').charAt(0).toUpperCase();
    const avatarBgs = ['#FFECC2', '#FCE7F3', '#E0F2FE', '#EDE9FE', '#FEF3C7'];
    const charCode = initial.charCodeAt(0) || 0;
    const bg = avatarBgs[charCode % avatarBgs.length];

    const isUpi = item.paymentMode?.toLowerCase().includes('upi');
    const isCash = item.paymentMode?.toLowerCase().includes('cash');

    return (
      <View style={styles.card}>
        <View style={styles.cardMainRow}>
          {/* Avatar Bubble */}
          <View style={[styles.avatarBubble, { backgroundColor: bg }]}>
            <Text style={styles.avatarBubbleText}>{initial}</Text>
          </View>

          {/* Member & Group Info */}
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Text style={styles.customerName}>{item.customerName}</Text>
              <View style={styles.schemeTag}>
                <Text style={styles.schemeTagText}>{item.scheme || 'Auction'}</Text>
              </View>
            </View>
            <Text style={styles.groupMetaText}>{item.groupName}</Text>
            <View style={styles.modeRow}>
              <View
                style={[
                  styles.modePill,
                  isCash ? { backgroundColor: '#fef3c7' } : isUpi ? { backgroundColor: '#dbeafe' } : { backgroundColor: '#ede9fe' },
                ]}
              >
                <Ionicons
                  name={isCash ? 'cash-outline' : isUpi ? 'phone-portrait-outline' : 'business-outline'}
                  size={10}
                  color={isCash ? '#b45309' : isUpi ? '#1d4ed8' : '#6b21a8'}
                />
                <Text
                  style={[
                    styles.modePillText,
                    isCash ? { color: '#92400e' } : isUpi ? { color: '#1e40af' } : { color: '#581c87' },
                  ]}
                >
                  {item.paymentMode || 'Bank Transfer'}
                </Text>
              </View>
              <Text style={styles.refText}>Ref: {item.reference?.slice(-8) || item.id}</Text>
            </View>
          </View>

          {/* Amount, Date, Status Pill & Delete/Void Button */}
          <View style={{ alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.amountText, item.type === 'DEBIT' && { color: '#EF4444' }]}>
                {item.type === 'DEBIT' ? '-' : '+'} {formatCurrency(item.amount)}
              </Text>
              <Text style={styles.dateText}>{item.date}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <View
                style={[
                  styles.statusPill,
                  isCompleted
                    ? styles.pillCompleted
                    : isPending
                    ? styles.pillPending
                    : styles.pillFailed,
                ]}
              >
                <Text
                  style={[
                    styles.statusPillText,
                    isCompleted
                      ? styles.textCompleted
                      : isPending
                      ? styles.textPending
                      : styles.textFailed,
                  ]}
                >
                  {item.status.charAt(0) + item.status.slice(1).toLowerCase()}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleVoidTransaction(item)}
                style={styles.voidBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={13} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Top Header Bar with New Entry Action */}
      <View style={styles.topHeaderBar}>
        <View>
          <Text style={styles.topHeaderTitle}>General Ledger</Text>
          <Text style={styles.topHeaderSub}>Inflow: {formatCurrency(totalCollected)}</Text>
        </View>
        <TouchableOpacity
          style={styles.btnAddEntry}
          onPress={() => setIsAddModalOpen(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle" size={17} color="#0B1A30" />
          <Text style={styles.btnAddEntryText}>New Entry</Text>
        </TouchableOpacity>
      </View>

      {/* Top Search Bar */}
      <View style={styles.searchBarWrapper}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by customer, group, reference..."
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Primary Status Tabs (All, Completed, Pending, Failed) */}
      <View style={styles.filterRow}>
        {(['ALL', 'COMPLETED', 'PENDING', 'FAILED'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.filterTab, activeTab === tab && styles.filterTabActive]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterTabText,
                activeTab === tab && styles.filterTabTextActive,
              ]}
            >
              {tab.charAt(0) + tab.slice(1).toLowerCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Multi-Criteria Filters Horizontal Scroll: Mode, Scheme, Date */}
      <View style={styles.subFilterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subFiltersScroll}>
          {/* Payment Mode Pills */}
          <Text style={styles.subFilterGroupLabel}>MODE:</Text>
          {(['ALL', 'Cash', 'UPI', 'Bank Transfer'] as const).map((mode) => (
            <TouchableOpacity
              key={`mode-${mode}`}
              style={[styles.subFilterPill, paymentModeFilter === mode && styles.subFilterPillActive]}
              onPress={() => setPaymentModeFilter(mode)}
            >
              <Text style={[styles.subFilterPillText, paymentModeFilter === mode && styles.subFilterPillTextActive]}>
                {mode}
              </Text>
            </TouchableOpacity>
          ))}

          <View style={styles.filterSeparator} />

          {/* Scheme Plan Pills */}
          <Text style={styles.subFilterGroupLabel}>PLAN:</Text>
          {(['ALL', 'Regular', 'Fixed', 'Auction'] as const).map((plan) => (
            <TouchableOpacity
              key={`plan-${plan}`}
              style={[styles.subFilterPill, planFilter === plan && styles.subFilterPillActive]}
              onPress={() => setPlanFilter(plan)}
            >
              <Text style={[styles.subFilterPillText, planFilter === plan && styles.subFilterPillTextActive]}>
                {plan}
              </Text>
            </TouchableOpacity>
          ))}

          <View style={styles.filterSeparator} />

          {/* Date Filter Pills */}
          <Text style={styles.subFilterGroupLabel}>DATE:</Text>
          {([
            { id: 'ALL', label: 'All Time' },
            { id: 'TODAY', label: 'Today' },
            { id: 'WEEK', label: '7 Days' },
            { id: 'MONTH', label: 'Month' },
          ] as const).map((d) => (
            <TouchableOpacity
              key={`date-${d.id}`}
              style={[styles.subFilterPill, dateFilter === d.id && styles.subFilterPillActive]}
              onPress={() => setDateFilter(d.id)}
            >
              <Text style={[styles.subFilterPillText, dateFilter === d.id && styles.subFilterPillTextActive]}>
                {d.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Total Collected Hero Card */}
      <View style={styles.totalCollectedCardWrapper}>
        <View style={styles.totalCollectedCard}>
          <View style={styles.walletIconCircle}>
            <Ionicons name="wallet-outline" size={22} color={Colors.gold.dark} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.totalCollectedLabel}>Filtered Total Collected</Text>
            <Text style={styles.totalCollectedAmount}>{formatCurrency(totalCollected)}</Text>
            <View style={styles.trendRow}>
              <Ionicons name="receipt-outline" size={14} color={Colors.success} />
              <Text style={styles.trendText}>{filtered.length} Filtered Records</Text>
            </View>
          </View>
          <Ionicons name="stats-chart" size={24} color={Colors.gold.primary} />
        </View>
      </View>

      {/* List of Payments */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderTxn}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.gold.primary} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', justifyContent: 'center', padding: 40 }}>
            <Ionicons name="receipt-outline" size={48} color={Colors.neutral[400]} />
            <Text style={{ marginTop: 12, fontSize: 15, fontWeight: '700', color: Colors.textSecondary }}>
              No Ledger Records Found
            </Text>
            <Text style={{ marginTop: 4, fontSize: 13, color: Colors.textMuted, textAlign: 'center' }}>
              Try clearing filters or search terms.
            </Text>
          </View>
        }
      />

      {/* ADD MANUAL ENTRY MODAL */}
      <Modal visible={isAddModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Record Ledger Entry</Text>
                <Text style={styles.modalSubtitle}>Add manual Credit or Debit to general ledger</Text>
              </View>
              <TouchableOpacity onPress={() => setIsAddModalOpen(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color="#0f172a" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalFormContent}>
              {/* Type Switcher */}
              <View style={styles.typeSwitcher}>
                <TouchableOpacity
                  style={[styles.typeBtn, entryType === 'CREDIT' && styles.typeBtnCreditActive]}
                  onPress={() => setEntryType('CREDIT')}
                >
                  <Ionicons name="arrow-down-circle" size={16} color={entryType === 'CREDIT' ? '#10B981' : '#64748b'} />
                  <Text style={[styles.typeBtnText, entryType === 'CREDIT' && { color: '#10B981', fontWeight: '800' }]}>
                    Credit (Inflow)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeBtn, entryType === 'DEBIT' && styles.typeBtnDebitActive]}
                  onPress={() => setEntryType('DEBIT')}
                >
                  <Ionicons name="arrow-up-circle" size={16} color={entryType === 'DEBIT' ? '#EF4444' : '#64748b'} />
                  <Text style={[styles.typeBtnText, entryType === 'DEBIT' && { color: '#EF4444', fontWeight: '800' }]}>
                    Debit (Outflow)
                  </Text>
                </TouchableOpacity>
              </View>

              <View>
                <Text style={styles.inputLabel}>Transaction Amount (₹) *</Text>
                <TextInput
                  style={styles.modalInput}
                  value={entryAmount}
                  onChangeText={setEntryAmount}
                  keyboardType="numeric"
                  placeholder="e.g. 5000"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View>
                <Text style={styles.inputLabel}>Customer / Counterparty *</Text>
                <TextInput
                  style={styles.modalInput}
                  value={entryCustomer}
                  onChangeText={setEntryCustomer}
                  placeholder="e.g. Sekar Kumar"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View>
                <Text style={styles.inputLabel}>Chit Group / Category</Text>
                <TextInput
                  style={styles.modalInput}
                  value={entryGroup}
                  onChangeText={setEntryGroup}
                  placeholder="e.g. Diya-1L-20M or General Reserve"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View>
                <Text style={styles.inputLabel}>Payment Mode</Text>
                <View style={styles.modeChipsRow}>
                  {(['UPI', 'Cash', 'Bank Transfer', 'Cheque'] as const).map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[styles.modeChip, entryMode === m && styles.modeChipActive]}
                      onPress={() => setEntryMode(m)}
                    >
                      <Text style={[styles.modeChipText, entryMode === m && styles.modeChipTextActive]}>{m}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View>
                <Text style={styles.inputLabel}>Reference / UTR / Voucher No</Text>
                <TextInput
                  style={styles.modalInput}
                  value={entryRef}
                  onChangeText={setEntryRef}
                  placeholder="e.g. UTR-9832104"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View>
                <Text style={styles.inputLabel}>Narration / Notes</Text>
                <TextInput
                  style={[styles.modalInput, { height: 60, textAlignVertical: 'top', paddingTop: 8 }]}
                  value={entryNotes}
                  onChangeText={setEntryNotes}
                  multiline
                  placeholder="Optional entry description..."
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <TouchableOpacity
                style={[styles.submitEntryBtn, isSubmitting && { opacity: 0.7 }]}
                onPress={handleCreateEntry}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#0B1A30" />
                ) : (
                  <Text style={styles.submitEntryText}>Save Entry to Ledger</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchBarWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    gap: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: Colors.gold.primary,
    borderColor: Colors.gold.primary,
  },
  filterTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  filterTabTextActive: {
    color: Colors.navy.primary,
    fontWeight: '800',
  },
  subFilterSection: {
    marginVertical: 6,
  },
  subFiltersScroll: {
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 6,
  },
  subFilterGroupLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textMuted,
    marginLeft: 4,
    marginRight: 2,
  },
  subFilterPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  subFilterPillActive: {
    backgroundColor: Colors.navy.primary,
    borderColor: Colors.navy.primary,
  },
  subFilterPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  subFilterPillTextActive: {
    color: Colors.white,
  },
  filterSeparator: {
    width: 1,
    height: 18,
    backgroundColor: '#cbd5e1',
    marginHorizontal: 4,
  },
  totalCollectedCardWrapper: {
    paddingHorizontal: 16,
    marginBottom: 10,
    marginTop: 4,
  },
  totalCollectedCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  walletIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.gold.subtle,
    borderWidth: 1,
    borderColor: Colors.gold.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalCollectedLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  totalCollectedAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.text,
    marginTop: 1,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.success,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 10,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarBubble: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBubbleText: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.gold.text,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.text,
  },
  schemeTag: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  schemeTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.textMuted,
  },
  groupMetaText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 1,
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  modePillText: {
    fontSize: 9,
    fontWeight: '800',
  },
  refText: {
    fontSize: 9,
    color: Colors.textMuted,
    fontFamily: 'monospace',
  },
  amountText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.text,
  },
  dateText: {
    fontSize: 10,
    fontWeight: '500',
    color: Colors.textMuted,
    marginTop: 1,
  },
  statusPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    marginTop: 4,
  },
  pillCompleted: {
    backgroundColor: Colors.successLight,
  },
  pillPending: {
    backgroundColor: Colors.warningLight,
  },
  pillFailed: {
    backgroundColor: Colors.dangerLight,
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: '700',
  },
  textCompleted: {
    color: Colors.success,
  },
  textPending: {
    color: Colors.warning,
  },
  textFailed: {
    color: Colors.danger,
  },
  voidBtn: {
    padding: 3,
    borderRadius: 4,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  topHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  topHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
  },
  topHeaderSub: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.gold.primary,
    marginTop: 2,
  },
  btnAddEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.gold.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnAddEntryText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0B1A30',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  modalFormContent: {
    gap: 12,
    paddingBottom: 24,
  },
  typeSwitcher: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  typeBtnCreditActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: '#10B981',
  },
  typeBtnDebitActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: '#EF4444',
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '600',
  },
  modeChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modeChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modeChipActive: {
    backgroundColor: Colors.navy.primary,
    borderColor: Colors.navy.primary,
  },
  modeChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  modeChipTextActive: {
    color: Colors.white,
  },
  submitEntryBtn: {
    backgroundColor: Colors.gold.primary,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  submitEntryText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0B1A30',
  },
});
