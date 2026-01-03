"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ChatWindow from "@/components/ChatWindow";
import ChatIdDisplay from "@/components/ChatIdDisplay";
import { useState, useEffect, useRef } from "react";
// Client-side cookie helpers
const setCookie = (name: string, value: string, options?: { maxAge?: number }) => {
  if (typeof document === 'undefined') return;
  let cookie = `${name}=${value}`;
  if (options?.maxAge) {
    const expires = new Date();
    expires.setTime(expires.getTime() + options.maxAge * 1000);
    cookie += `; expires=${expires.toUTCString()}`;
  }
  cookie += '; path=/';
  document.cookie = cookie;
};

const getCookie = (name: string): string | undefined => {
  if (typeof document === 'undefined') return undefined;
  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return undefined;
};

interface EmailItem {
  label: string;
  email: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'admin' | 'system';
  message: string;
  created_at: string;
}

interface ChatData {
  chat_id: string;
  status: string;
  type: string;
  created_at: string;
  last_message_at: string | null;
}

const emailColumns = [
  {
    title: "Email us",
    items: [
      { label: "General inquiries", email: "support@mintmove.com" },
      { label: "Affiliate program", email: "affiliate@mintmove.com" },
      { label: "Suspended orders", email: "compliance@mintmove.com" },
    ],
  },
  {
    title: "Legal & victims",
    items: [
      { label: "Law enforcement", email: "legal@mintmove.com" },
      { label: "Victim support", email: "help@mintmove.com" },
    ],
  },
  {
    title: "API & Media",
    items: [
      { label: "API support", email: "api@mintmove.com" },
      { label: "PR & marketing", email: "pr@mintmove.com" },
    ],
  },
];

function EmailCol({ title, items }: { title: string; items: EmailItem[] }) {
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  const copyToClipboard = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email);
      setCopiedEmail(email);
      setTimeout(() => setCopiedEmail(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-white">{title}</h3>
      {items.map((item) => (
        <div key={item.email}>
          <p className="text-sm text-neutral-500">{item.label}</p>
          <button
            onClick={() => copyToClipboard(item.email)}
            className="text-blue-400 hover:text-blue-300 hover:underline text-sm"
          >
            {item.email}
          </button>
          {copiedEmail === item.email && (
            <span className="ml-2 text-xs text-blue-400">Copied!</span>
          )}
        </div>
      ))}
    </div>
  );
}

function SupportCard({ 
  title, 
  desc, 
  btn, 
  onClick 
}: { 
  title: string; 
  desc: string; 
  btn: string;
  onClick?: () => void;
}) {
  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/5 p-6 space-y-4 hover:bg-white/[0.04] transition-colors">
      <h3 className="text-xl font-medium text-white">{title}</h3>
      <p className="text-neutral-400 text-sm">{desc}</p>
      <button 
        onClick={onClick}
        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
      >
        {btn}
      </button>
    </div>
  );
}

function PageHeader() {
  return (
    <div className="space-y-3">
      <h1 className="text-5xl font-semibold text-white">Support</h1>
      <p className="text-neutral-400">
        We are happy to help you sort out any issues 24 hours a day, 7 days a week.
      </p>
    </div>
  );
}

function EmailSupport() {
  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/5 p-8 grid md:grid-cols-3 gap-8">
      {emailColumns.map((col) => (
        <EmailCol key={col.title} title={col.title} items={col.items} />
      ))}
    </div>
  );
}

function QuickSupport({ onStartChat }: { onStartChat: () => void }) {
  return (
    <div className="grid md:grid-cols-3 gap-6">
      <SupportCard 
        title="Live chat" 
        desc="Start a chat with us now" 
        btn="Start chat"
        onClick={onStartChat}
      />
      <SupportCard 
        title="Telegram" 
        desc="Estimated reply time: 10 minutes" 
        btn="Message on Telegram"
      />
      <SupportCard 
        title="X (Twitter)" 
        desc="Estimated reply time: 24 hours" 
        btn="Send via X"
      />
    </div>
  );
}

