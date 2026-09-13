# Phase 6 Implementation Plan

## Audit Findings
- No pending state: all accounts → APPROVED immediately. 6c skipped.
- Alerts: no auth gate on GET or POST, no audience targeting.

## Changes

### backend/server.js
- `GET /api/auth/users`: add ?role= and ?status= query filters
- `PATCH /api/auth/users/:id`: edit user fields (admin only)
- `PATCH /api/auth/users/:id/status`: set active/disabled (admin only)
- `POST /api/alerts`: add ADMIN+FIELD_OFFICER role gate
- `GET /api/alerts`: add verifyToken check (any authenticated role)

### frontend/vite-project/src/services/api.js
- `authAPI.getUsers(role?, status?)` 
- `authAPI.updateUser(id, payload)`
- `authAPI.setUserStatus(id, status)`
- `alertsAPI.create(payload)`

### frontend/vite-project/src/pages/Personnel.jsx [NEW]
- Two tabs: Field Officers / Vehicle Operators
- Table: Name, User ID, Status badge, Registered date, Actions
- Edit modal: name, email, mobile, district fields
- Disable/Enable toggle (soft delete via status)

### frontend/vite-project/src/App.jsx
- Add /personnel route under AdminRoute

### frontend/vite-project/src/components/layout/Sidebar.jsx
- Add Personnel nav item (admin section)

### frontend/vite-project/src/pages/Dashboard.jsx
- Add Alerts panel (last 3 unacknowledged alerts, polls every 60s)
- All roles see it
