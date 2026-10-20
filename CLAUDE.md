# CLAUDE.md — BROs Membership

Internal membership management system. Member → Membership → Card → Scan → Verification → Visit (kunjungan).

## Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Zustand, React Router 7
- **Backend:** Express 4, TypeScript, Prisma 6, PostgreSQL, Zod
- **Auth:** JWT + bcrypt. RBAC with configurable roles (`IT_GOD`, `ADMIN`, `OFFICER`, plus custom) and a per-module permission catalog (`backend/src/lib/permissions.ts`).

## Run

```bash
# Backend — the API reads backend/.env (not the repo-root .env)
cd backend
cp ../.env.example .env      # configure DATABASE_URL, JWT_SECRET, API_PORT, SEED_*
npm install
npm run db:migrate
npm run db:seed
npm run dev                   # → http://localhost:3002 (API_PORT)

# Frontend
cd frontend
npm install
npm run dev                   # → http://localhost:5173
```

### Backend Scripts

| Script | Command |
|--------|---------|
| `dev` | `tsx watch src/index.ts` |
| `build` | `tsc` |
| `db:migrate` | `prisma migrate dev` |
| `db:seed` | `tsx prisma/seed.ts` |
| `db:studio` | `prisma studio` |
| `lint` | `eslint src/` |
| `format:check` | `prettier --check "src/**/*.ts"` |
| `test` | `vitest run` |

### Frontend Scripts

| Script | Command |
|--------|---------|
| `dev` | `vite` |
| `build` | `tsc -b && vite build` |
| `lint` | `eslint src/` |
| `format:check` | `prettier --check "src/**/*.{ts,tsx}"` |
| `test` | `vitest run` |

## Conventions

- **Response format:** `{ data: <payload> }` for success, `{ error: <message> }` for errors.
- **Error throwing:** `Object.assign(new Error('message'), { status: 4xx })`.
- **IDs:** cuid (Prisma `@default(cuid())`) for primary keys.
- **Validation:** Zod schemas on both frontend and backend.
- **Language:** Indonesian for user-facing error messages; English for code and comments.
- **Module structure:** Each feature is a folder under `modules/` (backend) or `features/` (frontend).

## Roles & permissions

- Roles live in the `roles` table (`key`, `label`, `permissions[]`, `isSystem`); `User.role` stores the key.
- The permission catalog is code-owned: `backend/src/lib/permissions.ts` (`<module>.<action>`, e.g. `member.create`).
- Routes are guarded by `requirePermission('...')`; the frontend mirrors the catalog in `frontend/src/lib/permissions.ts`.
- Seeded built-in roles: `IT_GOD` (all), `ADMIN` (all except `settings.manage`), `OFFICER` (scan only).

## Skills

See `.claude/skills/` for detailed guidance:
- `backend/SKILL.md` — API, database, error handling patterns
- `frontend/SKILL.md` — components, design system, page patterns
- `reviewer/SKILL.md` — code review checklist and severity levels

## PRD

Full product requirements: `docs/PRD.md`
