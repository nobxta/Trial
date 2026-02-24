# Order Page – Full Text Inventory

All user-facing text on the order page (`/order/[id]`): where it appears, for what situation, and what it’s for.  
Source: `app/order/[id]/page.tsx`, `lib/order-page-text.ts`, and child components.

---

## 1. Page-level states (order page itself)

### Loading
| Text | Where | Situation |
|------|--------|-----------|
| `Loading order...` | Full-page loading | While fetching order (orderPageText.generic.loading) |

### Error / Not found
| Text | Where | Situation |
|------|--------|-----------|
| `Order not found` (or `error` message) | Full-page error | 404 or API error (orderPageText.generic.orderNotFound) |
| `Go to Home` | Button | Link to `/` (orderPageText.generic.goToHome) |

### Completed (success)
| Text | Where | Situation |
|------|--------|-----------|
| `Exchange Complete!` | Hero heading | Order status = DONE |
| `Your funds have been successfully exchanged and sent to your wallet` | Hero subtext | Completed |
| `Sent` | Label above send amount | Completed summary |
| `Received` | Label above receive amount | Completed summary |
| `Start New Exchange` | Primary CTA | Completed – link to `/` |
| `View Order History` | Secondary button | Completed (currently no href) |

### Expired
| Text | Where | Situation |
|------|--------|-----------|
| `Order Expired` | Expired card heading | Order expired |
| `The payment was not received within the required time frame.` | Expired card subtext | Expired |
| `You Pay` | Exchange summary label | Expired view |
| `You Receive` | Exchange summary label | Expired view |
| `Order ID` | Label | Expired – shows orderId |
| `Start New Exchange` | Primary CTA | Expired – link to `/` |
| `Already sent funds?` | Help section heading | Expired |
| `Contact support with your Order ID if you sent payment after expiry.` | Help section body | Expired |
| `Contact Support` | Button | Expired – link to `/support` |
| `Report Issue` | Button | Expired – opens report modal |
| `Report sent` (with check) | After submitting report | Expired |
| `Need help?` | Desktop expired help section | When expired (desktop) |
| `If you already sent funds or have a question about this order, we're here to help. Include your Order ID ... when you contact us.` | Desktop help body | Expired |
| `Contact support` | Button (orderPageText) | orderPageText.generic.contactSupport |
| `Report an issue` | Button | orderPageText.generic.reportIssue |

---

## 2. Swap / coins summary (OrderSummary)

Used in both mobile and desktop layout.

| Text | Where | Situation |
|------|--------|-----------|
| `You Pay` | Label above send amount | Passed as youPayLabel |
| `You Receive` | Label above receive amount | Passed as youReceiveLabel |
| `{sendAmount} {sendSymbol}` | Send side | e.g. "100 USDT" |
| `{receiveAmount} {receiveSymbol}` | Receive side | e.g. "99.5 USDC" |
| `{sendNetwork}` | Badge next to send amount (optional) | e.g. "TRC20", "ERC20" |
| `{receiveNetwork}` | Badge next to receive amount (optional) | e.g. "ERC20" |
| **Status badge** | Right side of summary bar | From getStatusLabel() / getStatusType() |

**Status label values (from getStatusLabel):**
- `Awaiting Deposit` – NEW / AWAITING_DEPOSIT
- `Confirming` – CONFIRMING
- `Exchanging` – PAYMENT_CONFIRMED, PROCESSING_BY_PROVIDER, MANUAL_REVIEW
- `Completed` – DONE
- `Failed` – FAILED
- `Expired` – EXPIRED or timer expired in awaiting
- `Processing` – default

---

## 3. Mobile-only block

| Text | Where | Situation |
|------|--------|-----------|
| `Order ID` | Mobile order info row | Label |
| `Type` | Mobile order info row | Label |
| `Fixed Rate` / `Floating Rate` | Mobile order info row | From order.rateMode |
| `Time Left` | Mobile order info row | Label |
| `MM:SS` or `—` | Time left value | Timer when awaiting; `—` otherwise |
| `You must send exactly: {amount} {symbol}` | Above DepositAddressCard (mobile) | Before deposit card |
| `Progress` | Mobile progress card | Section title |
| `Step {n} of 4` | Mobile progress | timelineStep + 1 |
| `Waiting`, `Confirming`, `Exchanging`, `Done` | Mobile progress steps | Step labels |
| `Need Help? Contact Support` | Mobile button | Help CTA |

---

## 4. Order Details card (OrderInfoQRCard) – left column

