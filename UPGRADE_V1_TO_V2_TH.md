# NEXSTAGE V2 — อัปเกรดจาก V1 โดยไม่ลบข้อมูลเดิม

**สถานะ:** Version 2 development build / **ยังไม่ใช่ Final**

## สิ่งใหม่ใน V2

- ค้นหาอีเวนต์ด้วย **กลุ่มเป้าหมาย** (All / School students / University / Working adults / Seniors) และ **ประเภทกิจกรรม** แยกกัน เช่น Portfolio Camp, Volunteer, Certificate Course, Dharma & Wellness, Music, Esports ฯลฯ
- อีเวนต์หนึ่งงานเลือกหลายกลุ่มเป้าหมายได้ เช่น จิตอาสาที่เปิดให้นักเรียน มหาวิทยาลัย และวัยทำงานร่วมกัน
- ป้ายประโยชน์อีเวนต์: Portfolio, Volunteer hours, Certificate, Entertainment, Wellness, Networking
- Admin > Events กรอกชื่อของคุณเอง, วันเวลา, สถานที่, คำบรรยาย, ประเภทกิจกรรม, กลุ่มเป้าหมาย, ประโยชน์, สถานะเผยแพร่ และ **อัปโหลดโปสเตอร์ใน local server** ได้โดยไม่ต้องพิมพ์ JSON
- Admin > Ticket Types มีฟอร์มตั้งชื่อบัตร ราคา จำนวนบัตร; Admin Dashboard มีกราฟจำนวนงานตามหมวดหมู่
- ยังคง MySQL 5 ตารางที่สัมพันธ์กัน, MongoDB 4 คอลเล็กชัน, หน้าจัดการ CRUD, การจองบัตร, Transaction/Rollback และระบบซิงก์เดิม

## แนะนำ: สำรองโฟลเดอร์ V1 ก่อนอัปเกรด

1. ปิด frontend และ backend โดยกด Ctrl+C ใน **Terminal ของแต่ละบริการเท่านั้น**; **ไม่ต้องลบ Docker volume**
2. ใน Windows File Explorer ให้ Copy โฟลเดอร์โปรเจกต์ `NEXSTAGE` เดิมไว้เป็น `NEXSTAGE_V1_BACKUP` เพื่อสำรองซอร์สโค้ดและไฟล์ `.env`
3. แตก ZIP ของ V2 และ **คัดลอกเนื้อหาภายในโฟลเดอร์ NEXSTAGE ของ V2** ไปวางทับไฟล์โค้ดในโฟลเดอร์ `NEXSTAGE` ที่ใช้อยู่เดิม (เลือก Replace files)
4. **รักษาไฟล์ `server/.env` เดิมไว้** — ZIP ไม่ได้บรรจุ `.env`; อย่าเปลี่ยน credentials ที่ใช้เชื่อมฐานข้อมูล
5. **ห้ามใช้ `docker compose down -v`** เพราะ `-v` จะลบ Volume ที่เก็บข้อมูล SQL/MongoDB

> วิธีนี้สำคัญ: หากแตก ZIP แล้วรัน Docker Compose ภายใต้ชื่อโฟลเดอร์/ชื่อโปรเจกต์ใหม่ อาจสร้าง Volume คนละชุดกับ V1 ทำให้ดูเหมือนข้อมูลจองเดิมหายไป (ทั้งที่ยังอยู่ใน Volume เดิม)

## เปิด V2 ใน VS Code / Windows PowerShell

ตรวจว่ามี MySQL และ MongoDB เดิมทำงานอยู่:

```powershell
docker compose ps
```

ต้องมี MySQL port 3307 และ MongoDB port 27018 ตามที่คุณแก้ไว้ก่อนหน้านี้ หากยังไม่ Up ให้พิมพ์ `docker compose up -d` จากโฟลเดอร์ NEXSTAGE **เดิม**

**Terminal Backend** (จากโฟลเดอร์ NEXSTAGE):

```powershell
cd server
npm.cmd install
npm.cmd run migrate:v2
npm.cmd run seed
npm.cmd run dev
```

- `migrate:v2` สำคัญมาก: เพิ่มคอลัมน์ JSON `audience_groups` และ `benefits` ลงในตาราง `events` เดิม โดยไม่ลบ Event, Booking หรือ Stock ที่มีอยู่
- `seed` เป็นตัวเลือกสำหรับเพิ่ม **4 อีเวนต์ตัวอย่างของ V2** (ค่ายเก็บพอร์ต, จิตอาสา, เรียนรับใบเซอร์, ค่ายธรรมะ) ไม่ได้ลบหรือเปลี่ยนชื่ออีเวนต์ที่คุณสร้างเอง
- ถ้าไม่ต้องการอีเวนต์ตัวอย่าง ให้ข้าม `npm.cmd run seed` ได้ (แต่ต้องรัน migration)
- หลังอัปเดต `multer` และแก้ proxy ต้องเปิด Backend/Frontend ใหม่

