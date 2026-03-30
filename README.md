# ⬡ PromptForge

> Turn your project idea into a structured sequence of IDE prompts. Just follow the playbook.

Made with ❤️ by **Sanket Belekar**

---

## What is PromptForge?

PromptForge takes a project description and generates a step-by-step **prompt playbook** — an ordered sequence of self-contained IDE prompts you paste into Cursor or VS Code. Each prompt references exact file paths and artifacts from prior steps, so your AI assistant always has full context.

No more copy-pasting half-baked prompts. No more lost context. Just follow the playbook.

---

## Features

| Feature | Description |
|---|---|
| **Playbook generation** | Gemini AI generates 8–20 ordered IDE prompts from your project brief |
| **Context-chaining** | Each prompt references prior step artifacts by name |
| **Dependency locking** | Steps unlock only when their dependencies are complete |
| **Error recovery** | Paste an error, get a precise corrective follow-up prompt (1 credit) |
| **Summary doc** | Generate a professional Markdown project summary (3 credits) |
| **Export** | Download playbook or summary as structured PDF or Markdown |
| **Wompus tracker** | Animated character runs a zigzag road with coins and checkpoints |
| **Galaxy UI** | Dark space theme with animated starfield, floating orbs, cursor trail |
| **Credit system** | FREE (10/mo), Starter (100/mo), Pro (unlimited) |
| **Stripe billing** | Checkout, portal, webhook-driven plan + credit updates |
| **OTP auth** | Email magic code via EmailJS — no passwords |
| **Google OAuth** | One-click sign-in with Google |

---

## Tech Stack

- **Framework** — Next.js 14 (App Router)
- **Language** — TypeScript
- **Styling** — Tailwind CSS
- **UI** — shadcn/ui, Radix UI, Framer Motion
- **Database** — PostgreSQL via Neon + Prisma ORM
- **Auth** — NextAuth.js v5 (Google OAuth + Email OTP)
- **AI** — Google Gemini API (`gemini-1.5-pro`)
- **Payments** — Stripe (subscriptions + webhooks)
- **Email** — EmailJS REST API
- **PDF export** — jsPDF (text-based, no canvas)

---

## Project Structure

```
promptforge/
├── app/
│   ├── (auth)/           # Login, signup, verify pages
│   ├── (dashboard)/      # Dashboard, playbook, account pages
│   ├── api/              # All API routes
│   │   ├── auth/         # NextAuth handler
│   │   ├── billing/      # Stripe checkout, portal, webhook
│   │   ├── credits/      # Credits balance + history
│   │   ├── email-otp/    # OTP send + verify
│   │   ├── playbook/     # Generate, patch, error recovery
│   │   ├── summary/      # Summary doc generate + fetch
│   │   └── account/      # Delete account
│   ├── globals.css       # Galaxy theme, keyframes, CSS vars
│   └── layout.tsx        # Root layout with galaxy bg, cursor trail
├── components/
│   ├── auth/             # OtpAuthForm
│   ├── billing/          # PricingCards
│   ├── dashboard/        # DashboardHeader
│   ├── landing/          # LandingPage
│   ├── playbook/         # PlaybookView, NewPlaybookForm, SummaryDocModal
│   ├── ui/               # Button, Toast
│   ├── wompus/           # WompusTracker, WompusLoader, WompusSvg
│   ├── cursor-trail.tsx  # Canvas cursor trail effect
│   ├── galaxy-background.tsx  # Animated starfield + orbs
│   └── page-transition.tsx    # Route progress bar + fade animation
├── lib/
│   ├── auth.ts           # NextAuth config + welcome credits
│   ├── credits.ts        # deductCredits, checkCredits, getCreditHistory
│   ├── db.ts             # Prisma client
│   ├── emailjs.ts        # Server-side EmailJS REST
│   ├── export.ts         # PDF + Markdown export
│   ├── gemini.ts         # generatePlaybook, generateErrorRecovery, generateSummaryDoc
│   ├── stripe.ts         # Stripe client + PLANS config
│   └── store/playbook.ts # Zustand playbook store
└── prisma/
    └── schema.prisma     # User, Playbook, SummaryDoc, CreditLog, OtpCode
```

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Copy `.env.local` and fill in all values:

```env
# Database (PostgreSQL — Neon recommended)
DATABASE_URL=""

# Auth
AUTH_SECRET=""                        # openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# AI
GEMINI_API_KEY=""                     # aistudio.google.com

# Stripe
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""
STRIPE_STARTER_PRICE_ID=""           # price_xxx from Stripe dashboard
STRIPE_PRO_PRICE_ID=""
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=""

# EmailJS
EMAILJS_SERVICE_ID=""
EMAILJS_TEMPLATE_ID=""
EMAILJS_PUBLIC_KEY=""
```

### 3. Push the database schema

```bash
npx prisma db push
```

### 4. Set up Stripe webhook (local dev)

```bash
stripe listen --forward-to localhost:3000/api/billing/webhook
```

Copy the `whsec_...` secret into `STRIPE_WEBHOOK_SECRET`.

Make sure these events are enabled on your webhook endpoint:
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`

### 5. Set up EmailJS template

In your EmailJS dashboard, create a template with these variables:
- `{{to_email}}` — recipient address
- `{{to_name}}` — display name
- `{{otp_code}}` — 6-digit code

### 6. Add Wompus animation frames

Place your 51 PNG frames at:
```
public/wompus-frames/ezgif-frame-001.png
public/wompus-frames/ezgif-frame-002.png
...
public/wompus-frames/ezgif-frame-051.png
```

### 7. Run the dev server

```bash
npm run dev
```

App runs at `http://localhost:3000`.

---

## Credit System

| Action | Cost |
|---|---|
| Generate playbook | 10 credits |
| Error recovery prompt | 1 credit |
| Summary doc | 3 credits |

| Plan | Monthly credits |
|---|---|
| Free | 10 |
| Starter ($9/mo) | 100 |
| Pro ($24/mo) | Unlimited |

New users receive **10 welcome credits** on signup (any auth method).

---

## API Routes

| Route | Method | Description |
|---|---|---|
| `/api/email-otp` | POST | Send or verify OTP |
| `/api/playbook` | POST | Generate new playbook (10 credits) |
| `/api/playbook` | PATCH | Mark step complete/incomplete |
| `/api/playbook/recover` | POST | Generate error fix prompt (1 credit) |
| `/api/summary` | POST | Generate summary doc (3 credits, Starter+) |
| `/api/summary` | GET | Fetch existing summary doc |
| `/api/credits` | GET | Get balance + history |
| `/api/billing` | POST | Create Stripe checkout or portal session |
| `/api/billing/webhook` | POST | Handle Stripe events |
| `/api/account` | DELETE | Delete account + cancel subscriptions |

---

## License

MIT — build whatever you want with it.
