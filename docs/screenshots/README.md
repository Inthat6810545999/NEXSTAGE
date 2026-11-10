# Required evidence to capture after running the real app

`01_UI_DESIGN_PREVIEW.png` is a **static design preview** only. It is NOT database or transaction evidence. Do not represent it as real runtime proof.

Capture YOUR OWN genuine screenshots after Docker, Node API and React frontend are running:

1. `02_home_live.png` — NEXSTAGE live homepage with events loaded from MySQL.
2. `03_sql_users.png` — Admin Data Studio > users (Create + Read).
3. `04_sql_events.png` — Admin Data Studio > events.
4. `05_sql_ticket_types.png` — Admin Data Studio > ticket_types (stock values).
5. `06_sql_bookings.png` — SQL bookings and booking_items after successful checkout.
6. `07_mongo_carts.png` — Admin Data Studio > carts (MongoDB).
7. `08_mongo_reviews.png` — Admin Data Studio > reviews.
8. `09_mongo_wishlists.png` — Admin Data Studio > wishlists.
9. `10_mongo_notifications.png` — Admin Data Studio > notifications.
10. `11_booking_success.png` — My Tickets digital pass after successful checkout.
11. `12_rollback_result.png` — Admin > **Demonstrate SQL rollback**, showing stock before/after and 0 temporary bookings remaining.
12. `13_admin_crud.png` — Admin create/update/delete sample records across both database engines.
13. `14_architecture.png` — May screenshot diagrams or use the SVG files under docs/diagrams.

Recommended SQL evidence in MySQL Workbench:

```sql
USE nexstage;
SELECT u.display_name, b.booking_code, b.status,
       e.title, t.label, bi.quantity, b.total_amount
FROM bookings b JOIN users u ON u.id=b.user_id
JOIN booking_items bi ON bi.booking_id=b.id
JOIN ticket_types t ON t.id=bi.ticket_type_id
JOIN events e ON e.id=t.event_id
ORDER BY b.created_at DESC;

SELECT id,event_id,label,capacity,available FROM ticket_types ORDER BY id;
SELECT id,booking_code,sync_status FROM bookings ORDER BY id DESC;
```

Use your own screenshots, not mock screenshots, when submitting transactional proof.
