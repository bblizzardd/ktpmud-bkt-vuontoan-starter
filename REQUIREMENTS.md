# Yêu cầu — Ước lượng trước khi tính đúng

**Dự án:** Vườn Toán Lớp 3 — Track B.

**Trạng thái:** Đặc tả mục tiêu, chưa triển khai.

Thiết kế liên quan: [DECISIONS.md](DECISIONS.md). Kế hoạch kiểm chứng: [TEST_PLAN.md](TEST_PLAN.md).

## 1. Bối cảnh

Starter dùng Express, SQLite và JavaScript thuần. Bốn type hiện có là `multiple-choice`, `input`, `compare`, `paint`; server chấm bằng so sánh chuỗi. Tính năng mới bổ sung type `estimate` vào luồng học hiện tại.

## 2. Luồng học

Chọn **hai bước cho từng câu (phương án A)**, theo thứ tự cố định của 12 câu trong fixture:

1. Nhập ước lượng câu 1 → bấm **Xác nhận ước lượng** → server validate, lưu và khóa. Chỉ khi server xác nhận thành công mới mở ô tính chính xác của câu đó.
2. Nhập kết quả tính chính xác → bấm **Câu tiếp theo**. Server validate định dạng và lưu câu trả lời; chỉ khi lưu thành công mới sang câu 2. Lặp lại đến câu 12.
3. Ở câu 12, bấm **Lưu và xem lại** để lưu rồi mở màn hình xem lại. Học sinh được xem các giá trị mình đã nhập, quay lại sửa câu trả lời chính xác và bấm **Lưu thay đổi**; ước lượng đã khóa không được sửa.
4. Khi đủ 12 ước lượng đã khóa và 12 câu trả lời chính xác đã lưu, bấm **Nộp bài**. Server chấm cả bộ một lần, lưu kết quả và trả phản hồi riêng cho hai phần.

**Lưu câu trả lời không phải chấm bài:** “kết quả tính chính xác” là câu trả lời học sinh tự tính, có thể đúng hoặc sai. Khi lưu, server chỉ kiểm tra định dạng, quyền và thứ tự bước; không báo đúng/sai, đáp án chuẩn, sai số hoặc điểm. Chỉ nộp bài hợp lệ mới chấm và cập nhật tiến độ/sao.

**Khôi phục:** Refresh/restart giữ tất cả ước lượng đã khóa và câu trả lời chính xác đã được server xác nhận lưu. Nếu chưa nộp, mở câu đầu tiên chưa có câu trả lời chính xác đã lưu: chưa khóa ước lượng thì mở bước ước lượng, đã khóa thì mở bước tính chính xác. Nếu cả 12 câu đã lưu thì mở màn hình xem lại; nếu đã nộp thì mở kết quả. Không cần nhớ chính xác trang đang xem trước khi refresh.

Nội dung đang gõ hoặc sửa nhưng chưa bấm lưu có thể mất; khi khôi phục dùng bản đã lưu gần nhất. Hiển thị rõ “Chưa lưu”/“Đã lưu”; nếu lưu lỗi thì giữ nội dung đang gõ, báo lỗi và không chuyển câu. Khi rời câu đang sửa mà chưa lưu, yêu cầu lưu hoặc bỏ thay đổi. Hệ thống kiểm soát thứ tự thao tác, không xác định được học sinh đã tính nhẩm trước hay chưa.

## 3. Phạm vi và dữ liệu

- Một bộ cố định `phieu-uoc-luong-v1` gồm đúng 12 câu: **6 câu nhân và 6 câu chia hết**, dùng cho luyện tập và kiểm thử. Mỗi câu có dạng **số nhiều chữ số × số một chữ số** hoặc **số nhiều chữ số ÷ số một chữ số**, theo đúng thứ tự này.
- Với cả hai phép toán, `a` là số nguyên từ 10 đến 100.000, `b` là số nguyên từ 1 đến 9 và đáp án là số nguyên dương không quá 100.000. Phép nhân yêu cầu `a × b <= 100000`; phép chia yêu cầu `a % b = 0`, không chấp nhận chia cho 0 hoặc chia có dư. Bộ V1 tại Mục 7 chọn `a` có 2–3 chữ số.
- V1 hỗ trợ ước lượng cả phép nhân lẫn phép chia, không thay đổi các bài nhân/chia cũ. Quyết định phạm vi được ghi tại DECISIONS ADR-02.
- Câu trả lời là chuỗi chữ số trong `[0, 1.000.000.000]`, được trim và chuẩn hóa số 0 ở đầu. Từ chối dữ liệu rỗng, âm, thập phân, dạng mũ, dấu phân cách, `null`, object/array và JSON number.
- Không sửa auth/session, tài khoản mẫu, route auth/teacher/admin, deployment hoặc hành vi bốn type cũ. Không dùng LLM tạo/chấm đáp án lúc chạy.
- Ngoài MVP: UI biên tập câu mới, nhiều bộ mới, dashboard/biểu đồ, trang lịch sử nhiều lượt, tự lưu nội dung đang gõ, framework mới và bảng cấu hình `estimation_questions`.

