# IHGST Portal — In-House Goal Setting & Tracking

> A Smart, Role-Based Performance Management Platform for Enterprise Goal Lifecycle Management

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel)](https://ihgst-portal.vercel.app)
[![Next.js 16](https://img.shields.io/badge/Next.js-16.2.6-black?logo=next.js)](https://nextjs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green?logo=mongodb)](https://www.mongodb.com/atlas)
[![React 19](https://img.shields.io/badge/React-19.2.4-blue?logo=react)](https://react.dev)

---

## 📑 Table of Contents

- [🏗️ Architecture](#️-architecture)
- [👥 Roles & Permissions](#-roles--permissions)
- [🔄 Goal Lifecycle Workflow](#-goal-lifecycle-workflow)
- [⚡ Escalation Engine](#-escalation-engine)
- [📊 Business Rules & Validations](#-business-rules--validations)
- [🛡️ Reliability & Observability (Enterprise-Grade)](#️-reliability--observability-enterprise-grade)
- [📉 Performance & Cost Optimization](#-performance--cost-optimization)
- [🗄️ Database Schema](#️-database-schema)
- [🛠️ Tech Stack](#️-tech-stack)
- [📁 Project Structure](#-project-structure)
- [🚀 Getting Started](#-getting-started)
- [🔐 Demo Credentials](#-demo-credentials)
- [📡 API Endpoints](#-api-endpoints)
- [✅ Key Features & BRD Adherence](#-key-features--brd-adherence)
- [🏁 Deployment](#-deployment)
- [📝 License](#-license)

---

## 🏗️ Architecture

![IHGST Portal Architecture Diagram](./Architure%20diagram.png)

The portal follows a **three-layer architecture**:

| Layer | Technology | Responsibility |
|---|---|---|
| **Client (Frontend)** | Next.js App Router + React 19 | UI rendering, routing, client-side state. Hosted on Vercel Edge. |
| **Application (Backend)** | Next.js API Routes | Business logic, auth, validation (Zod), data aggregation. Serverless functions for high scalability and zero idle cost. |
| **Data** | MongoDB Atlas + Mongoose | Persistent storage across 9 collections. Compound indexes prevent duplicates, reducing DB load. |

---

## 👥 Roles & Permissions

### Employee
| Feature | Path | Description |
|---|---|---|
| Dashboard | `/dashboard` | Personal stats, quarterly progress (Q1–Q4), pending actions |
| My Goals | `/goals` | View, create, edit, and submit goals for manager review |
| Create Goal | `/goals/create` | Set thrust area, UoM, target, weightage (10–100%) |
| Goal Detail | `/goals/[id]` | Edit goal fields, view audit trail, manager feedback |
| Check-ins | `/checkin` | Submit quarterly achievements (Q1–Q4) with self-assessment |
| Analytics | `/analytics` | Personal goal distribution, quarterly trends, progress charts |

### Manager
All Employee features, plus:

| Feature | Path | Description |
|---|---|---|
| Team Review | `/manager` | View team goal sheets, approve/reject/return with comments |
| Employee Review | `/manager/review/[id]` | Deep-dive into individual employee's goals, progress, check-ins |
| Assign KPIs | `/manager/kpi` | Push shared KPIs to team — locked title/target, editable weightage |
| Team Check-ins | `/manager/checkins` | Review and comment on team's quarterly check-in submissions |
| Team Analytics | `/analytics?scope=team` | Team-wide performance charts, department completion rates |
| Personal Analytics | `/analytics?scope=personal` | Manager's own KPI progress |

### Admin
All Manager features, plus:

| Feature | Path | Description |
|---|---|---|
| Admin Panel | `/admin` | System overview — stats, escalation cards, management hub |
| User Management | `/admin/users` | Create, edit, deactivate users, assign roles and managers |
| Cycle Management | `/admin/cycles` | Configure financial year cycles (FY dates, Q1–Q4 windows) |
| Reports | `/admin/reports` | Export goal data as CSV/Excel, email delivery via Nodemailer |
| Audit Log | `/admin/audit` | Immutable change history — who modified what and when |
| **Escalation Dashboard** | **`/admin/escalations`** | **Monitor overdue actions, filter by type/level/status, dismiss, trigger engine manually** |
| Goal Approvals | `/manager` | Org-wide goal sheet approval (same as Manager view) |
| Org Analytics | `/analytics` | Organization-wide performance dashboard |

---

## 🔄 Goal Lifecycle Workflow
![Goal Lifecycle Workflow Diagram](./Goal%20Cycle.png)

1. **Create** → Employee sets goals with thrust area, UoM, target, weightage
2. **Submit** → Goal sheet sent to Manager for review
3. **Review** → Manager can Approve, Return (with feedback), or Edit weightage
4. **Approved** → Goals are locked. Employee begins quarterly check-ins
5. **Check-in** → Every quarter (Q1–Q4), employee reports actual achievements
6. **Analytics** → Progress calculated automatically, available to all roles

---

## ⚡ Escalation Engine

The portal includes a **continuous workflow escalation system** that automatically detects overdue actions and notifies the right stakeholders — without any manual intervention.

### How it works

```
Cycle Active
      ↓
Cron Runs Every 6 Hours  (Vercel Cron / manual trigger)
      ↓
System Checks Deadlines
      ↓
Create Escalation (if not already active)
      ↓
Send In-App Notification + Email
      ↓
Write Audit Log Entry
      ↓
Show in Admin Escalation Dashboard
      ↓
Auto-Resolve When Action Completed
```

### Escalation Types

| Type | Trigger Condition |
|---|---|
| `GOAL_SUBMISSION` | Employee's goals still in Draft N days after cycle opens |
| `GOAL_APPROVAL` | Manager has not approved a Submitted goal sheet within N days |
| `CHECKIN_PENDING` | Employee has no check-in for the active quarter after N days |

### Severity Levels

| Level | Color | Who is notified |
|---|---|---|
| **L1** | 🟡 Yellow | Employee — reminder to take action (In-app + Email) |
| **L2** | 🟠 Orange | Manager — action overdue escalation (In-app + Email) |
| **L3** | 🔴 Red | HR / Admin — critical threshold exceeded (In-app + Email) |

### Auto-Resolution

Escalations **automatically resolve** (no admin action needed) when:
- Employee submits their goals → `GOAL_SUBMISSION` resolved
- Manager approves goal sheet → `GOAL_APPROVAL` resolved
- Employee saves a check-in → `CHECKIN_PENDING` resolved

### Duplicate Prevention

A compound index on `{ userId, cycleId, type, level, status }` ensures a new escalation is only created when no `ACTIVE` record for the same condition already exists — preventing notification spam.

### Manual Trigger & Export (Demo)

Admins can trigger the engine on-demand from the Escalation Dashboard without waiting for the 6-hour cron:

```http
POST /api/admin/escalations/trigger
```

Admins can also generate a downloadable Excel report of all escalations or have it emailed directly to stakeholders via the integrated `Nodemailer` export feature.

---

## 📊 Business Rules & Validations

| Rule | Description |
|---|---|
| **Weightage = 100%** | Total weightage across all goals must equal exactly 100% |
| **Min 10% per goal** | Each goal must carry at least 10% weightage |
| **Max 8 goals** | A maximum of 8 goals per cycle per user |
| **Lock on Approval** | Approved goals cannot be edited (only Admin can unlock) |
| **Quarter Locking** | Only the active quarter is editable; past/future quarters are locked |
| **KPI Uniqueness** | Shared KPIs cannot be duplicated per user |
| **Approval Flow** | Goals must be approved before check-ins can be submitted |

---

## 🛡️ Reliability & Observability (Enterprise-Grade)

To ensure maximum reliability without complex overhead, the system implements robust built-in monitoring and data validation:

- **Cron Engine History (`CronLog`)**: Every automated run of the escalation engine is recorded with execution duration (ms), trigger source (GitHub Actions vs Manual), success/failure status, and detailed error logs.
- **Immutable Audit Logging (`AuditLog`)**: Complete historical tracking of who changed what and when, across users, goals, cycles, and escalations.
- **Strict Data Validation**: Zod schemas strictly validate all incoming API requests (e.g., ensuring weightages always equal 100%, targets are valid numbers).
- **Graceful Error Handling**: A centralized `handleApiError` middleware catches all server exceptions, returning standard HTTP codes, while the frontend's `safeFetch` wrapper prevents UI crashes on network failures.

---

## 📉 Performance & Cost Optimization

The architecture is explicitly designed to maximize efficiency and minimize hosting costs, achieving enterprise scale on free/hobby tiers:

- **Zero-Cost Serverless**: Next.js API routes deployed on Vercel scale to zero when idle. 
- **Free GitHub Actions Cron**: Instead of paying for premium scheduled jobs, the escalation engine is triggered via a free GitHub Actions workflow and runs once in every 6 hours.
- **Query Optimization (`.lean()`)**: All Mongoose read operations (dashboards, exports, analytics) use `.lean()` to bypass heavy Mongoose Document hydration, returning raw JSON. This drastically reduces memory usage and execution time.
- **Compound Indexes**: Database indexes (e.g., `{ userId: 1, cycleId: 1, type: 1 }` on Escalations) enforce uniqueness at the database level, preventing race conditions and reducing complex JS-side deduplication logic.

---

## 🗄️ Database Schema

9 MongoDB collections managed via Mongoose ODM:

| Collection | Key Fields | Purpose |
|---|---|---|
| `users` | name, email, role, department, managerId | User accounts with hierarchy |
| `goals` | userId, thrustArea, title, uom, target, weightage, achievements[] | Individual KPIs with per-quarter data |
| `goalsheets` | userId, cycleId, status, comments[] | Per-user per-cycle submission envelope |
| `cycles` | name, quarters[], isActive | FY cycles with Q1–Q4 date ranges |
| `checkins` | goalId, userId, quarter, achievement | Quarterly self-assessment entries |
| `auditlogs` | entityType, action, changedBy, description | Immutable change history |
| `notifications` | userId, type, title, message, read | In-app notification feed |
| `exportlogs` | userId, format, status | Report export tracking |
| `escalations` | userId, cycleId, type, level, status, message, triggeredAt, resolvedAt | Workflow escalation records |

---

## 🛠️ Tech Stack

| Layer | Technology | Version | Why |
|---|---|---|---|
| **Framework** | Next.js (App Router) | 16.2.6 | Full-stack React framework with API routes, SSR, Turbopack |
| **UI Library** | React | 19.2.4 | Component-based UI with hooks, `use()` for async params |
| **Database** | MongoDB Atlas | Cloud | Flexible schema for mixed-type targets, nested arrays |
| **ODM** | Mongoose | 9.6.2 | Schema validation, model definitions, query builder |
| **Auth** | NextAuth.js | 4.24.14 | JWT sessions, Credentials provider, role-based access |
| **Password** | bcryptjs | 3.0.3 | Salted bcrypt hashing for secure credentials |
| **Charts** | Recharts | 3.8.1 | PieChart, BarChart for analytics dashboards |
| **Animation** | Framer Motion | 12.38.0 | Page transitions, staggered card animations |
| **Icons** | Lucide React | 1.16.0 | 50+ consistent SVG icons |
| **Styling** | Vanilla CSS | — | Custom dark theme, glassmorphism, CSS custom properties |
| **Email** | Nodemailer | 7.0.13 | SMTP transport for exported reports |
| **Excel** | xlsx (SheetJS) | 0.18.5 | CSV/XLSX file generation for reports |
| **Validation** | Zod | 4.4.3 | Schema-based request body validation |
| **Hosting** | Vercel | — | Zero-config deployment, edge functions, auto-HTTPS |

---

## 📁 Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (dashboard)/              # Route group — shared sidebar + header layout
│   │   ├── dashboard/            # Main dashboard with stat cards + quarterly progress
│   │   ├── goals/                # Goal CRUD (list, create, detail/edit)
│   │   ├── checkin/              # Quarterly check-in interface
│   │   ├── analytics/            # Interactive charts (personal, team, org)
│   │   ├── manager/              # Team review, KPI assignment, check-in review
│   │   │   ├── review/[employeeId]  # Individual employee goal review
│   │   │   ├── kpi/              # Shared KPI management
│   │   │   └── checkins/         # Team check-in review
│   │   └── admin/                # User, cycle, report, audit, escalation management
│   │       └── escalations/      # Escalation dashboard (filter, severity table, timeline)
│   ├── api/                      # REST API route handlers
│   │   ├── auth/                 # NextAuth.js authentication
│   │   ├── dashboard/            # Dashboard stats + drill-down detail
│   │   ├── goals/                # Goal CRUD + individual operations
│   │   ├── checkins/             # Quarterly check-in submissions
│   │   ├── analytics/            # Aggregated analytics data
│   │   ├── manager/              # Approval workflow
│   │   ├── kpi/                  # KPI assignment
│   │   ├── export/               # CSV/Excel report generation
│   │   ├── notifications/        # In-app notifications
│   │   ├── cron/
│   │   │   └── escalations/      # Scheduled escalation engine (Vercel Cron, every 6h)
│   │   └── admin/                # Users, cycles, reports, audit
│   │       └── escalations/      # Escalation list, stats, dismiss, manual trigger
│   ├── login/                    # Standalone login page
│   ├── unauthorized/             # 403 — animated access denied
│   ├── not-found.js              # 404 — animated page not found
│   ├── error.js                  # 500 — animated error boundary
│   └── page.js                   # Landing page with demo credentials
├── components/
│   ├── layout/                   # Sidebar, Header, BottomNav
│   └── ui/                       # CustomDropdown, DatePicker, Toast, Skeletons
├── lib/                          # Shared utilities
│   ├── db.js                     # MongoDB connection singleton
│   ├── progress.js               # Goal progress calculation engine
│   ├── mailer.js                 # Nodemailer SMTP config
│   ├── apiError.js               # Standardized API error responses
│   ├── resolveEscalations.js     # Auto-resolve helper (called on submit/approve/check-in)
│   ├── safeFetch.js              # Error-resilient fetch wrapper
│   └── useDataFetcher.js         # React hook for API data + loading states
├── models/                       # 9 Mongoose schemas
│   └── Escalation.js             # Escalation schema (type, level, status, audit fields)
├── proxy.js                      # Route protection middleware (Next.js 16 convention)
├── vercel.json                   # Vercel cron schedule configuration
└── scripts/                      # Database seeding (seed.js, seed-past-year.js, seed-current-year.js)
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB Atlas cluster (or local MongoDB)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/Techy-Play/ihgst-portal.git
cd ihgst-portal

# Install dependencies
npm install

# Configure environment
cp .env.local.example .env.local
# Edit .env.local with your MongoDB URI and NextAuth secret
```

### Environment Variables(*for hosting locally)

```env
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/ihgst
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000

# Optional — secures the Vercel cron endpoint
CRON_SECRET=your-random-cron-secret

# Optional — enables email notifications and escalation alerts
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=IHGST Portal <noreply@ihgst.com>
```

### Database Seeding

```bash
# Seed users, cycles, goals, check-ins, and audit logs
npm run seed
```

This creates:
- **6 users**: 1 Admin, 2 Managers, 3 Employees
- **2 cycles**: FY 2025-26 (past), FY 2026-27 (active)
- **35 goals** with realistic data across both cycles
- **80+ check-ins** and **115+ audit log** entries

### Run Development Server

```bash
npm run dev
# Open http://localhost:3000
```

---

## 🔐 Demo Credentials

| Role | Name | Email | Password |
|---|---|---|---|
| **Admin** | Admin User | admin@ihgst.com | Admin@123 |
| **Manager** | Rahul Sharma | manager@ihgst.com | Manager@123 |
| **Manager** | Anita Desai | manager2@ihgst.com | Manager@123 |
| **Employee** | Priya Patel | employee1@ihgst.com | Employee@123 |
| **Employee** | Amit Kumar | employee2@ihgst.com | Employee@123 |
| **Employee** | Sneha Gupta | employee3@ihgst.com | Employee@123 |

### Team Hierarchy
```
Admin User (HR)
├── Rahul Sharma (Manager, Engineering)
│   ├── Priya Patel (Employee)
│   └── Amit Kumar (Employee)
└── Anita Desai (Manager, Marketing)
    └── Sneha Gupta (Employee)
```

---

## 📡 API Endpoints

| Endpoint | Methods | Auth | Description |
|---|---|---|---|
| `/api/auth/[...nextauth]` | GET, POST | Public | Authentication (login, session, CSRF) |
| `/api/dashboard` | GET | All | Role-aware dashboard stats + quarterly progress |
| `/api/dashboard/detail` | GET | All | Drill-down employee lists for stat popups |
| `/api/goals` | GET, POST | All | Goal list (filtered by role) and creation |
| `/api/goals/[id]` | GET, PUT, DELETE | Owner/Admin | Individual goal operations |
| `/api/goals/submit` | POST | Employee | Submit goal sheet for review (triggers escalation resolve) |
| `/api/analytics` | GET | All | Aggregated analytics (status, thrust, quarterly) |
| `/api/checkins` | GET, POST | All | Quarterly check-in read/write (triggers escalation resolve) |
| `/api/manager/review` | POST | Manager/Admin | Goal sheet approve/return (triggers escalation resolve) |
| `/api/kpi` | GET, POST, PUT | Manager/Admin | Shared KPI management |
| `/api/export` | POST | Admin | CSV/Excel report generation + email |
| `/api/notifications` | GET, PATCH, DELETE | All | Notification feed, mark-as-read, clear |
| `/api/admin/users` | GET, POST, PUT, DELETE | Admin | User CRUD |
| `/api/admin/cycles` | GET, POST, PUT | Admin | Cycle/quarter configuration |
| `/api/admin/reports` | GET | Admin | Reporting dashboard data |
| `/api/admin/audit` | GET | Admin | Audit log viewer |
| `/api/admin/escalations` | GET, PATCH | Admin | List escalations (filtered) + dismiss |
| `/api/admin/escalations/stats` | GET | Admin | Aggregated escalation counts for dashboard cards |
| `/api/admin/escalations/trigger` | POST | Admin | Manually run the escalation engine |
| `/api/cron/escalations` | GET | Cron secret | Vercel cron endpoint — runs every 6 hours |

---

## ✅ Key Features & BRD Adherence

The system fully implements all mandatory BRD requirements from both phases, plus several enterprise-grade "Good-to-Have" features:

### 1. Extremely Complete Workflow Coverage
- **🎯 Quarterly Goal Setting** — Goals with thrust areas, UoM types (Numeric, Percentage, Timeline, Zero), targets, and weighted KPIs.
- **✅ Approval Workflow** — Manager review with inline edit, approve, return with comments.
- **🔄 Quarterly Check-ins** — Track actual vs. planned across Q1–Q4 with automated progress calculation.
- **⚡ Automated Goal Completion** — Server-side logic automatically transitions goal status to `"Completed"` once progress reaches 100%.
- **🏛️ Enterprise Cycle Lifecycle Management** — Robust closure validation checking for pending check-ins, unapproved goals, and incomplete KPIs before allowing administrative cycles to close. Supports active, incomplete, and archived cycle states.

### 2. Escalation & Governance (Good-to-Have)
- **🚨 Automated Escalation Engine** — Continuous cron-driven workflow escalation system that detects overdue goal submissions, pending approvals, and missing check-ins.
- **📧 Multi-Channel Alerts** — Notifies employees, managers, and admins at escalating severity levels (L1→L2→L3) via both in-app alerts and integrated **Nodemailer** direct email.
- **🔍 Escalation Governance Dashboard** — High-density 3-column responsive layout with 7-Day Trend analysis, Hotspot Departments breakdown, dynamic compliance rates, row-level deep links, and an integrated "All Notifications" styled slide-out Detail Drawer.

### 3. Analytics & Reporting
- **📊 Real-time Analytics** — PieCharts, BarCharts for goal distribution, quarterly trends, department comparisons.
- **🔗 Shared KPIs** — Organization-wide KPIs pushed by Admin/Manager — locked title, editable weightage.
- **🧠 Intelligent KPI Rebalancing** — When a user is removed from a shared KPI, the system safely rolls back the user's overall state and weightage to precisely what it was before the KPI was assigned, maintaining data integrity.
- **📧 Report Export** — CSV/Excel (`xlsx`) generation with email delivery to stakeholders.

### 4. Enterprise UX & Deep-Linking (User Friendliness)
- **💎 Premium Analytics UI** — Dashboard KPI cards upgraded with glassmorphism, responsive grid scaling, hover animations, and integrated icons to match an enterprise-grade aesthetic.
- **🔗 Goal Deep-linking & Highlighting** — A contextual `"Go to Check-ins"` button on Goal Details navigates to check-ins, auto-scrolls to the target goal, and applies a prominent visual highlight glow animation.
- **💬 Collapsible Quarter-specific Discussions** — Check-ins feature collapsible notes boards tagged specifically by quarter (Q1–Q4). General discussions can be tagged with quarters in the Goal Details view with interactive filter tabs.
- **👨‍💼 Live Manager Feedback Banners** — Real-time display of the latest top-level manager comments from the Discussion board directly on check-in cards.
- **🔒 Deep-Linked Archival Integrity** — Past cycles become strictly read-only with persistent URL state parameters across Check-in views, Analytics dashboards, and Goal Details.

---

## 🏁 Deployment

The portal is deployed on **Vercel** with deployments from the current `main` branch:

```url
https://ihgst-portal.quest
```

---

## 📝 License

Built for the **Atomberg Hackathon** — AtomQuest.

© 2026 IHGST Portal. All rights reserved.
