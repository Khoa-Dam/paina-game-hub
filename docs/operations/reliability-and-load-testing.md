# Kiểm thử tải và độ tin cậy

Cập nhật: 17-11-2026. Tài liệu này ghi lại trạng thái Yêu cầu 3 — tránh chậm hoặc gián đoạn khi nhiều người truy cập cùng lúc.

## Kết luận

Yêu cầu 3 mới được đáp ứng một phần. Các bài kiểm thử staging ở 50 và 100 VU hoàn tất mà không có request lỗi, nhưng độ trễ p95 vẫn cao hơn mục tiêu 2,5 giây. Chưa thể kết luận app deploy trên Vercel chịu được tải tương đương vì các bài chạy dùng app production-mode trên máy local, kết nối Supabase staging.

## Trạng thái từng nội dung

| Nội dung | Trạng thái | Bằng chứng và phần còn thiếu |
| --- | --- | --- |
| Prisma runtime dùng transaction pooler | Xác minh một phần | App local chạy với Supabase transaction pooler, cổng 6543; Prisma client dùng singleton. Chưa kiểm tra DATABASE_URL của môi trường Vercel production. |
| Load test ở quy mô 50–100 người | Đã chạy; mục tiêu độ trễ chưa đạt | Bài chạy staging 50 và 100 VU có tỷ lệ lỗi 0%. Cả HTTP p95 và auth-flow p95 đều vượt 2,5 giây ở 100 VU. Chưa kiểm tra Vercel scaling hoặc luồng chơi game có ghi dữ liệu. |
| Quyết định nâng gói Supabase/Vercel | Đang chờ số liệu | Chưa có metrics nhà cung cấp đúng khoảng thời gian chạy 100 VU. Không đưa ra khuyến nghị nâng gói chỉ dựa trên latency. |
| Thông báo khi hệ thống tạm quá tải | Đã có trong code; chưa fault-test | API xử lý một số lỗi DB/pool tạm thời bằng HTTP 503 và Retry-After. Layout sau đăng nhập, danh sách game, chi tiết game và màn chơi có thông báo cùng nút thử lại. Chưa chủ động tạo lỗi quá tải để xác nhận toàn bộ recovery flow. |

## Cấu hình và giới hạn bài test

Bài staging dùng app production-mode chạy trên local, DATABASE_URL trỏ tới Supabase transaction pooler ở cổng 6543. Đây không phải bài test qua Vercel, nên không đo cold start, function concurrency hay giới hạn của Vercel Hobby.

Bài 100 VU dùng 100 tài khoản test staging riêng trong hai phút. Kịch bản kiểm tra trạng thái nhân viên, đăng nhập và đọc danh sách game lặp lại; không gửi câu trả lời, không tạo kết quả game. Xem hướng dẫn chuẩn bị tài khoản và chạy k6 tại load-tests/README.md.

Không chạy load test vào production. Trước lần chạy kế tiếp, xác nhận lại staging target, quan sát metrics Supabase và Vercel trong đúng khoảng thời gian test, đồng thời chụp lại p95, request lỗi, kết nối DB, CPU, memory và function duration. Quyết định nâng gói sau khi xem metrics và chi phí.

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

## Metrics Supabase đã có

Ảnh báo cáo trước đó kết thúc lúc 14:00 ICT, không bao phủ lượt tối ưu chạy khoảng 14:12–14:15, 14:30–14:33 hoặc bài 100 VU sau đó. Tại mốc 14:00, ảnh cho thấy khoảng 24 DB connections, CPU dưới 1%, IOPS dưới 1; memory commitment 1,22 GB trên capacity 1,4 GB và swap 228,71 MB. Không dùng ảnh cũ này để kết luận nguyên nhân hay quyết định nâng gói cho bài test mới.

## Tài liệu tham khảo

- [Hướng dẫn Supabase Prisma](https://supabase.com/docs/guides/database/prisma)
- [Các chế độ pool của Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Cấu hình pooler của Prisma](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections/pgbouncer)