| Text | Where | Situation |
|------|--------|-----------|
| `Order Details` | Card title | Header |
| `ID:` | Label before order ID | Order ID block |
| `{orderId}` | Value | Order ID (copyable) |
| `Creation time` | Label | First detail block |
| `{createdStr}` | Value (e.g. "Feb 22, 8:12 PM") | Creation time |
| `Order Type` | Label | Second detail block |
| `Fixed Rate` / `Floating Rate` | Value (orderType prop) | From order.rateMode |
| `Rate locked` | Subtext | When rateMode === 'fixed' && providerRateLocked |
| `Rate confirmed after 1 confirmation` | Subtext | When rateMode === 'floating' |
| `Network Fee` | Label | Third detail block |
| `Included` | Value | Fee |
| **Timer block** (when showTimeRemaining) | | |
| `Time Remaining` / `Expired` | Timer label | Active timer vs expired |
| `Complete your deposit before the timer expires.` | Timer message | When not expired |
| `Order has expired` | Timer message | When expired |
| `min` / `sec` | Timer units | MM : SS display |

---

## 5. Deposit / “You must send exactly” (above right card)

| Text | Where | Situation |
|------|--------|-----------|
| `You must send exactly: {sendAmountFormatted} {sendInfo.symbol}` | Above Deposit Address card (desktop) | Instruction before deposit card |

---

## 6. Deposit Address card (DepositAddressCard) – right column

### Card title & actions
| Text | Where | Situation |
|------|--------|-----------|
| `Deposit Address` | Card title | Header |
| `QR Code` | Button | When awaiting deposit and address present |

### Expired state (card content)
| Text | Where | Situation |
|------|--------|-----------|
| `Order expired` (ORDER_STATE_TEXT.STATE_EXPIRED.title) | Heading | Expired |
| `The 12-minute payment window has ended.` | Notice | STATE_EXPIRED.notice |
| `Back to Home` | Button | orderPageText.generic.backToHome |

### Awaiting deposit
| Text | Where | Situation |
|------|--------|-----------|
| `Deposit {amount} {currency}` (state title) | Banner title | STATE_AWAITING_DEPOSIT |
| `Est. Arrival: 1 Confirmation` | Notice | STATE_AWAITING_DEPOSIT.notice |
| `Send exactly {amount} {symbol}` | Instruction banner | Awaiting |
| `to the address below to complete your exchange` | Instruction subtext | Awaiting |
| `{symbol} Deposit Address` | Label above address | e.g. "USDT Deposit Address" |
| `Copy` / `Copied` | Button | Copy address |

### Confirming
| Text | Where | Situation |
|------|--------|-----------|
| `Payment Detected` | Banner title | STATE_CONFIRMING.title |
| `Waiting for confirmations...` | Notice | STATE_CONFIRMING.notice |
| `Confirming your payment` | Banner heading (hardcoded) | STATE_CONFIRMING |

### Exchanging
| Text | Where | Situation |
|------|--------|-----------|
| `Converting your assets` | STATE_EXCHANGING.title | Banner title |
| `Exchange in progress.` | STATE_EXCHANGING.notice | Notice |
| `Processing your exchange` | Banner heading (hardcoded) | STATE_EXCHANGING |

### Completed (DONE)
| Text | Where | Situation |
|------|--------|-----------|
| `You received {amount} {symbol}.` | STATE_COMPLETED.bodyTemplate | Completed message |
| `View on Explorer` | STATE_COMPLETED.ctaLabel | Link when payoutTxHash present |

### Receiving address (all non-expired states when receiveAddress present)
| Text | Where | Situation |
|------|--------|-----------|
| `Your {receiveSymbol} Receiving Address` | Label | e.g. "Your USDC Receiving Address" |

---

## 7. Progress timeline (ProgressTimeline)

| Text | Where | Situation |
|------|--------|-----------|
| `Transaction Progress` | Section title | Header |
| `Step {n} of 4` / `Expired` | Header right | Current step or expired |
| `Awaiting Deposit` | Step 1 label | STEPS[0].label |
| `Waiting for funds` | Step 1 desc | STEPS[0].desc |
| `Confirming` | Step 2 label | STEPS[1].label |
| `Network verification` | Step 2 desc | STEPS[1].desc |
| `Exchanging` | Step 3 label | STEPS[2].label |
| `Processing swap` | Step 3 desc | STEPS[2].desc |
| `Completed` | Step 4 label | STEPS[3].label |
| `Funds sent` | Step 4 desc | STEPS[3].desc |
| `Expired` | Step 1 when expired | Override label |
| `Time limit reached` | Step 1 desc when expired | Override desc |

---

## 8. Info & Notifications (OrderInfo) – from orderPageText

### Instructions card (Transaction Insights)
| Text | Where | Situation |
|------|--------|-----------|
| `Transaction Insights` | Card title | text.instructionsTitle (sectionTitle) |
| `Confirmations` | Item label | text.confirmationsLabel |
| `Est. Arrival: 1 Confirmation` | Item value | text.confirmationsRequired |
| `Network speed` | Item label | text.networkSpeedLabel |
| `Usually 5–30 minutes.` | Item value | text.networkSpeed |

