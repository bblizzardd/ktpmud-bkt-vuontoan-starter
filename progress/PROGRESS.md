# PROGRESS — 01 — Track B

- Starter: `ktpmud-bkt-vuontoan-starter` · `tag bkt-2026-v1.1`
- Fork: `https://github.com/bblizzardd/ktpmud-bkt-vuontoan-starter`

## PC-1 — 11/11/2026

### 1.1. Tiến độ theo acceptance criteria

<!-- Track A: A-01…A-11 · Track B: B-01…B-10 (đề thi Mục 7.3 / 8.3). Đủ mọi mã. -->

| Mã | Trạng thái (Chưa / Đang / Xong) | Bằng chứng (commit / CI / file) | Ghi chú |
|---|---|---|---|
| B-01 | Đang | `REQUIREMENTS.md` §2, §5; `DECISIONS.md` ADR-04/05; `README.md` §Ý tưởng mở rộng | Đã thiết kế tích hợp luồng học; chưa xác nhận UI chạy. |
| B-02 | Đang | `REQUIREMENTS.md` §7; `TEST_PLAN.md` TP-02 | Đặc tả 12 câu synthetic: 6 nhân, 6 chia; fixture JSON chưa xác nhận đã tạo. |
| B-03 | Đang | `REQUIREMENTS.md` §4; `DECISIONS.md` ADR-01; `TEST_PLAN.md` TP-04 | Đã thiết kế rubric tất định 10–7–3–0; chưa có kết quả test. |
| B-04 | Chưa | `DECISIONS.md` ADR-04; `TEST_PLAN.md` TP-07 | Đã đặc tả không lộ đáp án trước khi nộp; chưa triển khai/kiểm thử. |
| B-05 | Chưa | `DECISIONS.md` ADR-04; `TEST_PLAN.md` TP-09/10 | Đã thiết kế lưu server, refresh/restart và chống nộp lặp. |
| B-06 | Chưa | `REQUIREMENTS.md` FR-03; `TEST_PLAN.md` TP-08 | Đã đặc tả feedback hai phần; chưa có UI chạy. |
| B-07 | Đang | `REQUIREMENTS.md` §3; `DECISIONS.md` ADR-06 | Thiết kế giới hạn file được sửa; cần rà soát git diff khi triển khai. |
| B-08 | Chưa | `TEST_PLAN.md` TP-01…TP-13 | Đã lập kế hoạch; chưa có bằng chứng chạy test tự động. |
| B-09 | Chưa | `TEST_PLAN.md` §5 | Cần triển khai `npm test` và chứng minh clean checkout. |
| B-10 | Chưa | `TEST_PLAN.md` §5 | Cần workflow CI chạy `npm ci`/`npm test` trên PR. |
| B-11 | Đang | `REQUIREMENTS.md` §5.2; `DECISIONS.md` ADR-06; `AI_USE.md` | Đã dùng alias BA/BE/FE trong khai báo AI; cần rà soát toàn repo trước khi nộp. |
| B-12 | Chưa | `REQUIREMENTS.md` §5.2; `TEST_PLAN.md` TP-13 | Đã có kế hoạch accessibility; chưa kiểm tra UI thực tế. |



### 1.2. Sửa đổi bắt buộc từ Checkpoint 1

| Mục | Trạng thái | Bằng chứng |
|---|---|---|
| #1 — Thống nhất dấu tại ngưỡng 10%/20%/30% | Hoàn thành | `REQUIREMENTS.md` §4; `DECISIONS.md` ADR-01; `TEST_PLAN.md` §3. Đã đồng bộ thiết kế, chờ test triển khai. |
| #2 — Rút gọn kiến trúc MVP | Đang | `DECISIONS.md` ADR-03/04; `REQUIREMENTS.md` §3, §5. Đã chốt fixture và một bảng `estimation_runs`. |
| #3 — Xác minh nguồn tham khảo cách chấm | Hoàn thành | `DECISIONS.md` ADR-01;. Đã nêu nguồn, kiểm chứng DOI. |
| #4 — Xử lý seed/SQLite cho DB mới và DB cũ | Đang | `DECISIONS.md` ADR-05; `TEST_PLAN.md` MIG-01…MIG-08. Đã có thiết kế/test plan, chưa có migration chạy. |

