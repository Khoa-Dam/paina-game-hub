# PAINA GAME HUB

Nền tảng mini game nội bộ cho nhân sự PAINA — admin tạo game, nhân sự đăng
nhập và chơi, điểm số lưu tập trung, bảng xếp hạng cập nhật tự động.

## Trạng thái bản này (v1 / MVP)

Đã triển khai đầy đủ, chạy được thật (không phải mock):

- Đăng nhập nhân sự bằng **Họ tên + Mã nhân viên** (theo yêu cầu đơn giản hoá
  của chủ dự án — không OTP, không Google OAuth, không mật khẩu cho nhân sự).
- Đăng nhập Admin riêng bằng tài khoản/mật khẩu (1 tài khoản duy nhất, cấu
  hình qua biến môi trường, không có chức năng tự đăng ký admin).
- Game Engine cho **cả 4 loại game**: Trắc nghiệm (Quiz), Đúng/Sai, Đuổi
  hình bắt chữ (gõ đáp án tự do, không phân biệt hoa/thường/dấu), Sắp xếp từ
  (chạm từ xáo trộn theo đúng thứ tự). Mỗi loại có form tạo câu hỏi riêng ở
  admin và màn chơi riêng ở giao diện nhân sự. Hỗ trợ ảnh minh hoạ, gợi ý,
  giới hạn thời gian, số lượt chơi; điểm được tính **ở backend** (đáp án
  đúng không gửi về client trước khi trả lời).
- Admin: Dashboard, quản lý game (tạo theo từng loại/sửa/sao chép/đổi trạng
  thái/xoá), quản lý câu hỏi theo đúng loại game, quản lý nhân sự (thêm/sửa/
  khoá/xoá/import CSV), xem kết quả, bảng xếp hạng, xuất báo cáo CSV, audit
  log cho mọi thao tác ghi.
- Người dùng: trang chủ, danh sách game, chơi game (engine riêng theo từng
  loại), kết quả, lịch sử chơi, bảng xếp hạng (theo game / theo tháng / tổng
  điểm / theo phòng ban — chỉ hiển thị họ tên, phòng ban, điểm, thứ hạng —
  không lộ mã NV/email), hồ sơ.
- Row-level kiểm tra phân quyền ở **mọi** API route (không chỉ ở giao diện).

**Chưa triển khai** (nêu rõ theo yêu cầu, không giả vờ đã xong):

- Google OAuth / OTP: bị loại khỏi phạm vi v1 theo yêu cầu minh bạch của
  người dùng ("đăng nhập đơn giản, không yêu cầu phức tạp").
- Deploy lên Vercel/Supabase: chưa thực hiện, người dùng chọn chạy local để
  demo trước (xem mục cấu hình production bên dưới khi sẵn sàng).

## Công nghệ

- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- Prisma ORM + PostgreSQL. Local dev dùng PostgreSQL trong Docker; production
  có thể dùng Supabase Postgres với transaction pooler cho runtime.
- Không dùng NextAuth / Supabase Auth — session tự ký (HMAC) qua cookie
  httpOnly, vì luồng đăng nhập được đơn giản hoá theo yêu cầu.
- Ảnh khi chạy local được lưu tại `public/uploads/`. Trên Vercel, API upload
  lưu ảnh vào public Vercel Blob store. Kết nối store với project để Vercel
  cấp `BLOB_STORE_ID` và dùng OIDC cho server upload; `BLOB_READ_WRITE_TOKEN`
  chỉ cần nếu chạy ngoài Vercel hoặc cần upload trực tiếp từ trình duyệt.
  Giới hạn ảnh upload là 4 MB để nằm dưới giới hạn payload của Vercel Functions.

## Chạy local

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run db:seed
npm run dev
```

Khởi động container PostgreSQL local trước khi migrate:

```powershell
docker start paina-postgres
```

Trong `.env`, local có thể dùng cùng URL trực tiếp cho `DATABASE_URL` và
`DIRECT_URL`. Trên Vercel, `DATABASE_URL` nên là Supabase transaction pooler;
`DIRECT_URL` dành cho migration và tác vụ cần kết nối direct/session. Không
đưa file `.env` hoặc thông tin xác thực vào Git.

Mở `http://localhost:3000`.

