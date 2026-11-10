import { secureStorage } from './storage';
import { getActiveBaseUrl } from './dataSync';
import { Platform } from 'react-native';

export interface ChitStory {
  id: string;
  title: string;
  caption: string;
  category: 'AUCTION_RESULT' | 'NEW_SCHEME' | 'DIVIDEND' | 'NOTICE' | 'CELEBRATION';
  imageUrl?: string;
  authorRole: 'ADMIN' | 'SUPER_ADMIN';
  authorName: string;
  createdAt: string;
  expiresAt: string;
  viewCount: number;
  viewedBy?: string[];
  gradient: string[];
}

const DEFAULT_STORIES: ChitStory[] = [
  {
    id: 'STORY-001',
    title: 'JJ F 2 T Auction Results',
    caption: 'November Auction successfully conducted! Winning prized payout ₹1,82,500 disbursed to member ticket #14 with ₹425 dividend per subscriber.',
    category: 'AUCTION_RESULT',
    authorRole: 'ADMIN',
    authorName: 'Admin Foreman',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    expiresAt: new Date(Date.now() + 3600000 * 22).toISOString(),
    viewCount: 42,
    gradient: ['#7952D6', '#2563EB'],
  },
  {
    id: 'STORY-002',
    title: 'New Fixed Plan Launch',
    caption: 'Registration is now open for ₹5 Lakh Fixed Scheme (25 Months). Guaranteed milestone payouts starting month 2!',
    category: 'NEW_SCHEME',
    authorRole: 'ADMIN',
    authorName: 'Jenista Chit Funds',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    expiresAt: new Date(Date.now() + 3600000 * 19).toISOString(),
    viewCount: 68,
    gradient: ['#D7A928', '#102B63'],
  },
  {
    id: 'STORY-003',
    title: 'Festival Dividend Credit',
    caption: 'Special 1% festive bonus dividend credited to all subscribers who cleared their monthly installments before the 10th.',
    category: 'DIVIDEND',
    authorRole: 'ADMIN',
    authorName: 'Accounts Desk',
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    expiresAt: new Date(Date.now() + 3600000 * 16).toISOString(),
    viewCount: 95,
    gradient: ['#18A875', '#059669'],
  },
  {
    id: 'STORY-004',
    title: 'Important Due Date Reminder',
    caption: 'Installment due date is the 15th of every month. Pay via UPI, NetBanking or Field Executive to avoid late fee penalties.',
    category: 'NOTICE',
    authorRole: 'ADMIN',
    authorName: 'Jenista Official',
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    expiresAt: new Date(Date.now() + 3600000 * 12).toISOString(),
    viewCount: 114,
    gradient: ['#DC2626', '#EA580C'],
  },
];

type StoryListener = () => void;
const storyListeners = new Set<StoryListener>();

export const subscribeToStories = (cb: StoryListener): (() => void) => {
  storyListeners.add(cb);
  return () => {
    storyListeners.delete(cb);
  };
};

const notifyStorySubscribers = () => {
  storyListeners.forEach((cb) => {
    try {
      cb();
    } catch {}
  });
};

export const StoriesManager = {
  /**
   * Get all active stories (from backend or local storage)
   */
  async getStories(): Promise<ChitStory[]> {
    try {
      const baseUrl = await getActiveBaseUrl();
      const res = await fetch(`${baseUrl}/stories`);
      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.data) && json.data.length > 0) {
          await secureStorage.setItem('chit_stories', JSON.stringify(json.data));
          return json.data;
        }
      }
    } catch {}

    try {
      const cached = await secureStorage.getItem('chit_stories');
      if (cached) {
        const parsed: ChitStory[] = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
      await secureStorage.setItem('chit_stories', JSON.stringify(DEFAULT_STORIES));
      return DEFAULT_STORIES;
    } catch {
      return DEFAULT_STORIES;
    }
  },

  /**
   * Publish a new story (by Admin)
   */
  async addStory(story: {
    title: string;
    caption: string;
    category?: ChitStory['category'];
    imageUrl?: string;
    authorName?: string;
  }): Promise<ChitStory> {
    const current = await this.getStories();
    const gradients = [
      ['#7952D6', '#2563EB'],
      ['#D7A928', '#102B63'],
      ['#18A875', '#059669'],
      ['#EA580C', '#E11D48'],
      ['#0284C7', '#0F172A'],
    ];
    const pickedGradient = gradients[Math.floor(Math.random() * gradients.length)];

    const newStory: ChitStory = {
      id: `STORY-${Date.now().toString().slice(-6)}`,
      title: story.title.trim(),
      caption: story.caption.trim(),
      category: story.category || 'NOTICE',
      imageUrl: story.imageUrl,
      authorRole: 'ADMIN',
      authorName: story.authorName || 'Super Admin',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000 * 24).toISOString(), // 24 hours
      viewCount: 1,
      viewedBy: [],
      gradient: pickedGradient,
    };

    const updated = [newStory, ...current.filter((s) => s.id !== newStory.id)];
    await secureStorage.setItem('chit_stories', JSON.stringify(updated));

    // Sync to backend if endpoint available
    try {
      const baseUrl = await getActiveBaseUrl();
      await fetch(`${baseUrl}/stories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStory),
      });
    } catch {}

    notifyStorySubscribers();
    return newStory;
  },

  /**
   * Mark a story as viewed by the current user
   */
  async markStoryViewed(storyId: string, userId?: string): Promise<void> {
    const current = await this.getStories();
    let updated = false;

    const newList = current.map((s) => {
      if (s.id === storyId) {
        const viewers = new Set(s.viewedBy || []);
        if (userId && !viewers.has(userId)) {
          viewers.add(userId);
          updated = true;
          return {
            ...s,
            viewCount: s.viewCount + 1,
            viewedBy: Array.from(viewers),
          };
        }
      }
      return s;
    });

    if (updated) {
      await secureStorage.setItem('chit_stories', JSON.stringify(newList));
      notifyStorySubscribers();
    }
  },

  /**
   * Delete a story
   */
  async deleteStory(storyId: string): Promise<void> {
    const current = await this.getStories();
    const filtered = current.filter((s) => s.id !== storyId);
    await secureStorage.setItem('chit_stories', JSON.stringify(filtered));

    try {
      const baseUrl = await getActiveBaseUrl();
      await fetch(`${baseUrl}/stories/${storyId}`, { method: 'DELETE' });
    } catch {}

    notifyStorySubscribers();
  },
};
