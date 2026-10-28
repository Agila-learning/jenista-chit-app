import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { formatCurrency, formatDate } from '../../utils/format';
import { useAuth } from '../../store/AuthContext';
import {
  MobileNotificationsManager,
  SystemNotification,
  Announcement,
} from '../../services/notificationsData';

export const NotificationsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'NOTIFICATIONS' | 'ANNOUNCEMENTS'>('NOTIFICATIONS');
  const [filterType, setFilterType] = useState<'ALL' | 'PAYMENT' | 'PRIZE' | 'LEAD'>('ALL');
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // New Announcement Modal state
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<'FESTIVAL_OFFER' | 'AUCTION_RESULT' | 'PRIZE_WINNER' | 'GENERAL'>('GENERAL');
  const [newContent, setNewContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  const loadData = async () => {
    try {
      const [notifs, anns] = await Promise.all([
        MobileNotificationsManager.getNotificationsForUser(user?.id, user?.role),
        MobileNotificationsManager.getAnnouncements(),
      ]);
      setNotifications(notifs);
      setAnnouncements(anns);
    } catch (e) {
      console.warn('Failed to load notifications:', e);
    } finally {
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

  const handleMarkAllRead = async () => {
    await MobileNotificationsManager.markAllAsRead(user?.id, user?.role);
    await loadData();
    Alert.alert('Success', 'All notifications marked as read.');
  };

  const handleCreateAnnouncement = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      Alert.alert('Required Fields', 'Please enter a title and message content.');
      return;
    }
    setIsSubmitting(true);
    try {
      await MobileNotificationsManager.addAnnouncement({
        title: newTitle.trim(),
        category: newCategory,
        content: newContent.trim(),
        author: user?.name || 'Administrator',
        targetRole: 'ALL',
        priority: 'HIGH',
      });
      setShowModal(false);
      setNewTitle('');
      setNewContent('');
      await loadData();
      Alert.alert('Announcement Broadcasted', 'The announcement was published to all members.');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to broadcast announcement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filterType === 'PAYMENT') return n.type.includes('PAYMENT');
    if (filterType === 'PRIZE') return n.type.includes('PRIZE');
    if (filterType === 'LEAD') return n.type === 'NEW_LEAD';
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'NOTIFICATIONS' && styles.tabItemActive]}
          onPress={() => setActiveTab('NOTIFICATIONS')}
        >
          <Ionicons
            name="notifications-outline"
            size={16}
            color={activeTab === 'NOTIFICATIONS' ? Colors.gold.primary : 'rgba(255,255,255,0.6)'}
          />
          <Text style={[styles.tabText, activeTab === 'NOTIFICATIONS' && styles.tabTextActive]}>
            Alerts {unreadCount > 0 ? `(${unreadCount})` : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'ANNOUNCEMENTS' && styles.tabItemActive]}
          onPress={() => setActiveTab('ANNOUNCEMENTS')}
        >
          <Ionicons
            name="megaphone-outline"
            size={16}
            color={activeTab === 'ANNOUNCEMENTS' ? Colors.gold.primary : 'rgba(255,255,255,0.6)'}
          />
          <Text style={[styles.tabText, activeTab === 'ANNOUNCEMENTS' && styles.tabTextActive]}>
            Announcements ({announcements.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sub-toolbar */}
      <View style={styles.subToolbar}>
        {activeTab === 'NOTIFICATIONS' ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPills}>
            {(['ALL', 'PAYMENT', 'PRIZE', 'LEAD'] as const).map((ft) => (
              <TouchableOpacity
                key={ft}
                style={[styles.filterPill, filterType === ft && styles.filterPillActive]}
                onPress={() => setFilterType(ft)}
              >
                <Text style={[styles.filterPillText, filterType === ft && styles.filterPillTextActive]}>
                  {ft}
                </Text>
              </TouchableOpacity>
            ))}
            {unreadCount > 0 && (
              <TouchableOpacity style={styles.markReadBtn} onPress={handleMarkAllRead}>
                <Ionicons name="checkmark-done" size={14} color={Colors.primary[700]} />
                <Text style={styles.markReadBtnText}>Mark all read</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        ) : (
          <View style={styles.annToolbar}>
            <Text style={styles.annCountText}>{announcements.length} Published Notices</Text>
            {isAdmin && (
              <TouchableOpacity style={styles.broadcastBtn} onPress={() => setShowModal(true)}>
                <Ionicons name="add-circle" size={16} color={Colors.white} />
                <Text style={styles.broadcastBtnText}>Broadcast Notice</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Content */}
      {activeTab === 'NOTIFICATIONS' ? (
        <FlatList
          data={filteredNotifications}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="checkmark-circle-outline" size={48} color={Colors.success} />
              <Text style={styles.emptyTitle}>All Caught Up</Text>
              <Text style={styles.emptySubtitle}>No unread notifications at this time.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isPayment = item.type.includes('PAYMENT');
            const isPrize = item.type.includes('PRIZE');
            return (
              <TouchableOpacity
                style={[styles.notifCard, !item.isRead && styles.notifCardUnread]}
                onPress={() => {
                  MobileNotificationsManager.markAsRead(item.id);
                  loadData();
                }}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.notifIconBubble,
                    isPayment
                      ? { backgroundColor: '#dcfce7' }
                      : isPrize
                      ? { backgroundColor: '#fef3c7' }
                      : { backgroundColor: '#ede9fe' },
                  ]}
                >
                  <Ionicons
                    name={isPayment ? 'card' : isPrize ? 'trophy' : 'notifications'}
                    size={18}
                    color={isPayment ? '#15803d' : isPrize ? '#b45309' : '#6b21a8'}
                  />
                </View>

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={styles.notifHeaderRow}>
                    <Text style={styles.notifTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.notifTime}>{formatDate(item.timestamp)}</Text>
                  </View>
                  <Text style={styles.notifMsg}>{item.message}</Text>
                  {item.metadata?.amount && (
                    <Text style={styles.notifAmountBadge}>
                      Amount: {formatCurrency(item.metadata.amount)}
                    </Text>
                  )}
                </View>
                {!item.isRead && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            );
          }}
        />
      ) : (
        <FlatList
          data={announcements}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.annCard}>
              <View style={styles.annHeaderRow}>
                <View style={styles.badgeRow}>
                  <Text style={styles.annCategoryBadge}>{item.category.replace('_', ' ')}</Text>
                  {item.pinned && <Text style={styles.pinnedBadge}>PINNED</Text>}
                </View>
                <Text style={styles.annDate}>{formatDate(item.publishedAt)}</Text>
              </View>

              <Text style={styles.annTitle}>{item.title}</Text>
              <Text style={styles.annContent}>{item.content}</Text>

              <View style={styles.annFooter}>
                <Text style={styles.annAuthor}>Published by: {item.author}</Text>
              </View>
            </View>
          )}
        />
      )}

      {/* Broadcast Modal for Admin */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Broadcast Announcement</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>ANNOUNCEMENT TITLE</Text>
              <TextInput
                style={styles.inputField}
                placeholder="e.g. Diwali Dividend Bonus 2026"
                value={newTitle}
                onChangeText={setNewTitle}
              />

              <Text style={styles.inputLabel}>CATEGORY</Text>
              <View style={styles.categoryPickerRow}>
                {(['GENERAL', 'FESTIVAL_OFFER', 'AUCTION_RESULT', 'PRIZE_WINNER'] as const).map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.catChip, newCategory === cat && styles.catChipActive]}
                    onPress={() => setNewCategory(cat)}
                  >
                    <Text style={[styles.catChipText, newCategory === cat && styles.catChipTextActive]}>
                      {cat.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>MESSAGE / CONTENT</Text>
              <TextInput
                style={[styles.inputField, { height: 90, textAlignVertical: 'top' }]}
                placeholder="Details of the announcement broadcasted to members..."
                value={newContent}
                onChangeText={setNewContent}
                multiline
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitBroadcastBtn}
                onPress={handleCreateAnnouncement}
                disabled={isSubmitting}
              >
                <Text style={styles.submitBroadcastText}>
                  {isSubmitting ? 'Publishing...' : 'Publish Announcement'}
                </Text>
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
    backgroundColor: '#f8fafc',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.navy.primary,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: Colors.gold.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
  },
  tabTextActive: {
    color: Colors.white,
  },
  subToolbar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  filterPills: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  filterPillActive: {
    backgroundColor: Colors.navy.primary,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  filterPillTextActive: {
    color: Colors.white,
  },
  markReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#eff6ff',
    borderRadius: 20,
    marginLeft: 6,
  },
  markReadBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary[700],
  },
  annToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  annCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  broadcastBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary[600],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  broadcastBtnText: {
    fontSize: 11,
    fontWeight: '800',
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
  },
  notifCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    alignItems: 'flex-start',
  },
  notifCardUnread: {
    borderColor: '#fed7aa',
    backgroundColor: '#fffbeb',
  },
  notifIconBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    flex: 1,
    marginRight: 6,
  },
  notifTime: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
  },
  notifMsg: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
  },
  notifAmountBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.danger,
    marginTop: 6,
    marginLeft: 6,
  },
  annCard: {
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  annHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  annCategoryBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4338ca',
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pinnedBadge: {
    fontSize: 9,
    fontWeight: '900',
    color: '#b45309',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  annDate: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
  },
  annTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  annContent: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  annFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    marginTop: 10,
    paddingTop: 8,
  },
  annAuthor: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: Colors.text,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    marginBottom: 6,
    marginTop: 12,
  },
  inputField: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    color: '#0f172a',
  },
  categoryPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
  },
  catChipActive: {
    backgroundColor: Colors.navy.primary,
    borderColor: Colors.navy.primary,
  },
  catChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  catChipTextActive: {
    color: Colors.white,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 18,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 12,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  submitBroadcastBtn: {
    backgroundColor: Colors.primary[600],
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  submitBroadcastText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.white,
  },
});
