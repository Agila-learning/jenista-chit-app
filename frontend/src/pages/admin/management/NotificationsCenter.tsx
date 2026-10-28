import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  CreditCard, 
  UserCheck, 
  Award, 
  Sparkles, 
  Clock, 
  Check, 
  Plus, 
  Megaphone, 
  Trash2, 
  X, 
  Search,
  CheckCircle2
} from 'lucide-react';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { 
  getStoredNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  getStoredAnnouncements, 
  addAnnouncement, 
  onNotificationSync,
  type SystemNotification,
  type Announcement
} from '../../../utils/notificationsData';
import { formatDate } from '../../../utils/format';
import { useNavigate } from 'react-router-dom';

export const NotificationsCenter: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [activeTab, setActiveTab] = useState<'NOTIFICATIONS' | 'ANNOUNCEMENTS'>('NOTIFICATIONS');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // New Announcement Form State
  const [annTitle, setAnnTitle] = useState('');
  const [annCategory, setAnnCategory] = useState<'PRIZE_WINNER' | 'AUCTION_RESULT' | 'GENERAL' | 'FESTIVAL_OFFER'>('PRIZE_WINNER');
  const [annContent, setAnnContent] = useState('');
  const [annTarget, setAnnTarget] = useState<'ALL' | 'CUSTOMERS' | 'STAFF'>('ALL');
  const [winnerName, setWinnerName] = useState('');
  const [winnerGroup, setWinnerGroup] = useState('');
  const [winnerAmount, setWinnerAmount] = useState('');

  const loadData = () => {
    setNotifications(getStoredNotifications());
    setAnnouncements(getStoredAnnouncements());
  };

  useEffect(() => {
    loadData();
    const unsub = onNotificationSync(loadData);
    return () => unsub();
  }, []);

  const handleMarkAllRead = () => {
    markAllNotificationsAsRead(undefined, 'ADMIN');
    loadData();
    setSuccessToast('All notifications marked as read.');
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleCreateAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annContent.trim()) return;

    addAnnouncement({
      title: annTitle.trim(),
      category: annCategory,
      content: annContent.trim(),
      author: 'Jenista Chit Administration',
      targetRole: annTarget,
      pinned: annCategory === 'PRIZE_WINNER',
      metadata: annCategory === 'PRIZE_WINNER' ? {
        winnerName: winnerName.trim() || undefined,
        groupId: winnerGroup.trim() || undefined,
        prizeAmount: Number(winnerAmount) || undefined
      } : undefined
    });

    setIsAnnouncementModalOpen(false);
    setAnnTitle('');
    setAnnContent('');
    setWinnerName('');
    setWinnerGroup('');
    setWinnerAmount('');
    loadData();

    setSuccessToast('Announcement broadcasted to members and saved successfully!');
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const handleDeleteAnnouncement = (id: string) => {
    const updated = announcements.filter(a => a.id !== id);
    localStorage.setItem('companyAnnouncements', JSON.stringify(updated));
    setAnnouncements(updated);
    setSuccessToast('Announcement removed.');
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // Filtered Notifications
  const filteredNotifications = notifications.filter(n => {
    if (filterType === 'PAYMENTS' && !n.type.includes('PAYMENT')) return false;
    if (filterType === 'PRIZES' && !n.type.includes('PRIZE')) return false;
    if (filterType === 'LEADS' && n.type !== 'NEW_LEAD') return false;
    if (filterType === 'REGISTRATIONS' && n.type !== 'NEW_REGISTRATION') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q);
    }
    return true;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold uppercase tracking-wider mb-2">
            <Bell className="w-3.5 h-3.5 text-amber-600" />
            Communication Hub
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Notifications & Announcements Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Real-time operational alerts, customer payments, prize claims, and subscriber announcements.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {unreadCount > 0 && (
            <Button 
              variant="secondary" 
              onClick={handleMarkAllRead}
              className="text-xs font-bold"
            >
              <Check className="w-4 h-4 mr-1.5 text-emerald-600" />
              Mark All as Read ({unreadCount})
            </Button>
          )}
          <Button 
            variant="primary" 
            onClick={() => setIsAnnouncementModalOpen(true)}
            className="text-xs font-bold"
          >
            <Megaphone className="w-4 h-4 mr-1.5" />
            Broadcast Announcement
          </Button>
        </div>
      </div>

      {/* Toast */}
      {successToast && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Main Container Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Navigation Tabs */}
        <div className="border-b border-slate-200 flex items-center justify-between px-6 pt-4 bg-slate-50/50">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('NOTIFICATIONS')}
              className={`pb-3.5 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'NOTIFICATIONS'
                  ? 'border-amber-600 text-amber-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Bell className="w-4 h-4" />
              <span>Operational Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('ANNOUNCEMENTS')}
              className={`pb-3.5 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'ANNOUNCEMENTS'
                  ? 'border-amber-600 text-amber-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Megaphone className="w-4 h-4" />
              <span>Published Announcements ({announcements.length})</span>
            </button>
          </div>
        </div>

        {/* TAB 1: OPERATIONAL NOTIFICATIONS */}
        {activeTab === 'NOTIFICATIONS' && (
          <div>
            {/* Filter Sub-bar */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter notifications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-medium"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                {(['ALL', 'PAYMENTS', 'PRIZES', 'LEADS', 'REGISTRATIONS'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      filterType === type
                        ? 'bg-amber-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {type === 'ALL' ? 'All Alerts' : type}
                  </button>
                ))}
              </div>
            </div>

            {/* Notifications List */}
            <div className="divide-y divide-slate-100">
              {filteredNotifications.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <Check className="w-10 h-10 mx-auto mb-2 text-emerald-500" />
                  <p className="font-bold text-slate-700 text-sm">No notifications found</p>
                  <p className="text-xs text-slate-500 mt-0.5">Operational payments, approvals, and leads will appear here.</p>
                </div>
              ) : (
                filteredNotifications.map(n => {
                  const isPayment = n.type.includes('PAYMENT');
                  const isPrize = n.type.includes('PRIZE');
                  const isLead = n.type === 'NEW_LEAD';
                  const isReg = n.type === 'NEW_REGISTRATION';

                  return (
                    <div 
                      key={n.id}
                      className={`p-4 sm:p-5 flex items-start justify-between gap-4 transition-colors ${
                        !n.isRead ? 'bg-amber-50/30 hover:bg-amber-50/50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        <div className={`p-2.5 rounded-2xl shrink-0 mt-0.5 ${
                          isPayment ? 'bg-emerald-100 text-emerald-800' :
                          isPrize ? 'bg-amber-100 text-amber-800' :
                          isLead ? 'bg-blue-100 text-blue-800' :
                          isReg ? 'bg-purple-100 text-purple-800' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {isPayment ? <CreditCard className="w-5 h-5" /> :
                           isPrize ? <Award className="w-5 h-5" /> :
                           isLead ? <Sparkles className="w-5 h-5" /> :
                           isReg ? <UserCheck className="w-5 h-5" /> :
                           <Bell className="w-5 h-5" />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-slate-900 text-sm">{n.title}</h4>
                            {!n.isRead && (
                              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                            )}
                            <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                              <Clock className="w-3 h-3" />
                              {n.timestamp ? formatDate(new Date(n.timestamp)) : 'Just now'}
                            </span>
                          </div>

                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                            {n.message}
                          </p>

                          {n.metadata && (
                            <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-500 font-semibold flex-wrap">
                              {n.metadata.customerName && (
                                <span className="text-slate-700">Member: {n.metadata.customerName}</span>
                              )}
                              {n.metadata.amount && (
                                <span className="text-emerald-700">Amount: ₹{Number(n.metadata.amount).toLocaleString('en-IN')}</span>
                              )}
                              {n.metadata.groupId && (
                                <span className="text-slate-600 font-mono">Chit: {n.metadata.groupId}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isPrize && (
                          <button
                            type="button"
                            onClick={() => {
                              if (n.metadata?.customerId) navigate(`/admin/customers/${n.metadata.customerId}`);
                              else navigate('/admin/ledger');
                            }}
                            className="px-2.5 py-1 text-xs font-bold bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-lg border border-amber-200"
                          >
                            View Record
                          </button>
                        )}
                        {isPayment && (
                          <button
                            type="button"
                            onClick={() => navigate('/admin/payments')}
                            className="px-2.5 py-1 text-xs font-bold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-lg border border-emerald-200"
                          >
                            Verify Payment
                          </button>
                        )}
                        {isLead && (
                          <button
                            type="button"
                            onClick={() => navigate('/admin/leads')}
                            className="px-2.5 py-1 text-xs font-bold bg-blue-50 text-blue-800 hover:bg-blue-100 rounded-lg border border-blue-200"
                          >
                            View Lead
                          </button>
                        )}
                        {isReg && (
                          <button
                            type="button"
                            onClick={() => navigate('/admin/customers/approvals')}
                            className="px-2.5 py-1 text-xs font-bold bg-purple-50 text-purple-800 hover:bg-purple-100 rounded-lg border border-purple-200"
                          >
                            Review Member
                          </button>
                        )}
                        {!n.isRead && (
                          <button
                            type="button"
                            onClick={() => {
                              markNotificationAsRead(n.id);
                              loadData();
                            }}
                            className="text-xs text-slate-400 hover:text-slate-600 p-1"
                            title="Mark as read"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 2: PUBLISHED ANNOUNCEMENTS */}
        {activeTab === 'ANNOUNCEMENTS' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <p className="text-xs text-slate-500 font-semibold">
                Announcements broadcasted here appear live on the Customer Portal and Staff Dashboards.
              </p>
              <button
                type="button"
                onClick={() => setIsAnnouncementModalOpen(true)}
                className="text-xs font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> New Announcement
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {announcements.length === 0 ? (
                <div className="col-span-2 py-12 text-center text-slate-400">
                  <Megaphone className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p className="font-bold text-slate-700 text-sm">No announcements broadcasted</p>
                  <p className="text-xs text-slate-500 mt-0.5">Click &apos;Broadcast Announcement&apos; to announce auction winners, festivals, or notices.</p>
                </div>
              ) : (
                announcements.map(a => (
                  <div key={a.id} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 relative group hover:border-amber-300 transition-all">
                    <div className="flex items-start justify-between gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        a.category === 'PRIZE_WINNER' ? 'bg-amber-100 text-amber-900 border border-amber-200' :
                        a.category === 'FESTIVAL_OFFER' ? 'bg-emerald-100 text-emerald-900 border border-emerald-200' :
                        'bg-blue-100 text-blue-900 border border-blue-200'
                      }`}>
                        {a.category.replace('_', ' ')}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleDeleteAnnouncement(a.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 transition-opacity p-1"
                        title="Delete announcement"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <h3 className="font-bold text-slate-900 text-sm mt-2">{a.title}</h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{a.content}</p>

                    {a.metadata && (
                      <div className="mt-3 p-3 rounded-xl bg-white border border-slate-200/80 text-xs space-y-1">
                        {a.metadata.winnerName && (
                          <p><strong className="text-slate-800">Prize Winner:</strong> {a.metadata.winnerName}</p>
                        )}
                        {a.metadata.groupId && (
                          <p><strong className="text-slate-800">Chit Group:</strong> {a.metadata.groupId}</p>
                        )}
                        {a.metadata.prizeAmount && (
                          <p><strong className="text-slate-800">Net Prize Payout:</strong> ₹{Number(a.metadata.prizeAmount).toLocaleString('en-IN')}</p>
                        )}
                      </div>
                    )}

                    <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Audience: <strong>{a.targetRole}</strong></span>
                      <span>{a.publishedAt ? formatDate(new Date(a.publishedAt)) : '—'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* CREATE ANNOUNCEMENT MODAL */}
      {isAnnouncementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base">Broadcast Member Announcement</h3>
              </div>
              <button 
                onClick={() => setIsAnnouncementModalOpen(false)}
                className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAnnouncement} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Announcement Category</label>
                <select
                  value={annCategory}
                  onChange={(e: any) => setAnnCategory(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-300 rounded-xl bg-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="PRIZE_WINNER">🏆 Prize Winner Declaration</option>
                  <option value="AUCTION_RESULT">📢 Auction Cycle Result</option>
                  <option value="FESTIVAL_OFFER">🎉 Festival Reward / Offer</option>
                  <option value="GENERAL">ℹ️ General Notice / Holiday Schedule</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Announcement Title *</label>
                <Input
                  placeholder="e.g. Winner Declared for Gold Auction Series A (CG-AUC-501)"
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  required
                />
              </div>

              {annCategory === 'PRIZE_WINNER' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-amber-50 rounded-2xl border border-amber-200">
                  <div>
                    <label className="block text-amber-900 font-bold mb-1 text-[11px]">Winner Name</label>
                    <input
                      type="text"
                      placeholder="e.g. S. Murugan"
                      value={winnerName}
                      onChange={(e) => setWinnerName(e.target.value)}
                      className="w-full h-8 px-2 bg-white border border-amber-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-amber-900 font-bold mb-1 text-[11px]">Chit Group</label>
                    <input
                      type="text"
                      placeholder="e.g. CG-AUC-501"
                      value={winnerGroup}
                      onChange={(e) => setWinnerGroup(e.target.value)}
                      className="w-full h-8 px-2 bg-white border border-amber-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-amber-900 font-bold mb-1 text-[11px]">Prize Payout (₹)</label>
                    <input
                      type="number"
                      placeholder="e.g. 425000"
                      value={winnerAmount}
                      onChange={(e) => setWinnerAmount(e.target.value)}
                      className="w-full h-8 px-2 bg-white border border-amber-300 rounded-lg text-xs"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-bold mb-1">Detailed Content *</label>
                <textarea
                  rows={4}
                  placeholder="Enter complete announcement details for subscribers..."
                  value={annContent}
                  onChange={(e) => setAnnContent(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-xl bg-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none font-medium text-slate-800"
                  required
                ></textarea>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Broadcast Target Audience</label>
                <select
                  value={annTarget}
                  onChange={(e: any) => setAnnTarget(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-300 rounded-xl bg-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="ALL">All Users (Customers & Staff)</option>
                  <option value="CUSTOMERS">Customers Only</option>
                  <option value="STAFF">Staff & Branch Agents Only</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={() => setIsAnnouncementModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Publish Announcement
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
