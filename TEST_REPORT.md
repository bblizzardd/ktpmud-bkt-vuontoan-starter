# Kết quả kiểm thử V1 — 17/11/2026

Phạm vi: phần mở rộng “Ước lượng trước khi tính đúng”, theo REQUIREMENTS, DECISIONS và TEST_PLAN. Đây là kết quả chạy tại máy làm việc, chưa phải xác nhận nghiệm thu của nhóm hoặc CI trên GitHub.

## Môi trường và lệnh đã chạy

- Windows, Node.js **22.14.0**, dependency theo `package-lock.json`; Playwright **1.65.1**, Chromium **159.0.8154.6**.
- `npm ci` trên bản sao sạch của working tree: **thành công**. Bản sao không mang theo `node_modules`, file DB, `.git` hoặc `.env`; đây là source đang sửa, chưa phải một commit/PR mới.
- `npm test` trên bản sao sạch: **16/16 nhóm test đạt**, không bỏ qua test. Gồm nhiều dữ liệu biên và 20 lượt HTTP đủ 12 câu để kiểm tra nhân/chia với các tổ hợp E/C.
- `npm run test:ui`: **3/3 nhóm test đạt** trên Chromium, sử dụng DB tạm và tài khoản alias. Chặn tài nguyên ngoài ứng dụng để kiểm tra tính năng không phụ thuộc CDN.
- `git diff --check`: **đạt**. Đối chiếu source cũ với HEAD sau khi bỏ các điểm nối được cho phép: khớp (chuẩn hóa xuống dòng); dependency runtime giữ nguyên.

Các test tạo DB tạm riêng, đóng kết nối/process trước khi dọn. Không reset, seed hoặc mở DB đang dùng của nhóm. Ca restart mở lại cùng file trong process mới. Ca DB cũ dùng `tests/fixtures/legacy-v1.sql`, không dựng bằng initializer mới.

## Chức năng và hồi quy

| Mã | Kết quả | Bằng chứng |
|---|---|---|
| TP-01 | Đạt | UI đi từ Luyện tập vào bộ mới bằng liên kết, mở lại phiếu cũ; bài bị khóa không có link mở bộ mới. |
| TP-02 | Đạt | Đúng 12 ID, 6 nhân/6 chia; prompt và đáp án khớp bảng tham chiếu độc lập; fixture sai bị từ chối. |
| TP-03 | Đạt | HTTP chặn nhảy bước/sửa ước lượng, lưu lặp giữ dữ liệu/thời điểm; UI làm từng câu, lưu trước khi chuyển. |
| TP-04 | Đạt | Unit test đúng/sát biên cả hai phía; HTTP chấm 20 lượt đầy đủ cho câu nhân và chia, E/C/S, tổng cuối và correctCount. |
| TP-05 | Đạt | Kiểu/số không hợp lệ trả 400, không ghi; chuẩn hóa chuỗi, chấp nhận 0 và giới hạn trên; UI báo lỗi và giữ input. |
| TP-06 | Đạt | 401 khi chưa đăng nhập, 404 khi khác chủ/không có lượt, 400 với câu ngoài lượt; chặn tạo lượt khi bài trước chưa hoàn thành. |
| TP-07 | Đạt | Kiểm tra các response trước nộp không có đáp án/snapshot/điểm; không có attempt hoặc sao trước nộp; chặn payload giả và thiếu runId. Fixture URL không phục vụ từ public. |
| TP-08 | Đạt | Điểm và feedback hai phần đúng qua HTTP; UI hiển thị input, đáp án và điểm từng phần sau nộp. |
| TP-09 | Đạt | Restart sau khóa, lưu, xem lại và nộp; UI refresh, sửa chưa lưu, lưu bị lỗi và server đã lưu nhưng response bị mất; gửi lại cùng giá trị không đổi thời điểm. |
| TP-10 | Đạt | Nộp đồng thời/lặp chỉ một attempt; submit/PUT cạnh tranh; payload cũ trả 409; gây lỗi sau các bước ghi thì rollback cả attempt, tiến độ, sao và trạng thái. |
| TP-11 | Đạt trong phạm vi test | Chấm bốn type cũ qua HTTP, login, progress, leaderboard, analytics; UI mở lại bài cũ. Không tuyên bố đã kiểm thử lại toàn bộ tính năng starter. |
| TP-12 | Đạt | MIG-01…MIG-08 bên dưới. |
| TP-13 | Đạt phần bàn phím/DOM; chưa thử trình đọc màn hình thật | Tab/Enter qua 12 câu, Enter không tự nộp bộ; label, focus, aria-invalid, alert, dialog lưu/bỏ thay đổi và feedback chữ đã kiểm tra. Chưa thử đọc thành tiếng bằng NVDA/Narrator. |

