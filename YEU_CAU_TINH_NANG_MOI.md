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

- [x] Đã có màn Admin thêm/sửa/ngừng hoạt động phòng ban; danh sách lưu trong database, không hardcode trong form. Seed/migration khởi tạo 8 phòng ban chính.
- [x] Form đăng ký và form Admin thêm/sửa nhân viên dùng dropdown lấy từ danh sách phòng ban.
- [x] Admin đã gán phòng ban đúng cho 7 tài khoản nhân viên hiện có (theo xác nhận của chủ dự án). Migration tự nối tên phòng ban khớp chính xác; tên cũ không khớp được giữ ở `legacyDepartment` để admin đối chiếu.

Ghi chú: danh sách hiện khởi tạo 8 phòng ban chính. Việc có đưa Ban Giám đốc, Dự án Xây dựng Hệ thống và Ban Kiểm soát Nội bộ vào danh sách cần chủ dự án xác nhận.

## Yêu cầu 2 — Tách luồng Đăng ký (lần đầu) và Đăng nhập (các lần sau)

**Luồng mong muốn:**

1. Nhân viên nhập **Mã nhân viên** trước tiên.
2. Hệ thống tự kiểm tra mã đó đã có tài khoản chưa:
   - **Chưa có** → hiện thêm ô **Họ tên**, dropdown **Phòng ban**, ô **Đặt mật khẩu** (+ nhập lại để xác nhận) — đây là màn đăng ký, chỉ hiện 1 lần duy nhất.
   - **Đã có** → chỉ hiện ô **Mật khẩu** để đăng nhập, không bắt nhập lại họ tên/phòng ban.

(Nếu làm 1 form liền như trên khó triển khai, IT có thể làm 2 trang/tab riêng "Đăng ký" và "Đăng nhập" — không bắt buộc đúng UI này, miễn đạt đúng hành vi: lần đầu phải đăng ký đầy đủ, lần sau chỉ cần mã NV + mật khẩu.)

**Yêu cầu kỹ thuật:**

- [x] Mật khẩu được hash bằng bcrypt trước khi lưu; không lưu plaintext. Dùng bcrypt native bất đồng bộ cho đăng nhập để giảm nghẽn CPU; tương thích với hash bcrypt đã có.
- [x] Tài khoản cũ chưa có mật khẩu có luồng Admin tạo link đặt mật khẩu lần đầu/reset, tránh khóa tài khoản.
- [x] Có thể yêu cầu Admin cấp lại link đặt mật khẩu khi quên mật khẩu. Chưa có email hoặc luồng tự phục hồi không cần Admin.

## Yêu cầu 3 — Tránh sập/chậm khi nhiều người truy cập cùng lúc

**Vấn đề:** app đang chạy trên Vercel (serverless, tự scale theo request) + Supabase Postgres gói miễn phí (giới hạn số kết nối đồng thời, compute size Nano). Khi cả công ty cùng vào chơi 1 lúc (vd. giờ nghỉ trưa, sự kiện ra mắt), có nguy cơ:

- Supabase hết connection pool → lỗi "too many connections" hoặc request bị treo.
- Vercel gói Hobby giới hạn số lần chạy function/tháng, và cold-start gây chậm ở lượt truy cập đầu sau lúc vắng.

**Yêu cầu IT kiểm tra & xử lý:**