## 4. Quy tắc chấm

Với ước lượng đã khóa `u`, đáp án server tính `P > 0`, sai số `e = |u − P| / P`:

| Sai số | Điểm ước lượng E | Phản hồi đề xuất |
|---|---:|---|
| `0 ≤ e ≤ 10%` | 10 | Ước lượng tốt |
| `10% < e ≤ 20%` | 7 | Ước lượng khá gần |
| `20% < e ≤ 30%` | 3 | Ước lượng còn lệch |
| `e > 30%` | 0 | Ước lượng chưa hợp lý |

Điểm tính chính xác `C = 10` nếu đúng, ngược lại bằng 0. Điểm câu `S = (E + C) / 2`; điểm bộ `round(100 × ΣS / (10 × N))`. Chỉ làm tròn tổng cuối. `correctCount` đếm câu đạt trọn điểm.

Đúng biên 10%, 20%, 30% nhận lần lượt 10, 7, 3 điểm. Ước lượng 0 hợp lệ nhưng nhận 0 điểm khi `P > 0`. Cơ sở tham khảo và giới hạn sư phạm: DECISIONS ADR-01.

## 5. Yêu cầu chức năng

### 5.1. Năm chức năng chính

MVP gồm năm chức năng dưới đây. Các quy tắc về dữ liệu, quyền truy cập và giao diện là điều kiện nghiệm thu của các chức năng này. Mã FR được đánh lại theo cách nhóm mới; mã B, TP và MIG giữ nguyên.

| ID | Chức năng | Điều kiện nghiệm thu | Kiểm chứng |
|---|---|---|---|
| FR-01 | Mở và làm bộ bài ước lượng | Mở từ trang Luyện tập, không nhập URL thủ công. V1 có đúng 12 câu synthetic tại Mục 7: 6 câu nhân, 6 câu chia hết; toán hạng theo Mục 3, tái lập được. | TP-01, TP-02 |
| FR-02 | Xác nhận và khóa ước lượng | Server kiểm tra, lưu và khóa ước lượng trước khi mở ô tính chính xác. Từ chối thay giá trị đã khóa; khi lượt còn đang làm, xác nhận lại cùng giá trị không đổi dữ liệu. Muốn nhập lại ước lượng phải tạo lượt mới. | TP-03 |
| FR-03 | Lưu câu trả lời, nộp bài, chấm và phản hồi | Câu tiếp theo/Lưu và xem lại/Lưu thay đổi phải lưu câu trả lời chính xác trên server. Chỉ chấm khi bấm Nộp bài và đủ hai bước của cả 12 câu. Server chấm theo Mục 4, lưu kết quả; hiển thị riêng ước lượng, điểm E, kết quả bước hai, đáp án đúng, đúng/sai, điểm C và điểm câu. | TP-03, TP-04, TP-07, TP-08, TP-10 |
| FR-04 | Khôi phục lượt làm | Refresh hoặc restart khôi phục ước lượng đã xác nhận, câu trả lời chính xác đã lưu và kết quả đã nộp; chọn màn hình theo Mục 2. Chỉ chủ sở hữu đọc được lượt; thông báo nội dung đang gõ chưa lưu có thể mất. | TP-06, TP-09 |
| FR-05 | Nạp bộ câu hỏi vào ứng dụng | DB mới/cũ đều có bộ V1, đúng 12 câu và bảng trạng thái. Nạp lại không trùng hoặc thay dữ liệu đúng; phát hiện xung đột và rollback khi lỗi. Giữ nguyên dữ liệu cũ. Chi tiết tại Mục 5.3. | TP-12, MIG-01…MIG-08 |

### 5.2. Điều kiện nghiệm thu chung

