import { Platform, Vibration } from 'react-native';
import { secureStorage } from './storage';
import { getActiveBaseUrl } from './dataSync';
import { isCustomerOrLeadDeleted, cascadeDeleteLeadMobile } from './cascadeDeleteMobile';

export interface SystemNotification {
  id: string;
  type: 'PAYMENT_PENDING' | 'PAYMENT_APPROVED' | 'PRIZE_CLAIM' | 'PRIZE_DISBURSED' | 'NEW_REGISTRATION' | 'NEW_LEAD' | 'ANNOUNCEMENT' | 'SYSTEM';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  targetRole?: 'ADMIN' | 'STAFF' | 'CUSTOMER' | 'ALL';
  targetUserId?: string;
  metadata?: {
    customerId?: string;
    customerName?: string;
    groupId?: string;
    amount?: number;
    referenceNo?: string;
    receiptNo?: string;
    leadId?: string;
    scheme?: string;
  };
}

export interface Announcement {
  id: string;
  title: string;
  category: 'PRIZE_WINNER' | 'AUCTION_RESULT' | 'GENERAL' | 'FESTIVAL_OFFER';
  content: string;
  publishedAt: string;
  author: string;
  targetRole: 'ALL' | 'CUSTOMERS' | 'STAFF';
  pinned?: boolean;
  priority?: 'NORMAL' | 'HIGH' | 'URGENT';
}

export interface WebsiteLead {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  message?: string;
  interestedPlan?: string;
  submittedAt: string;
  status: 'NEW' | 'CONVERTED' | 'REJECTED';
  convertedCustomerId?: string;
  notes?: string;
}

// Notification listeners for real-time synchronization across UI screens
type NotificationListener = () => void;
const notificationListeners = new Set<NotificationListener>();

export const subscribeToNotifications = (cb: NotificationListener): (() => void) => {
  notificationListeners.add(cb);
  return () => {
    notificationListeners.delete(cb);
  };
};

export const notifyNotificationSubscribers = (): void => {
  notificationListeners.forEach((cb) => {
    try {
      cb();
    } catch {}
  });
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.dispatchEvent) {
    try {
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('jenista_notification_update'));
    } catch {}
  }
};

/**
 * Plays an audible notification chime (Web Audio API on Web, Haptic on Mobile)
 */
export const playNotificationChime = (): void => {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const now = ctx.currentTime;

        // Note 1 (D5 ~ 587.33 Hz)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(587.33, now);
        gain1.gain.setValueAtTime(0.18, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.3);

        // Note 2 (A5 ~ 880.00 Hz)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880.0, now + 0.1);
        gain2.gain.setValueAtTime(0.22, now + 0.1);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.1);
        osc2.stop(now + 0.55);
      }
    } else {
      Vibration.vibrate([0, 150, 80, 160]);
    }
  } catch (err) {
    console.warn('Notification chime error:', err);
  }
};

const DEFAULT_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ANN-001',
    title: 'Diwali Festival 1% Dividend Bonus 2026',
    category: 'FESTIVAL_OFFER',
    content: 'All active chit subscribers paying their October/November installments before the 10th will receive a 1% additional festive dividend credit.',
    publishedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    author: 'Jenista Admin Desk',
    targetRole: 'ALL',
    pinned: true,
    priority: 'HIGH'
  },
  {
    id: 'ANN-002',
    title: 'New ₹25 Lakh High-Value Chit Group Launching',
    category: 'GENERAL',
    content: 'Registration is now open for our new 50-month business growth chit group (HV-50M-25L). Contact your branch manager for enrollment.',
    publishedAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    author: 'Chief Foreman',
    targetRole: 'ALL',
    pinned: false,
    priority: 'NORMAL'
  },
  {
    id: 'ANN-003',
    title: 'Monthly Auction Draw Schedule Announced',
    category: 'AUCTION_RESULT',
    content: 'Monthly auctions for all active groups will be conducted at 11:00 AM on the 10th of this month at Head Office and broadcast live.',
    publishedAt: new Date(Date.now() - 3600000 * 72).toISOString(),
    author: 'Auction Supervisory Board',
    targetRole: 'ALL',
    pinned: false,
    priority: 'NORMAL'
  }
];

