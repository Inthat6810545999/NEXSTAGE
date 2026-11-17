# งานคนที่ 5: ระบบผู้ใช้และสิทธิ์

## สิ่งที่ปรับ

- แยก Express app ไปที่ `server/src/app.js` ให้สร้าง app สำหรับทดสอบได้ โดย `server/src/index.js` ยังเป็นจุดเริ่ม server และเชื่อมต่อฐานข้อมูลตามเดิม
- Register สร้างได้เฉพาะ customer, แปลง email เป็นตัวพิมพ์เล็ก และ hash password ด้วย bcrypt cost 10; ไม่ส่ง hash กลับ API
- ใช้ตัวตรวจ password ร่วมกันใน Register และการสร้าง/แก้ไขบัญชีผ่าน Admin: อย่างน้อย 8 ตัวอักษร ไม่เกิน 72 UTF-8 bytes และไม่ตัดช่องว่างหัวท้าย เพื่อให้ตรงกับตอน Login และไม่ถูก bcrypt ตัดข้อมูลเงียบ ๆ
- Login ตรวจชนิดและขนาด password ก่อนเรียก bcrypt; รหัสผ่านผิดหรือไม่พบบัญชีตอบ 401 เหมือนกัน; input ผิดรูปแบบตอบ 400
- ทุก protected request ตรวจบัญชีและ role ปัจจุบันจาก SQL ทำให้ลบบัญชีแล้วใช้ session เดิมไม่ได้ และลดสิทธิ์แล้วเข้า Admin ไม่ได้ทันที
- ตรวจ JWT ด้วย HS256 เท่านั้น; `/api/me` ใช้การตรวจ session ชุดเดียวกันกับ protected API
- Production ต้องตั้ง JWT_SECRET ของตนเอง; ค่าว่างและค่า placeholder ที่ให้มากับโครงการจะทำให้เริ่มระบบไม่สำเร็จ
- Session cookie อายุ 12 ชั่วโมง มี HttpOnly, SameSite=Lax, Path=/ และ Secure ใน production; Logout ล้าง cookie ด้วย options เดียวกัน

## วิธีทดสอบ

จาก root ของ repository:

```sh
npm ci --prefix server
npm test --prefix server
```

Tests ใหม่อยู่ใน `server/test/auth.test.js` ทดสอบผ่าน HTTP กับ Express routes จริง ใช้ bcrypt, JWT และ cookie-parser จริง โดยจำลองเฉพาะ SQL persistence ในหน่วยความจำ จึงไม่ต้องเปิด MySQL/MongoDB และไม่เปลี่ยนข้อมูลจริง

ครอบคลุม Register, email ซ้ำ, Login ถูก/ผิด, password hash, input ผิดรูปแบบ, password ภาษาไทยเกินขอบเขต bcrypt, session cookie, Logout, JWT หมดอายุ/ลายเซ็นผิด/algorithm ผิด, guest/customer ถูกปฏิเสธทุก Admin route (รวม Activity Log), Admin เข้า overview ได้, เปลี่ยน role/ลบบัญชีระหว่างมี session และกรณีฐานข้อมูลขัดข้อง

GitHub Actions เดิมรัน `npm test --prefix server` เมื่อ push และเปิด PR บน Node 20/22 อยู่แล้ว จึงจะรัน tests ใหม่นี้โดยอัตโนมัติ

## ขอบเขตการยืนยัน

- การบังคับ UNIQUE email ใน MySQL จริง, การเก็บข้อมูลข้ามการ restart และ flow Booking/Activity Log ครบระบบ ยังต้องตรวจด้วยฐานข้อมูลจริงในงาน integration ของคนที่ 6
- Secure cookie ตรวจจาก Set-Cookie header; การส่ง cookie บน HTTPS จริงต้องตรวจในสภาพแวดล้อม deploy
- Logout ล้าง cookie ฝั่ง browser ตามระบบ JWT เดิม ไม่ได้เพิ่มฐานข้อมูล session หรือ token denylist; token ที่คัดลอกไว้ก่อน Logout ยังไม่ถูกเพิกถอนจนหมดอายุ หากบัญชีและสิทธิ์ยังใช้งานได้
- บัญชีเก่าที่สมัครด้วย password มีช่องว่างหัวท้ายถูกระบบเดิม trim ก่อน hash; บัญชีเหล่านั้นยังต้องใช้ password ตามค่าที่ระบบเดิมบันทึก หรือให้ Admin ตั้ง password ใหม่
