import type { Metadata } from "next";
import "./globals.css";
import Script from "next/script";
// Env validation runs when API routes or server code first use lib/env (not in layout, so / loads even if env is not yet set on Vercel).

export const metadata: Metadata = {
  title: "MintMove - Crypto Exchange",
  description: "Professional cryptocurrency exchange platform",
  icons: {
    icon: "/logo/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Script id="prevent-image-download" strategy="afterInteractive">
          {`
            // Prevent right-click context menu on images only (not inputs)
            document.addEventListener('contextmenu', function(e) {
              const target = e.target;
              // Skip if it's an input, textarea, or inside a form
              if (target.tagName === 'INPUT' || 
                  target.tagName === 'TEXTAREA' || 
                  target.tagName === 'SELECT' ||
                  target.tagName === 'BUTTON' ||
                  target.closest('form') ||
                  target.closest('input') ||
                  target.closest('textarea')) {
                return true;
              }
              // Only prevent on actual images or protected backgrounds
              if (target.tagName === 'IMG' || 
                  target.closest('.protected-bg') || 
                  (target.style && target.style.backgroundImage && target.classList.contains('protected-bg'))) {
                e.preventDefault();
                return false;
              }
            });
            
            // Prevent image dragging only
            document.addEventListener('dragstart', function(e) {
              const target = e.target;
              // Skip if it's an input or form element
              if (target.tagName === 'INPUT' || 
                  target.tagName === 'TEXTAREA' || 
                  target.tagName === 'SELECT' ||
                  target.closest('input') ||
                  target.closest('textarea')) {
                return true;
              }
              // Only prevent on actual images or protected backgrounds
              if (target.tagName === 'IMG' || 
                  target.closest('.protected-bg') || 
                  (target.style && target.style.backgroundImage && target.classList.contains('protected-bg'))) {
                e.preventDefault();
                return false;
              }
            });
            
            // Prevent text selection on images only (not inputs)
            document.addEventListener('selectstart', function(e) {
              const target = e.target;
              // Always allow selection in inputs and textareas
              if (target.tagName === 'INPUT' || 
                  target.tagName === 'TEXTAREA' ||
                  target.closest('input') ||
                  target.closest('textarea')) {
                return true;
              }
              // Only prevent on actual images or protected backgrounds
              if (target.tagName === 'IMG' || target.closest('.protected-bg')) {
                e.preventDefault();
                return false;
              }
            });
          `}
        </Script>
        {children}
      </body>
    </html>
  );
}

