# External Cron Setup — Reconciliation Worker

The reconciliation endpoint is **fully compatible with external cron services** (e.g. cron-job.org). You can turn off Vercel cron and run it externally.

---

## 1. Endpoint compatibility

| Requirement | Status |
|-------------|--------|
| **HTTP method** | **GET** and **POST** are both supported. Use either. |
| **Authentication** | **Required.** Send `Authorization: Bearer <CRON_SECRET>`. Requests without the correct secret receive **401 Unauthorized**. |
| **Idempotent** | Yes. Safe to run multiple times; reconciliation and manual auto-complete use idempotency. |
| **Vercel-specific** | No. No Vercel cron headers or internal scheduling; plain HTTP. |
| **Response** | JSON with `success`, `reconcile`, `manualAutoComplete`, and `timestamp`. |

---

## 2. cron-job.org configuration

### Step 1: Create a new cron job

1. Log in at [cron-job.org](https://cron-job.org).
2. Open **Cronjobs** → **Create cronjob**.

### Step 2: URL and schedule

- **Title:** e.g. `MintMove reconcile orders`
- **URL:**  
  ```text
  https://YOUR_DOMAIN.com/api/cron/reconcile-orders
  ```  
  Replace `YOUR_DOMAIN.com` with your production domain (e.g. `mintmove.io`).
- **Schedule:** **Every 5 minutes**  
  - In cron-job.org: choose “Every 5 minutes” or equivalent (e.g. “Every 5 min”).
  - Cron expression equivalent: `*/5 * * * *`

### Step 3: HTTP method and headers

- **Request method:** **GET** or **POST** (both work).
- **Request headers:** add one header:
  - **Name:** `Authorization`
  - **Value:** `Bearer YOUR_CRON_SECRET`  
  Replace `YOUR_CRON_SECRET` with the value of the `CRON_SECRET` environment variable from your app (Vercel/host). No spaces; exact format: `Bearer <secret>`.

### Step 4: Optional settings

- **Timeout:** Set to at least **60 seconds** (reconciliation can take time).
- **Failure retries:** Optional; e.g. retry once after 1 minute if the request fails.

### Step 5: Save and enable

Save the cron job and ensure it is **enabled**. cron-job.org will call your URL every 5 minutes with the `Authorization` header.

---

## 3. Environment variable

Ensure **CRON_SECRET** is set in your production environment (e.g. Vercel → Project → Settings → Environment Variables):

- **Name:** `CRON_SECRET`
- **Value:** A long, random secret (e.g. 32+ characters). Use the same value in cron-job.org as `Bearer <CRON_SECRET>`.

If **CRON_SECRET** is missing in production, the endpoint returns **401** and does not run.

---

## 4. Logging

The route logs structured JSON to stdout. You can search logs for:

| Log `message` | When |
|----------------|------|
| `cron_request_received` | Request passed auth; job started. |
| `reconciliation_started` | Before reconciliation run. |
| `manual_auto_complete_started` | Before manual payout auto-complete run. |
| `manual_auto_complete_executed` | After manual auto-complete (includes counts). |
| `manual_payout_auto_complete_executed` | Per order when an order is auto-completed (from `lib/order-reconciliation.ts`). |
| `cron_completed` | Job finished successfully. |

Example successful run (one line per log):

```json
{"level":"info","message":"cron_request_received","timestamp":"2026-02-10T19:00:00.000Z","source":"cron_reconcile_orders","endpoint":"/api/cron/reconcile-orders","method":"GET"}
{"level":"info","message":"reconciliation_started","timestamp":"2026-02-10T19:00:00.012Z","source":"cron_reconcile_orders","endpoint":"/api/cron/reconcile-orders"}
{"level":"info","message":"manual_auto_complete_started","timestamp":"2026-02-10T19:00:05.123Z","source":"cron_reconcile_orders","endpoint":"/api/cron/reconcile-orders"}
{"level":"info","message":"manual_auto_complete_executed","timestamp":"2026-02-10T19:00:05.456Z","source":"cron_reconcile_orders","endpoint":"/api/cron/reconcile-orders","processed":0,"skipped":0,"errors":0,"processedOrderIds":[]}
{"level":"info","message":"cron_completed","timestamp":"2026-02-10T19:00:05.789Z","source":"cron_reconcile_orders","endpoint":"/api/cron/reconcile-orders","reconcile_processed":0,"reconcile_errors":0,"manual_processed":0,"manual_errors":0}
```

---

## 5. Disabling Vercel cron (optional)

If you run the job only via cron-job.org:

1. In **vercel.json**, remove or comment out the cron entry for `/api/cron/reconcile-orders`, or  
2. Leave it in place; the endpoint is idempotent, so running it from both Vercel and cron-job.org (e.g. every 5 min each) is safe but redundant.
