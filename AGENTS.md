# AGENTS.md — KTPMUD Hack Marathon 2026 / Track B — Vườn Toán Lớp 3

> Tài liệu bối cảnh và hướng dẫn làm việc dành cho Codex trong **repository fork của nhóm** từ `fossbk-spec/ktpmud-bkt-vuontoan-starter`.
>
> **Mục đích:** Ghi lại các quyết định và giải thích đã được nhóm trao đổi để Codex không tự suy diễn lại yêu cầu. **Đây không phải xác nhận rằng bất kỳ tính năng nào đã được lập trình xong.**
>
> **Trạng thái hiện tại:** Nhóm chọn thiết kế rút gọn ở góp ý #2; đã bàn và làm rõ cơ sở học thuật góp ý #3; đã thống nhất về mặt *thiết kế* cách xử lý fixture/seed/SQLite cho góp ý #4; mâu thuẫn dấu ở biên của góp ý #1 vẫn cần đối chiếu/sửa và viết test. Không tự coi các góp ý đã đóng nếu chưa thấy commit và bằng chứng.
>
> **Phạm vi công việc trong mỗi lượt Codex do prompt của người dùng quyết định.** Chỉ đọc `AGENTS.md` không có nghĩa được phép sửa code, tạo migration, chạy reset database hay cập nhật mọi tài liệu. Nếu chưa có yêu cầu thực thi cụ thể, hãy phân tích và báo cáo trước.

## 1. Nguồn chuẩn và quy tắc làm việc

Đọc theo thứ tự:

