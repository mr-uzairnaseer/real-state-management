# Estate Progress

Real Estate & Project Progress Management Software — a fully client-side, [Vercel](https://vercel.com)-deployable Next.js app. **No server, database, Redis, or env vars required.**

UI inspired by the [Twenty CRM](https://github.com/twentyhq/twenty) design system.

## Deploy to Vercel (recommended)

1. Push this folder to GitHub (avoid spaces in the **repo** name if possible, e.g. `estate-progress`)
2. Open [vercel.com/new](https://vercel.com/new) → import the repo
3. Leave defaults:
   - Framework: **Next.js**
   - Build: `npm run build`
   - Output: Next.js default
4. **Do not** add Postgres, KV, Blob, or environment variables
5. Deploy

CLI:

```bash
npx vercel
```

Production URL works immediately. Each visitor’s data lives in **their browser** (`localStorage` + IndexedDB).

### What works on Vercel with zero backend

| Capability | How |
|---|---|
| Full CRUD for all modules | Zustand store |
| Auto progress / money math | Client calculations |
| Pictures & receipts | IndexedDB (avoids localStorage quota) |
| Multi-tab live sync | BroadcastChannel |
| Rent due / overdue alerts | Scanned on every load |
| PDF / Excel reports | Generated in-browser |
| Roles | Admin / Manager / Accountant |

### Limits (by design — no server)

- Devices don’t share one database (each browser has its own workspace)
- No email/SMS push — alerts appear inside the app
- Very large videos may still hit browser storage limits

## Demo logins

| Role | Email | Password |
|------|-------|----------|
| Main Admin | `admin@estate.local` | `admin123` |
| Manager | `manager@estate.local` | `manager123` |
| Accountant | `accountant@estate.local` | `account123` |

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

On Windows, if `npm` fails because the folder path has spaces:

```bat
dev.cmd
```

## Stack

- Next.js 15 (App Router) · React 19 · TypeScript  
- Zustand (persisted) · IndexedDB · BroadcastChannel  
- Tabler Icons · jsPDF · SheetJS  

## License

Private project use.
