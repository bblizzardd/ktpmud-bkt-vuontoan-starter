# REQUIREMENTS — Ước lượng trước khi tính đúng

- Dự án: Vườn Toán Lớp 3 — Hack Marathon 2026, Track B.



## 1. Nguồn yêu cầu và hệ thống hiện có


Starter sử dụng Node.js, Express, SQLite và HTML/CSS/JavaScript. Các bảng liên
quan là `questions`, `question_sets`, `attempts`, `progress`. Hiện có bốn loại
câu hỏi: `multiple-choice`, `input`, `compare`, `paint`.

`POST /api/submissions` hiện chấm bằng so sánh chuỗi chính xác, lưu lượt nộp,
cập nhật điểm tốt nhất và cộng sao theo phần tiến bộ. Hệ thống chưa có kiểu
câu hỏi hai bước hoặc rubric sai số tương đối. `package.json` chưa có
`npm test`; nhóm phải bổ sung trong giai đoạn triển khai.

## 2. Bài toán và mục tiêu

Học sinh cần luyện khả năng đưa ra một kết quả gần đúng trước khi tính chính
xác, sau đó đối chiếu hai câu trả lời. Sản phẩm cần ghi nhận riêng chất lượng
ước lượng và tính đúng của phép tính, để học sinh nhận biết mình làm tốt hoặc
cần cải thiện ở bước nào.

Luồng mục tiêu:

```text
Mở bài từ luồng học hiện có
  → nhập và xác nhận một số ước lượng
  → nhập kết quả tính chính xác
  → nộp bài để server chấm
  → xem điểm, phản hồi hai phần và kết quả đã lưu
```

Phần mềm kiểm soát thứ tự thao tác và thời điểm công bố đáp án. Phần mềm
không chứng minh được học sinh chưa tính nhẩm chính xác trong đầu trước khi
nhập ước lượng; đây là giới hạn cần ghi nhận khi đánh giá kỹ năng.

## 3. Phạm vi

### 3.1. Trong phạm vi

- Một dạng bài mới, dự kiến có `type = estimate`, tích hợp với luồng học cũ.
- Học sinh nhập **một số nguyên** ở mỗi bước, không nhập khoảng tự do.
- Rubric ước lượng thống nhất 10–7–3–0 cho phép nhân và phép chia.
- Điểm từng câu gồm **50% ước lượng và 50% tính chính xác**.
- Ít nhất 12 câu synthetic cố định, có thể tái lập từ dữ liệu của repo.
- Server chấm, lưu các ước lượng đã xác nhận và kết quả đã nộp; giao diện đọc lại dữ liệu đã lưu khi refresh.
- Kiểm thử nghiệp vụ/API, kiểm tra bàn phím và CI trên Pull Request.

### 3.2. Phạm vi dữ liệu đề xuất cho MVP

- Chọn phép nhân số nguyên dương và phép chia hết đã thuộc nội dung nhân/chia trong starter.
- Số chia phải khác 0; kết quả đúng là số nguyên dương. Bộ mẫu ở Mục 7 tập trung vào các bảng nhân/chia đã có.
- Giới hạn kỹ thuật dự kiến cho toán hạng và kết quả đúng: không quá 100.000.
- Kết quả đúng bằng 0 chưa nằm trong bộ câu hỏi MVP vì sai số tương đối không xác định tại 0. Nếu dữ liệu câu hỏi có kết quả 0, trình kiểm tra fixture phải báo lỗi; không tự gán điểm bằng công thức chia cho 0.
- Học sinh vẫn được nhập 0 như một câu trả lời số hợp lệ; với đáp án đúng dương, ước lượng 0 có sai số 100% và được 0 điểm phần ước lượng.

### 3.3. Ngoài phạm vi

- Viết lại ứng dụng, thêm chương trình Toán/SGK mới hoặc yêu cầu deploy public.
- Sửa `server/auth.js`, authentication/session, tài khoản mẫu hoặc deployment.
- Sửa các route `/api/auth/*`, `/api/teacher/*`, `/api/admin/*` mà tài liệu kiến trúc starter xác định ngoài phạm vi.
- Chấm khoảng tự do, chấm lời giải bằng ngôn ngữ tự nhiên hoặc dùng LLM tạo đáp án/chấm điểm lúc chạy.
- Dùng dữ liệu cá nhân thật hoặc kết nối với production.
- Đánh giá đã được xác nhận về mặt sư phạm trên học sinh thật. Bộ fixture/test synthetic chỉ kiểm chứng logic phần mềm.

