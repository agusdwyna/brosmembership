# Frontend Skill

Frontend guidance for BROs Membership — React 19 + TypeScript + Vite + Tailwind CSS v4 + Zustand.

## Architecture

### Project Structure

```
frontend/src/
  App.tsx                    — Route definitions, protected route wrapper
  main.tsx                   — Entry point
  index.css                  — Global styles, Tailwind theme config
  lib/
    api.ts                   — Axios instance with interceptors
    cn.ts                    — clsx + tailwind-merge utility
    qr.ts                    — QR/barcode utilities
  stores/
    auth-store.ts            — Zustand auth store
  components/
    layout/                  — MainLayout, Sidebar, Header
    ui/                      — Shared UI components (Button, Input, Card, Table, Modal, etc.)
    shared/                  — Shared business components (DataTable, DataToolbar, KpiCard)
  features/
    <module>/
      api.ts                 — API calls via axios
      types.ts               — TypeScript interfaces
      <Name>Page.tsx          — Page component
      components/            — Module-specific components
```

### Routing

React Router v7 with flat route definitions in `App.tsx`. All authenticated routes are nested under `<MainLayout />` using `<Outlet />`. Protected routes use `<ProtectedRoute>` wrapper that checks `useAuthStore`.

Adding a page:
1. Create `features/<module>/<Name>Page.tsx`.
2. Add route in `App.tsx` inside the `<ProtectedRoute>` block.
3. Add nav item in `components/layout/Sidebar.tsx` if needed.

### State Management

- **Zustand** for client-only state (auth, UI). See `stores/auth-store.ts`.
- **Server data** fetched via REST API in `features/<module>/api.ts`.
- No global server state cache — each page fetches its own data with `useState` + `useEffect`.

### Data Fetching Pattern

```typescript
const [data, setData] = useState<Type[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => { loadData(); }, []);

const loadData = async () => {
  setLoading(true);
  try {
    const { data: res } = await someApi.list();
    setData(res.data);
  } finally {
    setLoading(false);
  }
};
```

### API Layer

Each feature has an `api.ts` that wraps the shared axios instance:

```typescript
import { api } from '@/lib/api';

export const someApi = {
  list: (params?: any) => api.get<{ data: SomeType[] }>('/endpoint', { params }),
  getById: (id: string) => api.get<{ data: SomeType }>(`/endpoint/${id}`),
  create: (input: CreateInput) => api.post<{ data: SomeType }>('/endpoint', input),
  update: (id: string, input: UpdateInput) => api.put<{ data: SomeType }>(`/endpoint/${id}`, input),
};
```

API response shape from backend: `{ data: <payload> }`.

## Design System

### Theme (defined in `index.css`)

Values follow the **Bali Royal Hospital brand** — see root `DESIGN.md` for the
single source of truth. Maroon is the institution color; it is "expensive" (one
primary button per screen, accents, progress), and `danger` is deliberately the
same maroon.

| Token | Value | Usage |
|-------|-------|-------|
| `brand` | `#B82230` | Primary maroon — buttons, links, active states |
| `brand-dark` | `#8E1A25` | Darker maroon — sidebar background, gradients |
| `gold` | `#C9A34E` | Accent only, sparingly |
| `bg` | `#F8F9FB` | Page background |
| `surface` | `#FFFFFF` | Card/panel background |
| `border` | `#EDF1F2` | Default borders (thin, near-invisible) |
| `border-strong` | `#D9DFE2` | Emphasized borders |
| `foreground` | `#3A3F52` | Primary text |
| `secondary` | `#53627C` | Secondary text |
| `muted` | `#8DA2B5` | Placeholder, hints |
| `success` | `#2F7D5A` | Success states |
| `warning` | `#B7791F` | Warning states |
| `danger` | `#B82230` | Error, destructive — same as brand |
| `info` | `#4C718C` | Informational |

Font: **Roboto** (300, 400, 500, 700, 900). Base body size `15px`.

> **Error = brand color.** Because `danger` is the same maroon as `brand`, color
> alone cannot signal an error. Every error message **must** carry an
> `AlertCircle` icon + text and `role="alert"` (see `Input`/`Select` and the form
> error blocks). Never convey status with color alone — the "gray test" in
> `DESIGN.md` §9/§11 must pass.

### Spacing & Sizing

- Base font size: `15px` body, `13px` for UI elements and `12px` for labels/hints
- Border radius: `4px` (`rounded-sm` / `rounded-[4px]`) for buttons, inputs, cards,
  modals — deliberately sharp/formal; `rounded-lg`/`rounded-full` only for icon
  chips, stepper dots and progress bars
- Input height: `h-10` (Input), `h-9` (Select, SearchInput)
- Button heights: `sm:h-8`, `md:h-9`, `lg:h-10`
- Text sizes: `text-[13px]` body, `text-[12px]` labels/hints, `text-[11px]` tiny

### Reusable UI Components (`components/ui/`)

ALWAYS use these before creating new components:

