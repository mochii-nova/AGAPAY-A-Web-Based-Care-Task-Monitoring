# AGAPAY backend: what's ready (for the frontend team)

Every item in `BACKEND-REQUESTS-FOR-AERON.md`, `MESSAGES-FOR-AERON.md` and
`WEB-PUSH-FOR-AERON.md` is done. All routes are under `http://localhost:5000/api`, need the
login token unless marked **public**, and answer errors as `{ "message": "…" }`.

## Setting it up (once per laptop)

1. `cd server && npm install` (adds `multer` and `web-push`).
2. Copy `.env.example` to `.env` and fill it in. The `.env` you already have keeps working; add
   the VAPID keys from `npx web-push generate-vapid-keys` to turn on push.
3. Database:
   - **Database you already have:** phpMyAdmin → `agapay` → Import →
     `server/migrations/001_backend_requests.sql`. It keeps all data and existing accounts stay
     **active**. It's safe to run twice.
   - **New database:** import `server/schema.sql`.
4. `npm run dev`. Without VAPID keys the server still runs; pushes are just skipped.

## Changes the frontend needs to know about

| What | Before | Now |
|---|---|---|
| Register | account usable right away | account is **pending** until an admin approves it. The 201 response has a `message` to show |
| Login of a pending/inactive account | n/a | `403` with `"Your account is waiting for approval."` / `"Your account is inactive."` |
| Login | Employee ID only | Employee ID **or email** (same `username` field) |
| Login `user` object | id, name, username, role | the full profile (same shape as `GET /users/me`) |
| Task `status` | `done` / `pending` / `overdue` | `completed` / `skipped` / `pending` / `overdue`. `done: true/false` is still sent |
| Resident `id` | sample used the code (`RP-2020-001`) | `id` is a number. The code is `residentCode` |
| Deactivated user | token worked until it expired | next request answers `401`, so the existing interceptor signs them out |
| `POST /tasks`, `DELETE /tasks/:id` | anyone | admin only (or the creator for delete) |
| Server errors | raw database error text | `"Something went wrong on the server…"` (the details go to the server log) |

Old routes still work as before: `PATCH /tasks/:id/done`, `POST /handovers` with `{ shift, notes }`,
and the `[agapay-data]` JSON inside `notes`.

## Routes

### Auth (public)
- `POST /auth/register` `{ name | firstName+lastName, username, password, email?, phone? }` → `201 { message, id, status: 'pending' }`. `role` is ignored.
- `POST /auth/login` `{ username, password }` → `{ token, user }`

### Users
| Route | Who | Notes |
|---|---|---|
| `GET /users/me` | all | `{ id, name, firstName, lastName, username, employeeId, role, status, title, email, phone, photoUrl, emergencyContact: { name, relationship, phone }, assignedShift, dateHired, createdAt }` |
| `PATCH /users/me` | all | `{ firstName, lastName, email, phone, emergencyContact }`. Send only what changed. Role/shift/date hired/status are ignored |
| `POST /users/me/photo` | all | multipart, field `photo`, JPG/PNG ≤ 5 MB → `{ photoUrl }` (full address) |
| `DELETE /users/me/photo` | all | back to initials |
| `PATCH /users/me/password` | all | `{ currentPassword, newPassword }`, `400` if current is wrong or new is weak |
| `GET /users?status=pending&role=caregiver` | admin | |
| `POST /users` | admin | create any account (incl. admins), active right away |
| `GET /users/:id`, `PATCH /users/:id` | admin | patch: `{ assignedShift, dateHired, title, role }` |
| `PATCH /users/:id/status` | admin | `{ status: 'active' \| 'inactive' \| 'pending' }` (approve/deactivate) |
| `POST /users/:id/reset-password` | admin | → `{ temporaryPassword }` for "Forgot password" |
| `DELETE /users/:id` | admin | |
| `GET /users/list/caregivers` | admin | active caregivers, for "assign to" pickers |

