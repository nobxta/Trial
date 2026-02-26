# Cron Jobs via cron-job.org

This project **does not use Vercel Cron**. All scheduled tasks run via [cron-job.org](https://cron-job.org) (or any HTTP cron service) calling the API with `Authorization: Bearer <CRON_SECRET>`.

---

## 1. Environment variable

Set **CRON_SECRET** in your production environment (e.g. Vercel → Project → Settings → Environment Variables):

- **Name:** `CRON_SECRET`
- **Value:** A long, random secret (e.g. 32+ characters).

Use the **same value** in cron-job.org as the Bearer token: `Bearer <CRON_SECRET>` (no extra spaces).

If **CRON_SECRET** is missing or wrong in production, cron endpoints return **401 Unauthorized**.

---

## 2. Step-by-step: Using your website URL (e.g. mintmove.io)

Follow these steps in order. Use your **website domain** only (no Vercel .vercel.app URL).

### Step 1: Get your CRON_SECRET

1. Open [Vercel](https://vercel.com) → your project → **Settings** → **Environment Variables**.
2. Find **CRON_SECRET** (or create it: name `CRON_SECRET`, value = long random string, e.g. 32+ characters).
3. Copy the value and keep it somewhere safe. You will use it as `Bearer YOUR_CRON_SECRET` in cron-job.org.

### Step 2: Find which URL does NOT redirect (www vs non-www)

Cron-job.org fails with **307** if the URL redirects. You must use the **final** URL that returns **200** directly (no redirect).

**Option A – Using PowerShell (Windows):**

```powershell
# Test non-www (MaximumRedirection 0 = do not follow redirects)
try {
  $r = Invoke-WebRequest -Uri "https://mintmove.io/api/cron/reconcile-orders" -Method GET -UseBasicParsing -MaximumRedirection 0
  Write-Host "mintmove.io (no www) -> Status:" $r.StatusCode
} catch {
  $code = $_.Exception.Response.StatusCode.value__
  Write-Host "mintmove.io (no www) -> Status:" $code
  if ($code -eq 307) { Write-Host "  -> REDIRECT: do not use this URL for cron" }
  if ($code -eq 401) { Write-Host "  -> OK: use https://mintmove.io for cron" }
}

# Test www
try {
  $r = Invoke-WebRequest -Uri "https://www.mintmove.io/api/cron/reconcile-orders" -Method GET -UseBasicParsing -MaximumRedirection 0
  Write-Host "www.mintmove.io -> Status:" $r.StatusCode
} catch {
  $code = $_.Exception.Response.StatusCode.value__
  Write-Host "www.mintmove.io -> Status:" $code
  if ($code -eq 307) { Write-Host "  -> REDIRECT: do not use this URL for cron" }
  if ($code -eq 401) { Write-Host "  -> OK: use https://www.mintmove.io for cron" }
}
```

- **401** = no redirect; use that base URL for all cron jobs. **307** = redirect; do not use. If both show 307 (401 = no redirect; the server received the request and replied “unauthorized” because you didn’t send the header; that’s the correct URL for cron).
- If both give **307**: try the other domain in Vercel (Settings → Domains) or use the Vercel URL from the troubleshooting section.
- If one gives **401** and the other **307**: the **401** URL is the one that does not redirect → use that in cron-job.org.

**Option B – Using browser DevTools:**

1. Open Chrome or Edge. Press **F12** → go to the **Network** tab.
2. Check **“Preserve log”**.
3. In the address bar type: `https://mintmove.io/api/cron/reconcile-orders` and press Enter.
4. Look at the first request in the list:
   - **Status 307** and a “Location” header → this URL **redirects**. Do not use it for cron.
   - **Status 401** (or 200 if you had a cookie) → this URL **does not redirect**. Use this host (e.g. `https://mintmove.io`) in cron-job.org.
5. Repeat with `https://www.mintmove.io/api/cron/reconcile-orders`. Whichever returns **401** (or 200) **without** a 307 before it is your canonical URL.

**Result:** You should have one base URL, for example:

- `https://mintmove.io` (non-www), or  
- `https://www.mintmove.io` (www).

Use this base for all cron URLs below (no trailing slash).

### Step 3: Create the four cron jobs on cron-job.org (website URL only)

1. Go to [cron-job.org](https://cron-job.org) and log in.
2. Click **Cronjobs** → **Create cronjob**.
3. For **each** of the four jobs below, fill the form **exactly** as in the table (replace `mintmove.io` with your canonical host if different, and `YOUR_CRON_SECRET` with your real secret).

| # | Title | URL | Schedule | Timeout |
|---|--------|-----|----------|--------|
| 1 | MintMove – Reconcile orders | `https://mintmove.io/api/cron/reconcile-orders` | Every **2 minutes** | 60 s |
| 2 | MintMove – Process email queue | `https://mintmove.io/api/cron/process-email-queue` | Daily 04:00 UTC | 60 s |
| 3 | MintMove – Update prices | `https://mintmove.io/api/cron/update-prices` | Daily 02:00 UTC | 60 s |
| 4 | MintMove – Update exchange limits | `https://mintmove.io/api/cron/update-exchange-limits` | Daily 03:00 UTC | 120 s |

For **every** job:

- **Request method:** GET (or POST).
- **Request headers:** add one header:
  - **Name:** `Authorization`  
  - **Value:** `Bearer YOUR_CRON_SECRET` (replace with your actual secret, no extra spaces).
- **Timeout:** as in the table (60 or 120 seconds).
- **No trailing slash** in the URL.

4. Click **Save** and ensure the job is **Enabled**.
5. Repeat for all four jobs.

### Step 4: Test that the cron is working

**4.1 – Manual run in cron-job.org**

1. In cron-job.org, open one of the cron jobs (e.g. “MintMove – Reconcile orders”).
2. Use **“Execute now”** / **“Run now”** (or similar).
3. After a few seconds, open **Execution history** or **Log** for that job:
   - **Success / HTTP 200** → the cron URL and secret are correct.
   - **307** → you are still using a URL that redirects; go back to Step 2 and use the other host (www or non-www).
   - **401** → wrong or missing `Authorization: Bearer CRON_SECRET`; check the header value and that `CRON_SECRET` in Vercel matches.

**4.2 – Check the response body (optional)**

- In the same execution log, if cron-job.org shows the response body, you should see JSON like:
  - Reconcile: `{"success":true,"reconcile":{...},"manualAutoComplete":{...},"timestamp":"..."}`
  - Email queue: `{"success":true,"processed":0,"sent":0,...}`
  - Update prices: `{"success":true,"updated":...,"timestamp":"..."}`
  - Update limits: `{"success":true,"updated":...,"errors":...}`

**4.3 – Check server-side (real proof)**

- **Vercel:** Project → **Logs** (or **Deployments** → open a deployment → **Functions** / **Logs**). After a manual run, look for log lines such as:
  - `[Cron] reconcile-orders` or `cron_completed` or `📧 [Email Queue]` or `🔄 [Cron] Starting price update`.
- **Database:** For **reconcile-orders** and **process-email-queue**, the app writes to the `cron_runs` table. In Supabase (or your DB client), check the `cron_runs` table: after a successful run you should see `last_success_at` and `endpoint` updated for `/api/cron/reconcile-orders` and `/api/cron/process-email-queue`.

If **manual run = 200**, **logs show cron activity**, and (for those two) **cron_runs** has recent `last_success_at`, the cron is working correctly.

---

## 2a. Auto-complete after payment confirmed (no verification)

After a payment is **confirmed** (status PAYMENT_CONFIRMED), each order gets a **random 2–10 minute** delay. When that time is reached, the **Reconcile orders** cron marks the order **Completed** (DONE). There is no manual step, no hash or verification — the UI just shows “Swap in progress” and then “Completed” once the cron runs.

- **You must run the Reconcile orders cron** (Job 1) for this to work. Recommended: **every 2 minutes** so orders complete within roughly 2–12 minutes after confirmation.
- If you run it every 5 minutes, an order might wait up to 5 extra minutes after its 2–10 min window before the cron picks it up.

---

## 3. Common settings for every cron job

For **each** cron job on cron-job.org:

1. **Request method:** GET or POST (both work).
2. **Request headers:** add one header:
   - **Name:** `Authorization`
   - **Value:** `Bearer YOUR_CRON_SECRET` (replace with your actual `CRON_SECRET`).
3. **Timeout:** Set to at least **60 seconds** for jobs that may run long (reconcile-orders, process-email-queue, update-exchange-limits). update-prices can use 30–60 s.
4. **Failure retries:** Optional (e.g. retry once after 1 minute).

Replace `YOUR_DOMAIN.com` below with your production domain (e.g. `mintmove.io` or `your-app.vercel.app`).

**Important:** Use **HTTPS** only (never `http://`). Use **no trailing slash** (e.g. `.../reconcile-orders` not `.../reconcile-orders/`).

---

## 4. Cron jobs to create

Create **4 separate cron jobs** on cron-job.org with the following settings.

### Job 1: Reconcile orders (every 2 minutes) — **required for auto-complete**

| Setting   | Value |
|----------|--------|
| **Title** | `MintMove – Reconcile orders` |
| **URL**   | `https://YOUR_DOMAIN.com/api/cron/reconcile-orders` |
| **Schedule** | Every **2 minutes** (or cron `*/2 * * * *`) |
| **Timeout**  | **60 seconds** or more |

**What it does:**
- **Auto-complete:** Orders move to **Completed** automatically **2–10 minutes** after payment is confirmed. No verification or hash needed — the cron marks them DONE when the scheduled time (set per order at PAYMENT_CONFIRMED) is reached. Run every 2 minutes so completed orders show up quickly.
- **Webhook failure recovery:** Polls NOWPayments for stuck orders (e.g. missed webhooks).

Idempotent; safe to run every 2 minutes.

---

### Job 2: Process email queue (daily at 4 AM UTC)

| Setting   | Value |
|----------|--------|
| **Title** | `MintMove – Process email queue` |
| **URL**   | `https://YOUR_DOMAIN.com/api/cron/process-email-queue` |
| **Schedule** | **Daily** at **04:00** UTC (or cron `0 4 * * *`) |
| **Timeout**  | **60 seconds** or more |

**What it does:** Sends pending emails from the `email_queue` table (up to 10 per run). For more frequent sends, you can schedule e.g. every 5–15 minutes.

---

### Job 3: Update crypto prices (daily at 2 AM UTC)

| Setting   | Value |
|----------|--------|
| **Title** | `MintMove – Update prices` |
| **URL**   | `https://YOUR_DOMAIN.com/api/cron/update-prices` |
| **Schedule** | **Daily** at **02:00** UTC (or cron `0 2 * * *`) |
| **Timeout**  | **60 seconds** |

**What it does:** Fetches prices for supported cryptos from CoinGecko and updates the `crypto_prices` table.

---

### Job 4: Update exchange limits (daily at 3 AM UTC)

| Setting   | Value |
|----------|--------|
| **Title** | `MintMove – Update exchange limits` |
| **URL**   | `https://YOUR_DOMAIN.com/api/cron/update-exchange-limits` |
| **Schedule** | **Daily** at **03:00** UTC (or cron `0 3 * * *`) |
| **Timeout**  | **60–120 seconds** |

**What it does:** Refreshes min/max limits only for **cached** pairs in `exchange_limits` that are older than 24h (up to 250 per run). New pairs are filled on-demand when users request a rate; the cron does not call NOWPayments for every possible pair.

---

## 5. Step-by-step on cron-job.org

1. Log in at [cron-job.org](https://cron-job.org).
2. Go to **Cronjobs** → **Create cronjob**.
3. For each of the 4 jobs above:
   - **Title:** as in the table.
   - **URL:** as in the table (with your domain).
   - **Schedule:** as in the table (every 2 min for reconcile; daily at given time for the others).
   - **Request method:** GET or POST.
   - **Request headers:** add `Authorization` with value `Bearer YOUR_CRON_SECRET`.
   - **Timeout:** as in the table.
4. Save and **enable** each cron job.

cron-job.org will call your URLs at the set times; your app validates `CRON_SECRET` and runs the job.

---

## 6. Logging and monitoring

- **reconcile-orders** and **process-email-queue** write success/failure to the `cron_runs` table and log structured JSON (e.g. `cron_request_received`, `cron_completed`). Check your host logs (e.g. Vercel Logs) for these messages.
- **update-prices** and **update-exchange-limits** do not write to `cron_runs`; check application logs for their output.

You can use cron-job.org's execution history and notifications to see if requests succeed or fail (e.g. 401 = wrong/missing `CRON_SECRET`; 500 = application error).

---

## 7. Troubleshooting: 307 Temporary Redirect

If cron-job.org reports **"Failed (HTTP error) (307 Temporary Redirect)"**, the server is redirecting the request and cron-job.org treats that as a failure (it does not follow redirects). Fix it as follows:

1. **Use HTTPS only**  
   The URL in the cron job must start with `https://` (e.g. `https://mintmove.io/api/cron/...`). If you use `http://`, the host will redirect to HTTPS with 307 and the job will fail.

2. **Use the canonical domain (no redirect)**  
   If your custom domain redirects between **www** and **non-www** (e.g. `mintmove.io` → `www.mintmove.io` or the opposite), that redirect is often 307. Use the **final** URL that does not redirect:
   - If the site is canonical at **www**: use `https://www.mintmove.io/api/cron/...`
   - If the site is canonical at **apex**: use `https://mintmove.io/api/cron/...`  
   Check in Vercel: Project → Settings → Domains to see which domain is primary.

3. **Or use the Vercel deployment URL**  
   To avoid custom-domain redirects, you can call the **Vercel URL** directly (no 307 from www/apex):
   - `https://YOUR_PROJECT.vercel.app/api/cron/reconcile-orders`  
   (Replace `YOUR_PROJECT` with your Vercel project name.)  
   Same for the other three cron paths. The app behaves the same; only the hostname changes.

4. **No trailing slash**  
   Use `.../api/cron/reconcile-orders` not `.../api/cron/reconcile-orders/`.

After changing the URL, run the cron job manually in cron-job.org to confirm it returns **200 OK** instead of 307.
