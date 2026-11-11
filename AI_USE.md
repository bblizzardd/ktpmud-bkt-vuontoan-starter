# Khai báo sử dụng AI

**Dự án:** Vườn Toán Lớp 3 — Track B, Nhóm 01.  
**Cập nhật:** 11/11/2026.  
**Giai đoạn:** Phân tích yêu cầu, thiết kế và lập kế hoạch kiểm thử; chưa triển khai tính năng.

| Trường | Nội dung |
|---|---|
| Công cụ/model | OpenAI Codex. Model GPT-6 Astra; |
| Mục đích | Hỗ trợ đọc và đối chiếu starter; biên tập yêu cầu thành 5 chức năng chính; phân tích cách chấm ước lượng, nguồn tham khảo và các phương án thiết kế; xây dựng luồng hai bước theo từng câu, bộ 12 câu mẫu và kế hoạch kiểm thử chức năng/migration; rà tính nhất quán giữa ba tài liệu. |
| Phạm vi | [REQUIREMENTS.md](REQUIREMENTS.md): luồng học, phạm vi V1, quy tắc điểm, FR-01…FR-05, đối chiếu B-01…B-12 và bộ câu mẫu. [DECISIONS.md](DECISIONS.md): ADR-01…ADR-06 về rubric, miền dữ liệu, fixture, trạng thái lượt làm, API, nâng cấp SQLite và kiểm thử. [TEST_PLAN.md](TEST_PLAN.md): TP-01…TP-13, kịch bản lưu/khôi phục, ví dụ điểm và MIG-01…MIG-08. Nhật ký trước còn ghi hỗ trợ tóm tắt ý tưởng trong [README.md](README.md). Lượt cập nhật này chỉ sửa `AI_USE.md`; chưa có commit riêng cho các thay đổi hiện tại. |
| Kiểm chứng | Đã đối chiếu tài liệu với `docs/architecture-reference.md`, `server/db.js`, `server/index.js`, `server/api.js` và `package.json`; xác nhận hai hàm seed cũ bỏ qua DB đã có dữ liệu. Nguồn nghiên cứu đã được đối chiếu qua trang tạp chí và toàn văn Waring & Penner-Wilger (2017), trang 205–206; giới hạn là nghiên cứu trên người trưởng thành. |
| Quyết định của nhóm | **Giữ:** thang 10–7–3–0, đúng biên 10%/20%/30% nhận 10/7/3 điểm, tỷ trọng 50/50; làm hai bước tuần tự cho từng câu; server khóa ước lượng và lưu câu trả lời khi bấm Câu tiếp theo, chỉ chấm khi nộp đủ bộ. **Sửa:** thống nhất dấu biên giữa tài liệu; gom yêu cầu thành 5 chức năng; cập nhật phạm vi thành cả nhân và chia với bộ 6/6, số nhiều chữ số đứng trước số một chữ số. **Loại khỏi MVP:** bảng cấu hình `estimation_questions`, UI biên tập, nhiều bộ đề và dashboard nâng cao; dùng fixture riêng làm nguồn chuẩn và một bảng `estimation_runs` để giảm phạm vi. Giữ đối chiếu DB–fixture, transaction và snapshot để bảo toàn dữ liệu; MIG-08 là cam kết bổ sung của nhóm. Các lựa chọn này được ghi trong ba tài liệu; bản cuối vẫn cần thành viên review trước nghiệm thu. |
| Người chịu trách nhiệm | BE, FE, BA |

Nguồn tham khảo đã đối chiếu: [trang tạp chí của Waring & Penner-Wilger (2017)](https://jnc.psychopen.eu/index.php/jnc/article/view/5705), DOI `10.5964/jnc.v2i3.9`, và [toàn văn PDF](https://d-nb.info/1229755349/34). Bài dùng thang 3–2–1–0 theo các mốc 10%–20%–30%; thang quy đổi, dấu tại biên và trọng số 50/50 là lựa chọn của nhóm.
