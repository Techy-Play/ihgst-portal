# IHGST Portal — In-House Goal Setting & Tracking

> A Smart, Role-Based Performance Management Platform for Enterprise Goal Lifecycle Management

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel)](https://ihgst-portal.vercel.app)
[![Next.js 16](https://img.shields.io/badge/Next.js-16.2.6-black?logo=next.js)](https://nextjs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green?logo=mongodb)](https://www.mongodb.com/atlas)
[![React 19](https://img.shields.io/badge/React-19.2.4-blue?logo=react)](https://react.dev)

---

## 🏗️ Architecture

![IHGST Portal Architecture Diagram](./Architure%20diagram.png)

The portal follows a **three-layer architecture**:

| Layer | Technology | Responsibility |
|---|---|---|
| **Client (Frontend)** | Next.js App Router + React 19 | UI rendering, routing, client-side state |
| **Application (Backend)** | Next.js API Routes | Business logic, auth, validation, data aggregation |
| **Data** | MongoDB Atlas + Mongoose | Persistent storage across 8 collections |

### Data Flow
```
User → Browser → Next.js App Router → API Route → Mongoose → MongoDB Atlas
                      ↑                    ↓
                  Session (JWT)      Business Rules
                  via NextAuth       & Validation
```

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
| Admin Panel | `/admin` | System overview and configuration hub |
| User Management | `/admin/users` | Create, edit, deactivate users, assign roles and managers |
| Cycle Management | `/admin/cycles` | Configure financial year cycles (FY dates, Q1–Q4 windows) |
| Reports | `/admin/reports` | Export goal data as CSV/Excel, email delivery via Nodemailer |
| Audit Log | `/admin/audit` | Immutable change history — who modified what and when |
| Goal Approvals | `/manager` | Org-wide goal sheet approval (same as Manager view) |
| Org Analytics | `/analytics` | Organization-wide performance dashboard |

---

## 🔄 Goal Lifecycle Workflow

```
┌──────────┐     ┌───────────┐     ┌──────────────┐     ┌──────────┐
│  CREATE   │────▶│  SUBMIT   │────▶│   MANAGER    │────▶│ APPROVED │
│  (Draft)  │     │(Submitted)│     │   REVIEWS    │     │ (Locked) │
└──────────┘     └───────────┘     └──────┬───────┘     └────┬─────┘
                                          │                   │
                                   ┌──────▼───────┐   ┌──────▼──────┐
                                   │   RETURNED   │   │  QUARTERLY  │
                                   │  (Rework)    │   │  CHECK-INS  │
                                   └──────────────┘   └─────────────┘
```

1. **Create** → Employee sets goals with thrust area, UoM, target, weightage
2. **Submit** → Goal sheet sent to Manager for review
3. **Review** → Manager can Approve, Return (with feedback), or Edit weightage
4. **Approved** → Goals are locked. Employee begins quarterly check-ins
5. **Check-in** → Every quarter (Q1–Q4), employee reports actual achievements
6. **Analytics** → Progress calculated automatically, available to all roles

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

## 🗄️ Database Schema

8 MongoDB collections managed via Mongoose ODM:

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
│   │   └── admin/                # User, cycle, report, audit management
│   ├── api/                      # 15 REST API route handlers
│   │   ├── auth/                 # NextAuth.js authentication
│   │   ├── dashboard/            # Dashboard stats + drill-down detail
│   │   ├── goals/                # Goal CRUD + individual operations
│   │   ├── checkins/             # Quarterly check-in submissions
│   │   ├── analytics/            # Aggregated analytics data
│   │   ├── manager/              # Approval workflow
│   │   ├── kpi/                  # KPI assignment
│   │   ├── export/               # CSV/Excel report generation
│   │   ├── notifications/        # In-app notifications
│   │   └── admin/                # Users, cycles, reports, audit
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
│   ├── safeFetch.js              # Error-resilient fetch wrapper
│   └── useDataFetcher.js         # React hook for API data + loading states
├── models/                       # 8 Mongoose schemas
├── proxy.js                      # Route protection middleware (Next.js 16 convention)
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

### Environment Variables

```env
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/ihgst
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000
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
| `/api/analytics` | GET | All | Aggregated analytics (status, thrust, quarterly) |
| `/api/checkins` | GET, POST | All | Quarterly check-in read/write |
| `/api/manager/[employeeId]` | GET, POST | Manager/Admin | Goal sheet review + approval actions |
| `/api/kpi` | GET, POST, PUT | Manager/Admin | Shared KPI management |
| `/api/export` | POST | Admin | CSV/Excel report generation + email |
| `/api/notifications` | GET, PUT | All | Notification feed + mark-as-read |
| `/api/admin/users` | GET, POST, PUT, DELETE | Admin | User CRUD |
| `/api/admin/cycles` | GET, POST, PUT | Admin | Cycle/quarter configuration |
| `/api/admin/reports` | GET | Admin | Reporting dashboard data |
| `/api/admin/audit` | GET | Admin | Audit log viewer |

---

## ✅ Key Features

- **🎯 Quarterly Goal Setting** — Goals with thrust areas, UoM types (Numeric, Percentage, Timeline, Zero), targets, and weighted KPIs
- **✅ Approval Workflow** — Manager review with inline edit, approve, return with comments
- **📊 Real-time Analytics** — PieCharts, BarCharts for goal distribution, quarterly trends, department comparisons
- **🔄 Quarterly Check-ins** — Track actual vs. planned across Q1–Q4 with automated progress calculation
- **🔗 Shared KPIs** — Organization-wide KPIs pushed by Admin/Manager — locked title, editable weightage
- **📋 Audit Trail** — Complete change history for accountability
- **📧 Report Export** — CSV/Excel generation with email delivery
- **🔔 Notifications** — In-app alerts for approvals, returns, assignments
- **📱 Responsive Design** — Desktop sidebar + mobile bottom nav
- **🎨 Dark Theme** — Glassmorphism effects, gradient accents, smooth animations
- **🛡️ Role-Based Access** — Route-level protection via proxy middleware + API-level auth checks

---

## 🏁 Deployment

The portal is deployed on **Vercel** with automatic deployments from the `main` branch:

```
https://ihgst-portal.vercel.app
```

---

## 📝 License

Built for the **Atomberg Hackathon** — AtomQuest.

© 2026 IHGST Portal. All rights reserved.