| Component | File | Purpose |
|-----------|------|---------|
| `Button` | `Button.tsx` | primary/secondary/ghost/danger/text variants, loading state |
| `Input` | `Input.tsx` | Text input with label, error, helper |
| `Select` | `Select.tsx` | Dropdown with label, error |
| `Badge` / `StatusBadge` | `Badge.tsx` | Status indicators |
| `Card` / `CardHeader` / `CardContent` | `Card.tsx` | Content containers |
| `Table` + sub-components | `Table.tsx` | Basic table |
| `Modal` | `Modal.tsx` | Dialog overlay |
| `ConfirmDialog` | `ConfirmDialog.tsx` | Confirmation modal |
| `EmptyState` | `EmptyState.tsx` | Empty data placeholder |
| `PageHeader` | `PageHeader.tsx` | Page title + action + back button |
| `Tooltip` | `Tooltip.tsx` | Hover label; portal + fixed so it is not clipped by table overflow |
| `Toast` | `Toast.tsx` | Notifications via `toast.success()`, `toast.error()`, etc. |

### Shared Business Components (`components/shared/`)

| Component | File | Purpose |
|-----------|------|---------|
| `DataTable` | `DataTable.tsx` | Paginated table with loading skeleton, empty state, row click |
| `RowActions` | `RowActions.tsx` | Labelled action buttons for a table's Actions column (no hover needed) |
| `TableToolbar` / `SearchInput` | `TableToolbar.tsx` | Toolbar above tables with search |
| `DataToolbar` / `SearchInput` | `DataToolbar.tsx` | Alias for TableToolbar (same pattern) |
| `KpiCard` | `KpiCard.tsx` | Dashboard metric card |

### Page Pattern

Standard list page structure:

```tsx
<div>
  <PageHeader title="..." description="..." action={<Button>...</Button>} />
  <Card>
    <TableToolbar>
      <SearchInput ... />
      <Select ... />  {/* filters */}
    </TableToolbar>
    <DataTable
      columns={[...]}
      data={filteredData}
      loading={loading}
      emptyTitle="..."
      emptyDescription="..."
      emptyAction={<Button>...</Button>}
      getRowId={(row) => row.id}
    />
  </Card>
</div>
```

#### Table actions

Row navigation uses an explicit Actions column, **not** `onRowClick`. Clicking a row
does nothing; the operator must press a labelled button. This keeps selection
checkboxes (e.g. Members bulk-export) from opening a detail page by accident, and
makes every available action discoverable instead of hidden behind a click.

Add the column last, with `width: 'w-[1%]'` and an empty header:

```tsx
{
  key: 'actions',
  header: '',
  width: 'w-[1%]',
  render: (row) => (
    <RowActions
      actions={[
        { key: 'detail', label: 'Detail', variant: 'brand', onClick: () => navigate(`/path/${row.id}`) },
        { key: 'edit', label: 'Edit', onClick: () => navigate(`/path/${row.id}/edit`) },
        // variant: 'danger' for destructive actions
      ]}
    />
  ),
}
```

`RowActions` renders **outline buttons with a text label** (e.g. "Detail",
"Nonaktifkan") — never icon-only. A label is always visible, so operators who do
not read icons still know what each action does, and there is nothing to discover
by hovering (tooltips never show on touch). Buttons stay outline (not solid
maroon) so a full table never becomes a wall of maroon — §3 keeps the solid
`brand` button to one per screen. It stops click propagation so pressing a button
never triggers the row's own click handler. Confirm destructive or
status-changing actions with `ConfirmDialog` before calling the API.

Standard form page structure:

```tsx
<div>
  <PageHeader title="..." backTo="/parent" />
  <form onSubmit={handleSubmit} className="space-y-6">
    <Card>
      <CardHeader><h3>Section Title</h3></CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <Input label="..." ... />
        </div>
      </CardContent>
    </Card>
    {error && <div className="bg-danger/10 ...">...</div>}
    <div className="flex justify-end gap-3">
      <Button variant="secondary" ...>Cancel</Button>
      <Button type="submit" loading={loading}>Save</Button>
    </div>
  </form>
</div>
```

## UX Requirements

Every page must handle:

- **Loading**: Skeleton rows via `DataTable` loading prop, or `animate-pulse` placeholders.
- **Empty**: Use `EmptyState` with title, description, and optional action.
- **Error**: Show error message in a styled div, use `toast.error()`.
- **Success**: Use `toast.success()` and navigate to detail/list.

## Development Workflow

### Before coding

1. Check if a reusable component in `components/ui/` or `components/shared/` already does what you need.
2. Look at existing pages for the closest pattern.
3. Check existing `api.ts` and `types.ts` in the feature.

### While coding

1. Use existing UI components — do NOT recreate Button, Input, Modal, etc.
2. Follow the established page structure (PageHeader → Card → content).
3. Use `cn()` from `@/lib/cn` for conditional class merging.
4. Use `lucide-react` for icons — already installed.
5. Use `date-fns` for date formatting — already installed.
6. Use `toast` from `@/components/ui/Toast` for notifications.
7. Forms: use controlled components with `useState` (project pattern) or `react-hook-form` + `@hookform/resolvers` (available but not widely used yet).
8. Zod for frontend validation when needed.

### After coding

1. Run `npx tsc -b` to check types.
2. Verify the UI renders correctly for all states (loading, empty, error, success).
3. Check that navigation works (back buttons, row clicks, redirects).
4. Ensure no duplicate components were created.
