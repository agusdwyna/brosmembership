# Backend Skill

Backend guidance for BROs Membership — Express + TypeScript + Prisma + PostgreSQL.

## Architecture

### Module Structure

Every backend module lives under `backend/src/modules/<name>/` and follows this structure:

```
module/
  routes.ts      — Express Router, endpoint definitions, middleware wiring
  controller.ts  — Request/response handling, delegates to service
  service.ts     — Business logic, database operations via Prisma
  schema.ts      — Zod schemas for input validation
  types.ts       — TypeScript interfaces/types
```

Pattern: **Route → Controller → Service → Prisma**

- Routes call controllers with `validate(schema)` middleware.
- Controllers are thin: parse request, call service, return response.
- Services contain ALL business logic and database access.
- There is NO repository layer — services call `prisma.*` directly.

### Entry Point

`backend/src/index.ts` — registers all routes, applies global middleware.

Public routes go ABOVE the `authMiddleware`. Protected routes go BELOW it.

### Adding a New Module

1. Create folder `backend/src/modules/<name>/`.
2. Create `schema.ts` with Zod schemas and export inferred types.
3. Create `service.ts` with a class + singleton export.
4. Create `controller.ts` with a class + singleton export.
5. Create `routes.ts` with Express Router.
6. Register in `backend/src/index.ts`.

## Conventions

### Controller Pattern

```typescript
class SomeController {
  async methodName(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await someService.method(req.body, req.user!.id);
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  }
}
export const someController = new SomeController();
```

- Always wrap in try/catch, forward errors with `next(err)`.
- Success responses: `{ data: ... }`.
- Create responses use `res.status(201)`.

### Service Pattern

```typescript
class SomeService {
  async method(input: SomeInput) {
    // business logic + prisma calls
  }
}
export const someService = new SomeService();
```

- Services are classes instantiated as singletons.
- Use `prisma` from `../../config/database`.
- Throw errors with `Object.assign(new Error('message'), { status: 4xx })`.
- Error messages can be Indonesian for user-facing, English for internal.

### Schema Pattern

```typescript
import { z } from 'zod';

export const createSomethingSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  // ...
});

export type CreateSomethingInput = z.infer<typeof createSomethingSchema>;
```

- Always export the inferred TypeScript type.
- Use Indonesian validation messages for user-facing fields when the existing module does.

### Route Pattern

```typescript
import { Router } from 'express';
import { someController } from './controller';
import { validate } from '../../middlewares/validate';
import { createSomethingSchema } from './schema';

const router = Router();
router.get('/', someController.list);
router.post('/', validate(createSomethingSchema), someController.create);
export { router as someRoutes };
```

## Database

### Prisma

- Schema: `backend/prisma/schema.prisma`
- Client: `backend/src/config/database.ts` exports `prisma`
- IDs: `cuid()` in Prisma schema (auto-generated)
- Secure tokens: `@paralleldrive/cuid2` via `createId()`
- Table names use `@@map()` with snake_case

### Transactions

Use `prisma.$transaction` for multi-step operations that must be atomic:

```typescript
const result = await prisma.$transaction(async (tx) => {
  const member = await tx.member.create({ data: { ... } });
  const membership = await tx.membership.create({ data: { ... } });
  const card = await tx.membershipCard.create({ data: { ... } });
  return { member, membership, card };
});
```

Project uses transactions for:
- Create Member (Member + Membership + Card)
- Replace Card (Revoke old + Create new)
- Renew Membership (Expire old + Create new + Create card)
- Change Membership Type (Update + Revoke card + Issue new card)

### Query Patterns

- Use `include` for eager loading related data.
- Use `select` to limit returned fields on nested relations.
- Use `{ mode: 'insensitive' }` for search queries.
- Use `orderBy: { createdAt: 'desc' }` as default.
- Use `take` for limiting results (e.g., recent items).

### Avoiding N+1

The dashboard service uses `Promise.all` for parallel independent queries — follow this pattern instead of sequential awaits.

## Error Handling

Defined in `backend/src/middlewares/error-handler.ts`:

- `ZodError` → 400 with field-level details
- `err.status` → custom status with message
- Default → 500 with generic message (no stack trace in production)

Throw business errors as:
```typescript
throw Object.assign(new Error('Member not found'), { status: 404 });
```

## Authentication & Authorization

- Auth middleware: `backend/src/middlewares/auth.ts`
- JWT payload: `{ id, email, role }`
- Protect routes by placing them after `authMiddleware` in `index.ts`
- Role-based: `requireRole('ADMIN')` middleware
- `req.user` is typed via global Express declaration in auth middleware

## API Response Format

Standard: `{ data: <payload> }`

Error: `{ error: <message>, details?: [...] }`

Validation error:
```json
{
  "error": "Validasi gagal",
  "details": [{ "field": "email", "message": "Email tidak valid" }]
}
```

## Development Workflow

### Before coding

1. Check existing modules for the closest pattern.
2. Identify which modules will be affected.
3. Reuse existing service methods when possible.

### While coding

1. Follow the Route → Controller → Service flow.
2. Validate ALL input with Zod schemas.
3. Use transactions for multi-table operations.
4. Throw errors with `Object.assign(new Error(...), { status })`.
5. Log activity via `activityLogService.log()` for state-changing operations.

### After coding

1. Run `npx tsc --noEmit` to check types.
2. Verify the endpoint behaves correctly.
3. Check that error cases return proper status codes.
