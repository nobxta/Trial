# Order Details Page – Spec & API

**Route:** `http://localhost:3000/order/:orderId`  
**Example:** `http://localhost:3000/order/VZ0JKH`

The page fetches the order by `:orderId` and renders the following structure. All user-visible strings are centralized in `lib/order-page-text.ts` (see **Text config** below).

---

## 1. Page structure (UI sections)

| # | Section | Content |
|---|--------|--------|
| 1 | **Swap Summary Card** | YOU PAY (amount, currency + network) ↔ YOU RECEIVE (amount, currency) |
| 2 | **Order Details** | Order ID, Time Remaining (live countdown), Order Type (Fixed/Floating), Created, Status, Fee ("Included in rate") |
| 3 | **Deposit Instruction** | "Send exact {amount} {currency} to the address below", deposit address (copy), Show Less / Show More, View QR (opens modal) |
| 4 | **Receiving Address** | Receiving currency address (masked + View Full), Copy |
| 5 | **Order Progress Stepper** | Steps: Awaiting Deposit → Confirming on Chain → Swap in Progress → Completed (active step from backend) |
| 6 | **Information Section** | Confirmations required, network speed estimate, status explanation by stage |
| 7 | **Notification Subscription** | Email input, Subscribe; on submit → save to order notifications |

---

## 2. State logic

- **Order source:** Single source of truth from `GET /api/order/:orderId`. Poll while not in a final state (e.g. every 3–6s).
- **Progress step:** From API `currentStep` (0–3) or derived from `internalStatus`; stepper highlights active step.
- **Status label & color:** From `orderPageText` + `getOrderStatusLabel()` / `getOrderStatusColorClass()`. Countdown only when status is `awaiting_deposit` (or `NEW` / `AWAITING_DEPOSIT`).
- **Deposit instructions:** Shown only while awaiting deposit; hidden once deposit is confirmed (status moves to confirming/swapping/completed).
- **Timer:** Shown only when `internalStatus` is `NEW` or `AWAITING_DEPOSIT`; hidden after first confirmation or when expired/failed/completed.

**Final states (stop polling):** `DONE`, `FAILED`, `EXPIRED` (or lowercase equivalents).

---

## 3. Button actions

| Action | Behavior |
|--------|----------|
| **Copy Address** | Copy deposit (or receiving) address to clipboard; show "Copied" toast. |
| **View QR** | Open modal with QR for deposit address (and "Send exactly X Y"). |
| **Subscribe** | Validate email, save to order notifications, show success message. |
| **View Full Address** | Expand masked address (Show More / Show Less). |

---

## 4. Order status logic

**Backend statuses (supported in UI):**

- `awaiting_deposit` (or `NEW`, `AWAITING_DEPOSIT`)
- `confirming` (or `CONFIRMING`)
- `swapping` (or `PAYMENT_CONFIRMED`, `PROCESSING_BY_PROVIDER`, `MANUAL_REVIEW`)
- `completed` (or `DONE`)
- `expired` (or `EXPIRED`)
- `failed` (or `FAILED`)

**UI behavior:**

- Progress step updates from API.
- Status label and color from `lib/order-page-text.ts` helpers.
- Countdown only when `awaiting_deposit`.
- Deposit instruction section hidden once deposit is confirmed.

---

## 5. Text config (centralized strings)

All user-visible strings live in **`lib/order-page-text.ts`**:

- **Export:** `orderPageText` (nested object), `getOrderStatusLabel()`, `getOrderStatusColorClass()`.
- **Usage:** Import in the order page (and any order-specific components) and pass or use the keys for labels, titles, buttons, toasts, and status text.
- **Templates:** Use placeholders like `{amount}`, `{currency}`, `{symbol}` and replace at render time.

Example (conceptual):

```ts
import { orderPageText, getOrderStatusLabel, getOrderStatusColorClass } from "@/lib/order-page-text";

// Section title
orderPageText.orderDetails.sectionTitle

// Deposit instruction (replace placeholders)
orderPageText.depositInstruction.sendExactToAddressBelow
  .replace("{amount}", sendAmountFormatted)
  .replace("{currency}", sendSymbolShort)

// Status label and color
getOrderStatusLabel(order.internalStatus)
getOrderStatusColorClass(order.internalStatus)
```

See the full object in `lib/order-page-text.ts` for every section and button.

---

## 6. Example order JSON (API response)

Expected shape from **`GET /api/order/:orderId`**:

```json
{
  "success": true,
  "order": {
    "id": "uuid-from-db",
    "orderId": "VZ0JKH",
    "paymentId": "12345678",
    "status": "Awaiting deposit",
    "internalStatus": "AWAITING_DEPOSIT",
    "currentStep": 0,
    "payAmount": 0.005,
    "payCurrency": "BTC",
    "payNetwork": "Bitcoin",
    "payAddress": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    "outcomeAmount": 0.526,
    "outcomeCurrency": "ETH",
    "outcomeNetwork": "Arbitrum One",
    "outcomeAddress": "0x71C7656EC7ab88b098defB75187401B5f6d8976F",
    "fromAmount": 0.005,
    "fromCurrency": "BTC",
    "fromNetwork": "Bitcoin",
    "fromAddress": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    "toAmount": 0.526,
    "toCurrency": "ETH",
    "toNetwork": "Arbitrum One",
    "toAddress": "0x71C7656EC7ab88b098defB75187401B5f6d8976F",
    "createdAt": "2025-02-10T20:00:00.000Z",
    "updatedAt": "2025-02-10T20:00:00.000Z",
    "expiresAt": null,
    "payinHash": null,
    "payoutHash": null
  }
}
```

**Field usage:**

| Field | Use |
|-------|-----|
| `orderId` | Display + copy Order ID |
| `status` | User-facing status label (can override with `getOrderStatusLabel(internalStatus)`) |
| `internalStatus` | Logic (timer, progress, show/hide deposit) |
| `currentStep` | Stepper active step (0–3) |
| `payAmount`, `payCurrency`, `payNetwork`, `payAddress` | YOU PAY + deposit instruction + QR |
| `outcomeAmount`, `outcomeCurrency`, `outcomeNetwork`, `outcomeAddress` | YOU RECEIVE + receiving address |
| `createdAt`, `expiresAt` | Created date, timer (when applicable) |

Order Type (Fixed/Floating) can be added by the backend if needed; otherwise the page can show a default (e.g. "Fixed") from textConfig.
