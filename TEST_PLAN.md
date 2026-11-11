# Kế hoạch kiểm thử — Ước lượng trước khi tính đúng

**Trạng thái:** Chưa triển khai/chạy bộ test tính năng.

## 1. Môi trường

Dùng `node:test`, `node:assert/strict`, tài khoản synthetic và fixture V1 tại REQUIREMENTS Mục 7. Đặt `DB_PATH` tới DB tạm trước khi import DB; đóng server/DB trước khi dọn thư mục tạm. Không dùng DB của nhóm hoặc `reset-db`.

Kết quả mong đợi phải tính độc lập với hàm đang kiểm thử. Test restart mở lại cùng file DB tạm; kiểm tra giao diện bằng thao tác thực tế.

## 2. Chức năng và hồi quy

| ID | Trường hợp | Kết quả mong đợi |
|---|---|---|
| TP-01 | Mở bộ mới từ Luyện tập và mở phiếu cũ. | Đúng luồng, không cần URL thủ công. |
| TP-02 | Kiểm tra đúng 12 câu tại REQUIREMENTS Mục 7: 6 câu `operator = "*"`, 6 câu `operator = "/"`, ID duy nhất, `10 <= a <= 100000`, `1 <= b <= 9`, đáp án nguyên dương không quá 100000; phép chia phải có `a % b = 0`; prompt/đáp án; thử trộn type. | Mỗi câu là số nhiều chữ số nhân hoặc chia hết cho số một chữ số theo đúng thứ tự, đáp án khớp bảng tham chiếu; bộ tái lập được, cấu hình sai bị từ chối. |
| TP-03 | Làm hai bước từng câu; xác nhận/lưu lặp, sửa câu trả lời chính xác, sửa ước lượng, nhảy câu, nộp thiếu bước. | Chỉ mở bước hai sau khi server khóa ước lượng; Câu tiếp theo lưu câu trả lời rồi mới chuyển câu. Lặp cùng giá trị giữ nguyên; được sửa câu trả lời trước nộp, không sửa ước lượng; nhảy/thiếu bước trả 409. |
| TP-04 | Đúng/sát biên, E kết hợp C đúng/sai, tổng bộ. | Đúng bảng Mục 3, tỷ trọng 50/50; chỉ làm tròn tổng cuối; đếm câu đạt trọn điểm. |
| TP-05 | Với giá trị ước lượng và câu trả lời chính xác: rỗng, thiếu, `null`, JSON number/object/array, `40a`, `40.5`, `-40`, `1e3`, dấu phân cách, vượt giới hạn. | Trả 400 theo trường, không ghi dữ liệu lỗi. Chấp nhận `"0"`, `"1000000000"`; chuẩn hóa `" 042 "` thành `"42"`. Câu trả lời sai toán nhưng đúng định dạng vẫn được lưu. |
| TP-06 | Chưa đăng nhập, lượt người khác/không tồn tại, câu không thuộc lượt. | Trả 401/404 phù hợp; không đọc/sửa trái quyền. |
| TP-07 | GET đề/khôi phục, xác nhận, PUT lưu câu trả lời, nộp thiếu `runId`; gửi điểm/đáp án chuẩn/ước lượng giả. | Trước nộp không lộ đáp án chuẩn, đúng/sai, sai số, điểm hoặc snapshot; được trả input của chính học sinh. Lưu nháp không tạo attempt/cộng sao; không lọt nhánh chấm cũ. |
| TP-08 | Nộp đủ hai bước với các tổ hợp E/C. | Hiện riêng input, điểm và phản hồi hai phần; chỉ lúc này công bố đáp án. |
| TP-09 | Refresh/restart sau khóa ước lượng, sau lưu câu trả lời, khi đang sửa chưa lưu, sau lưu câu 12 và sau nộp; response lưu bị mất. | Khôi phục bản đã lưu gần nhất của chủ sở hữu; mở câu đầu chưa lưu câu trả lời, màn hình xem lại hoặc kết quả theo ADR-04. Input chưa lưu có thể mất; GET/thử lại xác nhận được lần lưu thành công dù mất response. |
| TP-10 | Nộp lặp/đồng thời, answers khác bản lưu, đổi đáp án sau nộp, PUT lưu đồng thời với nộp, lỗi giữa transaction. | Một attempt, không cộng sao lặp; dữ liệu không khớp trả 409, không tự ghi đè. Nếu nộp trước thì PUT trả 409; nếu PUT trước làm answers gửi nộp bị cũ thì nộp trả 409. Lỗi rollback toàn bộ lần ghi tương ứng. |
| TP-11 | Bốn type cũ, tiến độ/sao, thống kê; rà soát diff. | Giữ hành vi cũ, không giảm điểm tốt nhất, không sửa phần ngoài phạm vi. |
| TP-12 | Nâng cấp/nạp fixture. | Đạt MIG-01…MIG-08. |
| TP-13 | Chỉ dùng Tab/Enter và trình đọc màn hình. | Label/focus rõ; bước hai chưa mở không nhận focus; Enter xác nhận không nộp cả bài; lỗi được đọc, kết quả có chữ. |