### 1.3. Timeline dự kiến đến khi hoàn thành

| Việc | Vai trò phụ trách | Mốc (CP2 15/11 · M3 · Freeze 19/11 · M4 20/11) | Ngày dự kiến |
|---|---|---|---|
| Chốt, review đặc tả/ADR/test plan; hoàn thiện PROGRESS PC-1 | BA / BE | M2 | 11/11 |
| Triển khai fixture, migration, API và logic chấm | BE | CP2 15/11 | 15/11 |
| Triển khai UI hai bước, tích hợp luồng học | FE | CP2 15/11 | 15/11 |
| Test tự động, regression, CI và báo cáo kiểm thử | BE / FE | M3 | 17/11 |
| Review code, security/privacy và chuẩn bị Draft PR có `validate` xanh | BA / BE / FE | M3, PC-2 | 18/11 |
| Chốt release candidate và SHA | BA / BE / FE | Freeze 19/11 | 19/11 |
| Chuyển Draft PR nộp bài sang Ready for review | BA / BE / FE | M4 20/11 | 20/11 |

### 1.4. Rủi ro / đang vướng

- Thiết kế đã chi tiết nhưng chưa có chạy thử implementation, test và CI chạy thành công.
- Bộ nạp phải hoạt động trên DB cũ, bảo toàn dữ liệu và không trùng câu hỏi; cần test migration bằng DB synthetic.
- Cần kiểm chứng API chống lộ đáp án, thứ tự hai bước, lưu nháp và nộp đồng thời.
- Cần đối chiếu cơ chế lưu sao/tiến độ và lesson liên kết với source code thực tế trước khi triển khai.


### 1.5. Câu hỏi cho GV
- Q1: 

### 1.6. Phân công (alias hoặc vai trò, KHÔNG ghi họ tên/MSSV)

| Alias / vai trò | Đầu việc chính | Commit/PR tiêu biểu |
|---|---|---|
| BA | Phân tích yêu cầu, quyết định thiết kế, review đặc tả | `REQUIREMENTS.md`, `DECISIONS.md`|
| BE | SQLite, fixture, API, scoring, automated tests | `DECISIONS.md`, `TEST_PLAN.md` |
| FE | Thiết kế luồng giao diện, accessibility, UI và kiểm thử tích hợp | `REQUIREMENTS.md`, `TEST_PLAN.md` |



## PC-2 — 18/11/2026

### 2.1. Đối chiếu timeline PC-1
| Việc (theo bảng 1.3) | Kế hoạch | Thực tế | Lệch & lý do |
|---|---|---|---|

### 2.2. Tiến độ theo acceptance criteria (cập nhật toàn bộ bảng 1.1)
| Mã | Trạng thái | Bằng chứng | Ghi chú |
|---|---|---|---|

### 2.3. Sẵn sàng nộp bài (đề thi Mục 6)
| Deliverable | Có / Chưa | Đường dẫn |
|---|---|---|
| README.md (cài đặt / chạy / test) | | |
| REQUIREMENTS.md | | |
| DECISIONS.md / ADR | | |
| Test tự động + CI xanh | | |
| TEST_REPORT.md | | |
| SECURITY_PRIVACY_CHECKLIST.md | | |
| AI_USE.md | | |
| CONTRIBUTIONS.md | | |
| Slide / demo script ≤ 7 phút | | |
| Draft PR vào `ktpmud-project`, check `validate` xanh | | |

### 2.4. Việc còn lại đến Freeze (23:59 19/11)
| Việc | Vai trò phụ trách | Hạn |
|---|---|---|

### 2.5. Rủi ro / câu hỏi cho GV
- 

## Kết quả cuối — Freeze 19/11/2026
- Tag: bkt-2026-<01>-rc1 · SHA:
- Trạng thái cuối từng mã AC: (cập nhật bảng 2.2 hoặc ghi "như 2.2 trừ: …")
- Những việc trong timeline chưa hoàn thành và lý do: