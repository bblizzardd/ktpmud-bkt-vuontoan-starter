# Kế hoạch kiểm thử — Ước lượng trước khi tính đúng

**Trạng thái:** Kế hoạch dự kiến, chưa phải kết quả kiểm thử thực tế.  

## 1. Mục tiêu và chuẩn bị

Kiểm tra luồng hai bước, cách chấm điểm, lưu bài làm và quyền truy cập; bảo đảm tính năng mới không làm sai chức năng cũ. Áp dụng cùng quy tắc cho phép nhân và phép chia hết.

- Dùng Node.js theo yêu cầu của dự án, cơ sở dữ liệu tạm và hai tài khoản giả lập để kiểm tra quyền sở hữu. Không dùng dữ liệu học tập thật hoặc chạy `reset-db` trên dữ liệu đang sử dụng.
- Chuẩn bị ít nhất 12 câu hỏi mẫu theo REQUIREMENTS Mục 7 và dữ liệu riêng để kiểm tra các mốc điểm.
- Dự kiến dùng `node:test` cho kiểm thử tự động; kiểm tra giao diện bằng thao tác thực tế. Hiện dự án chưa có script `npm test`; cần bổ sung khi triển khai.

## 2. Các nhóm kiểm thử chính

| ID | Nội dung kiểm tra | Kết quả mong đợi |
|---|---|---|
| TP-01 | Đăng nhập, mở bộ mới từ trang Luyện tập và mở lại phiếu cũ. | Không cần nhập URL thủ công; bộ mới và phiếu cũ đều mở đúng. |
| TP-02 | Kiểm tra bộ mẫu: ID, phép tính, đáp án, giới hạn dữ liệu; thử bộ trộn type cũ với `estimate`. | Có ít nhất 12 câu cố định, ID duy nhất. Từ chối chia cho 0, chia không hết, kết quả 0, số ngoài giới hạn, đáp án sai và bộ trộn type không hỗ trợ. |
| TP-03 | Nhập và xác nhận ước lượng; xác nhận lại cùng giá trị; thử đổi giá trị hoặc nộp thiếu bước. | Chỉ mở ô kết quả sau khi server lưu xác nhận. Xác nhận lại cùng giá trị không đổi dữ liệu; đổi giá trị đã khóa hoặc nộp thiếu bước bị từ chối. |
| TP-04 | Kiểm tra điểm ước lượng tại, dưới và trên các mốc 10%, 20%, 30%; kết hợp kết quả bước hai đúng/sai. | Điểm đúng theo Mục 3 bên dưới; điểm câu là `(E + C) / 2`, tổng bộ chỉ làm tròn một lần; `correctCount` đếm câu đạt trọn điểm. |
| TP-05 | Gửi dữ liệu thiếu, rỗng, `null`, sai kiểu JSON, `40a`, `40.5`, `-40`, `1e3` và số vượt giới hạn. Thử chuỗi `"0"`, `" 042 "` và hai đầu giới hạn. | Dữ liệu lỗi được báo theo trường, không bị đổi thành 0 và không lưu kết quả một phần. Chuỗi số hợp lệ trong khoảng 0–1.000.000.000 được nhận; `" 042 "` chuẩn hóa thành `"42"`. |
| TP-06 | Gọi API khi chưa đăng nhập, dùng lượt của người khác, ID không tồn tại hoặc câu hỏi không thuộc lượt. | Từ chối yêu cầu; không đọc hoặc sửa được dữ liệu trái quyền. Chưa đăng nhập trả 401; lượt không tồn tại hoặc không thuộc người dùng trả 404. |
| TP-07 | Gọi trực tiếp API lấy đề, xác nhận, khôi phục và nộp thiếu bước; gửi điểm giả, đáp án chuẩn hoặc ước lượng khác trong bài nộp. | Trước khi nộp hợp lệ không lộ đáp án, sai số hay kết quả chấm. Từ chối trường không được phép; server dùng đáp án và ước lượng đã lưu để chấm. |
| TP-08 | Nộp bài và xem phản hồi cho các mức ước lượng, kết hợp bước hai đúng/sai. | Hiển thị riêng ước lượng, mức đánh giá, điểm E, kết quả đã nhập, đáp án chuẩn, đúng/sai bước hai, điểm C và điểm câu; có nhận xét quá cao/quá thấp khi phù hợp. |
| TP-09 | Tải lại trang sau xác nhận, sau nộp; khởi động lại server với cùng cơ sở dữ liệu. | Khôi phục đúng trạng thái và kết quả; chỉ chủ sở hữu đọc được. Có thông báo rằng nội dung chưa xác nhận/chưa nộp có thể mất. |
| TP-10 | Gửi lại cùng bài nộp, nộp đồng thời, gửi đáp án khác sau nộp; tạo lỗi giữa quá trình lưu. | Cùng lượt và đáp án trả cùng kết quả; không thêm `attempts` hoặc cộng sao hai lần. Đáp án khác sau nộp trả 409. Khi lưu lỗi, không còn dữ liệu ghi dở dang. |
| TP-11 | Kiểm tra bốn type cũ, điểm tốt nhất, sao và thống kê của giáo viên. | Giữ cách nhận dữ liệu, chấm và lưu của type cũ. Không giảm điểm tốt nhất hoặc cộng sao lặp. Thống kê độ chính xác đọc đúng phần tính chính xác; điểm tổng của bộ mới phản ánh tỷ trọng 50/50. |
| TP-12 | Nạp bộ mẫu vào cơ sở dữ liệu đã có tài khoản và tiến độ; nạp lại; thử ID trùng nhưng khác nội dung. | Không mất tài khoản, tiến độ hoặc lịch sử. Cùng ID và nội dung thì bỏ qua; khác nội dung thì báo xung đột. |
| TP-13 | Làm bài chỉ bằng Tab/Enter và kiểm tra thông báo lỗi bằng trình đọc màn hình. | Các ô nhập và nút bấm có tên hoặc nhãn dễ hiểu. Khi nhấn Tab, con trỏ di chuyển theo đúng thứ tự làm bài và giao diện đánh dấu rõ ô hoặc nút đang được chọn. Trước khi xác nhận ước lượng, người dùng không thể chọn hoặc nhập vào ô kết quả chính xác. Nhấn Enter để xác nhận ước lượng của một câu, không được tự động nộp toàn bộ bài. Thông báo lỗi phải được trình đọc màn hình đọc được. Kết quả phải ghi rõ bằng chữ “Đúng” hoặc “Sai”, không chỉ dùng màu sắc để phân biệt. |

