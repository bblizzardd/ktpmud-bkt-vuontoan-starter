# Quyết định thiết kế: Ước lượng trước khi tính đúng

**Dự án:** Vườn Toán Lớp 3 — Track B, Hack Marathon 2026  
**Nhóm:** Nhóm 01

## 1. Căn cứ và hướng mở rộng

Starter dùng Express, SQLite và JavaScript thuần. Điểm cần thay đổi là cách biểu diễn câu trả lời và chấm bài: `/api/submissions` hiện so sánh chuỗi với `questions.correct_answer`, nên chưa thể chấm mức độ gần đúng hoặc hai phần trong một câu.

Các ràng buộc ảnh hưởng trực tiếp tới thiết kế:

- Thống kê giáo viên đọc `attempts.answers_json` và so sánh lại với `questions.correct_answer`. Đổi các giá trị này thành object sẽ làm sai cách đọc hiện có.
- `progress` và sao tính theo người dùng/bài học, không theo từng bộ đề.
- `seedIfEmpty()` bỏ qua khởi tạo khi DB đã có người dùng. Chỉ sửa seed không đủ để bổ sung câu hỏi cho DB đang dùng.
- `exercise.js` xử lý phiếu cố định; `lesson.js` có luồng dựng câu hỏi từ API. Trang chủ chọn `questionSets[0]`, nên cần thêm lối vào rõ ràng cho bộ mới.
- Các route auth/teacher/admin và `server/auth.js` nằm ngoài phạm vi sửa.

Luồng mở rộng dự kiến:

```text
Trang Luyện tập → lesson.js: nhập ước lượng, nhập kết quả, xem phản hồi
                         ↓ API có kiểm tra phiên đăng nhập hiện có
                 api.js: xác nhận bước, kiểm tra input, điều phối chấm/lưu
                    ↙                            ↘
 grading.js: tính đáp án, chấm điểm       SQLite: lượt làm, attempts, progress
```

Các ADR dưới đây là phương án triển khai. Thang điểm và tỷ trọng 50/50 đã được nhóm chốt;

## ADR-01. Chấm bằng sai số tương đối, chia điểm 50/50

**Liên quan:** B-03, B-06, B-08; REQUIREMENTS Mục 4.

### Lựa chọn và lý do

Nhận một số ước lượng và chấm theo sai số tương đối. Cách này dùng chung một thang đo cho các kết quả khác nhau, thay vì đặt riêng khoảng đáp án cho từng câu. Chọn điểm 10–7–3–0 với các khoảng `<10%`, `[10%,20%)`, `[20%,30%)`, `≥30%`. Điểm ước lượng và tính chính xác có trọng số bằng nhau.

| Phương án đã cân nhắc | Lý do không chọn |
|---|---|
| Ngưỡng 7%–9%–11% theo độ lớn kết quả, làm tròn cận | Có thêm ranh giới theo độ lớn; làm tròn làm thay đổi khoảng được điểm. |
| Chỉ đúng/sai theo một ngưỡng | Không thể hiện nhiều mức độ gần đúng. |
| Thang 10–8–7–0 | Các mức còn lệch vẫn nhận điểm khá cao, nhưng sau ngưỡng cuối giảm ngay về 0. |
| Cho nhập khoảng tự do | Cần giới hạn độ rộng; khoảng rất rộng có thể chứa đáp án mà không thể hiện khả năng ước lượng. |

Thang 10–7–3–0 vẫn có bước nhảy tại biên. Không làm tròn sai số trước khi chấm.

### Căn cứ tham khảo