const DEFAULT_NOTIFICATIONS: SystemNotification[] = [
  {
    id: 'NOTIF-INIT-1',
    type: 'ANNOUNCEMENT',
    title: 'Diwali Festival Dividend Bonus 2026',
    message: 'Special 1% festive dividend credit for all active subscribers paying on or before the 10th.',
    timestamp: new Date().toISOString(),
    isRead: false,
    targetRole: 'ALL'
  },
  {
    id: 'NOTIF-INIT-2',
    type: 'PAYMENT_APPROVED',
    title: 'Welcome to Jenista Chit Funds',
    message: 'Your chit account is active and verified under the Chit Funds Act, 1982.',
    timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
    isRead: false,
    targetRole: 'ALL'
  }
];

export const MobileNotificationsManager = {
  async getNotifications(): Promise<SystemNotification[]> {
    try {
      const raw = await secureStorage.getItem('mobile_system_notifications');
      if (raw) {
        return JSON.parse(raw);
      }
      await secureStorage.setItem('mobile_system_notifications', JSON.stringify(DEFAULT_NOTIFICATIONS));
      return DEFAULT_NOTIFICATIONS;
    } catch {
      return DEFAULT_NOTIFICATIONS;
    }
  },

  async getNotificationsForUser(userId?: string, role?: string): Promise<SystemNotification[]> {
    const all = await this.getNotifications();
    return all.filter(n => {
      if (n.targetRole === 'ALL') return true;
      if (role && n.targetRole === role) return true;
      if (userId && (n.targetUserId === userId || n.metadata?.customerId === userId)) return true;
      return false;
    });
  },

  async getUnreadCount(userId?: string, role?: string): Promise<number> {
    const list = await this.getNotificationsForUser(userId, role);
    return list.filter(n => !n.isRead).length;
  },

  async addNotification(notif: Omit<SystemNotification, 'id' | 'timestamp' | 'isRead'>): Promise<SystemNotification> {
    const current = await this.getNotifications();
    const newNotif: SystemNotification = {
      ...notif,
      id: `NOTIF-${Date.now().toString().slice(-6)}`,
      timestamp: new Date().toISOString(),
      isRead: false
    };
    const updated = [newNotif, ...current];
    await secureStorage.setItem('mobile_system_notifications', JSON.stringify(updated));

    // Real-time sound chime and subscriber update
    playNotificationChime();
    notifyNotificationSubscribers();
    return newNotif;
  },

  async addLiveNotification(notif: Omit<SystemNotification, 'id' | 'timestamp' | 'isRead'>): Promise<SystemNotification> {
    return this.addNotification(notif);
  },

  async markAsRead(id: string): Promise<void> {
    const current = await this.getNotifications();
    const updated = current.map(n => n.id === id ? { ...n, isRead: true } : n);
    await secureStorage.setItem('mobile_system_notifications', JSON.stringify(updated));
    notifyNotificationSubscribers();
  },

  async markAllAsRead(userId?: string, role?: string): Promise<void> {
    const current = await this.getNotifications();
    const updated = current.map(n => {
      const isTarget = 
        n.targetRole === 'ALL' ||
        (role && n.targetRole === role) ||
        (userId && (n.targetUserId === userId || n.metadata?.customerId === userId));
      return isTarget ? { ...n, isRead: true } : n;
    });
    await secureStorage.setItem('mobile_system_notifications', JSON.stringify(updated));
    notifyNotificationSubscribers();
  },

  // Announcements
  async getAnnouncements(): Promise<Announcement[]> {
    try {
      const raw = await secureStorage.getItem('mobile_announcements');
      if (raw) {
        return JSON.parse(raw);
      }
      await secureStorage.setItem('mobile_announcements', JSON.stringify(DEFAULT_ANNOUNCEMENTS));
      return DEFAULT_ANNOUNCEMENTS;
    } catch {
      return DEFAULT_ANNOUNCEMENTS;
    }
  },

  async addAnnouncement(ann: Omit<Announcement, 'id' | 'publishedAt'>): Promise<Announcement> {
    const current = await this.getAnnouncements();
    const newAnn: Announcement = {
      ...ann,
      id: `ANN-${Date.now().toString().slice(-6)}`,
      publishedAt: new Date().toISOString()
    };
    const updated = [newAnn, ...current];
    await secureStorage.setItem('mobile_announcements', JSON.stringify(updated));
    
    // Also dispatch notification to everyone
    await this.addNotification({
      type: 'ANNOUNCEMENT',
      title: newAnn.title,
      message: newAnn.content,
      targetRole: 'ALL'
    });

    return newAnn;
  },

  // Website Leads CRM
  async getLeads(): Promise<WebsiteLead[]> {
    try {
      const raw = await secureStorage.getItem('mobile_website_leads');
      if (!raw) {
        return [];
      }
      const parsed: WebsiteLead[] = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];

      // Filter out dummy leads and any blacklisted/deleted leads
      const cleanLeads: WebsiteLead[] = [];
      for (const lead of parsed) {
        if (lead.id === 'LEAD-101' || lead.id === 'LEAD-102') continue;
        const deleted = await isCustomerOrLeadDeleted(lead.id, lead.phone, lead.fullName);
        if (!deleted) {
          cleanLeads.push(lead);
        }
      }

      if (cleanLeads.length !== parsed.length) {
        await secureStorage.setItem('mobile_website_leads', JSON.stringify(cleanLeads));
      }
      return cleanLeads;
    } catch {
      return [];
    }
  },

  async addLead(lead: {
    fullName: string;
    phone: string;
    email?: string;
    interestedPlan?: string;
    message?: string;
  }): Promise<WebsiteLead> {
    const current = await this.getLeads();
    const parts = (lead.fullName || '').trim().split(' ');
    const firstName = parts[0] || 'Lead';
    const lastName = parts.slice(1).join(' ') || '';

    const newLead: WebsiteLead = {
      id: `LEAD-${Date.now().toString().slice(-4)}`,
      fullName: lead.fullName.trim(),
      firstName,
      lastName,
      phone: lead.phone.trim(),
      email: lead.email?.trim() || '',
      interestedPlan: lead.interestedPlan?.trim() || 'Auction Chit Plan',
      message: lead.message?.trim() || 'Manual enquiry registered via Mobile App',
      submittedAt: new Date().toISOString(),
      status: 'NEW',
    };

    const updated = [newLead, ...current];
    await secureStorage.setItem('mobile_website_leads', JSON.stringify(updated));
    await secureStorage.setItem('website_leads', JSON.stringify(updated));
    await secureStorage.setItem('websiteLeads', JSON.stringify(updated));

    // Live Notification with audio chime
    await this.addNotification({
      type: 'NEW_LEAD',
      title: 'New Lead Recorded',
      message: `${newLead.fullName} (${newLead.phone}) interested in ${newLead.interestedPlan}.`,
      targetRole: 'ADMIN',
      metadata: {
        leadId: newLead.id,
      },
    });

    return newLead;
  },

  async deleteLead(id: string): Promise<void> {
    const current = await this.getLeads();
    const target = current.find(l => l.id === id);
    const updated = current.filter(l => l.id !== id);
    await secureStorage.setItem('mobile_website_leads', JSON.stringify(updated));
    await secureStorage.setItem('website_leads', JSON.stringify(updated));
    await secureStorage.setItem('websiteLeads', JSON.stringify(updated));

    if (target) {
      await cascadeDeleteLeadMobile({
        id: target.id,
        phone: target.phone,
        name: target.fullName,
        convertedCustomerId: target.convertedCustomerId
      });
    } else {
      await cascadeDeleteLeadMobile({ id });
    }
    notifyNotificationSubscribers();
  },

  async updateLeadStatus(id: string, status: 'CONVERTED' | 'REJECTED', convertedCustomerId?: string): Promise<WebsiteLead[]> {
    const current = await this.getLeads();
    const updated = current.map(l => l.id === id ? { ...l, status, convertedCustomerId } : l);
    await secureStorage.setItem('mobile_website_leads', JSON.stringify(updated));
    await secureStorage.setItem('website_leads', JSON.stringify(updated));
    await secureStorage.setItem('websiteLeads', JSON.stringify(updated));
    notifyNotificationSubscribers();
    return updated;
  }
};