### Notifications card
| Text | Where | Situation |
|------|--------|-----------|
| `Order Status Notifications` | Card title | text.notificationsTitle |
| `Get real-time status alerts` | Description | text.notificationDescription |
| `you@email.com` | Email placeholder | text.emailPlaceholder |
| `Subscribe` | Submit button | text.subscribe |
| `Subscribing...` | Button while submitting | text.subscribing |
| `Subscribed to notifications` | Success title | text.subscribedSuccess |
| `Notifications will be sent to` | Success subtext prefix | text.notificationsSentTo |

---

## 9. Report issue modal (order page + expired view)

| Text | Where | Situation |
|------|--------|-----------|
| `Report an issue` | Modal title | orderPageText.reportModal.title |
| `Please select the option that best describes your situation. Our team will review your report shortly.` | Description | orderPageText.reportModal.description |
| `Payment was sent but order shows as expired or timed out` | Option | reportModal.options.timeout |
| `Payment not detected or not credited to this order` | Option | reportModal.options.notDetected |
| `Incorrect or wrong destination address used` | Option | reportModal.options.addressMistake |
| `Other issue` | Option | reportModal.options.other |
| `Please describe your issue (optional)` | Textarea placeholder | reportModal.otherPlaceholder |
| `Cancel` | Button (expired modal) | Hardcoded |
| `Send Report` | Button (expired modal) | Hardcoded |
| `Cancel` | Button (main modal) | reportModal.cancel |
| `Send report` | Button (main modal) | reportModal.sendReport |

**Toast after send**
| `Report sent` | Toast | orderPageText.generic.reportSent |

---

## 10. Copy toast

| Text | Where | Situation |
|------|--------|-----------|
| `Copied` | CopyToast message | orderPageText.generic.copied |

---

## 11. QR modal (QRModal)

| Text | Where | Situation |
|------|--------|-----------|
| `Scan QR Code` | Modal title | Header |
| `Send exactly` | Label above amount | Above amount |
| `{amount} {symbol}` | Amount | From props |
| `To this address` | Label above address | Address block |
| `Copy` / `Copied` | Button | Copy address |

---

## 12. Centralized labels (lib/order-page-text.ts) – reference

**orderStatusLabels (getOrderStatusLabel):**  
Awaiting deposit, Confirming on Chain, Swap in Progress, Completed, Failed, Expired (+ lowercase variants).

**ORDER_STATE_TEXT (DepositAddressCard / state messaging):**
- STATE_AWAITING_DEPOSIT: title "Deposit {amount} {currency}", notice "Est. Arrival: 1 Confirmation"
- STATE_CONFIRMING: title "Payment Detected", notice "Waiting for confirmations..."
- STATE_EXCHANGING: title "Converting your assets", notice "Exchange in progress."
- STATE_COMPLETED: title "Exchange complete", bodyTemplate "You received {amount} {symbol}.", ctaLabel "View on Explorer"
- STATE_EXPIRED: title "Order expired", notice "The 12-minute payment window has ended."

**information.statusExplanation:**  
awaiting, confirming, swapping, completed, expired, failed – used for contextual status explanations (e.g. in instructions).

---

## Summary by purpose

- **Status:** Awaiting Deposit, Confirming, Exchanging, Completed, Failed, Expired, Processing; Step N of 4; Transaction Progress; state banners in Deposit card (Payment Detected, Converting your assets, Order expired).
- **Coins / amounts:** You Pay / You Receive; send/receive amounts and symbols; network badges (e.g. ERC20, TRC20); “Send exactly X Y”; “You must send exactly”; “Deposit X Y”.
- **Time:** Creation time (label + value); Time Remaining / Expired; “Complete your deposit before the timer expires”; “Order has expired”; min/sec; “Time limit reached”.
- **Order meta:** Order Details; Order ID; Order Type (Fixed/Floating Rate); Rate locked / Rate confirmed after 1 confirmation; Network Fee; Included.
- **Deposit flow:** Deposit Address; QR Code; Copy/Copied; address label “{symbol} Deposit Address”; “Your {symbol} Receiving Address”.
- **Help & support:** Need help?; Contact support; Report an issue; Report sent; Already sent funds?; Report modal options and buttons.
- **Success / completion:** Exchange Complete!; Sent / Received; Start New Exchange; View on Explorer; You received X Y.
- **Notifications:** Order Status Notifications; Subscribe; email placeholder; Subscribed to notifications.
- **Loading / error:** Loading order...; Order not found; Go to Home.

All of the above is what the user sees on the order page and what each string is used for.
