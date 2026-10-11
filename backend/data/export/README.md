# Database export (submission / sharing)

## Where the database lives

| Item | Path |
|------|------|
| **Runtime DB** | `backend/data/campus.db` (SQLite) |
| **Schema script** | `backend/data/schema.sql` |
| **Engine** | Built-in **SQLite** via Node.js `node:sqlite` (no separate MySQL server) |
| **Not on GitHub** | `campus.db` is in `.gitignore` — export a copy for submission |

### Tables

- `users` — students
- `cards` — RFID/card IDs linked to users
- `access_logs` — every gate scan (approved/denied)
- `passes` — digital exit passes (hostel → main gate)

## What to send for pre-project / guide

1. **Database file** (after running demos):
   ```bash
   cp backend/data/campus.db backend/data/export/campus-export.db
   ```
2. **Schema**: `backend/data/schema.sql`
3. **Environment**: `backend/.env.example` (optional `PORT=4000`)

## Restore on another PC

```bash
mkdir -p backend/data
cp campus-export.db backend/data/campus.db
cd backend && node src/index.js
```

## Reset demo data

Delete `backend/data/campus.db` and restart — tables are recreated and seed data inserted.

## Optional: SQL dump (text)

If SQLite CLI is installed:

```bash
sqlite3 backend/data/campus.db .dump > backend/data/export/campus-dump.sql
```
