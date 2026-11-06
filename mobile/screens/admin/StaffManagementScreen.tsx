import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Linking,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { getActiveBaseUrl } from '../../services/dataSync';
import { secureStorage } from '../../services/storage';

interface StaffMember {
  id?: string;
  _id?: string;
  userCode: string;
  name: string;
  phone: string;
  email?: string;
  role: 'STAFF' | 'COLLECTION_AGENT' | 'BRANCH_MANAGER';
  roleName?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
}

const DEFAULT_STAFF: StaffMember[] = [
  {
    id: 'staff-1',
    userCode: 'STF-1001',
    name: 'Ramesh Kumar',
    phone: '9840123456',
    email: 'ramesh.staff@jenistachits.com',
    role: 'STAFF',
    roleName: 'Field Collection Executive',
    status: 'ACTIVE',
  },
  {
    id: 'staff-2',
    userCode: 'STF-1002',
    name: 'Suresh Babu',
    phone: '9944123456',
    email: 'suresh.agent@jenistachits.com',
    role: 'COLLECTION_AGENT',
    roleName: 'Collection Agent',
    status: 'ACTIVE',
  },
];

export const StaffManagementScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'STAFF' | 'COLLECTION_AGENT'>('ALL');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [userCode, setUserCode] = useState('');
  const [role, setRole] = useState<'STAFF' | 'COLLECTION_AGENT'>('STAFF');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadStaff = async () => {
    try {
      const baseUrl = await getActiveBaseUrl();
      const res = await fetch(`${baseUrl}/staff`);
      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.data) && json.data.length > 0) {
          setStaffList(json.data);
          await secureStorage.setItem('cached_staff_list', JSON.stringify(json.data));
          return;
        }
      }
    } catch {}

    try {
      const cached = await secureStorage.getItem('cached_staff_list');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setStaffList(parsed);
          return;
        }
      }
    } catch {}

    setStaffList(DEFAULT_STAFF);
    setLoading(false);
  };

  useEffect(() => {
    loadStaff().finally(() => setLoading(false));
  }, []);

  const openAddModal = () => {
    setEditingStaff(null);
    setName('');
    setPhone('');
    setEmail('');
    setUserCode(`STF-${Math.floor(1000 + Math.random() * 9000)}`);
    setRole('STAFF');
    setPassword('');
    setIsModalOpen(true);
  };

  const openEditModal = (staff: StaffMember) => {
    setEditingStaff(staff);
    setName(staff.name);
    setPhone(staff.phone);
    setEmail(staff.email || '');
    setUserCode(staff.userCode);
    setRole(staff.role === 'COLLECTION_AGENT' ? 'COLLECTION_AGENT' : 'STAFF');
    setPassword('');
    setIsModalOpen(true);
  };

  const handleSaveStaff = async () => {
    if (!name.trim()) {
      Alert.alert('Required Field', 'Please enter staff full name.');
      return;
    }
    if (!phone.trim() || phone.trim().length < 10) {
      Alert.alert('Required Field', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!editingStaff && (!password.trim() || password.trim().length < 4)) {
      Alert.alert('Required Field', 'Password must be at least 4 characters.');
      return;
    }

    setSubmitting(true);

    try {
      const baseUrl = await getActiveBaseUrl();
      const payload = {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        userCode: userCode.trim(),
        role,
        password: password.trim() || undefined,
        status: 'ACTIVE',
      };

      if (editingStaff) {
        const staffId = editingStaff.id || editingStaff._id;
        try {
          await fetch(`${baseUrl}/staff/${staffId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        } catch {}

        setStaffList((prev) =>
          prev.map((s) =>
            s.id === staffId || s._id === staffId
              ? {
                  ...s,
                  name: payload.name,
                  phone: payload.phone,
                  email: payload.email,
                  role,
                }
              : s
          )
        );
        Alert.alert('Success', 'Staff details updated successfully.');
      } else {
        let createdStaff: any = null;
        try {
          const res = await fetch(`${baseUrl}/staff`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (res.ok) {
            const json = await res.json();
            if (json && json.data) createdStaff = json.data;
          }
        } catch {}

        const newMember: StaffMember = createdStaff || {
          id: `staff-${Date.now()}`,
          _id: `staff-${Date.now()}`,
          userCode: payload.userCode,
          name: payload.name,
          phone: payload.phone,
          email: payload.email,
          role,
          status: 'ACTIVE',
        };

        setStaffList((prev) => [newMember, ...prev]);
        Alert.alert('Success', 'Staff member created successfully.');
      }

      setIsModalOpen(false);
      await secureStorage.setItem('cached_staff_list', JSON.stringify(staffList));
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save staff member.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (staff: StaffMember) => {
    const newStatus = staff.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const staffId = staff.id || staff._id;
    try {
      const baseUrl = await getActiveBaseUrl();
      await fetch(`${baseUrl}/staff/${staffId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch {}

    setStaffList((prev) =>
      prev.map((s) => (s.id === staffId || s._id === staffId ? { ...s, status: newStatus } : s))
    );
  };

  const handleDelete = (staff: StaffMember) => {
    Alert.alert(
      'Remove Staff Member',
      `Are you sure you want to delete staff member "${staff.name}" (${staff.userCode})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const staffId = staff.id || staff._id;
            try {
              const baseUrl = await getActiveBaseUrl();
              await fetch(`${baseUrl}/staff/${staffId}`, { method: 'DELETE' });
            } catch {}
            setStaffList((prev) => prev.filter((s) => s.id !== staffId && s._id !== staffId));
          },
        },
      ]
    );
  };

  const filtered = staffList.filter((s) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      s.name.toLowerCase().includes(q) ||
      s.phone.includes(q) ||
      (s.userCode && s.userCode.toLowerCase().includes(q));

    const matchesRole =
      roleFilter === 'ALL' ||
      s.role === roleFilter ||
      (roleFilter === 'STAFF' && s.role !== 'COLLECTION_AGENT');

    return matchesSearch && matchesRole;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('AdminTabs'))}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Staff & Executives</Text>
          <Text style={styles.headerSubtitle}>{staffList.length} registered personnel</Text>
        </View>
        <TouchableOpacity onPress={openAddModal} style={styles.addBtn} activeOpacity={0.8}>
          <Ionicons name="person-add" size={17} color="#FFFFFF" />
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Search & Filters */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={17} color="#94A3B8" />
          <TextInput
            placeholder="Search staff by name, phone, or ID..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
          {!!searchQuery && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={17} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Role Pills */}
        <View style={styles.rolePillsRow}>
          {(['ALL', 'STAFF', 'COLLECTION_AGENT'] as const).map((r) => {
            const isSelected = roleFilter === r;
            const label = r === 'ALL' ? 'All' : r === 'STAFF' ? 'Field Staff' : 'Collection Agents';
            return (
              <TouchableOpacity
                key={r}
                onPress={() => setRoleFilter(r)}
                style={[styles.rolePill, isSelected && styles.rolePillActive]}
              >
                <Text style={[styles.rolePillText, isSelected && styles.rolePillTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Staff Cards List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#102B63" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={54} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>No Staff Members Found</Text>
          <Text style={styles.emptySubtitle}>Tap "+ Add" above to register new field executives.</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id || item._id || item.userCode}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const initial = (item.name || 'S')[0].toUpperCase();
            const isActive = item.status === 'ACTIVE';

            return (
              <View style={styles.card}>
                <View style={styles.cardTopRow}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>{initial}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={styles.cardNameRow}>
                      <Text style={styles.staffName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleToggleStatus(item)}
                        style={[styles.statusBadge, isActive ? styles.statusActive : styles.statusInactive]}
                      >
                        <View style={[styles.statusDot, isActive ? styles.dotActive : styles.dotInactive]} />
                        <Text style={[styles.statusText, isActive ? styles.textActive : styles.textInactive]}>
                          {isActive ? 'Active' : 'Inactive'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.userCodeText}>{item.userCode}</Text>
                    <Text style={styles.phoneText}>📞 {item.phone}</Text>
                  </View>
                </View>

                {/* Role Pill & Action Buttons */}
                <View style={styles.cardDivider} />
                <View style={styles.cardBottomRow}>
                  <View
                    style={[
                      styles.roleTag,
                      item.role === 'COLLECTION_AGENT' ? styles.tagAgent : styles.tagStaff,
                    ]}
                  >
                    <Ionicons
                      name="shield-checkmark"
                      size={12}
                      color={item.role === 'COLLECTION_AGENT' ? '#7C3AED' : '#2563EB'}
                    />
                    <Text
                      style={[
                        styles.roleTagText,
                        item.role === 'COLLECTION_AGENT' ? styles.textAgent : styles.textStaff,
                      ]}
                    >
                      {item.role === 'COLLECTION_AGENT' ? 'Collection Agent' : 'Field Staff'}
                    </Text>
                  </View>

                  <View style={styles.actionButtonsRow}>
                    <TouchableOpacity
                      onPress={() => Linking.openURL(`tel:${item.phone}`)}
                      style={styles.actionCircleBtn}
                    >
                      <Ionicons name="call" size={15} color="#059669" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() =>
                        Linking.openURL(`whatsapp://send?phone=91${item.phone.replace(/\D/g, '')}`)
                      }
                      style={styles.actionCircleBtn}
                    >
                      <Ionicons name="logo-whatsapp" size={15} color="#16A34A" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => openEditModal(item)}
                      style={styles.actionCircleBtn}
                    >
                      <Ionicons name="create-outline" size={15} color="#2563EB" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleDelete(item)}
                      style={styles.actionCircleBtn}
                    >
                      <Ionicons name="trash-outline" size={15} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Add / Edit Staff Modal */}
      <Modal visible={isModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingStaff ? 'Edit Staff Member' : 'Register New Staff'}
              </Text>
              <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name *</Text>
                <TextInput
                  placeholder="e.g. Ramesh Kumar"
                  placeholderTextColor="#94A3B8"
                  value={name}
                  onChangeText={setName}
                  style={styles.modalInput}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Mobile Number (Login ID) *</Text>
                <TextInput
                  placeholder="e.g. 9840123456"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                  style={styles.modalInput}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email Address (Optional)</Text>
                <TextInput
                  placeholder="e.g. ramesh@jenistachits.com"
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  style={styles.modalInput}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Staff Code / Badge ID</Text>
                <TextInput
                  placeholder="e.g. STF-1025"
                  placeholderTextColor="#94A3B8"
                  value={userCode}
                  onChangeText={setUserCode}
                  style={styles.modalInput}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Designation / Role</Text>
                <View style={styles.rolePickerRow}>
                  <TouchableOpacity
                    onPress={() => setRole('STAFF')}
                    style={[styles.roleSelectBox, role === 'STAFF' && styles.roleSelectActive]}
                  >
                    <Text style={[styles.roleSelectText, role === 'STAFF' && styles.roleSelectTextActive]}>
                      Field Staff
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setRole('COLLECTION_AGENT')}
                    style={[
                      styles.roleSelectBox,
                      role === 'COLLECTION_AGENT' && styles.roleSelectActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.roleSelectText,
                        role === 'COLLECTION_AGENT' && styles.roleSelectTextActive,
                      ]}
                    >
                      Collection Agent
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {editingStaff ? 'Reset Password (optional)' : 'Password / Security PIN *'}
                </Text>
                <TextInput
                  placeholder={editingStaff ? 'Leave blank to keep current' : 'Enter 4+ characters'}
                  placeholderTextColor="#94A3B8"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  style={styles.modalInput}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                onPress={() => setIsModalOpen(false)}
                style={styles.cancelBtn}
                disabled={submitting}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveStaff}
                style={styles.saveBtn}
                disabled={submitting}
              >
                <Text style={styles.saveBtnText}>
                  {submitting ? 'Saving...' : editingStaff ? 'Save Changes' : 'Create Staff'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    padding: 6,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#102B63',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
  },
  rolePillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  rolePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  rolePillActive: {
    backgroundColor: '#102B63',
  },
  rolePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  rolePillTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
    paddingBottom: 120,
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
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#102B63',
  },
  cardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  staffName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
    marginRight: 8,
  },
  userCodeText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2,
  },
  phoneText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusActive: {
    backgroundColor: '#ECFDF5',
  },
  statusInactive: {
    backgroundColor: '#F1F5F9',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    backgroundColor: '#10B981',
  },
  dotInactive: {
    backgroundColor: '#94A3B8',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  textActive: {
    color: '#047857',
  },
  textInactive: {
    color: '#64748B',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tagStaff: {
    backgroundColor: '#EFF6FF',
  },
  tagAgent: {
    backgroundColor: '#F5F3FF',
  },
  roleTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  textStaff: {
    color: '#1D4ED8',
  },
  textAgent: {
    color: '#6D28D9',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionCircleBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 13,
    color: '#0F172A',
  },
  rolePickerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  roleSelectBox: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  roleSelectActive: {
    backgroundColor: '#102B63',
  },
  roleSelectText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  roleSelectTextActive: {
    color: '#FFFFFF',
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  saveBtn: {
    flex: 2,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#102B63',
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

