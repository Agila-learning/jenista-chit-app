import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
  Modal,
  TextInput,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { Input } from '../../components/common/Input';
import { useAuth } from '../../store/AuthContext';
import { DataSyncManager } from '../../services/dataSync';
import { generateAndShareReceipt } from '../../services/receiptService';
import { Customer, ChitGroup } from '../../types';

export const ReceiptEntryScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const { user } = useAuth();
  const preCustomer = route.params?.customerName;
  const preId = route.params?.customerId;
  const preMobile = route.params?.mobile;
  const preAmount = route.params?.amount;

  const [receiptNo] = useState(`REC-${Date.now().toString().slice(-6)}`);
  const [customerName, setCustomerName] = useState(preCustomer || '');
  const [customerId, setCustomerId] = useState(preId || '');
  const [mobileNumber, setMobileNumber] = useState(preMobile || '');
  const [chitGroup, setChitGroup] = useState(route.params?.chitGroup || '');
  const [amount, setAmount] = useState(preAmount ? String(preAmount) : '');
  const [paymentMode, setPaymentMode] = useState<'UPI' | 'CASH' | 'BANK_TRANSFER'>('UPI');
  const [referenceNo, setReferenceNo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Date selection state (defaults to today)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDateModal, setShowDateModal] = useState(false);
  const [customDay, setCustomDay] = useState(String(new Date().getDate()));
  const [customMonth, setCustomMonth] = useState(String(new Date().getMonth() + 1));
  const [customYear, setCustomYear] = useState(String(new Date().getFullYear()));

  // Customer selection modal state
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [customersList, setCustomersList] = useState<Customer[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Group selection modal state
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupsList, setGroupsList] = useState<ChitGroup[]>([]);
  const [groupSearch, setGroupSearch] = useState('');
  const [loadingGroups, setLoadingGroups] = useState(false);

  // Load customers and groups on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoadingMembers(true);
    setLoadingGroups(true);
    try {
      const [custs, grps] = await Promise.all([
        DataSyncManager.getCustomers(),
        DataSyncManager.getChitGroups(),
      ]);
      setCustomersList(custs);
      setGroupsList(grps);

      // If no group preselected and groups exist, default to first active group
      if (!chitGroup && grps.length > 0) {
        setChitGroup(grps[0].name || grps[0].id);
      }
    } catch (e) {
      console.warn('Failed to load customers/groups in ReceiptEntry:', e);
    } finally {
      setLoadingMembers(false);
      setLoadingGroups(false);
    }
  };

  // Filtered members
  const filteredCustomers = useMemo(() => {
    const q = memberSearch.toLowerCase().trim();
    if (!q) return customersList;
    return customersList.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.fullName?.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.mobile?.includes(q) ||
        c.id?.toLowerCase().includes(q)
    );
  }, [customersList, memberSearch]);

  // Filtered groups
  const filteredGroups = useMemo(() => {
    const q = groupSearch.toLowerCase().trim();
    if (!q) return groupsList;
    return groupsList.filter(
      (g) => g.name?.toLowerCase().includes(q) || g.id?.toLowerCase().includes(q)
    );
  }, [groupsList, groupSearch]);

  const handleSelectMember = (c: Customer) => {
    setCustomerName(c.name || c.fullName || 'Member');
    setCustomerId(c.id || c.mongoId || '');
    setMobileNumber(c.phone || c.mobile || '');

    // If customer has chits, auto-select first chit group and installment
    if (Array.isArray(c.chits) && c.chits.length > 0) {
      const firstChit = c.chits[0];
      setChitGroup(firstChit.groupName || firstChit.groupId);
      if (firstChit.monthlyInstallment) {
        setAmount(String(firstChit.monthlyInstallment));
      }
    }

    setShowMemberModal(false);
  };

  const handleSelectGroup = (g: ChitGroup) => {
    setChitGroup(g.name || g.id);
    if (!amount && g.value && g.duration) {
      setAmount(String(Math.round(g.value / g.duration)));
    }
    setShowGroupModal(false);
  };

  // Format date helper
  const formattedDisplayDate = useMemo(() => {
    return selectedDate.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }, [selectedDate]);

  const applyCustomDate = (d: number, m: number, y: number) => {
    const newD = new Date(y, m - 1, d);
    if (!isNaN(newD.getTime())) {
      setSelectedDate(newD);
      setShowDateModal(false);
    } else {
      Alert.alert('Invalid Date', 'Please enter a valid day, month, and year.');
    }
  };

  const handleSaveReceipt = async () => {
    if (!customerName.trim() || !amount.trim() || Number(amount) <= 0) {
      Alert.alert('Validation Error', 'Please select a member and enter a valid payment amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      await DataSyncManager.recordReceipt({
        receiptNo,
        customerId: customerId || 'CUST',
        customerName: customerName.trim(),
        chitGroup: chitGroup || 'General Chit Fund',
        amount: Number(amount),
        paymentMode,
        referenceNo: referenceNo.trim(),
        executive: user?.name || 'Staff User',
        paymentDate: selectedDate.toISOString(),
      });

      Alert.alert(
        'Receipt Recorded & Synced',
        `Official Collection Voucher #${receiptNo} for ₹${amount} dated ${formattedDisplayDate} was successfully recorded to live ledger!`,
        [
          {
            text: 'Share / Print PDF',
            onPress: () => {
              generateAndShareReceipt({
                receiptNo,
                customerName,
                customerId,
                customerMobile: mobileNumber,
                groupName: chitGroup,
                paymentMode,
                amount,
                referenceNo,
                collectedBy: user?.name,
              });
              navigation.goBack();
            },
          },
          { text: 'Done', onPress: () => navigation.goBack() },
        ]
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to record receipt');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Top Header with Back Button */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('AdminDashboard'))}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.screenTitle}>Issue Receipt Voucher</Text>
          <Text style={styles.screenSubtitle}>Offline / In-Field Payment Record</Text>
        </View>
        <View style={styles.receiptBadge}>
          <Text style={styles.receiptBadgeText}>#{receiptNo.slice(-6)}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Group Selector Card */}
        <TouchableOpacity
          style={styles.groupCard}
          onPress={() => setShowGroupModal(true)}
          activeOpacity={0.8}
        >
          <View style={styles.groupIconBox}>
            <Ionicons name="hammer-outline" size={20} color={Colors.gold.primary} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.groupCardLabel}>CHIT GROUP SCHEME</Text>
            <Text style={styles.groupCardTitle}>{chitGroup || 'Select Chit Group Scheme'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.gold.primary} />
        </TouchableOpacity>

        {/* 2. Member Selector Field */}
        <View style={styles.fieldSection}>
          <View style={styles.labelRow}>
            <Text style={styles.fieldLabel}>Member / Customer</Text>
            <Text style={styles.requiredIndicator}>*Required</Text>
          </View>
          <TouchableOpacity
            style={styles.selectMemberBox}
            onPress={() => setShowMemberModal(true)}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <Ionicons
                name="person-circle-outline"
                size={24}
                color={customerName ? Colors.gold.primary : Colors.textSecondary}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.selectMemberText,
                    !customerName && { color: Colors.textSecondary },
                  ]}
                  numberOfLines={1}
                >
                  {customerName || 'Tap to choose registered member...'}
                </Text>
                {customerId ? (
                  <Text style={styles.memberSubText}>
                    ID: {customerId} • {mobileNumber || 'No Phone'}
                  </Text>
                ) : null}
              </View>
            </View>
            <Ionicons name="chevron-down" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* 3. Amount Field */}
        <View style={styles.fieldSection}>
          <Text style={styles.fieldLabel}>Collection Amount (₹)</Text>
          <View style={styles.amountInputWrap}>
            <Text style={styles.currencySymbol}>₹</Text>
            <Input
              placeholder="Enter amount (e.g. 5000)"
              keyboardType="number-pad"
              value={amount}
              onChangeText={setAmount}
              containerStyle={{ flex: 1, marginBottom: 0 }}
              style={styles.amountInputField}
            />
          </View>

          {/* Quick Amount Suggestion Chips */}
          <View style={styles.chipsRow}>
            {[2500, 5000, 10000, 20000].map((amt) => (
              <TouchableOpacity
                key={amt}
                style={[
                  styles.amountChip,
                  amount === String(amt) && styles.amountChipActive,
                ]}
                onPress={() => setAmount(String(amt))}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.amountChipText,
                    amount === String(amt) && styles.amountChipTextActive,
                  ]}
                >
                  ₹{amt.toLocaleString('en-IN')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 4. Payment Method 3-Tile Selector */}
        <View style={styles.fieldSection}>
          <Text style={styles.fieldLabel}>Payment Collection Method</Text>
          <View style={styles.paymentMethodsRow}>
            {/* UPI */}
            <TouchableOpacity
              style={[
                styles.methodTile,
                paymentMode === 'UPI' && styles.methodTileActive,
              ]}
              onPress={() => setPaymentMode('UPI')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="phone-portrait-outline"
                size={18}
                color={paymentMode === 'UPI' ? '#0B1A30' : Colors.textSecondary}
              />
              <Text
                style={[
                  styles.methodTileText,
                  paymentMode === 'UPI' && styles.methodTileTextActive,
                ]}
              >
                UPI
              </Text>
            </TouchableOpacity>

            {/* Cash */}
            <TouchableOpacity
              style={[
                styles.methodTile,
                paymentMode === 'CASH' && styles.methodTileActive,
              ]}
              onPress={() => setPaymentMode('CASH')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="cash-outline"
                size={18}
                color={paymentMode === 'CASH' ? '#0B1A30' : Colors.textSecondary}
              />
              <Text
                style={[
                  styles.methodTileText,
                  paymentMode === 'CASH' && styles.methodTileTextActive,
                ]}
              >
                Cash
              </Text>
            </TouchableOpacity>

            {/* Bank Transfer */}
            <TouchableOpacity
              style={[
                styles.methodTile,
                paymentMode === 'BANK_TRANSFER' && styles.methodTileActive,
              ]}
              onPress={() => setPaymentMode('BANK_TRANSFER')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="business-outline"
                size={18}
                color={paymentMode === 'BANK_TRANSFER' ? '#0B1A30' : Colors.textSecondary}
              />
              <Text
                style={[
                  styles.methodTileText,
                  paymentMode === 'BANK_TRANSFER' && styles.methodTileTextActive,
                ]}
              >
                Bank
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 5. Payment Date Selector (Supports historical date entry) */}
        <View style={styles.fieldSection}>
          <View style={styles.labelRow}>
            <Text style={styles.fieldLabel}>Payment Record Date</Text>
            <Text style={styles.dateHintText}>Historical & Custom Entry Supported</Text>
          </View>
          <TouchableOpacity
            style={styles.datePickerBox}
            onPress={() => setShowDateModal(true)}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="calendar-outline" size={20} color={Colors.gold.primary} />
              <Text style={styles.datePickerText}>{formattedDisplayDate}</Text>
            </View>
            <View style={styles.dateChangeBadge}>
              <Text style={styles.dateChangeBadgeText}>Change Date</Text>
              <Ionicons name="chevron-down" size={14} color={Colors.gold.primary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* 6. Reference / UTR (Optional) */}
        <View style={styles.fieldSection}>
          <Text style={styles.fieldLabel}>Transaction Reference / UTR No (Optional)</Text>
          <Input
            placeholder="Enter UTR, Cheque No or Voucher Ref"
            value={referenceNo}
            onChangeText={setReferenceNo}
            containerStyle={{ marginBottom: 0 }}
          />
        </View>

        {/* 7. Save Payment Button */}
        <TouchableOpacity
          style={[styles.savePaymentBtn, isSubmitting && { opacity: 0.7 }]}
          onPress={handleSaveReceipt}
          disabled={isSubmitting}
          activeOpacity={0.85}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#0B1A30" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#0B1A30" />
              <Text style={styles.savePaymentBtnText}>Save Receipt Voucher</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 48 }} />
      </ScrollView>

      {/* MEMBER SELECTION MODAL */}
      <Modal visible={showMemberModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select Member</Text>
                <Text style={styles.modalSubtitle}>Pick a customer to credit receipt</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowMemberModal(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.searchWrap}>
              <Ionicons name="search" size={18} color={Colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search member name, phone or code..."
                placeholderTextColor={Colors.textSecondary}
                value={memberSearch}
                onChangeText={setMemberSearch}
                autoFocus
              />
              {memberSearch ? (
                <TouchableOpacity onPress={() => setMemberSearch('')}>
                  <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
                </TouchableOpacity>
              ) : null}
            </View>

            {loadingMembers ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color={Colors.gold.primary} />
                <Text style={styles.modalLoadingText}>Loading customer directory...</Text>
              </View>
            ) : (
              <FlatList
                data={filteredCustomers}
                keyExtractor={(item) => item.id || item.mongoId || String(Math.random())}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.memberItemRow}
                    onPress={() => handleSelectMember(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.memberAvatar}>
                      <Text style={styles.memberAvatarText}>
                        {(item.name || item.fullName || 'M')[0].toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.memberItemName}>{item.name || item.fullName}</Text>
                      <Text style={styles.memberItemMeta}>
                        ID: {item.id} • {item.phone || item.mobile || 'No Phone'}
                      </Text>
                      {Array.isArray(item.chits) && item.chits.length > 0 ? (
                        <Text style={styles.memberItemChits}>
                          Chit: {item.chits[0].groupName || item.chits[0].groupId}
                        </Text>
                      ) : null}
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={Colors.border} />
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyList}>
                    <Ionicons name="people-outline" size={36} color={Colors.textSecondary} />
                    <Text style={styles.emptyListText}>No matching members found</Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>

      {/* CHIT GROUP SELECTION MODAL */}
      <Modal visible={showGroupModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select Chit Group Scheme</Text>
                <Text style={styles.modalSubtitle}>Pick group to record installment</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowGroupModal(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.searchWrap}>
              <Ionicons name="search" size={18} color={Colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search scheme name or group code..."
                placeholderTextColor={Colors.textSecondary}
                value={groupSearch}
                onChangeText={setGroupSearch}
              />
            </View>

            {loadingGroups ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color={Colors.gold.primary} />
              </View>
            ) : (
              <FlatList
                data={filteredGroups}
                keyExtractor={(item) => item.id || String(Math.random())}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.groupItemRow}
                    onPress={() => handleSelectGroup(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.groupItemIcon}>
                      <Ionicons name="pie-chart" size={20} color={Colors.gold.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.groupItemName}>{item.name}</Text>
                      <Text style={styles.groupItemMeta}>
                        Value: ₹{(item.value || 100000).toLocaleString('en-IN')} • {item.duration || 20} Mos
                      </Text>
                    </View>
                    <Text style={styles.groupMonthlyTag}>
                      ₹{Math.round((item.value || 100000) / (item.duration || 20)).toLocaleString('en-IN')}/m
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* CUSTOMIZABLE CALENDAR & DATE PICKER MODAL */}
      <Modal visible={showDateModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.dateModalBox}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Set Payment Record Date</Text>
                <Text style={styles.modalSubtitle}>Select historical or current payment date</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowDateModal(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {/* Quick Date Presets */}
            <Text style={styles.presetLabel}>QUICK DATE PRESETS</Text>
            <View style={styles.presetsGrid}>
              <TouchableOpacity
                style={styles.presetBtn}
                onPress={() => {
                  setSelectedDate(new Date());
                  setShowDateModal(false);
                }}
              >
                <Text style={styles.presetBtnText}>Today</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.presetBtn}
                onPress={() => {
                  const y = new Date();
                  y.setDate(y.getDate() - 1);
                  setSelectedDate(y);
                  setShowDateModal(false);
                }}
              >
                <Text style={styles.presetBtnText}>Yesterday</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.presetBtn}
                onPress={() => {
                  const now = new Date();
                  const d10 = new Date(now.getFullYear(), now.getMonth(), 10);
                  setSelectedDate(d10);
                  setShowDateModal(false);
                }}
              >
                <Text style={styles.presetBtnText}>10th This Month</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.presetBtn}
                onPress={() => {
                  const now = new Date();
                  const lastM = new Date(now.getFullYear(), now.getMonth() - 1, 15);
                  setSelectedDate(lastM);
                  setShowDateModal(false);
                }}
              >
                <Text style={styles.presetBtnText}>15th Last Month</Text>
              </TouchableOpacity>
            </View>

            {/* Custom Day, Month, Year Input */}
            <Text style={[styles.presetLabel, { marginTop: 16 }]}>CUSTOM DATE ENTRY (DD / MM / YYYY)</Text>
            <View style={styles.customDateRow}>
              <View style={styles.dateInputCol}>
                <Text style={styles.colLabel}>Day</Text>
                <TextInput
                  style={styles.dateNumInput}
                  keyboardType="number-pad"
                  maxLength={2}
                  value={customDay}
                  onChangeText={setCustomDay}
                />
              </View>
              <Text style={styles.dateDivider}>/</Text>
              <View style={styles.dateInputCol}>
                <Text style={styles.colLabel}>Month</Text>
                <TextInput
                  style={styles.dateNumInput}
                  keyboardType="number-pad"
                  maxLength={2}
                  value={customMonth}
                  onChangeText={setCustomMonth}
                />
              </View>
              <Text style={styles.dateDivider}>/</Text>
              <View style={[styles.dateInputCol, { flex: 1.5 }]}>
                <Text style={styles.colLabel}>Year</Text>
                <TextInput
                  style={styles.dateNumInput}
                  keyboardType="number-pad"
                  maxLength={4}
                  value={customYear}
                  onChangeText={setCustomYear}
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.applyDateBtn}
              onPress={() =>
                applyCustomDate(
                  Number(customDay) || 1,
                  Number(customMonth) || 1,
                  Number(customYear) || 2026
                )
              }
              activeOpacity={0.8}
            >
              <Text style={styles.applyDateBtnText}>Apply Selected Date</Text>
            </TouchableOpacity>
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
  topHeader: {
    backgroundColor: Colors.navy.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  backButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  screenTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.white,
  },
  screenSubtitle: {
    fontSize: 11,
    color: Colors.gold.primary,
    marginTop: 1,
  },
  receiptBadge: {
    backgroundColor: 'rgba(217, 119, 6, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  receiptBadgeText: {
    color: Colors.gold.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  scrollArea: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 16,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },

  // 1. Group Selector Card
  groupCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(217, 119, 6, 0.3)',
    shadowColor: Colors.navy.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  groupIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(217, 119, 6, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupCardLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.gold.primary,
    letterSpacing: 0.5,
  },
  groupCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 2,
  },

  // 2. Sections & Labels
  fieldSection: {
    gap: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  requiredIndicator: {
    fontSize: 11,
    color: Colors.gold.primary,
    fontWeight: '600',
  },
  dateHintText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  selectMemberBox: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectMemberText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  memberSubText: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  // 3. Amount Field
  amountInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  currencySymbol: {
    position: 'absolute',
    left: 16,
    zIndex: 2,
    fontSize: 18,
    fontWeight: '800',
    color: Colors.gold.primary,
  },
  amountInputField: {
    paddingLeft: 36,
    fontSize: 16,
    fontWeight: '700',
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  amountChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  amountChipActive: {
    backgroundColor: 'rgba(217, 119, 6, 0.15)',
    borderColor: Colors.gold.primary,
  },
  amountChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  amountChipTextActive: {
    color: Colors.gold.primary,
    fontWeight: '800',
  },

  // 4. Payment Method 3-Tile Row
  paymentMethodsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  methodTile: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  methodTileActive: {
    backgroundColor: Colors.gold.primary,
    borderColor: Colors.gold.primary,
  },
  methodTileText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  methodTileTextActive: {
    color: '#0B1A30',
    fontWeight: '800',
  },

  // 5. Payment Date
  datePickerBox: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    height: 52,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  datePickerText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  dateChangeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(217, 119, 6, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dateChangeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.gold.primary,
  },

  // 7. Save Payment Button
  savePaymentBtn: {
    backgroundColor: Colors.gold.primary,
    height: 54,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    shadowColor: Colors.gold.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  savePaymentBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0B1A30',
    letterSpacing: 0.3,
  },

  // MODALS
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
    minHeight: '55%',
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
    color: Colors.text,
  },
  modalSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: Colors.background,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    gap: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
  },
  modalLoading: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  modalLoadingText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  memberItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.gold.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    color: '#0B1A30',
    fontSize: 16,
    fontWeight: '800',
  },
  memberItemName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  memberItemMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  memberItemChits: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.gold.primary,
    marginTop: 2,
  },
  emptyList: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyListText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  groupItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  groupItemIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(217, 119, 6, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  groupItemMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  groupMonthlyTag: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.gold.primary,
  },

  // Date Modal
  dateModalBox: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
  },
  presetLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.gold.primary,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  presetBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  customDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  dateInputCol: {
    flex: 1,
  },
  colLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  dateNumInput: {
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    height: 46,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  dateDivider: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textSecondary,
    paddingTop: 16,
  },
  applyDateBtn: {
    backgroundColor: Colors.gold.primary,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  applyDateBtnText: {
    color: '#0B1A30',
    fontSize: 15,
    fontWeight: '800',
  },
});
