import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Send, 
  X, 
  Headphones, 
  ShieldCheck 
} from 'lucide-react';
import { fetchClient } from '../../api/client';
import { useAuth } from '../../store/AuthContext';

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

const QUICK_INQUIRIES = [
  'When is my next installment due date?',
  'Please verify and confirm my recent payment receipt.',
  'What is my accrued dividend for this chit cycle?',
  'I would like to claim my auction prize money.',
  'How do I enroll in another chit scheme?',
];

export const CustomerChatWidget: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const customerId = user?.id || (user as any)?._id || 'customer-me';
  const customerName = user?.name || 'Valued Subscriber';
  const customerPhone = user?.phone || (user as any)?.mobile || '';
  const conversationId = customerId;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetchClient(`/chat/messages/${encodeURIComponent(conversationId)}`);
      if (res && Array.isArray(res.data)) {
        setMessages(res.data);
        if (!isOpen) {
          const unread = res.data.filter(
            (m: Message) => (m.senderRole === 'ADMIN' || m.senderRole === 'STAFF') && m.status !== 'READ'
          ).length;
          setUnreadCount(unread);
        } else {
          setUnreadCount(0);
        }
      }
    } catch {
      // Local fallback
      try {
        const local = JSON.parse(localStorage.getItem(`chat_messages_${conversationId}`) || '[]');
        if (Array.isArray(local) && local.length > 0) {
          setMessages(local);
        }
      } catch {}
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, [conversationId]);

  // Poll for replies every 3.5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadMessages(true);
    }, 3500);
    return () => clearInterval(interval);
  }, [conversationId, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      scrollToBottom();
      fetchClient(`/chat/messages/${encodeURIComponent(conversationId)}/read`, {
        method: 'PATCH',
      }).catch(() => {});
    }
  }, [isOpen, messages.length]);

  const handleSendMessage = async (customText?: string) => {
    const text = (customText || inputText).trim();
    if (!text || sending) return;

    setSending(true);

    const newMsg: Message = {
      conversationId,
      customerId,
      customerName,
      customerPhone,
      senderId: customerId,
      senderName: customerName,
      senderRole: 'CUSTOMER',
      text,
      createdAt: new Date().toISOString(),
      status: 'SENT',
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputText('');

    try {
      await fetchClient('/chat/messages', {
        method: 'POST',
        body: JSON.stringify(newMsg),
      });
      loadMessages(true);
    } catch {
      try {
        const key = `chat_messages_${conversationId}`;
        const local = JSON.parse(localStorage.getItem(key) || '[]');
        local.push(newMsg);
        localStorage.setItem(key, JSON.stringify(local));
      } catch {}
    } finally {
      setSending(false);
      setTimeout(scrollToBottom, 50);
    }
  };

  return (
    <>
      {/* Floating Chat Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-[#102B63] via-[#1E3A8A] to-[#102B63] hover:from-[#0B1E48] hover:to-[#17306D] text-white px-4 py-3.5 rounded-2xl shadow-xl shadow-blue-950/25 border-2 border-amber-400/30 flex items-center gap-3 transition-all transform hover:scale-105 active:scale-95 group"
          aria-label="Open Customer Support Chat"
        >
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 flex items-center justify-center text-amber-300">
              <MessageSquare className="w-5 h-5 group-hover:rotate-6 transition-transform" />
            </div>
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-xs font-bold leading-tight flex items-center gap-1.5">
              <span>Chat with Support</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </p>
            <p className="text-[11px] text-blue-200">Staff & Admin Online</p>
          </div>
        </button>
      )}

      {/* Floating Chat Window Modal / Drawer */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-32px)] h-[540px] max-h-[calc(100vh-100px)] bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="bg-[#102B63] text-white px-5 py-4 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-900 font-black flex items-center justify-center text-xs shadow-xs">
                JC
              </div>
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <span>Jenista Support Desk</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </h3>
                <p className="text-[11px] text-blue-200">Direct line to Staff & Administrators</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-blue-200 hover:text-white rounded-lg hover:bg-white/10 transition"
                title="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Notice Banner */}
          <div className="bg-amber-50/80 border-b border-amber-200/60 px-4 py-2 flex items-center gap-2 text-[11px] text-amber-900 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Official verified portal for chit inquiries & receipt confirmation.</span>
          </div>

          {/* Message Thread Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400">Loading messages...</div>
            ) : messages.length === 0 ? (
              <div className="py-10 text-center">
                <div className="w-12 h-12 mx-auto rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
                  <Headphones className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-slate-800">Welcome to Subscriber Support!</p>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto mt-1">
                  How can our team help you today? Type a question below or choose a quick prompt.
                </p>
              </div>
            ) : (
              messages.map((m, idx) => {
                const isMe = m.senderRole === 'CUSTOMER';
                return (
                  <div
                    key={m._id || m.id || idx}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1 mb-0.5 px-1">
                      <span className="text-[10px] font-bold text-slate-500">
                        {isMe ? 'You' : m.senderName || 'Support Executive'}
                      </span>
                      {!isMe && (
                        <span className="text-[9px] px-1 py-0.2 bg-blue-100 text-blue-800 rounded font-bold">
                          {m.senderRole}
                        </span>
                      )}
                      <span className="text-[9px] text-slate-400">
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div
                      className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                        isMe
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

          {/* Quick Inquiry Chips */}
          <div className="px-3 py-2 bg-white border-t border-slate-100 overflow-x-auto flex gap-1.5 shrink-0">
            {QUICK_INQUIRIES.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(q)}
                className="shrink-0 text-[10px] font-semibold text-slate-600 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 px-2.5 py-1 rounded-full border border-slate-200 transition"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Footer */}
          <div className="p-3 bg-white border-t border-slate-200">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="Ask about dues, receipts, chits..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#102B63] focus:bg-white"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || sending}
                className="w-9 h-9 bg-[#102B63] hover:bg-[#1E3A8A] disabled:opacity-50 text-white rounded-xl flex items-center justify-center transition shadow-xs"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

