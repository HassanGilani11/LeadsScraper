# Leads Scraper 🚀

**Leads Scraper** is a high-performance AI-powered platform designed for strategic lead extraction, automated scoring, and campaign management. Built for growth, it combines modern web technologies with advanced AI to streamline the sales pipeline.

## ✨ Core Features

-   🤖 **AI-Driven Lead Extraction**: Leverages Google Gemini via Supabase Edge Functions for intelligent data parsing.
-   🎯 **Campaign Management**: Organize leads into targeted campaigns with real-time status tracking.
-   👨‍💻 **Admin User Management**: Complete admin control over users including Impersonation, Banning, and Invite creation.
-   ⚖️ **Why Us Comparison Engine**: A dedicated, data-driven comparison section highlighting our 99.8% verification accuracy over traditional tools.
-   📊 **Interactive Dashboard**: Modern analytics overview with global search and notification systems.
-   💳 **Tiered Subscriptions**: Full Stripe integration supporting Pro ($19/mo) and Enterprise ($79/mo) plans.
-   🔐 **Enterprise-Grade Security**: Secure authentication and custom profile management powered by Supabase.
-   🔔 **Notification System**: Integrated alert system for extractions, billing, and system updates.

## 🛠️ Tech Stack

-   **Frontend**: [React 19](https://react.dev/), [Vite](https://vitejs.dev/), [TypeScript](https://www.typescriptlang.org/)
-   **Styling**: [Tailwind CSS 4.0](https://tailwindcss.com/) (using the new `@tailwindcss/vite` plugin)
-   **Backend & Auth**: [Supabase](https://supabase.com/) (Auth, PostgreSQL, Edge Functions)
-   **State Management**: [Zustand](https://github.com/pmndrs/zustand)
-   **Icons**: [Lucide React](https://lucide.dev/)
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

# Set secrets
supabase secrets set GEMINI_API_KEY=your_key
supabase secrets set STRIPE_SECRET_KEY=your_key
```

## 📝 License

This project is private and intended for specific commercial use.

---

Built with ❤️ by the Leads Scraper Team.