### Tasks
- `GET /tasks?mine=1&from=YYYY-MM-DD&to=YYYY-MM-DD&residentId=&status=` (dates are whole days, Philippine time; full ISO times also work)
- `GET /tasks/:id`
- `POST /tasks` (admin) `{ task, dueAt, residentId (or resident name), category, assignedTo, note }`. Tells the assigned caregiver.
- `PUT /tasks/:id` (admin) change any of those fields
- `PATCH /tasks/:id` `{ status: 'completed' | 'skipped' | 'pending', reason, note }`. `reason` is required for skipped, `pending` is undo, `note` can be sent alone. Caregivers can only change tasks assigned to them (or unassigned).
- `DELETE /tasks/:id` (admin or creator)
- Task: `{ id, task, resident, residentId, residentCode, room, category, dueAt, assignedTo, assignedToName, status, skipReason, note, done, doneAt, completedBy, createdBy, createdAt }`

### Residents
- `GET /residents` (caregiver: assigned only; admin: all), `GET /residents/:id`
- Admin: `POST /residents`, `PUT /residents/:id`, `DELETE /residents/:id`, `PUT /residents/:id/caregivers { caregiverIds }`
- Resident: `{ id, residentCode, name, room, birthDate, age, gender, careNeeds: [], careNote, emergencyContact, caregivers: [{ id, name }] }`

### Shifts
- `GET /shifts?from=&to=` (caregiver: mine; admin: everyone, or `?userId=`). Default: today + 13 days
- `GET /shifts/current` → `{ shift, shiftDate, startsAt, endsAt, staff: [...] }`
- Admin: `PUT /shifts { userId, shiftDate, shift }` (`shift: null` = day off, notifies the caregiver), `POST /shifts/bulk { userId, from, to, shift, skipWeekdays: [3] }`, `DELETE /shifts/:id`
- Shift: `{ id, userId, userName, shiftDate, shift, startsAt, endsAt }`. A Night shift keeps the date it starts on.

### Handovers
- `GET /handovers?shiftDate=&limit=` (submitted only, newest first), `GET /handovers/:id`
- `GET /handovers/draft` → my draft or `null`; `PUT /handovers/draft` (autosave, same body as submit); `DELETE /handovers/draft`
- `POST /handovers` `{ shift, shiftDate, summary, residents: [{ residentId, status, note }], tasks: [{ taskId, note }], otherNotes }`. My draft becomes the handover. Notifies the caregivers on the **next shift** in the roster (everyone if the roster is empty) plus admins.
- `PATCH /handovers/:id/acknowledge` adds a read receipt. `acknowledgedBy` stays the first reader.
- Handover: `{ id, shift, shiftDate, status, notes, summary, otherNotes, residents: [{ residentId, name, room, residentCode, status, note }], tasks: [{ taskId, task, resident, dueAt, taskStatus, note }], createdAt, submittedAt, author, acknowledgedBy, acknowledgedAt, reads: [{ userId, name, readAt }], readByMe }`

### Notifications (the bell)
- `GET /notifications` (newest 50) → `[{ id, type, title, body, link, read, time }]`
- `GET /notifications/unread-count`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`, `DELETE /notifications/:id`
- Created automatically for: new task assigned, overdue (checked every 5 min, once per task), new handover, schedule change, new message. Each also sends a push. No resident names or message text in them.

### Messages
Exactly as in `MESSAGES-FOR-AERON.md`: `GET /messages/conversations`, `GET /messages/unread-count`,
`GET /messages/:userId`, `POST /messages/:userId`, `PATCH /messages/:userId/read`.
`user.title` is filled in. Opening a conversation also marks its bell entries as read.

### Push
Exactly as in `WEB-PUSH-FOR-AERON.md`: `GET /push/public-key` (**public**, `null` without keys),
`POST /push/subscribe`, `POST /push/unsubscribe`, `POST /push/test`.

### Contact form
- `POST /contact` (**public**) `{ name, email, message }`. Max 5 per hour per IP (`429` after that). An optional hidden `website` field catches bots.
- Admin: `GET /contact`, `PATCH /contact/:id/handled`

## Before going online
Set `CLIENT_URL` in `.env` to the frontend's address (1.6). If the host sits behind a proxy,
also set `TRUST_PROXY=1` so the contact form limit sees real visitor IPs.
