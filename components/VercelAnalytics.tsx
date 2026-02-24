"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

export function VercelAnalytics() {
  return (
    <Analytics
      beforeSend={(event: BeforeSendEvent) => {
        const url = event.url ?? "";
        if (url.includes("/private") || url.includes("/admin") || url.includes("/account")) {
          return null;
        }
        return event;
      }}
    />
  );
}
