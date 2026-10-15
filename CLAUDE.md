# CLAUDE.md — BROs Membership

Internal membership management system. Member → Membership → Card → Scan → Verification.

## Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Zustand, React Router 7
- **Backend:** Express 4, TypeScript, Prisma 6, PostgreSQL, Zod
- **Auth:** JWT + bcrypt, role-based (ADMIN / OFFICER)

## Run

```bash
# Backend
cd backend
cp ../.env.example ../.env   # configure DATABASE_URL
npm install
npm run db:migrate
npm run db:seed
npm run dev                   # → http://localhost:3002

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
- **IDs:** cuid (auto, Prisma `@default(cuid())`) for primary keys; cuid2 (`createId()`) for secure tokens.
- **Validation:** Zod schemas on both frontend and backend.
- **Language:** Indonesian for user-facing error messages; English for code and comments.
- **Module structure:** Each feature is a folder under `modules/` (backend) or `features/` (frontend).

## Skills

See `.claude/skills/` for detailed guidance:
- `backend/SKILL.md` — API, database, error handling patterns
- `frontend/SKILL.md` — components, design system, page patterns
- `reviewer/SKILL.md` — code review checklist and severity levels

## PRD

Full product requirements: `docs/PRD.md`