### 2.1. Kịch bản luồng từng câu và khôi phục

Các ca dưới đây cụ thể hóa TP-03, TP-07, TP-09, TP-10 và TP-13; dùng cùng `runId` qua refresh/restart, DB tạm.

| Thao tác | Kết quả mong đợi |
|---|---|
| Tạo lượt; gọi thẳng lưu câu trả lời câu 1 hoặc khóa ước lượng câu 2. | Trả 409, không ghi dữ liệu; giao diện ở ước lượng câu 1. |
| Khóa ước lượng câu 1, refresh. | Khôi phục ước lượng khóa; mở tính chính xác câu 1; chưa có điểm/phản hồi đúng sai. |
| Nhập câu trả lời câu 1, bấm Câu tiếp theo, chờ lưu thành công rồi refresh/restart. | Map nháp có câu 1; mở ước lượng câu 2. Chưa tạo attempt, chưa cập nhật tiến độ/sao. |
| Gõ câu trả lời rồi gặp lỗi lưu; hoặc server lưu thành công nhưng mất response. | Không tự chuyển câu khi chưa xác nhận thành công; giữ input để thử lại. GET/thử lại cùng giá trị phục hồi bản đã lưu, không ghi lặp. |
| Quay lại sửa câu 1; rời câu khi chưa lưu; sau đó thử lưu và refresh. | Có lựa chọn lưu/bỏ thay đổi. Chưa lưu thì refresh lấy bản cũ; lưu thành công thì lấy bản mới. Ước lượng giữ nguyên, các câu sau không bị xóa. |
| Lưu câu trả lời `"0"` rồi tiếp tục. | Coi là đã lưu hợp lệ; không nhầm với chưa trả lời; chỉ chấm sai/đúng khi nộp. |
| Làm tuần tự đủ 12 câu, bấm Lưu và xem lại ở câu 12, refresh. | Mở màn hình xem lại với 12 input đã lưu; vẫn `in_progress`, chưa chấm và chưa có attempt. |
| Nộp answers thiếu câu, thừa ID, sai kiểu hoặc hợp lệ nhưng khác bản server. | Thiếu câu trả 409; ID ngoài lượt/sai kiểu trả 400; khác bản đã lưu trả 409. Không ghi đè bản nháp hoặc tạo kết quả. |
| Nộp đủ bộ; refresh; thử PUT sửa câu trả lời và POST sửa ước lượng. | Khôi phục kết quả đã nộp; cả hai API ghi trả 409. Nộp lại cùng answers trả đúng kết quả cũ, chỉ một attempt. |
| Dùng Enter ở ước lượng và tính chính xác, kể cả câu 12. | Chỉ xác nhận ước lượng hoặc lưu câu trả lời theo nút của bước; không tự nộp bộ. Lỗi lưu giữ focus/input; thành công đưa focus đến bước tiếp theo. |

## 3. Dữ liệu kiểm tra điểm

Với `P = 100`:

| Ước lượng | E mong đợi |
|---|---:|
| 100, 91, 109, 90, 110 | 10 |
| 89, 111, 81, 119, 80, 120 | 7 |
| 79, 121, 71, 129, 70, 130 | 3 |
| 69, 131, 0 | 0 |

Kiểm tra thêm: `P=5, u=4/6 → E=7`; `P=99, u=100 → E=10`; `P=42, u=400 → E=0`. Mỗi mức E kết hợp `C=10` và `C=0`, kiểm tra `S=(E+C)/2`.

Các giá trị `P` ở trên là dữ liệu unit test cho hàm chấm, không phải câu hỏi của bộ V1. Kiểm tra tích hợp TP-04/TP-08 bằng câu thật `est-mul-05`, `76 × 5 = 380`: khóa ước lượng, nộp kết quả chính xác rồi đối chiếu điểm server với bảng sau.

| Ước lượng | Sai số | E mong đợi |
|---|---|---:|
| 342, 418 | 10% | 10 |
| 304, 456 | 20% | 7 |
| 266, 494 | 30% | 3 |
| 265, 495 | Lớn hơn 30% | 0 |

