# NEXSTAGE V2: Experiences for Every Stage of Life

> A **premium purple-and-white hybrid database web application** for discovering portfolio camps, volunteering, certificate courses, concerts, wellness activities and retreats, as well as booking tickets.
>
> Full-stack academic starter project. **Backend + frontend source provided; run-time database integration must be tested on your machine.**

> **V2 DEVELOPMENT — NOT FINAL.** Upgrading an existing V1? Follow `UPGRADE_V1_TO_V2_TH.md` first. **Preserve existing MySQL/MongoDB volumes and .env**. Existing users, inventory and bookings must not be reset.

## V2 highlights

- **Audience discovery:** school students / university / working adults / seniors; one event can serve several groups. The audience labels are discovery filters, *not* forced age eligibility.
- **Event categories and benefits:** portfolio camps, volunteer work, certificate classes, concerts, Dharma & wellness, plus flexible custom category strings; event benefit badges.
- **Your own event titles:** an ordinary Admin form edits titles, descriptions, dates, venue, category, audiences and benefits — no JSON needed for Events.
- **Ticket editor and image upload:** Admin Ticket Types has friendly field inputs; posters are uploaded to the self-hosted `server/public/uploads/` folder via authenticated local API.
- **Dashboard:** live SQL category distribution and existing inventory, booking, users, demo revenue, rollback & retry controls.
- **Database migration:** `npm run migrate:v2` adds only `events.audience_groups` and `events.benefits`, retaining existing database contents. `npm run seed` optionally adds four sample audience-specific events and never deletes existing bookings.
- **Tests:** unit tests for taxonomy and legacy event compatibility, alongside original booking item validation tests.

## 1. Project features

- **Discover:** locally stored posters, category filters, event search, event details and ticket options.
- **Booking:** MongoDB cart -> MySQL atomic checkout (row-level inventory locks, order + items, COMMIT / ROLLBACK).
- **User:** registration, login, favorites, reviews, notifications, My Tickets and locally generated QR code.
- **Admin:** dashboard and **Data Studio** exposing CRUD screens for all **9 domain entities**; friendly Events and Ticket Types editors (others remain JSON-editable).
- **Failure demonstration:** admin button **Demonstrate SQL rollback** writes a temporary booking and decrements one ticket's availability, then deliberately throws; rollback removes both changes. Before/after is reported.
- **Hybrid consistency:** `bookings.sync_status` persists the reconciliation state; an idempotent in-process retry worker removes purchased cart items and upserts a notification in MongoDB after SQL commits. **This is eventual consistency, not a distributed ACID transaction.**
- **Self-contained runtime:** no Cloud database, SaaS, CDN, remote image URLs, remote payment gateway or external API calls.

## 2. Required technologies

| Layer | Technology | Location |
| --- | --- | --- |
| Frontend | React 19 + Vite + custom CSS | `client/` |
| Backend | Node.js 20+ / Express | `server/` |
| SQL | MySQL 8.4, InnoDB | local Docker, host port **3307** |
| NoSQL | MongoDB 7 | local Docker, host port **27018** |
| Images | Generated SVG posters | `client/public/posters/` |
| QR | Local JavaScript library | browser, no service calls |

Docker Desktop, Node.js (20+), npm, and a code editor (VS Code) are needed for the recommended workflow.

## 3. Run this project (VS Code / macOS / Windows)

1. Unzip the folder and open **NEXSTAGE** in VS Code (**File > Open Folder**).
2. Open Docker Desktop and wait until it is running.
3. Open the **VS Code Terminal** in the NEXSTAGE root folder and run:

```bash
docker compose up -d
```

The first start initializes SQL through `server/sql/001_schema.sql`. Give the containers time to become healthy. To check, run `docker compose ps`.

4. **Terminal 1 — Backend setup:**

```bash
cd server
cp .env.example .env
npm install
npm run migrate:v2
npm run seed
npm run dev
```

**Windows PowerShell:** use `Copy-Item .env.example .env` instead of `cp .env.example .env` if necessary.

5. **Terminal 2 — Frontend:** open a second terminal *at the NEXSTAGE project root*:

```bash
cd client
npm install
npm run dev
```

6. Open **http://127.0.0.1:5173** in your browser. The API should respond at `http://127.0.0.1:4000/api/health`.

**Important:** If you see `UI preview mode`, the React app is not currently reaching the local backend or databases. The demo posters shown are samples, not database proof. Check Docker, MySQL schema, MongoDB and the backend terminal.

