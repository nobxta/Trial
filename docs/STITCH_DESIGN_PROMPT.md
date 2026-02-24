# Stitch (stitch.withgoogle.com) Design Prompt for MintMove

Use the prompt below on **https://stitch.withgoogle.com/** to generate hero + exchange widget designs. Drop the exported design here and the codebase will be updated to match.

---

## Copy-paste prompt for Stitch

```
Design a modern, dark-theme landing page for a no-KYC cryptocurrency exchange product called "MintMove".

**Hero section (above the fold)**
- Full-width dark background (near black: #050505 or #0a0a0a). Optional: very subtle space/stars texture or gradient, low opacity.
- Centered headline: "Lightning-fast cryptocurrency exchange"
- Subline: "Instant swaps. Best rates. No registration required."
- One main focal element: a large **exchange widget card** (glass-morphism style: dark semi-transparent background, soft blur, thin light border). The card is the primary CTA area.

**Exchange widget card — layout and content**
- Rounded corners (e.g. 16–24px). Contained in a single card.
- **Top: two tabs** — "Fixed Rate" with a small badge "1%" and "Floating Rate" with "0.5%". One tab is active (e.g. underlined or filled).
- **Row 1 — "You Send"**: Left label "You Send"; right side small text "Min: X ETH • Max: Y ETH" (limits). Below: a large number input (placeholder "0.0") and on the right a **crypto selector** (coin icon + symbol e.g. "ETH" + chevron). Optional: under the input, small text "≈ $1,234.56" (USD equivalent).
- **Center**: A circular **swap** button (up/down arrows) between the two rows.
- **Row 2 — "You Get"**: Label "You Get (Estimated)". Read-only amount and a crypto selector (e.g. "BTC"). Optional: "≈ $1,234.56" below.
- **Row 3**: Label "Your [CRYPTO] Address". Single-line text input with a paste-from-clipboard icon on the right. Optional: "Address Book" link for logged-in users.
- **Summary block**: Small box with rows: "Rate" (e.g. "1 ETH ≈ 0.0523 BTC (Locked)"); "Network Fee" (~ $X.XX); "ETA" (~ 5–20 mins).
- **Primary button**: Full-width "Exchange Now" — prominent (e.g. blue #2563eb or brand blue), rounded.
- **Footer**: Tiny text "By clicking Exchange, you agree to our Terms of Service."

**Trust / social proof strip**
- Below the widget: horizontal strip with subtle background. Icons + short lines: e.g. "Trusted since 2018" • "99.9% Uptime" • "No KYC Required". Use checkmark or shield icons. Separators between items.

**Benefits section (3 cards)**
- Three cards in a row (or stack on mobile): "Lightning Speed" (icon: bolt), "Best Rates" (icon: trend up), "Complete Privacy" (icon: lock). Each: icon in a small colored container, title, one line of body text. Dark cards with very subtle borders.

**Stats row**
- Four stats in a row: "$4.2B+ Volume" • "0.5s Avg Time" • "2M+ Users" • "500+ Assets". Large numbers, small labels. Minimal, no heavy boxes.

**Header**
- Sticky/fixed top bar: logo (left), nav links (About, Blog, FAQ, API, Support), "Home" + auth button (right). Dark, thin bottom border.

**Style guidelines**
- Palette: background #050505 / #0a0a0a; card surfaces dark gray with glass effect; borders rgba(255,255,255,0.05–0.1); primary blue for buttons and active states; text white / gray-400 for secondary; green for success/checkmarks; red only for errors.
- Typography: Clear hierarchy — large headline, medium subline, readable form labels and inputs. Sans-serif.
- Spacing: Generous padding in the widget; consistent gaps between sections.
- Mobile: Widget and sections should stack cleanly; consider a single-column layout for the exchange card on small screens.

Generate a high-fidelity hero screen including the exchange widget, trust strip, and optionally the first benefit row so the layout and styling are clear. Focus on the exchange card as the main component.
```

---

## How your current system works (for reference)

- **Hero**: `app/page.tsx` — hero section with `ProtectedBackground`, headline, subline, `<ExchangeWidget />` in a `max-w-4xl` container.
- **Exchange**: `components/ExchangeWidget.tsx` — tabs (Fixed/Float), send amount + CryptoSelector, swap button, receive amount + CryptoSelector, destination address (+ Address Book if logged in), rate/fee/ETA summary, "Exchange Now" → `POST /api/payment` then redirect to `/order/[id]`.
- **APIs used on the hero/exchange flow**:
  - `GET /api/exchange/limits?send_asset=&receive_asset=&is_fixed_rate=` — min/max amounts per pair.
  - `GET /api/crypto/prices` (or `?ids=...`) — USD prices for rate calculation (via `useCryptoPrices`).
  - `GET /api/auth/me` — optional, for Address Book.
  - `GET /api/account/addresses` — optional, for Address Book.
  - `POST /api/payment` — creates order; returns `pay_address` etc.; user is sent to order page to pay.
- **Order page**: `/order/[id]` — deposit address, QR, amount to send, countdown; status updates via polling or webhook-driven UI.

After you generate a design in Stitch, export or share it (screenshot or link). Paste it here and say you want the frontend updated to match; the implementation will be done in the existing Next.js/React components and Tailwind/globals.css.
```

