# Leads Scraper 🚀

**Leads Scraper** is a high-performance AI-powered platform designed for strategic lead extraction, automated scoring, and campaign management. Built for growth, it combines modern web technologies with advanced AI to streamline the sales pipeline.

## ✨ Core Features

-   📊 **Revenue Metrics Dashboard**: High-fidelity administrative tracking for MRR, Churn rates, and Subscription lifecycle events with automated growth projections.
-   🛡️ **Data Quality Monitoring**: Live lead hygiene monitoring dashboard featuring enrichment hit rates (Job Title, LinkedIn, Phone, etc.) and deep duplication trend analysis.
-   📈 **Usage Analytics**: Real-time tracking of platform activity, daily active users, credit consumption patterns, and plan distribution.
-   ⚙️ **Global Site Settings**: Real-time white-labeling and branding with dynamic Favicons, Site Titles, and automated SEO Meta Descriptions.
-   🤖 **AI-Powered Lead extraction [v2]**: Leverages Gemini 2.5 Flash for deep enrichment, capturing Job Titles, Phone numbers, LinkedIn profiles, and Company sizes with intelligent fallback logic.
-   🛡️ **Admin Audit Logs**: Comprehensive historical tracking of all administrative actions with interactive timeline and detailed change diffs.
-   🎯 **Campaign Management**: Organize leads into targeted campaigns with automated scoring and status tracking.
-   💳 **Tiered Subscriptions**: Secure Stripe integration supporting Starter, Pro, and Enterprise tiers.
-   📱 **Fully Responsive Layouts**: Pixel-perfect mobile optimizations with adaptive sidebars and fluid dashboard components.

## 🛠️ Tech Stack

-   **Frontend**: [React 19](https://react.dev/), [Vite](https://vitejs.dev/), [TypeScript](https://www.typescriptlang.org/)
-   **Styling**: [Tailwind CSS 4.0](https://tailwindcss.com/)
-   **Charts**: [Recharts](https://recharts.org/) & [Chart.js](https://www.chartjs.org/) (High-performance line, donut, and bar visualizations)
-   **Backend & Auth**: [Supabase](https://supabase.com/) (Auth, PostgreSQL, Edge Functions)
-   **State Management**: [Zustand](https://github.com/pmndrs/zustand)
-   **AI Engine**: [Google Gemini 2.5 Flash](https://ai.google.dev/)
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
