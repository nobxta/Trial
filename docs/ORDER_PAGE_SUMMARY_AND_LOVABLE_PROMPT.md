# Order Page Summary & Lovable Prompt

## What is on `/order/[id]` (e.g. http://localhost:3000/order/UTX075)

### Purpose
Single-page view for a **crypto exchange order**. The user has already created an order (pair + amounts) and lands here to:
1. See what they send and what they receive
2. Get **deposit instructions** (address + amount) and a **QR code**
3. See **time remaining** (e.g. 15 minutes) to complete payment
4. See **live status** as the order moves: awaiting deposit → confirming → swap in progress → completed
5. Get clear **reactions** when payment is detected (success state, confetti) and when the order **expires** (expired state, support/report actions)

---

### Page structure (top to bottom)

1. **Header** (site nav)
2. **Order summary card**
   - Left: “You Pay” — amount + currency + icon  
   - Right: “You Receive” — amount + currency + icon
3. **Main content area (3 columns on desktop)**
   - **Left:** Order info card  
     - Order ID (copyable)  
     - Time remaining (countdown, or “Expired”)  
     - Order type (e.g. “Fixed rate”)  
     - Created date/time  
     - Status (user-facing)  
     - Fee note (e.g. “Included in rate”)  
     - *Hidden when order is expired*
   - **Center:**  
     - **If awaiting payment:**  
       - Instruction card: “Send [amount] [currency] to the address below”  
       - Deposit address (truncated with “View full” / copy button)  
       - Note: “The exchange rate will be fixed after 1 network confirmation”  
       - Optional: receiving address (for the currency they get)  
     - **If payment received:**  
       - “Payment Received Successfully!” hero card (green, checkmark)  
       - Short text: “We have detected your deposit of X. Your exchange to Y is now being processed.”  
       - “Next steps: You can close this page. We will notify you via email when [currency] is sent.”
   - **Right (when not expired):**  
     - QR code card: QR encoding deposit address + amount for wallet apps  
     - *When expired:* same card area shows “Payment window closed” overlay (no QR use)
4. **Progress timeline (horizontal stepper)**
   - 4 steps: **Awaiting deposit** → **Confirming on Chain** → **Swap in Progress** → **Completed**
   - Each step: icon, label, optional sublabel (e.g. “Send exact amount to the address below”, “Waiting for network confirmations”)
   - Current step highlighted (e.g. blue or green when payment received); completed steps with checkmark; when expired, first step shows “Expired” and gray style
   - *Hidden when order is expired*
5. **When expired only: “Need help?” card**
   - Short copy: “If you already sent funds or have a question, include Order ID [id] when you contact us.”
   - Buttons: “Contact support” (link), “Report an issue” (opens modal)
   - After report: “Report Sent” state and a short “Report sent” toast
6. **Report issue modal** (when “Report an issue” clicked)
   - Title: “Report an issue”
   - Radio options:  
     - Payment was sent but order shows as expired or timed out  
     - Payment not detected or not credited  
     - Incorrect or wrong destination address  
     - Other (optional text area)  
   - Cancel + “Send report” (disabled until one option selected)
7. **Optional:** Small “Checking payment status...” indicator when polling and not in a final state
8. **Footer / extra info**
   - “What do you need to know?” (e.g. 1 confirmation, network speed 10–60 min)
   - “Order status notifications” — email input + Subscribe; after subscribe show “Subscribed to notifications” with email

---

### How it reacts (state → UI)

| State | What user sees / what happens |
|-------|-------------------------------|
| **Loading** | Full-page “Loading order...” (no order data yet). |
| **Error / not found** | “Order not found” (or error message) + “Go to Home” button. |
| **Active – awaiting deposit** | Order summary, order info card with countdown, instruction card + address + copy, QR card, timeline on step 0 “Awaiting deposit”, optional “Checking payment status...”. |
| **Payment detected (confirming / swap / processing)** | One-time confetti; instruction + QR replaced by “Payment Received” hero card and “Next steps”; timeline advances to step 1 then 2; order info card can show updated status; countdown no longer relevant (can hide or leave as “—”). |
| **Completed** | Same “Payment Received” + “Next steps”; timeline step 3 “Completed” with checkmark; no countdown. |
| **Expired** | Instruction card shows “Order Expired. The payment window has closed.” + “Back to Home” + note about contacting support with Order ID. QR card shows “Payment window closed” overlay. Order info card hidden. Timeline hidden or only first step as “Expired”. “Need help?” card with Contact support + Report an issue. Report modal and “Report sent” toast as above. |

---

### Data the page needs (conceptually)

- Order id (e.g. `UTX075`)  
- Send: amount, currency, network, deposit address  
- Receive: amount, currency, network, receiving address  
- Status: user-facing label (e.g. “Awaiting deposit”, “Confirming on Chain”, “Swap in Progress”, “Completed”, “Expired”)  
- Internal status (for logic): e.g. NEW, AWAITING_DEPOSIT, CONFIRMING, PAYMENT_CONFIRMED, PROCESSING_BY_PROVIDER, DONE, FAILED, EXPIRED  
- Created at, optional expires at  
- Order type, fee note  

---

### Actions and interactions

