# Estate Progress — Real Estate Construction & Project Management

Server-backed system for **admin** and **site manager** to monitor construction, units, client payments, expenses, purchases, attendance, and progress photos from one dashboard.

## Run on a server (Docker)

```bash
cp .env.example .env
# set a strong JWT_SECRET

docker compose up -d --build
```

Open http://localhost:3000 (or your VPS IP on port 3000).

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@estate.local` | `admin123` |
| Site Manager | `manager@estate.local` | `manager123` |
| Accountant | `accountant@estate.local` | `account123` |

First start creates the database schema and demo data. Later starts **keep existing data** (seed is skipped unless you reset from Settings or set `FORCE_SEED=1`).

## What works

- **Units:** shops, offices, halls, rooftop, parking, common areas — each with progress, sale/rent status, expenses, photos, notes
- **Construction:** weighted stage progress, remaining work, daily updates + photos
- **Expenses:** unit / common / admin / daily site, receipts, daily-week-month totals
- **Purchases:** material buy with qty, supplier, bill upload — auto expense
- **Client payments:** received / pending / fully-partial-pending, payment history
- **Attendance:** daily present/absent by labour category
- **Reports:** PDF + Excel (daily site, expenses, payments, purchases, attendance, completion)
- **Roles:** manager cannot delete financial records, change unit prices, or open Settings/Users

## Local development

```bash
docker compose up -d db
cp .env.example .env
npm install
npm run db:setup
npm run dev
```

## Environment

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Session secret |
| `UPLOAD_DIR` | Upload folder (default `uploads`) |
| `NEXT_PUBLIC_APP_URL` | Public URL |
| `FORCE_SEED=1` | Re-seed on container start |

Stack: Next.js 15 · Prisma · PostgreSQL · JWT · bcryptjs
