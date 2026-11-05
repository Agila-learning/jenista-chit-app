import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { useAuth } from '../../store/AuthContext';
import { getActiveBaseUrl } from '../../services/dataSync';
import { secureStorage } from '../../services/storage';

interface Message {
  _id?: string;
  id?: string;
  conversationId: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  senderId: string;
  senderName: string;
  senderRole: 'CUSTOMER' | 'ADMIN' | 'STAFF';
  text: string;
  createdAt: string;
  status?: string;
}

export const ChatScreen: React.FC<{ route?: any; navigation: any }> = ({ route, navigation }) => {
  const { user } = useAuth();
  const flatListRef = useRef<FlatList>(null);

  const isAdminOrStaff = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'STAFF';

  // Target conversation details
  const targetCustomerId = route?.params?.customerId || user?.id || 'customer';
  const targetCustomerName = route?.params?.customerName || user?.name || 'Customer';
  const targetCustomerPhone = route?.params?.customerPhone || user?.phone || '';
  const conversationId = route?.params?.conversationId || targetCustomerId;

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const storageKey = `chat_messages_${conversationId}`;

  const fetchMessages = async () => {
    try {
      const baseUrl = await getActiveBaseUrl();
      const res = await fetch(`${baseUrl}/chat/messages/${encodeURIComponent(conversationId)}`);
      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.data)) {
          setMessages(json.data);
          await secureStorage.setItem(storageKey, JSON.stringify(json.data));
          return;
        }
      }
    } catch {}

    // Fallback to local cache
    try {
      const cached = await secureStorage.getItem(storageKey);
      if (cached) {
        setMessages(JSON.parse(cached));
      } else if (!isAdminOrStaff && messages.length === 0) {
        // Welcome message for customer
        const welcomeMsg: Message = {
          id: 'welcome',
          conversationId,
          customerId: targetCustomerId,
          customerName: targetCustomerName,
          senderId: 'system',
          senderName: 'Jenista Support Desk',
          senderRole: 'ADMIN',
          text: `Vanakkam ${targetCustomerName}! How can we assist you with your chit funds today? Send us any questions regarding your chit plans, monthly installments, or prize claims.`,
          createdAt: new Date().toISOString(),
        };
        setMessages([welcomeMsg]);
      }
    } catch {}
  };

  useEffect(() => {
    fetchMessages().finally(() => setLoading(false));

    // Poll every 4 seconds while chat is active
    const timer = setInterval(() => {
      fetchMessages();
    }, 4000);

    return () => clearInterval(timer);
  }, [conversationId]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || sending) return;

    setSending(true);
    setInputText('');

    const newMsg: Message = {
      id: `MSG-${Date.now()}`,
      conversationId,
      customerId: targetCustomerId,
      customerName: targetCustomerName,
      customerPhone: targetCustomerPhone,
      senderId: user?.id || 'me',
      senderName: user?.name || (isAdminOrStaff ? 'Support Desk' : 'Customer'),
      senderRole: (user?.role as any) || 'CUSTOMER',
      text,
      createdAt: new Date().toISOString(),
      status: 'SENT',
    };

    setMessages((prev) => [...prev, newMsg]);

    try {
      const baseUrl = await getActiveBaseUrl();
      await fetch(`${baseUrl}/chat/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMsg),
      });
    } catch {}

    // Save updated local messages
    await secureStorage.setItem(storageKey, JSON.stringify([...messages, newMsg]));
    setSending(false);

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const quickQuestions = [
    'When is my next due?',
    'How do I claim my prize payout?',
    'Please share my payment passbook.',
    'I want to enroll in a new chit scheme.',
  ];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <StatusBar barStyle="light-content" />

      {/* Header bar info */}
      <View style={styles.topInfoBar}>
        <Ionicons name="chatbubbles" size={16} color={Colors.gold.primary} />
        <Text style={styles.topInfoText}>
          {isAdminOrStaff ? `Chatting with: ${targetCustomerName}` : 'Jenista Chit Funds Live Customer Support'}
        </Text>
      </View>

      {loading ? (
        <View style={styles.loaderCenter}>
          <ActivityIndicator size="small" color={Colors.navy.primary} />
          <Text style={styles.loadingText}>Connecting to support chat...</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, index) => item._id || item.id || String(index)}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => {
            const isMe = item.senderId === user?.id || (isAdminOrStaff && item.senderRole !== 'CUSTOMER') || (!isAdminOrStaff && item.senderRole === 'CUSTOMER');
            const timeStr = new Date(item.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <View style={[styles.bubbleWrapper, isMe ? styles.bubbleRight : styles.bubbleLeft]}>
                {!isMe && (
                  <View style={styles.senderHeader}>
                    <Text style={styles.senderNameText}>{item.senderName}</Text>
                    <Text style={styles.senderRoleBadge}>
                      {item.senderRole === 'ADMIN' ? 'Admin' : item.senderRole === 'STAFF' ? 'Staff' : 'Customer'}
                    </Text>
                  </View>
                )}
                <View
                  style={[
                    styles.bubble,
                    isMe ? styles.bubbleMe : styles.bubbleOther,
                  ]}
                >
                  <Text style={[styles.messageText, isMe ? styles.messageTextMe : styles.messageTextOther]}>
                    {item.text}
                  </Text>
                  <Text style={[styles.timeText, isMe ? styles.timeTextMe : styles.timeTextOther]}>
                    {timeStr}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Quick suggestions for customers */}
      {!isAdminOrStaff && messages.length <= 2 && (
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsTitle}>Quick Inquiries:</Text>
          <View style={styles.suggestionsRow}>
            {quickQuestions.map((q, i) => (
              <TouchableOpacity
                key={i}
                style={styles.suggestionChip}
                onPress={() => handleSend(q)}
                activeOpacity={0.8}
              >
                <Text style={styles.suggestionText}>{q}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Bottom Input Row */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder={isAdminOrStaff ? "Reply to member..." : "Type your inquiry..."}
          placeholderTextColor="#94a3b8"
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={() => handleSend()}
          disabled={!inputText.trim() || sending}
          activeOpacity={0.85}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="send" size={17} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topInfoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.navy.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(215, 169, 40, 0.3)',
  },
  topInfoText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  loaderCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    paddingBottom: 20,
  },
  bubbleWrapper: {
    maxWidth: '82%',
    marginBottom: 4,
  },
  bubbleRight: {
    alignSelf: 'flex-end',
  },
  bubbleLeft: {
    alignSelf: 'flex-start',
  },
  senderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
    marginLeft: 4,
  },
  senderNameText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  senderRoleBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#92400E',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  bubbleMe: {
    backgroundColor: Colors.navy.primary,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageTextMe: {
    color: '#FFFFFF',
  },
  messageTextOther: {
    color: '#0F172A',
  },
  timeText: {
    fontSize: 9,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  timeTextMe: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  timeTextOther: {
    color: '#94A3B8',
  },
  suggestionsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F1F5F9',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  suggestionsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  suggestionChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  suggestionText: {
    fontSize: 11,
    color: Colors.navy.primary,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 10,
  },
  textInput: {
    flex: 1,
    maxHeight: 100,
    minHeight: 40,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.navy.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: Colors.navy.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  sendButtonDisabled: {
    backgroundColor: '#94A3B8',
    elevation: 0,
  },
});

