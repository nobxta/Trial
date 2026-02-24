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

## 2. Common settings for every cron job

For **each** cron job on cron-job.org:

1. **Request method:** GET or POST (both work).
2. **Request headers:** add one header:
   - **Name:** `Authorization`
   - **Value:** `Bearer YOUR_CRON_SECRET` (replace with your actual `CRON_SECRET`).
3. **Timeout:** Set to at least **60 seconds** for jobs that may run long (reconcile-orders, process-email-queue, update-exchange-limits). update-prices can use 30–60 s.
4. **Failure retries:** Optional (e.g. retry once after 1 minute).

Replace `YOUR_DOMAIN.com` below with your production domain (e.g. `mintmove.io` or `your-app.vercel.app`).

---

## 3. Cron jobs to create

Create **4 separate cron jobs** on cron-job.org with the following settings.

### Job 1: Reconcile orders (every 5 minutes)

| Setting   | Value |
|----------|--------|
| **Title** | `MintMove – Reconcile orders` |
| **URL**   | `https://YOUR_DOMAIN.com/api/cron/reconcile-orders` |
| **Schedule** | Every **5 minutes** (or cron `*/5 * * * *`) |
| **Timeout**  | **60 seconds** or more |

**What it does:** Webhook failure recovery (polls NOWPayments for stuck orders) and manual payout auto-complete. Idempotent; safe to run every 5 minutes.

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
| **Timeout**  | **120 seconds** or more (calls NOWPayments for many pairs) |

**What it does:** Refreshes min/max limits for all currency pairs from NOWPayments into the `exchange_limits` table.

---

## 4. Step-by-step on cron-job.org

1. Log in at [cron-job.org](https://cron-job.org).
2. Go to **Cronjobs** → **Create cronjob**.
3. For each of the 4 jobs above:
   - **Title:** as in the table.
   - **URL:** as in the table (with your domain).
   - **Schedule:** as in the table (every 5 min for reconcile; daily at given time for the others).
   - **Request method:** GET or POST.
   - **Request headers:** add `Authorization` with value `Bearer YOUR_CRON_SECRET`.
   - **Timeout:** as in the table.
4. Save and **enable** each cron job.

cron-job.org will call your URLs at the set times; your app validates `CRON_SECRET` and runs the job.

---

## 5. Logging and monitoring

- **reconcile-orders** and **process-email-queue** write success/failure to the `cron_runs` table and log structured JSON (e.g. `cron_request_received`, `cron_completed`). Check your host logs (e.g. Vercel Logs) for these messages.
- **update-prices** and **update-exchange-limits** do not write to `cron_runs`; check application logs for their output.

You can use cron-job.org's execution history and notifications to see if requests succeed or fail (e.g. 401 = wrong/missing `CRON_SECRET`; 500 = application error).