[Waring và Penner-Wilger (2017)](https://d-nb.info/1229755349/34), *Estimation of Importance: Relative Contributions of Symbolic and Non-Symbolic Number Systems to Exact and Approximate Calculation*, DOI `10.5964/jnc.v2i3.9`, trang 206, mô tả thang 3–2–1–0 theo các mốc 10%–20%–30% và dẫn Hanson và Hogan (2000). Nghiên cứu có 85 sinh viên đại học tham gia.

Thang 10–7–3–0 được quy đổi từ 3–2–1–0 bằng cách nhân `10/3` và làm tròn. Quy ước biên và tỷ trọng 50/50 là lựa chọn của bài làm, không phải kết luận của nghiên cứu.

### Cách thực hiện

Tách hàm chấm khỏi Express. Với `D = |u − P|`, dùng phép so sánh số nguyên:

```text
nếu 10 × D < P     → E = 10
nếu  5 × D < P     → E = 7
nếu 10 × D < 3 × P → E = 3
còn lại           → E = 0

C = 10 nếu v = P; ngược lại C = 0
S = (E + C) / 2
```

Miền số ở ADR-02 giữ các phép tính trong giới hạn số nguyên an toàn của JavaScript. Không cần điều kiện loại theo số chữ số: 99 và 100 vẫn gần nhau, còn 42 và 400 đã nhận 0 điểm bằng công thức.

Điểm từng phần được lưu riêng. Mỗi câu tối đa 10 điểm; tổng bộ bài quy về 100 và chỉ làm tròn một lần. `correctCount` của bộ mới đếm câu đạt trọn điểm. Giữ cách cập nhật tiến độ/sao cũ có hệ quả là đúng hoàn toàn một phần có thể đạt ngưỡng hoàn thành 50%; giao diện không gọi đây là mức thành thạo.


## ADR-02. Giới hạn dữ liệu và kiểm tra đầu vào

**Liên quan:** B-02, B-03, B-08, B-12.

Phiên bản đầu dùng nhân số nguyên dương và chia hết, kết quả `P > 0`. Toán hạng/kết quả không quá 100.000. Bộ nạp phát hiện câu chia không hết, chia cho 0 hoặc đáp án không khớp phép tính trước khi sử dụng dữ liệu.

Kết quả đúng bằng 0 cần quy tắc sai số khác nên chưa đưa vào bộ mẫu. Ngược lại, học sinh nhập 0 vẫn là input hợp lệ: với `P > 0`, sai số là 100% và điểm ước lượng bằng 0.

API nhận chuỗi chữ số, trim hai đầu, chuẩn hóa số 0 ở đầu và giới hạn giá trị trong `[0, 1.000.000.000]`. Chuỗi rỗng, số âm, thập phân, dạng mũ, dấu phân cách, `null`, object/array hoặc JSON number bị từ chối. Một định dạng thống nhất giúp tránh cách hiểu khác nhau giữa trình duyệt và server.

Input sai định dạng trả lỗi theo trường và không ghi điểm. Input hợp lệ nhưng sai toán được chấm bình thường. Các câu trong một bộ mới cùng type `estimate`; chưa hỗ trợ bộ trộn nhiều type.

**Đánh đổi:** ít trường hợp nhập liệu hơn nhưng dễ giải thích và kiểm thử. Với đáp án nhỏ, chỉ nhận số nguyên làm mức điểm cao hẹp; ví dụ `P = 5`, ước lượng 4 hoặc 6 đều lệch 20% và nhận 3 điểm.

## ADR-03. Giữ hợp đồng dữ liệu cũ, thêm dữ liệu cho dạng mới

**Liên quan:** B-03, B-04, B-05, B-07.

### Lựa chọn

Giữ `questions.correct_answer` là chuỗi kết quả chính xác. Thêm bảng `estimation_questions` để lưu cấu hình của câu `estimate`:

| Trường | Nội dung |
|---|---|
| `question_id` | Khóa chính, khóa ngoại tới `questions` |
| `operation` | `multiply` hoặc `divide` |
| `left_operand`, `right_operand` | Toán hạng |
| `rubric_version` | Phiên bản quy tắc chấm, ban đầu là `relative-error-v1` |

`options_json` để trống vì câu mới không phải trắc nghiệm. API lấy câu hỏi chỉ trả phép toán, toán hạng và các trường hiển thị; không trả đáp án chuẩn.

`attempts.answers_json` tiếp tục lưu câu trả lời tính chính xác của học sinh, chuẩn hóa thành chuỗi. Ước lượng và điểm hai phần lưu trong bảng lượt làm ở ADR-04. Ví dụ học sinh nhập ước lượng `35`, kết quả `042` cho `6 × 7`:

```text
questions.correct_answer = "42"
attempts.answers_json = {"est-mul-04":"42"}
kết quả lượt: estimate="35", exactRaw="042", E=7, C=10, S=8.5
```

## ADR-04. Lưu lượt làm và khóa ước lượng trên server

**Liên quan:** B-04, B-05, B-06; FR-03 đến FR-10.

Khóa bằng JavaScript phía trình duyệt đơn giản hơn nhưng không giữ được trạng thái khi tải lại và có thể bị bỏ qua khi gọi API. Chọn lưu lượt làm trên server; chỉ mở bước hai sau khi server xác nhận ước lượng.

### Dữ liệu lượt làm

Bảng mới `estimation_runs` gồm:

| Trường | Nội dung |
|---|---|
| `id`, `user_id`, `set_id` | ID ngẫu nhiên, người sở hữu và bộ bài |
| `status` | `in_progress` hoặc `submitted` |
| `questions_snapshot_json` | Bản chụp câu hỏi, đáp án, phiên bản rubric lúc bắt đầu; chỉ dùng trên server |
| `confirmed_estimates_json` | Ước lượng đã xác nhận và thời điểm xác nhận theo ID câu |
| `result_json` | Input, điểm, đáp án và phản hồi sau nộp |
| `attempt_id` | Khóa ngoại duy nhất tới `attempts`, có giá trị sau nộp |
| `created_at`, `updated_at` | Thời điểm tạo và cập nhật |

### API dự kiến

| API | Xử lý |
|---|---|
| `POST /api/estimation-runs` | Nhận `setId`, kiểm tra bộ đề, tạo lượt và snapshot; trả `runId`, đề công khai và trạng thái. |
| `POST /api/estimation-runs/:runId/estimates/:questionId` | Nhận `{ "estimate": "40" }`, kiểm tra quyền/input, lưu và khóa; không trả điểm hoặc sai số. |
| `GET /api/estimation-runs/:runId` | Chủ sở hữu đọc lại đề và phần đã xác nhận; nếu đã nộp thì đọc được kết quả. |
| `POST /api/submissions` | Với bộ mới, nhận `setId`, `runId`, `answers` chứa các kết quả chính xác; lấy ước lượng từ server để chấm. Bộ cũ giữ payload và cách chấm cũ. |

Mọi endpoint dùng phiên đăng nhập hiện có. Không đăng nhập trả 401; lượt không tồn tại hoặc không thuộc người dùng trả 404; input sai trả 400; sửa ước lượng đã khóa hoặc nộp thiếu bước trả 409. Client không được tự chọn người sở hữu, điểm, đáp án chuẩn hay thay ước lượng ở lần nộp cuối; trường ngoài hợp đồng của payload mới bị từ chối.

Mỗi câu phải có ước lượng đã xác nhận và kết quả chính xác hợp lệ trước khi chấm cả bộ. Bộ có type mới không được rơi vào nhánh chấm cũ khi thiếu `runId`. Response trước nộp lấy theo danh sách trường công khai, không trả toàn bộ snapshot chứa đáp án. Lỗi cấu hình câu hỏi phải báo lỗi có kiểm soát, không tính thành học sinh làm sai.

Xác nhận lại cùng giá trị trả trạng thái cũ. Sau khi nộp, không được sửa dữ liệu lượt. Nộp lại cùng lượt và cùng đáp án trả kết quả đã lưu; đáp án khác sau nộp trả 409. Kiểm tra trạng thái, ghi `attempts`, cập nhật tiến độ/sao và lưu kết quả được thực hiện trong cùng transaction để tránh ghi một phần hoặc cộng sao lặp khi nộp đồng thời.

Sau khi tạo lượt, URL giữ `runId` để tải lại trang có thể khôi phục. API vẫn kiểm tra quyền sở hữu dù đã biết ID. Phần đang gõ chưa xác nhận/nộp chưa được lưu. Lượt mới cho phép làm lại; lượt đã nộp giữ kết quả cũ để xem lại.


## ADR-05. Tích hợp giao diện và nạp câu hỏi

**Liên quan:** B-01, B-02, B-06, B-07, B-12.

Thêm liên kết “Ước lượng trước khi tính đúng” ở trang Luyện tập, mở bộ mới qua `lesson.html` và player `lesson.js`. Cách này tận dụng luồng lấy câu hỏi động; phiếu cố định của `exercise.js` tiếp tục hoạt động. Không dựa vào thứ tự `questionSets[0]` để người học tìm được bộ mới.

Mỗi câu có nút xác nhận riêng. Trong lúc gửi, nút không nhận thao tác lặp; lỗi mạng cho phép thử lại. Sau xác nhận, focus chuyển sang ô tính chính xác. Tab/Enter phải dùng được xuyên suốt, có label, focus rõ và thông báo lỗi được công nghệ hỗ trợ đọc. Enter khi xác nhận một câu không tự nộp toàn bộ bài. Nhận xét dùng chữ, không chỉ màu. Học sinh không cần hiểu công thức phần trăm để sử dụng giao diện.

Bộ câu hỏi gắn với bài nhân/chia hiện có. Kiểm tra lối vào bằng tài khoản synthetic có quyền học bài tương ứng; không thay tài khoản mẫu hoặc cơ chế mở khóa bài để phục vụ demo.

Fixture đặt ở tệp server, dự kiến `data/estimation-fixtures.json`. Hàm nạp kiểm tra phép tính, tính đáp án và tạo bộ `phieu-uoc-luong-v1` cùng metadata trong transaction. Migration tạo bảng mới và bộ nạp chạy được cả khi DB đã có dữ liệu, không phụ thuộc riêng `seedIfEmpty()` và không yêu cầu reset DB.

ID trùng và nội dung giống thì bỏ qua; ID trùng nhưng nội dung khác phải báo xung đột. Dữ liệu hoặc rubric đã phát hành muốn thay đổi phải có phiên bản mới. Không ghi đè lịch sử hoặc xóa tiến độ để nạp tính năng.

## ADR-06. Kiểm thử và bằng chứng bàn giao

**Liên quan:** B-08, B-09, B-10; REQUIREMENTS Mục 7.

Chọn `node:test` và `node:assert/strict` cho bộ test ban đầu, vì đã có trong Node và đáp ứng việc kiểm tra hàm chấm/API mà chưa cần thêm thư viện. Thêm script `"test": "node --test"`, dùng tên `*.test.js` để runner tìm test, tránh phụ thuộc cách shell mở rộng glob.

| Lớp kiểm thử | Nội dung |
|---|---|
| Unit | Công thức, đúng/sát biên, 50/50, input lỗi, tính đáp án từ fixture |
| API | Quyền sở hữu, đủ bước, khóa ước lượng, không rò đáp án, payload giả |
| Lưu trữ | Đọc lại sau restart, nộp lặp/đồng thời, rollback, nạp dữ liệu vào DB cũ |
| Hồi quy | Bốn type cũ, điểm/sao, dữ liệu mà thống kê giáo viên sử dụng |
| Giao diện | Lối vào từ Luyện tập, bàn phím, lỗi, focus và phản hồi hai phần |

Integration test dùng DB tạm, đặt `DB_PATH` trước khi import DB và chạy API trên cổng tự cấp. Sau test phải đóng server/DB rồi dọn đúng thư mục tạm. Không dùng DB đang học hoặc `reset-db` để chạy test.

CI chạy `npm ci` và `npm test` trên Pull Request. Môi trường Node phải được ghi rõ và kiểm tra theo yêu cầu Node 18+ của starter. Kiểm tra giao diện bằng kịch bản riêng; unit test không chứng minh được trải nghiệm bàn phím.

`TEST_REPORT.md` ghi kết quả thực chạy và giới hạn. README giải thích cách nạp bộ mới, chạy test, xem kết quả và giới hạn thống kê giáo viên. Các thay đổi cần được review cùng ma trận B-01 đến B-12 trước nghiệm thu.

## 2. Rủi ro và nội dung cần đánh giá khi triển khai

| Vấn đề | Cách xử lý trong thiết kế | Cần kiểm chứng |
|---|---|---|
| Thang điểm chưa được đánh giá trên lớp 3 | Nêu nguồn và giới hạn; giữ phản hồi dễ hiểu | Độ khó của bộ câu hỏi và cách học sinh hiểu nhận xét |
| Kết quả nhỏ ít lựa chọn ước lượng | Ghi rõ trường hợp trong đặc tả, không đổi ngưỡng tùy câu | Bộ mẫu có đủ tình huống để luyện ước lượng |
| Tổng 50% có thể đến từ một phần | Giữ tiến độ cũ, hiển thị riêng hai phần | Nhãn kết quả không gây hiểu sai |
| Bộ mới dùng chung tiến độ bài học | Giữ khóa `user_id + lesson_id` | Điểm tốt nhất/sao không bị cộng lặp hoặc ghi giảm |
| Thống kê cũ chỉ hiểu đáp án chính xác | Giữ định dạng chuỗi trong `answers_json` | Test thống kê đọc được câu mới mà không sửa route |
| Nộp lặp hoặc lỗi giữa lúc lưu | Transaction và trạng thái lượt | Không tạo attempt trùng, không lưu một phần |

## 3. Nguồn và sử dụng công cụ hỗ trợ

Nguồn chính là đề thi, đặc tả starter và bài nghiên cứu được dẫn ở ADR-01. AI được dùng để hỗ trợ đối chiếu tài liệu và soạn thảo hai file phân tích/thiết kế.
