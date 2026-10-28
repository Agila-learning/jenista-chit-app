import { secureStorage } from './storage';
import { getActiveBaseUrl } from './dataSync';

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
    return newNotif;
  },

  async markAsRead(id: string): Promise<void> {
    const current = await this.getNotifications();
    const updated = current.map(n => n.id === id ? { ...n, isRead: true } : n);
    await secureStorage.setItem('mobile_system_notifications', JSON.stringify(updated));
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
      if (raw) {
        return JSON.parse(raw);
      }
      const initialLeads: WebsiteLead[] = [
        {
          id: 'LEAD-101',
          fullName: 'Priya Sharma',
          firstName: 'Priya',
          lastName: 'Sharma',
          phone: '9876543219',
          email: 'priya.sharma@example.com',
          interestedPlan: 'Fixed Chit Plan (5 Lakhs)',
          message: 'Interested in joining a 5 Lakh fixed chit plan for savings.',
          submittedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
          status: 'NEW'
        },
        {
          id: 'LEAD-102',
          fullName: 'Rajesh Kumar',
          firstName: 'Rajesh',
          lastName: 'Kumar',
          phone: '9840192834',
          email: 'rajesh.k@business.in',
          interestedPlan: 'Auction Chit Plan (10 Lakhs)',
          message: 'Need working capital chit with monthly auction option.',
          submittedAt: new Date(Date.now() - 3600000 * 18).toISOString(),
          status: 'NEW'
        }
      ];
      await secureStorage.setItem('mobile_website_leads', JSON.stringify(initialLeads));
      return initialLeads;
    } catch {
      return [];
    }
  },

  async updateLeadStatus(id: string, status: 'CONVERTED' | 'REJECTED', convertedCustomerId?: string): Promise<WebsiteLead[]> {
    const current = await this.getLeads();
    const updated = current.map(l => l.id === id ? { ...l, status, convertedCustomerId } : l);
    await secureStorage.setItem('mobile_website_leads', JSON.stringify(updated));
    return updated;
  }
};
