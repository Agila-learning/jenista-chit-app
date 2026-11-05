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

export const ConversationsListScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const loadConversations = async () => {
    try {
      const baseUrl = await getActiveBaseUrl();
      const res = await fetch(`${baseUrl}/chat/conversations`);
      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.data) && json.data.length > 0) {
          setConversations(json.data);
          return;
        }
      }
    } catch {}

    // Fallback: build list from known customers
    try {
      const customers = await DataSyncManager.getCustomers();
      const fallbackList: Conversation[] = customers.slice(0, 10).map((c) => ({
        conversationId: c.id,
        customerId: c.id,
        customerName: c.name,
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
    const interval = setInterval(loadConversations, 6000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadConversations().finally(() => setRefreshing(false));
  };

  const filtered = conversations.filter((c) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      c.customerName.toLowerCase().includes(q) ||
      (c.customerPhone && c.customerPhone.includes(q)) ||
      c.lastMessage.toLowerCase().includes(q)
    );
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Search Bar */}
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

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.conversationId}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const initial = (item.customerName || 'M').charAt(0).toUpperCase();
          const avatarBgs = ['#FFECC2', '#FCE7F3', '#E0F2FE', '#EDE9FE', '#FEF3C7'];
          const bg = avatarBgs[initial.charCodeAt(0) % avatarBgs.length];

          return (
            <TouchableOpacity
              style={styles.convCard}
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
              <View style={[styles.avatar, { backgroundColor: bg }]}>
                <Text style={styles.avatarText}>{initial}</Text>
              </View>

              <View style={{ flex: 1 }}>
                <View style={styles.cardHeader}>
                  <Text style={styles.custName}>{item.customerName}</Text>
                  <Text style={styles.timeText}>
                    {new Date(item.lastMessageAt).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                </View>

                <Text style={styles.lastMsg} numberOfLines={1}>
                  {item.lastMessage}
                </Text>

                <View style={styles.cardFooter}>
                  <Text style={styles.phoneText}>{item.customerPhone || `ID: ${item.customerId}`}</Text>
                  {item.unreadCount > 0 && (
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
    marginVertical: 12,
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
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    gap: 10,
  },
  convCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
    elevation: 1,
    shadowColor: Colors.navy.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.navy.primary,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  custName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  timeText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  lastMsg: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  phoneText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  unreadBadge: {
    backgroundColor: Colors.danger,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
});

