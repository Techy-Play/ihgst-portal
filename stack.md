# IHGST Performance Portal — Tech Stack

## Core Framework

| Technology | Version | Where Used | Why |
|---|---|---|---|
| **Next.js** | 16.2.6 | Full-stack framework — routing, SSR, API routes | App Router with React Server Components, file-based routing (`src/app/`), built-in API routes (`src/app/api/`), and Turbopack dev server for fast HMR |
| **React** | 19.2.4 | All UI pages and components | Component-based UI with hooks (`useState`, `useEffect`, `use`), React 19's `use()` for async params unwrapping |
| **React DOM** | 19.2.4 | Portal-based modals, client rendering | `ReactDOM.createPortal()` for modal overlays that escape scroll containers |

## Authentication & Security

| Technology | Version | Where Used | Why |
|---|---|---|---|
| **NextAuth.js** | 4.24.14 | `src/app/api/auth/[...nextauth]/route.js`, `AuthProvider.jsx`, `proxy.js` | Session-based auth with JWT strategy, Credentials provider for email/password login, role-based access control (Admin/Manager/Employee) |
| **bcryptjs** | 3.0.3 | Auth route, seed scripts | Password hashing — salted bcrypt for secure credential storage, used in login verification and user seeding |

## Database

| Technology | Version | Where Used | Why |
|---|---|---|---|
| **MongoDB** | Cloud (Atlas) | All API routes via `src/lib/db.js` | NoSQL document database — flexible schema for goals with mixed-type fields (numeric targets, date targets), nested arrays for quarterly achievements |
| **Mongoose** | 9.6.2 | `src/models/*.js`, all API route handlers | ODM for MongoDB — schema validation, model definitions for User, Goal, GoalSheet, Cycle, CheckIn, AuditLog, Notification, ExportLog |

### Database Models (8 collections)

| Model | Purpose |
|---|---|
| `User` | Employee/Manager/Admin accounts with department, managerId hierarchy |
| `Goal` | Individual KPIs with target, UoM, thrust area, weightage, achievements array |
| `GoalSheet` | Per-user per-cycle submission wrapper (Draft → Submitted → Approved flow) |
| `Cycle` | Financial year cycles (FY 2025-26, FY 2026-27) with quarterly date ranges |
| `CheckIn` | Quarterly self-assessment entries per goal |
| `AuditLog` | Immutable audit trail for all goal/sheet state changes |
| `Notification` | In-app notification system for approvals, returns, assignments |
| `ExportLog` | Tracks report export requests and delivery status |

## UI & Styling

| Technology | Version | Where Used | Why |
|---|---|---|---|
| **Vanilla CSS** | — | `src/app/globals.css` | Custom dark theme with CSS custom properties (`--bg-primary`, `--accent-primary`, etc.), glassmorphism effects, responsive breakpoints |
| **Framer Motion** | 12.38.0 | Dashboard, analytics, goal pages | Smooth page transitions (`animate-fadeIn`), staggered stat card animations, micro-interactions on hover/mount |
| **Lucide React** | 1.16.0 | Every page and component | Consistent icon system — 50+ icons (Target, CheckCircle, BarChart3, Users, Shield, etc.) used across sidebar, cards, buttons |
| **Recharts** | 3.8.1 | `src/app/(dashboard)/analytics/page.jsx` | Interactive data visualization — PieChart (status distribution, thrust area), BarChart (target vs actual, quarterly progress, department completion) |
| **class-variance-authority** | 0.7.1 | Component variant management | Utility for creating type-safe component style variants |
| **clsx** | 2.1.1 | `src/lib/utils.js` | Conditional CSS class merging utility |
| **tailwind-merge** | 3.6.0 | `src/lib/utils.js` | Intelligent Tailwind class deduplication via `cn()` helper |

### Custom UI Components

| Component | File | Purpose |
|---|---|---|
| `CustomDropdown` | `src/components/ui/CustomDropdown.jsx` | Styled select replacement with search, custom rendering, portal-based dropdown |
| `CustomDatePicker` | `src/components/ui/CustomDatePicker.jsx` | Calendar date picker with month/year navigation, styled for dark theme |
| `Toast` | `src/components/ui/Toast.jsx` | Context-based notification toasts (success/error/info) |
| `Skeletons` | `src/components/ui/Skeletons.jsx` | Loading state skeletons for stat cards, charts, goal lists |
| `Sidebar` | `src/components/layout/Sidebar.jsx` | Collapsible sidebar with role-based navigation items |
| `Header` | `src/components/layout/Header.jsx` | Top bar with user info, notifications bell, profile menu |
| `BottomNav` | `src/components/layout/BottomNav.jsx` | Mobile-only bottom navigation bar |

## Backend Services

| Technology | Version | Where Used | Why |
|---|---|---|---|
| **Nodemailer** | 7.0.13 | `src/lib/mailer.js`, `src/app/api/export/route.js` | Email delivery for exported reports (CSV/Excel) — SMTP transport via Gmail |
| **xlsx (SheetJS)** | 0.18.5 | `src/app/api/export/route.js` | Excel/CSV file generation for goal reports — creates `.xlsx` and `.csv` buffers for email attachment |
| **Zod** | 4.4.3 | API route input validation | Schema-based request body validation with type-safe parsing |

## Routing & Middleware

