# Mô tả dự án & yêu cầu tính năng mới

Nov 16, 2026 · @Tdoo

## Hiện trạng & đích muốn đạt được

**Đang làm gì:** PAINA GAME HUB đã deploy thật tại [paina-game-hub.vercel.app](https://paina-game-hub.vercel.app) (Next.js + Prisma + Postgres trên Supabase, hội trên Vercel). Nhân viên đăng nhập bằng Họ tên + Mã nhân viên; lần đầu nhập một mã chưa từng có sẽ tự động tạo tài khoản (không cần admin tạo trước), không có mật khẩu, không chọn phòng ban — phòng ban chỉ được gán sau nếu admin vào sửa tay từng người.

**Đích muốn đạt:** nâng cấp luồng đăng ký/đăng nhập để sát với thực tế vận hành công ty hơn, cụ thể:

**Mục tiêu gốc cần nhớ xuyên suốt:** dù sửa/thêm gì, app vẫn phải là một web chơi game nội bộ cho nhân sự **chạy ổn định, không lỗi**, và **kiến trúc đủ linh hoạt để tạo thêm nhiều loại game khác** trong tương lai (không chỉ dừng ở 4 loại hiện có) — đây là tiêu chí để IT tự đánh giá khi cân nhắc đánh đổi giữa tốc độ làm nhanh và chất lượng.

1. Mỗi nhân viên gắn đúng **phòng ban** theo sơ đồ tổ chức thật (chọn từ danh sách có sẵn, không tự gõ), để báo cáo/bảng xếp hạng theo phòng ban chính xác, không bị sai chính tả/không đồng nhất tên phòng ban giữa các người.
2. Mỗi người có **mật khẩu riêng** thay vì chỉ dựa vào họ tên + mã NV — an toàn hơn, tránh người khác đoán mã NV + tên rồi đăng nhập giùm.
3. Tách rõ **Đăng ký** (chỉ lần đầu, điền đầy đủ: họ tên, mã NV, phòng ban, mật khẩu) và **Đăng nhập** (các lần sau, chỉ cần mã NV + mật khẩu) — không bắt nhập lại thông tin cũ mỗi lần vào chơi.
4. Hệ thống **không bị chậm/sập** khi nhiều nhân viên cùng truy cập một lúc (vd. giờ nghỉ trưa, sự kiện toàn công ty).
5. Sửa dứt điểm lỗi hệ thống vô tình ghi đè loại game khi bấm "Lưu cấu hình", gây lỗi không thêm được câu hỏi.

Chi tiết từng yêu cầu ở các mục bên dưới.

## Yêu cầu 1 — Thêm phòng ban theo sơ đồ tổ chức

Danh sách phòng ban lấy từ file [Sơ đồ tổ chức PAINA](https://docs.google.com/spreadsheets/d/1hO49prys8t14-pVtu6fsdZWnzbBz2U8f/edit?gid=1394566893#gid=1394566893) (cập nhật 10/2026):

| Mã | Phòng ban |
| --- | --- |
| 01 | P. Kinh doanh Sỉ |
| 02 | P. Kinh doanh Lẻ |
| 03 | P. Kế toán – Nhân sự |
| 04 | P. Phát triển Sản phẩm & Media |
| 05 | P. Kế hoạch & Vận hành Sản xuất |
| 06 | Sản xuất (gồm Tổ Sáp, Tổ Đúc, Tổ Nguội, Tổ Khắc Cưa – Xi mạ) |
| 07 | P. QC – Đóng gói |
| 08 | P. Kho |

Ngoài 8 phòng trên, sơ đồ còn có Ban Giám đốc, Dự án Xây dựng Hệ thống, Ban Kiểm soát Nội bộ — cần chủ dự án xác nhận có cho nhân viên các đơn vị này chọn khi đăng ký không, hay chỉ áp dụng cho 8 phòng chính.

**Yêu cầu kỹ thuật:**

- [ ] Thêm màn "Quản lý phòng ban" trong Admin để tự thêm/sửa/xóa tên phòng ban — **không hardcode cứng trong code**, vì sơ đồ tổ chức có thể thay đổi (file nguồn đang có hẳn mục "Điều chỉnh vị trí" cho thấy công ty thay đổi khá thường xuyên).
- [ ] Ở form đăng ký/đăng nhập và form admin thêm/sửa nhân viên: trường Phòng ban đổi thành **dropdown chọn từ danh sách có sẵn** (hiện đang là ô tự gõ tự do ở trang admin).
- [ ] 7 tài khoản nhân viên đã có sẵn (seed/tự đăng ký trước đó) cần được admin gán lại đúng phòng ban sau khi tính năng này lên, vì trước giờ phòng ban đang để trống hoặc gõ tự do.

## Yêu cầu 2 — Tách luồng Đăng ký (lần đầu) và Đăng nhập (các lần sau)

**Luồng mong muốn:**

1. Nhân viên nhập **Mã nhân viên** trước tiên.
2. Hệ thống tự kiểm tra mã đó đã có tài khoản chưa:
   - **Chưa có** → hiện thêm ô **Họ tên**, dropdown **Phòng ban**, ô **Đặt mật khẩu** (+ nhập lại để xác nhận) — đây là màn đăng ký, chỉ hiện 1 lần duy nhất.
   - **Đã có** → chỉ hiện ô **Mật khẩu** để đăng nhập, không bắt nhập lại họ tên/phòng ban.

(Nếu làm 1 form liền như trên khó triển khai, IT có thể làm 2 trang/tab riêng "Đăng ký" và "Đăng nhập" — không bắt buộc đúng UI này, miễn đạt đúng hành vi: lần đầu phải đăng ký đầy đủ, lần sau chỉ cần mã NV + mật khẩu.)

**Yêu cầu kỹ thuật:**

- [ ] Mật khẩu phải được **hash trước khi lưu DB** (không lưu dạng plaintext) — tái dùng đúng cơ chế `bcryptjs` đang dùng cho tài khoản Admin trong code hiện tại.
- [ ] 7 tài khoản nhân viên đã tồn tại từ trước (tự đăng ký theo cơ chế cũ, chưa có mật khẩu) cần có đường đặt mật khẩu lần đầu, hoặc admin reset giúp — để không ai bị khóa ngoài hệ thống khi tính năng mới lên.
- [ ] Cân nhắc thêm "Quên mật khẩu" cho nhân viên tự reset (vd. qua admin duyệt lại, vì hệ thống hiện không có email xác thực).

## Yêu cầu 3 — Tránh sập/chậm khi nhiều người truy cập cùng lúc

**Vấn đề:** app đang chạy trên Vercel (serverless, tự scale theo request) + Supabase Postgres gói miễn phí (giới hạn số kết nối đồng thời, compute size Nano). Khi cả công ty cùng vào chơi 1 lúc (vd. giờ nghỉ trưa, sự kiện ra mắt), có nguy cơ:

- Supabase hết connection pool → lỗi "too many connections" hoặc request bị treo.
- Vercel gói Hobby giới hạn số lần chạy function/tháng, và cold-start gây chậm ở lượt truy cập đầu sau lúc vắng.

**Yêu cầu IT kiểm tra & xử lý:**

- [ ] Xác nhận Prisma đang dùng đúng connection pooling (transaction pooler qua pgbouncer) cho mọi truy vấn runtime — đã cấu hình nhưng cần review lại khi thêm tính năng mới (đăng ký/mật khẩu) để không vô tình mở thêm kết nối trực tiếp.
- [ ] Load test thử với số lượng người dùng giả lập tương đương quy mô công ty (vd. 50–100 người cùng lúc) trước khi công bố rộng rãi, để biết giới hạn thực tế.
- [ ] Cân nhắc nâng gói Supabase (tăng giới hạn kết nối) và/hoặc Vercel Pro nếu kết quả load test cho thấy gói miễn phí không đủ.
- [ ] Thêm thông báo rõ ràng cho người dùng nếu hệ thống quá tải tạm thời (thay vì màn hình trắng/lỗi khó hiểu), để trải nghiệm không "sập" một cách khó chịu.

## Yêu cầu 4 — Hiệu ứng trả lời đúng/sai + nhạc nền

**Mục tiêu:** tăng cảm giác "chơi game" thật sự thay vì chỉ là form trả lời trắc nghiệm đơn thuần.

**Hiệu ứng trả lời đúng/sai:**

- [ ] Trả lời đúng: hiệu ứng confetti/lòe sáng nhẹ quanh đáp án, kèm âm thanh "ting" vui tai, có thể thêm số điểm cộng bay lên (+10) cho sinh động.
- [ ] Trả lời sai: hiệu ứng rung nhẹ (shake) ở ô đáp án chọn sai, kèm âm thanh "buzz" ngắn, vẫn hiển thị rõ đáp án đúng như hiện tại.
- [ ] Trên điện thoại: thêm rung (vibration API) khi trả lời đúng/sai nếu trình duyệt hỗ trợ.
- [ ] Hiệu ứng phải **nhẹ, không làm chậm thao tác** — người chơi vẫn bấm "Câu tiếp theo" được ngay, không bị hiệu ứng chặn mất vài giây.

**Nhạc nền khi chơi:**

- [ ] Thêm 1 bản nhạc nền vui tươi (vibe Mario/quả dứa như theme hiện tại), phát lặp lại trong lúc chơi.
- [ ] **Bắt buộc có nút bật/tắt nhạc** rõ ràng trên màn chơi — nhiều người sẽ để chế độ im lặng vì đang ngồi chung văn phòng/xưởng, không tiện bật tiếng.
- [ ] Mặc định **nhạc đang tắt** (hoặc âm lượng thấp), người chơi tự bật nếu muốn — tránh làm phiền người xung quanh ngay khi vào game.
- [ ] Lưu ý kỹ thuật: trình duyệt chặn tự động phát âm thanh có tiếng — chỉ phát được sau khi người dùng bấm nút nào đó (vd. "Bắt đầu chơi"), không thể tự phát ngay khi vào trang.
- [ ] Dùng nhạc/âm thanh **royalty-free, có giấy phép dùng thương mại** (tránh vấn đề bản quyền khi dùng trong nội bộ công ty).

## Yêu cầu 5 — Fix bug: "Loại câu hỏi (PICTURE_GUESSING) không khớp với loại game (QUIZ)"

**Hiện tượng:**
Khi Admin vào trang quản lý của một game loại **Đuổi hình bắt chữ** (`PICTURE_GUESSING`), nhấn nút **"Lưu cấu hình"**, sau đó kéo xuống thêm câu hỏi (tải ảnh gợi ý và nhập đáp án đúng) thì nhận thông báo lỗi:
> *"Loại câu hỏi (PICTURE_GUESSING) không khớp với loại game (QUIZ)."*

Dẫn đến việc không thể thêm câu hỏi mới cho game.

**Nguyên nhân kỹ thuật đã xác định:**
- Tại `src/lib/validators.ts`, schema `gameUpsertSchema` khai báo trường `type` có giá trị mặc định là `.default("QUIZ")`.
- Form cấu hình game ở màn Admin khi gọi `PATCH /api/admin/games/[id]` không truyền trường `type`, dẫn đến việc Zod tự động điền `type: "QUIZ"`, khiến API **vô tình ghi đè loại game trong database thành `QUIZ`**.
- Trong khi đó, giao diện client vẫn giữ trạng thái cũ (`PICTURE_GUESSING`), nên khi gửi câu hỏi lên backend, backend thấy loại câu hỏi (`PICTURE_GUESSING`) không khớp với loại game trong DB (`QUIZ`) nên chặn lại.

**Yêu cầu kỹ thuật:**

- [ ] Tách riêng `gameUpdateSchema` trong `src/lib/validators.ts` cho các thao tác cập nhật (PATCH), tuyệt đối không để `.default("QUIZ")` tránh vô tình ghi đè loại game khi không truyền `type`.
- [ ] Cập nhật API route `src/app/api/admin/games/[id]/route.ts` sử dụng `gameUpdateSchema` khi xử lý PATCH.
- [ ] Ở frontend `src/app/admin/(dashboard)/games/[id]/page.tsx`: hàm `saveSettings` gửi kèm `type: game.type` và gọi lại `load()` sau khi lưu thành công để dữ liệu hiển thị luôn đồng bộ với database.
- [ ] Kiểm tra lại database hiện tại: với những game nào trước đó đã bị ghi đè nhầm thành `QUIZ`, cập nhật lại đúng giá trị `type` (`PICTURE_GUESSING`, `TRUE_FALSE`, `WORD_PUZZLE`).

