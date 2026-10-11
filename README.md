# Campus Flow — In-Out Management System (Software MVP)

A simple **Campus In-Out Management** demo for a college pre-project. The **card reader (hardware)** only reads a card ID and sends it to this software. All validation, user lookup, and logging happen here.

## Architecture

```
Card Reader (hardware)          Card Simulator (web UI)
         |                                |
         |  POST { cardId, gate, direction } |
         +--------------+-----------------+
                        v
              Backend API (Express)
                        |
         Validation & business logic
         (registered? active? user?)
                        |
                        v
           JSON file database (data/store.json)
              users | cards | access_logs
                        |
                        v
              Admin dashboard (React)
         users, cards, logs, register/activate
```

### Why this split?

| Layer | Responsibility |
|--------|----------------|
| Hardware / simulator | Send `cardId`; each reader also sends fixed `gate` + sensed `direction` |
| `POST /api/access/scan` | Single entry point for every scan |
| `accessService.js` | All GRANTED/DENIED rules in one place (easy to explain in viva) |
| JSON store (`backend/data/store.json`) | Persistent users, cards, and **every access attempt** (simple for MVP; can swap to SQLite/MySQL later) |
| Admin UI | Manage cards and review logs (not used by the reader) |

## Project structure

```
campus-flow/
├── README.md
├── backend/
│   ├── package.json
│   ├── data/                 # store.json (created on first run)
│   └── src/
│       ├── index.js          # Server + routes mount
│       ├── db.js             # Schema + seed data
│       ├── services/
│       │   └── accessService.js   # Scan logic + logging
│       └── routes/
│           ├── access.js
│           ├── users.js
│           ├── cards.js
│           └── accessLogs.js
└── frontend/
    ├── package.json
    ├── vite.config.js        # Proxies /api → backend :4000
    └── src/
        ├── App.jsx
        ├── api.js
        └── pages/
            ├── CardSimulator.jsx
            └── AdminDashboard.jsx
```

## Setup (no npm install needed)

Requires **Node.js 18+** only.

```bash
cd backend
node src/index.js
```

Open **http://localhost:4000** in your browser — UI + API together.

Optional: `npm run dev` in `backend` uses file watch (still no dependencies).

The separate `frontend/` folder is the older React + Vite app; use it only if `npm install` works on your network.

## API overview

### Scan (card reader → software)

**`POST /api/access/scan`**

Request:

```json
{
  "cardId": "CARD-1001",
  "gate": "HOSTEL",
  "direction": "OUT"
}
```

`gate`: `HOSTEL` | `MAIN` — configured on each reader device.  
`direction`: `IN` | `OUT` — from turnstile / beam sensor / guard button.

Response (hostel OUT — digital pass replaces paper slip):

```json
{
  "cardId": "CARD-1001",
  "gate": "HOSTEL",
  "direction": "OUT",
  "status": "GRANTED",
  "pass": {
    "passCode": "PASS-A1B2C3",
    "validUntil": "2026-10-12T12:00:00.000Z"
  },
  "user": { "name": "Aarav Sharma", "...": "..." }
}
```

Response (denied):

```json
{
  "cardId": "UNKNOWN-CARD",
  "status": "DENIED",
  "reason": "Card not registered",
  "user": null
}
```

Every scan creates a row in **access_logs** (GRANTED or DENIED).

### Admin / dashboard

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/users` | List users |
| GET | `/api/cards` | List cards with holder name |
| POST | `/api/cards` | Register card `{ cardId, userId, active? }` |
| PATCH | `/api/cards/:id/active` | `{ "active": true \| false }` |
| GET | `/api/access-logs?limit=50` | Recent logs |
| GET | `/api/passes/active` | Who currently has an exit pass |

## Two-gate automation (what you are replacing)

| Manual process | Automated equivalent |
|----------------|----------------------|
| Hostel: write name in register, get paper pass | **HOSTEL + OUT** scan → system creates **digital pass** + log |
| Main gate: guard checks paper pass | **MAIN + OUT** scan → denied if no active pass in system |
| Return through main + hostel | **MAIN + IN**, then **HOSTEL + IN** closes the pass |

**End-to-end demo (simulator buttons 1→4):**  
HOSTEL OUT → MAIN OUT → MAIN IN → HOSTEL IN.

Trying **MAIN OUT** before step 1 → `DENIED: No active exit pass`.

## Demo scenarios (seed data)

On first start, the database is seeded with 3 students and 3 cards:

| Card ID | State | Expected scan result |
|---------|--------|----------------------|
| `CARD-1001` | Registered, **active** | **GRANTED** (Aarav Sharma) |
| `CARD-1002` | Registered, **inactive** | **DENIED** — Card is inactive |
| `CARD-1003` | Registered, active | **GRANTED** (Rohan Mehta) |
| `UNKNOWN-CARD` | Not in DB | **DENIED** — Card not registered |

Use the **Card simulator** tab for quick chips, or call the API with curl:

```bash
curl -s -X POST http://localhost:4000/api/access/scan \
  -H "Content-Type: application/json" \
  -d '{"cardId":"CARD-1001"}'
```

## Scan flow (for presentation)

1. Reader sends `cardId`, `gate`, `direction`.
2. Validate card registered and active.
3. Apply **gate rules** in `accessService.js` (pass issue / pass check).
4. Always append **access_logs**; return GRANTED/DENIED + pass when issued.

## Connecting real hardware

You typically deploy **two readers** (or one PC with two USB readers), each hard-coded or configured with `gate=HOSTEL` or `gate=MAIN`. Direction can come from a separate sensor or a guard “IN/OUT” toggle on the reader script.

Flow: **Reader → USB/serial → small bridge script (Python/Node on gate PC) → HTTP POST** to your API. The bridge adds `gate` and `direction`; the RFID module only provides `cardId`.

Optional later: buzzer/green LED on GRANTED, small screen showing `passCode` at hostel OUT.

## Reset demo database

Stop the server, delete `backend/data/store.json`, restart — seed runs again.