**Terminal Frontend** (เปิดอีก Terminal ที่โฟลเดอร์ NEXSTAGE):

```powershell
cd client
npm.cmd install
npm.cmd run dev
```

เปิด `http://127.0.0.1:5173/` แล้วกด `Ctrl+Shift+R` เพื่อโหลดหน้าเว็บใหม่

## วิธีเพิ่มอีเวนต์ของคุณเอง

1. เข้าสู่ระบบบัญชี Admin ที่ใช้กับ V1 แล้วกด **Dashboard**
2. ที่ Data studio กด **Events** และใช้ฟอร์ม **Create your own event**
3. พิมพ์ชื่ออีเวนต์เอง เช่น “University Portfolio Mastercamp”
4. เลือก **Event category** (สามารถพิมพ์หมวดใหม่เองได้) และเลือก **Who is this event for?** ได้มากกว่า 1 กลุ่ม
5. เลือก **Event benefits** เช่น Portfolio, Volunteer hours, Certificate
6. เลือกวันเวลาเริ่ม/สิ้นสุด, สถานที่, เมือง, คำอธิบาย และอัปโหลดรูปจากเครื่อง (PNG / JPEG / WebP ขนาดไม่เกิน 5 MB)
7. เลือกสถานะ `Published` แล้วกด **Create record**
8. ใน Data Studio ไปที่ **Ticket Types** เพื่อสร้าง General / VIP / Student / Free Admission พร้อมราคาและ Capacity โดยเลือกอีเวนต์ที่เพิ่งสร้าง
9. กลับไปที่ Discover จะเห็นอีเวนต์ในหมวดกลุ่มเป้าหมายและประเภทที่กำหนด

**หมายเหตุ:** รูปโปสเตอร์ของคุณจะถูกเก็บใน `server/public/uploads/` บนเครื่องคุณเอง ไม่มีการอัปโหลดไป Cloud หากต้องย้ายไปเครื่องใหม่ ให้ย้ายโฟลเดอร์ดังกล่าวไปด้วย

## Checklist ทดสอบงานตาม Requirements

- [ ] SQL มี `users`, `events`, `ticket_types`, `bookings`, `booking_items` (5 ตารางเชื่อมกันด้วย FK)
- [ ] NoSQL มี `carts`, `reviews`, `wishlists`, `notifications` (4 Collections)
- [ ] Admin Data Studio **Create / Read / Update / Delete** ทั้ง 9 Entities ตามข้อจำกัด FK/Stock (ทดสอบกับข้อมูลแยกชั่วคราว)
- [ ] สร้างชื่ออีเวนต์เอง เลือกหลายกลุ่มเป้าหมาย ตั้งประโยชน์ และอัปโหลดภาพ local
- [ ] สร้าง Ticket Type ของอีเวนต์เองแล้วจองได้โดยใช้ Student account
- [ ] Booking สำเร็จ: MySQL สร้าง Booking + Booking Items และลด stock
- [ ] Rollback ปุ่ม Demonstrate SQL rollback: before=after และ booking_rows_remaining=0
- [ ] ทดสอบ stock ไม่พอแยกต่างหาก
- [ ] MongoDB Cart / Notification sync และ Retry หลังจอง
- [ ] บันทึก screenshots จริง, ตรวจ README และ Diagram, ทำสไลด์ไม่เกิน 10 หน้า

## การทดสอบและข้อจำกัด ณ รุ่นนี้

- โค้ด Backend ผ่านการตรวจ syntax ด้วย `node --check` แต่ยัง **ไม่ได้ทดสอบ End-to-end กับ Docker/MySQL/MongoDB บน Windows ของคุณ** หลังการอัปเกรดนี้
- ฟอร์ม Events และ Ticket Types เป็นฟอร์มปกติ; Entity อื่นใช้ JSON editor ใน Data Studio อยู่ เพราะต้องรองรับโครงสร้างข้อมูลที่แตกต่างกัน
- ไม่มีการออกใบประกาศนียบัตรจริง ป้าย `Certificate` หมายถึงงานประเภทที่อาจให้ใบเซอร์ ไม่ใช่ระบบตรวจสอบใบเซอร์
- กลุ่มเป้าหมายใช้เพื่อแนะนำ/กรองการค้นหา **ไม่ใช่ข้อจำกัดอายุบังคับในการจอง** หากอีเวนต์มีเกณฑ์อายุจริง ต้องออกแบบเงื่อนไขเพิ่มเติม
- ไม่ใช้ Cloud storage, Payment API หรือบริการภายนอก; การจัดการ MySQL ↔ MongoDB ยังใช้ eventual consistency/retry แบบเดิม ไม่ใช่ distributed ACID
