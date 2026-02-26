"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

/** Normalize dynamic path segments so Vercel groups them (e.g. /order/14KSE5 → /order/[id]). */
function normalizePath(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname;
    // /order/<orderId> (alphanumeric, typically 6 chars) → /order/[id]
    const orderMatch = path.match(/^\/order\/([A-Za-z0-9_-]+)$/);
    if (orderMatch) {
      u.pathname = "/order/[id]";
      return u.toString();
    }
    return url;
  } catch {
    return url;
  }
}

export function VercelAnalytics() {
  return (
    <Analytics
      beforeSend={(event: BeforeSendEvent) => {
        const url = event.url ?? "";
        if (url.includes("/private") || url.includes("/admin") || url.includes("/account")) {
          return null;
        }
        const normalizedUrl = normalizePath(url);
        return normalizedUrl !== url ? { ...event, url: normalizedUrl } : event;
      }}
    />
  );
}
