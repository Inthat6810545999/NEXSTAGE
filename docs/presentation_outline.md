# NEXSTAGE — Presentation plan (maximum 10 slides)

1. **Title & Hook** — NEXSTAGE: Experiences for Every Stage of Life; premium Purple & White landing page.
2. **Problem & Users** — discovering relevant experiences for school students, university students, working adults and seniors; users/admins.
3. **Core Features & Screens** — Audience Filters + Category Filters, Event Details, Ticket Cart, My Tickets, Reviews, Favorites, Custom Event Admin.
4. **Architecture** — React -> Express monolith -> local MySQL + local MongoDB; posters local.
5. **SQL ER Diagram** — 5 interconnected tables, PK/FK and inventory constraints.
6. **NoSQL Design** — 4 collections and justification for flexible documents.
7. **CRUD Demonstration** — Admin event/ticket forms (self-named events, target audiences, poster upload) plus CRUD proof for both database engines.
8. **Successful Checkout** — SELECT ... FOR UPDATE, INSERT bookings/items, UPDATE stock, COMMIT.
9. **Rollback & Hybrid Consistency** — simulated failure after SQL writes, ROLLBACK restores stock; Mongo reconciliation through persisted sync_status + retry.
10. **Outcome, Testing & GitHub** — screenshots, challenges, tests, repository link, limitations and next steps.

Presentation demo order: Browse -> Login as student -> Add 2 tickets -> Cart -> Confirm booking -> Digital ticket QR -> Login as admin -> Data Studio -> Demonstrate SQL rollback.

Do not claim SQL and MongoDB are one atomic distributed transaction. Mongo updates are asynchronously reconciled after SQL commit.
