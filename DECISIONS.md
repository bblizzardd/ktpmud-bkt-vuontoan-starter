# Quyết định thiết kế — Ước lượng trước khi tính đúng

**Dự án:** Vườn Toán Lớp 3 — Track B, Nhóm 01.

**Trạng thái:** Thiết kế dự kiến, chưa triển khai.

Đối chiếu với [đặc tả starter](docs/architecture-reference.md), `server/db.js`, `server/index.js` và các API câu hỏi/nộp bài. Yêu cầu nghiệm thu nằm trong [REQUIREMENTS.md](REQUIREMENTS.md); ca kiểm thử nằm trong [TEST_PLAN.md](TEST_PLAN.md).

## ADR-01. Chấm sai số tương đối, trọng số 50/50

Dùng sai số tương đối để áp dụng cùng quy tắc cho mọi câu. Với đáp án `P > 0`, ước lượng `u` và kết quả chính xác học sinh nhập `v`:

```text
D = |u − P|
Nếu 10D ≤ P: E = 10
Ngược lại, nếu 5D ≤ P: E = 7
Ngược lại, nếu 10D ≤ 3P: E = 3
Còn lại: E = 0

C = 10 nếu v = P; ngược lại C = 0
Điểm câu S = (E + C) / 2
```

So sánh số nguyên để tránh sai số dấu phẩy động; không làm tròn trước khi phân mức. Tổng bộ quy về 100, chỉ làm tròn một lần. `correctCount` đếm câu đạt trọn điểm.

