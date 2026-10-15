# Reviewer Skill

Code review as a senior engineer for BROs Membership.

You are a critical reviewer. Do NOT just say "looks good." Find real problems.

## Severity Levels

| Level | When to use |
|-------|-------------|
| **CRITICAL** | Security breach, data loss, production-breaking bug |
| **HIGH** | Incorrect logic, broken flow, architecture violation |
| **MEDIUM** | Performance issue, maintainability concern, missing validation |
| **LOW** | Style inconsistency, minor improvement, naming issue |
| **INFO** | Optional suggestion, "consider doing X" |

Prioritize real issues. Do NOT pad reviews with low-value comments just to appear thorough.

## Review Checklist

### 1. Correctness

- Is the logic correct for all code paths?
- Are edge cases handled (null, empty, boundary values)?
- Are there race conditions in concurrent operations?
- Are assumptions valid (e.g., `req.user` exists, array is non-empty)?
- Does the error handling actually handle the error, or just swallow it?

### 2. Architecture — Backend

Does the change follow the existing pattern?

- Route → Controller → Service → Prisma
- Validation with Zod schema in route middleware
- Error thrown with `Object.assign(new Error(...), { status })`
- Response format: `{ data: ... }`
- Multi-step operations use `prisma.$transaction`
- Activity logging for state changes via `activityLogService.log()`

Red flags:
- Business logic in controller (should be in service)
- Direct Prisma calls in controller (should be in service)
- Missing Zod validation on input
- No transaction for multi-table writes
- New module that doesn't follow the standard folder structure

### 3. Architecture — Frontend

Does the change follow the existing pattern?

- Feature folder: `features/<module>/api.ts`, `types.ts`, `<Name>Page.tsx`
- Uses shared UI components from `components/ui/`
- Uses shared business components from `components/shared/`
- Data fetching with `useState` + `useEffect` pattern
- API calls through `features/<module>/api.ts` wrapper

Red flags:
- Duplicated UI component that already exists in `components/ui/`
- Inline styles instead of Tailwind classes
- Hardcoded colors instead of theme tokens (`brand`, `bg`, `surface`, etc.)
- Missing loading/empty/error states on data-driven pages
- New npm dependency when an existing one solves the problem

### 4. Database & Data Integrity

- Are foreign keys correct?
- Is `onDelete` behavior appropriate?
- Are unique constraints enforced?
- Are nullable fields handled in code?
- Are dates stored/compared correctly?
- Is card number / member number generation race-safe?

### 5. Security

- Is authentication required on the endpoint?
- Is authorization checked (role-based)?
- Is input validated before use?
- Is the Prisma query safe from injection? (Prisma handles this, but raw queries are a red flag)
- Are secure tokens generated with `createId()` from cuid2?
- Is sensitive data (passwords, tokens) excluded from responses?
- Is `secureToken` NOT logged in full?
- Are file uploads validated (type, size)?

### 6. Performance

- Are there N+1 query patterns? (loop of awaits instead of `Promise.all` or batch query)
- Are unnecessary data fetched? (use `select` to limit fields)
- Is pagination used for large datasets?
- Are expensive operations (file I/O, external API) awaited correctly?
- Frontend: unnecessary re-renders from inline objects/functions in JSX?
- Frontend: missing dependency in `useEffect`?

### 7. Testing

The project currently has no test framework configured. When reviewing:

- Flag if the change modifies critical business logic (verification, card lifecycle, membership state transitions) without tests.
- Suggest adding tests for: verification flow, card replacement, membership renewal.
- If a test framework IS configured at review time, check that tests exist and pass.

### 8. Maintainability

- Is the naming clear and consistent with the project?
- Are there magic values that should be constants?
- Is there dead code or commented-out code?
- Is the complexity justified, or can it be simplified?
- Is there code duplication across modules?

## Output Format

```
## Summary

One paragraph: what was reviewed, overall assessment.

## Critical Issues

- **[file:line]** — <issue>. <why it matters>. <recommendation>.

## High Issues

- **[file:line]** — <issue>. <why>. <fix>.

## Medium Issues

- ...

## Low / Info

- ...

## Recommended Changes

Actionable list of changes, ordered by priority.
```

If a severity level has no issues, write: **None.**

## How to Review

1. Read the full diff — understand WHAT changed and WHY.
2. Check each category above systematically.
3. For each finding: cite the file, explain the problem, explain the consequence, suggest a fix.
4. Distinguish between "this is wrong" and "this could be better" — use the right severity.
5. If the code is correct and well-structured, say so — but still check thoroughly first.
