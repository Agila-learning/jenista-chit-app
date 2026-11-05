import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Send, 
  Search, 
  User, 
  Phone, 
  Clock, 
  CheckCheck, 
  Sparkles, 
  RefreshCw, 
  PhoneCall, 
  MessageCircle,
  Plus,
  ShieldCheck,
  ChevronRight,
  Filter
} from 'lucide-react';
import { fetchClient } from '../../api/client';
import { useAuth } from '../../store/AuthContext';
import { formatDate } from '../../utils/format';

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

interface Message {
  _id?: string;
  id?: string;
  conversationId: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  senderId: string;
  senderName: string;
  senderRole: 'CUSTOMER' | 'ADMIN' | 'STAFF' | 'SYSTEM';
  text: string;
  createdAt: string;
  status?: string;
}

const QUICK_REPLIES = [
  'Your payment has been received and verified successfully. Receipt has been issued.',
  'Please share your 12-digit bank UTR reference number so we can confirm the credit.',
  'Your monthly installment due date is the 15th. Kindly complete the payment to avoid late fees.',
  'Your chit dividend has been adjusted against this month\'s installment.',
  'Our customer executive is reviewing your request and will contact you shortly.',
];

export const SupportChat: React.FC = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingConv, setLoadingConv] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const [customersList, setCustomersList] = useState<any[]>([]);
  const [showNewChatModal, setShowNewChatModal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load conversations from backend
  const loadConversations = async (silent = false) => {
    if (!silent) setLoadingConv(true);
    try {
      const res = await fetchClient('/chat/conversations');
      if (res && res.data) {
        setConversations(res.data);
        if (!selectedConv && res.data.length > 0) {
          setSelectedConv(res.data[0]);
        }
      }
    } catch {
      // Fallback from localStorage customers
      try {
        const stored = JSON.parse(localStorage.getItem('mockCustomers') || '[]');
        if (stored.length > 0) {
          const fallbackList: Conversation[] = stored.slice(0, 10).map((c: any) => ({
            conversationId: c.id,
            customerId: c.id,
            customerName: c.name,
            customerPhone: c.phone || c.mobile || '',
            lastMessage: 'Tap to start live customer support chat...',
            lastMessageAt: new Date().toISOString(),
            lastSenderRole: 'SYSTEM',
            unreadCount: 0,
          }));
          setConversations(fallbackList);
          if (!selectedConv && fallbackList.length > 0) {
            setSelectedConv(fallbackList[0]);
          }
        }
      } catch {}
    } finally {
      if (!silent) setLoadingConv(false);
    }
  };

  // Load registered customers for "New Chat" modal
  const loadCustomers = async () => {
    try {
      const res = await fetchClient('/customers');
      if (res && res.data) {
        setCustomersList(res.data);
        return;
      }
    } catch {}
    try {
      const stored = JSON.parse(localStorage.getItem('mockCustomers') || '[]');
      setCustomersList(stored);
    } catch {}
  };

  // Load messages for the active conversation
  const loadMessages = async (convId: string, silent = false) => {
    if (!silent) setLoadingMsgs(true);
    try {
      const res = await fetchClient(`/chat/messages/${encodeURIComponent(convId)}`);
      if (res && res.data) {
        setMessages(res.data);
      }
    } catch {
      // Fallback: check localStorage
      try {
        const local = JSON.parse(localStorage.getItem(`chat_messages_${convId}`) || '[]');
        setMessages(local);
      } catch {}
    } finally {
      if (!silent) setLoadingMsgs(false);
    }
  };

  useEffect(() => {
    loadConversations();
    loadCustomers();
  }, []);

  // Poll for new messages every 3.5s
  useEffect(() => {
    const interval = setInterval(() => {
      loadConversations(true);
      if (selectedConv) {
        loadMessages(selectedConv.conversationId, true);
      }
    }, 3500);
    return () => clearInterval(interval);
  }, [selectedConv]);

  // When selected conversation changes, load messages immediately
  useEffect(() => {
    if (selectedConv) {
      loadMessages(selectedConv.conversationId);
      // Mark read
      fetchClient(`/chat/messages/${encodeURIComponent(selectedConv.conversationId)}/read`, {
        method: 'PATCH',
      }).catch(() => {});
    }
  }, [selectedConv?.conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !selectedConv || sending) return;

    setSending(true);
    const optimisticMsg: Message = {
      conversationId: selectedConv.conversationId,
      customerId: selectedConv.customerId,
      customerName: selectedConv.customerName,
      customerPhone: selectedConv.customerPhone,
      senderId: user?.id || 'admin',
      senderName: user?.name || (user?.role === 'STAFF' ? 'Collection Staff' : 'System Admin'),
      senderRole: (user?.role === 'STAFF' ? 'STAFF' : 'ADMIN'),
      text,
      createdAt: new Date().toISOString(),
      status: 'SENT',
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setInputText('');

    try {
      await fetchClient('/chat/messages', {
        method: 'POST',
        body: JSON.stringify(optimisticMsg),
      });
      loadConversations(true);
    } catch {
      // Fallback write to localStorage
      try {
        const key = `chat_messages_${selectedConv.conversationId}`;
        const local = JSON.parse(localStorage.getItem(key) || '[]');
        local.push(optimisticMsg);
        localStorage.setItem(key, JSON.stringify(local));
      } catch {}
    } finally {
      setSending(false);
      setTimeout(scrollToBottom, 100);
    }
  };

  const handleStartNewChat = (c: any) => {
    const newConv: Conversation = {
      conversationId: c.id,
      customerId: c.id,
      customerName: c.name,
      customerPhone: c.phone || c.mobile || '',
      lastMessage: 'Conversation opened',
      lastMessageAt: new Date().toISOString(),
      lastSenderRole: 'ADMIN',
      unreadCount: 0,
    };
    setSelectedConv(newConv);
    setConversations((prev) => [newConv, ...prev.filter((x) => x.conversationId !== c.id)]);
    setShowNewChatModal(false);
  };

  const filteredConversations = conversations.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.customerName.toLowerCase().includes(q) ||
      (c.customerPhone && c.customerPhone.includes(q)) ||
      c.lastMessage.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-slate-50 border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Top Bar Banner */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#102B63] to-[#1E3A8A] flex items-center justify-center text-amber-400 shadow-sm">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              Subscriber Support & Chat
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200">
                Live Sync
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              Direct two-way messaging between customers and staff/administrators
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadConversations()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            title="Refresh conversations"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button
            onClick={() => setShowNewChatModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#102B63] hover:bg-[#1E3A8A] rounded-xl shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Start Customer Chat
          </button>
        </div>
      </div>

      {/* Main Chat Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar: Conversations List */}
        <div className="w-80 md:w-96 border-r border-slate-200 bg-white flex flex-col">
          {/* Search Box */}
          <div className="p-3.5 border-b border-slate-200">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search member by name, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#102B63] focus:border-transparent"
              />
            </div>
          </div>

          {/* Conversations Scrollable List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loadingConv ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading customer chats...</div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-700">No conversations found</p>
                <p className="text-xs text-slate-400 mt-1">
                  Start a new chat with any registered member
                </p>
              </div>
            ) : (
              filteredConversations.map((c) => {
                const isSelected = selectedConv?.conversationId === c.conversationId;
                const initial = (c.customerName || 'C')[0].toUpperCase();
                return (
                  <button
                    key={c.conversationId}
                    onClick={() => setSelectedConv(c)}
                    className={`w-full text-left p-3.5 transition flex items-start gap-3 hover:bg-slate-50 ${
                      isSelected ? 'bg-amber-50/70 border-l-4 border-[#102B63]' : ''
                    }`}
                  >
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                        {initial}
                      </div>
                      {c.unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white">
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {c.customerName}
                        </p>
                        <span className="text-[10px] text-slate-400">
                          {formatDate(c.lastMessageAt || new Date())}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {c.customerPhone ? `📞 ${c.customerPhone}` : 'Member'}
                      </p>
                      <p className="text-xs text-slate-600 truncate mt-1">
                        {c.lastSenderRole === 'ADMIN' || c.lastSenderRole === 'STAFF' ? (
                          <span className="text-blue-600 font-semibold">You: </span>
                        ) : null}
                        {c.lastMessage}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane: Active Message Thread */}
        {selectedConv ? (
          <div className="flex-1 flex flex-col bg-slate-50">
            {/* Thread Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#102B63] text-amber-300 flex items-center justify-center font-bold text-sm shadow-xs">
                  {(selectedConv.customerName || 'C')[0].toUpperCase()}
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    {selectedConv.customerName}
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                      ID: {selectedConv.customerId.slice(-6).toUpperCase()}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500">
                    {selectedConv.customerPhone || 'Verified Subscriber'}
                  </p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2">
                {selectedConv.customerPhone && (
                  <>
                    <a
                      href={`tel:${selectedConv.customerPhone}`}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      Call
                    </a>
                    <a
                      href={`https://wa.me/91${selectedConv.customerPhone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      WhatsApp
                    </a>
                  </>
                )}
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {loadingMsgs ? (
                <div className="text-center py-12 text-xs text-slate-400">Loading chat history...</div>
              ) : messages.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-12 h-12 mx-auto rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-2">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-800">Support Conversation Started</p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                    Send an installment reminder, answer a chit question, or confirm receipt issuance.
                  </p>
                </div>
              ) : (
                messages.map((m, idx) => {
                  const isStaffOrAdmin = m.senderRole === 'ADMIN' || m.senderRole === 'STAFF';
                  return (
                    <div
                      key={m._id || m.id || idx}
                      className={`flex flex-col ${isStaffOrAdmin ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <span className="text-[10px] font-bold text-slate-500">
                          {isStaffOrAdmin ? m.senderName || 'Executive' : m.customerName || 'Subscriber'}
                        </span>
                        {isStaffOrAdmin && (
                          <span className="text-[9px] px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded font-semibold">
                            {m.senderRole}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400">
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div
                        className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-xs shadow-xs leading-relaxed ${
                          isStaffOrAdmin
                            ? 'bg-gradient-to-r from-[#102B63] to-[#1E3A8A] text-white rounded-tr-xs'
                            : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs'
                        }`}
                      >
                        {m.text}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Reply Template Chips */}
            <div className="px-6 py-2 bg-white border-t border-slate-200/60 overflow-x-auto flex gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center self-center shrink-0 mr-1">
                <Sparkles className="w-3 h-3 mr-1 text-amber-500" /> Quick Replies:
              </span>
              {QUICK_REPLIES.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(q)}
                  className="shrink-0 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 px-3 py-1 rounded-full border border-slate-200 transition"
                >
                  {q.slice(0, 42)}...
                </button>
              ))}
            </div>

            {/* Message Input Box */}
            <div className="p-4 bg-white border-t border-slate-200">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-3"
              >
                <input
                  type="text"
                  placeholder="Type a support reply to member... (Press Enter to send)"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="flex-1 px-4 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#102B63] focus:bg-white transition"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || sending}
                  className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-[#102B63] hover:bg-[#1E3A8A] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-sm transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  Send
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 bg-slate-50">
            <MessageSquare className="w-12 h-12 text-slate-300 mb-3" />
            <h3 className="text-sm font-bold text-slate-700">Select a Conversation</h3>
            <p className="text-xs text-slate-400 max-w-sm mt-1">
              Choose a subscriber conversation from the left pane or click "Start Customer Chat" above.
            </p>
          </div>
        )}
      </div>

      {/* New Customer Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh]">
            <div className="px-6 py-4 bg-[#102B63] text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">Start New Customer Chat</h3>
                <p className="text-xs text-blue-200">Select an enrolled or registered subscriber</p>
              </div>
              <button
                onClick={() => setShowNewChatModal(false)}
                className="text-white/80 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100">
              {customersList.map((c) => (
                <div
                  key={c.id || c._id}
                  onClick={() => handleStartNewChat(c)}
                  className="p-3 hover:bg-blue-50 rounded-xl cursor-pointer flex items-center justify-between transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs">
                      {(c.name || 'C')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{c.name}</p>
                      <p className="text-[11px] text-slate-500">{c.phone || c.mobile || 'No Phone'}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