### Demo accounts (seeded locally)

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@nexstage.local` | `Demo12345!` |
| Student | `student@nexstage.local` | `Demo12345!` |

These are demo credentials, **not for deployment**. Set a strong unique `JWT_SECRET` in `server/.env` before sharing the app beyond your own computer. Local Docker ports are bound to 127.0.0.1 only.

### Troubleshooting

- **MySQL port occupied:** port **3307** was deliberately chosen because other coursework might already use 3306. If 3307 is also occupied, change the LEFT side in `docker-compose.yml` (`3308:3306`) and set `MYSQL_PORT=3308` in `server/.env`.
- **Mongo port occupied:** change the LEFT port mapping in Compose and the `MONGODB_URI` value together.
- **MySQL `Table doesn't exist`:** run `docker compose logs mysql`, check the first database initialization. The SQL file only runs automatically on a **fresh MySQL data volume**. If reusing a previous volume, run `server/sql/001_schema.sql` manually in Workbench.
- **`npm install` error:** check network access and Node.js version, then retry locally. No dependencies are bundled in this zip.
- **Health fails:** MySQL or server may not have finished booting.
- **Admin Data Studio create/delete failure:** related SQL rows are protected by foreign keys; create a temporary standalone row, then delete it before references are added.

To stop databases without deleting records: `docker compose down`. **Do not use `docker compose down -v` unless you intentionally want to delete all database data.**

## 4. Entity requirements

### SQL — exactly 5 interconnected tables (all Admin CRUD-accessible)

| Table | Main columns | Relationship |
| --- | --- | --- |
| `users` | id (PK), email (unique), display_name, role, password_hash | Parent of events and bookings |
| `events` | id (PK), organizer_id (FK), title, category, audience_groups (JSON), benefits (JSON), venue, start_at, status | Event organizer is a user |
| `ticket_types` | id (PK), event_id (FK), label, price, capacity, available | Many ticket types per event |
| `bookings` | id (PK), user_id (FK), booking_code, total_amount, status, sync_status | Many bookings per user |
| `booking_items` | id (PK), booking_id (FK), ticket_type_id (FK), quantity, unit_price | Junction of booking and ticket type |

All SQL records can be viewed, created, edited or removed in **Admin > Data Studio**, within integrity rules. `bookings` are *created through the inventory-aware booking service*, updated through **cancel**, and deleted only after cancellation. `booking_items` edits also adjust inventory in SQL transactions. This is intentional safe CRUD, not unvalidated direct row edits.

**Constraints:** PK, FK, UNIQUE, NOT NULL, CHECK, quantity >= 1, nonnegative ticket prices, available <= capacity, end > start, restrict deletes for related records.

### MongoDB — exactly 4 document collections (all Admin CRUD-accessible)

| Collection | Example document fields | Purpose |
| --- | --- | --- |
| `carts` | userId, items: [{ticketTypeId, quantity}] | Flexible cart array |
| `reviews` | userId, eventId, rating, text | User feedback |
| `wishlists` | userId, eventIds: [id] | Flexible saved event arrays |
| `notifications` | userId, title, message, type, isRead, dedupeKey | Event and booking notifications |

Customer-friendly CRUD actions exist as well: cart replace/clear, review submit/update/delete, wishlist toggle, notification read/unread; admin Data Studio exposes general document CRUD for every collection.

## 5. SQL transaction vs cross-database sync

```text
Customer's Mongo cart
  └─ Checkout request to Express
       ├─ MySQL BEGIN
       ├─ SELECT stock rows FOR UPDATE
       ├─ Validate all ticket quantities
       ├─ INSERT booking
       ├─ UPDATE inventory (stock deduction)
       ├─ INSERT booking items
       ├─ MySQL COMMIT  ← all-or-nothing in SQL
       └─ MongoDB reconciliation
            ├─ remove purchased cart items
            ├─ upsert booking notification (dedupeKey)
            └─ mark SQL booking sync_status='done'
```

If MySQL fails before COMMIT: **ROLLBACK** undoes all SQL writes. If MongoDB fails after SQL COMMIT: the booking remains confirmed with `sync_status='error'`, and the in-process worker retries every ~30 seconds (also on app start); no false claim of cross-database ACID is made. Idempotent notification keys avoid duplicates.

**For a stronger production design**, replace this simplified booking-status reconciliation with a dedicated transactional outbox plus resilient worker; the chosen method keeps the coursework application a single service and avoids adding a system table to the 9-domain-entity CRUD scope.

