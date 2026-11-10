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
  Modal,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { Colors } from '../../theme/colors';
import { useAuth } from '../../store/AuthContext';
import { getActiveBaseUrl } from '../../services/dataSync';
import { secureStorage } from '../../services/storage';

export interface ChatAttachment {
  uri: string;
  type: 'IMAGE' | 'DOCUMENT' | 'RECEIPT';
  name?: string;
  size?: number;
  mimeType?: string;
}

export interface Message {
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
  attachment?: ChatAttachment;
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
  const [selectedAttachment, setSelectedAttachment] = useState<ChatAttachment | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [viewingImageUri, setViewingImageUri] = useState<string | null>(null);
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

    // Poll every 3 seconds while chat is active
    const timer = setInterval(() => {
      fetchMessages();
    }, 3500);

    return () => clearInterval(timer);
  }, [conversationId]);

  // Pick Image from Gallery
  const handlePickImage = async () => {
    setShowAttachMenu(false);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera roll access is required to share photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedAttachment({
          uri: asset.uri,
          type: 'IMAGE',
          name: asset.fileName || `Photo-${Date.now()}.jpg`,
          size: asset.fileSize,
          mimeType: asset.mimeType || 'image/jpeg',
        });
      }
    } catch (err) {
      console.warn('Image picker error:', err);
    }
  };

  // Take Photo via Camera
  const handleTakePhoto = async () => {
    setShowAttachMenu(false);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera access is required to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedAttachment({
          uri: asset.uri,
          type: 'IMAGE',
          name: `Camera-${Date.now()}.jpg`,
          size: asset.fileSize,
          mimeType: 'image/jpeg',
        });
      }
    } catch (err) {
      console.warn('Camera error:', err);
    }
  };

  // Pick Document / PDF
  const handlePickDocument = async () => {
    setShowAttachMenu(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*', 'text/plain'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const doc = result.assets[0];
        setSelectedAttachment({
          uri: doc.uri,
          type: doc.mimeType?.startsWith('image/') ? 'IMAGE' : 'DOCUMENT',
          name: doc.name || `Document-${Date.now()}`,
          size: doc.size,
          mimeType: doc.mimeType || 'application/pdf',
        });
      }
    } catch (err) {
      console.warn('Document picker error:', err);
    }
  };

  // Open / Share Document
  const handleOpenAttachment = async (att: ChatAttachment) => {
    if (att.type === 'IMAGE') {
      setViewingImageUri(att.uri);
      return;
    }

    try {
      const available = await Sharing.isAvailableAsync();
      if (available && att.uri) {
        await Sharing.shareAsync(att.uri);
      } else {
        Alert.alert('Attachment', `File: ${att.name || 'Document'}`);
      }
    } catch (err) {
      console.warn('Sharing error:', err);
    }
  };

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if ((!text && !selectedAttachment) || sending) return;

    setSending(true);
    setInputText('');
    const attachmentToSend = selectedAttachment;
    setSelectedAttachment(null);

    const newMsg: Message = {
      id: `MSG-${Date.now()}`,
      conversationId,
      customerId: targetCustomerId,
      customerName: targetCustomerName,
      customerPhone: targetCustomerPhone,
      senderId: user?.id || 'me',
      senderName: user?.name || (isAdminOrStaff ? 'Support Desk' : 'Customer'),
      senderRole: (user?.role as any) || 'CUSTOMER',
      text: text || (attachmentToSend ? `[Attachment: ${attachmentToSend.name || 'File'}]` : ''),
      attachment: attachmentToSend || undefined,
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
        <View style={styles.topAvatar}>
          <Text style={styles.topAvatarText}>
            {(targetCustomerName || 'C').charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.topInfoText} numberOfLines={1}>
            {isAdminOrStaff ? targetCustomerName : 'Jenista Chit Funds Live Customer Support'}
          </Text>
          <View style={styles.onlineStatusRow}>
            <View style={styles.statusDot} />
            <Text style={styles.onlineStatusText}>
              {isAdminOrStaff ? (targetCustomerPhone || 'Customer Support Channel') : 'Active Support Representative Online'}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.infoActionBtn}
          onPress={() => Alert.alert('Jenista Chit Support', 'Support hours: 9:00 AM - 7:00 PM IST (Mon - Sat).\nDirect Helpline: +91 98401 23456')}
        >
          <Ionicons name="information-circle-outline" size={20} color="#FFFFFF" />
        </TouchableOpacity>
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
                      {item.senderRole === 'ADMIN' ? 'Admin' : item.senderRole === 'STAFF' ? 'Staff' : 'Member'}
                    </Text>
                  </View>
                )}
                <View
                  style={[
                    styles.bubble,
                    isMe ? styles.bubbleMe : styles.bubbleOther,
                  ]}
                >
                  {/* Inline Attachment Rendering */}
                  {item.attachment && (
                    <TouchableOpacity
                      style={styles.attachmentBox}
                      activeOpacity={0.85}
                      onPress={() => item.attachment && handleOpenAttachment(item.attachment)}
                    >
                      {item.attachment.type === 'IMAGE' ? (
                        <View style={styles.attachmentImageWrapper}>
                          <Image
                            source={{ uri: item.attachment.uri }}
                            style={styles.attachmentThumbnail}
                            resizeMode="cover"
                          />
                          <View style={styles.imageOverlayBadge}>
                            <Ionicons name="expand" size={12} color="#FFFFFF" />
                            <Text style={styles.imageOverlayText}>View Photo</Text>
                          </View>
                        </View>
                      ) : (
                        <View style={[styles.docAttachmentCard, isMe ? styles.docCardMe : styles.docCardOther]}>
                          <View style={styles.docIconCircle}>
                            <Ionicons name="document-text" size={20} color="#2563EB" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.docNameText, isMe ? styles.docNameMe : styles.docNameOther]} numberOfLines={1}>
                              {item.attachment.name || 'Document'}
                            </Text>
                            <Text style={styles.docSubText}>
                              {item.attachment.size ? `${Math.round(item.attachment.size / 1024)} KB • ` : ''}Tap to open
                            </Text>
                          </View>
                          <Ionicons name="download-outline" size={16} color={isMe ? '#FFFFFF' : '#2563EB'} />
                        </View>
                      )}
                    </TouchableOpacity>
                  )}

                  {/* Message Text */}
                  {!!item.text && (!item.attachment || !item.text.startsWith('[Attachment:')) && (
                    <Text style={[styles.messageText, isMe ? styles.messageTextMe : styles.messageTextOther]}>
                      {item.text}
                    </Text>
                  )}

                  <View style={styles.metaRow}>
                    <Text style={[styles.timeText, isMe ? styles.timeTextMe : styles.timeTextOther]}>
                      {timeStr}
                    </Text>
                    {isMe && (
                      <Ionicons name="checkmark-done" size={13} color="rgba(255, 255, 255, 0.85)" />
                    )}
                  </View>
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

      {/* Attachment Preview Banner */}
      {selectedAttachment && (
        <View style={styles.attachmentPreviewBanner}>
          <View style={styles.previewLeft}>
            {selectedAttachment.type === 'IMAGE' ? (
              <Image source={{ uri: selectedAttachment.uri }} style={styles.previewThumb} />
            ) : (
              <View style={styles.previewDocIcon}>
                <Ionicons name="document-text" size={18} color="#2563EB" />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.previewTitle} numberOfLines={1}>
                {selectedAttachment.name}
              </Text>
              <Text style={styles.previewSubtitle}>Ready to send with message</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.previewRemoveBtn}
            onPress={() => setSelectedAttachment(null)}
          >
            <Ionicons name="close-circle" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom Input Row */}
      <View style={styles.inputContainer}>
        {/* Attachment Paperclip Button */}
        <TouchableOpacity
          style={styles.attachBtn}
          onPress={() => setShowAttachMenu(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="attach" size={22} color={Colors.navy.primary} />
        </TouchableOpacity>

        <TextInput
          style={styles.textInput}
          placeholder={isAdminOrStaff ? "Reply to member..." : "Type your inquiry or message..."}
          placeholderTextColor="#94a3b8"
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={1000}
        />

        <TouchableOpacity
          style={[
            styles.sendButton,
            !inputText.trim() && !selectedAttachment && styles.sendButtonDisabled,
          ]}
          onPress={() => handleSend()}
          disabled={(!inputText.trim() && !selectedAttachment) || sending}
          activeOpacity={0.85}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="send" size={16} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>

      {/* Attachment Picker Modal */}
      <Modal
        visible={showAttachMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAttachMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowAttachMenu(false)}
        >
          <View style={styles.attachMenuCard}>
            <Text style={styles.attachMenuTitle}>Share Attachment</Text>

            <TouchableOpacity style={styles.attachMenuItem} onPress={handlePickImage}>
              <View style={[styles.attachMenuIcon, { backgroundColor: '#EDE9FE' }]}>
                <Ionicons name="images" size={20} color="#7C3AED" />
              </View>
              <View>
                <Text style={styles.attachMenuLabel}>Photo Gallery</Text>
                <Text style={styles.attachMenuSub}>Select payment proof, passbook photo</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.attachMenuItem} onPress={handleTakePhoto}>
              <View style={[styles.attachMenuIcon, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="camera" size={20} color="#0284C7" />
              </View>
              <View>
                <Text style={styles.attachMenuLabel}>Take Photo</Text>
                <Text style={styles.attachMenuSub}>Capture physical payment receipt or document</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.attachMenuItem} onPress={handlePickDocument}>
              <View style={[styles.attachMenuIcon, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="document-attach" size={20} color="#D97706" />
              </View>
              <View>
                <Text style={styles.attachMenuLabel}>Document / PDF</Text>
                <Text style={styles.attachMenuSub}>Upload passbook statement, KYC file or voucher</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelAttachBtn}
              onPress={() => setShowAttachMenu(false)}
            >
              <Text style={styles.cancelAttachText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Full-screen Photo Viewer Modal */}
      <Modal
        visible={!!viewingImageUri}
        transparent
        animationType="fade"
        onRequestClose={() => setViewingImageUri(null)}
      >
        <View style={styles.photoViewerBackdrop}>
          <TouchableOpacity
            style={styles.photoCloseBtn}
            onPress={() => setViewingImageUri(null)}
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          {viewingImageUri && (
            <Image
              source={{ uri: viewingImageUri }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
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
    gap: 10,
    backgroundColor: Colors.navy.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(215, 169, 40, 0.3)',
  },
  topAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(215, 169, 40, 0.5)',
  },
  topAvatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  topInfoText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  onlineStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  onlineStatusText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.75)',
    fontWeight: '600',
  },
  infoActionBtn: {
    padding: 6,
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
    paddingBottom: 24,
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
  attachmentBox: {
    marginBottom: 6,
  },
  attachmentImageWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  attachmentThumbnail: {
    width: 220,
    height: 160,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
  },
  imageOverlayBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  imageOverlayText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  docAttachmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    gap: 10,
    minWidth: 180,
  },
  docCardMe: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  docCardOther: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  docIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docNameText: {
    fontSize: 12,
    fontWeight: '700',
  },
  docNameMe: {
    color: '#FFFFFF',
  },
  docNameOther: {
    color: '#0F172A',
  },
  docSubText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 1,
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 4,
  },
  timeText: {
    fontSize: 9,
  },
  timeTextMe: {
    color: 'rgba(255, 255, 255, 0.75)',
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
  attachmentPreviewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    borderTopWidth: 1,
    borderTopColor: '#BFDBFE',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  previewLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  previewThumb: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#CBD5E1',
  },
  previewDocIcon: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E40AF',
  },
  previewSubtitle: {
    fontSize: 10,
    color: '#60A5FA',
  },
  previewRemoveBtn: {
    padding: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 8,
  },
  attachBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
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
    width: 40,
    height: 40,
    borderRadius: 20,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  attachMenuCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 32,
    gap: 12,
  },
  attachMenuTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  attachMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 10,
  },
  attachMenuIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachMenuLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  attachMenuSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  cancelAttachBtn: {
    marginTop: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
  },
  cancelAttachText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  photoViewerBackdrop: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  fullScreenImage: {
    width: '100%',
    height: '80%',
  },
});
