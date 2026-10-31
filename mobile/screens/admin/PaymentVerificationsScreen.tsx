import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { formatCurrency, formatDate } from '../../utils/format';
import { PaymentRequest } from '../../types';
import { DataSyncManager } from '../../services/dataSync';
import { MobileNotificationsManager } from '../../services/notificationsData';

export const PaymentVerificationsScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState<'PAYMENTS' | 'WITHDRAWALS'>('PAYMENTS');
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Disburse modal state
  const [disburseModalItem, setDisburseModalItem] = useState<any | null>(null);
  const [disburseRefNo, setDisburseRefNo] = useState('');
  const [disburseMode, setDisburseMode] = useState<'Bank Transfer' | 'NEFT/RTGS' | 'UPI' | 'Cheque'>('Bank Transfer');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const [pReqs, wReqs] = await Promise.all([
        DataSyncManager.getPaymentRequests(),
        DataSyncManager.getWithdrawalRequests(),
      ]);
      setPaymentRequests(pReqs);
      setWithdrawalRequests(wReqs);
    } catch (e) {
      console.warn('Failed to load requests:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Payment Actions
  const approvePayment = (item: PaymentRequest) => {
    Alert.alert(
      'Approve Payment Proof',
      `Confirm credit of ₹${item.amount.toLocaleString('en-IN')} from ${item.customerName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve & Credit Ledger',
          onPress: async () => {
            try {
              await DataSyncManager.updatePaymentRequest(item.id, {
                status: 'APPROVED',
                approvedAt: new Date().toISOString(),
              });

              // Credit ledger and MongoDB receipts
              await DataSyncManager.recordReceipt({
                receiptNo: `REC-${Date.now().toString().slice(-6)}`,
                customerId: item.customerId,
                customerName: item.customerName,
                chitGroup: item.groupName || item.groupId || 'Chit Group',
                amount: Number(item.amount),
                paymentMode: item.paymentMode,
                referenceNo: item.referenceNumber,
                executive: 'Admin Verification Desk',
              });

              // Live Notification
              await MobileNotificationsManager.addLiveNotification({
                type: 'PAYMENT_APPROVED',
                title: 'Payment Verified & Approved',
                message: `Payment of ₹${item.amount.toLocaleString('en-IN')} for ${item.customerName} (${item.groupName}) was verified and credited.`,
                targetRole: 'ALL',
                targetUserId: item.customerId,
              });

              await loadData();
              Alert.alert('Payment Approved', 'Voucher created and ledger credited.');
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Failed to approve payment');
            }
          },
        },
      ]
    );
  };

  const rejectPayment = (item: PaymentRequest) => {
    Alert.alert('Reject Payment', `Are you sure you want to reject this payment request from ${item.customerName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          try {
            await DataSyncManager.updatePaymentRequest(item.id, {
              status: 'REJECTED',
              rejectedAt: new Date().toISOString(),
            });
            await loadData();
          } catch (e: any) {
            Alert.alert('Error', e?.message || 'Failed to reject payment');
          }
        },
      },
    ]);
  };

  // Withdrawal Actions
  const handleOpenDisburse = (item: any) => {
    setDisburseModalItem(item);
    setDisburseRefNo(`DISB-${Date.now().toString().slice(-5)}`);
    setDisburseMode('Bank Transfer');
  };

  const handleConfirmDisburse = async () => {
    if (!disburseRefNo.trim()) {
      Alert.alert('Required', 'Please enter a transaction reference / UTR number.');
      return;
    }

    setIsSubmitting(true);
    try {
      await DataSyncManager.updateWithdrawalRequest(disburseModalItem.id, {
        status: 'DISBURSED',
        disbursedAt: new Date().toISOString(),
        transactionReference: disburseRefNo.trim(),
        payoutMethod: disburseMode,
      });

      // Live Notification
      await MobileNotificationsManager.addLiveNotification({
        type: 'PRIZE_DISBURSED',
        title: 'Prize Money Disbursed',
        message: `Prize money of ₹${(disburseModalItem.eligibleAmount || 0).toLocaleString('en-IN')} disbursed to ${disburseModalItem.customerName} via ${disburseMode}. Ref: ${disburseRefNo}`,
        targetRole: 'ALL',
        targetUserId: disburseModalItem.customerId,
      });

      setDisburseModalItem(null);
      await loadData();
      Alert.alert('Disbursement Recorded', 'Prize money disbursement has been confirmed and synced.');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to record disbursement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectWithdrawal = (item: any) => {
    Alert.alert('Reject Claim', `Reject prize disbursement claim for ${item.customerName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          try {
            await DataSyncManager.updateWithdrawalRequest(item.id, {
              status: 'REJECTED',
            });
            await loadData();
          } catch (e: any) {
            Alert.alert('Error', e?.message || 'Failed to reject claim');
          }
        },
      },
    ]);
  };

  // Render Payment Request Item
  const renderPaymentItem = ({ item }: { item: PaymentRequest }) => {
    const isPending = item.status === 'PENDING';
    const isApproved = item.status === 'APPROVED';

    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.custName}>{item.customerName}</Text>
            <Text style={styles.metaText}>
              ID: {item.customerId} • {item.customerMobile || 'No Phone'}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              isApproved ? styles.badgeApproved : item.status === 'REJECTED' ? styles.badgeRejected : styles.badgePending,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                isApproved ? styles.textApproved : item.status === 'REJECTED' ? styles.textRejected : styles.textPending,
              ]}
            >
              {item.status}
            </Text>
          </View>
        </View>

        <View style={styles.detailBox}>
          <View style={styles.row}>
            <Text style={styles.label}>Scheme Group:</Text>
            <Text style={styles.val}>{item.groupName || item.groupId || 'Chit Group'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Submitted Amount:</Text>
            <Text style={styles.amountHighlight}>₹{Number(item.amount || 0).toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Payment Mode:</Text>
            <Text style={styles.val}>{item.paymentMode || 'UPI'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Reference / UTR:</Text>
            <Text style={styles.valBold}>{item.referenceNumber || 'None'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Requested At:</Text>
            <Text style={styles.val}>{item.requestedAt ? new Date(item.requestedAt).toLocaleString('en-IN') : '—'}</Text>
          </View>
        </View>

        {isPending ? (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.btnApprove}
              onPress={() => approvePayment(item)}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle" size={16} color="#0B1A30" />
              <Text style={styles.btnApproveText}>Approve & Credit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnReject}
              onPress={() => rejectPayment(item)}
              activeOpacity={0.8}
            >
              <Ionicons name="close-circle" size={16} color="#EF4444" />
              <Text style={styles.btnRejectText}>Reject</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    );
  };

  // Render Prize Withdrawal Item
  const renderWithdrawalItem = ({ item }: { item: any }) => {
    const isPending = item.status === 'PENDING_ADMIN_DISBURSAL' || item.status === 'PENDING';
    const isDisbursed = item.status === 'DISBURSED';

    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.custName}>{item.customerName}</Text>
            <Text style={styles.metaText}>
              ID: {item.customerId} • {item.mobile || 'No Phone'}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              isDisbursed ? styles.badgeApproved : item.status === 'REJECTED' ? styles.badgeRejected : styles.badgePending,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                isDisbursed ? styles.textApproved : item.status === 'REJECTED' ? styles.textRejected : styles.textPending,
              ]}
            >
              {isDisbursed ? 'DISBURSED' : item.status === 'REJECTED' ? 'REJECTED' : 'PENDING DISBURSAL'}
            </Text>
          </View>
        </View>

        <View style={styles.detailBox}>
          <View style={styles.row}>
            <Text style={styles.label}>Winning Group:</Text>
            <Text style={styles.val}>{item.groupName || item.groupId}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Chit Value:</Text>
            <Text style={styles.val}>₹{Number(item.chitValue || 0).toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Prize Claim Amount:</Text>
            <Text style={styles.amountHighlight}>
              ₹{Number(item.eligibleAmount || 0).toLocaleString('en-IN')}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Payout Preference:</Text>
            <Text style={styles.val}>{item.payoutMethod || 'Bank Transfer'}</Text>
          </View>

          {item.payoutDetails?.accountNumber ? (
            <View style={styles.bankInfoBox}>
              <Text style={styles.bankInfoTitle}>Bank Account Details:</Text>
              <Text style={styles.bankInfoText}>Bank: {item.payoutDetails.bankName || 'Specified'}</Text>
              <Text style={styles.bankInfoText}>A/C: {item.payoutDetails.accountNumber}</Text>
              <Text style={styles.bankInfoText}>IFSC: {item.payoutDetails.ifsc}</Text>
              <Text style={styles.bankInfoText}>Holder: {item.payoutDetails.accountHolderName}</Text>
            </View>
          ) : null}

          {item.payoutDetails?.upiId ? (
            <View style={styles.bankInfoBox}>
              <Text style={styles.bankInfoTitle}>UPI ID:</Text>
              <Text style={styles.bankInfoText}>{item.payoutDetails.upiId}</Text>
            </View>
          ) : null}
        </View>

        {isPending ? (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.btnApprove}
              onPress={() => handleOpenDisburse(item)}
              activeOpacity={0.8}
            >
              <Ionicons name="cash" size={16} color="#0B1A30" />
              <Text style={styles.btnApproveText}>Disburse Prize Money</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnReject}
              onPress={() => handleRejectWithdrawal(item)}
              activeOpacity={0.8}
            >
              <Ionicons name="close-circle" size={16} color="#EF4444" />
              <Text style={styles.btnRejectText}>Reject</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    );
  };

  const pendingPaymentsCount = paymentRequests.filter((p) => p.status === 'PENDING').length;
  const pendingWithdrawalsCount = withdrawalRequests.filter(
    (w) => w.status === 'PENDING_ADMIN_DISBURSAL' || w.status === 'PENDING'
  ).length;

  return (
    <View style={styles.container}>
      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'PAYMENTS' && styles.tabButtonActive]}
          onPress={() => setActiveTab('PAYMENTS')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="receipt-outline"
            size={16}
            color={activeTab === 'PAYMENTS' ? '#0B1A30' : Colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'PAYMENTS' && styles.tabTextActive]}>
            Payment Proofs ({pendingPaymentsCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'WITHDRAWALS' && styles.tabButtonActive]}
          onPress={() => setActiveTab('WITHDRAWALS')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="trophy-outline"
            size={16}
            color={activeTab === 'WITHDRAWALS' ? '#0B1A30' : Colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'WITHDRAWALS' && styles.tabTextActive]}>
            Prize Claims ({pendingWithdrawalsCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content List */}
      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={Colors.gold.primary} />
          <Text style={styles.loadingText}>Syncing payment requests...</Text>
        </View>
      ) : activeTab === 'PAYMENTS' ? (
        <FlatList
          data={paymentRequests}
          keyExtractor={(item) => item.id}
          renderItem={renderPaymentItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.gold.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-done-circle-outline" size={54} color={Colors.textSecondary} />
              <Text style={styles.emptyTitle}>No Payment Requests</Text>
              <Text style={styles.emptySub}>All customer installment proofs are verified and settled.</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={withdrawalRequests}
          keyExtractor={(item) => item.id}
          renderItem={renderWithdrawalItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.gold.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="gift-outline" size={54} color={Colors.textSecondary} />
              <Text style={styles.emptyTitle}>No Prize Claims</Text>
              <Text style={styles.emptySub}>No pending prize disbursements or withdrawal claims.</Text>
            </View>
          }
        />
      )}

      {/* DISBURSEMENT CONFIRMATION MODAL */}
      <Modal visible={!!disburseModalItem} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Confirm Prize Disbursal</Text>
                <Text style={styles.modalSubtitle}>Release funds to winning subscriber</Text>
              </View>
              <TouchableOpacity onPress={() => setDisburseModalItem(null)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {disburseModalItem ? (
              <View style={styles.modalBody}>
                <View style={styles.modalSummaryBox}>
                  <Text style={styles.summaryCust}>{disburseModalItem.customerName}</Text>
                  <Text style={styles.summaryGroup}>{disburseModalItem.groupName}</Text>
                  <Text style={styles.summaryAmount}>
                    ₹{(disburseModalItem.eligibleAmount || 0).toLocaleString('en-IN')}
                  </Text>
                </View>

                <Text style={styles.inputLabel}>Disbursement Reference / UTR Number:</Text>
                <TextInput
                  style={styles.textInput}
                  value={disburseRefNo}
                  onChangeText={setDisburseRefNo}
                  placeholder="e.g. UTR847291048201"
                  placeholderTextColor={Colors.textSecondary}
                />

                <Text style={styles.inputLabel}>Payout Channel:</Text>
                <View style={styles.modeRow}>
                  {(['Bank Transfer', 'NEFT/RTGS', 'UPI', 'Cheque'] as const).map((mode) => (
                    <TouchableOpacity
                      key={mode}
                      style={[styles.modeTile, disburseMode === mode && styles.modeTileActive]}
                      onPress={() => setDisburseMode(mode)}
                    >
                      <Text style={[styles.modeTileText, disburseMode === mode && styles.modeTileTextActive]}>
                        {mode}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={[styles.submitDisburseBtn, isSubmitting && { opacity: 0.7 }]}
                  onPress={handleConfirmDisburse}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#0B1A30" />
                  ) : (
                    <Text style={styles.submitDisburseText}>Confirm & Disburse Funds</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : null}
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
  tabContainer: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: Colors.navy.primary,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  tabButtonActive: {
    backgroundColor: Colors.gold.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: '#0B1A30',
    fontWeight: '800',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.navy.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  custName: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
  },
  metaText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgePending: {
    backgroundColor: 'rgba(217, 119, 6, 0.15)',
  },
  badgeApproved: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  badgeRejected: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  textPending: {
    color: Colors.gold.primary,
  },
  textApproved: {
    color: '#10B981',
  },
  textRejected: {
    color: '#EF4444',
  },
  detailBox: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
    gap: 6,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  val: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  valBold: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.gold.primary,
  },
  amountHighlight: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.gold.primary,
  },
  bankInfoBox: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 2,
  },
  bankInfoTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.gold.primary,
    marginBottom: 2,
  },
  bankInfoText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  btnApprove: {
    flex: 1,
    backgroundColor: Colors.gold.primary,
    height: 42,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  btnApproveText: {
    color: '#0B1A30',
    fontSize: 13,
    fontWeight: '800',
  },
  btnReject: {
    paddingHorizontal: 16,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  btnRejectText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  emptySub: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    maxWidth: 260,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.text,
  },
  modalSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: Colors.background,
  },
  modalBody: {
    gap: 12,
  },
  modalSummaryBox: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.25)',
  },
  summaryCust: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
  },
  summaryGroup: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  summaryAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.gold.primary,
    marginTop: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
  },
  textInput: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    height: 46,
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  modeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modeTile: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modeTileActive: {
    backgroundColor: 'rgba(217, 119, 6, 0.15)',
    borderColor: Colors.gold.primary,
  },
  modeTileText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  modeTileTextActive: {
    color: Colors.gold.primary,
    fontWeight: '800',
  },
  submitDisburseBtn: {
    backgroundColor: Colors.gold.primary,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitDisburseText: {
    color: '#0B1A30',
    fontSize: 15,
    fontWeight: '800',
  },
});
