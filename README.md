# Lead Intelligence Platform 🚀
> **Professional Lead Extraction, Technographic Detection & Sales Automation**

**Lead Intelligence Platform** (formerly Leads Scraper) is a high-performance enterprise-grade solution designed for strategic data extraction, automated enrichment, and AI-driven growth. Built for the modern sales pipeline, it combines deep business intelligence with high-end motion design.

## ✨ Core Features

-   📊 **Revenue Metrics Dashboard**: High-fidelity administrative tracking for MRR, Churn rates, and Subscription lifecycle events with automated growth projections.
-   🛡️ **Data Quality Monitoring**: Live lead hygiene monitoring dashboard featuring enrichment hit rates (Job Title, LinkedIn, Phone, etc.) and deep duplication trend analysis.
-   ✨ **Premium Motion UI**: Integrated **Framer Motion** for a high-end, responsive experience featuring scroll-triggered reveals and staggered entry animations.
-   🤖 **Advanced Extraction Engine [v3]**: High-performance technographic detection (40+ signatures including Next.js, Shopify, WordPress) and deep SEO metadata extraction.
-   📊 **Smart Leads Management**: High-performance interactive table featuring **Sticky Columns**, fluid horizontal scrolling, and a comprehensive details view for **25+ Data Points**.
-   📧 **Bulk Email & Personalization**: Integrated rich-text editor (Tiptap) with automated **Merge Tags** and real-time delivery tracking via SMTP.
-   🏷️ **Social Discovery**: Automated discovery of LinkedIn, Twitter, Facebook, and Instagram profiles for every extracted lead.
-   🛠️ **Professional UI Architecture**: Standardized stacking context with **z-[9999] layer isolation** for all modals, ensuring a flicker-free, overlap-proof administrative experience.

## 🛠️ Tech Stack

-   **Frontend**: [React 19](https://react.dev/), [Vite](https://vitejs.dev/), [TypeScript](https://www.typescriptlang.org/)
-   **Animations**: [Framer Motion](https://www.framer.com/motion/)
-   **Styling**: [Tailwind CSS 4.0](https://tailwindcss.com/)
-   **Charts**: [Recharts](https://recharts.org/) (High-performance visualizations)
-   **Backend & Auth**: [Supabase](https://supabase.com/) (Auth, PostgreSQL, Edge Functions)
-   **AI Engine**: Proprietary [Advanced Extraction Engines]
-   **Payments**: [Stripe](https://stripe.com/)

## 🚀 Getting Started

### Prerequisites

-   Node.js (LTS recommended)
-   npm or yarn
-   Supabase CLI (for backend deployment)

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/your-username/leads-scraper.git
    cd leads-scraper
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Environment Setup**:
    Create a `.env` file in the root directory and add your credentials:
    ```env
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

4.  **Run Development Server**:
    ```bash
    npm run dev
    ```

## 🏗️ Backend Deployment (Supabase)

The project includes several Supabase Edge Functions for AI processing and payment verification.

```bash
# Link your project
supabase link --project-ref your-project-id

# Deploy Edge Functions
supabase functions deploy extract-leads
supabase functions deploy stripe-webhook
supabase functions deploy create-checkout-session
supabase functions deploy verify-payment
supabase functions deploy admin-create-user
supabase functions deploy send-bulk-email

# Set secrets
supabase secrets set GEMINI_API_KEY=your_key
supabase secrets set STRIPE_SECRET_KEY=your_key
supabase secrets set STRIPE_WEBHOOK_SECRET=your_key
supabase secrets set STRIPE_PRO_PRICE_ID=your_key
supabase secrets set STRIPE_ENTERPRISE_PRICE_ID=your_key
supabase secrets set APP_URL=your_app_url
supabase secrets set RESEND_API_KEY=your_key
supabase secrets set SMTP_HOST=your_host
supabase secrets set SMTP_PORT=your_port
supabase secrets set SMTP_USER=your_user
supabase secrets set SMTP_PASS=your_pass
supabase secrets set SMTP_FROM_NAME=your_name

# Database Migrations
# Ensure you run the audit_logs migration for the dashboard to function
supabase migration up 
```

## 📝 License

This project is private and intended for specific commercial use.

---

Built with ❤️ by the Leads Scraper Team.
