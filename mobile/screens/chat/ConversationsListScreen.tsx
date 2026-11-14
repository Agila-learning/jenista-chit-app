import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { useAuth } from '../../store/AuthContext';
import { getActiveBaseUrl, DataSyncManager } from '../../services/dataSync';
import { InstagramStoriesTray } from '../../components/chat/InstagramStoriesTray';

interface Conversation {
  conversationId: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  lastMessage: string;
  lastMessageAt: string;
  lastSenderRole: string;
  unreadCount: number;
}

type FilterTab = 'ALL' | 'UNREAD' | 'MEMBERS' | 'STAFF';

export const ConversationsListScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');

  const loadConversations = async () => {
    try {
      const baseUrl = await getActiveBaseUrl();
      const res = await fetch(`${baseUrl}/chat/conversations`);
      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.data) && json.data.length > 0) {
          const allCustomers = await DataSyncManager.getCustomers().catch(() => []);
          const enriched = json.data.map((conv: any) => {
            const cleanPhone = String(conv.customerPhone || conv.conversationId || '').replace(/\D/g, '');
            const cleanCustId = String(conv.customerId || '').toLowerCase();
            const matched = allCustomers.find((c: any) => {
              const cPhone = String(c.phone || c.mobile || '').replace(/\D/g, '');
              const cId = String(c.id || c.customerCode || c.mongoId || '').toLowerCase();
              return (cleanPhone && cPhone && (cPhone === cleanPhone || cPhone.endsWith(cleanPhone) || cleanPhone.endsWith(cPhone))) ||
                     (cleanCustId && cId === cleanCustId);
            });
            const validName = matched?.name || matched?.fullName ||
              (conv.customerName && conv.customerName !== 'Customer' && conv.customerName !== 'Member' && !/^\d+$/.test(conv.customerName) ? conv.customerName : '');
            return {
              ...conv,
              customerName: validName || (cleanPhone ? `Member (${cleanPhone})` : 'Customer'),
              customerPhone: conv.customerPhone || matched?.phone || matched?.mobile || '',
            };
          });
          setConversations(enriched);
          return;
        }
      }
    } catch {}

    // Fallback: build list from known customers
    try {
      const customers = await DataSyncManager.getCustomers();
      const fallbackList: Conversation[] = customers.slice(0, 25).map((c) => ({
        conversationId: c.phone || c.mobile || c.customerCode || c.id,
        customerId: c.id,
        customerName: c.name || c.fullName || 'Customer',
        customerPhone: c.phone || c.mobile || '',
        lastMessage: 'Tap to start customer support conversation...',
        lastMessageAt: new Date().toISOString(),
        lastSenderRole: 'SYSTEM',
        unreadCount: 0,
      }));
      setConversations(fallbackList);
    } catch {}
  };

  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, 5000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadConversations().finally(() => setRefreshing(false));
  };

  const filtered = conversations.filter((c) => {
    const q = (search || '').toLowerCase().trim();
    const cName = String(c?.customerName || '').toLowerCase();
    const cPhone = String(c?.customerPhone || '').toLowerCase();
    const cLast = String(c?.lastMessage || '').toLowerCase();

    const matchesSearch =
      !q ||
      cName.includes(q) ||
      cPhone.includes(q) ||
      cLast.includes(q);

    if (!matchesSearch) return false;

    if (activeTab === 'UNREAD') return (c.unreadCount || 0) > 0;
    if (activeTab === 'STAFF') return c.lastSenderRole === 'STAFF';
    return true;
  });

  const unreadTotal = conversations.reduce((acc, c) => acc + (c.unreadCount > 0 ? 1 : 0), 0);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Top Search Bar */}
      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color="#94a3b8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search member name or mobile..."
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
        />
        {!!search && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabsRow}>
        <TouchableOpacity
          style={[styles.tabChip, activeTab === 'ALL' && styles.tabChipActive]}
          onPress={() => setActiveTab('ALL')}
        >
          <Text style={[styles.tabChipText, activeTab === 'ALL' && styles.tabChipTextActive]}>
            All ({conversations.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabChip, activeTab === 'UNREAD' && styles.tabChipActive]}
          onPress={() => setActiveTab('UNREAD')}
        >
          <Text style={[styles.tabChipText, activeTab === 'UNREAD' && styles.tabChipTextActive]}>
            Unread {unreadTotal > 0 ? `(${unreadTotal})` : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabChip, activeTab === 'MEMBERS' && styles.tabChipActive]}
          onPress={() => setActiveTab('MEMBERS')}
        >
          <Text style={[styles.tabChipText, activeTab === 'MEMBERS' && styles.tabChipTextActive]}>
            Members
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabChip, activeTab === 'STAFF' && styles.tabChipActive]}
          onPress={() => setActiveTab('STAFF')}
        >
          <Text style={[styles.tabChipText, activeTab === 'STAFF' && styles.tabChipTextActive]}>
            Staff Desk
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.conversationId}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.storiesContainer}>
            <InstagramStoriesTray navigation={navigation} />
            <View style={styles.sectionDivider}>
              <Text style={styles.sectionTitle}>Direct Messages</Text>
              <Text style={styles.sectionSubtitle}>{filtered.length} Active chats</Text>
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const initial = (item.customerName || 'M').charAt(0).toUpperCase();
          const avatarBgs = ['#FFECC2', '#FCE7F3', '#E0F2FE', '#EDE9FE', '#FEF3C7', '#DCFCE7'];
          const bg = avatarBgs[initial.charCodeAt(0) % avatarBgs.length];

          const isUnread = item.unreadCount > 0;

          return (
            <TouchableOpacity
              style={[styles.convCard, isUnread && styles.convCardUnread]}
              activeOpacity={0.75}
              onPress={() =>
                navigation.navigate('ChatScreen', {
                  conversationId: item.conversationId,
                  customerId: item.customerId,
                  customerName: item.customerName,
                  customerPhone: item.customerPhone,
                })
              }
            >
              {/* Avatar with Online Dot */}
              <View style={styles.avatarWrapper}>
                <View style={[styles.avatar, { backgroundColor: bg }]}>
                  <Text style={styles.avatarText}>{initial}</Text>
                </View>
                <View style={styles.onlineBadge} />
              </View>

              <View style={{ flex: 1 }}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.custName, isUnread && styles.custNameUnread]}>
                    {item.customerName}
                  </Text>
                  <Text style={[styles.timeText, isUnread && styles.timeTextUnread]}>
                    {new Date(item.lastMessageAt).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                </View>

                <Text style={[styles.lastMsg, isUnread && styles.lastMsgUnread]} numberOfLines={1}>
                  {item.lastMessage}
                </Text>

                <View style={styles.cardFooter}>
                  <View style={styles.phoneBadge}>
                    <Ionicons name="call-outline" size={10} color="#64748B" />
                    <Text style={styles.phoneText}>{item.customerPhone || `ID: ${item.customerId}`}</Text>
                  </View>
                  {isUnread && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
                    </View>
                  )}
                </View>
              </View>

              <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={48} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No conversations found</Text>
            <Text style={styles.emptySubtitle}>
              {search ? 'Try a different search query' : 'Messages with members will appear here'}
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
  },
  filterTabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  tabChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabChipActive: {
    backgroundColor: Colors.navy.primary,
    borderColor: Colors.navy.primary,
  },
  tabChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  tabChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  storiesContainer: {
    marginBottom: 6,
  },
  sectionDivider: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginTop: 6,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: 0.3,
  },
  sectionSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 110,
    gap: 10,
  },
  convCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
    elevation: 1,
    shadowColor: Colors.navy.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  convCardUnread: {
    borderColor: '#BFDBFE',
    backgroundColor: '#F8FAFF',
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 19,
    fontWeight: '900',
    color: Colors.navy.primary,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  custName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  custNameUnread: {
    fontWeight: '900',
    color: '#1E3A8A',
  },
  timeText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  timeTextUnread: {
    color: '#2563EB',
    fontWeight: '700',
  },
  lastMsg: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
    lineHeight: 16,
  },
  lastMsgUnread: {
    color: '#1E293B',
    fontWeight: '700',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  phoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  phoneText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  unreadBadge: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#94A3B8',
  },
});