Các mốc 10–20–30% kế thừa cách chấm được [Waring và Penner-Wilger (2017)](https://doi.org/10.5964/jnc.v2i3.9) sử dụng và dẫn lại từ Hanson và Hogan (2000). Nghiên cứu dùng thang 3–2–1–0 trên người trưởng thành; không chứng minh ngưỡng tối ưu cho lớp 3. Thang 10–7–3–0, quy ước biên và tỷ trọng 50/50 là lựa chọn của nhóm.

**Đánh đổi:** Điểm có bước nhảy tại biên. Với câu V1 `76 × 5 = 380`, ước lượng 266 có sai số đúng 30%, nhận 3 điểm; 265 có sai số khoảng 30,26%, nhận 0 điểm. Không làm tròn sai số để chấm. Giữ tiến độ cũ có thể khiến đúng hoàn toàn một phần đạt ngưỡng hoàn thành 50%; giao diện không gọi đó là mức thành thạo.

## ADR-02. Giới hạn dữ liệu

- Câu hỏi V1: gồm phép nhân `a × b` và phép chia hết `a ÷ b`, với `a` là số nguyên từ 10 đến 100.000, `b` là số nguyên từ 1 đến 9 và đáp án nguyên dương không quá 100.000. Phép nhân yêu cầu tích không quá 100.000; phép chia yêu cầu `a % b = 0`. Bắt buộc số nhiều chữ số đứng trước, số một chữ số đứng sau; từ chối `a < 10`, `b = 0`, `b >= 10` hoặc chia có dư. Bộ 12 câu chọn toán hạng thứ nhất có 2–3 chữ số để luyện ước lượng.
- Câu trả lời: chuỗi chữ số trong `[0, 1.000.000.000]`; trim hai đầu và chuẩn hóa số 0 ở đầu. Chấp nhận `"0"`; từ chối rỗng, số âm/thập phân, dạng mũ, dấu phân cách và JSON sai kiểu.
- Một bộ chỉ chứa type `estimate`. Input sai định dạng không được ghi kết quả; input hợp lệ nhưng sai toán vẫn được chấm.

Giới hạn này giữ phép tính an toàn và cách nhập thống nhất giữa client/server.

### Quyết định phạm vi V1: cả phép nhân và phép chia

MVP V1 triển khai dạng ước lượng cho cả nhân và chia: một bộ cố định gồm 6 câu nhân và 6 câu chia hết. Tỷ lệ 6/6 là lựa chọn thiết kế để cả hai phép toán đều có câu luyện tập và ca kiểm thử; không coi đây là tỷ lệ bắt buộc của đề. Cả hai dùng chung luồng hai bước, cách lưu và rubric sai số tương đối với đáp án `P > 0`.

Phép chia giới hạn ở số nhiều chữ số chia hết cho số một chữ số khác 0, giữ đáp án là số nguyên và cách nhập thống nhất. Các bài nhân/chia cũ của starter giữ nguyên. Phạm vi này theo yêu cầu đã làm rõ của nhóm; việc đối chiếu đầy đủ đề chính thức vẫn là bước nghiệm thu riêng.

## ADR-03. Một fixture nguồn chuẩn

Dùng `data/estimation-fixtures.json` phía server làm nguồn chuẩn cho bộ `phieu-uoc-luong-v1`, gồm 12 câu tại REQUIREMENTS Mục 7. Code sinh prompt và đáp án từ cùng ID, toán hạng, phép toán rồi nạp vào `questions`/`question_sets`. Không chép lại nội dung vào `seed.json`; không tạo bảng `estimation_questions`.

Giữ `questions.correct_answer` và giá trị trong `attempts.answers_json` là chuỗi để tương thích thống kê cũ; `options_json = NULL`. ID bộ định danh phiên bản nội dung; snapshot lượt làm giữ cả phiên bản nội dung và rubric, dự kiến `relative-error-v1`.

Fixture chứa metadata của bộ (ID/version, tiêu đề, bài học, loại bộ, sao thưởng, thời lượng) và cấu hình từng câu (ID, hai toán hạng, phép toán). Code sinh prompt, đáp án dạng chuỗi, `type = estimate`, `points = 10`, category theo phép toán và thứ tự theo mảng câu hỏi. Không nhập lại prompt/đáp án bằng tay trong JSON hoặc SQLite. Chỉ phục vụ thư mục `public/`; fixture nằm trong `data/` và không được trả nguyên tệp qua API.

Schema hiện không có cột riêng cho toán hạng, phép toán hoặc phiên bản trong `questions`. Bộ nạp đối chiếu các cột sẵn có với bản ghi chuẩn được sinh từ fixture; không thêm bảng metadata để lưu lại cấu hình. Phải so cả prompt và đáp án: hai phép tính khác nhau vẫn có thể cho cùng kết quả. `attempts.answers_json` lưu câu trả lời bước tính chính xác thực tế đã chuẩn hóa; phần ước lượng và chi tiết chấm nằm trong lượt làm mới.

**Lý do:** Một bộ cố định chưa cần bảng cấu hình hoặc UI biên tập. Đổi lại, phải kiểm tra SQLite khớp fixture và quản lý phiên bản bất biến.

## ADR-04. Lưu trạng thái hai bước trên server

Chọn phương án A: **ước lượng → khóa → tính chính xác → lưu → câu tiếp theo**, lặp đủ 12 câu rồi xem lại và nộp cả bộ. Người dùng đã chọn lưu câu trả lời chính xác trên server khi bấm Câu tiếp theo. Lưu không chấm, không trả feedback đúng/sai và không cộng sao; chỉ lần nộp hợp lệ mới tạo kết quả tổng hợp.

Thêm một bảng `estimation_runs`; `attempts` tiếp tục lưu kết quả tổng hợp. Không thêm bảng riêng cho câu trả lời nháp.

| Trường dự kiến | Vai trò |
|---|---|
| `id`, `user_id`, `set_id` | Lượt làm, chủ sở hữu, bộ đề |
| `status` | `in_progress` hoặc `submitted` |
| `questions_snapshot_json` | Đề, đáp án và phiên bản bất biến; chỉ dùng phía server |
| `confirmed_estimates_json` | Ước lượng đã khóa và thời điểm xác nhận |
| `draft_answers_json` | Map questionId → câu trả lời chính xác của học sinh đã chuẩn hóa và lưu; mặc định `{}`, được sửa trước nộp; không phải đáp án chuẩn |
| `result_json` | Input, điểm và phản hồi sau nộp |
| `attempt_id` | Khóa ngoại duy nhất tới kết quả trong `attempts` |
| `created_at`, `updated_at` | Thời điểm tạo/cập nhật |

| API dự kiến | Hợp đồng |
|---|---|
| `POST /api/estimation-runs` | Nhận `setId`; tạo lượt/snapshot, trả `runId` và đề công khai. |
| `POST /api/estimation-runs/:runId/estimates/:questionId` | Nhận `{ estimate }`; validate, lưu và khóa ước lượng của câu được phép làm; không trả điểm/sai số. |
| `PUT /api/estimation-runs/:runId/answers/:questionId` | Nhận `{ answer }` là chuỗi theo ADR-02; lưu câu trả lời chính xác sau khi ước lượng câu đó đã khóa. Dùng cho Câu tiếp theo, Lưu và xem lại và Lưu thay đổi; không chấm. |
| `GET /api/estimation-runs/:runId` | Khôi phục đề công khai, ước lượng đã khóa, câu trả lời học sinh đã lưu và vị trí tiếp tục; chỉ trả kết quả chấm nếu đã nộp. |
| `POST /api/submissions` | Bộ mới nhận `setId`, `runId`, `answers` (map đủ 12 questionId → chuỗi). Sau chuẩn hóa, phải khớp toàn bộ câu trả lời đã lưu; chấm từ snapshot và dữ liệu server. Bộ cũ giữ hợp đồng hiện tại. |

Dùng xác thực hiện có: chưa đăng nhập trả 401; lượt không tồn tại/khác chủ sở hữu trả 404; input sai định dạng, questionId ngoài lượt, setId không khớp lượt hoặc trường ngoài hợp đồng trả 400. Đổi ước lượng đã khóa, nhảy bước, nộp thiếu bước hoặc `answers` hợp lệ nhưng khác bản đã lưu trả 409. Trường hợp cuối yêu cầu tải lại bản đã lưu để xem lại, không tự ghi đè và chấm dữ liệu từ client. Bộ mới không được rơi vào nhánh chấm chuỗi cũ.

Khi `in_progress`, xác nhận lại cùng ước lượng hoặc lưu lại cùng câu trả lời giữ nguyên dữ liệu/thời điểm đã lưu; sửa câu trả lời chính xác được phép sau khi đã khóa ước lượng. Mỗi lần kiểm tra trạng thái và ghi dữ liệu phải trong cùng transaction. Lượt `submitted` từ chối các API ghi ước lượng/câu trả lời bằng 409. Riêng nộp lại cùng lượt và toàn bộ đáp án đã chuẩn hóa trả kết quả đã lưu; đổi đáp án sau nộp trả 409. Kiểm tra trạng thái, ghi attempt, cập nhật tiến độ/sao và lưu kết quả cuối trong một transaction để không chấm/cộng sao hai lần.

### Trạng thái từng câu và thứ tự làm bài

| Trạng thái suy ra | Dữ liệu server | Thao tác được phép |
|---|---|---|
| Chờ ước lượng | Chưa có ước lượng khóa | Nhập/xác nhận ước lượng khi các câu trước đã lưu câu trả lời chính xác. |
| Chờ tính chính xác | Có ước lượng khóa, chưa có câu trả lời chính xác đã lưu | Nhập câu trả lời và bấm Câu tiếp theo (câu 12: Lưu và xem lại). |
| Đã lưu câu trả lời | Có cả ước lượng khóa và câu trả lời chính xác đã lưu | Sang câu tiếp; quay lại sửa câu trả lời chính xác và bấm Lưu thay đổi; giữ nguyên ước lượng. |
| Đã nộp | Lượt có `status = submitted` | Chỉ xem input và kết quả, không sửa dữ liệu. |

Server chỉ nhận ước lượng mới cho câu đầu tiên chưa có câu trả lời chính xác đã lưu; không cho gửi ước lượng cả 12 câu trước khi tính. Lưu câu trả lời yêu cầu câu đó đã khóa ước lượng và các câu đứng trước đã lưu câu trả lời. Cho phép quay lại sửa câu đã lưu mà không xóa kết quả nhập của các câu sau. Không lưu cột trạng thái riêng cho từng câu hoặc con trỏ giao diện: suy ra từ thứ tự snapshot và hai map đã lưu; giá trị `"0"` là câu trả lời hợp lệ, phải kiểm tra sự tồn tại của khóa thay vì kiểm tra truthy.

### Nộp, khôi phục và lỗi mạng

- Chỉ mở màn hình xem lại khi đủ 12 ước lượng khóa và 12 câu trả lời đã lưu. `ready_to_submit` là trạng thái suy ra, không phải giá trị mới của cột `status`. Chỉ nút Nộp bài mới gọi API chấm; Enter ở bước nhập không được nộp cả bộ.
- URL giữ `runId`. Refresh/restart gọi GET: lượt đã nộp mở kết quả; lượt đủ 12 câu đã lưu mở xem lại; còn lại mở câu đầu tiên chưa lưu câu trả lời, ở bước ước lượng hoặc tính chính xác tùy dữ liệu server. Các câu đã lưu đều có thể xem lại. Không cam kết phục hồi đúng trang đang xem trước khi refresh.
- Câu tiếp theo/Lưu và xem lại/Lưu thay đổi chỉ chuyển màn hình hoặc báo Đã lưu sau response thành công. Khi lỗi mạng, giữ input, báo Chưa xác nhận lưu và cho thử lại; gửi lặp cùng giá trị không làm thay đổi dữ liệu. Nếu server đã lưu nhưng response bị mất, GET hoặc thử lại khôi phục được bản đã lưu.
- Nội dung đang gõ không tự lưu. Sửa câu đã lưu nhưng chưa bấm Lưu thay đổi: bản cũ vẫn ở server; refresh dùng bản cũ. Khi rời câu có thay đổi chưa lưu, cho chọn lưu hoặc bỏ thay đổi. Chưa xử lý xong thay đổi thì không cho nộp bài.
- Trước nộp hợp lệ, response chỉ chứa đề công khai và input của chính học sinh, không có đáp án chuẩn, đúng/sai, sai số, điểm hoặc snapshot riêng tư. Không nhầm `draft_answers_json` của học sinh với đáp án chuẩn trong snapshot.

## ADR-05. Tích hợp và nâng cấp SQLite

Mở bộ mới từ trang Luyện tập qua `lesson.html`/`lesson.js`, gắn với bài nhân/chia hiện có. Giữ phiếu cũ và quy tắc mở khóa; không phụ thuộc `questionSets[0]`. Chỉ mở ô tính chính xác sau xác nhận từ server; hỗ trợ Tab/Enter, nhãn, focus và lỗi bằng chữ.

Starter bỏ qua seed khi đã có users/bộ đề, nên sửa JSON không cập nhật DB cũ. Bộ nạp riêng chạy sau seed starter, trước khi phục vụ HTTP:

1. Validate toàn bộ fixture: đúng 12 câu V1 gồm 6 câu có `operator = "*"` và 6 câu có `operator = "/"`, ID duy nhất, version hợp lệ; từng câu thỏa miền toán hạng và kết quả tại ADR-02. Từ chối phép toán khác, chia cho 0, chia có dư hoặc đảo thứ tự toán hạng làm sai miền số.
2. Trong transaction, tạo bảng trạng thái còn thiếu; kiểm tra schema và bài học tham chiếu. Schema không tương thích phải báo lỗi hoặc được nâng cấp tường minh.
3. Đối chiếu tập ID, prompt, đáp án, type, options, điểm, category, thứ tự, quan hệ bộ/bài học và metadata.
4. ID chưa có: insert; cùng nội dung: giữ nguyên; khác nội dung, sai quan hệ hoặc câu thừa/trộn type: báo lỗi và rollback.
5. Chạy lại không tạo trùng hoặc đổi dữ liệu cũ. Không dùng reset DB, ghi đè hoặc bỏ qua xung đột.

`questions.id` duy nhất toàn bảng; `set_id` chưa có khóa ngoại nên code phải kiểm tra quan hệ. Đổi nội dung/rubric đã phát hành cần version mới; câu đổi phép tính cần ID mới hoặc migration được thống nhất. Không cần framework migration riêng cho MVP.

API giáo viên có thể sửa DB lúc chạy. Luồng đọc đề/tạo lượt mới phải kiểm tra DB–fixture; lệch dữ liệu thì từ chối có kiểm soát. Lượt đã tạo giữ snapshot bất biến. Không sửa route giáo viên để thực hiện cơ chế này.

**Mức cam kết:** B-01…B-12 là tiêu chí đề được đối chiếu trong REQUIREMENTS; transaction, snapshot, đối chiếu DB–fixture và MIG-01…MIG-08 là cách nhóm chọn để thực hiện và kiểm chứng. Riêng kiểm tra sai lệch lúc chạy (MIG-08) là cam kết kỹ thuật bổ sung của thiết kế, không gán thành yêu cầu nguyên văn của đề. Giữ MIG-08 trong V1 vì API giáo viên hiện có thể sửa câu hỏi; phải triển khai và kiểm thử trước nghiệm thu. Chỉ đối chiếu khi đọc đề/tạo lượt mới, không thêm tác vụ giám sát nền hoặc đối chiếu lại ở mỗi lần nhập câu trả lời.

### Vị trí khởi tạo và ranh giới transaction

`npm start` chạy `server/index.js`, import `server/db.js` trước `app.listen`. Trong DB hiện tại, `seedIfEmpty()` thoát khi đã có user và `seedQuestionSets()` thoát khi đã có bộ đề. Bộ nạp mới phải được gọi ngoài hai hàm này, sau các bước khởi tạo starter và trước `module.exports = db`. Chưa cần sửa entrypoint để thêm một cơ chế khởi động khác.

Đọc/validate fixture trước khi ghi. Transaction mới bao gồm việc tạo bảng `estimation_runs` còn thiếu, kiểm tra schema/quan hệ, đối chiếu và nạp bộ/câu hỏi. Nếu một bước lỗi thì rollback toàn bộ thay đổi của transaction này, báo rõ ID hoặc trường xung đột và dừng khởi động trước khi nhận HTTP. Không nuốt lỗi bằng `catch` rỗng, `INSERT OR IGNORE` hoặc ghi đè bằng `REPLACE`. `CREATE TABLE IF NOT EXISTS` không đủ để xác nhận bảng đã có đúng schema; cần kiểm tra cột và ràng buộc cần dùng.

Bộ nạp chỉ tác động bảng trạng thái mới và dữ liệu bộ V1. Không cập nhật tài khoản, sao, lịch sử hoặc câu hỏi ngoài bộ. Transaction này không hoàn tác phần seed starter đã hoàn tất trước đó; các lệnh cập nhật tài khoản mẫu vốn có của starter được giữ nguyên.

### Đối chiếu dữ liệu và xử lý phần thiếu

| Đối tượng | Nội dung cần đối chiếu |
|---|---|
| Bộ đề | `id`, `title`, `kind`, `lesson_id`, `star_reward`, `duration_minutes`; bài học tham chiếu phải tồn tại. |
| Câu hỏi | `id`, `set_id`, `lesson_id`, `type`, `prompt`, `options_json`, `correct_answer`, `points`, `category`, `sort_order`. |
| Tập câu | Đúng 12 ID của V1 sau khi nạp, không có câu thừa hoặc type khác trong bộ. |
| Phiên bản | ID bộ nội dung khớp V1; cấu hình rubric được nhận diện và lưu vào snapshot, không giả định DB đã có cột version. |

Tra từng ID câu trên toàn bảng `questions` vì ID là khóa chính toàn cục. ID đang thuộc bộ khác cũng là xung đột. Khi bộ V1 mới có một phần dữ liệu và tất cả dòng hiện hữu đều khớp, bộ nạp được bổ sung dòng thiếu trong transaction; không chỉnh lại những dòng đã đúng. Câu thừa hoặc dữ liệu khác phải được xử lý trước khi bộ đề được sử dụng.

Tách hai thao tác: bộ nạp được phép thêm phần thiếu lúc khởi động; hàm đối chiếu trong API chỉ đọc và yêu cầu bộ đầy đủ. API không tự nạp lại, sửa hoặc xóa câu khi phát hiện lệch. Kiểm tra trước khi trả đề cho bộ V1 và trong cùng transaction tạo snapshot/lượt mới. Response lỗi không chứa đáp án chuẩn. Các bước tiếp theo của lượt đã tạo dùng snapshot và phiên bản đã lưu, không lấy đề hoặc rubric mới để ghi đè lịch sử.

### Các file dự kiến khi triển khai

| File | Trách nhiệm |
|---|---|
| `data/estimation-fixtures.json` — mới | Nguồn cấu hình duy nhất của 12 câu V1 và metadata bộ. |
| `server/estimation-data.js` — mới | Đọc/validate fixture, sinh dữ liệu chuẩn, khởi tạo/nạp và đối chiếu. Hàm làm việc với DB nhận kết nối từ bên ngoài, không tự import `server/db.js`. |
| `server/db.js` | Gọi bộ nạp ở cuối khởi tạo, trước khi export DB. |
| `server/api.js` | Gọi hàm đối chiếu chỉ đọc trong luồng lấy đề/tạo lượt mới; giữ danh sách trường công khai và các route ngoài phạm vi. |
| `tests/estimation-data.test.js` — mới | Kiểm tra fixture, dữ liệu được sinh và phát hiện lệch DB. |
| `tests/estimation-migration.test.js` — mới | Kiểm tra nâng cấp, chạy lặp, rollback và mở lại DB. |
| `tests/fixtures/legacy-v1.sql` — mới | Schema cũ cùng dữ liệu synthetic để tái tạo ca nâng cấp. |
| `package.json`, `README.md` | Bổ sung lệnh test và hướng dẫn khởi tạo/nâng cấp, xử lý xung đột. |

Các đường dẫn mới là kế hoạch triển khai, chưa phải file đã có. Không cần sửa `data/seed.json`, `server/auth.js`, route giáo viên hoặc cấu hình deployment để thực hiện bộ nạp.

## ADR-06. Kiểm thử và phạm vi

Dùng `node:test`, `node:assert/strict` và script `npm test`. Test dùng DB tạm, đặt `DB_PATH` trước khi import DB. CI trên PR chạy `npm ci` và `npm test`; kết quả ghi tại `TEST_REPORT.md`. Các ca kiểm thử được quy định trong TEST_PLAN.

MIG-01…MIG-08 phải kiểm tra cả bộ nạp độc lập lẫn đường khởi tạo thật. Với DB cũ, test tạo dữ liệu từ fixture SQL schema cũ, không dùng initializer mới để dựng DB rồi gọi đó là ca nâng cấp. Chụp bản ghi theo thứ tự xác định trước/sau và so sánh giá trị, không chỉ đếm dòng hoặc so byte của file SQLite.

Sau khi triển khai, `npm ci` rồi `npm test` từ checkout sạch phải tự tạo DB tạm cho từng ca. Ca restart đóng kết nối và mở lại cùng file trong process mới. Test bộ nạp phải chứng minh không đổi tài khoản; test startup cần phân biệt các cập nhật tài khoản mẫu sẵn có của starter, không quy chúng cho migration mới. Khi cố ý gây lỗi giữa các insert, kiểm tra cả rollback dữ liệu lẫn khả năng chạy lại thành công sau khi sửa nguyên nhân. Không chạy `reset-db` trên DB của nhóm.

Giữ Express/SQLite/JavaScript hiện tại. Không sửa auth/session, tài khoản mẫu, route auth/teacher/admin hoặc deployment. Ngoài MVP: UI biên tập câu mới, nhiều bộ mới, dashboard nâng cao. Nghiệm thu vẫn cần đủ B-01…B-12.

**Sử dụng AI:** Codex hỗ trợ đối chiếu source và biên tập tài liệu; chưa triển khai hoặc chạy test tính năng. Hồ sơ `AI_USE.md` cần phản ánh công việc hỗ trợ thực tế.
