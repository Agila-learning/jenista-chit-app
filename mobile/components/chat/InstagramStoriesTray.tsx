import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { useAuth } from '../../store/AuthContext';
import { ChitStory, StoryViewer, StoriesManager, subscribeToStories } from '../../services/storiesService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const InstagramStoriesTray: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

  const [stories, setStories] = useState<ChitStory[]>([]);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState<number | null>(null);

  // Add Story Modal State (For Admin)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCaption, setNewCaption] = useState('');
  const [newCategory, setNewCategory] = useState<ChitStory['category']>('AUCTION_RESULT');
  const [isPublishing, setIsPublishing] = useState(false);

  // Realtime Viewers Modal State
  const [isViewersModalOpen, setIsViewersModalOpen] = useState(false);
  const [viewersList, setViewersList] = useState<StoryViewer[]>([]);
  const [viewersLoading, setViewersLoading] = useState(false);
  const [viewerSearch, setViewerSearch] = useState('');

  // Story Auto-Advance Timer
  const [progress, setProgress] = useState(0);

  const loadStories = async () => {
    try {
      const data = await StoriesManager.getStories();
      setStories(data);
    } catch {}
  };

  useEffect(() => {
    loadStories();
    const unsub = subscribeToStories(() => {
      loadStories();
    });
    return () => unsub();
  }, []);

  // Story progress timer (paused when viewers modal is open)
  useEffect(() => {
    if (selectedStoryIndex === null) {
      setProgress(0);
      return;
    }

    if (isViewersModalOpen) {
      return; // Pause progress when viewing realtime viewers
    }

    const currentStory = stories[selectedStoryIndex];
    if (currentStory && user?.id) {
      StoriesManager.markStoryViewed(currentStory.id, user);
    }

    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 1) {
          // Advance to next story or close
          if (selectedStoryIndex < stories.length - 1) {
            setSelectedStoryIndex(selectedStoryIndex + 1);
            return 0;
          } else {
            setSelectedStoryIndex(null);
            return 0;
          }
        }
        return prev + 0.04;
      });
    }, 200); // 5 seconds total

    return () => clearInterval(interval);
  }, [selectedStoryIndex, stories.length, user?.id, isViewersModalOpen]);

  const handleOpenViewers = async () => {
    if (selectedStoryIndex === null || !stories[selectedStoryIndex]) return;
    const storyId = stories[selectedStoryIndex].id;
    setIsViewersModalOpen(true);
    setViewersLoading(true);
    setViewerSearch('');
    try {
      const viewers = await StoriesManager.getViewedMembers(storyId);
      setViewersList(viewers);
    } catch {
      setViewersList([]);
    } finally {
      setViewersLoading(false);
    }
  };

  const handleCreateStory = async () => {
    if (!newTitle.trim() || !newCaption.trim()) {
      Alert.alert('Missing Details', 'Please enter a title and announcement message for the story.');
      return;
    }

    setIsPublishing(true);
    try {
      await StoriesManager.addStory({
        title: newTitle.trim(),
        caption: newCaption.trim(),
        category: newCategory,
        authorName: user?.name || 'Jenista Administrator',
        authorRole: user?.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'ADMIN',
      });
      setIsAddModalOpen(false);
      setNewTitle('');
      setNewCaption('');
      Alert.alert('Story Published', 'Your Jenista Chits Story is now live for all chit members and staff to view!');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to publish story');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDeleteStory = async (storyId: string) => {
    Alert.alert('Delete Story', 'Are you sure you want to remove this story announcement?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setSelectedStoryIndex(null);
          setIsViewersModalOpen(false);
          await StoriesManager.deleteStory(storyId);
        },
      },
    ]);
  };

  const getCategoryIcon = (category: ChitStory['category']) => {
    switch (category) {
      case 'AUCTION_RESULT':
        return 'hammer';
      case 'NEW_SCHEME':
        return 'layers';
      case 'DIVIDEND':
        return 'trending-up';
      case 'NOTICE':
        return 'notifications';
      case 'CELEBRATION':
        return 'sparkles';
      default:
        return 'megaphone';
    }
  };

  const getCategoryLabel = (category: ChitStory['category']) => {
    switch (category) {
      case 'AUCTION_RESULT':
        return 'AUCTION RESULT';
      case 'NEW_SCHEME':
        return 'NEW SCHEME';
      case 'DIVIDEND':
        return 'DIVIDEND CREDIT';
      case 'NOTICE':
        return 'OFFICIAL NOTICE';
      case 'CELEBRATION':
        return 'SPECIAL EVENT';
      default:
        return 'ANNOUNCEMENT';
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 1. Admin Add Story Button */}
        {isAdmin && (
          <TouchableOpacity
            style={styles.storyBubbleItem}
            activeOpacity={0.8}
            onPress={() => setIsAddModalOpen(true)}
          >
            <View style={styles.addStoryRing}>
              <View style={styles.addStoryInnerCircle}>
                <Ionicons name="camera" size={20} color="#102B63" />
                <View style={styles.addBadgePill}>
                  <Ionicons name="add" size={13} color="#FFFFFF" />
                </View>
              </View>
            </View>
            <Text style={styles.storyBubbleLabel} numberOfLines={1}>
              Your Story
            </Text>
          </TouchableOpacity>
        )}

        {/* 2. Published Stories List */}
        {stories.map((story, idx) => {
          const isViewed = user?.id && story.viewedBy?.includes(user.id);
          const iconName = getCategoryIcon(story.category);
          const primaryGrad = story.gradient?.[0] || '#7952D6';

          return (
            <TouchableOpacity
              key={story.id}
              style={styles.storyBubbleItem}
              activeOpacity={0.8}
              onPress={() => setSelectedStoryIndex(idx)}
            >
              {/* Instagram Style Gradient Ring */}
              <View
                style={[
                  styles.gradientRing,
                  { borderColor: isViewed ? '#CBD5E1' : primaryGrad },
                ]}
              >
                <View style={[styles.storyAvatarBubble, { backgroundColor: primaryGrad }]}>
                  <Ionicons name={iconName as any} size={20} color="#FFFFFF" />
                </View>
              </View>
              <Text style={styles.storyBubbleLabel} numberOfLines={1}>
                {story.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* 3. Full-Screen Instagram Story Viewer Modal */}
      {selectedStoryIndex !== null && stories[selectedStoryIndex] && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSelectedStoryIndex(null)}
        >
          <View style={styles.storyViewerOverlay}>
            <View
              style={[
                styles.storyViewerCard,
                {
                  backgroundColor:
                    stories[selectedStoryIndex].gradient?.[0] || '#102B63',
                },
              ]}
            >
              {/* Top Progress Bars (like Instagram) */}
              <View style={styles.progressContainer}>
                {stories.map((_, i) => (
                  <View key={i} style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width:
                            i < selectedStoryIndex
                              ? '100%'
                              : i === selectedStoryIndex
                              ? `${Math.min(100, progress * 100)}%`
                              : '0%',
                        },
                      ]}
                    />
                  </View>
                ))}
              </View>

              {/* Story Header */}
              <View style={styles.storyHeader}>
                <View style={styles.authorRow}>
                  <View style={styles.authorBadge}>
                    <Ionicons
                      name={getCategoryIcon(stories[selectedStoryIndex].category) as any}
                      size={15}
                      color="#FFFFFF"
                    />
                  </View>
                  <View>
                    <Text style={styles.authorName}>
                      {stories[selectedStoryIndex].authorName}
                    </Text>
                    <Text style={styles.storyTimeAgo}>
                      {getCategoryLabel(stories[selectedStoryIndex].category)} • Active Notice
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => setSelectedStoryIndex(null)}
                  style={styles.closeStoryBtn}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Ionicons name="close" size={26} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {/* Story Body Card */}
              <View style={styles.storyCardBody}>
                <View style={styles.storyCategoryBadge}>
                  <Ionicons
                    name={getCategoryIcon(stories[selectedStoryIndex].category) as any}
                    size={14}
                    color="#FFFFFF"
                  />
                  <Text style={styles.storyCategoryBadgeText}>
                    {getCategoryLabel(stories[selectedStoryIndex].category)}
                  </Text>
                </View>

                <Text style={styles.storyMainTitle}>
                  {stories[selectedStoryIndex].title}
                </Text>

                <View style={styles.storyCaptionBox}>
                  <Text style={styles.storyCaptionText}>
                    {stories[selectedStoryIndex].caption}
                  </Text>
                </View>

                {/* Viewers & Timestamp */}
                <View style={styles.storyMetaRow}>
                  <TouchableOpacity
                    style={styles.viewersPill}
                    onPress={handleOpenViewers}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="eye" size={13} color="#FFFFFF" />
                    <Text style={styles.viewersPillText}>
                      {stories[selectedStoryIndex].viewCount || 1} Views
                    </Text>
                    <Ionicons name="chevron-forward" size={11} color="rgba(255,255,255,0.7)" style={{ marginLeft: 2 }} />
                  </TouchableOpacity>
                  <Text style={styles.storyDateText}>
                    Posted: {new Date(stories[selectedStoryIndex].createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>

              {/* Story Navigation Tap Zones (Left: Previous, Right: Next) */}
              <View style={styles.tapZoneContainer} pointerEvents="box-none">
                <TouchableOpacity
                  style={styles.tapZoneLeft}
                  onPress={() => {
                    if (selectedStoryIndex > 0) {
                      setSelectedStoryIndex(selectedStoryIndex - 1);
                    }
                  }}
                />
                <TouchableOpacity
                  style={styles.tapZoneRight}
                  onPress={() => {
                    if (selectedStoryIndex < stories.length - 1) {
                      setSelectedStoryIndex(selectedStoryIndex + 1);
                    } else {
                      setSelectedStoryIndex(null);
                    }
                  }}
                />
              </View>

              {/* Footer Actions */}
              <View style={styles.storyFooter}>
                <TouchableOpacity
                  style={styles.storyReplyBtn}
                  onPress={() => {
                    setSelectedStoryIndex(null);
                    if (navigation) {
                      navigation.navigate('ChatScreen', {
                        initialMessage: `Inquiry regarding Story: "${stories[selectedStoryIndex].title}"`,
                      });
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="chatbubbles" size={16} color="#102B63" />
                  <Text style={styles.storyReplyBtnText}>Message Support Desk</Text>
                </TouchableOpacity>

                {isAdmin && (
                  <TouchableOpacity
                    style={styles.deleteStoryBtn}
                    onPress={() => handleDeleteStory(stories[selectedStoryIndex].id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="trash-outline" size={20} color="#FECACA" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* 3.1. Realtime Viewed Members List Modal */}
      <Modal
        visible={isViewersModalOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsViewersModalOpen(false)}
      >
        <View style={styles.viewersModalOverlay}>
          <View style={styles.viewersModalCard}>
            <View style={styles.viewersModalHeader}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.viewersModalTitle}>Story Viewers</Text>
                  <View style={styles.viewersCountBadge}>
                    <Text style={styles.viewersCountText}>{viewersList.length}</Text>
                  </View>
                </View>
                <Text style={styles.viewersModalSub}>
                  Members and staff who viewed this announcement in real-time
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsViewersModalOpen(false)}
                style={styles.closeViewersBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color="#0F172A" />
              </TouchableOpacity>
            </View>

            {/* Search Input for Viewers */}
            <View style={styles.viewerSearchWrap}>
              <Ionicons name="search" size={16} color="#94A3B8" />
              <TextInput
                style={styles.viewerSearchInput}
                placeholder="Search viewed members by name or mobile..."
                placeholderTextColor="#94A3B8"
                value={viewerSearch}
                onChangeText={setViewerSearch}
              />
              {viewerSearch.length > 0 && (
                <TouchableOpacity onPress={() => setViewerSearch('')} style={{ padding: 4 }}>
                  <Ionicons name="close-circle" size={16} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            {/* Viewers List */}
            {viewersLoading ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#2563EB" />
                <Text style={{ marginTop: 8, fontSize: 12, color: '#64748B' }}>Loading real-time viewers...</Text>
              </View>
            ) : (
              <ScrollView style={styles.viewersScrollView} showsVerticalScrollIndicator={false}>
                {viewersList
                  .filter((v) => {
                    if (!viewerSearch.trim()) return true;
                    const q = viewerSearch.toLowerCase().trim();
                    return (
                      (v.viewerName && v.viewerName.toLowerCase().includes(q)) ||
                      (v.viewerPhone && v.viewerPhone.includes(q)) ||
                      (v.viewerRole && v.viewerRole.toLowerCase().includes(q))
                    );
                  })
                  .map((v, i) => {
                    const initial = (v.viewerName || 'M').charAt(0).toUpperCase();
                    const isStaffOrAdmin = v.viewerRole === 'ADMIN' || v.viewerRole === 'STAFF';
                    return (
                      <View key={`${v.viewerId}-${i}`} style={styles.viewerItemRow}>
                        <View style={[styles.viewerAvatar, { backgroundColor: isStaffOrAdmin ? '#DBEAFE' : '#FEF3C7' }]}>
                          <Text style={[styles.viewerAvatarText, { color: isStaffOrAdmin ? '#1E40AF' : '#92400E' }]}>
                            {initial}
                          </Text>
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={styles.viewerNameText} numberOfLines={1}>{v.viewerName}</Text>
                            <View style={[styles.viewerRoleTag, { backgroundColor: isStaffOrAdmin ? '#EFF6FF' : '#F0FDF4' }]}>
                              <Text style={[styles.viewerRoleText, { color: isStaffOrAdmin ? '#2563EB' : '#16A34A' }]}>
                                {v.viewerRole || 'CUSTOMER'}
                              </Text>
                            </View>
                          </View>
                          {v.viewerPhone ? (
                            <Text style={styles.viewerPhoneText}>📞 {v.viewerPhone}</Text>
                          ) : null}
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.viewerTimeText}>
                            {new Date(v.viewedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                          <Text style={styles.viewerDateText}>
                            {new Date(v.viewedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </Text>
                        </View>
                      </View>
                    );
                  })}

                {viewersList.length === 0 && (
                  <View style={styles.emptyViewersBox}>
                    <Ionicons name="eye-outline" size={32} color="#CBD5E1" />
                    <Text style={styles.emptyViewersTitle}>No Members Viewed Yet</Text>
                    <Text style={styles.emptyViewersSub}>
                      Subscribers and staff who open this story announcement will be recorded here in real-time.
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* 4. Admin Post Jenista Chits Story Modal */}
      <Modal
        visible={isAddModalOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsAddModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Post Jenista Chits Story</Text>
                <Text style={styles.modalSubtitle}>
                  Publish announcements, auction results, or notices viewable by all members.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsAddModalOpen(false)}
                style={{ padding: 4 }}
              >
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>STORY CATEGORY</Text>
              <View style={styles.categoryPillsRow}>
                {(
                  [
                    'AUCTION_RESULT',
                    'NEW_SCHEME',
                    'DIVIDEND',
                    'NOTICE',
                  ] as ChitStory['category'][]
                ).map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryPill,
                      newCategory === cat && styles.categoryPillActive,
                    ]}
                    onPress={() => setNewCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.categoryPillText,
                        newCategory === cat && styles.categoryPillTextActive,
                      ]}
                    >
                      {cat.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.inputLabel, { marginTop: 12 }]}>STORY TITLE *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. JJ F 2 T Auction Results"
                placeholderTextColor="#94A3B8"
                value={newTitle}
                onChangeText={setNewTitle}
              />

              <Text style={[styles.inputLabel, { marginTop: 12 }]}>ANNOUNCEMENT CAPTION *</Text>
              <TextInput
                style={[styles.textInput, { height: 90, textAlignVertical: 'top' }]}
                placeholder="Enter details, prize amount, dividend value, or instructions for subscribers..."
                placeholderTextColor="#94A3B8"
                value={newCaption}
                onChangeText={setNewCaption}
                multiline
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsAddModalOpen(false)}
                disabled={isPublishing}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.publishBtn, isPublishing && { opacity: 0.6 }]}
                onPress={handleCreateStory}
                disabled={isPublishing}
              >
                {isPublishing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.publishBtnText}>Publish Story</Text>
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
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingVertical: 10,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  storyBubbleItem: {
    alignItems: 'center',
    width: 72,
  },
  addStoryRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#D7A928',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addStoryInnerCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FEF9E7',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  addBadgePill: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  gradientRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  storyAvatarBubble: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyBubbleLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#334155',
    marginTop: 4,
    textAlign: 'center',
  },

  // Full-Screen Story Viewer Modal
  storyViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyViewerCard: {
    width: Math.min(SCREEN_WIDTH * 0.94, 420),
    height: Math.min(SCREEN_HEIGHT * 0.88, 680),
    borderRadius: 24,
    padding: 20,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 4,
    paddingBottom: 12,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  storyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  authorBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  storyTimeAgo: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    marginTop: 1,
  },
  closeStoryBtn: {
    padding: 4,
  },

  // Story Body
  storyCardBody: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 20,
    zIndex: 1,
  },
  storyCategoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  storyCategoryBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  storyMainTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 30,
    marginBottom: 14,
  },
  storyCaptionBox: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  storyCaptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    lineHeight: 22,
  },
  storyMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  viewersPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  viewersPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  storyDateText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },

  // Tap zones
  tapZoneContainer: {
    position: 'absolute',
    top: 60,
    bottom: 80,
    left: 0,
    right: 0,
    flexDirection: 'row',
  },
  tapZoneLeft: {
    width: '40%',
    height: '100%',
  },
  tapZoneRight: {
    width: '60%',
    height: '100%',
  },

  // Story Footer
  storyFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 2,
  },
  storyReplyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  storyReplyBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#102B63',
  },
  deleteStoryBtn: {
    padding: 10,
    backgroundColor: 'rgba(220, 38, 38, 0.3)',
    borderRadius: 12,
  },

  // Post Story Modal
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
    padding: 20,
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
    paddingBottom: 12,
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
    marginTop: 2,
    lineHeight: 16,
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
  categoryPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  categoryPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryPillActive: {
    backgroundColor: '#102B63',
    borderColor: '#102B63',
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  categoryPillTextActive: {
    color: '#FFFFFF',
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
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
  publishBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#102B63',
  },
  publishBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Realtime Viewers Modal Styles
  viewersModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'flex-end',
  },
  viewersModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '75%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 20,
  },
  viewersModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  viewersModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  viewersCountBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  viewersCountText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563EB',
  },
  viewersModalSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeViewersBtn: {
    padding: 4,
    marginLeft: 8,
  },
  viewerSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginVertical: 14,
  },
  viewerSearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
  },
  viewersScrollView: {
    maxHeight: 340,
  },
  viewerItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  viewerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerAvatarText: {
    fontSize: 15,
    fontWeight: '800',
  },
  viewerNameText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  viewerRoleTag: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  viewerRoleText: {
    fontSize: 9,
    fontWeight: '800',
  },
  viewerPhoneText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  viewerTimeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  viewerDateText: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 1,
  },
  emptyViewersBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyViewersTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#334155',
    marginTop: 12,
  },
  emptyViewersSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 17,
  },
});

export const JenistaStoriesTray = InstagramStoriesTray;