## 4. Quy tắc chấm

Thang điểm 10–7–3–0 và tỷ trọng 50/50 đã được thống nhất. Nhóm đề xuất
tính đúng biên 10%, 20%, 30% vào mức điểm cao hơn như bảng dưới đây;

### 4.1. Điểm ước lượng

Với kết quả đúng `P > 0` và số học sinh ước lượng `u`:

```text
D = |u - P|
e = 100 × D / P  (đơn vị: phần trăm)
```

| Điều kiện | Điểm ước lượng E / 10 | Nhãn phản hồi đề xuất |
|---|---:|---|
| `0 ≤ e ≤ 10%` | 10 | Ước lượng tốt |
| `10% < e ≤ 20%` | 7 | Ước lượng khá gần |
| `20% < e ≤ 30%` | 3 | Ước lượng còn lệch |
| `e > 30%` | 0 | Ước lượng chưa hợp lý |

- Đúng tại 10%, 20%, 30% lần lượt nhận 10, 7, 3 điểm.
- Một ước lượng trùng kết quả đúng có `e = 0`, nhận 10 điểm.
- Không làm tròn ước lượng, đáp án đúng hoặc sai số trước khi chọn mức điểm.
- Không ép câu trả lời về số tròn chục.


### 4.2. Điểm tính chính xác và điểm câu

Với kết quả học sinh nhập ở bước hai là `v`:

```text
C = 10 nếu v = P; ngược lại C = 0
S = 0,5 × E + 0,5 × C
```

Mỗi câu có tối đa 10 điểm. Phải giữ riêng `E`, `C`, `S` để giải thích kết quả.

Ví dụ cho `6 × 7 = 42`:

| Ước lượng u | Kết quả v | Sai số gần đúng để minh họa | E | C | S |
|---:|---:|---:|---:|---:|---:|
| 40 | 42 | 4,76% | 10 | 10 | 10 |
| 35 | 42 | 16,67% | 7 | 10 | 8,5 |
| 30 | 42 | 28,57% | 3 | 10 | 6,5 |
| 400 | 42 | 852,38% | 0 | 10 | 5 |
| 40 | 41 | 4,76% | 10 | 0 | 5 |
| 400 | 41 | 852,38% | 0 | 0 | 0 |

### 4.3. Tổng điểm và tiến độ — đề xuất tích hợp

- Các câu mới có cùng trọng số, mỗi câu tối đa 10 điểm.
- Điểm bộ bài theo thang 100: `scorePercent = round(100 × ΣS / (10 × N))`, với `N` là số câu. Chỉ làm tròn một lần ở tổng cuối.
- Với dạng mới, `correctCount` đếm số câu đạt trọn 10 điểm. Giao diện phải ghi “câu đạt trọn điểm”, tránh đồng nhất với số câu tính chính xác đúng.


## 5. Yêu cầu chức năng và dữ liệu

