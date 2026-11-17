# Kiểm thử tải và độ tin cậy

Cập nhật: 17-11-2026. Tài liệu này ghi lại trạng thái Yêu cầu 3 — tránh chậm hoặc gián đoạn khi nhiều người truy cập cùng lúc.

## Kết luận

Yêu cầu 3 mới được đáp ứng một phần. Đã kiểm thử deployment Vercel đang nối Supabase staging ở 50 và 100 VU; cả hai lượt không có request lỗi. Độ trễ p95 tăng theo tải và vượt ngưỡng kỹ thuật k6 2,5 giây; chủ dự án chấp nhận mức độ trễ hiện tại cho nhu cầu sử dụng. Kết quả xác nhận deployment xử lý được workload đọc đã thử trong thời lượng test, nhưng chưa xác nhận luồng chơi ghi dữ liệu, production database hoặc khả năng chịu tải dài hạn.

## Trạng thái từng nội dung

| Nội dung | Trạng thái | Bằng chứng và phần còn thiếu |
| --- | --- | --- |
| Prisma runtime dùng transaction pooler | Đã xác nhận cấu hình production | Prisma runtime dùng singleton và `DATABASE_URL`; local staging trỏ transaction pooler cổng 6543. Deployment Vercel đã đăng nhập bằng tài khoản chỉ có trong Supabase staging. Chủ dự án xác nhận production deployment build xong, runtime kết nối database được và host/cổng đã được đối chiếu trong Vercel Settings. Không ghi giá trị bí mật tại đây. |
| Load test ở quy mô 50–100 người | Đã chạy qua Vercel staging; được chấp nhận cho workload đã thử | 50 và 100 VU có tỷ lệ request lỗi 0%. HTTP p95 lần lượt 3,14 và 6,13 giây; auth-flow p95 4,60 và 6,31 giây. Chủ dự án chấp nhận độ trễ hiện tại; ngưỡng k6 2,5 giây vẫn chưa đạt. Chưa kiểm tra luồng chơi có ghi dữ liệu. |
| Quyết định nâng gói Supabase/Vercel | Đã cân nhắc; tạm thời chưa nâng | Bài test qua Vercel staging không có request lỗi và chủ dự án chấp nhận độ trễ hiện tại. p95 HTTP 6,13 giây ở 100 VU cần theo dõi; chưa có metrics tài nguyên đồng thời để quy nguyên nhân hoặc kết luận gói miễn phí đã chạm giới hạn. Đánh giá lại nếu lỗi/độ trễ tăng hoặc metrics cho thấy chạm giới hạn. |
| Thông báo khi hệ thống tạm quá tải | Đã có trong code; chưa fault-test | API xử lý một số lỗi DB/pool tạm thời bằng HTTP 503 và Retry-After. Layout sau đăng nhập, danh sách game, chi tiết game và màn chơi có thông báo cùng nút thử lại. Chưa chủ động tạo lỗi quá tải để xác nhận toàn bộ recovery flow. |

## Cấu hình và giới hạn bài test

Bài staging ban đầu dùng app production-mode chạy trên local, DATABASE_URL trỏ tới Supabase transaction pooler ở cổng 6543. Các lượt bổ sung bên dưới chạy k6 từ máy local tới deployment Vercel, với tài khoản `K6STAGE` trên Supabase staging. Đây không phải kiểm thử production database.

Bài 100 VU dùng 100 tài khoản test staging riêng trong hai phút. Kịch bản kiểm tra trạng thái nhân viên, đăng nhập và đọc danh sách game lặp lại; không gửi câu trả lời, không tạo kết quả game. Xem hướng dẫn chuẩn bị tài khoản và chạy k6 tại load-tests/README.md.

Không chạy load test vào production. Khi xem dashboard, chọn đúng khoảng thời gian của các lượt Vercel staging; đối chiếu function duration/concurrency và Supabase connections, CPU, memory. Các lượt này chưa ghi lại đầy đủ metrics dashboard, nên chưa kết luận giới hạn gói.

## Kết quả load test

### Các lượt staging ban đầu

| Tải | Thời lượng | HTTP p95 | Auth-flow p95 | Request lỗi |
| --- | ---: | ---: | ---: | ---: |
| 1 VU | 30 giây | 4,13 giây | 2,94 giây | 0% |
| 10 VU | 1 phút | 4,51 giây | 6,64 giây | 0% |
| 50 VU | 2 phút | 14,07 giây | 17,92 giây | 0% |

Ở lượt 50 VU ban đầu, login p95 là 15,13 giây và game-list p95 là 9,78 giây. Bài chạy này chưa gồm giai đoạn 100 VU và luồng game có ghi dữ liệu.

### Tối ưu truy vấn danh sách game

Endpoint danh sách game trước đây thực hiện nhiều thao tác DB để xác minh nhân viên, lấy game kèm số câu hỏi và gom số lượt chơi. Hiện các dữ liệu này được lấy trong một truy vấn SQL có tham số, đồng thời xác minh nhân viên active. Giữ nguyên response và phân quyền; không cần migration.