Mỗi giá trị dùng một lượt mới; kết hợp đáp án chính xác `"380"` (`C=10`) và đáp án sai `"381"` (`C=0`) để kiểm tra điểm câu và phản hồi hai phần. Đi qua các API khóa ước lượng/lưu câu trả lời theo đúng thứ tự cả 12 câu; các câu còn lại dùng ước lượng và câu trả lời bằng đáp án tham chiếu trong REQUIREMENTS. Chỉ sau khi nộp cả bộ mới kiểm tra E/C/S của câu `est-mul-05`; không nộp riêng một câu để thay cho ca tích hợp.

Kiểm tra tích hợp cả phép chia bằng câu `est-div-01`, `192 ÷ 6 = 32`: ước lượng `"30"` có sai số 6,25%, nhận `E=10`; ước lượng `"20"` có sai số 37,5%, nhận `E=0`. Mỗi ước lượng kết hợp câu trả lời `"32"` (`C=10`) và `"33"` (`C=0`), mỗi tổ hợp một lượt mới. Làm đủ và nộp cả 12 câu như trên; kiểm tra server tính thương đúng, phản hồi hai phần và `S=(E+C)/2`.

## 4. Fixture và migration

| ID | Trường hợp | Kết quả mong đợi |
|---|---|---|
| MIG-01 | DB mới, chạy khởi tạo. | Schema đúng; một bộ V1, 12 câu; prompt/đáp án/metadata/quan hệ đúng; dữ liệu starter đầy đủ. |
| MIG-02 | DB cũ có users, câu giáo viên tạo, attempts, progress và sao. | Bổ sung bộ mới/bảng trạng thái; mọi bản ghi cũ giữ nguyên. |
| MIG-03 | Nạp 2–3 lần, mở lại DB; bộ V1 thiếu một phần nhưng dữ liệu còn lại khớp. | Không duplicate/đổi bản ghi đúng; chỉ bổ sung phần thiếu, đủ 12 câu. |
| MIG-04 | ID trùng khác prompt, đáp án, type, options, điểm, category, thứ tự hoặc bộ/bài học; metadata sai, câu thừa/trộn type. | Báo xung đột và rollback, kể cả chưa có lịch sử. Phép tính khác nhưng cùng đáp án vẫn bị phát hiện. |
| MIG-05 | JSON hỏng, thiếu/thừa câu, sai cơ cấu 6 nhân/6 chia, thiếu trường, ID trùng, version sai; phép toán ngoài nhân/chia, `a < 10` (`6 × 4`), `b = 0` (cả nhân và chia), `b >= 10` (`39 × 12`, `192 ÷ 12`), đảo toán hạng (`6 × 39`, `6 ÷ 192`), chia có dư (`193 ÷ 6`), toán hạng không nguyên/âm hoặc toán hạng/kết quả vượt giới hạn. | Báo lỗi rõ ràng; không ghi dữ liệu tính năng dở dang. Phép chia hết như `192 ÷ 6` phải được chấp nhận trong fixture đúng cơ cấu. |
| MIG-06 | Câu đã có lượt đang làm/đã nộp; fixture đổi phép tính nhưng giữ ID/version. | Từ chối; câu, snapshot, kết quả, tiến độ/sao giữ nguyên; yêu cầu ID/version mới hoặc migration riêng. |
| MIG-07 | Lỗi sau một số insert; thiếu bài học hoặc schema trạng thái không tương thích. | Báo lỗi, rollback toàn bộ thay đổi của bộ nạp; không nuốt lỗi schema. |
| MIG-08 | Sửa/xóa/thêm câu trong DB sau khởi động; đọc đề/tạo lượt mới. | Phát hiện lệch fixture, từ chối không lộ đáp án; lượt đã tạo giữ snapshot/kết quả cũ. |

So sánh nội dung bản ghi trước/sau, không chỉ đếm dòng. Test bộ nạp độc lập với các cập nhật tài khoản mẫu vốn có ở startup; transaction mới không hoàn tác seed starter đã hoàn tất. Không tạo bảng `estimation_questions`.

MIG-08 kiểm chứng cam kết kỹ thuật bổ sung được nhóm giữ trong V1 tại DECISIONS ADR-05; không diễn giải đây là yêu cầu nguyên văn riêng của đề. Chưa chạy hoặc không đạt ca này thì chưa hoàn thành cam kết thiết kế V1 của nhóm.

## 5. Bằng chứng nghiệm thu

- Clean checkout: `npm ci`, `npm test` thành công trên DB tạm; CI chạy hai lệnh này trên PR.
- Ghi **Đạt / Không đạt / Chưa chạy** cho TP-01…TP-13 và MIG-01…MIG-08 vào `TEST_REPORT.md`, kèm log/ảnh/liên kết CI.
- Kiểm tra đủ B-01…B-12, dữ liệu synthetic và không có PII/secret. Chỉ kết luận hoàn thành khi có kết quả chạy thực tế.