- [x] Code runtime dùng Prisma singleton với `DATABASE_URL`; `.env` staging đã xác minh dùng Supabase transaction pooler cổng 6543. Deployment Vercel đã kết nối đúng database staging (đăng nhập `K6STAGE` thành công).
- [x] Theo xác nhận của chủ dự án, đã gắn `DATABASE_URL` và `DIRECT_URL` vào Vercel Production. Không ghi giá trị bí mật vào tài liệu. Cấu hình kỳ vọng: `DATABASE_URL` dùng transaction pooler (cổng 6543, `pgbouncer=true`); `DIRECT_URL` dùng session pooler (cổng 5432).
- [x] Chủ dự án xác nhận deployment production đã build, runtime kết nối database thành công và host/cổng trong Vercel Settings đã được đối chiếu. Không ghi giá trị bí mật vào tài liệu.
- [x] Đã load test deployment Vercel đang trỏ tới Supabase staging: 50 VU/2 phút và 100 VU/2 phút. Cả hai lượt không có request lỗi; chủ dự án chấp nhận độ ổn định và độ trễ hiện tại (p95 khoảng 6 giây ở 100 VU) cho nhu cầu hiện tại, dù cao hơn ngưỡng kỹ thuật k6 2,5 giây. Kịch bản chỉ đăng nhập và đọc danh sách game, chưa kiểm tra luồng chơi ghi dữ liệu.
- [x] Đã cân nhắc nâng Supabase/Vercel sau bài test qua Vercel staging 50/100 VU. Tạm thời chưa nâng gói: không có request lỗi và chủ dự án chấp nhận độ trễ hiện tại. p95 HTTP 6,13 giây ở 100 VU là tín hiệu cần theo dõi; chưa có metrics tài nguyên đồng thời để quy nguyên nhân cho Vercel hay Supabase. Đánh giá lại nếu có lỗi, độ trễ không còn chấp nhận được hoặc metrics cho thấy chạm giới hạn.
- [x] Đã có phản hồi dễ hiểu và nút thử lại cho lỗi tạm thời/HTTP 503 ở các màn hình và API liên quan. Chưa fault-test chủ động tình huống hết connection pool.

Chi tiết đo tải: ở 50 VU, HTTP p95 3,14 giây và auth-flow p95 4,60 giây; ở 100 VU, HTTP p95 6,13 giây và auth-flow p95 6,31 giây. Request failures là 0% ở cả hai lượt. Đánh giá chấp nhận được cho workload đã thử theo xác nhận của chủ dự án; ngưỡng p95 2,5 giây của k6 vẫn chưa đạt. Đây là kết quả trên staging, không đại diện cho database production hoặc luồng game có ghi dữ liệu.

## Yêu cầu 4 — Hiệu ứng trả lời đúng/sai + nhạc nền

**Mục tiêu:** tăng cảm giác "chơi game" thật sự thay vì chỉ là form trả lời trắc nghiệm đơn thuần.

**Hiệu ứng trả lời đúng/sai:**

- [x] Câu đúng có confetti/ánh sáng nhẹ, tiếng ting và điểm cộng bay lên.
- [x] Câu sai có shake và tiếng buzz ngắn; đáp án đúng vẫn hiển thị.
- [x] Có gọi Vibration API khi trình duyệt/thiết bị hỗ trợ.
- [x] Hiệu ứng không khóa nút chuyển câu; animation chạy độc lập, thao tác tiếp tục được ngay.

**Nhạc nền khi chơi:**

- [x] Có giai điệu nền vui tươi tạo bằng Web Audio, phát lặp trong màn chơi.
- [x] Có nút bật/tắt nhạc rõ ràng trên màn chơi.
- [x] Nhạc mặc định tắt.
- [x] Âm thanh chỉ khởi tạo/phát sau tương tác của người chơi, phù hợp giới hạn autoplay của trình duyệt.
- [x] Giai điệu và hiệu ứng âm thanh được tổng hợp bằng Web Audio; không dùng bản thu thương mại/bên thứ ba cần license riêng.

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

- [x] Tách `gameUpdateSchema` không có default `QUIZ` cho PATCH.
- [x] API PATCH dùng `gameUpdateSchema`.
- [x] `saveSettings` gửi `type: game.type` và reload game sau khi lưu.
- [x] Đã chạy audit dry-run trên database staging: cả 4 game đều nhất quán với loại câu hỏi; không phát hiện game bị ghi đè nhầm và không có dữ liệu nào bị sửa.
- [x] Đã audit dry-run database production: cả 5 game đều nhất quán với loại câu hỏi; không phát hiện game bị ghi đè nhầm, nên không cần sửa dữ liệu.