| Lượt 50 VU | HTTP p95 | Auth-flow p95 | Game-list p95 | Request/giây | Lỗi |
| --- | ---: | ---: | ---: | ---: | ---: |
| Trước tối ưu | 11,79 giây | 17,19 giây | 9,90 giây | 4,93 | 0% |
| Gộp truy vấn dữ liệu game | 9,70 giây | 18,10 giây | 8,36 giây | 6,44 | 0% |
| Gộp xác minh nhân viên và dữ liệu game | 4,86 giây | 20,73 giây | 2,34 giây | 14,73 | 0% |

Ở lượt cuối, game-list p95 giảm khoảng 76% và request rate tăng khoảng 3 lần so với ban đầu. Độ trễ login vẫn cao.

### Tối ưu CPU cho đăng nhập

Trong auth burst 50 VU, bcryptjs.compare mất khoảng 4–8 giây khi nhiều phép so sánh chạy đồng thời. Employee login chuyển sang API bất đồng bộ của bcrypt native, dùng thread pool của Node. Định dạng hash và cost được giữ nguyên; hash do bcryptjs tạo vẫn đăng nhập được. Không đổi các bước đăng nhập hoặc response API.

| Lượt 50 VU, 30 giây | Auth-flow p95 | Login p95 | Status p95 | Game-list p95 | Request/giây | Lỗi |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| bcryptjs | 15,49 giây | 11,50 giây | 4,99 giây | 3,10 giây | 11,49 | 0% |
| bcrypt native bất đồng bộ | 10,20 giây | 3,71 giây | 7,04 giây | 2,63 giây | 14,04 | 0% |

Login p95 giảm khoảng 68%, request rate tăng khoảng 22%. Auth-flow vẫn chưa đạt mục tiêu 2,5 giây; độ trễ status/DB còn cao.

### Bài chạy staging 100 VU

| VU | Thời lượng | HTTP p95 | Auth-flow p95 | Login p95 | Status p95 | Game-list p95 | Request/giây | Lỗi |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 100 | 2 phút | 6,71 giây | 17,13 giây | 7,19 giây | 9,90 giây | 5,26 giây | 16,19 | 0% |

Cả 2.237 functional checks đều đạt và không có request thất bại. Hai ngưỡng p95 2,5 giây đều không đạt. Bài test chứng minh workload đọc hoàn tất không lỗi trong cấu hình local-to-staging; không chứng minh Vercel production đạt mục tiêu 100 người.

### Bài chạy qua Vercel với Supabase staging

Ngày 17-11-2026, deployment `paina-game-hub-indol.vercel.app` được cấu hình dùng Supabase staging. Smoke test 1 VU xác nhận trạng thái tài khoản, đăng nhập, cookie và danh sách game đều hoạt động. Sau đó chạy 50 và 100 VU trong hai phút mỗi lượt. Kịch bản chỉ gọi employee status/login và đọc danh sách game; không bắt đầu session, gửi câu trả lời hoặc tạo kết quả.

| Tải | HTTP request | Request lỗi | HTTP p95 | Auth-flow p95 | Login p95 | Status p95 | Game-list p95 | Request/giây |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 VU / 30 giây | 20 | 0% | 0,74 giây | 1,75 giây | 0,74 giây | 0,88 giây | 0,64 giây | 0,65 |
| 50 VU / 2 phút | 2.377 | 0% | 3,14 giây | 4,60 giây | 1,66 giây | 2,83 giây | 3,16 giây | 19,19 |
| 100 VU / 2 phút | 3.346 | 0% | 6,13 giây | 6,31 giây | 3,56 giây | 2,83 giây | 6,14 giây | 27,17 |

Ở 100 VU, cả 3.546 functional checks đều đạt và không có HTTP request thất bại. p95 tăng so với 50 VU, nhưng app hoàn thành workload thử nghiệm. Chủ dự án đánh giá mức này chấp nhận được cho nhu cầu hiện tại dù p95 lớn hơn ngưỡng k6 2,5 giây. Đây là tín hiệu tốt về tính ổn định cho workload đọc trong hai phút, không phải cam kết SLA hoặc bằng chứng cho luồng game ghi dữ liệu. Chưa có metrics Vercel/Supabase cùng thời điểm để phân tích tài nguyên.

## Metrics Supabase đã có

Ảnh báo cáo trước đó kết thúc lúc 14:00 ICT, không bao phủ lượt tối ưu chạy khoảng 14:12–14:15, 14:30–14:33 hoặc bài 100 VU sau đó. Tại mốc 14:00, ảnh cho thấy khoảng 24 DB connections, CPU dưới 1%, IOPS dưới 1; memory commitment 1,22 GB trên capacity 1,4 GB và swap 228,71 MB. Không dùng ảnh cũ này để kết luận nguyên nhân hay quyết định nâng gói cho bài test mới.

## Tài liệu tham khảo

- [Hướng dẫn Supabase Prisma](https://supabase.com/docs/guides/database/prisma)
- [Các chế độ pool của Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Cấu hình pooler của Prisma](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections/pgbouncer)
