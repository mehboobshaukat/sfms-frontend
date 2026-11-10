# SFMS Frontend

React + Vite + Tailwind CSS frontend for **SFMS (Self Finance Management System)**, a personal finance app for tracking accounts, transactions, loans, credit purchases, budgets and savings goals, with an AI assistant and a lightweight admin panel. It talks to the SFMS FastAPI backend over a REST API.

## Features

- **Public site:** home, about, features, how-it-works and a contact form that lands in the admin inbox.
- **Accounts & auth:** register, email verification, login, password reset, profile and settings.
- **Money tracking:** dashboard, transactions (income, expense, transfer, loan and credit flows), accounts, loans, credit purchases, budgets, goals with savings reservations.
- **Insight:** analytics, exportable reports, History with Undo for deleted items (recycle-bin model, 30-day retention).
- **AI Assistant:** natural-language help and bulk transaction review.
- **Settings:** categories, groups, contacts, payment methods, priorities and transaction types.
- **Admin panel** (`/admin`): contact-message inbox with email replies, user management (block/unblock and related actions) and, for the super admin, admin management. Admins never see users' financial records.

## Tech stack

React 18, React Router 6, Vite 5, Tailwind CSS 3, Axios, Chart.js (`react-chartjs-2`), React Hook Form, React Hot Toast, React Helmet Async.

## Requirements

- Node.js 18+ (20 LTS recommended) and npm
- A running SFMS backend (see the backend repository's README)

## Quick start

```bash
npm install
cp .env.example .env     # Windows (cmd): copy .env.example .env
npm run dev
```

Open <http://localhost:5173>. The backend must be running, and its `CORS_ORIGINS` must include `http://localhost:5173`.

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_BASE_URL` | No | `http://127.0.0.1:8000/api` | Backend API base URL, **including `/api`**, without a trailing slash. Profile pictures are loaded from the same host. |

Only variables starting with `VITE_` reach the browser, and they are compiled into the public bundle, so never put secrets in them. Restart `npm run dev` after editing `.env`. On a hosting platform, set the variable in its dashboard and **redeploy**, because the value is baked in at build time.

`.env` is git-ignored; `.env.example` is committed as the template.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on port 5173 |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run test:currency` | Formatter/currency tests |
| `npm run test:admin` | Admin role-rule tests |
| `node --test tests/public-pages.test.mjs` | Public-route checks |

## Project structure

```text
src/
  api/          Axios client (token refresh), one module per backend area, admin.js, public.js
  components/
    layout/     App shell: Sidebar, Topbar, AppLayout, AdminLayout, route guards
    ui/         Reusable UI: Button, Card, Modal, Table, Pagination, Icon, ...
  context/      AuthContext (session, profile)
  hooks/        useDeleteGuard (delete confirmations and dependency warnings)
  lib/          formatters, constants, roles, report export, helpers
  pages/
    public/     Marketing pages
    auth/       Login, register, verify email, password reset
    settings/   Lookup-data management
    transactions/
    admin/      Messages, Users, Admins
    (Dashboard, Accounts, Loans, Budgets, Goals, Analytics, Reports, History, AiAssistant, Profile)
tests/          node:test suites
public/         robots.txt, sitemap.xml
```

## Routes

| Area | Paths |
|---|---|
| Public | `/`, `/about`, `/features`, `/how-it-works`, `/contact` |
| Auth | `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email` |
| App (signed in) | `/dashboard`, `/transactions` (`/new`, `/:code`), `/accounts`, `/loans`, `/credit-purchases`, `/budgets`, `/goals`, `/analytics`, `/reports`, `/history`, `/ai-assistant`, `/profile`, `/settings/*` |
| Admin | `/admin/messages`, `/admin/users`, `/admin/admins` (super admin only) |

## Authentication

- Access and refresh tokens are kept in `localStorage` (`src/api/client.js`) and sent as `Authorization: Bearer ...`.
- On a `401` one shared refresh call runs and the request is retried once; if refresh fails, tokens are cleared and the user goes to `/login`.
- Public-only routes redirect signed-in users to `/dashboard`; private routes redirect guests to `/login`.

## Admin panel

There is no separate admin login. Admins sign in normally; an **Admin panel** link appears in the sidebar for `admin` and `super_admin` accounts, and the backend re-checks the role on every `/admin/*` request.

1. Register your own account and verify its email.
2. On the backend, run `python -m app.utils.create_super_admin you@example.com`.
3. Sign out and in again, then open <http://localhost:5173/admin>.

Messages are written by anonymous visitors, so they are always rendered as plain text, never as HTML.

## Testing

```bash
npm run test:currency
npm run test:admin
node --test tests/public-pages.test.mjs
```

## Build and deployment

```bash
npm run build      # output in dist/, deploy it to any static host
```

- Set `VITE_API_BASE_URL` to your **https** backend URL (for example `https://api.example.com/api`) before building.
- Add the site's exact origin to the backend's `CORS_ORIGINS`, for example `CORS_ORIGINS=http://localhost:5173,https://your-site.vercel.app`.
- The app is a single-page app, so the host must serve `index.html` for unknown paths, otherwise refreshing `/dashboard` gives a 404.
  - **Vercel:** the included `vercel.json` handles this. Import the repo, build command `npm run build`, output directory `dist`, add `VITE_API_BASE_URL`.
  - **Netlify:** add `public/_redirects` containing `/* /index.html 200`.
  - **Nginx:** `try_files $uri /index.html;`
- `index.html` and `public/sitemap.xml` use `https://sfms.app/` as the canonical URL. Update them once you have your real domain.

## Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| CORS error in the browser console | The frontend origin is missing from the backend's `CORS_ORIGINS` |
| "Can't reach the server" | Backend not running, or wrong `VITE_API_BASE_URL` (restart `npm run dev` after editing `.env`) |
| 404 when refreshing a page on a deployed site | Missing SPA fallback (see Build and deployment) |
| Env change has no effect on a deployed site | Values are baked in at build time: redeploy |
| Profile pictures do not load | Images come from the backend host derived from `VITE_API_BASE_URL`; check the backend serves `/media` |
| No "Admin panel" link | The account is not an admin, or the session predates the role change: sign out and in |
| Contact form says too many messages | The backend limits the public form (3 per hour per IP) |

## More documentation

- [`SETUP_GUIDE.md`](./SETUP_GUIDE.md): detailed setup, env and deployment
- [`FRONTEND_DOCUMENTATION.md`](./FRONTEND_DOCUMENTATION.md): route map, API layer, transaction form rules, design tokens
- [`SFMS_AI_ASSISTANT_GUIDE.md`](./SFMS_AI_ASSISTANT_GUIDE.md): AI assistant
- [`SFMS_PAGINATION_SCALING_GUIDE.md`](./SFMS_PAGINATION_SCALING_GUIDE.md) and [`SFMS_PERFORMANCE_PATCH_GUIDE.md`](./SFMS_PERFORMANCE_PATCH_GUIDE.md): performance notes
- [`ADMIN_PANEL_FRONTEND_NOTES.md`](./ADMIN_PANEL_FRONTEND_NOTES.md): admin panel notes
