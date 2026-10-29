/**
 * Universal Notifications, Announcements & Leads Data Manager
 * Handles system alerts, customer broadcast announcements, and landing page leads.
 */

export interface SystemNotification {
  id: string;
  type: 'PAYMENT_PENDING' | 'PAYMENT_APPROVED' | 'PAYMENT_RECEIVED' | 'PRIZE_CLAIM' | 'PRIZE_DISBURSED' | 'NEW_REGISTRATION' | 'NEW_LEAD' | 'ANNOUNCEMENT' | 'SYSTEM' | 'OVERDUE_ALERT';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  targetRole?: 'ADMIN' | 'STAFF' | 'CUSTOMER' | 'ALL';
  targetUserId?: string; // e.g. customer ID
  metadata?: {
    customerId?: string;
    customerName?: string;
    groupId?: string;
    groupName?: string;
    amount?: number;
    referenceNo?: string;
    receiptNo?: string;
    leadId?: string;
    scheme?: string;
    month?: number;
    ticketNumber?: string;
    postInstallment?: number;
    txnId?: string;
    oldAmount?: number;
    newAmount?: number;
    mode?: string;
    [key: string]: any;
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
  metadata?: {
    winnerName?: string;
    winnerId?: string;
    groupId?: string;
    chitValue?: number;
    prizeAmount?: number;
    discountPercent?: number;
    monthNumber?: number;
  };
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

const DEFAULT_NOTIFICATIONS: SystemNotification[] = [
  {
    id: 'NOTIF-101',
    type: 'PAYMENT_APPROVED',
    title: 'Payment Receipt Verified',
    message: 'Your monthly installment of ₹5,000 for Gold Auction Series A has been verified and approved.',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    isRead: false,
    targetRole: 'CUSTOMER',
    targetUserId: 'TC-11075',
    metadata: {
      customerId: 'TC-11075',
      customerName: 'Karthik Subramanian',
      groupId: 'CG-AUC-501',
      amount: 5000,
      receiptNo: 'REC-90812'
    }
  },
  {
    id: 'NOTIF-102',
    type: 'ANNOUNCEMENT',
    title: '🏆 Prize Winner Announced',
    message: 'Member S. Murugan won the October Auction Prize of ₹4,25,000 for CG-AUC-501 (15% bid discount).',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    isRead: false,
    targetRole: 'ALL'
  }
];

const DEFAULT_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ANN-001',
    title: '🏆 Monthly Auction Winner Declared - Group CG-AUC-501',
    category: 'PRIZE_WINNER',
    content: 'Congratulations to S. Murugan (Ticket #05) for successfully securing the October prize bid for Group CG-AUC-501. The winning dividend discount of ₹75,000 has been credited equally across all active group members.',
    publishedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    author: 'Jenista Chit Administration',
    targetRole: 'ALL',
    pinned: true,
    metadata: {
      winnerName: 'S. Murugan',
      winnerId: 'TC-10045',
      groupId: 'CG-AUC-501',
      chitValue: 500000,
      prizeAmount: 425000,
      discountPercent: 15,
      monthNumber: 8
    }
  },
  {
    id: 'ANN-002',
    title: '📢 Diwali Special Chit Enrollment Rewards',
    category: 'FESTIVAL_OFFER',
    content: 'Special festival incentive: Enroll in any 25-Month Fixed or Auction Chit this month and receive zero documentation processing fee plus guaranteed priority dividend bonuses on first draw.',
    publishedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    author: 'Branch Management Desk',
    targetRole: 'CUSTOMERS',
    pinned: false
  }
];

// --- Notifications Operations ---

