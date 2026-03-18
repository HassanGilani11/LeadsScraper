# Architectural Evaluation - B2B Lead Scraper SaaS

This document evaluates the current codebase against the newly provided GCP/Supabase backend and Static SPA frontend requirements.

## 🏁 Project Status: Gap Analysis

| Feature | Current State (Next.js 15) | Required State (Static SPA / GCP) | Gap / Action |
| :--- | :--- | :--- | :--- |
| **Framework** | Next.js 15 (App Router) | Static SPA (Vite/React, no Next.js) | **Critical Conflict**: Needs migration or Next.js `output: export`. |
| **Styling** | MUI (M3) + Tailwind | Tailwind CSS (Stitch output) | **Alignment**: High. Tailwind is ready; MUI can stay for M3 quality. |
| **Backend** | Mock Data | Supabase + GCP (Cloud Tasks) | **Missing**: Entire backend architecture. |
| **Real-time** | Manual Mock refresh | Supabase Real-time Subscriptions | **Missing**: Supabase SDK and hooks. |
| **Data Pipeline** | None | Gemini 2.5 Pro + Cloud Tasks | **Missing**: Scraping/Extraction workflow. |

---

## 🏗️ Backend & Data Pipeline (GCP + Supabase)

### 1. Supabase vs. PostgreSQL (Cloud SQL)
**Recommendation: Supabase.**
- **Why?** For an MVP aiming for <10,000 users, Supabase provides built-in Auth, Row Level Security (RLS), and Real-time listeners out of the box. Cloud SQL would require significant boilerplate for the REST/Real-time layers.

### 2. Queuing System
**Recommendation: Cloud Tasks.**
- **Why?** Unlike Pub/Sub, Cloud Tasks allows you to set specific URLs and control the rate of dispatch per-queue (useful for not overloading Gemini or target sites). It also handles individual task retries and exponential backoffs natively.

### 3. Handling Gemini API Rate Limits
- **Solution**: Set the Cloud Tasks queue `maxDispatchesPerSecond` to match the Gemini 2.5 Pro rate limit (e.g., if limit is 2 RPM, set queue to 1 dispatch per 30s).
- **Secondary**: Implement a 429 error handler in the extraction Cloud Function to trigger a Task retry with backoff.

### 4. Per-User Rate Limiting
- **Implementation**: Supabase Postgres Trigger + `usage_limits` table. 
- **Cheap & Simple**: On every lead creation attempt, a trigger checks if `count(leads_today) < plan_limit`. If exceeded, the insert is rejected at the DB level via RLS or Trigger (zero extra cost).

### 5. End-to-End Data Flow
1. **User**: Inputs 500 URLs in `/campaigns`.
2. **Frontend**: Sends URL list to a **GCP Cloud Function (Dispatch)**.
3. **Dispatch CF**: Creates 500 individual **Cloud Tasks** (Async).
4. **Cloud Task**: Triggers a **Scraper Cloud Function** (Rate-limited).
5. **Scraper CF**: Fetches HTML -> Sends to **Gemini 2.5 Pro** -> Receives JSON.
6. **Supabase**: Lead is saved to the `leads` table.
7. **Frontend**: Receives real-time update via Supabase Channel and displays lead.

---

## 💾 Proposed Supabase Schema

### Tables
1. **`profiles`**
   - `id`: `uuid (PK)` (references `auth.users`)
   - `email`: `text`
   - `plan_level`: `text` (default: 'starter')
   - `credits_used`: `int`
   - `updated_at`: `timestamp`

2. **`campaigns`**
   - `id`: `uuid (PK)`
   - `user_id`: `uuid` (FK to `profiles.id`)
   - `name`: `text`
   - `status`: `text` ('active', 'paused', 'completed')
   - `created_at`: `timestamp`

3. **`leads`**
   - `id`: `uuid (PK)`
   - `campaign_id`: `uuid` (FK to `campaigns.id`)
   - `url`: `text`
   - `company_name`: `text`
   - `email`: `text` (Optional)
   - `icp_score`: `int` (0-10)
   - `extra_data`: `jsonb`
   - `created_at`: `timestamp`

### Security Rules (RLS Overview)
- **Profiles**: `auth.uid() = id` (Allow READ/UPDATE).
- **Campaigns**: `auth.uid() = user_id` (Allow ALL).
- **Leads**: `campaign_id IN (SELECT id FROM campaigns WHERE user_id = auth.uid())` (Allow ALL).

---

## 💻 Frontend Architecture (M3 Static SPA)

### Folder Structure
```
/src
  /assets        # Images, Logos
  /components    # Reusable Atoms (Buttons, Cards, Modals)
  /hooks         # Supabase listeners, Auth state
  /pages         # Dashboard, Campaigns, Leads
  /store         # Zustand state configuration
  /utils         # CSV Export, Validations
  /theme         # MUI M3 design tokens
```

### State Management: Zustand 🐻
- **Why?** Lightweight, no Providers, easy to persist to LocalStorage, and handles async updates seamlessly.

### How to handle Real-time (Supabase Channel)
```javascript
useEffect(() => {
  const channel = supabase
    .channel('leads-channel')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leads' }, (payload) => {
      addLeadToStore(payload.new); // Local Zustand action
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel); // Prevent memory leaks
  };
}, [campaignId]);
```

### Auth Flow
- **Supabase Auth**: Use `supabase.auth.onAuthStateChange` to set a global `user` in Zustand.
- **Route Guards**: In the root component (or layout), check if `user` exists; if not, redirect to `/login`.

### Client-side CSV Export
- Use a utility like `json-2-csv` or a simple custom function that parses the Zustand `leads` array into a Blob and downloads it.

### Pagination
- Use `.range(start, end)` for simple limit/offset.
- For 10,000+, implement **Cursor-based Pagination** by tracking the `last_id` of the current view and fetching where `id > last_id` order by `id`.

---

## ⚠️ Recommended Redesign Step
Since current project uses **Next.js 15** and requirement is **Static SPA (no Next.js)**:
1. **Option A**: Continue with Next.js and use `output: 'export'` (simplest).
2. **Option B**: Pivot to **Vite** for the cleanest SPA bundle. 
**Decision needed from USER.**