Code kiểm chứng: `tests/estimation-scoring.test.js`, `tests/estimation-data.test.js`, `tests/estimation-api.test.js`, `tests/estimation-migration.test.js`, `tests/estimation-ui.cjs`.

## Fixture và migration

| Mã | Kết quả | Bằng chứng |
|---|---|---|
| MIG-01 | Đạt | Khởi tạo thật `server/db.js` trên file DB mới trong process riêng; đủ dữ liệu starter và bộ 12 câu. |
| MIG-02 | Đạt | Schema/dữ liệu cũ độc lập; so giá trị users, lessons, sets, questions, attempts, progress trước/sau. |
| MIG-03 | Đạt | Nạp lặp, bổ sung câu thiếu hợp lệ, đóng/mở lại DB và chạy startup trong process mới; không nhân đôi. |
| MIG-04 | Đạt | Xung đột từng trường câu/metadata, ID thuộc bộ khác, phép tính khác cùng đáp án và câu thừa bị từ chối. |
| MIG-05 | Đạt | JSON hỏng, version/ID/cơ cấu sai, trường thiếu/thừa, toán hạng sai miền, đảo thứ tự, chia dư/0 và kết quả quá lớn; không tạo bảng/dữ liệu dở dang. |
| MIG-06 | Đạt | Snapshot đã có không bị đổi; fixture khác cùng version bị chặn kể cả dòng SQLite bị thiếu; kết quả đã nộp và lịch sử được giữ nguyên. |
| MIG-07 | Đạt | Trigger gây lỗi ở insert thứ ba rollback cả bảng/bộ/câu mới; bỏ nguyên nhân rồi chạy lại được. Thiếu lesson/sai schema cũng bị chặn; startup lỗi không hoàn tất. |
| MIG-08 | Đạt | Sửa/xóa/thêm câu khi server chạy: GET bộ và tạo lượt mới trả lỗi không lộ đáp án, không tự sửa DB; lượt cũ tiếp tục chấm từ snapshot và phục hồi kết quả. |

## Các mục còn cần nhóm xác nhận

- Workflow `.github/workflows/test.yml` đã có `npm ci`, `npm test` và kiểm tra UI. **Chưa chạy CI trên GitHub**, vì chưa được giao commit/push/PR. B-10 còn cần link lượt CI thật khi nộp bài.
- Chưa thử NVDA/Narrator; phần này của TP-13 cần kiểm tra trực tiếp trước nghiệm thu cuối.
- Khi chặn CDN, starter phát sinh `tailwind is not defined` tại `public/assets/js/tailwind.config.js`. Đây là lỗi có sẵn, không sửa trong lượt này. Test UI ghi diagnostic và chỉ loại đúng lỗi từ file này khỏi danh sách lỗi mới; các lỗi JS khác vẫn làm test thất bại. CSS mới dùng font dự phòng để phần bài ước lượng đọc được khi offline. Font/icon/ảnh ngoài ứng dụng của giao diện cũ vẫn có thể thiếu.
- Node mặc định trên máy không khớp ABI của `better-sqlite3` đang cài. Lượt kiểm chứng dùng Node 22.14.0 portable đã đối chiếu SHA256 từ nodejs.org; không thay Node hệ thống. Nhóm dùng Node 22 rồi `npm ci` trước khi chạy lại.
- BE/FE/BA cần review code, thử demo và xác nhận nghiệm thu; không coi báo cáo do AI tạo là chấp thuận của thành viên.
