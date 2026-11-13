import React, { useState } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { Button } from '../../components/common/Button';
import { apiClient } from '../../services/api';
import { DataSyncManager } from '../../services/dataSync';
import { formatCurrency } from '../../utils/format';
import { Customer } from '../../types';
import { showConfirmDialog, showAlert } from '../../utils/alert';

export const CustomerDetailScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const initialCustomer: Customer = route.params?.customer || {};
  const [customer, setCustomer] = useState<Customer>(initialCustomer);
  const [currentStatus, setCurrentStatus] = useState<string>(initialCustomer.status || 'ACTIVE');
  const [loadingStatus, setLoadingStatus] = useState(false);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState(customer.name || customer.fullName || '');
  const [editPhone, setEditPhone] = useState(customer.phone || customer.mobile || '');
  const [editEmail, setEditEmail] = useState(customer.email || '');
  const [editAddress, setEditAddress] = useState(customer.address || '');
  const [editScheme, setEditScheme] = useState<'Regular' | 'Fixed' | 'Auction'>('Regular');
  const [editPlanName, setEditPlanName] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Assign Chit Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [availableGroups, setAvailableGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [assignScheme, setAssignScheme] = useState<'Auction' | 'Fixed' | 'Regular'>('Auction');
  const [assignChitValue, setAssignChitValue] = useState('100000');
  const [assignDuration, setAssignDuration] = useState('20');
  const [isAssigning, setIsAssigning] = useState(false);

  const displayName = customer.name || customer.fullName || 'Member';
  const initial = displayName.charAt(0).toUpperCase();

  const toggleStatus = async (newStatus: 'ACTIVE' | 'INACTIVE') => {
    showConfirmDialog(
      newStatus === 'INACTIVE' ? 'Deactivate Customer' : 'Reactivate Customer',
      `Are you sure you want to ${newStatus === 'INACTIVE' ? 'restrict' : 'restore'} app access for this customer?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: newStatus === 'INACTIVE' ? 'destructive' : 'default',
          onPress: async () => {
            setLoadingStatus(true);
            try {
              const targetId = customer.mongoId || customer.id;
              await apiClient(`/customers/${targetId}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status: newStatus }),
              });
              setCurrentStatus(newStatus);
              showAlert('Updated', `Customer is now ${newStatus}`);
            } catch (err: any) {
              showAlert('Error', err.message || 'Status update failed');
            } finally {
              setLoadingStatus(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteCustomer = () => {
    showConfirmDialog(
      'Delete Customer',
      `Permanently delete "${displayName}" (${customer.id})? All records, chits, and payment requests for this customer will be deleted everywhere.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            try {
              await DataSyncManager.deleteCustomer({
                id: customer.id,
                mongoId: customer.mongoId,
                phone: customer.phone || customer.mobile,
                name: displayName,
              });
              showAlert('Deleted', `Customer "${displayName}" was permanently deleted.`, () => {
                navigation.goBack();
              });
            } catch (err: any) {
              showAlert('Error', err?.message || 'Failed to delete customer');
            }
          },
        },
      ]
    );
  };

  const handleOpenEdit = () => {
    setEditName(customer.name || customer.fullName || '');
    setEditPhone(customer.phone || customer.mobile || '');
    setEditEmail(customer.email || '');
    setEditAddress(customer.address || '');
    const curScheme = String(customer.scheme || customer.chits?.[0]?.scheme || 'Regular').toUpperCase();
    const resolved: 'Regular' | 'Fixed' | 'Auction' = curScheme.includes('FIX') ? 'Fixed' : curScheme.includes('AUC') ? 'Auction' : 'Regular';
    setEditScheme(resolved);
    setEditPlanName(customer.interestedPlan || customer.chits?.[0]?.groupName || `${resolved} Scheme`);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      Alert.alert('Validation Error', 'Please enter a customer name.');
      return;
    }
    setIsSavingEdit(true);
    try {
      const patched = await DataSyncManager.updateCustomer(customer.id, {
        name: editName.trim(),
        fullName: editName.trim(),
        phone: editPhone.trim(),
        mobile: editPhone.trim(),
        email: editEmail.trim(),
        address: editAddress.trim(),
        scheme: editScheme,
        interestedPlan: editPlanName.trim() || `${editScheme} Scheme`,
      } as any);
      if (patched) {
        setCustomer(patched);
      }
      setIsEditModalOpen(false);
      Alert.alert('Success', `Customer profile and ${editScheme} plan updated successfully.`);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update profile');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleOpenAssign = async () => {
    try {
      const groups = await DataSyncManager.getChitGroups();
      setAvailableGroups(groups);
      if (groups.length > 0) {
        setSelectedGroupId(groups[0].id);
      }
      setIsAssignModalOpen(true);
    } catch {
      Alert.alert('Error', 'Could not load chit groups');
    }
  };

  const handleAssignChit = async () => {
    if (!selectedGroupId) {
      Alert.alert('Error', 'Please select a chit group.');
      return;
    }
    const grp = availableGroups.find((g: any) => g.id === selectedGroupId);
    setIsAssigning(true);
    try {
      const val = Number(assignChitValue) || 100000;
      const dur = Number(assignDuration) || 20;
      const monthly = Math.round(val / dur);

      await DataSyncManager.enrollMemberToGroup({
        customerId: customer.id,
        groupId: selectedGroupId,
        groupName: grp?.name || selectedGroupId,
        scheme: assignScheme,
        chitValue: val,
        duration: dur,
        monthlyInstallment: monthly,
      });

      const all = await DataSyncManager.getCustomers();
      const updated = all.find((c) => c.id === customer.id || c.mongoId === customer.mongoId);
      if (updated) {
        setCustomer(updated);
      }
      setIsAssignModalOpen(false);
      Alert.alert('Enrolled', `Customer successfully enrolled in ${grp?.name || selectedGroupId}!`);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to enroll customer');
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="dark-content" />

      {/* 1. Light Profile Header Card */}
      <View style={styles.navyHeader}>
        <View style={styles.headerProfileRow}>
          <View style={styles.avatarBubble}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.headerCustomerName}>{displayName}</Text>
            <Text style={styles.headerCustomerId}>Member ID: {customer.id || 'JC00123'}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <TouchableOpacity style={styles.editIconBtn} activeOpacity={0.7} onPress={handleOpenEdit}>
              <Ionicons name="pencil" size={16} color="#1D4ED8" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.editIconBtn, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}
              activeOpacity={0.7}
              onPress={handleDeleteCustomer}
            >
              <Ionicons name="trash-outline" size={16} color="#DC2626" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* 2. Contact & Scheme Details Card (Phone, Email, Group) */}
      <View style={styles.contactCardWrapper}>
        <View style={styles.contactCard}>
          <View style={styles.contactRow}>
            <Ionicons name="call-outline" size={18} color={Colors.navy.primary} />
            <Text style={styles.contactRowText}>{customer.phone || customer.mobile || '+91 9988998899'}</Text>
          </View>

          <View style={styles.cardDivider} />

          <View style={styles.contactRow}>
            <Ionicons name="mail-outline" size={18} color={Colors.navy.primary} />
            <Text style={styles.contactRowText}>{displayName.toLowerCase().replace(/\s+/g, '')}@gmail.com</Text>
          </View>

          <View style={styles.cardDivider} />

          <View style={styles.contactRow}>
            <Ionicons name="shield-checkmark-outline" size={18} color={Colors.navy.primary} />
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={styles.contactRowText}>
                {customer.scheme || customer.chits?.[0]?.scheme || 'Regular'} Scheme ({customer.chits?.[0]?.groupName || customer.interestedPlan || 'Chit Plan'})
              </Text>
              <TouchableOpacity onPress={handleOpenEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#1D4ED8' }}>Change</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* 3. Account Navigation Links (My Contributions, Payment History, Receipts, Settings) */}
      <View style={styles.navLinksCard}>
        <TouchableOpacity
          style={styles.navLinkRow}
          onPress={() =>
            navigation.navigate('CustomerSchedule', {
              customer,
              chit: customer.chits?.[0],
            })
          }
          activeOpacity={0.7}
        >
          <View style={[styles.navLinkIconBox, { backgroundColor: '#FFF8EB' }]}>
            <Ionicons name="people" size={18} color={Colors.gold.dark} />
          </View>
          <Text style={styles.navLinkTitle}>My Contributions & Schedule</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.border} />
        </TouchableOpacity>

        <View style={styles.cardDivider} />

        <TouchableOpacity
          style={styles.navLinkRow}
          onPress={() =>
            navigation.navigate('Ledger', {
              customerId: customer.id,
              customerName: displayName,
            })
          }
          activeOpacity={0.7}
        >
          <View style={[styles.navLinkIconBox, { backgroundColor: Colors.blueSubtle }]}>
            <Ionicons name="card-outline" size={18} color={Colors.blueAccent} />
          </View>
          <Text style={styles.navLinkTitle}>Payment History</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.border} />
        </TouchableOpacity>

        <View style={styles.cardDivider} />

        <TouchableOpacity
          style={styles.navLinkRow}
          onPress={() =>
            navigation.navigate('ReceiptEntry', {
              customerId: customer.id,
              customerName: displayName,
              mobile: customer.phone || customer.mobile || '',
              amount: customer.pending || 5000,
              chitGroup: customer.chits?.[0]?.groupName || customer.chits?.[0]?.groupId || '',
            })
          }
          activeOpacity={0.7}
        >
          <View style={[styles.navLinkIconBox, { backgroundColor: Colors.successLight }]}>
            <Ionicons name="receipt-outline" size={18} color={Colors.success} />
          </View>
          <Text style={styles.navLinkTitle}>Receipts</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.border} />
        </TouchableOpacity>

        <View style={styles.cardDivider} />

        <TouchableOpacity
          style={styles.navLinkRow}
          onPress={() => navigation.navigate('Settings')}
          activeOpacity={0.7}
        >
          <View style={[styles.navLinkIconBox, { backgroundColor: '#F1F5F9' }]}>
            <Ionicons name="settings-outline" size={18} color={Colors.navy.primary} />
          </View>
          <Text style={styles.navLinkTitle}>Settings</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.border} />
        </TouchableOpacity>
      </View>

      {/* 4. Financial Account Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.cardHeaderTitle}>Account Overview</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>TOTAL PAID</Text>
            <Text style={[styles.summaryVal, { color: Colors.success }]}>
              {formatCurrency(customer.totalPaid || 0)}
            </Text>
          </View>
          <View style={styles.vLine} />
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>PENDING DUES</Text>
            <Text style={[styles.summaryVal, { color: Colors.danger }]}>
              {formatCurrency(customer.pending || 0)}
            </Text>
          </View>
        </View>
      </View>

      {/* 5. Primary Action Buttons */}
      <View style={styles.actionsWrap}>
        <Button
          title="Collect Installment / Issue Receipt"
          onPress={() =>
            navigation.navigate('ReceiptEntry', {
              customerId: customer.id,
              customerName: displayName,
              mobile: customer.phone || customer.mobile || '',
              amount: customer.pending || 5000,
              chitGroup: customer.chits?.[0]?.groupName || customer.chits?.[0]?.groupId || '',
            })
          }
          style={styles.primaryActionBtn}
        />

        <Button
          title="+ Enroll in Another Chit Group"
          variant="secondary"
          onPress={handleOpenAssign}
        />

        {currentStatus === 'ACTIVE' ? (
          <Button
            title="Deactivate Customer Account"
            variant="danger"
            isLoading={loadingStatus}
            onPress={() => toggleStatus('INACTIVE')}
          />
        ) : (
          <Button
            title="Activate / Approve Customer Account"
            variant="secondary"
            isLoading={loadingStatus}
            onPress={() => toggleStatus('ACTIVE')}
          />
        )}

        <Button
          title="Delete Customer Permanently"
          variant="danger"
          onPress={handleDeleteCustomer}
        />
      </View>

      {/* Edit Customer Profile Modal */}
      <Modal visible={isEditModalOpen} transparent animationType="fade" onRequestClose={() => setIsEditModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Customer Profile</Text>
              <TouchableOpacity onPress={() => setIsEditModalOpen(false)}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              <Text style={styles.inputLabel}>FULL NAME *</Text>
              <TextInput style={styles.textInput} value={editName} onChangeText={setEditName} />

              <Text style={[styles.inputLabel, { marginTop: 12 }]}>MOBILE NUMBER *</Text>
              <TextInput style={styles.textInput} value={editPhone} onChangeText={setEditPhone} keyboardType="phone-pad" />

              <Text style={[styles.inputLabel, { marginTop: 12 }]}>EMAIL ADDRESS</Text>
              <TextInput style={styles.textInput} value={editEmail} onChangeText={setEditEmail} keyboardType="email-address" />

              <Text style={[styles.inputLabel, { marginTop: 12 }]}>RESIDENTIAL ADDRESS</Text>
              <TextInput style={[styles.textInput, { height: 60 }]} multiline value={editAddress} onChangeText={setEditAddress} />

              <Text style={[styles.inputLabel, { marginTop: 12 }]}>PLAN SCHEME</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                {(['Regular', 'Fixed', 'Auction'] as const).map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.schemePillBtn, editScheme === s && styles.schemePillBtnActive]}
                    onPress={() => {
                      setEditScheme(s);
                      if (!editPlanName || editPlanName.includes('Scheme') || editPlanName.includes('Plan')) {
                        setEditPlanName(`${s} Scheme`);
                      }
                    }}
                  >
                    <Text style={[styles.schemePillBtnText, editScheme === s && styles.schemePillBtnTextActive]}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.inputLabel, { marginTop: 12 }]}>PLAN / GROUP NAME</Text>
              <TextInput
                style={styles.textInput}
                value={editPlanName}
                onChangeText={setEditPlanName}
                placeholder="e.g. Fixed 1L Series"
              />
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity style={styles.cancelModalBtn} onPress={() => setIsEditModalOpen(false)}>
                <Text style={styles.cancelModalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveModalBtn, isSavingEdit && { opacity: 0.6 }]}
                disabled={isSavingEdit}
                onPress={handleSaveEdit}
              >
                <Text style={styles.saveModalBtnText}>{isSavingEdit ? 'Saving...' : 'Save Profile'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Assign Chit Group Modal */}
      <Modal visible={isAssignModalOpen} transparent animationType="fade" onRequestClose={() => setIsAssignModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign to Chit Group</Text>
              <TouchableOpacity onPress={() => setIsAssignModalOpen(false)}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 420 }}>
              <Text style={styles.inputLabel}>SELECT CHIT GROUP *</Text>
              {availableGroups.map((g: any) => (
                <TouchableOpacity
                  key={g.id}
                  style={[styles.groupSelectRow, selectedGroupId === g.id && styles.groupSelectRowActive]}
                  onPress={() => setSelectedGroupId(g.id)}
                >
                  <Ionicons
                    name={selectedGroupId === g.id ? 'radio-button-on' : 'radio-button-off'}
                    size={18}
                    color={selectedGroupId === g.id ? Colors.navy.primary : Colors.textMuted}
                  />
                  <Text style={[styles.groupSelectText, selectedGroupId === g.id && { fontWeight: '800' }]}>
                    {g.name} ({g.type})
                  </Text>
                </TouchableOpacity>
              ))}

              <Text style={[styles.inputLabel, { marginTop: 14 }]}>PLAN SCHEME</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {(['Auction', 'Fixed', 'Regular'] as const).map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.schemePillBtn, assignScheme === s && styles.schemePillBtnActive]}
                    onPress={() => setAssignScheme(s)}
                  >
                    <Text style={[styles.schemePillBtnText, assignScheme === s && styles.schemePillBtnTextActive]}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.inputLabel, { marginTop: 14 }]}>CHIT VALUE (₹)</Text>
              <TextInput style={styles.textInput} keyboardType="numeric" value={assignChitValue} onChangeText={setAssignChitValue} />

              <Text style={[styles.inputLabel, { marginTop: 14 }]}>DURATION (MONTHS)</Text>
              <TextInput style={styles.textInput} keyboardType="numeric" value={assignDuration} onChangeText={setAssignDuration} />
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity style={styles.cancelModalBtn} onPress={() => setIsAssignModalOpen(false)}>
                <Text style={styles.cancelModalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveModalBtn, isAssigning && { opacity: 0.6 }]}
                disabled={isAssigning}
                onPress={handleAssignChit}
              >
                <Text style={styles.saveModalBtnText}>{isAssigning ? 'Enrolling...' : 'Enroll Member'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingBottom: 24,
    maxWidth: 768,
    width: '100%',
    alignSelf: 'center',
  },

  // 1. Light Profile Header Card
  navyHeader: {
    backgroundColor: '#F8FAFC',
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 36,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarBubble: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  headerCustomerName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.3,
  },
  headerCustomerId: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },
  editIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 2. Overlapping Contact Card
  contactCardWrapper: {
    paddingHorizontal: 20,
    marginTop: -20,
  },
  contactCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.navy.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    gap: 12,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contactRowText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  cardDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
  },

  // 3. Account Navigation Links
  navLinksCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  navLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  navLinkIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  navLinkTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },

  // 4. Financial Account Summary
  summaryCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryCol: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  summaryVal: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
  },
  vLine: {
    width: 1,
    height: 36,
    backgroundColor: Colors.borderLight,
  },

  actionsWrap: {
    marginHorizontal: 20,
    marginTop: 20,
    gap: 12,
  },
  primaryActionBtn: {
    backgroundColor: '#059669', // Emerald Green for collection & receipts
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 500,
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
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textSecondary,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text,
  },
  cancelModalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  cancelModalBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  saveModalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.navy.primary,
    alignItems: 'center',
  },
  saveModalBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
  },
  groupSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
  },
  groupSelectRowActive: {
    borderColor: Colors.navy.primary,
    backgroundColor: '#F8FAFC',
  },
  groupSelectText: {
    fontSize: 13,
    color: Colors.text,
  },
  schemePillBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  schemePillBtnActive: {
    backgroundColor: Colors.navy.primary,
    borderColor: Colors.navy.primary,
  },
  schemePillBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  schemePillBtnTextActive: {
    color: Colors.white,
  },
});
