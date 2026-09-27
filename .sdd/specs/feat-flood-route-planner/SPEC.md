# Feature Spec: Tìm Đường Tránh Ngập (feat-flood-route-planner)

- **Feature Name**: flood-route-planner
- **Status**: Approved
- **Version**: 1.0.0
- **Author**: Outcome Engineer
- **Date**: 2026-09-27
- **Priority**: High

---

## 1. Mục Tiêu Nghiệp Vụ (Business Context)

Người dùng cần biết tuyến đường từ A đến B có bị ngập lụt không và nên đi đường nào.
Hệ thống hiện tại chỉ hiển thị điểm ngập trên bản đồ nhưng không tích hợp định tuyến.
Tính năng **Tìm Đường Tránh Ngập** giải quyết:
1. Người dùng nhập điểm xuất phát + điểm đến → hệ thống vẽ tuyến đường lên bản đồ.
2. Hệ thống phân tích tuyến đường đó có đi qua các điểm ngập không (buffer 100m quanh tuyến).
3. Thống kê mức độ nguy hiểm toàn tuyến và hiển thị cảnh báo từng đoạn ngập.
4. Đề xuất tuyến đường **an toàn nhất** (ít đi qua điểm ngập nhất) trong số các lựa chọn thay thế.

---

## 2. User Stories

- **Happy Path**: Người dùng nhập "Hồ Gươm" → "Sân bay Nội Bài" → hệ thống vẽ 2-3 tuyến, đánh giá tuyến nào ít ngập nhất, tô màu đoạn nguy hiểm và đề xuất đi tuyến tốt nhất.
- **Khu vực ngập toàn diện**: Tất cả các tuyến đều có điểm ngập → hệ thống vẫn hiển thị tuyến ít ngập nhất với cảnh báo rõ ràng.
- **Không có điểm ngập**: Hệ thống thông báo "Tất cả tuyến đường đang thông thoáng" và hiển thị tuyến ngắn nhất.
- **Không tìm được đường**: Hệ thống thông báo lỗi rõ ràng và gợi ý người dùng kiểm tra lại địa điểm.

---

## 3. Acceptance Criteria (EARS Notation)

### 3.1 Nhập Điểm Đi - Điểm Đến
- **WHEN** người dùng bấm nút "Tìm đường tránh ngập" **THE SYSTEM SHALL** hiển thị panel nhập liệu với 2 ô tìm kiếm: "Điểm xuất phát" và "Điểm đến", mỗi ô có autocomplete giống tính năng tìm kiếm hiện có.
- **WHEN** người dùng nhập từ 2 ký tự vào ô điểm đi/đến **THE SYSTEM SHALL** hiển thị gợi ý địa chỉ tức thì (dùng lại Search Box API đã có).
- **WHEN** người dùng có vị trí GPS **THE SYSTEM SHALL** cho phép chọn "Vị trí hiện tại của tôi" làm điểm xuất phát bằng 1 chạm.

### 3.2 Tính Toán & Hiển Thị Tuyến Đường
- **WHEN** người dùng nhấn "Tìm đường" sau khi chọn cả 2 điểm **THE SYSTEM SHALL** gọi Mapbox Directions API để lấy tối đa 3 tuyến đường thay thế.
- **WHEN** tuyến đường được tính toán xong **THE SYSTEM SHALL** vẽ các tuyến lên bản đồ với màu khác nhau (xanh lá = tuyến đề xuất, xanh dương = tuyến thay thế, xám = tuyến tránh) và tự động zoom bản đồ để hiển thị toàn tuyến.
- **WHEN** hiển thị tuyến **THE SYSTEM SHALL** hiển thị thông tin: tổng khoảng cách (km), thời gian dự kiến (phút), số điểm ngập trên tuyến.

### 3.3 Phân Tích Ngập Trên Tuyến
- **WHEN** tuyến đường được vẽ **THE SYSTEM SHALL** kiểm tra toàn bộ điểm ngập hiện có (từ `floodPoints` đã load) và xác định điểm nào nằm trong vùng buffer 150m quanh tuyến đường.
- **WHEN** phát hiện điểm ngập trên tuyến **THE SYSTEM SHALL** tô đỏ/cam đoạn đường bị ảnh hưởng và đặt marker cảnh báo tại vị trí đó.
- **WHEN** tất cả tuyến phân tích xong **THE SYSTEM SHALL** xếp hạng tuyến theo tiêu chí: (1) số điểm ngập ít nhất → (2) tổng độ sâu ngập thấp nhất → (3) quãng đường ngắn nhất, và đánh dấu tuyến đứng đầu là "Tuyến Đề Xuất".