To prove a REAL rollback after changes were attempted, sign in as admin, enter **Dashboard**, and press **Demonstrate SQL rollback**. Its response displays a ticket's availability before/after and remaining test bookings (0).

## 6. API reference

All endpoints are same-origin and start with `/api`. Cookie-based authentication; only admins can use `/admin/*`.

| Method & path | What it does |
| --- | --- |
| `GET /health` | MySQL connection probe / backend status |
| `POST /auth/register`, `/auth/login`, `/auth/logout` | Accounts and sessions |
| `GET /me` | Current signed-in user |
| `GET /events`, `GET /events/:id` | Event catalog / details |
| `GET /stats` | Public event statistics |
| `GET /cart`, `PUT /cart` | Read / replace Mongo cart |
| `POST /checkout` | SQL atomic booking; Mongo sync after commit |
| `GET /bookings`, `GET /bookings/:id` | User bookings & digital passes |
| `POST /bookings/:id/cancel` | SQL transaction restores inventory |
| `GET /wishlist`, `POST /wishlist/:eventId` | Read/toggle wishlist |
| `GET /reviews`, `POST /reviews` | Read / create-or-update review |
| `DELETE /reviews/:id` | Delete own review |
| `GET /notifications`, `PATCH /notifications/:id` | List/mark notifications |
| `GET /admin/overview` | Admin statistics |
| `GET /admin/data/:entity` | Admin list for each of 9 entity types |
| `POST /admin/data/:entity` | Admin create |
| `PATCH /admin/data/:entity/:id` | Admin update |
| `DELETE /admin/data/:entity/:id` | Admin delete |
| `POST /admin/demo-rollback` | Deliberate post-write SQL rollback test |
| `POST /admin/retry-sync` | Retry pending Mongo reconciliation |

UI create/edit uses friendly event and ticket editors; the remaining seven entities still expose JSON editors to make *all nine entities* editable. Detailed JSON examples are prefilled for those flexible data shapes.

## 7. Repository layout

```text
NEXSTAGE/
├── client/
│   ├── public/posters/         # local SVG image assets
│   ├── src/App.jsx             # pages, dialogs, CRUD UI, dashboard
│   ├── src/styles.css          # Purple & White theme, responsive
│   └── src/demo.js             # clearly labeled UI-only preview data
├── server/
│   ├── src/index.js           # Express API routes
│   ├── src/booking.js         # SQL ACID and reconciliation
│   ├── src/admin.js           # CRUD per SQL/Mongo entity
│   ├── src/models.js          # Mongoose schemas for 4 collections
│   ├── src/seed.js            # local sample data
│   ├── src/auth.js            # signed cookie auth
│   ├── sql/001_schema.sql     # 5-table InnoDB schema
│   └── test/util.test.js      # input validation unit tests
├── docs/diagrams/             # architecture, SQL ER, Mongo flow .svg/.dot
├── docs/screenshots/          # design preview + real-evidence checklist
├── docs/presentation_outline.md
├── docker-compose.yml
├── preview.html               # older V1 static design preview ONLY (V2 is live React)
└── README.md
```

## 8. Tests & requirements evidence

From `server/`, run `npm test` for validation unit tests. For the essential transactional integration demo, **run the real local databases**, make an actual successful booking, then use **Demonstrate SQL rollback** and confirm `before = after` and `booking_rows_remaining = 0`.

See `docs/screenshots/README.md` for the required genuine submission screenshots. Architecture and ER diagrams are already in `docs/diagrams/`. They can be included in a report and a maximum-10-slide presentation described in `docs/presentation_outline.md`.

### Current scope limitations (state clearly in presentation)

- No real payment processing, seat-by-seat selection or email sending.
- No true MySQL/MongoDB distributed two-phase commit; uses **eventual consistency and retry**.
- Events and Ticket Types now have friendly admin forms. Remaining entities use JSON forms; the project is not yet Final.
- Security uses local educational demo credentials; additional hardening (CSRF tokens, rate limits, stronger role checks, audit logs, HTTPS) is needed for public deployment.
- This zip includes source, SQL schema and design assets. **It is not evidence that live integration tests were already executed**; you still need to run Docker, install npm dependencies, verify endpoints and take your own runtime screenshots before submitting.

---

**Project:** NEXSTAGE V2: Experiences for Every Stage of Life  
**Design:** Purple & White (`#FFFFFF`, `#F5F0FF`, `#8B5CF6`, `#5B21B6`)  
**Deployment rule:** local data stores, local images, no external APIs or microservices.
