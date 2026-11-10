# เริ่มต้น NEXSTAGE ใน VS Code — ทีละขั้นตอน

**หัวข้อ:** NEXSTAGE: Event Booking System  
**ธีม:** Purple & White (ม่วง–ขาว)  
**ฐานข้อมูล:** MySQL (5 ตาราง) + MongoDB (4 Collections)

## สิ่งที่เตรียมก่อน

- ติดตั้ง **VS Code**, **Docker Desktop** และ **Node.js 20 หรือใหม่กว่า**
- ต่ออินเทอร์เน็ตเพื่อใช้ `npm install` ครั้งแรก (หลังติดตั้งแพ็กเกจแล้ว แอปทำงานโดยไม่ต้องเรียก API ภายนอก)

## STEP 1 — เปิดโฟลเดอร์ใน VS Code

1. แตกไฟล์ ZIP จะได้โฟลเดอร์ `NEXSTAGE`.
2. เปิด VS Code.
3. คลิก **File > Open Folder > NEXSTAGE**.
4. คลิกเมนู **Terminal > New Terminal**.
5. ตรวจว่าบรรทัด Terminal อยู่ที่โฟลเดอร์ `NEXSTAGE`.

## STEP 2 — เริ่ม MySQL + MongoDB

1. เปิด Docker Desktop รอจนแสดงว่าทำงานเรียบร้อย.
2. ที่ Terminal ในโฟลเดอร์ NEXSTAGE พิมพ์:

```bash
docker compose up -d
```

3. ตรวจ:

```bash
docker compose ps
```

ต้องเห็น Service `mysql` และ `mongo` ทำงาน.

## STEP 3 — เปิด Backend

Terminal แรก:

```bash
cd server
cp .env.example .env
npm install
npm run seed
npm run dev
```

**Windows PowerShell:** เปลี่ยนคำสั่ง `cp .env.example .env` เป็น `Copy-Item .env.example .env`.

ถ้าทำถูกจะเห็นข้อความประมาณ `NEXSTAGE API running at http://127.0.0.1:4000`.

## STEP 4 — เปิด Frontend

คลิก **Terminal > New Terminal** อีกครั้ง แล้วเริ่มจากโฟลเดอร์ `NEXSTAGE`:

```bash
cd client
npm install
npm run dev
```

เปิดเว็บ **http://127.0.0.1:5173**.

> ถ้าจะดูเฉพาะหน้าตาเว็บก่อนตั้งค่าระบบ สามารถเปิด `preview.html` ในเบราว์เซอร์ได้ แต่ไฟล์นี้เป็นเพียงตัวอย่างดีไซน์ ไม่ได้เชื่อมฐานข้อมูลและปุ่มต่าง ๆ ไม่ทำงาน

## STEP 5 — ทดลองใช้ระบบ

**บัญชีผู้ใช้:**
- Email: `student@nexstage.local`
- Password: `Demo12345!`

ให้ลองเลือกกิจกรรม > เลือกบัตร > Add to cart > My cart > Confirm booking > ดู My Tickets.

**บัญชี Admin:**
- Email: `admin@nexstage.local`
- Password: `Demo12345!`

ให้ลองเปิด **Dashboard** แล้วใช้ **Data Studio** สำหรับ CRUD ทั้ง 9 Entity. คลิก **Demonstrate SQL rollback** เพื่อทดสอบว่ารายการจองจำลองและสต็อกที่ถูกเปลี่ยนชั่วคราวถูกย้อนกลับทั้งหมด.

## STEP 6 — หลักฐานสำหรับอาจารย์

หลังระบบทำงานจริง ให้ถ่าย Screenshot อย่างน้อย:

1. หน้า Home และหน้า Event Details.
2. SQL Tables ทั้ง 5 และตัวอย่าง CRUD.
3. MongoDB Collections ทั้ง 4 และตัวอย่าง CRUD.
4. การจองสำเร็จ และสต็อกที่ลดลง.
5. ผล **Rollback** ที่แสดง `before = after` และ `booking_rows_remaining = 0`.
6. รูปสถาปัตยกรรม + ER diagram + NoSQL flow (`docs/diagrams`).

ดูรายการละเอียดที่ `docs/screenshots/README.md`.

## หมายเหตุ

- โค้ดที่ให้เป็นชุดเริ่มต้นที่มีทั้ง Frontend, Backend, SQL, Mongo schema และระบบธุรกรรม แต่ยัง **ต้องทดสอบการเชื่อมต่อและ Screenshot จริงบนเครื่องของคุณก่อนส่ง**
- MySQL ใช้พอร์ต **3307** เพื่อหลีกเลี่ยงชนกับ MySQL เดิมที่ใช้ 3306.
- ไม่มีการตัดเงินจริง และไม่มีการส่งข้อมูลไปยัง Cloud Database หรือ External API.
- ถ้าเจอ Error ส่งภาพหน้าจอ Terminal พร้อมข้อความ Error มา แล้วเราจะไล่แก้ทีละขั้นตอน.