### 3.4 Bảng Thống Kê Tuyến Đường
- **WHEN** kết quả phân tích sẵn sàng **THE SYSTEM SHALL** hiển thị bảng so sánh các tuyến gồm: tên tuyến, khoảng cách, thời gian, số điểm ngập, đánh giá mức độ an toàn (An toàn / Thận trọng / Nguy hiểm).
- **WHEN** người dùng click vào một tuyến trong bảng **THE SYSTEM SHALL** highlight tuyến đó trên bản đồ và hiển thị chi tiết các điểm ngập trên tuyến đó.

### 3.5 Hủy & Reset
- **WHEN** người dùng bấm nút "Đóng" hoặc "Xóa tuyến đường" **THE SYSTEM SHALL** xóa toàn bộ tuyến đường đã vẽ, xóa marker cảnh báo ngập trên tuyến và đưa bản đồ về trạng thái bình thường.

---

## 4. Scoring Algorithm - Đánh Giá Mức Độ An Toàn Tuyến

```
SafetyScore(route) =
  100
  - (flood_point_count × 20)        // -20 điểm mỗi điểm ngập
  - (total_flood_depth_cm / 10)     // -1 điểm mỗi 10cm độ sâu tích lũy
  - (level3_count × 15)             // -15 thêm nếu có điểm ngập cấp 3

SafetyLabel:
  score >= 80  → "AN TOÀN"    (xanh lá)
  score >= 50  → "THẬN TRỌNG" (vàng cam)
  score < 50   → "NGUY HIỂM"  (đỏ)
```

---

## 5. UI/UX Design

- **Nút mở tính năng**: Button "🗺️ Tìm đường" trên thanh công cụ bên trái, ngang hàng với nút GPS và Radar.
- **Panel nhập liệu**: Slide-in panel từ phía trái (hoặc modal), chứa 2 ô search có autocomplete + nút "Đổi chiều" + nút "Tìm đường".
- **Tuyến đường**: Vẽ bằng `L.polyline` với màu động theo mức độ an toàn.
- **Bảng thống kê**: Card floating phía dưới bản đồ hoặc trong panel bên trái, có thể thu/mở.
- **Marker cảnh báo**: Icon tam giác cảnh báo (⚠️) tại mỗi điểm ngập trên tuyến, click mở popup chi tiết.

---

## 6. Constraints & Out of Scope

**Trong phạm vi**:
- Chỉ tính tuyến đường đi bộ/xe máy/ô tô (tùy chọn phương tiện).
- Phân tích điểm ngập từ data đã có trong memory (`this.floodPoints`).
- Tối đa 3 tuyến thay thế.

**Ngoài phạm vi**:
- Navigation turn-by-turn (chỉ xem tổng quan tuyến, không dẫn đường từng bước).
- Tích hợp traffic real-time (ngoài dữ liệu ngập lụt).
- Lưu lịch sử tuyến đã tìm.

---

## 7. Acceptance Criteria - Test Cases

- [x] Tìm tuyến "Hồ Gươm → Cầu Long Biên" → hiển thị ít nhất 1 tuyến có thông tin khoảng cách, thời gian, điểm ngập.
- [x] Khi có điểm ngập trên tuyến → đoạn đường đó được tô màu đỏ/cam.
- [x] Bảng xếp hạng tuyến đúng thứ tự theo SafetyScore.
- [x] Nút "Đổi chiều" hoán đổi điểm đi và điểm đến.
- [x] Nút "Xóa tuyến đường" dọn sạch bản đồ.
- [x] Khi 0 điểm ngập → SafetyLabel = "AN TOÀN".
- [x] Khi không tìm được đường → hiển thị thông báo lỗi thân thiện.
- [x] Mọi kiểm thử qua `npm test`, không dùng browser.