| Technology | Where Used | Why |
|---|---|---|
| **Next.js App Router** | `src/app/(dashboard)/` | Route groups with shared layout (sidebar + header), parallel route segments |
| **proxy.js** | `src/proxy.js` | Next.js 16 proxy convention (replaces deprecated `middleware.js`) — JWT-based route protection, role-based access control, public route passthrough |
| **Dynamic Routes** | `[id]`, `[employeeId]`, `[...nextauth]` | Parameterized pages for goal detail (`/goals/[id]`), employee review (`/manager/review/[employeeId]`), catch-all auth handler |

## API Architecture

| Route | Methods | Purpose |
|---|---|---|
| `/api/auth/[...nextauth]` | GET, POST | Authentication (login, session, CSRF) |
| `/api/dashboard` | GET | Role-aware dashboard stats with quarterly progress |
| `/api/dashboard/detail` | GET | Drill-down employee lists for stat card popups |
| `/api/goals` | GET, POST | CRUD for user goals |
| `/api/goals/[id]` | GET, PUT, DELETE | Individual goal operations |
| `/api/analytics` | GET | Aggregated analytics (status, thrust area, quarterly, department) |
| `/api/checkins` | GET, POST | Quarterly check-in submissions |
| `/api/manager/[employeeId]` | GET, POST | Manager review — approve/return goal sheets |
| `/api/kpi` | GET, POST, PUT | KPI assignment and management |
| `/api/export` | POST | Generate and email CSV/Excel reports |
| `/api/notifications` | GET, PUT | In-app notification feed |
| `/api/admin/users` | GET, POST, PUT, DELETE | User management (Admin only) |
| `/api/admin/cycles` | GET, POST, PUT | Cycle/quarter configuration |
| `/api/admin/reports` | GET | Admin reporting dashboard |
| `/api/admin/audit` | GET | Audit log viewer |

## DevOps & Tooling

| Technology | Version | Where Used | Why |
|---|---|---|---|
| **Vercel** | — | Production hosting | Zero-config Next.js deployment, edge functions, automatic HTTPS, preview deployments per PR |
| **Turbopack** | Built-in (Next.js 16) | Development | Rust-based bundler for instant HMR — replaces Webpack in dev mode |
| **ESLint** | 9.x | `eslint.config.mjs` | Code linting with `eslint-config-next` for Next.js-specific rules |
| **PostCSS** | — | `postcss.config.mjs` | CSS processing pipeline (Tailwind plugin) |
| **Git / GitHub** | — | Version control | Source control, Vercel auto-deploys from `main` branch |

## Data Seeding

| Script | Purpose |
|---|---|
| `src/scripts/seed.js` | Base seed — creates users, cycles, initial data structure |
| `src/scripts/seed-past-year.js` | FY 2025-26 historical data — 20 goals, 80 check-ins, 115 audit logs with realistic quarterly progression |
| `src/scripts/seed-current-year.js` | FY 2026-27 active data — 15 goals with Q1 check-ins for demo purposes |

## Architecture Overview

```
src/
├── app/                        # Next.js App Router
│   ├── (dashboard)/            # Route group — shared sidebar/header layout
│   │   ├── dashboard/          # Main dashboard with stat cards
│   │   ├── goals/              # Goal list, create, detail pages
│   │   ├── checkin/            # Quarterly check-in interface
│   │   ├── analytics/          # Charts & data visualization
│   │   ├── manager/            # Team review, KPI assignment, check-in review
│   │   └── admin/              # Users, cycles, reports, audit log
│   ├── api/                    # REST API route handlers
│   ├── login/                  # Login page
│   └── page.js                 # Landing page with demo credentials
├── components/
│   ├── layout/                 # Sidebar, Header, BottomNav
│   └── ui/                     # Dropdown, DatePicker, Toast, Skeletons
├── lib/                        # Shared utilities
│   ├── db.js                   # MongoDB connection singleton
│   ├── mailer.js               # Nodemailer SMTP config
│   ├── progress.js             # Goal progress calculation engine
│   ├── safeFetch.js            # Error-resilient fetch wrapper
│   ├── useDataFetcher.js       # React hook for API data with loading/error states
│   └── apiError.js             # Standardized API error responses
├── models/                     # Mongoose schemas (8 models)
├── proxy.js                    # Next.js 16 route protection middleware
└── scripts/                    # Database seeding scripts
```

## Key Design Decisions

| Decision | Rationale |
|---|---|
| **Vanilla CSS over Tailwind** | Maximum control over dark theme, glassmorphism effects, custom animations — CSS custom properties enable runtime theming |
| **NextAuth Credentials** | Hackathon scope — no OAuth provider needed, demo credentials for judges, bcrypt for production-grade security |
| **MongoDB + Mongoose** | Schema flexibility for mixed-type goal targets (numeric, date, zero), nested achievement arrays per quarter |
| **proxy.js over middleware.js** | Next.js 16 deprecated `middleware.js` — migrated to proxy convention to fix Vercel production cold-start crashes |
| **Portal-based modals** | `ReactDOM.createPortal()` prevents modals from being clipped by parent `overflow: hidden` containers |
| **Role-aware navigation** | Every link, redirect, and CTA checks user role to ensure Admin→`/manager`, Employee→`/goals`, preventing dead-end navigation |