1. [Đề chính thức Track B, đặc biệt Mục 0, 5, 8](https://fossbk-spec.github.io/ktpmud-book/exams/KTPMUD_Hack_Marathon_2026_De_Thi_Chinh_Thuc_v1.0.0_20261103.html).
2. `README.md`, `docs/architecture-reference.md`, `HUONG-DAN-THEM-BAI.md` (nếu tồn tại trong repo), `package.json` và code thực tế.
3. Các tài liệu của nhóm: `REQUIREMENTS.md`, `DECISIONS.md`/ADR, `TEST_PLAN.md`/kế hoạch kiểm thử và `AI_USE.md` (tìm cả thư mục gốc và `docs/`).
4. File `AGENTS.md` này, như bản ghi quyết định và bối cảnh thảo luận.

**Nếu có mâu thuẫn:** Đề chính thức > source/contract starter hiện tại > quyết định nhóm đã chốt trong tài liệu > gợi ý của AGENTS. Ghi rõ bất nhất, không im lặng thay thế quyết định.

**Không được sửa:** `server/auth.js`, cơ chế đăng nhập/session, tài khoản mẫu, cấu hình deployment và tính năng cũ ngoài phạm vi đề. Không thay stack chỉ để làm tính năng mới. Tuyệt đối không dùng LLM để tính/chấm đáp án ở runtime. Không commit PII/secret/DB chứa dữ liệu cá nhân. Chỉ dùng dữ liệu synthetic/alias.

## 2. Bài toán Track B và luồng sản phẩm đã chốt

Thêm **một dạng bài mới: “Ước lượng kết quả trước khi tính đúng”** vào các bài nhân/chia và luồng học đang có. **Không xây trang demo riêng** và **không viết lại ứng dụng**.

Luồng đã quyết định **giữ đủ hai bước**, không chuyển sang chỉ chấm ước lượng:

1. Học sinh chọn bài từ luồng học hiện có; frontend chỉ nhận dữ liệu câu hỏi phù hợp, **không nhận đáp án đúng trước khi nộp**.
2. Học sinh nhập **ước lượng** hoặc cách ước lượng tương ứng với contract đã chốt. Server validate, ghi nhận và **khóa giá trị ước lượng**.
3. Khi server xác nhận đã khóa, học sinh mới được chuyển sang **nhập kết quả tính chính xác**.
4. Server tự tính/chấm bằng code, lưu lượt làm và trả **hai feedback phân biệt**: mức hợp lý của ước lượng và kết quả tính đúng/sai.
5. Refresh/mở lại phải phục hồi đúng trạng thái đã lưu. Không được bỏ qua bước một, sửa ước lượng đã khóa, nộp trùng để được chấm/cộng điểm nhiều lần.

Các kiểm tra trên phải được enforce tại **server**, không chỉ khóa nút/ô nhập ở frontend. Không tiết lộ đáp án hay feedback có thể làm lộ đáp án **trước thời điểm nộp hợp lệ**.

### 12 Acceptance Criteria bắt buộc

| ID | Điều kiện cần đạt |
|---|---|
| B-01 | Dạng bài mới nằm trong luồng học hiện tại, không phải trang demo rời. |
| B-02 | Ít nhất 12 câu hỏi/fixture synthetic tái lập được. |
| B-03 | Quy tắc tạo và chấm ước lượng rõ ràng, tất định, test được. |
| B-04 | API không trả đáp án đúng trước khi nộp. |
| B-05 | Server chấm/lưu; refresh không làm mất trạng thái đã lưu. |
| B-06 | Feedback riêng cho “ước lượng hợp lý” và “kết quả chính xác”. |
| B-07 | Không sửa auth/session, tài khoản mẫu, deployment. |
| B-08 | Test tự động: normal, boundary, invalid input, scoring. |
| B-09 | Có lệnh `npm test`; test chạy thành công từ clean checkout. |
| B-10 | CI trên PR chạy `npm ci` và `npm test`. |
| B-11 | Không có PII/secret, chỉ dùng alias/dữ liệu synthetic. |
| B-12 | Luồng chính thao tác được bằng bàn phím, thông báo lỗi rõ ràng. |

**MVP là giải pháp nhỏ nhất vẫn đáp ứng B-01…B-12, không phải bỏ bớt tiêu chí bắt buộc.**

## 3. Cơ chế starter: `npm start`, seed, database, API

Đây là cách hiểu về code starter đã được thảo luận; **Codex phải xác minh lại với phiên bản code trong fork trước khi chỉnh sửa**.

### 3.1. Vòng đời khởi động

- `npm start` chạy Node.js entrypoint (trong starter đã xem là `node server/index.js`).
- `server/index.js` nạp module `server/db.js`, backend mở SQLite qua `better-sqlite3`.
- SQLite dùng file database cục bộ, mặc định theo starter đã xem là `data/vuon-toan.db` (có thể được cấu hình bằng `DB_PATH`). Nếu file chưa tồn tại, SQLite tạo; nếu đã có, SQLite mở lại. `CREATE TABLE IF NOT EXISTS` giúp tạo các bảng chưa tồn tại mà không xóa bảng cũ.
- Khi cần, các hàm seed đưa dữ liệu mẫu từ `data/seed.json` vào SQLite; sau đó API hoạt động dựa trên bảng trong SQLite.
- Dữ liệu lượt làm và tiến độ phải nằm trong SQLite/server-side storage, **không** chỉ nằm trong biến JS ở trình duyệt.

### 3.2. Phân biệt ba khái niệm

- **Fixture:** Bộ dữ liệu mẫu có thể tái lập, ví dụ 12 câu nhân/chia của Track B. Có thể để trong file JSON.
- **Seed:** Quá trình/code đọc dữ liệu mẫu và **nạp vào DB** (hoặc tên file mẫu `seed.json`).
- **SQLite database:** Nơi ứng dụng **lưu/truy vấn dữ liệu khi chạy**. Sửa file JSON **không tự động làm thay đổi file `.db`** nếu không có code cập nhật.

File starter là **`seed.json`, không phải `seed.js`**. Starter còn có chức năng giáo viên quản lý câu hỏi ghi **trực tiếp vào SQLite**; không nên khẳng định mọi cách thêm câu hỏi đều phải sửa seed.

### 3.3. Lý do góp ý #4 xuất hiện

Trong starter đã xem, `seedIfEmpty()` kiểm tra số bản ghi `users` rồi `return` khi đã có user; `seedQuestionSets()` bỏ qua nếu `question_sets` đã có dữ liệu. Vì vậy:

| Tình huống | Với seed cũ |
|---|---|
| DB mới, chưa có dữ liệu | Có thể nạp dữ liệu seed ban đầu. |
| DB cũ đã có câu hỏi và tài khoản | Thêm câu vào `seed.json` **không** tự cập nhật câu tương ứng trong DB. |
| Xóa DB rồi seed lại | Nhận dữ liệu mới nhưng **mất dữ liệu/lượt làm cũ**; không phù hợp làm cơ chế nâng cấp chính. |

Đây là **hạn chế của cơ chế seed ban đầu đối với nhu cầu mở rộng**, không phải bằng chứng rằng starter đang chấm sai. Sự không khớp giữa prompt SQLite và phép tính fixture là **rủi ro của thiết kế mở rộng nếu nhóm quản lý hai nguồn không nhất quán**.

## 4. Kiến trúc rút gọn đã thống nhất (góp ý #2)

| Thành phần | Hướng đã chốt |
|---|---|
| Bộ đề | **Một bộ cố định ít nhất 12 câu** phép nhân/chia cho V1. |
| Nguồn chuẩn câu hỏi | **Một fixture JSON riêng phía server** — nguồn chuẩn duy nhất (*Single Source of Truth*). Tên gợi ý: `data/estimation-fixtures.json` (xác minh quy ước repo trước khi đặt). |
| Bảng cấu hình `estimation_questions` | **Không tạo** trong MVP. |
| Bảng có sẵn | Tận dụng `questions`, `question_sets` để tích hợp luồng học/hiển thị. |
| Bảng mới | Dự kiến **một bảng lưu lượt làm/trạng thái hai bước**, ví dụ `estimation_attempts`; thiết kế cột theo schema thật, tránh nhân đôi dữ liệu `attempts` vô ích. |
| Chấm điểm | Thang ước lượng **10–7–3–0**, phần ước lượng **50%**, phần tính chính xác **50%** (quyết định của nhóm). |
| API | Giữ số endpoint cần thiết; giảm một bảng **không đồng nghĩa** giảm số endpoint. |
| Dữ liệu phiên bản | Cố định bộ `phieu-uoc-luong-v1` hoặc ID/version tương đương theo quy ước của nhóm. |
| Ngoài MVP | UI biên tập câu hỏi, nhiều bộ câu hỏi, dashboard nâng cao, framework mới, thiết kế cấu hình câu hỏi tổng quát. |

12 câu **vừa dùng cho chức năng luyện tập thật, vừa dùng làm fixture kiểm thử**; không phải bộ 12 câu chỉ tồn tại để qua test.

### 4.1. Ví dụ fixture (minh họa, không phải dữ liệu thật của repo)

```json
{
  "version": "phieu-uoc-luong-v1",
  "questions": [
    { "id": "EST001", "a": 39, "b": 6, "operator": "*" },
    { "id": "EST002", "a": 84, "b": 4, "operator": "/" }
  ]
}
```

**Quy tắc:** Code sinh `prompt` (ví dụ `39 × 6 = ?`) và đáp án từ **cùng** cấu hình fixture. Không định nghĩa thủ công `prompt=39×6` ở SQLite rồi có một `a=38, b=6` độc lập cùng `EST001` trong JSON.

Khi triển khai, code phải kiểm tra rằng bản ghi trong `questions`/`question_sets` phản ánh cùng ID, phép tính, prompt, đáp án, phiên bản theo cấu trúc thật; không gửi đáp án đúng cho client trước khi nộp.

## 5. Góp ý #4 — Quy tắc nạp fixture vào SQLite và migration

**Góp ý #4 không áp đặt phải dùng framework migration hoặc tạo thêm nhiều bảng.** Nó yêu cầu mô tả và chứng minh cách tính năng mới hoạt động **trên cả DB mới lẫn DB cũ đang có dữ liệu**. Đây là trách nhiệm phát sinh khi nhóm mở rộng starter.

### 5.1. Phương án nhóm đã bàn và ưu tiên

Viết cơ chế riêng, có thể là `seedEstimationQuestions()` hoặc module tương đương, độc lập với điều kiện “DB hoàn toàn trống” của `seedIfEmpty()`.

1. Đọc và **validate** fixture JSON (đủ 12 câu, ID duy nhất, phép toán/toán hạng hợp lệ, version thống nhất; tránh chia cho 0).
2. Tạo bảng lưu trạng thái/lượt làm nếu chưa có; cập nhật schema **không xóa dữ liệu cũ**.
3. Đảm bảo bộ đề/quan hệ câu hỏi mới xuất hiện trong `question_sets` và `questions` theo **schema thực tế của starter**.
4. **ID chưa tồn tại:** nạp câu hỏi vào SQLite, prompt và đáp án sinh từ fixture.
5. **ID đã có, cùng nội dung:** giữ nguyên, không tạo trùng.
6. **ID đã có, nội dung khác fixture:** báo lỗi rõ ràng (*fail fast*)/ghi vấn đề để nhóm xử lý; **không âm thầm ghi đè**, nhất là khi đã có lịch sử lượt làm.
7. Chạy lần hai/lần ba không nhân đôi câu hỏi, không làm mất tài khoản, câu hỏi cũ hoặc lượt làm (**idempotent**). Dùng transaction khi cập nhật nhiều bảng để tránh trạng thái nửa chừng nếu lỗi.
8. Nếu muốn đổi phép tính của câu đã có lượt làm, cần **ID/version mới hoặc quy trình migration được thống nhất**, không tự sửa `EST001` cũ.

Có thể quản lý câu hỏi trong fixture riêng thay vì bổ sung trực tiếp `seed.json`; **không phải duy trì cùng một phép tính ở cả hai file**. SQLite chứa bản dữ liệu được code nạp từ fixture, không phải một nguồn nội dung do người phát triển nhập thủ công lần nữa.

### 5.2. Trường hợp phải kiểm thử

| Test gợi ý | Bối cảnh | Mong đợi |
|---|---|---|
| MIG-01 | Clean checkout/DB mới | Tạo được schema cần thiết, nạp đúng **12 câu**, luồng cũ không hỏng. |
| MIG-02 | DB đã có users/bài/lịch sử cũ | Bổ sung bộ 12 câu và bảng mới, **giữ nguyên** dữ liệu cũ. |
| MIG-03 | Chạy bộ nạp hai lần | Không duplicate/không sửa dữ liệu đúng. |
| MIG-04 | SQLite có `EST001` khác fixture | Phát hiện mismatch, không âm thầm chấm sai. |
| MIG-05 | Fixture ID trùng/thiếu/invalid hoặc phép chia cho 0 | Báo lỗi rõ ràng, không tạo dữ liệu dở dang. |
| MIG-06 | Câu hỏi đã có lượt làm, fixture thay đổi | Không ghi đè làm mất ý nghĩa lịch sử; báo lỗi hoặc yêu cầu version mới. |

Trong `DECISIONS.md` ghi **lý do** chọn fixture nguồn chuẩn, cơ chế nâng cấp và trade-off (phải duy trì kiểm tra DB–fixture). Trong `REQUIREMENTS.md` ghi kết quả mong đợi/cách kiểm chứng; trong `TEST_PLAN.md` ghi test tương ứng.

**Không dùng xóa/reset DB thật làm giải pháp cập nhật mặc định.** Reset DB synthetic chỉ phù hợp với test/demo trong môi trường cách ly; khi test phải dùng DB tạm, không tác động DB của nhóm.

## 6. Quy tắc chấm và cơ sở nghiên cứu (góp ý #3, liên quan #1)

### 6.1. Nguồn và giới hạn diễn giải

- Waring, R. J., & Penner-Wilger, M. (2017). *Estimation of Importance: Relative Contributions of Symbolic and Non-Symbolic Number Systems to Exact and Approximate Calculation*. *Journal of Numerical Cognition, 2*(3), 202–219. DOI: https://doi.org/10.5964/jnc.v2i3.9.
- Waring & Penner-Wilger dẫn cách chấm của Hanson & Hogan (2000), *Computational Estimation Skill of College Students*. DOI được trao đổi: https://doi.org/10.2307/749654; phải kiểm tra metadata/toàn văn nếu trích **trực tiếp** bài gốc, không giả vờ đã đọc toàn văn nếu mới xem bài dẫn lại.
- Bài 2017 dùng ngưỡng **trong 10%, 20%, 30%** với điểm nguyên bản **3–2–1–0**, trong nhiệm vụ ước lượng nhân/chia/phần trăm. Nghiên cứu trên **người trưởng thành**, không chứng minh các ngưỡng tối ưu cho học sinh lớp 3.
- Nhóm **kế thừa các mốc 10–20–30%** làm quy ước kỹ thuật có tiền lệ nghiên cứu, nhưng tự điều chỉnh **10–7–3–0** và **50%–50%**. Không viết rằng nghiên cứu xác nhận các thang điểm/trọng số do nhóm chọn là tối ưu.
- Trong tài liệu, dùng diễn đạt “**đã được sử dụng trong các nghiên cứu thực nghiệm trước**”, tránh “đã được kiểm nghiệm là tối ưu” hoặc “nghiên cứu chứng minh phù hợp cho lớp 3”.
- Nếu ChatGPT/Codex có hỗ trợ tìm nguồn, gợi ý nội dung, đọc/kiểm tra DOI, viết tài liệu hay code, khai báo **đúng sự thật** trong `AI_USE.md`; không bịa lịch sử dùng AI.

### 6.2. Công thức sai số tương đối và ngưỡng

Với `x` = **ước lượng học sinh đã khóa**, `y` = **đáp án chính xác server tính từ fixture**, và `y != 0`:

```text
e = |x - y| / |y|
```

**Phương án dấu tại biên nhóm đang ưu tiên:**

| Sai số | Điểm ước lượng |
|---|---:|
| `0 <= e <= 0.10` | 10 |
| `0.10 < e <= 0.20` | 7 |
| `0.20 < e <= 0.30` | 3 |
| `e > 0.30` | 0 |

Ví dụ `y = 100`: `x = 90` được **10 điểm**, `x = 80` được **7 điểm**, `x = 70` được **3 điểm**, `x = 69` được **0 điểm** theo quy tắc `<=` trên.

Với dữ liệu số nguyên có thể so sánh nhân chéo, tránh sai số dấu phẩy động (phải kiểm tra an toàn kiểu dữ liệu):

```text
D = |x - y| ; P = |y| ; require P > 0
if 10*D <= P          => 10
else if 5*D <= P     => 7
else if 10*D <= 3*P  => 3
else                  => 0
```

**Góp ý #1 vẫn chưa đóng:** ADR ban đầu dùng dấu `<` tại ít nhất một ngưỡng, trong khi REQUIREMENTS nói giá trị đúng biên được điểm mức trên. Cần thống nhất **cả tài liệu + code + test** trước khi tuyên bố hoàn thành. Thêm test ở **đúng 10%, 20%, 30%** và ngay hai bên ngưỡng. Nếu `y=0`, sai số tương đối không xác định — ưu tiên fixture V1 tránh đáp án 0 hoặc yêu cầu nhóm quyết định xử lý rõ ràng; không tự chia cho 0/tự đặt điểm. Nếu phép chia có thương không nguyên, cần thống nhất biểu diễn và so sánh.

## 7. MVP và thứ tự triển khai khi được giao viết code

**Các phần nhất thiết phải có:** vertical slice từ lấy câu hỏi → lưu/khóa ước lượng server → nhập/nộp kết quả chính xác → server chấm hai phần → lưu/khôi phục; 12 fixture; tích hợp luồng cũ; tránh lộ đáp án; test `npm test` chạy từ clean checkout; CI; keyboard/feedback; bảo toàn phần cấm.

**Có thể bỏ/hoãn:** bảng cấu hình câu hỏi riêng, công cụ quản trị/biên tập, nhiều bộ đề, dashboard/biểu đồ nâng cao, hiệu ứng UI, đổi framework, giảm endpoint chỉ vì muốn ít endpoint. **Không** bỏ một trong B-01…B-12 hoặc bỏ khóa ước lượng server.

Khi làm việc, ưu tiên sửa phần nhỏ, có bằng chứng. Không triển khai quá nhiều đầu việc trong một PR. Tài liệu mô tả ý định phải phân biệt với chức năng đã thực sự được code/test.

## 8. Hướng dẫn làm việc của Codex và các việc còn mở

1. Trước mỗi lượt: chạy `git status`, xem `git diff`, đọc source trong fork. Không overwrite thay đổi chưa commit, không reset database đang dùng.
2. Đọc **yêu cầu của người dùng trong lượt hiện tại** để xác định nhiệm vụ: thảo luận, sửa docs, thiết kế migration, hay triển khai code/test. Không tự coi mọi mục trong AGENTS là task cần lập tức làm.
3. Nếu được giao **góp ý #4**: kiểm tra `server/db.js`, `server/api.js`, schema `questions`, `question_sets`, `attempts`, `data/seed.json`, luồng khởi động; đề xuất hoặc hiện thực (đúng phạm vi prompt) cơ chế nạp fixture idempotent, không phá DB cũ; có test MIG-01…MIG-06. **Không được dùng `npm run reset-db` trên DB người dùng để “sửa” lỗi.**
4. Nếu được giao **góp ý #3**: kiểm tra hai nguồn khoa học và DOI; sửa diễn giải, công thức và `AI_USE.md` trung thực. Không tự ý đổi thuật toán.
5. Nếu được giao **góp ý #1**: thống nhất dấu ngưỡng và cập nhật `REQUIREMENTS.md`, `DECISIONS.md`, code, test biên **trong cùng thay đổi**; kiểm tra không làm lệch thang điểm.
6. **Góp ý #2:** thiết kế rút gọn đã được nhóm đồng ý về định hướng; chỉ cập nhật lại tài liệu/kiến trúc nếu có yêu cầu hoặc phát hiện mâu thuẫn cần trình nhóm.
7. Sau khi thực hiện: báo cáo file đã sửa, quyết định và lý do, lệnh test đã chạy và kết quả thực tế, hạn chế còn tồn tại. Không tuyên bố PASS nếu chưa chạy test. Không tự commit, push, tạo PR hay merge trừ khi được giao.

### Checklist vấn đề còn chờ code/test

- [ ] Xác nhận schema và đường dẫn fixture thực tế từ repo fork; bảo đảm 12 câu có ID/version nhất quán.
- [ ] Chốt/đồng bộ dấu tại các ngưỡng 10/20/30% ở docs, implementation và tests (góp ý #1).
- [ ] Kiểm tra tất cả điểm trích dẫn và `AI_USE.md` phản ánh chính xác nguồn/công việc AI (góp ý #3).
- [ ] Thiết kế/kiểm chứng migration và nạp fixture từ DB cũ (góp ý #4).
- [ ] Chứng minh khóa ước lượng, không lộ đáp án, không nộp trùng, khôi phục khi refresh (B-04/B-05).
- [ ] Có test normal/boundary/invalid/scoring, `npm test`, CI PR và thao tác bàn phím (B-08…B-12).

---

**Nguyên tắc cần ghi nhớ:** **Fixture là dữ liệu mẫu/nguồn chuẩn**, **seed là code nạp dữ liệu**, **SQLite là database ứng dụng dùng khi chạy**. 12 câu ở fixture vừa là **câu luyện tập thật** vừa là **dữ liệu kiểm thử**. Chỉ sửa JSON **không** tự đồng bộ DB; cơ chế nạp/kiểm tra phải được nhóm viết. **Giữ hai bước: ước lượng → khóa ở server → tính đúng → chấm và lưu.**