| ID | Yêu cầu | Điều kiện nghiệm thu |
|---|---|---|
| FR-01 | Mở bộ câu hỏi từ trang Luyện tập | Học sinh đăng nhập bằng tài khoản giả lập (synthetic), vào trang Luyện tập và mở được bộ câu hỏi mới mà không cần tự nhập URL. Các phiếu bài tập cũ vẫn hoạt động bình thường. |
| FR-02 | Có bộ câu hỏi mẫu cố định | Có ít nhất 12 câu hỏi mẫu (fixture), mỗi câu có ID riêng và phép tính hợp lệ. Khi lấy mã nguồn sạch và chạy lại, hệ thống vẫn tạo ra cùng bộ câu hỏi và đáp án. |
| FR-03 | Xác nhận ước lượng trước khi nhập kết quả chính xác | Khi ước lượng chưa được xác nhận hợp lệ, ô nhập kết quả chính xác phải bị ẩn hoặc vô hiệu hóa, không thể chọn bằng chuột hay phím Tab. Chỉ mở ô này sau khi server đã lưu xác nhận ước lượng thành công. |
| FR-04 | Không cho sửa ước lượng đã xác nhận | Trong cùng một lượt làm bài, học sinh không được thay đổi ước lượng đã xác nhận. Server phải từ chối yêu cầu đổi sang giá trị khác. Muốn nhập lại ước lượng, học sinh phải bắt đầu lượt làm bài mới. |
| FR-05 | Chấm điểm trên server | Server tự lấy đáp án chuẩn và ước lượng đã xác nhận từ dữ liệu đã lưu để chấm theo Mục 4. Không dùng điểm hoặc đáp án chuẩn do phía người dùng gửi lên. |
| FR-06 | Hiển thị rõ kết quả của từng bước | Sau khi nộp bài, hiển thị: ước lượng đã xác nhận, mức đánh giá và điểm ước lượng, kết quả chính xác học sinh đã nhập, đáp án chuẩn, kết luận đúng/sai ở bước hai và điểm của câu hỏi. Khi phù hợp, có nhận xét ước lượng quá cao hoặc quá thấp. |
| FR-07 | Không để lộ đáp án trước khi nộp đủ hai bước | API lấy câu hỏi, xác nhận ước lượng và khôi phục lượt đang làm không được trả về đáp án chuẩn, sai số hoặc kết quả chấm. Nếu lượt làm bài chưa hoàn thành đủ hai bước, API nộp bài phải từ chối và không tiết lộ lời giải. |
| FR-08 | Khôi phục bài làm sau khi tải lại trang | Khi tải lại trang, hệ thống khôi phục đúng ước lượng đã xác nhận, bước đang thực hiện và kết quả đã nộp của người dùng đó. Nội dung đang nhập nhưng chưa xác nhận hoặc chưa nộp có thể bị mất; giao diện phải thông báo rõ điều này. |
| FR-09 | Gửi lại bài nộp mà không bị ghi nhận hai lần | Nếu lỗi mạng khiến cùng một yêu cầu nộp bài được gửi lại, server phải trả về kết quả đã chấm trước đó, không tạo thêm bản ghi nộp bài và không cộng sao lần nữa. |
| FR-10 | Kiểm tra và báo lỗi dữ liệu nhập | Từ chối dữ liệu thiếu, rỗng, số âm, số thập phân, chữ hoặc dữ liệu sai cấu trúc. Thông báo phải chỉ rõ trường nào bị lỗi. Không tự chuyển dữ liệu lỗi thành số 0 và không lưu kết quả khi dữ liệu chưa hợp lệ. |
| FR-11 | Dễ thao tác bằng bàn phím và dễ nhận biết lỗi | Các ô nhập có nhãn rõ ràng, thứ tự di chuyển bằng phím Tab hợp lý và có dấu hiệu cho biết thành phần đang được chọn. Có thể xác nhận và nộp bài bằng bàn phím. Lỗi phải được mô tả bằng chữ và được thông báo cho công nghệ hỗ trợ, như trình đọc màn hình. Không chỉ dùng màu sắc để thể hiện đúng/sai. |
| FR-12 | Giữ nguyên chức năng cũ | Bốn loại câu hỏi cũ vẫn tiếp nhận dữ liệu gửi lên, chấm điểm và lưu kết quả theo quy tắc cũ. Không thay đổi các phần đã được xác định là ngoài phạm vi triển khai. |

Quy tắc input dự kiến: client gửi chuỗi số; server trim khoảng trắng, yêu cầu
toàn bộ chuỗi chỉ gồm chữ số và nằm trong `[0, 1.000.000.000]`. Cho phép số 0
ở đầu, chuẩn hóa để so sánh số; loại dạng mũ, dấu phân cách hàng nghìn, chuỗi
khoảng và giá trị JSON sai kiểu.

Trong MVP, tất cả câu hỏi mới trong một bộ bài phải dùng chung type: "estimate", áp dụng cho cả phép nhân và phép chia hết.

Chưa hỗ trợ bộ bài chứa đồng thời câu hỏi type cũ và câu hỏi estimate. Nếu phát hiện cấu hình trộn hai loại này, hệ thống phải báo lỗi và từ chối sử dụng bộ bài, không được bỏ qua câu hỏi không hỗ trợ rồi chỉ chấm điểm các câu còn lại.


## 6. Đối chiếu tiêu chí đề thi


