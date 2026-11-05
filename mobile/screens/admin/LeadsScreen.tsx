import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Alert,
  RefreshControl,
  Linking,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { formatDate } from '../../utils/format';
import {
  MobileNotificationsManager,
  WebsiteLead,
} from '../../services/notificationsData';
import { DataSyncManager } from '../../services/dataSync';
import { secureStorage } from '../../services/storage';
import { showConfirmDialog, showAlert } from '../../utils/alert';

export const LeadsScreen: React.FC = () => {
  const [leads, setLeads] = useState<WebsiteLead[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'NEW' | 'CONVERTED' | 'REJECTED'>('ALL');
  const [refreshing, setRefreshing] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Add Lead Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPlan, setFormPlan] = useState('Auction Chit Plan');
  const [formMessage, setFormMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadLeads = async () => {
    try {
      const data = await MobileNotificationsManager.getLeads();
      setLeads(data);
    } catch (e) {
      console.warn('Failed to load leads:', e);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadLeads();
  };

  const handleConvertLead = async (lead: WebsiteLead) => {
    setActionInProgress(lead.id);
    try {
      const newCustomerId = `TC-${Math.floor(10000 + Math.random() * 90000)}`;

      // 1. Detect chosen plan scheme
      const rawPlan = lead.interestedPlan || 'Auction Chit Plan';
      let detectedScheme: 'Auction' | 'Fixed' | 'Regular' = 'Auction';
      if (rawPlan.toLowerCase().includes('fix')) detectedScheme = 'Fixed';
      else if (rawPlan.toLowerCase().includes('reg')) detectedScheme = 'Regular';
      else if (rawPlan.toLowerCase().includes('auc')) detectedScheme = 'Auction';

      // 2. Add to synced_customers with scheme and enrollment chit
      const customers = await DataSyncManager.getCustomers();
      const newCustomer = {
        id: newCustomerId,
        customerCode: newCustomerId,
        name: lead.fullName,
        mobile: lead.phone,
        email: lead.email || '',
        status: 'ACTIVE',
        kycStatus: 'VERIFIED',
        scheme: detectedScheme,
        interestedPlan: lead.interestedPlan || `${detectedScheme} Scheme`,
        totalPaid: 0,
        pending: 0,
        chits: [
          {
            groupId: 'PENDING',
            groupName: lead.interestedPlan || `${detectedScheme} Scheme (Lead Enrolled)`,
            scheme: detectedScheme,
            chitValue: 100000,
            monthlyInstallment: 5000,
            duration: 20,
            ticketNumber: '1',
            paymentStatus: 'ACTIVE',
            joiningDate: new Date().toISOString(),
          }
        ],
        createdAt: new Date().toISOString(),
      };
      const updatedCustomers = [newCustomer, ...customers.filter((c: any) => c.id !== newCustomerId)];
      await secureStorage.setItem('synced_customers', JSON.stringify(updatedCustomers));

      // 2. Mark Lead as CONVERTED
      await MobileNotificationsManager.updateLeadStatus(lead.id, 'CONVERTED', newCustomerId);

      // 3. Dispatch Notification
      await MobileNotificationsManager.addNotification({
        type: 'NEW_REGISTRATION',
        title: 'Lead Converted to Customer',
        message: `${lead.fullName} (${lead.phone}) was converted to Customer ${newCustomerId}.`,
        targetRole: 'ADMIN',
        metadata: {
          customerId: newCustomerId,
          customerName: lead.fullName,
        },
      });

      await loadLeads();
      Alert.alert(
        'Lead Converted Successfully! 🎉',
        `${lead.fullName} is now registered as customer ${newCustomerId} in your Customer Directory.`
      );
    } catch (e: any) {
      Alert.alert('Conversion Error', e?.message || 'Could not convert lead to customer.');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRejectLead = async (id: string) => {
    setActionInProgress(id);
    try {
      await MobileNotificationsManager.updateLeadStatus(id, 'REJECTED');
      await loadLeads();
      Alert.alert('Lead Rejected', 'Lead marked as rejected.');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not reject lead.');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDeleteLead = (lead: WebsiteLead) => {
    showConfirmDialog(
      'Delete Enquiry Lead',
      `Permanently delete enquiry from "${lead.fullName}" (${lead.phone})?\n\nThis will remove the lead and cascade clean any associated references across the system.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            try {
              await DataSyncManager.deleteLead(lead.id, lead.phone, lead.fullName);
              await MobileNotificationsManager.deleteLead(lead.id);
              await loadLeads();
              showAlert('Lead Deleted', 'Enquiry lead has been permanently removed.');
            } catch (e: any) {
              showAlert('Error', e?.message || 'Failed to delete lead');
            }
          },
        },
      ]
    );
  };

  const handleCreateLead = async () => {
    if (!formName.trim() || !formPhone.trim()) {
      Alert.alert('Required Fields', 'Please enter Prospect Full Name and Mobile Number.');
      return;
    }
    const cleanPhone = formPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      Alert.alert('Invalid Mobile', 'Please provide a valid 10-digit mobile number.');
      return;
    }

    setIsSubmitting(true);
    try {
      await MobileNotificationsManager.addLead({
        fullName: formName.trim(),
        phone: cleanPhone,
        email: formEmail.trim(),
        interestedPlan: formPlan.trim() || 'Auction Chit Plan',
        message: formMessage.trim() || 'Manual enquiry registered via Mobile CRM desk.',
      });

      setIsAddModalOpen(false);
      setFormName('');
      setFormPhone('');
      setFormEmail('');
      setFormPlan('Auction Chit Plan');
      setFormMessage('');
      await loadLeads();
      Alert.alert('Enquiry Created', 'New prospect enquiry has been added to CRM.');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to create lead');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredLeads = leads.filter((l) => {
    const q = search.toLowerCase();
    const matchesSearch =
      l.fullName.toLowerCase().includes(q) ||
      l.phone.includes(q) ||
      (l.email && l.email.toLowerCase().includes(q)) ||
      (l.interestedPlan && l.interestedPlan.toLowerCase().includes(q));

    if (statusFilter !== 'ALL' && l.status !== statusFilter) return false;
    return matchesSearch;
  });

  const totalCount = leads.length;
  const newCount = leads.filter((l) => l.status === 'NEW').length;
  const convertedCount = leads.filter((l) => l.status === 'CONVERTED').length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Top Action Bar with Add Enquiry Button */}
      <View style={styles.topActionBar}>
        <View>
          <Text style={styles.topActionTitle}>Enquiries & CRM Leads</Text>
          <Text style={styles.topActionSub}>Manage prospective chit subscribers</Text>
        </View>
        <TouchableOpacity
          style={styles.addLeadBtn}
          onPress={() => setIsAddModalOpen(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={18} color={Colors.white} />
          <Text style={styles.addLeadBtnText}>New Lead</Text>
        </TouchableOpacity>
      </View>

      {/* KPI Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statBox}>
          <Text style={styles.statVal}>{totalCount}</Text>
          <Text style={styles.statLabel}>TOTAL LEADS</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statVal, { color: '#b45309' }]}>{newCount}</Text>
          <Text style={styles.statLabel}>NEW INQUIRIES</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statVal, { color: '#15803d' }]}>{convertedCount}</Text>
          <Text style={styles.statLabel}>CONVERTED</Text>
        </View>
      </View>

      {/* Search Input & Status Filter Pills */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search leads by name, phone, plan..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#94a3b8"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color="#94a3b8" />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.filterPillsRow}>
          {(['ALL', 'NEW', 'CONVERTED', 'REJECTED'] as const).map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.statusPill, statusFilter === s && styles.statusPillActive]}
              onPress={() => setStatusFilter(s)}
            >
              <Text style={[styles.statusPillText, statusFilter === s && styles.statusPillTextActive]}>
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Leads List */}
      <FlatList
        data={filteredLeads}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="people-outline" size={48} color="#94a3b8" />
            <Text style={styles.emptyTitle}>No Website Leads</Text>
            <Text style={styles.emptySubtitle}>Inquiries submitted on the website or recorded manually will appear here.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isNew = item.status === 'NEW';
          const isConverted = item.status === 'CONVERTED';
          const isRejected = item.status === 'REJECTED';
          const isLoading = actionInProgress === item.id;

          return (
            <View style={styles.leadCard}>
              <View style={styles.leadHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.leadName}>{item.fullName}</Text>
                  <Text style={styles.leadTime}>{formatDate(item.submittedAt)}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View
                    style={[
                      styles.statusBadge,
                      isNew
                        ? { backgroundColor: '#fef3c7', borderColor: '#fde68a' }
                        : isConverted
                        ? { backgroundColor: '#dcfce7', borderColor: '#bbf7d0' }
                        : { backgroundColor: '#f1f5f9', borderColor: '#e2e8f0' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        isNew
                          ? { color: '#b45309' }
                          : isConverted
                          ? { color: '#15803d' }
                          : { color: '#64748b' },
                      ]}
                    >
                      {item.status}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteLead(item)}
                    style={styles.trashBtn}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Plan & Contact Details */}
              <View style={styles.detailsBox}>
                <View style={styles.detailItem}>
                  <Ionicons name="layers-outline" size={14} color="#6366f1" />
                  <Text style={styles.detailText}>
                    <Text style={{ fontWeight: '700' }}>Plan: </Text>
                    {item.interestedPlan || 'General Chit Scheme'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.detailItem}
                  onPress={() => Linking.openURL(`tel:${item.phone}`)}
                >
                  <Ionicons name="call-outline" size={14} color="#10b981" />
                  <Text style={[styles.detailText, { color: '#047857', fontWeight: '700' }]}>
                    {item.phone}
                  </Text>
                </TouchableOpacity>
                {item.email && (
                  <View style={styles.detailItem}>
                    <Ionicons name="mail-outline" size={14} color="#64748b" />
                    <Text style={styles.detailText}>{item.email}</Text>
                  </View>
                )}
                {item.message && (
                  <Text style={styles.messageText}>"{item.message}"</Text>
                )}
              </View>

              {/* Actions */}
              {isNew ? (
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={styles.rejectBtn}
                    onPress={() => handleRejectLead(item.id)}
                    disabled={isLoading}
                  >
                    <Text style={styles.rejectBtnText}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.convertBtn}
                    onPress={() => handleConvertLead(item)}
                    disabled={isLoading}
                  >
                    <Ionicons name="person-add" size={14} color={Colors.white} />
                    <Text style={styles.convertBtnText}>
                      {isLoading ? 'Converting...' : 'Convert to Customer'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : isConverted ? (
                <View style={styles.convertedInfoRow}>
                  <Ionicons name="checkmark-circle" size={16} color="#15803d" />
                  <Text style={styles.convertedInfoText}>
                    Converted to Member ID: {item.convertedCustomerId || 'TC-Active'}
                  </Text>
                </View>
              ) : null}
            </View>
          );
        }}
      />

      {/* CREATE NEW LEAD MODAL */}
      <Modal visible={isAddModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Register New Lead</Text>
                <Text style={styles.modalSubtitle}>Record inquiry to prospective subscriber list</Text>
              </View>
              <TouchableOpacity onPress={() => setIsAddModalOpen(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color="#0f172a" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalFormContent}>
              <View>
                <Text style={styles.inputLabel}>Full Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={formName}
                  onChangeText={setFormName}
                  placeholder="e.g. Ramesh Kannan"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View>
                <Text style={styles.inputLabel}>Mobile Phone *</Text>
                <TextInput
                  style={styles.textInput}
                  value={formPhone}
                  onChangeText={setFormPhone}
                  keyboardType="phone-pad"
                  placeholder="10-digit number"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View>
                <Text style={styles.inputLabel}>Email Address (Optional)</Text>
                <TextInput
                  style={styles.textInput}
                  value={formEmail}
                  onChangeText={setFormEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="e.g. ramesh@example.com"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View>
                <Text style={styles.inputLabel}>Interested Scheme Plan</Text>
                <View style={styles.planChipsRow}>
                  {['Auction Chit Plan', 'Fixed Chit Plan', 'Regular Chit Plan'].map((p) => (
                    <TouchableOpacity
                      key={p}
                      style={[styles.planChip, formPlan === p && styles.planChipActive]}
                      onPress={() => setFormPlan(p)}
                    >
                      <Text style={[styles.planChipText, formPlan === p && styles.planChipTextActive]}>
                        {p}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View>
                <Text style={styles.inputLabel}>Inquiry Message / Notes</Text>
                <TextInput
                  style={[styles.textInput, { height: 70, textAlignVertical: 'top', paddingTop: 10 }]}
                  value={formMessage}
                  onChangeText={setFormMessage}
                  multiline
                  placeholder="Notes about scheme duration, chit value requirement, etc."
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <TouchableOpacity
                style={[styles.submitLeadBtn, isSubmitting && { opacity: 0.7 }]}
                onPress={handleCreateLead}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.submitLeadBtnText}>Save Lead to CRM</Text>
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
    backgroundColor: '#f8fafc',
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statVal: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.navy.primary,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94a3b8',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  searchContainer: {
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 38,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: '#0f172a',
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
  },
  statusPillActive: {
    backgroundColor: Colors.navy.primary,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  statusPillTextActive: {
    color: Colors.white,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 30,
  },
  leadCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    marginBottom: 12,
  },
  leadHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  leadName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  leadTime: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  detailsBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    gap: 6,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 12,
    color: '#334155',
  },
  messageText: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#64748b',
    marginTop: 4,
    paddingLeft: 4,
    borderLeftWidth: 2,
    borderLeftColor: '#cbd5e1',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  rejectBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
  },
  rejectBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#b91c1c',
  },
  convertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.primary[600],
  },
  convertBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.white,
  },
  convertedInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  convertedInfoText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803d',
  },
  trashBtn: {
    padding: 5,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topActionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  topActionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  topActionSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  addLeadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.navy.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addLeadBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.white,
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
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  textInput: {
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
  planChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  planChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  planChipActive: {
    backgroundColor: Colors.navy.primary,
    borderColor: Colors.navy.primary,
  },
  planChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  planChipTextActive: {
    color: Colors.white,
  },
  submitLeadBtn: {
    backgroundColor: Colors.gold.primary,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  submitLeadBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0B1A30',
  },
});