- **Dữ liệu và quyền truy cập:** Server kiểm tra input theo Mục 3, báo lỗi theo trường; không ép dữ liệu lỗi thành 0 hoặc ghi kết quả một phần. Kiểm tra người sở hữu trước khi đọc/sửa lượt, không tin điểm hay đáp án chuẩn do client gửi. Trước nộp hợp lệ không trả đáp án, sai số hoặc điểm; bộ mới không được đi qua nhánh chấm cũ. Kiểm chứng bằng TP-05, TP-06, TP-07.
- **Nộp bài nhất quán:** Nộp lại cùng lượt và đáp án trả kết quả cũ. Nộp lặp/đồng thời không tạo thêm attempt hoặc cộng sao hai lần; đổi đáp án sau nộp bị từ chối. Lỗi giữa lúc lưu phải rollback. Kiểm chứng bằng TP-10.
- **Giao diện dễ dùng:** Hoàn thành luồng chính bằng Tab/Enter; có label, focus rõ và thông báo lỗi cho công nghệ hỗ trợ. Ô bước hai chưa mở không nhận focus; Enter xác nhận không tự nộp cả bài. Phản hồi dùng chữ, không chỉ màu. Kiểm chứng bằng TP-13.
- **Tương thích và dữ liệu an toàn:** Phiếu cũ, bốn type cũ, hợp đồng dữ liệu, tiến độ/sao và thống kê tiếp tục hoạt động; không sửa các phần ngoài phạm vi ở Mục 3. Chỉ dùng dữ liệu synthetic/alias, không đưa PII hoặc secret vào repo. Kiểm chứng bằng TP-11 và rà soát dữ liệu.

### 5.3. Quy tắc lưu trữ và nạp dữ liệu của FR-05

Fixture riêng phía server là nguồn chuẩn; code sinh prompt và đáp án rồi nạp vào `questions`/`question_sets`. Không nhân bản nội dung vào `seed.json`. Chỉ thêm một bảng trạng thái `estimation_runs`, liên kết kết quả tổng hợp với `attempts`.

Bộ nạp chạy mỗi lần khởi động sau phần khởi tạo starter, trước khi phục vụ HTTP, độc lập với điều kiện DB trống. ID thiếu được bổ sung; ID cùng nội dung giữ nguyên; khác nội dung hoặc có câu thừa/trộn type phải báo lỗi. Tra ID trên toàn bảng câu hỏi, bao gồm trường hợp ID đã thuộc bộ khác. Không reset DB để nâng cấp.

Đối chiếu cả metadata bộ (tiêu đề, loại bộ, bài học, sao thưởng, thời lượng) và các trường câu hỏi (prompt, đáp án, type, options, điểm, category, thứ tự, quan hệ bộ/bài học). Prompt và đáp án phải cùng khớp dữ liệu sinh từ fixture; trùng đáp án chưa đủ để kết luận cùng phép tính. Phiên bản nội dung được nhận diện qua ID bộ, phiên bản rubric được lưu trong snapshot; không cần bảng cấu hình riêng.

Fixture sai, thiếu bài học tham chiếu, schema không tương thích hoặc xung đột dữ liệu phải được báo rõ. Việc tạo bảng mới và nạp bộ/câu hỏi nằm trong một transaction; lỗi không để lại bộ đề hoặc cấu trúc mới tạo dở dang và không được bỏ qua để tiếp tục phục vụ tính năng. Phạm vi rollback là phần mở rộng, không bao gồm seed starter đã hoàn tất.

Đọc đề/tạo lượt mới phải phát hiện DB bị sửa lệch fixture sau khởi động và từ chối có kiểm soát, không tiết lộ đáp án. Kiểm tra trong API chỉ đọc, không tự thêm/sửa/xóa dữ liệu để che xung đột. Lượt đã tạo dùng snapshot bất biến. Đổi nội dung đã phát hành cần ID/version mới hoặc migration được thống nhất.

Kiểm tra sai lệch lúc chạy (MIG-08) là cam kết kỹ thuật bổ sung do nhóm lựa chọn, vẫn thuộc tiêu chí nghiệm thu V1 của nhóm. Đây không phải một tiêu chí B mới hoặc trích nguyên văn yêu cầu đề; lý do giữ và giới hạn thực hiện nằm ở DECISIONS ADR-05.

### 5.4. Kiểm chứng nâng cấp dữ liệu

