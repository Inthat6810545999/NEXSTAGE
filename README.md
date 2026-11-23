# NEXSTAGE

**Discover experiences for every stage of life.**

NEXSTAGE is a local event discovery and ticket booking application built with React, Express, MySQL, and MongoDB. It brings concerts, workshops, portfolio camps, volunteer activities, certificate courses, and wellness events into one interface.

The project demonstrates a hybrid database design: MySQL owns accounts, events, inventory, and bookings; MongoDB stores carts, reviews, wishlists, notifications, and booking activity logs. Booking and inventory changes use SQL transactions, while related MongoDB updates use retryable synchronization.

This is a development and demonstration project. Checkout does not charge money, artist-themed events are fictional demo content, and the application is not ready for public production use. See [Known limitations](#known-limitations).

## Contents

- [Team members](#team-members)
- [Final Project Presentation & Live Demo](#final-project-presentation--live-demo)
- [Features](#features)
- [Technology stack](#technology-stack)
- [Architecture](#architecture)
- [Getting started](#getting-started)
- [Demo accounts and sample data](#demo-accounts-and-sample-data)
- [Configuration](#configuration)
- [Database design](#database-design)
- [Booking transactions and synchronization](#booking-transactions-and-synchronization)
- [API reference](#api-reference)
- [Testing and verification](#testing-and-verification)
- [Project structure](#project-structure)
- [Existing databases and upgrades](#existing-databases-and-upgrades)
- [Troubleshooting](#troubleshooting)
- [Known limitations](#known-limitations)
- [Supporting documentation](#supporting-documentation)

## Team members

| Name | Student ID |
| --- | --- |
| Jehan Tohdeng | 6810545514 |
| Thanakorn Innok | 6810545620 |
| Thunyasorn Chaliasomboon | 6810545689 |
| Theewasu Aekthong | 6810545701 |
| Piyatida Muanjaingam | 6810545760 |
| Inthat Niramarn | 6810545999 |

## Final Project Presentation & Live Demo

This video includes our final project presentation and a live demonstration of the NEXSTAGE Event Booking System.

The demonstration covers event browsing, ticket booking, Admin CRUD operations, SQL transaction rollback, and MongoDB activity logs.

[Watch the Presentation & Demo](https://youtu.be/71bqBvReIEI)

## Features

### Discovery and customer experience

- Browse published events and search by event information.
- Filter events by category and target audience: school students, university students, working adults, and seniors. The All audiences view includes all audience groups.
- View audience and benefit labels, including portfolio, volunteer hours, certificate, entertainment, wellness, and networking.
- Register, sign in, and sign out using a cookie-based session.
- Save favorite events, manage a ticket cart, and confirm demo bookings.
- View booking references and locally generated QR codes in My Tickets.
- Cancel confirmed bookings and restore ticket stock.
- Create one review per user per event and edit that review.
- View notifications and switch between light and dark themes. Theme preference is stored in the browser.

### NexAI and venue previews

- NexAI matches supported Thai and English keywords against published event data, including categories, audiences, benefits, locations, and budgets. It returns up to three matching events with available ticket stock.
- NexAI uses deterministic matching logic, with no external language model or API key. It does not provide unrestricted conversational AI.
- Events whose venue is `Impact Arena` expose an illustrative 2D seating map and 3D arena preview, including a view from a selected section, row, and seat.
- The venue preview falls back to the 2D map when 3D rendering is unavailable. Selecting a preview seat does not reserve or assign a real seat.

### Administration

- View event, booking, user, revenue, ticket sales, and category summaries.
- Manage all **10 database entities** through Admin Data Studio, subject to relational and booking rules.
- Use dedicated forms for events and ticket types; other entities use JSON-based editing.
- Upload PNG, JPEG, or WebP posters, up to 5 MiB per file, to local server storage.
- Demonstrate SQL rollback and manually retry pending SQL-to-MongoDB synchronization.
- Inspect booking confirmation and cancellation activity logs.

## Technology stack

| Layer | Technologies |
| --- | --- |
| Frontend | React 19, Vite 6, JavaScript, CSS, Lucide React |
| Interactive graphics | Three.js, local GLB mascot model |
| Digital ticket display | `qrcode` |
| Backend | Node.js, Express 4 |
| Authentication | bcryptjs, JSON Web Tokens, HTTP-only cookies |
| Relational persistence | MySQL 8.4, InnoDB, `mysql2` |
| Document persistence | MongoDB 7, Mongoose 8 |
| Local uploads | Multer, server filesystem |
| Database containers | Docker Compose |
| Automated checks | Node.js test runner, Vite build, GitHub Actions |

## Architecture

```text
Browser: React application at http://127.0.0.1:5173
    |
    | Vite development proxy: /api and /uploads
    v
Express API at http://127.0.0.1:4000
    |
    +--> MySQL at 127.0.0.1:3307
    |      users, events, ticket_types, bookings, booking_items
    |
    +--> MongoDB at 127.0.0.1:27018
    |      carts, reviews, wishlists, notifications, user_activity_logs
    |
    +--> Local poster files in server/public/uploads/
```

Docker Compose starts the two databases only. Run the Node.js API and Vite frontend separately on the host. Database ports and the API are bound to loopback addresses in the supplied configuration.

## Getting started

### Prerequisites

- Node.js **20 or later** and npm. The CI configuration targets Node.js 20 and 22.
- Docker with the Compose plugin; Docker Desktop is one option.
- A modern browser. The optional 3D preview requires WebGL support.
- Internet access for the initial package installation and Docker image downloads.

Open a terminal at the repository root, the directory containing `docker-compose.yml`. There is no root `package.json`; the client and server have separate packages and lockfiles.

### 1. Start the databases

```sh
docker compose up -d
docker compose ps
```

Wait for MySQL to report healthy and MongoDB to be running before seeding. MySQL initialization may take longer on the first run.

The SQL schema in `server/sql/001_schema.sql` runs automatically when MySQL initializes an empty data volume. It does not automatically migrate an existing volume.

### 2. Configure the backend

In the first terminal, from the repository root:

```sh
cd server
cp .env.example .env
```

For Windows PowerShell, use this copy command instead:

```powershell
Copy-Item .env.example .env
```

For a fresh local setup, keep the supplied database settings. Replace `JWT_SECRET` in `server/.env` with a private random value. Generate one with:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Copy the generated value into `JWT_SECRET`. Keep `NODE_ENV=development` for the documented local HTTP workflow. Preserve your existing `.env` when upgrading an installation.

### 3. Install, seed, and start the backend

In the same terminal, still inside `server/`:

```sh
npm ci
npm run seed
npm run dev
```

Check that seeding prints `Seed complete` and that startup prints:

```text
NEXSTAGE API running at http://127.0.0.1:4000
```

Keep this terminal running. The seed script requires the SQL schema and both databases to be available; it does not create the SQL tables.

### 4. Start the frontend

Open a second terminal at the repository root:

```sh
cd client
npm ci
npm run dev
```

Open **http://127.0.0.1:5173**. Use the frontend URL for normal interaction; Vite forwards API and uploaded-image requests to the backend.

### 5. Verify the live application

1. Open http://127.0.0.1:4000/api/health and confirm the API responds.
2. Open the frontend and sign in with a demo account.
3. Select a future event, choose a ticket type and quantity, and add it to the cart.
4. Open the cart and select **Confirm booking**.
5. Open **My Tickets** and confirm that the booking reference appears.
6. Cancel the booking and verify that the stock is restored.
7. Sign in as the administrator and inspect the records in Dashboard / Data Studio.

The health endpoint checks MySQL only, even though its response lists both database names. A successful health response alone does not establish MongoDB health or prove the complete booking flow.

The frontend can show bundled demo events when live requests fail. Visible event cards alone are not evidence that the backend or databases are connected. The root `preview.html` is a separate static design preview.

### Stop and restart

Stop each Node.js process with `Ctrl+C` in its terminal. From the repository root, stop the database containers with:

```sh
docker compose stop
```

Restart the databases with `docker compose up -d`, then restart the backend and frontend. Named Docker volumes retain database data. Avoid `docker compose down -v` unless you intentionally want to delete the database volumes and their contents.

## Demo accounts and sample data

After seeding a fresh database:

| Role | Email | Password |
| --- | --- | --- |
| Customer | `student@nexstage.local` | `Demo12345!` |
| Administrator | `admin@nexstage.local` | `Demo12345!` |

The seed script defines **26 demo events**, two demo login accounts, and ten sample reviewer accounts. For newly created demo events, it adds General and VIP ticket types when the event has no ticket types. It also supplies sample reviews, a student cart and wishlist, and a welcome notification.

Repeated seeding does not reset the database. It retains existing demo account passwords, reuses matching demo events, updates classification tags, and may rename recognized older concert demos or update their default posters. Sample reviews use insert-only upserts. Do not treat seeding as a read-only operation or a complete reset.

Most event dates are generated relative to the first seed run; the Daniel Caesar demo uses June 9, 2027. Re-seeding does not refresh existing event schedules. Checkout rejects events that have already started.

Artist names and posters are used in fictional demo listings. Image sources are recorded in [Photo credits](client/public/photo-credits.html), also served at `/photo-credits.html` by the frontend.

## Configuration

Create `server/.env` from [server/.env.example](server/.env.example). Run backend commands from `server/`, or use npm's `--prefix server` option from the repository root, so the application loads the expected environment file.

| Variable | Supplied `.env.example` value | Purpose |
| --- | --- | --- |
| `PORT` | `4000` | API listen port on `127.0.0.1` |
| `MYSQL_HOST` | `127.0.0.1` | MySQL host |
| `MYSQL_PORT` | `3307` | MySQL port on the host |
| `MYSQL_USER` | `nexstage` | Application database user |
| `MYSQL_PASSWORD` | `nexstagepass` | Local demo database password |
| `MYSQL_DATABASE` | `nexstage` | MySQL database name |
| `MONGODB_URI` | `mongodb://127.0.0.1:27018/nexstage` | Local MongoDB connection URI |
| `JWT_SECRET` | `CHANGE_TO_A_LONG_RANDOM_SECRET_BEFORE_SHARING` | Replace with a private signing secret |
| `NODE_ENV` | `development` | Controls production secret checks and Secure cookies |

The MongoDB fallback in `server/src/config.js` uses port **27017**, whereas the supplied Compose service is exposed on host port **27018**. Copying and loading the environment file is therefore necessary for the documented setup. The connection helper accepts local `mongodb://127.0.0.1...` or `mongodb://localhost...` URIs; remote MongoDB and Atlas connection strings are not supported by that helper.

| Service | Host address | Container port |
| --- | --- | --- |
| Frontend | `127.0.0.1:5173` | Runs on host |
| Backend | `127.0.0.1:4000` | Runs on host |
| MySQL | `127.0.0.1:3307` | `3306` |
| MongoDB | `127.0.0.1:27018` | `27017` |

Changing database passwords in `.env` alone does not change passwords already stored inside MySQL. Update the database account and application configuration consistently. Changing `PORT` also requires updating the Vite proxy target in `client/vite.config.js`.

## Database design

The current application has **5 MySQL tables and 5 MongoDB collections**, for **10 entities** in Admin Data Studio.

### MySQL: relational records and inventory

| Table | Responsibility | Relationships |
| --- | --- | --- |
| `users` | Display names, unique emails, password hashes, and roles | Referenced by events and bookings |
| `events` | Event details, schedule, publication status, poster path, audience and benefit JSON columns | `organizer_id` references `users.id` |
| `ticket_types` | Event ticket labels, prices, capacity, and available stock | `event_id` references `events.id` |
| `bookings` | Booking code, customer, total, booking status, and synchronization status | `user_id` references `users.id` |
| `booking_items` | Ticket quantities and unit prices captured for each booking | References bookings and ticket types |

InnoDB foreign keys and check constraints enforce relationships, valid event time ranges, nonnegative prices and totals, positive booking quantities, and available stock no greater than capacity. Booking item rows are deleted when their parent booking is deleted; other relevant relationships use restricted deletion.

### MongoDB: user documents and booking activity

| Collection | Responsibility | Important index or rule |
| --- | --- | --- |
| `carts` | A user's selected ticket types and quantities | Unique `userId` |
| `reviews` | Event ratings and review text | Unique combination of `userId` and `eventId` |
| `wishlists` | Saved event IDs | Unique `userId` |
| `notifications` | Booking, system, and promotion notices | Sparse unique `dedupeKey` |
| `user_activity_logs` | Booking confirmation and cancellation activity | Unique `dedupeKey`; index on user and timestamp |

MongoDB documents reference SQL IDs as numbers. These references are not cross-database foreign keys. Mongoose schemas define validation and indexes; the application creates documents as features are used. In particular, booking activity logs are populated by booking synchronization rather than the seed script.

The activity log schema supports an `ip_address` field, but the current booking synchronization calls leave it `null`. Logs are editable by administrators through Data Studio and are not an immutable audit system.

Audience labels support discovery rather than age eligibility enforcement. The `everyone` tag is distinct from specific audience tags: an event tagged only `everyone` appears in All audiences but does not automatically match the School students or other specific audience filters.

## Booking transactions and synchronization

### SQL checkout

1. Read the authenticated user's cart from MongoDB and normalize the input.
2. Begin a MySQL transaction.
3. Lock the selected ticket rows with `SELECT ... FOR UPDATE`, ordered by ticket type ID to reduce deadlock risk.
4. Check that each event is published, has not started, and has enough stock.
5. Calculate the total from database prices, create the booking and line items, and decrement stock.
6. Commit all SQL writes together. A failure before commit rolls back those writes.

The normal cart/checkout validation permits up to 20 distinct ticket types and up to 20 tickets per type. A cart does not reserve inventory; availability is checked again at checkout.

### MongoDB synchronization

After SQL commits, the application attempts to clear purchased ticket types from the cart, record booking activity, and create a notification. `bookings.sync_status` tracks `pending`, `done`, or `error` in MySQL. Unique deduplication keys prevent duplicate booking activity and notification entries during repeated synchronization.

The API retries pending or failed bookings at startup and every 30 seconds. Each retry pass processes up to 30 bookings. Administrators can also invoke **Retry pending sync**. A MongoDB synchronization failure does not roll back an already committed SQL booking.

This is **eventual consistency**, not a distributed ACID transaction. Deduplication of notifications and logs does not make checkout requests idempotent; see [Known limitations](#known-limitations).

### Cancellation and rollback demonstration

Cancellation locks the booking, rejects repeated cancellation, restores stock within the current capacity, and marks the booking cancelled in one SQL transaction. The customer route checks booking ownership. MongoDB updates follow through synchronization.

The administrator's **Demonstrate SQL rollback** action temporarily inserts a booking and decrements one available ticket, then deliberately throws an error. The transaction rolls back, and the response reports the before/after stock, remaining temporary booking rows, and a `rolled_back` result. Run this demonstration without concurrent stock changes when capturing evidence.

## API reference

All routes below are relative to `/api`. Request and response bodies use JSON, except the multipart poster upload. Protected routes use the `nexstage_session` cookie. Admin routes require an authenticated user whose current SQL role is `admin`.

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/health` | Public | Check MySQL connectivity and identify the API |
| GET | `/me` | Public | Return the current user or `null` |
| POST | `/auth/register` | Public | Register a customer using `display_name`, `email`, and `password` |
| POST | `/auth/login` | Public | Sign in using `email` and `password` |
| POST | `/auth/logout` | Public | Clear the browser session cookie |
| GET | `/events` | Public | List published events; optional `audience`, `category`, and `search` queries |
| GET | `/events/:id` | Public | Retrieve a published event, ticket types, and reviews |
| GET | `/stats` | Public | Retrieve published event and ticket sales totals |
| POST | `/assistant` | Public | Match a `question` against event data |
| GET / PUT | `/cart` | Customer or admin | Read or replace the signed-in user's cart |
| POST | `/checkout` | Customer or admin | Book the saved cart; no payment is collected |
| GET | `/bookings` | Customer or admin | List the signed-in user's bookings |
| GET | `/bookings/:id` | Booking owner | Read booking details and line items |
| POST | `/bookings/:id/cancel` | Booking owner | Cancel a confirmed booking |
| GET | `/wishlist` | Customer or admin | Read saved event IDs |
| POST | `/wishlist/:eventId` | Customer or admin | Toggle an event in the wishlist |
| GET | `/reviews` | Public | List reviews; optional `eventId` query |
| POST | `/reviews` | Customer or admin | Create a review using `eventId`, `rating`, and `text` |
| PATCH / DELETE | `/reviews/:id` | Review owner | Edit or delete a review |
| GET | `/notifications` | Customer or admin | Read the signed-in user's notifications |
| PATCH | `/notifications/:id` | Notification owner | Set `isRead` |
| GET | `/admin/overview` | Admin | Retrieve dashboard summaries |
| GET / POST | `/admin/data/:entity` | Admin | List or create entity records |
| PATCH / DELETE | `/admin/data/:entity/:id` | Admin | Update or delete an entity record |
| POST | `/admin/upload` | Admin | Upload one poster in multipart field `poster` |
| POST | `/admin/demo-rollback` | Admin | Demonstrate rollback |
| POST | `/admin/retry-sync` | Admin | Retry pending or failed booking synchronization |

The valid admin entity names are the five table names and five collection names listed above. Booking creation, cancellation, deletion, and item edits have special inventory rules; the admin API is not unrestricted raw table access. For example, a booking must be cancelled before it can be deleted, and items in a cancelled booking cannot be edited.

Example cart replacement body:

```json
{
  "items": [
    { "ticket_type_id": 1, "quantity": 2 }
  ]
}
```

Replace the sample ticket ID with an existing ticket type. `ticketTypeId` is also accepted by cart normalization. An empty `items` array clears the cart.

## Testing and verification

Run the following commands from the repository root after installing dependencies.

### Backend tests without live databases

```sh
npm test --prefix server
```

With `RUN_INTEGRATION_TESTS` unset, the current suite runs **44 tests** and skips one integration test. Coverage includes authentication and permissions, input validation, booking and cancellation logic, synchronization and retries, event tags, and NexAI matching. The booking tests use a fake SQL pool and mocked document operations; authentication tests use a temporary local HTTP server.

These tests verify application behavior in isolation. They do not establish real database concurrency behavior or replace integration testing.

### Integration test with local databases

Start the local databases, configure `server/.env`, and install server dependencies first. From `server/` on macOS/Linux:

```sh
RUN_INTEGRATION_TESTS=1 npm test
```

From `server/` in Windows PowerShell:

```powershell
$env:RUN_INTEGRATION_TESTS = "1"
npm test
Remove-Item Env:RUN_INTEGRATION_TESTS
```

Use a disposable local database environment. The integration test executes schema creation statements, creates uniquely named test records, and attempts cleanup afterward. An interrupted or failed run can leave records behind. It covers event discovery, registration and login, review creation and editing, cart checkout, cancellation, stock restoration, and admin activity log visibility.

The test uses the configured connections. It does not launch Docker or a frontend browser, and it is not a browser end-to-end test. The schema's `CREATE TABLE IF NOT EXISTS` statements do not upgrade old tables; migrate existing V1 databases first.

### Frontend build

```sh
npm run build --prefix client
```

The output is written to `client/dist/`. A successful build checks bundling, not browser interaction. The current build can emit a warning because the Three.js chunk exceeds Vite's 500 kB warning threshold.

`npm run preview --prefix client` starts Vite's build preview server. It is not a production deployment setup. The Express server does not serve the frontend build; a deployment must arrange frontend hosting and routing for `/api` and `/uploads`.

### Continuous integration and manual evidence

[The CI workflow](.github/workflows/ci.yml) is configured for pushes, pull requests, and manual runs. It starts MySQL and MongoDB services, installs dependencies from both lockfiles, enables backend integration tests, and builds the frontend on Node.js 20 and 22. Its database ports are `3306` and `27017`, explicitly configured for CI rather than the local Compose host ports.

For a project demonstration, capture real runtime evidence of checkout, stock changes, cancellation, rollback, and all ten admin entities, including `user_activity_logs`. Use the [screenshot guide](docs/screenshots/README.md) as a starting point; static previews do not prove database behavior.

## Project structure

```text
NEXSTAGE/
├── client/
│   ├── public/                 # Posters, image credits, and mascot model
│   ├── src/
│   │   ├── App.jsx             # Main application, customer and admin views
│   │   ├── NexAI.jsx           # Event assistant interface
│   │   ├── NexAIMascot.jsx     # 3D assistant mascot
│   │   ├── VenuePreview.jsx    # Venue preview controls and 2D map
│   │   ├── VenueScene.jsx      # Three.js arena rendering
│   │   ├── venue-layout.js     # Illustrative venue geometry
│   │   └── demo.js             # Bundled frontend fallback events
│   ├── package.json
│   └── vite.config.js          # Development ports and API/upload proxy
├── server/
│   ├── public/uploads/         # Locally uploaded posters
│   ├── sql/001_schema.sql      # MySQL schema
│   ├── src/
│   │   ├── index.js            # Startup, connections, and retry timer
│   │   ├── app.js              # Express routes and middleware
│   │   ├── config.js           # Database configuration
│   │   ├── auth.js             # Session cookies and role checks
│   │   ├── booking.js          # Transactions, cancellation, sync, rollback
│   │   ├── admin.js            # Admin operations and inventory-aware edits
│   │   ├── models.js           # MongoDB schemas and indexes
│   │   ├── activity-log.js     # Booking activity document writes
│   │   ├── assistant.js        # Deterministic event matching
│   │   ├── seed.js             # Demo data initialization and updates
│   │   └── migrate-v2.js       # Existing V1 event metadata migration
│   ├── test/                   # Backend unit and integration tests
│   ├── .env.example
│   └── package.json
├── docs/                       # Diagrams, specifications, and evidence guide
├── .github/workflows/ci.yml
├── docker-compose.yml          # Local MySQL and MongoDB services
├── preview.html                # Standalone static design preview
├── START_HERE_TH.md             # Earlier Thai setup guide
└── UPGRADE_V1_TO_V2_TH.md        # Earlier Thai upgrade guide
```

## Existing databases and upgrades

Back up the database data, existing `server/.env`, and uploaded poster files before an upgrade. Keep using the same Compose project and named volumes if you want to retain existing data.

For an existing V1 database that already has the project's SQL tables, run from the repository root:

```sh
npm ci --prefix server
npm run migrate:v2 --prefix server
```

The migration checks for and adds the `events.audience_groups` and `events.benefits` JSON columns, then fills null values with default arrays. It is not a general schema migration framework and does not recreate missing base tables.

Optionally run `npm run seed --prefix server` to add or update the recognized demo data. Restart the backend and frontend after upgrading. Docker's MySQL initialization script only runs for an empty data directory; restarting an existing container does not reapply schema changes.

Database data lives in Docker named volumes. Uploaded posters live separately in `server/public/uploads/`; copy that directory as well when moving the application to another machine.

## Troubleshooting

| Symptom | Checks and resolution |
| --- | --- |
| Docker commands fail | Start Docker and check that the current user can access the Docker daemon. Run Compose commands from the repository root. |
| API startup fails or MySQL connection is refused | Check `docker compose ps`, wait for MySQL health, and inspect `docker compose logs mysql`. Confirm the host port is `3307`. |
| MongoDB connection is refused | Check `docker compose logs mongo` and ensure `server/.env` points to host port `27018`. Do not rely on the code's `27017` fallback for this Compose setup. |
| Missing SQL tables | Fresh volumes initialize from `server/sql/001_schema.sql`. Existing volumes need the appropriate schema setup; `npm run seed` does not create SQL tables. |
| Unknown audience or benefit column | Run `npm run migrate:v2` from `server/` against the existing V1 database. |
| Frontend shows demo events but login or booking fails | Verify the API and both databases. The frontend deliberately supports a visual fallback when live requests fail. |
| Port `5173` is occupied | Stop the conflicting process. Vite uses `strictPort: true` and will not silently select another port. |
| API uses a different port | Update `PORT` and the `/api` and `/uploads` proxy targets in `client/vite.config.js`, then restart both processes. |
| Demo password does not work after re-seeding | Existing account passwords are preserved. Use the account's current password or reset it through an authorized admin account. |
| An event appears but checkout rejects it | Check its publication status, start time, and current stock. Existing seeded schedules are not automatically moved forward. |
| Booking succeeded but notifications or cart cleanup lag | Inspect `bookings.sync_status`, restore MongoDB connectivity, and allow the retry timer to run or use the admin retry action. Check My Tickets before submitting another checkout. |
| Poster upload fails | Use PNG, JPEG, or WebP within 5 MiB, and confirm the backend can write to `server/public/uploads/`. |
| 3D venue view is unavailable | Use the 2D map and check browser WebGL support. Venue previews are only exposed for Impact Arena events. |
| NexAI returns HTTP 429 | Wait for the current one-minute rate window to reset. The API allows 12 assistant requests per window across the whole server process. |
| PowerShell blocks `npm.ps1` | Use `npm.cmd` for the documented npm commands. |
| Tests fail with `listen EPERM` | Authentication tests need permission to open a temporary localhost HTTP server. Run them in an environment that permits localhost listeners. |

## Known limitations

- **Concurrent checkout is not idempotent.** Two requests can read the same cart and create separate bookings while stock remains available. The frontend guards repeated submissions within its own instance, but the server has no checkout idempotency key or cart claim across tabs or clients.
- **Synchronization can clear newer cart selections.** A repeated sync removes items by ticket type ID without a cart version check. A newly added item of the same type can be removed by an older booking's retry.
- **Concurrent admin item edits can miscalculate stock.** The current item-edit path reads the previous quantity before locking the booking, so simultaneous edits can calculate inventory changes from a stale value.
- SQL transactions protect the booking writes, but the automated unit tests do not prove all concurrency scenarios against real MySQL. These concurrency issues need correction and targeted verification before public use.
- There is no payment gateway, refund processing, real seat allocation, QR admission validation service, or certificate issuance. A displayed QR code identifies a booking; it is not a signed admission credential.
- Reviews do not require a verified purchase or attendance. Seeded reviews are demonstration content.
- Published event listing currently returns at most 80 events before server-side filters are applied, and it does not exclude events whose start time has passed. Checkout performs its own start-time validation; NexAI does not independently filter past events.
- Production startup rejects a missing or bundled placeholder JWT secret and sets Secure session cookies. A production deployment would also need HTTPS and an explicit hosting/routing setup. Setting `NODE_ENV=production` alone does not provide that deployment.
- Logout clears the browser cookie but does not revoke an already copied JWT. Tokens expire after 12 hours; protected requests also check the account's current SQL record and role.
- The repository includes local demo database credentials and demo login accounts. They are intended for local development.

## Supporting documentation

| Document | Purpose |
| --- | --- |
| [SQL schema](server/sql/001_schema.sql) | Current relational schema and constraints |
| [MongoDB models](server/src/models.js) | Current document schemas and indexes |
| [Architecture diagram](docs/diagrams/architecture.svg) | Supporting architecture illustration |
| [SQL ER diagram](docs/diagrams/sql_er.svg) | Relational model illustration |
| [NoSQL flow diagram](docs/diagrams/nosql_flow.svg) | Supporting document flow illustration |
| [Thai startup guide](START_HERE_TH.md) | Earlier step-by-step local setup instructions |
| [Thai V1-to-V2 upgrade guide](UPGRADE_V1_TO_V2_TH.md) | Earlier upgrade walkthrough |
| [V2 product specification](docs/V2_PRODUCT_SPEC.md) | Discovery taxonomy and V2 design context |
| [Authentication test notes](docs/AUTH_TESTS_TH.md) | Authentication behavior and verification scope |
| [Screenshot guide](docs/screenshots/README.md) | Suggested runtime evidence |
| [Presentation outline](docs/presentation_outline.md) | Demonstration presentation structure |

Some earlier guides and diagrams describe four MongoDB collections and nine entities. The current source adds `user_activity_logs`, making the implemented totals **five MongoDB collections and ten entities**. Use the current schema, models, and this README when checking those totals.
