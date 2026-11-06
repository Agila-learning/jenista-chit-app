import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StatusBar,
  Image,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { useAuth } from '../../store/AuthContext';
import { DataSyncManager } from '../../services/dataSync';
import { formatCurrency } from '../../utils/format';
import { MobileNotificationsManager, subscribeToNotifications } from '../../services/notificationsData';

export const AdminDashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Add Group Modal State
  const [isAddGroupModalOpen, setIsAddGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupScheme, setNewGroupScheme] = useState<'Auction' | 'Fixed' | 'Regular'>('Auction');
  const [creatingGroup, setCreatingGroup] = useState(false);

  // Add Customer / Member into Group Modal State (matching Web App exactly)
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [availableGroups, setAvailableGroups] = useState<any[]>([]);
  const [allCustomersList, setAllCustomersList] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  
  // Search & Verification state (exact Web match)
  const [searchMobile, setSearchMobile] = useState('');
  const [foundCustomer, setFoundCustomer] = useState<any | null>(null);
  const [verificationCustomer, setVerificationCustomer] = useState<any | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);

  // Enrollment configuration state (exact Web match)
  const [memberScheme, setMemberScheme] = useState<'Regular' | 'Fixed' | 'Auction'>('Regular');
  const [customChitValue, setCustomChitValue] = useState('100000');
  const [customDuration, setCustomDuration] = useState('20');
  const [customerEnrollInstallment, setCustomerEnrollInstallment] = useState('5000');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(15);
    if (d.getTime() < Date.now()) d.setMonth(d.getMonth() + 1);
    return d.toISOString().split('T')[0];
  });
  const [enrollingMember, setEnrollingMember] = useState(false);

  // Live Metrics
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [activeGroups, setActiveGroups] = useState(0);
  const [totalCollections, setTotalCollections] = useState(0);
  const [totalDues, setTotalDues] = useState(0);

  // Enrollment by scheme breakdown (matching design reference)
  const [fixedEnrollments, setFixedEnrollments] = useState(0);
  const [regularEnrollments, setRegularEnrollments] = useState(0);
  const [auctionEnrollments, setAuctionEnrollments] = useState(0);

  const [recentCustomers, setRecentCustomers] = useState<any[]>([]);
  const [recentLedger, setRecentLedger] = useState<any[]>([]);

  const loadAllMetrics = async () => {
    try {
      const [custs, groups, ledger, notifs] = await Promise.all([
        DataSyncManager.getCustomers(),
        DataSyncManager.getChitGroups(),
        DataSyncManager.getLedgerTransactions(),
        MobileNotificationsManager.getNotifications().catch(() => []),
      ]);

      setUnreadNotifsCount(notifs.filter((n: any) => !n.isRead).length);
      setAllCustomersList(custs);
      setAvailableGroups(groups);
      if (groups.length > 0 && !selectedGroupId) {
        setSelectedGroupId(groups[0].id);
      }

      setTotalCustomers(custs.length);
      setActiveGroups(groups.length);

      const totalPaid = custs.reduce((acc, c) => acc + Number(c.totalPaid || 0), 0);
      const dues = custs.reduce((acc, c) => acc + Number(c.pending || 0), 0);
      setTotalCollections(totalPaid);
      setTotalDues(dues);

      // Compute scheme counts across all customer chits
      let fix = 0;
      let reg = 0;
      let auc = 0;
      custs.forEach((c) => {
        if (Array.isArray(c.chits)) {
          c.chits.forEach((ch: any) => {
            const sch = String(ch.scheme || ch.type || '').toUpperCase();
            if (sch.includes('FIX')) fix += 1;
            else if (sch.includes('AUC')) auc += 1;
            else reg += 1;
          });
        }
      });
      setFixedEnrollments(fix);
      setRegularEnrollments(reg);
      setAuctionEnrollments(auc);

      setRecentCustomers(custs.slice(0, 4));
      setRecentLedger(ledger.slice(0, 4));
    } catch (e) {
      console.warn('Dashboard sync error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      Alert.alert('Validation Error', 'Please enter a chit group name.');
      return;
    }
    setCreatingGroup(true);
    try {
      await DataSyncManager.createChitGroup({
        name: newGroupName.trim(),
        type: newGroupScheme,
        value: 100000,
        duration: 20,
        members: 20,
      });
      setIsAddGroupModalOpen(false);
      setNewGroupName('');
      await loadAllMetrics();
      Alert.alert('Group Created', `Group "${newGroupName.trim()}" has been created successfully!`);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to create group');
    } finally {
      setCreatingGroup(false);
    }
  };

  const executeCustomerSearch = async () => {
    const q = searchMobile.trim();
    if (!q) {
      setSearchError('Please enter a 10-digit mobile number or customer name/ID.');
      return;
    }
    const cleanDigits = q.replace(/\D/g, '');
    setIsSearchingCustomer(true);
    setSearchError(null);

    try {
      // 1. Check local customers
      let matched = allCustomersList.find((c: any) => {
        const cMobile = (c.mobile || c.phone || '').replace(/\D/g, '');
        const cId = String(c.id || c.customerCode || '').toLowerCase();
        const cName = String(c.name || c.fullName || '').toLowerCase();
        return (
          (cleanDigits && cMobile === cleanDigits) ||
          (cleanDigits.length >= 7 && cMobile.includes(cleanDigits)) ||
          (cId && cId === q.toLowerCase()) ||
          (cName && cName === q.toLowerCase())
        );
      });

      if (!matched && cleanDigits.length >= 4) {
        matched = allCustomersList.find((c: any) => {
          const cMobile = (c.mobile || c.phone || '').replace(/\D/g, '');
          return cMobile.includes(cleanDigits);
        });
      }

      if (!matched && q.length >= 3) {
        matched = allCustomersList.find((c: any) => {
          const cName = String(c.name || c.fullName || '').toLowerCase();
          return cName.includes(q.toLowerCase());
        });
      }

      if (matched) {
        setVerificationCustomer(matched);
        setSearchError(null);
      } else {
        setVerificationCustomer(null);
        setSearchError(`No customer found with "${q}". Please check or create a new customer.`);
      }
    } finally {
      setIsSearchingCustomer(false);
    }
  };

  const handleEnrollCustomer = async () => {
    if (!selectedGroupId) {
      Alert.alert('Validation Error', 'Please select a chit group.');
      return;
    }
    if (!foundCustomer) {
      Alert.alert('Validation Error', 'Please search and select a verified customer to enroll.');
      return;
    }

    const val = Number(customChitValue) || 100000;
    const dur = Number(customDuration) || 20;
    const installment =
      Number(customerEnrollInstallment) || (dur > 0 ? Math.round(val / dur) : 5000);

    const targetGroup = availableGroups.find((g) => g.id === selectedGroupId);

    setEnrollingMember(true);
    try {
      await DataSyncManager.enrollMemberToGroup({
        customerId: foundCustomer.id,
        groupId: selectedGroupId,
        groupName: targetGroup?.name || selectedGroupId,
        scheme: memberScheme,
        chitValue: val,
        duration: dur,
        monthlyInstallment: installment,
      });

      setIsEnrollModalOpen(false);
      setFoundCustomer(null);
      setSearchMobile('');
      setVerificationCustomer(null);
      await loadAllMetrics();
      Alert.alert(
        'Member Enrolled',
        `Successfully enrolled "${foundCustomer.name}" into "${targetGroup?.name || selectedGroupId}"!`
      );
    } catch (e: any) {
      Alert.alert('Enrollment Error', e?.message || 'Failed to enroll member into group.');
    } finally {
      setEnrollingMember(false);
    }
  };

  useEffect(() => {
    loadAllMetrics();
    const unsub = subscribeToNotifications(() => {
      MobileNotificationsManager.getUnreadCount(user?.id, user?.role).then((count) => {
        setUnreadNotifsCount(count);
      });
    });
    return () => unsub();
  }, [user?.id, user?.role]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAllMetrics();
  };

  const displayName = user?.name || 'Dhanush J';
  const userInitials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={Colors.gold.primary}
        />
      }
    >
      <StatusBar barStyle="dark-content" />

      {/* 1. Light Premium Header Bar */}
      <View style={styles.navyHeader}>
        {/* Brand bar with notification and profile avatar */}
        <View style={styles.topBarRow}>
          <View style={styles.brandGroup}>
            <View style={styles.logoCircle}>
              <Ionicons name="sparkles" size={16} color="#1D4ED8" />
            </View>
            <View>
              <Text style={styles.brandTitleText}>Jenista</Text>
              <Text style={styles.brandSubText}>Chit Funds</Text>
            </View>
          </View>

          <View style={styles.headerRightActions}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => navigation.navigate('Notifications')}
              activeOpacity={0.7}
            >
              <Ionicons name="notifications-outline" size={20} color="#0F172A" />
              {unreadNotifsCount > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>
                    {unreadNotifsCount > 9 ? '9+' : unreadNotifsCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.userAvatarBtn}
              onPress={() => navigation.navigate('Settings')}
              activeOpacity={0.7}
            >
              <Text style={styles.userAvatarText}>{userInitials}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Greeting Banner */}
        <View style={styles.greetingRow}>
          <View style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
            <Text style={styles.greetingSub}>Good Morning,</Text>
            <Text style={styles.greetingName} numberOfLines={1}>{displayName}</Text>
            <Text style={styles.greetingTagline} numberOfLines={1}>Your dreams, our support —</Text>
          </View>

          {/* Interactive Responsive Wallet & Fund Shortcut */}
          <TouchableOpacity
            style={styles.coinGraphicBox}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Ledger')}
            accessibilityRole="button"
            accessibilityLabel="View Ledger and Cumulative Funds"
          >
            <Ionicons name="wallet" size={26} color="#1D4ED8" />
            <View style={styles.sparkleDot} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Overlapping Total Cumulative Fund Hero Card */}
      <View style={styles.fundCardWrapper}>
        <TouchableOpacity
          style={styles.fundCard}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Ledger')}
        >
          <View style={styles.fundCardContent}>
            <View style={styles.fundIconCircle}>
              <Ionicons name="wallet-outline" size={22} color="#1D4ED8" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.fundLabel}>Total Cumulative Fund</Text>
              <Text style={styles.fundAmount}>{formatCurrency(totalCollections)}</Text>
              <View style={styles.fundTrendRow}>
                <Ionicons name="trending-up" size={14} color="#059669" />
                <Text style={styles.fundTrendText}>
                  +₹{Math.round(totalCollections * 0.08).toLocaleString('en-IN')} this month
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </View>
        </TouchableOpacity>
      </View>

      {/* 3. KPI Cards Section with Photorealistic Gold Coins Hand Visual */}
      <View style={styles.kpiSectionContainer}>
        {/* Top Section Header with Title on Left & Photorealistic Gold Coins Growth Visual on Right */}
        <View style={styles.kpiHeaderRow}>
          <View style={styles.kpiHeaderLeft}>
            <View style={styles.kpiBadge}>
              <View style={styles.kpiBadgeDot} />
              <Text style={styles.kpiBadgeText}>KEY PORTFOLIO METRICS</Text>
            </View>
            <Text style={styles.kpiSectionTitle}>Chit Schemes Overview</Text>
            <Text style={styles.kpiSectionSubtitle}>Live enrollment status across all funds</Text>
          </View>
          <View style={styles.kpiVisualCard}>
            <Image
              source={require('../../assets/gold-coins-hand.png')}
              style={styles.kpiVisualImage}
              resizeMode="cover"
            />
          </View>
        </View>

        {/* 2 × 2 Premium KPI Cards Grid */}
        <View style={styles.gridContainer}>
          {/* Card 1: Total Groups (Blue Accent #102B63) */}
          <TouchableOpacity
            style={styles.metricCard}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('ChitGroupList')}
          >
            {/* Subtle curved corner decoration */}
            <View style={[styles.cardCornerDeco, { backgroundColor: '#EFF6FF' }]} />

            <View style={[styles.metricIconWrap, { backgroundColor: '#EFF6FF', borderColor: '#DBEAFE' }]}>
              <Ionicons name="people" size={19} color="#102B63" />
            </View>
            <Text style={styles.metricTitle}>Total Groups</Text>
            <Text style={styles.metricValue}>{activeGroups}</Text>
            <Text style={styles.metricSub}>Active Schemes</Text>
          </TouchableOpacity>

          {/* Card 2: Fixed Enrollments (Gold Accent #D7A928) */}
          <TouchableOpacity
            style={styles.metricCard}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('CustomerList', { schemeFilter: 'FIXED' })}
          >
            {/* Subtle curved corner decoration */}
            <View style={[styles.cardCornerDeco, { backgroundColor: '#FEF9E7' }]} />

            <View style={[styles.metricIconWrap, { backgroundColor: '#FEF9E7', borderColor: '#FDE68A' }]}>
              <Ionicons name="shield-checkmark" size={19} color="#D7A928" />
            </View>
            <Text style={styles.metricTitle}>Fixed Enrollments</Text>
            <Text style={styles.metricValue}>{fixedEnrollments}</Text>
            <Text style={styles.metricSub}>Assured Returns</Text>
          </TouchableOpacity>

          {/* Card 3: Regular Enrollments (Green Accent #18A875) */}
          <TouchableOpacity
            style={styles.metricCard}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('CustomerList', { schemeFilter: 'REGULAR' })}
          >
            {/* Subtle curved corner decoration */}
            <View style={[styles.cardCornerDeco, { backgroundColor: '#ECFDF5' }]} />

            <View style={[styles.metricIconWrap, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
              <Ionicons name="trending-up" size={19} color="#18A875" />
            </View>
            <Text style={styles.metricTitle}>Regular Enrollments</Text>
            <Text style={styles.metricValue}>{regularEnrollments}</Text>
            <Text style={styles.metricSub}>Monthly Dividend</Text>
          </TouchableOpacity>

          {/* Card 4: Auction Enrollments (Purple Accent #7952D6) */}
          <TouchableOpacity
            style={styles.metricCard}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('CustomerList', { schemeFilter: 'AUCTION' })}
          >
            {/* Subtle curved corner decoration */}
            <View style={[styles.cardCornerDeco, { backgroundColor: '#FAF5FF' }]} />

            <View style={[styles.metricIconWrap, { backgroundColor: '#FAF5FF', borderColor: '#E9D5FF' }]}>
              <Ionicons name="hammer" size={19} color="#7952D6" />
            </View>
            <Text style={styles.metricTitle}>Auction Enrollments</Text>
            <Text style={styles.metricValue}>{auctionEnrollments}</Text>
            <Text style={styles.metricSub}>Competitive Bidding</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 4. Quick Actions Tiles Row (Add Group, Add Member, Record Payments, More) */}
      <View style={styles.quickActionsCard}>
        <TouchableOpacity
          style={styles.actionTile}
          onPress={() => {
            setNewGroupName('');
            setNewGroupScheme('Auction');
            setIsAddGroupModalOpen(true);
          }}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIconCircle, { backgroundColor: '#FFF8EB' }]}>
            <Ionicons name="add" size={22} color={Colors.gold.dark} />
          </View>
          <Text style={styles.actionTileText} numberOfLines={2}>Add Group</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionTile}
          onPress={() => setIsEnrollModalOpen(true)}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIconCircle, { backgroundColor: '#F0FDF4' }]}>
            <Ionicons name="person-add" size={20} color="#16A34A" />
          </View>
          <Text style={styles.actionTileText} numberOfLines={2}>Add to Group</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionTile}
          onPress={() => navigation.navigate('AddCustomer')}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIconCircle, { backgroundColor: Colors.blueSubtle }]}>
            <Ionicons name="person-add-outline" size={20} color={Colors.blueAccent} />
          </View>
          <Text style={styles.actionTileText} numberOfLines={2}>Add Member</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionTile}
          onPress={() => navigation.navigate('ReceiptEntry')}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIconCircle, { backgroundColor: Colors.successLight }]}>
            <Ionicons name="card-outline" size={20} color={Colors.success} />
          </View>
          <Text style={styles.actionTileText} numberOfLines={2}>Record Payments</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionTile}
          onPress={() => navigation.navigate('StaffManagement')}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIconCircle, { backgroundColor: '#EEF2FF' }]}>
            <Ionicons name="people" size={20} color="#4338CA" />
          </View>
          <Text style={styles.actionTileText} numberOfLines={2}>Staff Team</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionTile}
          onPress={() => navigation.navigate('ConversationsList')}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIconCircle, { backgroundColor: '#FDF2F8' }]}>
            <Ionicons name="chatbubbles" size={20} color="#BE185D" />
          </View>
          <Text style={styles.actionTileText} numberOfLines={2}>Support Chat</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionTile}
          onPress={() => navigation.navigate('Reports')}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIconCircle, { backgroundColor: '#F1F5F9' }]}>
            <Ionicons name="ellipsis-horizontal" size={20} color={Colors.navy.primary} />
          </View>
          <Text style={styles.actionTileText} numberOfLines={2}>More</Text>
        </TouchableOpacity>
      </View>

      {/* 5. Enrolled Members Section */}
      <View style={styles.sectionHeaderCard}>
        <View style={styles.sectionHeaderLeft}>
          <View style={[styles.sectionIconCircle, { backgroundColor: '#EFF6FF' }]}>
            <Ionicons name="people" size={18} color="#2563EB" />
          </View>
          <View>
            <Text style={styles.sectionTitle}>Enrolled Members</Text>
            <Text style={styles.sectionSubtitle}>Subscribers & active chits</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.sectionActionPill}
          onPress={() => navigation.navigate('CustomerList')}
          activeOpacity={0.7}
        >
          <Text style={styles.sectionActionPillText}>View All ({totalCustomers})</Text>
          <Ionicons name="chevron-forward" size={14} color="#2563EB" />
        </TouchableOpacity>
      </View>

      <View style={styles.listWrapper}>
        {recentCustomers.length === 0 ? (
          <View style={styles.emptySectionCard}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="person-add-outline" size={24} color="#94A3B8" />
            </View>
            <Text style={styles.emptySectionTitle}>No members registered yet</Text>
            <Text style={styles.emptySectionSub}>
              Register members or enroll customers into chit groups to track dues.
            </Text>
            <TouchableOpacity
              style={styles.emptyActionBtn}
              onPress={() => navigation.navigate('AddCustomer')}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={16} color="#FFFFFF" />
              <Text style={styles.emptyActionBtnText}>Add New Member</Text>
            </TouchableOpacity>
          </View>
        ) : (
          recentCustomers.map((cust) => {
            const isPending = Number(cust.pending || 0) > 0;
            const initial = (cust.name || 'M').charAt(0).toUpperCase();

            return (
              <TouchableOpacity
                key={cust.id}
                style={styles.customerRowCard}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('CustomerDetail', { customer: cust })}
              >
                <View style={styles.avatarBubble}>
                  <Text style={styles.avatarBubbleText}>{initial}</Text>
                </View>

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.custRowName}>{cust.name}</Text>
                  <Text style={styles.custRowMeta}>
                    {cust.chits?.[0]?.groupName || cust.id} • {cust.phone || 'No contact'}
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.custRowAmount}>
                    {isPending ? formatCurrency(cust.pending) : '₹0'}
                  </Text>
                  <View
                    style={[
                      styles.statusPillSmall,
                      isPending ? styles.pillPending : styles.pillPaid,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillTextSmall,
                        isPending ? styles.textPending : styles.textPaid,
                      ]}
                    >
                      {isPending ? 'Pending' : 'Paid'}
                    </Text>
                  </View>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={Colors.border}
                  style={{ marginLeft: 6 }}
                />
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {/* 6. Recent Ledger Transactions Section */}
      <View style={[styles.sectionHeaderCard, { marginTop: 22 }]}>
        <View style={styles.sectionHeaderLeft}>
          <View style={[styles.sectionIconCircle, { backgroundColor: '#ECFDF5' }]}>
            <Ionicons name="receipt" size={18} color="#059669" />
          </View>
          <View>
            <Text style={styles.sectionTitle}>Recent Payments</Text>
            <Text style={styles.sectionSubtitle}>Live collections & receipts</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.sectionActionPill}
          onPress={() => navigation.navigate('Ledger')}
          activeOpacity={0.7}
        >
          <Text style={styles.sectionActionPillText}>Full Ledger</Text>
          <Ionicons name="chevron-forward" size={14} color="#2563EB" />
        </TouchableOpacity>
      </View>

      <View style={styles.listWrapper}>
        {recentLedger.length === 0 ? (
          <View style={styles.emptySectionCard}>
            <View style={[styles.emptyIconCircle, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="receipt-outline" size={24} color="#059669" />
            </View>
            <Text style={styles.emptySectionTitle}>No payment receipts yet</Text>
            <Text style={styles.emptySectionSub}>
              Record collection vouchers or verify member payment proofs to view transactions.
            </Text>
            <TouchableOpacity
              style={[styles.emptyActionBtn, { backgroundColor: '#059669' }]}
              onPress={() => navigation.navigate('ReceiptEntry')}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle-outline" size={16} color="#FFFFFF" />
              <Text style={styles.emptyActionBtnText}>Record Payment</Text>
            </TouchableOpacity>
          </View>
        ) : (
          recentLedger.map((tx) => {
            const isCredit = tx.type === 'CREDIT';
            return (
              <View key={tx.id} style={styles.ledgerRowCard}>
                <View
                  style={[
                    styles.txIconBox,
                    { backgroundColor: isCredit ? Colors.successLight : Colors.dangerLight },
                  ]}
                >
                  <Ionicons
                    name={isCredit ? 'arrow-down' : 'arrow-up'}
                    size={16}
                    color={isCredit ? Colors.success : Colors.danger}
                  />
                </View>

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.txRowDesc} numberOfLines={1}>
                    {tx.description}
                  </Text>
                  <Text style={styles.txRowRef}>{tx.reference}</Text>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text
                    style={[
                      styles.txRowAmount,
                      { color: isCredit ? Colors.success : Colors.danger },
                    ]}
                  >
                    {isCredit ? '+' : '-'}{formatCurrency(tx.amount)}
                  </Text>
                  <Text style={styles.txRowMode}>{tx.paymentMode || 'Cash'}</Text>
                </View>
              </View>
            );
          })
        )}
      </View>

      <View style={{ height: 48 }} />

      {/* Add Chit Group Modal (Matches Web App Experience) */}
      <Modal
        visible={isAddGroupModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsAddGroupModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Add New Chit Group</Text>
                <Text style={styles.modalSubtitle}>
                  Enter group name to create the group and start adding customers.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsAddGroupModalOpen(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Input Field */}
            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>GROUP NAME *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Diamond Series A or Chit Group 1"
                placeholderTextColor={Colors.textMuted}
                value={newGroupName}
                onChangeText={setNewGroupName}
                autoFocus
              />
              <Text style={styles.helperText}>
                Only group name is needed to create the group.
              </Text>

              {/* Scheme Category Selection */}
              <Text style={[styles.inputLabel, { marginTop: 16 }]}>DEFAULT SCHEME TYPE</Text>
              <View style={styles.schemeChipRow}>
                {(['Auction', 'Fixed', 'Regular'] as const).map((scheme) => {
                  const isSelected = newGroupScheme === scheme;
                  return (
                    <TouchableOpacity
                      key={scheme}
                      style={[
                        styles.schemeChip,
                        isSelected && styles.schemeChipActive,
                      ]}
                      onPress={() => setNewGroupScheme(scheme)}
                    >
                      <Text
                        style={[
                          styles.schemeChipText,
                          isSelected && styles.schemeChipTextActive,
                        ]}
                      >
                        {scheme}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Info Note Box */}
              <View style={styles.infoNoteBox}>
                <View style={styles.infoNoteHeader}>
                  <View style={styles.goldDot} />
                  <Text style={styles.infoNoteTitle}>Flexible Mixed Schemes</Text>
                </View>
                <Text style={styles.infoNoteBody}>
                  Once created, you can add customers to this group. Each customer can have their own individual scheme (Fixed, Regular, or Auction), duration, and chit value.
                </Text>
              </View>
            </View>

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsAddGroupModalOpen(false)}
                disabled={creatingGroup}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.createBtn,
                  (!newGroupName.trim() || creatingGroup) && styles.createBtnDisabled,
                ]}
                onPress={handleCreateGroup}
                disabled={!newGroupName.trim() || creatingGroup}
              >
                <Text style={styles.createBtnText}>
                  {creatingGroup ? 'Creating...' : 'Create Group'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Enroll Customer into Group (Exact Web Experience) */}
      <Modal
        visible={isEnrollModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsEnrollModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '92%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Enroll Customer into Group</Text>
                <Text style={styles.modalSubtitle}>
                  Search customer by mobile number to verify and enroll.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsEnrollModalOpen(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalBody}>
              {/* Target Chit Group Picker */}
              <Text style={styles.inputLabel}>TARGET CHIT GROUP *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {availableGroups.map((g) => {
                    const isSelected = selectedGroupId === g.id;
                    return (
                      <TouchableOpacity
                        key={g.id}
                        style={[
                          styles.itemPickerChip,
                          isSelected && styles.itemPickerChipActive,
                        ]}
                        onPress={() => setSelectedGroupId(g.id)}
                      >
                        <Text
                          style={[
                            styles.itemPickerChipText,
                            isSelected && styles.itemPickerChipTextActive,
                          ]}
                        >
                          {g.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              {/* 1. Search Customer by Mobile Number */}
              <Text style={styles.inputLabel}>1. SEARCH CUSTOMER BY MOBILE NUMBER *</Text>
              <View style={styles.searchRow}>
                <View style={styles.searchBarWrapper}>
                  <TextInput
                    style={styles.searchTextInput}
                    placeholder="Enter full 10-digit mobile number..."
                    placeholderTextColor={Colors.textMuted}
                    value={searchMobile}
                    keyboardType="phone-pad"
                    onChangeText={(txt) => {
                      setSearchMobile(txt);
                      if (searchError) setSearchError(null);
                    }}
                    onSubmitEditing={executeCustomerSearch}
                  />
                  {searchMobile.length > 0 && (
                    <TouchableOpacity
                      onPress={() => {
                        setSearchMobile('');
                        setFoundCustomer(null);
                        setSearchError(null);
                      }}
                      style={styles.searchClearBtn}
                    >
                      <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.searchActionBtn}
                  onPress={executeCustomerSearch}
                  disabled={isSearchingCustomer || !searchMobile.trim()}
                >
                  {isSearchingCustomer ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <>
                      <Ionicons name="search" size={15} color={Colors.white} />
                      <Text style={styles.searchActionText}>Search</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Search Error Notice */}
              {searchError && (
                <View style={styles.searchErrorBox}>
                  <Ionicons name="alert-circle" size={16} color={Colors.danger} />
                  <Text style={styles.searchErrorText}>{searchError}</Text>
                </View>
              )}

              {/* Verified Selected Customer Details (exact match to Web green card) */}
              {foundCustomer && (
                <View style={styles.verifiedCustomerCard}>
                  <View style={styles.verifiedCheckCircle}>
                    <Ionicons name="checkmark" size={16} color="#065F46" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.verifiedCustomerName}>{foundCustomer.name}</Text>
                      <View style={styles.verifiedBadge}>
                        <Text style={styles.verifiedBadgeText}>Verified</Text>
                      </View>
                    </View>
                    <Text style={styles.verifiedCustomerMeta}>
                      {foundCustomer.mobile || foundCustomer.phone} • ID: {foundCustomer.id}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setFoundCustomer(null);
                      setSearchMobile('');
                    }}
                    style={styles.changeCustomerBtn}
                  >
                    <Text style={styles.changeCustomerText}>Change</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* 2. Scheme / Plan Type Selection (Regular, Fixed, Auction) */}
              <Text style={[styles.inputLabel, { marginTop: 14 }]}>
                2. SELECT SCHEME / PLAN TYPE *
              </Text>
              <View style={styles.schemeChipRow}>
                {[
                  { type: 'Regular', label: 'Regular', desc: 'Standard savings' },
                  { type: 'Fixed', label: 'Fixed', desc: 'Dividend return' },
                  { type: 'Auction', label: 'Auction', desc: 'Monthly bid' },
                ].map((s) => {
                  const isSelected = memberScheme === s.type;
                  return (
                    <TouchableOpacity
                      key={s.type}
                      style={[
                        styles.schemeSelectCard,
                        isSelected && styles.schemeSelectCardActive,
                      ]}
                      onPress={() => setMemberScheme(s.type as any)}
                    >
                      <Text
                        style={[
                          styles.schemeSelectTitle,
                          isSelected && styles.schemeSelectTitleActive,
                        ]}
                      >
                        {s.label}
                      </Text>
                      <Text style={styles.schemeSelectDesc}>{s.desc}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* 3. Duration & Due Date */}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>3. DURATION (MOS) *</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={customDuration}
                    onChangeText={(txt) => {
                      setCustomDuration(txt);
                      const m = Number(txt) || 20;
                      const val = Number(customChitValue) || 100000;
                      if (m > 0 && val > 0) {
                        setCustomerEnrollInstallment(Math.round(val / m).toString());
                      }
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>DUE DATE</Text>
                  <TextInput
                    style={styles.textInput}
                    value={dueDate}
                    onChangeText={setDueDate}
                  />
                </View>
              </View>

              {/* 4. Chit Value and Monthly Installment */}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>CHIT VALUE (₹) *</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={customChitValue}
                    onChangeText={(txt) => {
                      setCustomChitValue(txt);
                      const val = Number(txt) || 0;
                      const m = Number(customDuration) || 20;
                      if (m > 0 && val > 0) {
                        setCustomerEnrollInstallment(Math.round(val / m).toString());
                      }
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>INSTALLMENT (₹) *</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={customerEnrollInstallment}
                    onChangeText={setCustomerEnrollInstallment}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsEnrollModalOpen(false)}
                disabled={enrollingMember}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.createBtn,
                  (!foundCustomer || !selectedGroupId || enrollingMember) && styles.createBtnDisabled,
                ]}
                onPress={handleEnrollCustomer}
                disabled={!foundCustomer || !selectedGroupId || enrollingMember}
              >
                <Text style={styles.createBtnText}>
                  {enrollingMember ? 'Enrolling...' : `Enroll Customer (${memberScheme})`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Verification Customer Popup Box (exact match to Web verification popup) */}
      {verificationCustomer && (
        <Modal
          visible={!!verificationCustomer}
          transparent
          animationType="fade"
          onRequestClose={() => setVerificationCustomer(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { maxWidth: 360 }]}>
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={styles.greenDotPulse} />
                  <Text style={styles.modalTitle}>Verify Customer Details</Text>
                </View>
                <TouchableOpacity onPress={() => setVerificationCustomer(null)}>
                  <Ionicons name="close" size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={{ paddingVertical: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={styles.verifyAvatarCircle}>
                    <Text style={styles.verifyAvatarText}>
                      {(verificationCustomer.name || 'C').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.verifyNameText}>{verificationCustomer.name}</Text>
                    <Text style={styles.verifyMetaText}>ID: {verificationCustomer.id}</Text>
                  </View>
                </View>

                <View style={styles.verifySummaryCard}>
                  <View style={styles.verifyRow}>
                    <Text style={styles.verifyRowLabel}>Mobile Number:</Text>
                    <Text style={styles.verifyRowVal}>
                      {verificationCustomer.mobile || verificationCustomer.phone || '—'}
                    </Text>
                  </View>
                  {verificationCustomer.address ? (
                    <View style={styles.verifyRow}>
                      <Text style={styles.verifyRowLabel}>Address:</Text>
                      <Text style={styles.verifyRowVal} numberOfLines={1}>
                        {verificationCustomer.address}
                      </Text>
                    </View>
                  ) : null}
                  <View style={styles.verifyRow}>
                    <Text style={styles.verifyRowLabel}>Enrolling Into:</Text>
                    <Text style={[styles.verifyRowVal, { color: Colors.gold.dark }]}>
                      {availableGroups.find((g) => g.id === selectedGroupId)?.name || selectedGroupId}
                    </Text>
                  </View>
                </View>

                <Text style={styles.verifyPromptText}>
                  Please verify that these customer details match before enrolling into this chit fund group.
                </Text>
              </View>

              <View style={{ gap: 8 }}>
                <TouchableOpacity
                  style={styles.confirmVerifyBtn}
                  onPress={() => {
                    setFoundCustomer(verificationCustomer);
                    setVerificationCustomer(null);
                    setSearchError(null);
                  }}
                >
                  <Ionicons name="checkmark-circle" size={16} color={Colors.white} />
                  <Text style={styles.confirmVerifyText}>✓ Verify & Add Customer</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelVerifyBtn}
                  onPress={() => setVerificationCustomer(null)}
                >
                  <Text style={styles.cancelVerifyText}>Cancel / Search Again</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContentContainer: {
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: 40,
  },

  // 1. Light Premium Header Bar
  navyHeader: {
    backgroundColor: '#F8FAFC',
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 40,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitleText: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  brandSubText: {
    color: '#2563EB',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  notifBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '900',
  },
  userAvatarBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    color: '#1D4ED8',
    fontSize: 13,
    fontWeight: '800',
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  greetingSub: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '500',
  },
  greetingName: {
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: 0.3,
  },
  greetingTagline: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  coinGraphicBox: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    flexShrink: 0,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  sparkleDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563EB',
  },

  // 2. Overlapping Fund Card
  fundCardWrapper: {
    paddingHorizontal: 20,
    marginTop: -24,
  },
  fundCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 18,
    shadowColor: Colors.navy.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  fundCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fundIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: Colors.gold.subtle,
    borderWidth: 1,
    borderColor: Colors.gold.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fundLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  fundAmount: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: -0.5,
  },
  fundTrendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  fundTrendText: {
    color: Colors.success,
    fontSize: 12,
    fontWeight: '700',
  },

  // 3. Premium KPI Section & 2x2 Scheme Metric Cards
  kpiSectionContainer: {
    marginTop: 18,
    marginHorizontal: 16,
  },
  kpiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  kpiHeaderLeft: {
    flex: 1,
    paddingRight: 10,
  },
  kpiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  kpiBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D7A928',
    marginRight: 6,
  },
  kpiBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D7A928',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  kpiSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#102B63',
    letterSpacing: -0.3,
  },
  kpiSectionSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 1,
  },
  kpiVisualCard: {
    width: 68,
    height: 68,
    borderRadius: 18,
    backgroundColor: '#FBF8F0',
    borderWidth: 1.5,
    borderColor: '#EDE8DF',
    overflow: 'hidden',
    shadowColor: '#102B63',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  kpiVisualImage: {
    width: '100%',
    height: '100%',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EDE8DF',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#102B63',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardCornerDeco: {
    position: 'absolute',
    top: -16,
    right: -16,
    width: 64,
    height: 64,
    borderRadius: 32,
    opacity: 0.75,
  },
  metricIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 1,
  },
  metricTitle: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#102B63',
    marginTop: 3,
    marginBottom: 2,
    letterSpacing: -0.4,
  },
  metricSub: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '500',
  },

  // 4. Quick Actions
  quickActionsCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 6,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  actionTile: {
    alignItems: 'center',
    flex: 1,
    maxWidth: '20%',
    paddingHorizontal: 2,
  },
  actionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actionTileText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 13,
    minHeight: 26,
  },

  // 5. Section Headers & Lists
  sectionHeaderCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  sectionIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 1,
  },
  sectionActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  sectionActionPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  emptySectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptySectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  emptySectionSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 14,
    maxWidth: 260,
    lineHeight: 16,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  listWrapper: {
    paddingHorizontal: 20,
    gap: 10,
  },
  customerRowCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatarBubble: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBubbleText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  custRowName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  custRowMeta: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  custRowAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.text,
  },
  statusPillSmall: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 3,
  },
  pillPaid: {
    backgroundColor: Colors.successLight,
  },
  pillPending: {
    backgroundColor: Colors.warningLight,
  },
  statusPillTextSmall: {
    fontSize: 10,
    fontWeight: '700',
  },
  textPaid: {
    color: Colors.success,
  },
  textPending: {
    color: Colors.warning,
  },

  // 6. Ledger Rows
  ledgerRowCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  txIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txRowDesc: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  txRowRef: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  txRowAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
  txRowMode: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textMuted,
    marginTop: 2,
  },

  // 7. Add Group Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 22,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.text,
  },
  modalSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    lineHeight: 16,
  },
  modalCloseBtn: {
    padding: 4,
    marginLeft: 10,
  },
  modalBody: {
    paddingVertical: 16,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  helperText: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 6,
  },
  schemeChipRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  schemeChip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },
  schemeChipActive: {
    backgroundColor: '#FFF8EB',
    borderColor: Colors.gold.primary,
  },
  schemeChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  schemeChipTextActive: {
    color: Colors.gold.dark,
  },
  infoNoteBox: {
    backgroundColor: '#FFFBF0',
    borderWidth: 1,
    borderColor: '#FDECD2',
    borderRadius: 14,
    padding: 12,
    marginTop: 16,
  },
  infoNoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  goldDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.gold.primary,
  },
  infoNoteTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.gold.dark,
  },
  infoNoteBody: {
    fontSize: 11,
    color: '#8A5D1B',
    lineHeight: 16,
    marginTop: 4,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#F8FAFC',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  createBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.gold.primary,
  },
  createBtnDisabled: {
    opacity: 0.5,
  },
  createBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.navy.primary,
  },
  itemPickerChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#F8FAFC',
  },
  itemPickerChipActive: {
    backgroundColor: '#FFF8EB',
    borderColor: Colors.gold.primary,
  },
  itemPickerChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  itemPickerChipTextActive: {
    color: Colors.gold.dark,
    fontWeight: '800',
  },
  calculationPreviewBox: {
    marginTop: 14,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calculationPreviewLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  calculationPreviewValue: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.navy.primary,
  },

  // Search & Verification Styles (Exact Web Match)
  searchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  searchBarWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  searchTextInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 13,
    color: Colors.text,
    fontWeight: '600',
  },
  searchClearBtn: {
    padding: 4,
  },
  searchActionBtn: {
    backgroundColor: Colors.gold.dark,
    paddingHorizontal: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  searchActionText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '800',
  },
  searchErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: 12,
    padding: 10,
    marginTop: 8,
  },
  searchErrorText: {
    flex: 1,
    fontSize: 11,
    color: '#9F1239',
    fontWeight: '600',
  },
  verifiedCustomerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
  },
  verifiedCheckCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#6EE7B7',
  },
  verifiedCustomerName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#064E3B',
  },
  verifiedBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#047857',
  },
  verifiedCustomerMeta: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
    marginTop: 2,
  },
  changeCustomerBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#D1FAE5',
  },
  changeCustomerText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#047857',
  },
  schemeSelectCard: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#F8FAFC',
  },
  schemeSelectCardActive: {
    backgroundColor: '#FFF8EB',
    borderColor: Colors.gold.primary,
  },
  schemeSelectTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.text,
  },
  schemeSelectTitleActive: {
    color: Colors.gold.dark,
  },
  schemeSelectDesc: {
    fontSize: 9,
    color: Colors.textMuted,
    marginTop: 2,
  },
  greenDotPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  verifyAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyAvatarText: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.gold.dark,
  },
  verifyNameText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.text,
  },
  verifyMetaText: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  verifySummaryCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    marginTop: 12,
    gap: 6,
  },
  verifyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  verifyRowLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  verifyRowVal: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.text,
  },
  verifyPromptText: {
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 14,
  },
  confirmVerifyBtn: {
    backgroundColor: Colors.gold.dark,
    paddingVertical: 11,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  confirmVerifyText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '800',
  },
  cancelVerifyBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 9,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelVerifyText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
});
