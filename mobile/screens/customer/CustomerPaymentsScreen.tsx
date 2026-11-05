import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { useAuth } from '../../store/AuthContext';
import { DataSyncManager } from '../../services/dataSync';
import { formatCurrency, formatDate } from '../../utils/format';
import { showAlert } from '../../utils/alert';
import { sanitizeUtr, isValidUtr } from '../../utils/validators';

export const CustomerPaymentsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const [customer, setCustomer] = useState<any>(null);
  const [enrolledChits, setEnrolledChits] = useState<any[]>([]);
  const [selectedChit, setSelectedChit] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [paymentMode, setPaymentMode] = useState<'UPI' | 'Bank Transfer'>('UPI');
  const [companyBank, setCompanyBank] = useState<any>(null);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const loadData = async () => {
    try {
      if (!user) return;
      const [customers, banks, allReqs] = await Promise.all([
        DataSyncManager.getCustomers(),
        DataSyncManager.getBankAccounts(),
        DataSyncManager.getPaymentRequests().catch(() => []),
      ]);

      const cust =
        customers.find(
          (c: any) =>
            c.id === user.id ||
            c.mongoId === user.id ||
            (c.phone && user.phone && c.phone.replace(/\D/g, '') === user.phone.replace(/\D/g, ''))
        ) || {
          id: user.id || 'TC-97456',
          name: user.name || 'Subscriber',
          phone: user.phone || '9876543210',
          chits: [
            {
              groupId: 'DIA-1L-20M',
              groupName: 'Diya Auction Chit Fund (1 Lakh)',
              monthlyInstallment: 5000,
              chitValue: 100000,
              ticketNumber: '1',
              scheme: 'Auction',
            },
          ],
        };
      setCustomer(cust);

      const chitsList = cust.chits && cust.chits.length > 0 ? cust.chits : [
        {
          groupId: 'DIA-1L-20M',
          groupName: 'Diya Auction Chit Fund (1 Lakh)',
          monthlyInstallment: 5000,
          chitValue: 100000,
          ticketNumber: '1',
          scheme: 'Auction',
        },
      ];
      setEnrolledChits(chitsList);
      if (!selectedChit && chitsList.length > 0) {
        setSelectedChit(chitsList[0]);
        setAmount(String(chitsList[0].monthlyInstallment || 5000));
      }

      if (banks && banks.length > 0) {
        const defaultB = banks.find((b: any) => b.isDefault) || banks[0];
        setCompanyBank(defaultB);
      }

      // Filter customer's payment requests
      const myReqs = allReqs.filter(
        (r: any) =>
          r.customerId === cust.id ||
          (r.customerMobile && cust.phone && r.customerMobile.replace(/\D/g, '') === cust.phone.replace(/\D/g, ''))
      );
      setPaymentHistory(myReqs);
    } catch (e) {
      console.warn('Failed to load customer payments:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleSubmitProof = async () => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      showAlert('Required', 'Please enter a valid installment amount.');
      return;
    }
    const cleanUtr = referenceNo.trim();
    if (!cleanUtr) {
      showAlert('Required', 'Please enter transaction UTR or Reference Number.');
      return;
    }
    if (!isValidUtr(cleanUtr)) {
      showAlert('Invalid UTR', 'UPI / Transaction UTR number must be exactly 12 numeric digits.');
      return;
    }

    setSubmitting(true);
    try {
      await DataSyncManager.submitPaymentRequest({
        customerId: customer.id,
        customerName: customer.name,
        customerMobile: customer.phone,
        groupId: selectedChit?.groupId || 'CHIT-GROUP',
        groupName: selectedChit?.groupName || 'Chit Scheme',
        amount: val,
        paymentMode,
        referenceNumber: cleanUtr,
      });

      setReferenceNo('');
      await loadData();
      showAlert(
        'Proof Submitted! 🎉',
        'Your payment proof has been submitted to the verification desk. Once verified, your ledger passbook will be credited automatically.'
      );
    } catch (e: any) {
      showAlert('Error', e?.message || 'Failed to submit payment proof');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerLoading}>
        <ActivityIndicator size="large" color={Colors.gold.primary} />
        <Text style={styles.loadingText}>Loading payment details...</Text>
      </View>
    );
  }

  const defaultUpi = companyBank?.upiId || 'jenistachits@icici';
  const defaultAcc = companyBank?.accountNumber || '91802001928341';
  const defaultIfsc = companyBank?.ifsc || 'ICIC0000918';
  const defaultBank = companyBank?.bankName || 'ICICI Bank Ltd';

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.gold.primary} />}
    >
      <StatusBar barStyle="light-content" />

      {/* Top Banner */}
      <View style={styles.topBanner}>
        <Text style={styles.bannerTag}>DIGITAL INSTALLMENT PAYMENT</Text>
        <Text style={styles.bannerTitle}>Pay Chit Installment</Text>
        <Text style={styles.bannerSub}>Direct UPI Transfer & Bank Settlement</Text>
      </View>

      {/* Form Card */}
      <View style={styles.formCard}>
        {/* Chit Selection */}
        <Text style={styles.fieldLabel}>SELECT CHIT SCHEME</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chitChipsRow}>
          {enrolledChits.map((c, i) => {
            const isSelected = selectedChit?.groupId === c.groupId;
            return (
              <TouchableOpacity
                key={c.groupId || i}
                style={[styles.chitChip, isSelected && styles.chitChipActive]}
                onPress={() => {
                  setSelectedChit(c);
                  setAmount(String(c.monthlyInstallment || 5000));
                }}
              >
                <Text style={[styles.chitChipTitle, isSelected && styles.chitChipTitleActive]}>
                  {c.groupName || c.groupId}
                </Text>
                <Text style={[styles.chitChipSub, isSelected && styles.chitChipSubActive]}>
                  ₹{(c.monthlyInstallment || 5000).toLocaleString('en-IN')}/mo • Ticket #{c.ticketNumber || '1'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Installment Amount Input */}
        <Text style={styles.fieldLabel}>INSTALLMENT AMOUNT (₹)</Text>
        <TextInput
          style={styles.amountInput}
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          placeholder="e.g. 5000"
          placeholderTextColor="#94a3b8"
        />

        {/* Payment Channel Selector */}
        <Text style={styles.fieldLabel}>PAYMENT METHOD</Text>
        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[styles.modeTile, paymentMode === 'UPI' && styles.modeTileActive]}
            onPress={() => setPaymentMode('UPI')}
          >
            <Ionicons name="qr-code-outline" size={18} color={paymentMode === 'UPI' ? '#0B1A30' : Colors.textSecondary} />
            <Text style={[styles.modeTileText, paymentMode === 'UPI' && styles.modeTileTextActive]}>
              Instant UPI / QR
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeTile, paymentMode === 'Bank Transfer' && styles.modeTileActive]}
            onPress={() => setPaymentMode('Bank Transfer')}
          >
            <Ionicons name="business-outline" size={18} color={paymentMode === 'Bank Transfer' ? '#0B1A30' : Colors.textSecondary} />
            <Text style={[styles.modeTileText, paymentMode === 'Bank Transfer' && styles.modeTileTextActive]}>
              NEFT / IMPS / Bank
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bank & UPI Info Box */}
        <View style={styles.companyBankBox}>
          <Text style={styles.bankBoxTitle}>Company Official Payout Account:</Text>
          {paymentMode === 'UPI' ? (
            <View style={styles.bankDetailRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.bankDetailLabel}>Official UPI ID</Text>
                <Text style={styles.bankDetailValBold}>{defaultUpi}</Text>
              </View>
              <View style={styles.badgeCopied}>
                <Ionicons name="copy-outline" size={14} color={Colors.gold.primary} />
                <Text style={styles.badgeCopiedText}>UPI Ready</Text>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.bankDetailRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bankDetailLabel}>Bank Name & Account No</Text>
                  <Text style={styles.bankDetailValBold}>{defaultBank} • {defaultAcc}</Text>
                </View>
              </View>
              <View style={styles.bankDetailRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bankDetailLabel}>IFSC Code</Text>
                  <Text style={styles.bankDetailValBold}>{defaultIfsc}</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* UTR / Reference Number Input */}
        <Text style={styles.fieldLabel}>TRANSACTION REFERENCE / UTR NUMBER (12 DIGITS) *</Text>
        <TextInput
          style={styles.refInput}
          value={referenceNo}
          onChangeText={(text) => setReferenceNo(sanitizeUtr(text, 12))}
          placeholder="e.g. 984029184712 (12-digit UTR)"
          placeholderTextColor="#94a3b8"
          keyboardType="numeric"
          maxLength={12}
        />

        {/* Submit Proof Button */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
          onPress={handleSubmitProof}
          disabled={submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#0B1A30" />
          ) : (
            <Text style={styles.submitBtnText}>Submit Payment Proof for Verification</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Verification History Queue */}
      <View style={styles.historySection}>
        <Text style={styles.historySectionTitle}>My Payment Proofs & Approvals</Text>
        {paymentHistory.length === 0 ? (
          <View style={styles.emptyHistory}>
            <Ionicons name="checkmark-done-circle-outline" size={38} color="#94a3b8" />
            <Text style={styles.emptyHistoryTitle}>No Active Payment Proofs</Text>
            <Text style={styles.emptyHistorySub}>Your submitted transaction proofs will appear here with verification status.</Text>
          </View>
        ) : (
          paymentHistory.map((item) => {
            const isApproved = item.status === 'APPROVED';
            const isRejected = item.status === 'REJECTED';
            return (
              <View key={item.id} style={styles.proofCard}>
                <View style={styles.proofHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.proofGroup}>{item.groupName || item.groupId}</Text>
                    <Text style={styles.proofRef}>Ref / UTR: {item.referenceNumber || item.id}</Text>
                  </View>
                  <View
                    style={[
                      styles.proofBadge,
                      isApproved ? styles.badgeApproved : isRejected ? styles.badgeRejected : styles.badgePending,
                    ]}
                  >
                    <Text
                      style={[
                        styles.proofBadgeText,
                        isApproved ? styles.textApproved : isRejected ? styles.textRejected : styles.textPending,
                      ]}
                    >
                      {item.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.proofDivider} />

                <View style={styles.proofFooter}>
                  <Text style={styles.proofAmount}>₹{Number(item.amount || 0).toLocaleString('en-IN')}</Text>
                  <Text style={styles.proofDate}>
                    {item.requestedAt ? formatDate(item.requestedAt) : 'Pending Desk Review'}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </View>

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
  topBanner: {
    backgroundColor: Colors.navy.primary,
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  bannerTag: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.gold.primary,
    letterSpacing: 0.5,
  },
  bannerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.white,
    marginTop: 4,
  },
  bannerSub: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  formCard: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginTop: -12,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 12,
  },
  chitChipsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 4,
  },
  chitChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minWidth: 180,
  },
  chitChipActive: {
    backgroundColor: '#fffbeb',
    borderColor: Colors.gold.primary,
  },
  chitChipTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  chitChipTitleActive: {
    color: '#92400e',
  },
  chitChipSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '600',
  },
  chitChipSubActive: {
    color: '#b45309',
  },
  amountInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 14,
    height: 48,
    fontSize: 18,
    fontWeight: '800',
    color: Colors.navy.primary,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modeTile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modeTileActive: {
    backgroundColor: Colors.gold.primary,
    borderColor: Colors.gold.primary,
  },
  modeTileText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  modeTileTextActive: {
    color: '#0B1A30',
    fontWeight: '800',
  },
  companyBankBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  bankBoxTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 8,
  },
  bankDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  bankDetailLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
  },
  bankDetailValBold: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 1,
  },
  badgeCopied: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeCopiedText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#b45309',
  },
  refInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 14,
    height: 48,
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  submitBtn: {
    backgroundColor: Colors.gold.primary,
    borderRadius: 12,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0B1A30',
  },
  historySection: {
    marginHorizontal: 16,
    marginTop: 20,
  },
  historySectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
  },
  emptyHistory: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6,
  },
  emptyHistoryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  emptyHistorySub: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
  },
  proofCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  proofHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  proofGroup: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  proofRef: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    fontFamily: 'monospace',
  },
  proofBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
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
  proofBadgeText: {
    fontSize: 10,
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
  proofDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 10,
  },
  proofFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  proofAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.navy.primary,
  },
  proofDate: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
});