## 3. Dữ liệu kiểm tra điểm

Với đáp án đúng `P = 100`, kiểm tra điểm ước lượng `E` như sau:

| Ước lượng | Điểm E mong đợi |
|---|---:|
| 100, 91, 109, 90, 110 | 10 |
| 89, 111, 80, 120 | 7 |
| 79, 121, 70, 130 | 3 |
| 69, 131, 0 | 0 |

Kiểm tra thêm: `P = 5`, ước lượng 4 hoặc 6 được 7 điểm; `P = 99`, ước lượng 100 được 10 điểm; `P = 42`, ước lượng 400 được 0 điểm. Mỗi mức E cần kết hợp với bước hai đúng (`C = 10`) và sai (`C = 0`). Kết quả mong đợi phải được tính độc lập, không lấy từ hàm chấm đang kiểm thử.

## 4. Cách chạy và điều kiện hoàn thành

1. Sau khi triển khai bộ test, lấy mã nguồn sạch, chạy `npm ci` rồi `npm test` trên cơ sở dữ liệu tạm.
2. Thực hiện các kiểm tra giao diện, tải lại trang và khởi động lại server trong bảng trên.
3. Kiểm tra GitHub Actions chạy `npm ci` và `npm test` thành công trên Pull Request.
4. Ghi kết quả từng nhóm TP-01 đến TP-13 là **Đạt / Không đạt / Chưa chạy** vào `TEST_REPORT.md`, kèm lỗi phát hiện, nhật ký test, ảnh hoặc đường dẫn CI phù hợp.