- Tài khoản admin seed sẵn: **admin / ChangeMe123!** (đổi qua biến môi
  trường `ADMIN_USERNAME` / `ADMIN_PASSWORD` trong `.env` trước khi seed).
- 5 nhân sự mẫu (NV0001–NV0005) và 4 game mẫu — mỗi loại một game ("Kiến
  thức PAINA" - Quiz, "Đúng hay Sai?", "Đuổi hình bắt chữ", "Sắp xếp từ") —
  đã có sẵn để demo ngay.

### Lưu ý tốc độ dev server trên Windows

Trên máy đã test, Next.js (Turbopack) compile từng route lần đầu khá chậm
(có route mất 20–60s ở lần truy cập đầu tiên) kèm cảnh báo "Slow filesystem
detected". Đây là đặc điểm của thư mục `F:\Claude code` trên máy này, không
phải lỗi ứng dụng — các lần truy cập sau đều nhanh (vài chục ms). Nếu muốn
cải thiện, có thể chuyển project sang ổ đĩa local nhanh hơn, hoặc build
production (`npm run build && npm start`) để bỏ qua compile-on-demand.

## Cấu hình cần thiết trước khi dùng thật (production)

Những phần sau được đánh dấu rõ là **giả định hợp lý cho demo**, cần người
có thẩm quyền cấu hình lại trước khi phát hành nội bộ:

1. **`SESSION_SECRET`** trong `.env` — đổi sang chuỗi ngẫu nhiên dài, không
   dùng giá trị mẫu trong repo.
2. **`ADMIN_PASSWORD`** — đổi ngay sau lần seed đầu, hoặc đổi qua Prisma
   Studio / seed lại với mật khẩu mới.
3. **Database**: schema hiện dùng PostgreSQL. Trên Vercel, đặt
   `DATABASE_URL` thành transaction-pooler URL của Supabase và `DIRECT_URL`
   thành URL direct/session dùng cho migration; kiểm tra query parameter
   pooler theo hướng dẫn Prisma/Supabase trước khi triển khai.
4. **Lưu trữ ảnh**: trong Vercel, tạo public Blob store và kết nối với project.
   Server upload dùng OIDC qua `BLOB_STORE_ID` do Vercel quản lý; không cần tạo
   token tĩnh nếu chỉ upload từ server route. File ảnh được lưu riêng khỏi
   filesystem tạm thời của function.
5. **Load testing**: chạy kịch bản local trong `load-tests/README.md` để
   tìm vấn đề ứng dụng trước. Local Docker không mô phỏng Vercel serverless;
   cần staging Vercel/Supabase riêng để đo pooler và compute trước khi công bố.
6. Triển khai Vercel: `vercel.json`/CI chưa thiết lập trong lần này (người
   dùng chọn "chạy local trước để demo"); khi sẵn sàng, tạo project Vercel,
   set các biến môi trường trên, rồi deploy như Next.js app thông thường.

## Cấu trúc thư mục chính

```
prisma/schema.prisma       Toàn bộ data model (8 bảng + AdminAccount)
prisma/seed.ts             Seed admin + nhân sự mẫu + 1 game mẫu cho mỗi loại
src/lib/session.ts         Session (employee/admin) ký bằng HMAC, cookie httpOnly
src/lib/scoring.ts         Logic tính điểm (đúng/sai, điểm thưởng tốc độ, trừ gợi ý)
src/lib/gameEngine.ts      Mã hoá/giải mã câu hỏi theo từng loại game, xáo trộn từ
src/lib/leaderboard.ts     Logic 4 loại bảng xếp hạng (game/tháng/tổng/phòng ban)
src/app/api/**             Toàn bộ API (auth, admin/*, games, sessions, leaderboard...)
src/app/(app)/**           Giao diện nhân sự (route group, không đổi URL)
src/app/admin/(dashboard)/** Giao diện admin (route group, /admin/login tách riêng)
```
