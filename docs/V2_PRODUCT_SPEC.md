# NEXSTAGE V2 — Discover Experiences For Every Stage of Life

Core idea: People do not only attend concerts. They join camps, volunteer projects, certificate courses, workshops, wellness programs and retreats. NEXSTAGE helps them discover, manage and book suitable activities from a single hybrid-database application.

## Two-dimensional discovery taxonomy

| Audience (`events.audience_groups`, JSON array) | Examples | Benefit labels (`events.benefits`, JSON array) |
|---|---|---|
| `student` School students | Portfolio preparation camp, volunteer project, science camp | `portfolio`, `volunteer` |
| `university` University students | Skill workshop, career networking, volunteer project | `certificate`, `networking`, `volunteer` |
| `working` Working adults | Concert, professional certificate course, workshop | `entertainment`, `certificate` |
| `senior` Senior adults | Dharma retreat, gentle wellness program, volunteering | `wellness`, `volunteer` |
| `everyone` Open to all | Festival, exhibition, community gathering | Any tags |

Every event also has **one primary category** (`events.category` text) like `Music`, `Portfolio Camp`, `Volunteer`, `Certificate Course`, or `Dharma & Wellness`. Admins can enter a new category name themselves.

Multiple target audiences per event support shared experiences without enforcing exclusive age labels. Use an "Everyone" designation only for generally accessible events; avoid using demographic labels as booking eligibility enforcement.

## Data flow

```text
React Discover: audience filter + category filter + search
             -> GET /api/events (SQL, published only)
             -> Event cards + Event details
             -> Cart in MongoDB
             -> Checkout uses MySQL row locks and rollback
             -> MongoDB cart/notification reconciliation

React Admin: native event form + image picker
           -> POST /api/admin/upload  (local server/public/uploads)
           -> POST /api/admin/data/events (SQL JSON columns)
           -> Ticket Types form (SQL FK references event)
```

The SQL schema remains **5 connected tables**, and MongoDB remains **4 document collections**. `events.audience_groups` and `events.benefits` are *JSON columns in MySQL*, which keep event metadata together with its SQL-owned booking/inventory. PostgreSQL/MongoDB stores are not required for the tags; this retains architectural simplicity and avoids extra distributed update steps.

## V2 scope and next UX work

Available in the V2 development package: discovery filters, event/ticket custom forms, audience/benefit data, local poster upload, dashboard category distribution, refined responsive interactions. Older booking, cancel, SQL rollback, SQL/NoSQL admin Data Studio routes remain.

Future polishing before Final: friendlier editors for the remaining 7 entities, comprehensive E2E stock tests, completed screenshot evidence, accessibility audit and production-grade security.
