"use client";

import { AlertCircle, RefreshCw } from "lucide-react";

interface ErrorMessageProps {
  error: Error | string;
  onRetry?: () => void;
  className?: string;
  title?: string;
}

export default function ErrorMessage({
  error,
  onRetry,
  className = "",
  title = "Something went wrong",
}: ErrorMessageProps) {
  const errorMessage = error instanceof Error ? error.message : error;

  return (
    <div className={`bg-red-500/10 border border-red-500/20 rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-red-400 mb-1">{title}</h3>
          <p className="text-xs sm:text-sm text-neutral-400 mb-3">{errorMessage}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-medium rounded-lg transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

