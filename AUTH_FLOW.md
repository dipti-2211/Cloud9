# AUTH_FLOW.md — Cloud9 Authentication & Account Creation

## Model: Admin-Controlled Account Creation

Cloud9 uses **Model A** — administrators directly create accounts for field officers and vehicle operators. There is no public self-registration form.

## How accounts are created

1. Admin logs in at `/login` using the Admin tab.
2. Admin navigates to **Register Officer** or **Register Operator** in the sidebar.
3. Admin fills in staff details and a temporary password.
4. The account is immediately active — staff can log in straight away.

## Endpoint security

| Endpoint | Auth required | Role required |
|----------|---------------|---------------|
| `POST /api/auth/login` | None | — |
| `POST /api/auth/register` | JWT Bearer token | ADMIN |
| `POST /api/auth/register-officer` | JWT Bearer token | ADMIN |
| `POST /api/auth/register-operator` | JWT Bearer token | ADMIN |
| `GET /api/auth/users` | JWT Bearer token | ADMIN |
| `PATCH /api/auth/users/:id/approve` | JWT Bearer token | ADMIN |
| `PATCH /api/auth/users/:id/reject` | JWT Bearer token | ADMIN |

## Frontend route guards

- `/register-officer` → wrapped in `<AdminRoute>` — non-admins redirect to `/dashboard`
- `/register-operator` → wrapped in `<AdminRoute>` — non-admins redirect to `/dashboard`
- `/admin/approvals` → visible in sidebar for ADMIN role only

## What NOT to do

- Do **not** add a "Register" link to the public `/login` page for officer/operator roles.
- Do **not** remove the `AdminRoute` wrapper from register routes.
- Do **not** expose the register endpoints without JWT verification.