| Tiêu chí | Cách đáp ứng dự kiến | Bằng chứng nghiệm thu dự kiến |
|---|---|---|
| B-01 | Đáp ứng FR-01 và FR-12: dùng trang làm bài chung, mở bộ câu hỏi mới từ trang Luyện tập và giữ các phiếu cũ hoạt động bình thường. | Demo thao tác từ menu hiện có đến bộ câu hỏi mới; kiểm tra các phiếu cũ vẫn mở đúng. |
| B-02 | Đáp ứng FR-02: chuẩn bị bộ câu hỏi mẫu cố định theo Mục 7. | Bộ dữ liệu mẫu được lưu và quản lý phiên bản trong repo; có test kiểm tra tính hợp lệ của dữ liệu. |
| B-03 | Áp dụng quy tắc chấm điểm ở Mục 4 và quyết định thiết kế ADR-01. | Có unit test với kết quả mong đợi được tính độc lập với hàm chấm điểm; kiểm tra đủ ba mốc biên của quy tắc chấm. |
| B-04 | Đáp ứng FR-07: API chỉ trả đáp án và kết quả chấm sau khi bài được nộp hợp lệ. | Kiểm tra dữ liệu trả về từ các API GET/POST trước khi nộp; kiểm tra trường hợp nộp khi chưa hoàn thành đủ hai bước. |
| B-05 | Đáp ứng FR-05, FR-08 và FR-09: chấm trên server, khôi phục được bài làm và không ghi nhận trùng khi gửi lại bài nộp. | Có test tích hợp; demo tải lại trang và khởi động lại server với cùng cơ sở dữ liệu để kiểm tra trạng thái, kết quả vẫn được giữ đúng. |
| B-06 | Đáp ứng FR-06: hiển thị riêng đánh giá phần ước lượng (E) và phần kết quả chính xác (C). | Kiểm thử các tổ hợp đúng/sai của hai phần; kiểm tra điểm và thông báo hiển thị tương ứng. |
| B-07 | Tuân thủ phạm vi ở Mục 3.3 và FR-12; không sửa các phần đã được quy định là ngoài phạm vi. | So sánh thay đổi với mã nguồn starter, tập trung vào xác thực, các route không được sửa, tài khoản và cấu hình triển khai. |
| B-08 | Thực hiện kế hoạch kiểm thử ở Mục 8. | Có unit test và test tích hợp cho dữ liệu hợp lệ, giá trị tại các mốc giới hạn, dữ liệu không hợp lệ và quy tắc chấm điểm. |
| B-09 | Bổ sung lệnh `npm test` để chạy bộ kiểm thử. | Có nhật ký chạy test từ một bản mã nguồn sạch. |
| B-10 | Thiết lập GitHub Actions tự động chạy `npm ci` và `npm test` khi có Pull Request. | Có đường dẫn đến lần chạy GitHub Actions của Pull Request để kiểm tra kết quả. |
| B-11 | Dùng dữ liệu và tài khoản giả lập, tên bí danh; không đưa mật khẩu, khóa API hoặc thông tin bí mật vào repo. | Rà soát dữ liệu, các thay đổi trong Git và danh sách kiểm tra bảo mật. |
| B-12 | Đáp ứng FR-10 và FR-11: kiểm tra dữ liệu nhập, báo lỗi rõ ràng và hỗ trợ thao tác bằng bàn phím. | Có danh sách kiểm tra thao tác chỉ bằng bàn phím và kết quả kiểm tra cách hiển thị, thông báo lỗi. |

## 7. Bộ câu hỏi MVP dự kiến

Đây là dữ liệu đề xuất cho thiết kế, **chưa được thêm vào seed**. Các câu nằm
trong nội dung bảng nhân/chia đã xuất hiện trong starter.

| ID dự kiến | Phép tính | Kết quả đúng |
|---|---|---:|
| est-mul-01 | 6 × 4 | 24 |
| est-mul-02 | 6 × 5 | 30 |
| est-mul-03 | 6 × 6 | 36 |
| est-mul-04 | 6 × 7 | 42 |
| est-mul-05 | 6 × 8 | 48 |
| est-mul-06 | 7 × 8 | 56 |
| est-div-01 | 24 ÷ 2 | 12 |
| est-div-02 | 54 ÷ 3 | 18 |
| est-div-03 | 30 ÷ 6 | 5 |
| est-div-04 | 36 ÷ 6 | 6 |
| est-div-05 | 42 ÷ 6 | 7 |
| est-div-06 | 54 ÷ 6 | 9 |

Lưu ý: Khi kết quả nhỏ và chỉ nhận số nguyên, mức 10 điểm có
thể chỉ chứa đáp án đúng. Ví dụ `P = 5` thì 4 và 6 đều lệch 20%, nhận 7 điểm
ước lượng; chỉ 5 nhận 10 điểm. 