export const getStoredNotifications = (): SystemNotification[] => {
  try {
    const raw = localStorage.getItem('systemNotifications');
    if (!raw) {
      localStorage.setItem('systemNotifications', JSON.stringify(DEFAULT_NOTIFICATIONS));
      return DEFAULT_NOTIFICATIONS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_NOTIFICATIONS;
  }
};

export const getNotificationsForUser = (userId?: string, role?: string): SystemNotification[] => {
  const all = getStoredNotifications();
  const cleanId = String(userId || '').toLowerCase();
  const userRole = (role || 'CUSTOMER').toUpperCase();

  return all.filter(n => {
    if (userRole === 'ADMIN' || userRole === 'STAFF') {
      return n.targetRole === 'ADMIN' || n.targetRole === 'STAFF' || n.targetRole === 'ALL';
    }
    // Customer
    if (n.targetRole === 'ALL' || n.targetRole === 'CUSTOMER') {
      if (!n.targetUserId) return true;
      return String(n.targetUserId).toLowerCase() === cleanId;
    }
    return false;
  });
};

export const addSystemNotification = (notif: Omit<SystemNotification, 'id' | 'timestamp' | 'isRead'>): SystemNotification => {
  const current = getStoredNotifications();
  const newNotif: SystemNotification = {
    ...notif,
    id: `NOTIF-${Date.now().toString().slice(-6)}`,
    timestamp: new Date().toISOString(),
    isRead: false
  };

  const updated = [newNotif, ...current];
  localStorage.setItem('systemNotifications', JSON.stringify(updated));
  window.dispatchEvent(new Event('storage'));
  window.dispatchEvent(new CustomEvent('notificationSync', { detail: newNotif }));
  return newNotif;
};

export const markNotificationAsRead = (id: string): void => {
  const current = getStoredNotifications();
  const updated = current.map(n => n.id === id ? { ...n, isRead: true } : n);
  localStorage.setItem('systemNotifications', JSON.stringify(updated));
  window.dispatchEvent(new Event('storage'));
  window.dispatchEvent(new CustomEvent('notificationSync', { detail: { id, isRead: true } }));
};

export const markAllNotificationsAsRead = (userId?: string, role?: string): void => {
  const current = getStoredNotifications();
  const cleanId = String(userId || '').toLowerCase();
  const userRole = (role || 'CUSTOMER').toUpperCase();

  const updated = current.map(n => {
    let shouldMark = false;
    if (userRole === 'ADMIN' || userRole === 'STAFF') {
      shouldMark = n.targetRole === 'ADMIN' || n.targetRole === 'STAFF' || n.targetRole === 'ALL';
    } else {
      if (n.targetRole === 'ALL' || n.targetRole === 'CUSTOMER') {
        shouldMark = !n.targetUserId || String(n.targetUserId).toLowerCase() === cleanId;
      }
    }
    return shouldMark ? { ...n, isRead: true } : n;
  });

  localStorage.setItem('systemNotifications', JSON.stringify(updated));
  window.dispatchEvent(new Event('storage'));
  window.dispatchEvent(new CustomEvent('notificationSync', { detail: { markAll: true } }));
};

/**
 * Synchronizes pending prize disbursement requests and overdue installment alerts
 * for Admin and Staff. Clears notifications automatically when dues are settled.
 */
export const syncOverdueAndDisbursementAlerts = (): void => {
  try {
    let notifications = getStoredNotifications();
    let hasChanged = false;

    // 1. Sync Pending Prize Disbursement Requests
    const wRaw = localStorage.getItem('withdrawalRequests');
    if (wRaw) {
      const wRequests: any[] = JSON.parse(wRaw);
      const pendingClaims = wRequests.filter((w: any) => w.status === 'PENDING_ADMIN_DISBURSAL');
      
      pendingClaims.forEach((w: any) => {
        const notifId = `NOTIF-CLAIM-${w.id}`;
        const existing = notifications.find(n => n.id === notifId || (n.type === 'PRIZE_CLAIM' && n.metadata?.leadId === w.id));
        if (!existing) {
          notifications.unshift({
            id: notifId,
            type: 'PRIZE_CLAIM',
            title: `🏆 Prize Disbursement Requested: ${w.customerName || 'Customer'}`,
            message: `${w.customerName || 'Member'} (${w.customerId || ''}) requested prize payout of ₹${Number(w.eligibleAmount || 0).toLocaleString('en-IN')} for Group ${w.groupName || w.groupId} via ${w.payoutMethod || 'Bank Transfer'}. Approval required.`,
            timestamp: w.requestedAt || new Date().toISOString(),
            isRead: false,
            targetRole: 'ALL',
            metadata: {
              customerId: w.customerId,
              customerName: w.customerName,
              groupId: w.groupId,
              amount: Number(w.eligibleAmount || 0),
              leadId: w.id
            }
          });
          hasChanged = true;
        }
      });

      const nonPendingIds = new Set(wRequests.filter((w: any) => w.status !== 'PENDING_ADMIN_DISBURSAL').map((w: any) => w.id));
      notifications = notifications.map(n => {
        if (n.type === 'PRIZE_CLAIM' && n.metadata?.leadId && nonPendingIds.has(n.metadata.leadId) && !n.isRead) {
          hasChanged = true;
          return { ...n, isRead: true };
        }
        return n;
      });
    }

    // 2. Sync Pending Overdue Installments
    const cRaw = localStorage.getItem('mockCustomers');
    if (cRaw) {
      const customers: any[] = JSON.parse(cRaw);
      const overdueCustomers = customers.filter((c: any) => Number(c.pending) > 0 && c.status !== 'REJECTED');
      const clearedCustomerIds = new Set(customers.filter((c: any) => !c.pending || Number(c.pending) <= 0).map((c: any) => c.id));

      overdueCustomers.forEach((c: any) => {
        const notifId = `NOTIF-OVERDUE-${c.id}`;
        const existingIdx = notifications.findIndex(n => n.id === notifId);
        const amount = Number(c.pending || 0);

        if (existingIdx === -1) {
          notifications.unshift({
            id: notifId,
            type: 'OVERDUE_ALERT',
            title: `⚠️ Pending Overdue Alert: ${c.name || 'Member'}`,
            message: `Member ${c.name || 'Customer'} (${c.id || c.customerCode || ''}) has overdue installment balance of ₹${amount.toLocaleString('en-IN')}. Follow-up required until dues are cleared.`,
            timestamp: new Date().toISOString(),
            isRead: false,
            targetRole: 'ALL',
            metadata: {
              customerId: c.id,
              customerName: c.name,
              amount: amount
            }
          });
          hasChanged = true;
        } else if (notifications[existingIdx].isRead || notifications[existingIdx].metadata?.amount !== amount) {
          notifications[existingIdx] = {
            ...notifications[existingIdx],
            isRead: false,
            message: `Member ${c.name || 'Customer'} (${c.id || c.customerCode || ''}) has overdue installment balance of ₹${amount.toLocaleString('en-IN')}. Follow-up required until dues are cleared.`,
            metadata: {
              ...notifications[existingIdx].metadata,
              amount: amount
            }
          };
          hasChanged = true;
        }
      });

      notifications = notifications.filter(n => {
        if (n.type === 'OVERDUE_ALERT' && n.metadata?.customerId && clearedCustomerIds.has(n.metadata.customerId)) {
          hasChanged = true;
          return false;
        }
        return true;
      });
    }

    if (hasChanged) {
      localStorage.setItem('systemNotifications', JSON.stringify(notifications));
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('notificationSync', { detail: { syncAlerts: true } }));
    }
  } catch (err) {
    console.warn('Could not sync overdue and disbursement alerts:', err);
  }
};


