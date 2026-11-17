# Khai báo sử dụng AI

**Dự án:** Vườn Toán Lớp 3 — Track B, Nhóm 01.  
**Cập nhật:** 17/11/2026.

**Giai đoạn:** Thiết kế, triển khai và kiểm thử; nhật ký từng giai đoạn bên dưới.

## Giai đoạn thiết kế — 11/11/2026

Tại thời điểm ghi bảng này, tính năng chưa được triển khai.

| Trường | Nội dung |
|---|---|
| Công cụ/model | OpenAI Codex. Model GPT-6 Astra; |
| Mục đích | Hỗ trợ đọc và đối chiếu starter; biên tập yêu cầu thành 5 chức năng chính; phân tích cách chấm ước lượng, nguồn tham khảo và các phương án thiết kế; xây dựng luồng hai bước theo từng câu, bộ 12 câu mẫu và kế hoạch kiểm thử chức năng/migration; rà tính nhất quán giữa ba tài liệu. |
| Phạm vi | [REQUIREMENTS.md](REQUIREMENTS.md): luồng học, phạm vi V1, quy tắc điểm, FR-01…FR-05, đối chiếu B-01…B-12 và bộ câu mẫu. [DECISIONS.md](DECISIONS.md): ADR-01…ADR-06 về rubric, miền dữ liệu, fixture, trạng thái lượt làm, API, nâng cấp SQLite và kiểm thử. [TEST_PLAN.md](TEST_PLAN.md): TP-01…TP-13, kịch bản lưu/khôi phục, ví dụ điểm và MIG-01…MIG-08. Nhật ký trước còn ghi hỗ trợ tóm tắt ý tưởng trong [README.md](README.md). Lượt cập nhật này chỉ sửa `AI_USE.md`; chưa có commit riêng cho các thay đổi hiện tại. |
| Kiểm chứng | Đã đối chiếu tài liệu với `docs/architecture-reference.md`, `server/db.js`, `server/index.js`, `server/api.js` và `package.json`; xác nhận hai hàm seed cũ bỏ qua DB đã có dữ liệu. Nguồn nghiên cứu đã được đối chiếu qua trang tạp chí và toàn văn Waring & Penner-Wilger (2017), trang 205–206; giới hạn là nghiên cứu trên người trưởng thành. |
| Quyết định của nhóm | **Giữ:** thang 10–7–3–0, đúng biên 10%/20%/30% nhận 10/7/3 điểm, tỷ trọng 50/50; làm hai bước tuần tự cho từng câu; server khóa ước lượng và lưu câu trả lời khi bấm Câu tiếp theo, chỉ chấm khi nộp đủ bộ. **Sửa:** thống nhất dấu biên giữa tài liệu; gom yêu cầu thành 5 chức năng; cập nhật phạm vi thành cả nhân và chia với bộ 6/6, số nhiều chữ số đứng trước số một chữ số. **Loại khỏi MVP:** bảng cấu hình `estimation_questions`, UI biên tập, nhiều bộ đề và dashboard nâng cao; dùng fixture riêng làm nguồn chuẩn và một bảng `estimation_runs` để giảm phạm vi. Giữ đối chiếu DB–fixture, transaction và snapshot để bảo toàn dữ liệu; MIG-08 là cam kết bổ sung của nhóm. Các lựa chọn này được ghi trong ba tài liệu; bản cuối vẫn cần thành viên review trước nghiệm thu. |
| Người chịu trách nhiệm | BE, FE, BA |

Nguồn tham khảo đã đối chiếu: [trang tạp chí của Waring & Penner-Wilger (2017)](https://jnc.psychopen.eu/index.php/jnc/article/view/5705), DOI `10.5964/jnc.v2i3.9`, và [toàn văn PDF](https://d-nb.info/1229755349/34). Bài dùng thang 3–2–1–0 theo các mốc 10%–20%–30%; thang quy đổi, dấu tại biên và trọng số 50/50 là lựa chọn của nhóm.

## Lượt triển khai và kiểm thử — 17/11/2026

Bảng phía trên giữ lại lịch sử giai đoạn thiết kế. Lượt này được người dùng giao triển khai; sau đó xác nhận cho phép thêm điểm nối vào file hiện có, giữ nguyên logic cũ.

| Trường | Nội dung |
|---|---|
| Công cụ/model | OpenAI Codex; không xác nhận phiên bản model cụ thể của lượt này. Dùng Node.js, `node:test`, SQLite và Playwright để kiểm chứng. Kết nối computer-use trực tiếp không hoạt động; kiểm tra trình duyệt được thực hiện bằng Playwright. |
| Mục đích | Hiện thực fixture, bộ nạp, trạng thái hai bước, chấm/lưu, giao diện tích hợp; viết và chạy test biên, dữ liệu lỗi, quyền sở hữu, giao dịch, nâng cấp, hồi quy và bàn phím; review diff để bảo toàn source cũ. |
| Phạm vi | `data/estimation-fixtures.json`, `server/estimation-*.js`, player/entry/CSS mới, `tests/`, workflow CI; thêm điểm nối vào `server/db.js`, `server/api.js`, `lesson.js`, `lesson.html`, `exercise.html`; thêm script và devDependency test. Cập nhật trạng thái tài liệu, hướng dẫn README và TEST_REPORT. Chưa commit/push/tạo PR. |
| Kiểm chứng | `npm ci` và `npm test` trên bản sao sạch của working tree, 16 nhóm test backend đạt; `npm run test:ui` trên Chromium kiểm tra luồng 12 câu, lỗi mạng, mất response, xem lại/sửa, refresh và bài cũ. Đối chiếu source trước/sau sau khi bỏ các điểm nối mới; runtime dependency và phần cũ được giữ nguyên. Chi tiết và phần chưa chạy tại [TEST_REPORT.md](TEST_REPORT.md). |
| Quyết định của nhóm | Triển khai theo rubric, luồng và kiến trúc đã chốt. Người dùng cho phép thêm điểm nối, không thay logic cũ. AI bổ sung kiểm tra snapshot để chặn thay nội dung cùng version khi DB thiếu dòng; thêm Playwright để tái lập kiểm tra giao diện. Không sửa lỗi Tailwind offline có sẵn ngoài phạm vi. Kết quả code vẫn chờ BE/FE/BA review, không coi test tự động là phê duyệt của thành viên. |
| Người chịu trách nhiệm | BE, FE, BA theo phân công đã ghi. Chưa ghi nhận review/chấp thuận cuối cho phần triển khai trong lượt này; nhóm bổ sung mã người review, commit và bằng chứng CI khi thực hiện. |
