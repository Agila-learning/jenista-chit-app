import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  StatusBar,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Image,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { buildCustomerChitSchedule, DueInstallmentRow } from '../../utils/customerChitSchedule';
import { formatCurrency } from '../../utils/format';
import { DataSyncManager } from '../../services/dataSync';
import { secureStorage } from '../../services/storage';

export const CustomerScheduleScreen: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const customer = route.params?.customer || {};
  const chit = route.params?.chit || customer.chits?.[0] || {
    groupId: route.params?.groupId || 'CHIT-SCHEME',
    groupName: route.params?.groupName || 'Chit Scheme',
    chitValue: customer.chitValue || 100000,
    duration: 20,
    scheme: 'Auction',
  };

  const [companyBank, setCompanyBank] = useState<any>(null);
  const [chitGroups, setChitGroups] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<DueInstallmentRow | null>(null);
  const [payModalVisible, setPayModalVisible] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState<'UPI' | 'Bank Transfer' | 'Cash'>('UPI');
  const [payRef, setPayRef] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    const loadBanksAndGroups = async () => {
      try {
        const [banks, groups] = await Promise.all([
          DataSyncManager.getBankAccounts(),
          DataSyncManager.getChitGroups().catch(() => []),
        ]);
        if (banks && banks.length > 0) {
          const defaultB = banks.find((b: any) => b.isDefault) || banks[0];
          setCompanyBank(defaultB);
        }
        if (groups && groups.length > 0) {
          setChitGroups(groups);
        }
      } catch (e) {
        console.warn('Error loading banks in CustomerScheduleScreen:', e);
      }
    };
    loadBanksAndGroups();
  }, []);

  const scheduleSummary = useMemo(() => {
    return buildCustomerChitSchedule({
      customer,
      chit,
    });
  }, [customer, chit]);

  // Group Details (Total Members & Enrolled Members)
  const groupDetails = useMemo(() => {
    const cleanId = String(chit.groupId || '').toLowerCase().trim();
    const cleanName = String(chit.groupName || '').toLowerCase().trim();
    const g = chitGroups.find((grp: any) => {
      const gId = String(grp.id || '').toLowerCase().trim();
      const gName = String(grp.name || '').toLowerCase().trim();
      const gCode = String(grp.code || '').toLowerCase().trim();
      return (
        (cleanId && (gId === cleanId || gName === cleanId || gCode === cleanId)) ||
        (cleanName && (gName === cleanName || gId === cleanName || gCode === cleanName))
      );
    });
    const totalMembers = Number(g?.totalMembers || g?.members || g?.duration || chit.duration || 20);
    const directEnrolled = Array.isArray(g?.enrolledMembers) ? g.enrolledMembers.length : 0;
    const enrolledCount = Math.max(directEnrolled, Number(g?.filled || 0)) || totalMembers;
    return {
      group: g,
      totalMembers,
      enrolledCount,
    };
  }, [chitGroups, chit]);

  const chitVal = Number(chit.chitValue || scheduleSummary.chitValue || 100000);
  const duration = Number(chit.duration || scheduleSummary.totalDurationMonths || 20);
  const baseMonthlyDue = Math.round(chitVal / duration);
  const monthlyInterest = Math.round(chitVal * 0.01); // 1% per month post-disbursal fee/interest
  const postDrawMonthlyDue = baseMonthlyDue + monthlyInterest;
  const isDisbursed = Boolean(chit.isWithdrawn || scheduleSummary.isWithdrawn);
  const disbursedPrize = Math.round(chitVal * 0.95);

  const handleOpenPay = (row: DueInstallmentRow) => {
    setSelectedMonth(row);
    const due = row.revisedDue - (row.amountPaid || 0);
    setPayAmount(String(due > 0 ? due : row.revisedDue));
    setPayMode('UPI');
    setPayRef('');
    setPayModalVisible(true);
  };

  const copyToClipboard = (text: string, key: string) => {
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
    Alert.alert('Copied to Clipboard', text);
  };

  const handleSubmitPayment = async () => {
    if (!payAmount || Number(payAmount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid installment amount.');
      return;
    }
    if (payMode !== 'Cash' && !payRef.trim()) {
      Alert.alert('Reference Required', 'Please enter your UPI reference or bank UTR number.');
      return;
    }

    try {
      setSubmitting(true);
      const existingRaw = await secureStorage.getItem('payment_requests');
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      const newReq = {
        id: `REQ-${Date.now().toString().slice(-6)}`,
        customerId: customer.id || 'CUST',
        customerName: customer.name || 'Member',
        mobile: customer.mobile || customer.phone || '',
        groupId: chit.groupId,
        groupName: chit.groupName || chit.groupId,
        ticketNumber: chit.ticketNumber || '1',
        amount: Number(payAmount),
        paymentMode: payMode,
        referenceNo: payRef.trim() || `CASH-${Date.now().toString().slice(-6)}`,
        bankAccountId: companyBank?.id,
        bankName: companyBank?.bankName || 'Company Bank',
        submittedAt: new Date().toISOString(),
        status: 'PENDING',
        remarks: selectedMonth ? `Month ${selectedMonth.monthNumber} (${selectedMonth.monthName}) Installment` : 'Chit Installment',
      };

      existing.unshift(newReq);
      await secureStorage.setItem('payment_requests', JSON.stringify(existing));
      setPayModalVisible(false);
      Alert.alert(
        'Payment Submitted!',
        `Your payment of ${formatCurrency(Number(payAmount))} has been submitted. Admin will verify and issue your receipt voucher.`
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to submit payment.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderMonthItem = ({ item }: { item: DueInstallmentRow }) => {
    const isPaid = item.status === 'PAID';
    const isPartial = item.status === 'PARTIALLY_PAID';
    const isOverdue = item.status === 'OVERDUE';

    return (
      <View style={styles.rowCard}>
        <View style={styles.monthHeader}>
          <View style={styles.monthPill}>
            <Text style={styles.monthPillText}>Month {item.monthNumber}</Text>
          </View>
          <Text style={styles.dueDateText}>Due: {item.dueDate}</Text>
          <View
            style={[
              styles.statusPill,
              isPaid
                ? styles.pillSuccess
                : isPartial
                ? styles.pillWarning
                : isOverdue
                ? styles.pillDanger
                : styles.pillNeutral,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                isPaid
                  ? styles.textSuccess
                  : isPartial
                  ? styles.textWarning
                  : isOverdue
                  ? styles.textDanger
                  : styles.textNeutral,
              ]}
            >
              {item.status}
            </Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.rowDetails}>
          <View style={styles.col}>
            <Text style={styles.colLabel}>Monthly Due</Text>
            <Text style={styles.colValue}>{formatCurrency(item.revisedDue)}</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.colLabel}>Amount Paid</Text>
            <Text
              style={[
                styles.colValue,
                { color: isPaid ? Colors.success : Colors.text },
              ]}
            >
              {item.amountPaid > 0 ? formatCurrency(item.amountPaid) : '—'}
            </Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.colLabel}>Eligible Prize</Text>
            <Text style={[styles.colValue, { color: Colors.gold.text }]}>
              {isDisbursed ? 'Disbursed' : formatCurrency(item.eligiblePayout)}
            </Text>
          </View>
        </View>

        {/* Action Button: Pay Now for Due Months */}
        {!isPaid && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.payNowSmallBtn}
              onPress={() => handleOpenPay(item)}
              activeOpacity={0.85}
            >
              <Ionicons name="card" size={13} color="#FFFFFF" />
              <Text style={styles.payNowSmallBtnText}>
                Pay Month {item.monthNumber} ({formatCurrency(item.revisedDue - (item.amountPaid || 0))})
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Summary Header */}
      <View style={styles.summaryBox}>
        <View style={styles.topHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.schemeName}>
              {scheduleSummary.groupName}
            </Text>
            <Text style={styles.schemeSubtitle}>
              {scheduleSummary.scheme} Chit Plan • {duration} Months
            </Text>
          </View>
          {/* Total Members Badge */}
          <View style={styles.membersBadge}>
            <Ionicons name="people" size={12} color="#fef3c7" />
            <Text style={styles.membersBadgeText}>
              {groupDetails.totalMembers} Members ({groupDetails.enrolledCount} Enrolled)
            </Text>
          </View>
        </View>

        {/* Disbursal & Repayment with Interest Matrix */}
        <View style={styles.disbursalMatrixBox}>
          <View style={styles.matrixRow}>
            <View style={styles.matrixItem}>
              <Text style={styles.matrixLabel}>
                {isDisbursed ? 'DISBURSED PRIZE (95%)' : 'PRIZE MONEY (95%)'}
              </Text>
              <Text style={[styles.matrixVal, { color: '#FCD34D' }]}>
                {formatCurrency(disbursedPrize)}
              </Text>
            </View>
            <View style={styles.matrixVDivider} />
            <View style={styles.matrixItem}>
              <Text style={styles.matrixLabel}>MONTHLY DUE (+1% INT)</Text>
              <Text style={styles.matrixVal}>
                {formatCurrency(postDrawMonthlyDue)}
                <Text style={styles.matrixSubVal}>/mo</Text>
              </Text>
            </View>
          </View>

          <View style={styles.matrixHDivider} />

          <View style={styles.matrixBottomRow}>
            <View style={styles.matrixMiniCol}>
              <Text style={styles.matrixMiniLabel}>TOTAL PAYABLE</Text>
              <Text style={styles.matrixMiniVal}>{formatCurrency(scheduleSummary.totalDueAmount)}</Text>
            </View>
            <View style={styles.matrixMiniCol}>
              <Text style={styles.matrixMiniLabel}>TOTAL PAID</Text>
              <Text style={[styles.matrixMiniVal, { color: '#34D399' }]}>
                {formatCurrency(scheduleSummary.totalPaidAmount)}
              </Text>
            </View>
            <View style={styles.matrixMiniCol}>
              <Text style={styles.matrixMiniLabel}>BALANCE DUE</Text>
              <Text style={[styles.matrixMiniVal, { color: '#F87171' }]}>
                {formatCurrency(scheduleSummary.remainingBalanceDue)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.summaryGrid}>
          <View style={styles.sumCol}>
            <Text style={styles.sumLabel}>COMPLETED</Text>
            <Text style={styles.sumVal}>
              {scheduleSummary.completedMonthsCount}/{scheduleSummary.totalDurationMonths} M
            </Text>
          </View>
          <View style={styles.vLine} />
          <View style={styles.sumCol}>
            <Text style={styles.sumLabel}>STATUS</Text>
            <Text style={[styles.sumVal, { color: isDisbursed ? '#FCD34D' : '#93C5FD' }]}>
              {isDisbursed ? 'Prize Disbursed' : 'Active Savings'}
            </Text>
          </View>
        </View>
      </View>

      {/* Schedule Rows */}
      <FlatList
        data={scheduleSummary.schedule}
        keyExtractor={(item) => String(item.monthNumber)}
        renderItem={renderMonthItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* MODAL: Pay Now with Admin Bank Details & QR */}
      {payModalVisible && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setPayModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>
                    {selectedMonth ? `Pay Month ${selectedMonth.monthNumber} Installment` : 'Pay Installment'}
                  </Text>
                  <Text style={styles.modalSubtitle}>
                    {chit.groupName} • Due: {selectedMonth?.dueDate}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setPayModalVisible(false)} style={{ padding: 4 }}>
                  <Ionicons name="close" size={24} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
                {/* Amount Banner */}
                <View style={styles.modalAmountBanner}>
                  <Text style={styles.modalAmountLabel}>INSTALLMENT DUE (WITH INTEREST)</Text>
                  <Text style={styles.modalAmountValue}>{formatCurrency(Number(payAmount) || 0)}</Text>
                </View>

                {/* Amount Input */}
                <Text style={styles.inputLabel}>AMOUNT TO PAY (₹)</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="numeric"
                  value={payAmount}
                  onChangeText={setPayAmount}
                  placeholder="Installment amount"
                />

                {/* Mode Selector */}
                <Text style={[styles.inputLabel, { marginTop: 12 }]}>PAYMENT METHOD</Text>
                <View style={styles.modeRow}>
                  {(['UPI', 'Bank Transfer', 'Cash'] as const).map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[styles.modePill, payMode === m && styles.modePillActive]}
                      onPress={() => setPayMode(m)}
                    >
                      <Text style={[styles.modeText, payMode === m && styles.modeTextActive]}>
                        {m === 'UPI' ? 'UPI / QR' : m}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Admin-Configured Company Bank Account & QR */}
                {companyBank && (
                  <View style={styles.adminBankCard}>
                    <View style={styles.adminBankHeader}>
                      <Ionicons name="shield-checkmark" size={16} color={Colors.navy.primary} />
                      <Text style={styles.adminBankTitle}>Receiving Company Bank Account</Text>
                    </View>

                    {/* QR Code view for UPI */}
                    {payMode === 'UPI' && (
                      <View style={styles.qrContainer}>
                        {companyBank.qrCodeUrl || companyBank.qrCode ? (
                          <Image
                            source={{ uri: companyBank.qrCodeUrl || companyBank.qrCode }}
                            style={styles.qrImage}
                            resizeMode="contain"
                          />
                        ) : (
                          <View style={styles.qrFallback}>
                            <Ionicons name="qr-code" size={54} color={Colors.navy.primary} />
                          </View>
                        )}
                        <Text style={styles.qrScanText}>Scan QR using GPay, PhonePe, Paytm, or BHIM</Text>

                        {/* UPI ID Copy */}
                        <TouchableOpacity
                          style={styles.upiCopyRow}
                          onPress={() => copyToClipboard(companyBank.upiId || 'jenistachits@hdfcbank', 'modal-upi')}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.upiIdText}>{companyBank.upiId || 'jenistachits@hdfcbank'}</Text>
                          <Ionicons name="copy-outline" size={14} color={Colors.gold.dark} />
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Bank Details View */}
                    {payMode === 'Bank Transfer' && (
                      <View style={styles.bankDetailsBox}>
                        <View style={styles.bankDetailRow}>
                          <Text style={styles.bdLabel}>BANK NAME</Text>
                          <Text style={styles.bdValue}>{companyBank.bankName}</Text>
                        </View>
                        <View style={styles.bankDetailRow}>
                          <Text style={styles.bdLabel}>ACCOUNT NUMBER</Text>
                          <TouchableOpacity
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                            onPress={() => copyToClipboard(companyBank.accountNumber, 'modal-acc')}
                          >
                            <Text style={styles.bdValueMono}>{companyBank.accountNumber}</Text>
                            <Ionicons name="copy-outline" size={13} color={Colors.navy.primary} />
                          </TouchableOpacity>
                        </View>
                        <View style={styles.bankDetailRow}>
                          <Text style={styles.bdLabel}>IFSC CODE</Text>
                          <TouchableOpacity
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                            onPress={() => copyToClipboard(companyBank.ifscCode || companyBank.ifsc, 'modal-ifsc')}
                          >
                            <Text style={styles.bdValueMono}>{companyBank.ifscCode || companyBank.ifsc}</Text>
                            <Ionicons name="copy-outline" size={13} color={Colors.navy.primary} />
                          </TouchableOpacity>
                        </View>
                        <View style={styles.bankDetailRow}>
                          <Text style={styles.bdLabel}>A/C HOLDER</Text>
                          <Text style={styles.bdValue}>{companyBank.accountHolderName}</Text>
                        </View>
                      </View>
                    )}
                  </View>
                )}

                {/* UTR Reference Input */}
                {payMode !== 'Cash' && (
                  <>
                    <Text style={[styles.inputLabel, { marginTop: 12 }]}>
                      UTR / TRANSACTION REFERENCE <Text style={{ color: Colors.danger }}>*</Text>
                    </Text>
                    <TextInput
                      style={styles.modalInput}
                      value={payRef}
                      onChangeText={setPayRef}
                      placeholder="e.g. 12-digit UTR 329048102948"
                      autoCapitalize="characters"
                    />
                  </>
                )}

                {/* Submit CTA */}
                <TouchableOpacity
                  style={[styles.modalSubmitBtn, submitting && { opacity: 0.6 }]}
                  onPress={handleSubmitPayment}
                  disabled={submitting}
                  activeOpacity={0.85}
                >
                  <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.modalSubmitBtnText}>
                    {submitting ? 'Submitting...' : 'Submit Payment Proof'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  summaryBox: {
    backgroundColor: Colors.navy.primary,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 22,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  topHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  schemeName: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: 0.2,
  },
  schemeSubtitle: {
    fontSize: 12,
    color: Colors.gold.primary,
    marginTop: 2,
    fontWeight: '600',
  },
  membersBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  membersBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fef3c7',
  },
  disbursalMatrixBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  matrixRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  matrixItem: {
    flex: 1,
    alignItems: 'center',
  },
  matrixVDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  matrixLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 0.5,
  },
  matrixVal: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.white,
    marginTop: 2,
  },
  matrixSubVal: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  matrixHDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginVertical: 10,
  },
  matrixBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  matrixMiniCol: {
    flex: 1,
    alignItems: 'center',
  },
  matrixMiniLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.65)',
  },
  matrixMiniVal: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.white,
    marginTop: 1,
  },
  summaryGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sumCol: {
    flex: 1,
    alignItems: 'center',
  },
  sumLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.65)',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  sumVal: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.white,
    marginTop: 2,
  },
  vLine: {
    width: 1,
    height: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 32,
    gap: 12,
  },
  rowCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.navy.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  monthPill: {
    backgroundColor: Colors.blueSubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  monthPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.blueAccent,
  },
  dueDateText: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pillSuccess: { backgroundColor: Colors.successLight },
  pillWarning: { backgroundColor: Colors.warningLight },
  pillDanger: { backgroundColor: Colors.dangerLight },
  pillNeutral: { backgroundColor: Colors.borderLight },
  statusText: { fontSize: 10, fontWeight: '700' },
  textSuccess: { color: Colors.success },
  textWarning: { color: Colors.warning },
  textDanger: { color: Colors.danger },
  textNeutral: { color: Colors.textMuted },
  cardDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 8,
  },
  rowDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  col: {
    flex: 1,
  },
  colLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  colValue: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 2,
  },
  actionRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: Colors.borderLight,
  },
  payNowSmallBtn: {
    backgroundColor: '#b45309',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  payNowSmallBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderColor: Colors.borderLight,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.navy.primary,
  },
  modalSubtitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  modalAmountBanner: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 14,
  },
  modalAmountLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#92400e',
    letterSpacing: 0.5,
  },
  modalAmountValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#78350f',
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  modePill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.borderLight,
    alignItems: 'center',
  },
  modePillActive: {
    backgroundColor: Colors.navy.primary,
  },
  modeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  modeTextActive: {
    color: '#FFFFFF',
  },
  adminBankCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  adminBankHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderColor: Colors.borderLight,
  },
  adminBankTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.navy.primary,
  },
  qrContainer: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  qrImage: {
    width: 140,
    height: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  qrFallback: {
    width: 100,
    height: 100,
    backgroundColor: '#e2e8f0',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrScanText: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 6,
    textAlign: 'center',
  },
  upiCopyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#fde68a',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginTop: 6,
  },
  upiIdText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400e',
  },
  bankDetailsBox: {
    gap: 6,
    paddingVertical: 4,
  },
  bankDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bdLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  bdValue: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.text,
  },
  bdValueMono: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.navy.primary,
    fontFamily: 'monospace',
  },
  modalSubmitBtn: {
    backgroundColor: '#b45309',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 10,
  },
  modalSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