// --- Announcements Operations ---

export const getStoredAnnouncements = (): Announcement[] => {
  try {
    const raw = localStorage.getItem('companyAnnouncements');
    if (!raw) {
      localStorage.setItem('companyAnnouncements', JSON.stringify(DEFAULT_ANNOUNCEMENTS));
      return DEFAULT_ANNOUNCEMENTS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_ANNOUNCEMENTS;
  }
};

export const addAnnouncement = (ann: Omit<Announcement, 'id' | 'publishedAt'>): Announcement => {
  const current = getStoredAnnouncements();
  const newAnn: Announcement = {
    ...ann,
    id: `ANN-${Date.now().toString().slice(-6)}`,
    publishedAt: new Date().toISOString()
  };

  const updated = [newAnn, ...current];
  localStorage.setItem('companyAnnouncements', JSON.stringify(updated));

  // Also create a system notification broadcast
  addSystemNotification({
    type: 'ANNOUNCEMENT',
    title: newAnn.title,
    message: newAnn.content.slice(0, 160) + (newAnn.content.length > 160 ? '...' : ''),
    targetRole: newAnn.targetRole === 'CUSTOMERS' ? 'CUSTOMER' : 'ALL',
    metadata: {
      groupId: newAnn.metadata?.groupId,
      amount: newAnn.metadata?.prizeAmount,
      customerName: newAnn.metadata?.winnerName
    }
  });

  window.dispatchEvent(new Event('storage'));
  return newAnn;
};

// --- Website Leads Operations ---

export const getStoredLeads = (): WebsiteLead[] => {
  try {
    const raw = localStorage.getItem('websiteLeads');
    if (!raw) {
      const sampleLeads: WebsiteLead[] = [
        {
          id: 'LEAD-901',
          fullName: 'S. Rajagopalan',
          firstName: 'Rajagopalan',
          lastName: 'S',
          phone: '9840192837',
          email: 'raja.gopalan@gmail.com',
          message: 'Interested in joining a 5 Lakh Auction Chit Plan starting next month. Please share brochure.',
          interestedPlan: 'Auction 5L Gold Series',
          submittedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
          status: 'NEW'
        },
        {
          id: 'LEAD-902',
          fullName: 'Meenakshi Sundaram',
          firstName: 'Meenakshi',
          lastName: 'Sundaram',
          phone: '9789012345',
          email: 'meenakshi.s@outlook.com',
          message: 'Inquiring about Fixed Term savings plan for daughter education.',
          interestedPlan: 'Fixed 2L Series B',
          submittedAt: new Date(Date.now() - 86400000).toISOString(),
          status: 'NEW'
        }
      ];
      localStorage.setItem('websiteLeads', JSON.stringify(sampleLeads));
      return sampleLeads;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

export const saveWebsiteLead = (lead: Omit<WebsiteLead, 'id' | 'submittedAt' | 'status'>): WebsiteLead => {
  const current = getStoredLeads();
  const newLead: WebsiteLead = {
    ...lead,
    id: `LEAD-${Date.now().toString().slice(-5)}`,
    submittedAt: new Date().toISOString(),
    status: 'NEW'
  };

  const updated = [newLead, ...current];
  localStorage.setItem('websiteLeads', JSON.stringify(updated));

  // Notify Admin & Staff
  addSystemNotification({
    type: 'NEW_LEAD',
    title: 'New Website Enquiry Received',
    message: `${newLead.fullName} (${newLead.phone}) submitted an enquiry for ${newLead.interestedPlan || 'chit enrollment'}.`,
    targetRole: 'ADMIN',
    metadata: {
      leadId: newLead.id,
      customerName: newLead.fullName
    }
  });

  window.dispatchEvent(new Event('storage'));
  return newLead;
};

export const updateLeadStatus = (leadId: string, status: 'CONVERTED' | 'REJECTED', convertedCustomerId?: string): WebsiteLead[] => {
  const current = getStoredLeads();
  const updated = current.map(l => l.id === leadId ? {
    ...l,
    status,
    convertedCustomerId: convertedCustomerId || l.convertedCustomerId
  } : l);
  localStorage.setItem('websiteLeads', JSON.stringify(updated));
  window.dispatchEvent(new Event('storage'));
  return updated;
};

export const onNotificationSync = (callback: () => void) => {
  const handler = () => callback();
  window.addEventListener('storage', handler);
  window.addEventListener('notificationSync', handler);
  return () => {
    window.removeEventListener('storage', handler);
    window.removeEventListener('notificationSync', handler);
  };
};