function PreChatView({
  state,
  messages,
  onSendMessage,
  onClose
}: {
  state: PreChatState;
  messages: Array<{sender: 'user' | 'system', message: string}>;
  onSendMessage: (msg: string) => void;
  onClose: () => void;
}) {
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    const message = inputMessage.trim();
    if (!message || sending) return;

    setSending(true);
    try {
      await onSendMessage(message);
      setInputMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-12rem)] py-4 sm:py-8">
      <div className="max-w-[800px] w-full mx-auto px-4">
        <div className="rounded-xl sm:rounded-2xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-xl border border-amber-500/20 shadow-2xl overflow-hidden animate-fade-in-up">
          {/* Header */}
          <div className="bg-gradient-to-r from-white/[0.08] to-white/[0.04] border-b border-white/10 px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 flex items-center justify-center border border-white/10 shadow-lg flex-shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-semibold text-white truncate">MintMove Support</h2>
                    <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full bg-green-500/20 border border-green-500/30 flex-shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                      <span className="text-[10px] font-medium text-green-400 hidden xs:inline">Online</span>
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-xs text-neutral-400 mt-0.5 truncate">Starting chat...</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-neutral-400 hover:text-white flex-shrink-0"
                title="Close chat"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div className="h-[500px] sm:h-[600px] flex flex-col">
            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 min-h-0 custom-chat-scrollbar">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[300px] sm:min-h-[400px] text-center px-4">
                  <div className="mb-4 w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-white/10">
                    <svg className="w-7 h-7 sm:w-8 sm:h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <p className="text-base sm:text-lg font-medium text-white mb-2">
                    👋 Hi! Please start by saying &quot;Hi&quot;
                  </p>
                  <p className="text-xs sm:text-sm text-neutral-400 max-w-md">
                    We&apos;ll ask about your issue after you greet us.
                  </p>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isUser = msg.sender === 'user';
                  return (
                    <div
                      key={index}
                      className={`flex items-end gap-3 animate-fade-in ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isUser && (
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 flex items-center justify-center border border-white/10 flex-shrink-0 mb-1">
                          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                        </div>
                      )}
                      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[75%] sm:max-w-[70%]`}>
                        <div
                          className={`rounded-2xl px-3 py-2 sm:px-4 sm:py-2.5 shadow-lg transition-all duration-200 ${
                            isUser
                              ? 'bg-gradient-to-br from-blue-600 to-blue-500 text-white rounded-br-md'
                              : 'bg-white/[0.08] text-neutral-100 border border-white/10 backdrop-blur-sm rounded-bl-md'
                          }`}
                        >
                          <div className="text-sm sm:text-[15px] whitespace-pre-wrap break-words leading-relaxed">
                            {msg.message}
                          </div>
                        </div>
                      </div>
                      {isUser && (
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-amber-500/30 to-yellow-500/30 flex items-center justify-center border border-white/10 flex-shrink-0 mb-1">
                          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Input Area */}
            <div className="border-t border-white/10 bg-gradient-to-b from-transparent to-black/20 backdrop-blur-sm px-3 sm:px-4 py-3 sm:py-4">
              <div className="flex items-end gap-2">
                <div className="flex-1 relative">
                  <textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={state === 'waiting_for_hi' ? "Say 'Hi' to start..." : "Describe your issue..."}
                    className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 pr-10 sm:pr-12 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-neutral-100 placeholder:text-neutral-500 text-sm transition-all duration-200"
                    rows={1}
                    disabled={sending}
                    maxLength={5000}
                    style={{
                      minHeight: '44px',
                      maxHeight: '120px',
                    }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
                    }}
                  />
                </div>
                <button
                  onClick={handleSend}
                  disabled={!inputMessage.trim() || sending}
                  className="px-4 py-2.5 sm:px-5 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-xl disabled:from-white/5 disabled:to-white/5 disabled:text-neutral-500 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-lg hover:shadow-blue-500/20 disabled:shadow-none flex items-center justify-center min-w-[50px] sm:min-w-[60px]"
                >
                  {sending ? (
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LiveChatView({ 
  chatId, 
  onClose 
}: { 
  chatId: string; 
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatData, setChatData] = useState<ChatData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restoreChatId, setRestoreChatId] = useState('');
  const [showRestoreInput, setShowRestoreInput] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const loadChat = async (id: string) => {
    try {
      const response = await fetch(`/api/support/chat/${id}`);
      const data = await response.json();

      if (!data.success) {
        if (data.error === 'Chat not found') {
          setError('Chat not found. Please start a new chat.');
          return;
        }
        if (data.error === 'This chat has been closed by support') {
          setError('This chat has been closed by support.');
          return;
        }
        throw new Error(data.error || 'Failed to load chat');
      }

      setChatData(data.chat);
      setMessages(data.messages || []);
      setError(null);
    } catch (err: any) {
      console.error('Error loading chat:', err);
      setError(err.message || 'Failed to load chat');
    } finally {
      setLoading(false);
    }
  };

  const startPolling = (id: string) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    pollIntervalRef.current = setInterval(() => {
      loadChat(id);
    }, 3000); // Poll every 3 seconds
  };

  useEffect(() => {
    if (chatId) {
      loadChat(chatId);
      startPolling(chatId);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [chatId]);

  const handleSendMessage = async (message: string) => {
    try {
      const response = await fetch(`/api/support/chat/${chatId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to send message');
      }

      // Reload messages
      await loadChat(chatId);
    } catch (err: any) {
      throw new Error(err.message || 'Failed to send message');
    }
  };

  const handleRestoreChat = () => {
    if (restoreChatId.trim()) {
      const id = restoreChatId.trim();
      setCookie('support_chat_id', id, { maxAge: 60 * 60 * 24 * 365 });
      window.location.reload();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="max-w-[800px] w-full mx-auto px-4">
          <div className="rounded-2xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-xl border border-white/10 shadow-2xl p-8">
            <div className="text-center text-neutral-300 flex flex-col items-center gap-4">
              <svg className="w-8 h-8 animate-spin text-blue-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Loading chat...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && error.includes('closed by support')) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="max-w-[800px] w-full mx-auto px-4">
          <div className="rounded-2xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-xl border border-white/10 shadow-2xl p-8 space-y-6">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/20 border border-red-500/30 mb-2">
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div className="text-red-400 font-medium">{error}</div>
              <button
                onClick={onClose}
                className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-blue-500/20"
              >
                Start New Chat
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="max-w-[800px] w-full mx-auto px-4">
          <div className="rounded-2xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-xl border border-white/10 shadow-2xl p-8 space-y-6">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/20 border border-red-500/30 mb-2">
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="text-red-400 font-medium">{error}</div>
              <div className="space-y-3 pt-2">
                <button
                  onClick={() => setShowRestoreInput(!showRestoreInput)}
                  className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
                >
                  {showRestoreInput ? 'Hide' : 'Restore chat with Chat ID'}
                </button>
                {showRestoreInput && (
                  <div className="flex gap-2 max-w-md mx-auto">
                    <input
                      type="text"
                      value={restoreChatId}
                      onChange={(e) => setRestoreChatId(e.target.value)}
                      placeholder="Enter Chat ID"
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                    <button
                      onClick={handleRestoreChat}
                      className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200"
                    >
                      Restore
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isClosed = chatData?.status === 'closed' || chatData?.status === 'deleted';

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-12rem)] py-4 sm:py-8">
      <div className="max-w-[800px] w-full mx-auto px-4">
        {/* Floating Chat Card */}
        <div className="rounded-xl sm:rounded-2xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-xl border border-amber-500/20 shadow-2xl overflow-hidden animate-fade-in-up">
          {/* Header */}
          <div className="bg-gradient-to-r from-white/[0.08] to-white/[0.04] border-b border-white/10 px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                {/* Support Avatar */}
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 flex items-center justify-center border border-white/10 shadow-lg flex-shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-semibold text-white truncate">MintMove Support</h2>
                    <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full bg-green-500/20 border border-green-500/30 flex-shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                      <span className="text-[10px] font-medium text-green-400 hidden xs:inline">Online</span>
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-xs text-neutral-400 mt-0.5 truncate">Avg response: 2–5 mins</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-neutral-400 hover:text-white flex-shrink-0"
                title="Close chat"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Chat ID Banner */}
          <ChatIdDisplay chatId={chatId} />

          {/* Closed Chat Warning */}
          {isClosed && (
            <div className="mx-4 mt-4 bg-amber-900/20 border border-amber-500/30 rounded-lg p-3 text-amber-200 text-sm flex items-start gap-2">
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>This chat has been closed. You can start a new chat below.</span>
            </div>
          )}

          {/* Chat Window */}
          <div className="h-[500px] sm:h-[600px] flex flex-col">
            <ChatWindow
              chatId={chatId}
              messages={messages}
              onSendMessage={handleSendMessage}
              disabled={isClosed}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

type PreChatState = 'idle' | 'waiting_for_hi' | 'waiting_for_issue';

export default function SupportPage() {
  const [showChat, setShowChat] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [preChatState, setPreChatState] = useState<PreChatState>('idle');
  const [preChatMessages, setPreChatMessages] = useState<Array<{sender: 'user' | 'system', message: string}>>([]);

  useEffect(() => {
    // Check for existing chat cookie
    const existingChatId = getCookie('support_chat_id') as string | undefined;
    
    if (existingChatId) {
      // Validate chat exists and is open
      fetch(`/api/support/chat/${existingChatId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.chat.status !== 'deleted') {
            setChatId(existingChatId);
            setShowChat(true);
          }
        })
        .catch(err => console.error('Error checking chat:', err))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleStartChat = () => {
    setPreChatState('waiting_for_hi');
    setPreChatMessages([]);
  };

  const handlePreChatMessage = async (message: string) => {
    const trimmedMessage = message.trim().toLowerCase();
    
    if (preChatState === 'waiting_for_hi') {
      // Check if user sent "hi" or similar greeting
      const greetings = ['hi', 'hello', 'hey', 'hi there', 'hello there', 'hey there'];
      const isGreeting = greetings.some(g => trimmedMessage.includes(g));
      
      if (isGreeting) {
        setPreChatMessages([
          { sender: 'user', message: message.trim() },
          { sender: 'system', message: "Hello! How can we help you today? Please describe your issue." }
        ]);
        setPreChatState('waiting_for_issue');
      } else {
        setPreChatMessages([
          { sender: 'user', message: message.trim() },
          { sender: 'system', message: "Please start by saying 'Hi' to begin the chat." }
        ]);
      }
    } else if (preChatState === 'waiting_for_issue') {
      // User has provided their issue, now create the chat
      if (message.trim().length < 5) {
        setPreChatMessages([
          ...preChatMessages,
          { sender: 'user', message: message.trim() },
          { sender: 'system', message: "Please provide more details about your issue (at least 5 characters)." }
        ]);
        return;
      }

      try {
        const response = await fetch('/api/support/chat/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ issue: message.trim() }),
        });

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'Failed to create chat');
        }

        setChatId(data.chat_id);
        setShowChat(true);
        setPreChatState('idle');
        setPreChatMessages([]);
      } catch (err: any) {
        console.error('Error creating chat:', err);
        setPreChatMessages([
          ...preChatMessages,
          { sender: 'system', message: 'Failed to start chat. Please try again.' }
        ]);
      }
    }
  };

  const handleCloseChat = () => {
    setShowChat(false);
    // Don't clear cookie - allow restoration
  };

  const handleClosePreChat = () => {
    setPreChatState('idle');
    setPreChatMessages([]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] text-[#d4d4d4]">
        <Header />
        <main className="relative z-10 pt-24 pb-12 px-4">
          <div className="max-w-6xl mx-auto text-center text-white">Loading...</div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-[#d4d4d4] selection:bg-blue-500/30 selection:text-blue-200">
      <Header />
      <main className="relative z-10 pt-24 pb-12 px-4">
        {/* Background Ambient Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-blue-900/20 rounded-full blur-[120px] pointer-events-none -z-10"></div>
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-900/10 rounded-full blur-[100px] pointer-events-none -z-10"></div>

        <div className="max-w-6xl mx-auto space-y-12">
          <PageHeader />
          
          {showChat && chatId ? (
            <LiveChatView chatId={chatId} onClose={handleCloseChat} />
          ) : preChatState !== 'idle' ? (
            <PreChatView 
              state={preChatState}
              messages={preChatMessages}
              onSendMessage={handlePreChatMessage}
              onClose={handleClosePreChat}
            />
          ) : (
            <>
              <EmailSupport />
              <QuickSupport onStartChat={handleStartChat} />
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