| Yêu cầu | Các ca trong TEST_PLAN |
|---|---|
| DB mới có schema và bộ 12 câu đúng | MIG-01 |
| DB cũ giữ nguyên dữ liệu, chạy lại không trùng, bổ sung phần thiếu hợp lệ | MIG-02, MIG-03 |
| Phát hiện xung đột ID/nội dung và fixture không hợp lệ | MIG-04, MIG-05 |
| Không thay đổi ý nghĩa lượt đang làm hoặc kết quả đã nộp | MIG-06 |
| Rollback khi lỗi giữa quá trình nạp, thiếu bài học hoặc sai schema | MIG-07 |
| Phát hiện DB bị sửa trong lúc ứng dụng đang chạy | MIG-08 |

## 6. Đối chiếu tiêu chí đề thi

| Tiêu chí | Bằng chứng cần có |
|---|---|
| B-01 | FR-01: lối vào trong luồng học hiện tại; TP-01. |
| B-02 | FR-01, FR-05: bộ 12 câu tái lập; TP-02, TP-12 và MIG-01…MIG-08. |
| B-03 | FR-03 và quy tắc tất định tại Mục 4; TP-04. |
| B-04 | Mục 5.2: không lộ đáp án trước nộp; TP-07. |
| B-05 | FR-02, FR-03, FR-04 và Mục 5.2: server chấm/lưu, khôi phục, chống nộp trùng; TP-03, TP-09, TP-10. |
| B-06 | FR-03: phản hồi riêng hai phần; TP-08. |
| B-07 | Mục 3, 5.2: diff không thay đổi phần ngoài phạm vi; TP-11. |
| B-08 | Test normal, boundary, invalid input và scoring; TP-02, TP-04, TP-05. |
| B-09 | `npm test` thành công từ clean checkout. |
| B-10 | CI trên PR chạy `npm ci` và `npm test`. |
| B-11 | Mục 5.2: chỉ dữ liệu synthetic/alias; không thêm PII, secret hoặc DB cá nhân. |
| B-12 | Mục 5.2: kiểm tra bàn phím và lỗi; TP-05, TP-13. |

## 7. Bộ câu hỏi V1 dự kiến

Cấu hình sẽ lưu trong `data/estimation-fixtures.json`; đáp án dưới đây là giá trị tham chiếu để review/test. Runtime tính đáp án từ phép toán.

Cả 12 câu đều có toán hạng thứ nhất nhiều chữ số và toán hạng thứ hai một chữ số. Chọn các số thuận tiện để luyện ước lượng, ví dụ `39 × 6 ≈ 40 × 6 = 240` và `192 ÷ 6 ≈ 180 ÷ 6 = 30`. Đây là điều chỉnh bộ dự kiến trước khi triển khai; quy tắc đổi ID/version cho nội dung đã phát hành vẫn giữ nguyên.

| ID | Phép tính | Đáp án |
|---|---|---:|
| est-mul-01 | 39 × 6 | 234 |
| est-mul-02 | 47 × 8 | 376 |
| est-mul-03 | 58 × 4 | 232 |
| est-mul-04 | 64 × 3 | 192 |
| est-mul-05 | 76 × 5 | 380 |
| est-mul-06 | 85 × 7 | 595 |
| est-div-01 | 192 ÷ 6 | 32 |
| est-div-02 | 248 ÷ 4 | 62 |
| est-div-03 | 315 ÷ 5 | 63 |
| est-div-04 | 432 ÷ 8 | 54 |
| est-div-05 | 567 ÷ 7 | 81 |
| est-div-06 | 864 ÷ 9 | 96 |

## 8. Nghiệm thu

Thực hiện TEST_PLAN trên DB tạm và ghi bằng chứng vào `TEST_REPORT.md`. Chỉ nghiệm thu khi đủ B-01…B-12, có test biên và chứng minh nâng cấp an toàn trên cả DB mới lẫn DB cũ.

Sau khi bộ test được triển khai, checkout sạch chỉ cần `npm ci` rồi `npm test` để tự tạo các DB kiểm thử. DB cũ được dựng từ schema/dữ liệu synthetic lưu trong repo, chưa chạy bộ nạp mới; không lấy DB đang dùng của nhóm. Bằng chứng gồm nội dung bản ghi trước/sau, kết quả chạy lặp/rollback và mở lại cùng file DB. Các cập nhật tài khoản mẫu vốn có của starter được tách khỏi tác động của bộ nạp khi kiểm tra bảo toàn dữ liệu.

Các mục trên là tiêu chí nghiệm thu. Hiện chưa có code migration, test tính năng hoặc kết quả chạy để kết luận góp ý #4 đã hoàn thành.