- **Copy deposit address** → toast “Copied” (or similar)  
- **Copy Order ID** → same  
- **View full address** → expand truncated address  
- **Subscribe (email)** → validate email, then show “Subscribed” and store/display email  
- **Report an issue** → open modal → choose option (and optional “Other” text) → Send report → close modal, show “Report sent” and toast  
- **Contact support** → link to support page  
- **Back to Home** (on expired) → link to home  

---

## Lovable prompt (paste into Lovable)

Use the prompt below in Lovable to generate a full **order status page** that you can later drop into this repo. After Lovable generates the code, you can copy it into your project and use this doc + the existing `/order/[id]` implementation as reference to align behavior and styling.

---

### Prompt for Lovable

```
Build a single-page "Order Status" experience for a crypto exchange. The page is at route /order/[orderId] (e.g. /order/UTX075). It shows one order and reacts to different states: awaiting payment, payment received, in progress, completed, and expired.

Requirements:

1) Layout and sections (top to bottom)
- Header (simple nav with logo and optional "Home" link).
- Order summary card: two sides — "You Pay" (amount + currency + icon) and "You Receive" (amount + currency + icon). Clean, readable, works on mobile.
- Main content in a responsive grid (e.g. 1 column on mobile; on desktop: left column = order info, center = main instruction or success message, right = QR code when active).
- A horizontal progress timeline with 4 steps: "Awaiting deposit" → "Confirming on Chain" → "Swap in Progress" → "Completed". Show current step clearly, completed steps with a checkmark, and optional short sublabels under the active step (e.g. "Send exact amount to the address below", "Waiting for network confirmations").
- When the order is expired, show a "Need help?" section with "Contact support" link and "Report an issue" button that opens a modal.
- Optional footer area: "What do you need to know?" (e.g. 1 confirmation, network speed) and "Order status notifications" with email input and Subscribe, then show "Subscribed" state.

2) Order info card (left column, hidden when expired)
- Order ID (copyable with copy button).
- Time remaining: countdown in MM:SS (e.g. 14:32) while awaiting deposit; show "Expired" when time is up or status is expired.
- Order type (e.g. "Fixed rate"), Created (date/time), Status (user-facing text), Fee (e.g. "Included in rate").

3) Center area — two main states
- Awaiting payment: Instruction card with "Send [amount] [currency] to the address below", the deposit address (truncated with "View full" toggle and a copy button), and a short note like "The exchange rate will be fixed after 1 network confirmation." Optionally show receiving address for the currency they will receive.
- Payment received (any status after deposit is detected): A prominent "Payment Received Successfully!" card (green accent, checkmark icon) with text like "We have detected your deposit of X. Your exchange to Y is now being processed." Below it, a "Next steps" box: "You can close this page. We will notify you via email when [currency] is sent."

4) QR code card (right column when not expired)
- QR code that encodes the deposit (address + amount) so wallet apps can prefill. When expired, show the same card but with an overlay "Payment window closed" and disable copying/using the QR.

5) Expired state
- Instruction card: replace content with "Order Expired. The payment window has closed." and a "Back to Home" button; show a note: "If you already sent funds, contact support with Order ID: [orderId]."
- QR card: overlay "Payment window closed."
- Hide order info card and optionally show the timeline with only the first step as "Expired" (gray).
- Show "Need help?" card: short text + Order ID + "Contact support" button + "Report an issue" button.

6) Report issue modal
- Title: "Report an issue."
- Radio options: "Payment was sent but order shows as expired or timed out"; "Payment not detected or not credited"; "Incorrect or wrong destination address"; "Other" (if Other, show an optional text area).
- Cancel and "Send report" buttons; "Send report" disabled until one option is selected. On submit: close modal, show "Report sent" state on the button or a toast "Report sent."

7) Interactions
- Copy address and copy Order ID: show a short toast or inline "Copied" feedback.
- Expand/collapse long addresses ("View full" / "Show less").
- Email subscribe: validate email, then show success state and the email used.
- All buttons and links should be clearly styled and work on mobile.

8) Visual style
- Dark theme (e.g. dark background #0b0e14, cards #12161f, borders subtle white/10). Use a clear typography hierarchy and one accent color (e.g. blue for primary actions, green for success, red for expired). Make the "Payment Received" card and the progress timeline the main focus when relevant. Use subtle shadows and rounded corners for cards. No need for real API: use mock order data (orderId, send amount/currency, receive amount/currency, deposit address, status, createdAt, time remaining). Support at least these statuses for the timeline: awaiting deposit (step 0), confirming (step 1), swap in progress (step 2), completed (step 3), and expired (special state). Optional: one-time confetti or celebration when switching from "awaiting" to "payment received."
```

---

## After you bring Lovable code into the project

Once you paste the Lovable-generated code into this repo:

1. Replace mock data with your real API: `GET /api/order/[id]` and map the response to the same UI states (awaiting deposit, confirming, swap in progress, completed, expired).
2. Add polling (e.g. every 3–6 seconds) while the order is not in a final state (completed/failed/expired) so the page updates automatically.
3. Wire copy actions, report modal submit, and email subscribe to your backend or storage if needed.
4. Align labels and sublabels with your `lib/status-mapping.ts` (e.g. `getUserFacingStatus`, `getTimelineStepSublabel`, `getCurrentStep`) so the timeline and status text match the rest of MintMove.

This doc and the existing `app/order/[id]/page.tsx` and `components/order/*` give you the full reference for behavior, states, and structure when integrating the new UI.
