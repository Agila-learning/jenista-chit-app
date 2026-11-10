import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Modal,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { DataSyncManager, getGroupSchemeType, normalizeGroupName } from '../../services/dataSync';
import { formatCurrency } from '../../utils/format';
import { ChitGroup } from '../../types';
import { showConfirmDialog, showAlert } from '../../utils/alert';

export const ChitGroupListScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [groups, setGroups] = useState<ChitGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<'ALL' | 'FIXED' | 'REGULAR' | 'AUCTION'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'CLOSED'>('ALL');

  // Add Group Modal State
  const [isAddGroupModalOpen, setIsAddGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupScheme, setNewGroupScheme] = useState<'Auction' | 'Fixed' | 'Regular'>('Auction');
  const [newGroupValue, setNewGroupValue] = useState('100000');
  const [newGroupDuration, setNewGroupDuration] = useState('20');
  const [newGroupMembers, setNewGroupMembers] = useState('20');
  const [creatingGroup, setCreatingGroup] = useState(false);

  const fetchGroups = async () => {
    try {
      const data = await DataSyncManager.getChitGroups();
      setGroups(data);
    } catch (e) {
      console.warn('Failed to load chit groups:', e);
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
      const val = Number(newGroupValue) || 100000;
      const dur = Number(newGroupDuration) || 20;
      const mem = Number(newGroupMembers) || 20;
      await DataSyncManager.createChitGroup({
        name: newGroupName.trim(),
        type: newGroupScheme,
        value: val,
        duration: dur,
        members: mem,
      });
      setIsAddGroupModalOpen(false);
      setNewGroupName('');
      setNewGroupValue('100000');
      setNewGroupDuration('20');
      setNewGroupMembers('20');
      await fetchGroups();
      Alert.alert('Group Created', `Group "${newGroupName.trim()}" has been created successfully!`);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to create group');
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleDeleteGroup = (group: ChitGroup) => {
    showConfirmDialog(
      'Delete Chit Group',
      `Are you sure you want to permanently delete "${group.name}"? All associated member enrollments, payment requests, and ledger entries will also be permanently removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            try {
              await DataSyncManager.deleteChitGroup({ id: group.id, name: group.name });
              setGroups((prev) => prev.filter((g) => g.id !== group.id && normalizeGroupName(g.name) !== normalizeGroupName(group.name)));
              showAlert('Deleted', `Chit group "${group.name}" was permanently removed.`);
            } catch (err: any) {
              showAlert('Error', err?.message || 'Failed to delete chit group');
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchGroups();
  };

  // Scheme counts across all groups
  const fixedCount = groups.filter((g) => getGroupSchemeType(g) === 'Fixed').length;
  const regularCount = groups.filter((g) => getGroupSchemeType(g) === 'Regular').length;
  const auctionCount = groups.filter((g) => getGroupSchemeType(g) === 'Auction').length;

  const filteredGroups = groups.filter((g) => {
    // 1. Search filter
    const q = search.toLowerCase().trim();
    if (q) {
      const matchesSearch =
        (g.name && g.name.toLowerCase().includes(q)) ||
        (g.id && g.id.toLowerCase().includes(q)) ||
        (g.type && g.type.toLowerCase().includes(q));
      if (!matchesSearch) return false;
    }

    // 2. Plan filter (Separate pages/tabs for each plan with exact counts)
    const schemeType = getGroupSchemeType(g);
    if (planFilter === 'FIXED' && schemeType !== 'Fixed') return false;
    if (planFilter === 'REGULAR' && schemeType !== 'Regular') return false;
    if (planFilter === 'AUCTION' && schemeType !== 'Auction') return false;

    // 3. Status filter
    if (statusFilter === 'ACTIVE' && (g.status || 'ACTIVE').toUpperCase() !== 'ACTIVE') return false;
    if (statusFilter === 'CLOSED' && (g.status || '').toUpperCase() !== 'CLOSED') return false;

    return true;
  });

  const renderGroupCard = ({ item }: { item: ChitGroup }) => {
    const isClosed = (item.status || '').toUpperCase() === 'CLOSED';
    const schemeType = getGroupSchemeType(item);
    const isAuction = schemeType === 'Auction';
    const isFixed = schemeType === 'Fixed';

    // Accent colors based on scheme type
    const accentColor = isFixed ? '#059669' : isAuction ? '#7C3AED' : '#D97706';
    const subtleBg = isFixed ? '#ECFDF5' : isAuction ? '#FAF5FF' : '#FEF9E7';
    const subtleBorder = isFixed ? '#A7F3D0' : isAuction ? '#E9D5FF' : '#FDE68A';

    const maxMembers = Number(item.members || 20);
    const filledMembers = Number(item.filled || 0);
    const percent = Math.min(100, Math.round((filledMembers / maxMembers) * 100));
    const monthlyInstallment = Math.round(Number(item.value || 100000) / Number(item.duration || 20));

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('ChitGroupDetail', { group: item })}
      >
        {/* Top Header Row: Category Icon, Name, Scheme Pill, Status */}
        <View style={styles.cardHeaderRow}>
          <View style={[styles.groupIconWrap, { backgroundColor: subtleBg, borderColor: subtleBorder }]}>
            <Ionicons
              name={isFixed ? 'shield-checkmark' : isAuction ? 'hammer' : 'trending-up'}
              size={20}
              color={accentColor}
            />
          </View>

          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={styles.groupNameText} numberOfLines={1}>{item.name}</Text>
              <View style={[styles.statusBadge, isClosed ? styles.statusBadgeClosed : styles.statusBadgeActive]}>
                <Text style={[styles.statusBadgeText, isClosed ? styles.statusTextClosed : styles.statusTextActive]}>
                  {isClosed ? 'Closed' : 'Active'}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 }}>
              <View style={[styles.schemeBadge, { backgroundColor: subtleBg, borderColor: subtleBorder }]}>
                <Text style={[styles.schemeBadgeText, { color: accentColor }]}>
                  {schemeType} Plan
                </Text>
              </View>
              <Text style={styles.groupCodeSub}>{item.id}</Text>
            </View>
          </View>
        </View>

        {/* Financial Overview Row: Chit Value, Monthly Due, Duration */}
        <View style={styles.financialMetricsRow}>
          <View style={styles.metricColumn}>
            <Text style={styles.metricColumnLabel}>CHIT VALUE</Text>
            <Text style={styles.metricColumnValueBold}>{formatCurrency(item.value || 100000)}</Text>
          </View>

          <View style={styles.metricDivider} />

          <View style={styles.metricColumn}>
            <Text style={styles.metricColumnLabel}>MONTHLY DUE</Text>
            <Text style={styles.metricColumnValue}>{formatCurrency(monthlyInstallment)}/mo</Text>
          </View>

          <View style={styles.metricDivider} />

          <View style={styles.metricColumn}>
            <Text style={styles.metricColumnLabel}>DURATION</Text>
            <Text style={styles.metricColumnValue}>{item.duration || 20} Months</Text>
          </View>
        </View>

        {/* Member Enrollment Capacity Bar */}
        <View style={styles.capacitySection}>
          <View style={styles.capacityHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Ionicons name="people" size={14} color="#64748B" />
              <Text style={styles.capacityLabel}>
                Enrolled: <Text style={styles.capacityValueBold}>{filledMembers}</Text> / {maxMembers} Members
              </Text>
            </View>
            <Text style={[styles.capacityPercent, { color: accentColor }]}>
              {percent}% {filledMembers >= maxMembers ? 'Full' : 'Enrolled'}
            </Text>
          </View>

          {/* Progress Bar Track */}
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.max(5, percent)}%`, backgroundColor: accentColor },
              ]}
            />
          </View>
        </View>

        {/* Card Footer: Action button & Delete */}
        <View style={styles.cardFooterRow}>
          <View style={styles.manageBtn}>
            <Text style={styles.manageBtnText}>Manage Members & Collect</Text>
            <Ionicons name="chevron-forward" size={15} color="#2563EB" />
          </View>

          <TouchableOpacity
            style={styles.deleteGroupBtn}
            onPress={() => handleDeleteGroup(item)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel={`Delete group ${item.name}`}
          >
            <Ionicons name="trash-outline" size={17} color={Colors.danger} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* 1. Top Section Space & Prominent "Create Chit Group" Action Banner */}
      <View style={styles.topActionBannerWrapper}>
        <View style={styles.topActionBanner}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <View style={styles.topBadgeRow}>
              <View style={styles.topBadgeDot} />
              <Text style={styles.topBadgeText}>SCHEME DIRECTORY</Text>
            </View>
            <Text style={styles.topBannerTitle}>Chit Groups & Plans</Text>
            <Text style={styles.topBannerSub}>Launch & manage active subscriber schemes</Text>
          </View>

          <TouchableOpacity
            style={styles.heroAddGroupBtn}
            onPress={() => {
              setNewGroupName('');
              setNewGroupScheme('Auction');
              setIsAddGroupModalOpen(true);
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.heroAddGroupText}>+ Add Group</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Search Bar for Fast Lookup */}
      <View style={styles.searchSection}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search schemes by name or code (e.g. JJ F 2 T)..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} style={{ padding: 4 }}>
              <Ionicons name="close-circle" size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 3. Dedicated Plan Tabs ("for each plan show in separate pages with proper counts") */}
      <View style={styles.planTabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.planTabsScroll}>
          {/* All Plans */}
          <TouchableOpacity
            style={[styles.planTabPill, planFilter === 'ALL' && styles.planTabPillActive]}
            onPress={() => setPlanFilter('ALL')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="layers"
              size={14}
              color={planFilter === 'ALL' ? '#FFFFFF' : '#64748B'}
            />
            <Text style={[styles.planTabText, planFilter === 'ALL' && styles.planTabTextActive]}>
              All Plans ({groups.length})
            </Text>
          </TouchableOpacity>

          {/* Fixed Plan */}
          <TouchableOpacity
            style={[styles.planTabPill, planFilter === 'FIXED' && styles.planTabPillActiveFixed]}
            onPress={() => setPlanFilter('FIXED')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="shield-checkmark"
              size={14}
              color={planFilter === 'FIXED' ? '#FFFFFF' : '#059669'}
            />
            <Text style={[styles.planTabText, planFilter === 'FIXED' && styles.planTabTextActive]}>
              Fixed ({fixedCount})
            </Text>
          </TouchableOpacity>

          {/* Regular Plan */}
          <TouchableOpacity
            style={[styles.planTabPill, planFilter === 'REGULAR' && styles.planTabPillActiveRegular]}
            onPress={() => setPlanFilter('REGULAR')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="trending-up"
              size={14}
              color={planFilter === 'REGULAR' ? '#FFFFFF' : '#D97706'}
            />
            <Text style={[styles.planTabText, planFilter === 'REGULAR' && styles.planTabTextActive]}>
              Regular ({regularCount})
            </Text>
          </TouchableOpacity>

          {/* Auction Plan */}
          <TouchableOpacity
            style={[styles.planTabPill, planFilter === 'AUCTION' && styles.planTabPillActiveAuction]}
            onPress={() => setPlanFilter('AUCTION')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="hammer"
              size={14}
              color={planFilter === 'AUCTION' ? '#FFFFFF' : '#7C3AED'}
            />
            <Text style={[styles.planTabText, planFilter === 'AUCTION' && styles.planTabTextActive]}>
              Auction ({auctionCount})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* 4. Sub-filter Row: Active / Closed status pills */}
      <View style={styles.statusFilterRow}>
        <Text style={styles.statusFilterLabel}>
          Showing <Text style={{ fontWeight: '800', color: '#102B63' }}>{filteredGroups.length}</Text> schemes
        </Text>

        <View style={styles.statusToggleGroup}>
          <TouchableOpacity
            style={[styles.statusToggleBtn, statusFilter === 'ALL' && styles.statusToggleBtnActive]}
            onPress={() => setStatusFilter('ALL')}
          >
            <Text style={[styles.statusToggleText, statusFilter === 'ALL' && styles.statusToggleTextActive]}>
              All
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statusToggleBtn, statusFilter === 'ACTIVE' && styles.statusToggleBtnActive]}
            onPress={() => setStatusFilter('ACTIVE')}
          >
            <Text style={[styles.statusToggleText, statusFilter === 'ACTIVE' && styles.statusToggleTextActive]}>
              Active
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statusToggleBtn, statusFilter === 'CLOSED' && styles.statusToggleBtnActive]}
            onPress={() => setStatusFilter('CLOSED')}
          >
            <Text style={[styles.statusToggleText, statusFilter === 'CLOSED' && styles.statusToggleTextActive]}>
              Closed
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 5. Chit Groups List View */}
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#102B63" />
        </View>
      ) : (
        <FlatList
          data={filteredGroups}
          keyExtractor={(item) => item.id}
          renderItem={renderGroupCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#102B63"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="layers-outline" size={36} color="#94A3B8" />
              </View>
              <Text style={styles.emptyTitle}>No Chit Schemes Found</Text>
              <Text style={styles.emptySub}>
                {search.length > 0
                  ? `No groups match "${search}". Try clearing search.`
                  : `No schemes currently active under this filter.`}
              </Text>
              <TouchableOpacity
                style={styles.emptyCtaBtn}
                onPress={() => {
                  setSearch('');
                  setPlanFilter('ALL');
                  setStatusFilter('ALL');
                }}
              >
                <Text style={styles.emptyCtaText}>Reset Filters</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* 6. Add Chit Group Modal */}
      <Modal
        visible={isAddGroupModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsAddGroupModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Add New Chit Group</Text>
                <Text style={styles.modalSubtitle}>
                  Create a new chit group to start enrolling customers and tracking dues.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsAddGroupModalOpen(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>GROUP NAME *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Diamond Series A or JJ F 2 T"
                placeholderTextColor={Colors.textMuted}
                value={newGroupName}
                onChangeText={setNewGroupName}
              />
              <Text style={styles.helperText}>
                Distinct code or name identifying this chit fund group.
              </Text>

              <Text style={[styles.inputLabel, { marginTop: 14 }]}>SCHEME / PLAN TYPE *</Text>
              <View style={styles.schemeChipRow}>
                <TouchableOpacity
                  style={[
                    styles.schemeChip,
                    newGroupScheme === 'Fixed' && styles.schemeChipActiveFixed,
                  ]}
                  onPress={() => setNewGroupScheme('Fixed')}
                >
                  <Text
                    style={[
                      styles.schemeChipText,
                      newGroupScheme === 'Fixed' && styles.schemeChipTextActiveFixed,
                    ]}
                  >
                    Fixed
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.schemeChip,
                    newGroupScheme === 'Regular' && styles.schemeChipActiveRegular,
                  ]}
                  onPress={() => setNewGroupScheme('Regular')}
                >
                  <Text
                    style={[
                      styles.schemeChipText,
                      newGroupScheme === 'Regular' && styles.schemeChipTextActiveRegular,
                    ]}
                  >
                    Regular
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.schemeChip,
                    newGroupScheme === 'Auction' && styles.schemeChipActiveAuction,
                  ]}
                  onPress={() => setNewGroupScheme('Auction')}
                >
                  <Text
                    style={[
                      styles.schemeChipText,
                      newGroupScheme === 'Auction' && styles.schemeChipTextActiveAuction,
                    ]}
                  >
                    Auction
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>CHIT VALUE (₹)</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={newGroupValue}
                    onChangeText={setNewGroupValue}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>DURATION (MOS)</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={newGroupDuration}
                    onChangeText={setNewGroupDuration}
                  />
                </View>
              </View>

              <View style={styles.infoNoteBox}>
                <View style={styles.infoNoteHeader}>
                  <View style={styles.goldDot} />
                  <Text style={styles.infoNoteTitle}>Calculated Monthly Due</Text>
                </View>
                <Text style={styles.infoNoteBody}>
                  ₹
                  {Math.round(
                    (Number(newGroupValue) || 100000) / (Number(newGroupDuration) || 20)
                  ).toLocaleString('en-IN')}{' '}
                  / month per member subscriber.
                </Text>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsAddGroupModalOpen(false)}
                disabled={creatingGroup}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.createBtn, creatingGroup && styles.createBtnDisabled]}
                onPress={handleCreateGroup}
                disabled={creatingGroup}
              >
                {creatingGroup ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.createBtnText}>Create Group</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  // 1. Top Section Action Banner
  topActionBannerWrapper: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  topActionBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#102B63',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  topBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  topBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D97706',
  },
  topBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D97706',
    letterSpacing: 0.6,
  },
  topBannerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  topBannerSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  heroAddGroupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#102B63',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    shadowColor: '#102B63',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  heroAddGroupText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // 2. Search Section
  searchSection: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    padding: 0,
  },

  // 3. Plan Tabs Scroll
  planTabsWrapper: {
    paddingVertical: 6,
    backgroundColor: '#F1F5F9',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  planTabsScroll: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: 'row',
  },
  planTabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  planTabPillActive: {
    backgroundColor: '#102B63',
    borderColor: '#102B63',
  },
  planTabPillActiveFixed: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  planTabPillActiveRegular: {
    backgroundColor: '#D97706',
    borderColor: '#D97706',
  },
  planTabPillActiveAuction: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  planTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  planTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  // 4. Status Sub-filter Row
  statusFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  statusFilterLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  statusToggleGroup: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    padding: 2,
    gap: 2,
  },
  statusToggleBtn: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusToggleBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  statusToggleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  statusToggleTextActive: {
    color: '#0F172A',
    fontWeight: '800',
  },

  // 5. List Content & Cards
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 36,
    gap: 14,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#102B63',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  groupNameText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  schemeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  schemeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  groupCodeSub: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusBadgeActive: {
    backgroundColor: '#ECFDF5',
  },
  statusBadgeClosed: {
    backgroundColor: '#F1F5F9',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusTextActive: {
    color: '#059669',
  },
  statusTextClosed: {
    color: '#64748B',
  },

  // Financial Metrics Grid
  financialMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  metricColumn: {
    flex: 1,
    alignItems: 'center',
  },
  metricColumnLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  metricColumnValueBold: {
    fontSize: 14,
    fontWeight: '900',
    color: '#102B63',
  },
  metricColumnValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  metricDivider: {
    width: 1,
    height: 22,
    backgroundColor: '#CBD5E1',
  },

  // Capacity & Progress Bar
  capacitySection: {
    marginTop: 12,
  },
  capacityHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  capacityLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  capacityValueBold: {
    fontWeight: '800',
    color: '#0F172A',
  },
  capacityPercent: {
    fontSize: 11,
    fontWeight: '800',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },

  // Card Footer Row
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  manageBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  deleteGroupBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
  },

  // Empty state & loader
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  emptyCtaBtn: {
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#102B63',
  },
  emptyCtaText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Add Group Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    width: '100%',
    maxWidth: 420,
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
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 16,
  },
  modalCloseBtn: {
    padding: 4,
    marginLeft: 10,
  },
  modalBody: {
    paddingVertical: 14,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  helperText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },
  schemeChipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  schemeChip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },
  schemeChipActiveFixed: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  schemeChipActiveRegular: {
    backgroundColor: '#FEF9E7',
    borderColor: '#D97706',
  },
  schemeChipActiveAuction: {
    backgroundColor: '#FAF5FF',
    borderColor: '#7C3AED',
  },
  schemeChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  schemeChipTextActiveFixed: {
    color: '#059669',
    fontWeight: '800',
  },
  schemeChipTextActiveRegular: {
    color: '#D97706',
    fontWeight: '800',
  },
  schemeChipTextActiveAuction: {
    color: '#7C3AED',
    fontWeight: '800',
  },
  infoNoteBox: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 14,
    padding: 12,
    marginTop: 14,
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
    backgroundColor: '#D97706',
  },
  infoNoteTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B45309',
  },
  infoNoteBody: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
    marginTop: 4,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  createBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#102B63',
  },
  createBtnDisabled: {
    opacity: 0.5,
  },
  createBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});