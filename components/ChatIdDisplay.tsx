'use client';

import { useState } from 'react';

interface ChatIdDisplayProps {
  chatId: string;
}

export default function ChatIdDisplay({ chatId }: ChatIdDisplayProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(chatId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div className="px-4 py-2 bg-white/[0.03] border-b border-white/10 flex items-center gap-3 text-xs">
      <svg className="w-4 h-4 text-neutral-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
      <span className="text-neutral-400 font-medium">Chat ID:</span>
      <code className="flex-1 text-neutral-300 font-mono text-xs truncate">{chatId}</code>
      <button
        onClick={copyToClipboard}
        className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md transition-colors text-neutral-400 hover:text-neutral-200 flex items-center gap-1.5 flex-shrink-0"
        title="Copy Chat ID"
      >
        {copied ? (
          <>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-[10px]">Copied</span>
          </>
        ) : (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )}
      </button>
    </div>
  );
}