## 8. Kế hoạch kiểm thử

### 8.1. Rubric và phép tính

Ngoài 12 câu học tập, unit test có thể dùng `P = 100` để kiểm tra biên dễ đọc.

| P | Ước lượng u | Điểm E mong đợi | Ý nghĩa |
|---:|---|---:|---|
| 100 | 100, 91, 109 | 10 | Chính xác hoặc dưới 10% |
| 100 | 90, 110 | 10 | Đúng biên 10% |
| 100 | 89, 111 | 7 | Vượt 10% |
| 100 | 80, 120 | 7 | Đúng biên 20% |
| 100 | 79, 121 | 3 | Vượt 20% |
| 100 | 70, 130 | 3 | Đúng biên 30% |
| 100 | 69, 131 | 0 | Vượt 30% |
| 99 | 100 | 10 | Không loại chỉ vì khác số chữ số |
| 42 | 400 | 0 | Đáp án quá xa |
| 5 | 4, 6 | 7 | Kết quả nhỏ |
| 42 | 0 | 0 | Số 0 là câu trả lời hợp lệ, chất lượng ước lượng bằng 0 điểm |

- Kiểm tra công thức 50%–50% bằng các giá trị cụ thể trong Mục 4.2.
- Kiểm tra tổng điểm trên nhiều câu, cách làm tròn cuối, `correctCount` và tiến độ.
- Kiểm tra phép chia hết, mẫu số 0, phép chia không hết, toán hạng sai miền và fixture sai đáp án.

### 8.2. API, lưu trữ và hồi quy

- Kiểm tra quyền truy cập:** Từ chối yêu cầu khi người dùng chưa đăng nhập, truy cập lượt làm bài của người khác, gửi câu hỏi không thuộc lượt đang làm hoặc dùng ID không tồn tại.
- Kiểm tra dữ liệu nhập:** Từ chối dữ liệu rỗng, `null`, thiếu trường bắt buộc, JSON sai kiểu, các giá trị như `40a`, `40.5`, `-40`, `1e3` hoặc số vượt giới hạn cho phép. Khi dữ liệu không hợp lệ, không lưu bản ghi kết quả.
- Kiểm tra trình tự làm bài và chống sửa dữ liệu:** Không cho sửa ước lượng sau khi đã xác nhận và không cho nộp kết quả khi chưa xác nhận ước lượng. Khi nộp bài, hệ thống phải tự tính điểm và dùng ước lượng đã lưu, không tin điểm hoặc ước lượng khác do người dùng gửi lên.
- Không lộ đáp án trước khi nộp:** Mọi phản hồi từ server trước khi nộp bài đều không chứa đáp án chuẩn hoặc kết quả chấm, kể cả khi người dùng gọi API trực tiếp.
- Lưu và khôi phục đúng trạng thái:** Sau khi tải lại trang ở bước đã xác nhận hoặc đã nộp bài, dữ liệu vẫn đúng. Khi khởi động lại server với cùng cơ sở dữ liệu, kết quả vẫn được giữ nguyên và chỉ chủ sở hữu lượt làm bài mới được đọc.
- Không ghi nhận một lượt nhiều lần:** Nộp lại hoặc gửi nhiều yêu cầu nộp cùng lúc cho một lượt không được tạo thêm bản ghi làm bài (`attempts`) hay cộng sao hai lần.
- Giữ đúng chức năng cũ:** Bốn loại câu hỏi cũ, cách cộng sao dựa trên điểm cao nhất và cách tính thống kê độ chính xác vẫn hoạt động theo thiết kế đã công bố.
- Bổ sung dữ liệu mà không làm mất dữ liệu cũ:** Có thể thêm bộ dữ liệu mẫu mới (`fixture`) vào cơ sở dữ liệu đang sử dụng mà không xóa tài khoản hoặc tiến độ học tập.

### 8.3. UI và CI

- Kiểm tra đi từ trang Luyện tập tới bộ bài, xác nhận/nộp bằng Tab/Enter, focus và lỗi dễ hiểu.
- CI cài dependency bằng `npm ci` rồi chạy `npm test` trên Pull Request.
- Test sử dụng DB tạm; kết quả phải được ghi trong `TEST_REPORT.md` sau khi chạy thật.
