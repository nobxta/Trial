'use client';

import { useState, useEffect, useRef } from 'react';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'admin' | 'system';
  message: string;
  created_at: string;
}

interface ChatWindowProps {
  chatId: string;
  messages: ChatMessage[];
  onSendMessage: (message: string) => Promise<void>;
  onRefresh?: () => Promise<void>;
  isAdmin?: boolean;
  disabled?: boolean;
}

export default function ChatWindow({
  chatId,
  messages,
  onSendMessage,
  onRefresh,
  isAdmin = false,
  disabled = false,
}: ChatWindowProps) {
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const lastMessageCountRef = useRef<number>(0);
  const lastMessageIdRef = useRef<string | null>(null);
  const shouldScrollRef = useRef<boolean>(true);

  const scrollToBottom = (force = false) => {
    if (!force && !shouldScrollRef.current) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const checkIfNearBottom = () => {
    if (!messagesContainerRef.current) return true;
    const container = messagesContainerRef.current;
    const threshold = 100; // pixels from bottom
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
    return isNearBottom;
  };

  useEffect(() => {
    // Check if new messages were added
    const currentMessageCount = messages.length;
    const lastMessageId = messages.length > 0 ? messages[messages.length - 1].id : null;
    
    const hasNewMessages = 
      currentMessageCount > lastMessageCountRef.current ||
      (lastMessageId && lastMessageId !== lastMessageIdRef.current);

    if (hasNewMessages) {
      // Check if user is near bottom before scrolling
      shouldScrollRef.current = checkIfNearBottom();
      if (shouldScrollRef.current) {
        scrollToBottom(true);
      }
    }

    lastMessageCountRef.current = currentMessageCount;
    lastMessageIdRef.current = lastMessageId;
  }, [messages]);

  // Track scroll position to determine if user is reading older messages
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      shouldScrollRef.current = checkIfNearBottom();
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSend = async () => {
    const message = inputMessage.trim();
    if (!message || sending || disabled) return;

    setSending(true);
    try {
      await onSendMessage(message);
      setInputMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message. Please try again.');
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

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages Container */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-4 min-h-0 custom-chat-scrollbar"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px] sm:min-h-[400px] text-center px-4">
            <div className="mb-4 w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-white/10">
              <svg className="w-7 h-7 sm:w-8 sm:h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-base sm:text-lg font-medium text-white mb-2">
              👋 Hi! Our support team is here to help.
            </p>
            <p className="text-xs sm:text-sm text-neutral-400 max-w-md">
              Start by typing your issue below. We typically respond within 2–5 minutes.
            </p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isUser = msg.sender === 'user';
            const isSystem = msg.sender === 'system';
            const isAdminMsg = msg.sender === 'admin';

            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center animate-fade-in">
                  <div className="bg-white/[0.03] text-neutral-400 text-xs px-4 py-2 rounded-full border border-white/10 backdrop-blur-sm">
                    {msg.message}
                  </div>
                </div>
              );
            }

            const isUserMessage = isUser && !isAdmin;

            return (
              <div
                key={msg.id}
                className={`flex items-end gap-3 animate-fade-in ${isUserMessage ? 'justify-end' : 'justify-start'}`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {/* Support Avatar (left side only) */}
                {!isUserMessage && (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 flex items-center justify-center border border-white/10 flex-shrink-0 mb-1">
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                )}

                {/* Message Bubble */}
                <div className={`flex flex-col ${isUserMessage ? 'items-end' : 'items-start'} max-w-[75%] sm:max-w-[70%]`}>
                  <div
                    className={`rounded-2xl px-3 py-2 sm:px-4 sm:py-2.5 shadow-lg transition-all duration-200 ${
                      isUserMessage
                        ? 'bg-gradient-to-br from-blue-600 to-blue-500 text-white rounded-br-md'
                        : 'bg-white/[0.08] text-neutral-100 border border-white/10 backdrop-blur-sm rounded-bl-md'
                    }`}
                  >
                    <div className="text-sm sm:text-[15px] whitespace-pre-wrap break-words leading-relaxed">
                      {msg.message}
                    </div>
                    <div
                      className={`text-[10px] mt-1.5 ${
                        isUserMessage ? 'text-blue-100/70' : 'text-neutral-400'
                      }`}
                    >
                      {formatTime(msg.created_at)}
                    </div>
                  </div>
                </div>

                {/* User Avatar (right side only) */}
                {isUserMessage && (
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
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Sticky at Bottom */}
      {!disabled && (
        <div className="border-t border-white/10 bg-gradient-to-b from-transparent to-black/20 backdrop-blur-sm px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message…"
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
              {inputMessage.length > 4500 && (
                <div className="absolute bottom-2 right-2 text-[10px] text-neutral-500">
                  {inputMessage.length}/5000
                </div>
              )}
            </div>
            <button
              onClick={handleSend}
              disabled={!inputMessage.trim() || sending || disabled}
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
      )}
    </div>
  );
}

