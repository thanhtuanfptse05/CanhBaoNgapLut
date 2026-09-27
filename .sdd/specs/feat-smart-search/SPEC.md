# Feature Spec: Tìm Kiếm Địa Chỉ Thông Minh Có Đề Xuất (feat-smart-search)

- **Feature Name**: smart-address-search
- **Target Users**: Người tham gia giao thông, người dân cần tra cứu lộ trình và địa chỉ cụ thể
- **Status**: Approved
- **Version**: 1.2.0
- **Author**: Outcome Engineer
- **Date**: 2026-09-27
- **Updated**: 2026-09-27 (v1.2.0 - Upgrade to Mapbox Search Box API v1 for POI/brand search)

---

## 1. Mục Tiêu Nghiệp Vụ (User Value & Business Needs)
Hệ thống hiện tại chỉ lọc trên danh sách điểm ngập cục bộ, khiến người dùng không thể tìm kiếm các địa chỉ thực tế (số nhà, tên đường, phố, phường, trường học, bệnh viện, chợ, địa danh...).
Tính năng Tìm kiếm Thông minh (Smart Address Search) giải quyết triệt để vấn đề này:
1. **Tìm kiếm địa chỉ toàn quốc**: Tích hợp Mapbox Geocoding API (chuẩn xác cao, hỗ trợ tiếng Việt có dấu và không dấu, phạm vi toàn lãnh thổ Việt Nam).
2. **Gợi ý tự động tức thì (Autocomplete Suggestions Dropdown)**: Khi người dùng gõ từ 2 ký tự trở lên, hiển thị danh sách từ 4 - 6 kết quả đề xuất rõ ràng kèm biểu tượng địa danh.
3. **Điều hướng & Tương tác 1 chạm**:
   - Khi click vào kết quả gợi ý: Bản đồ tự động bay (`flyTo`) đến đúng tọa độ địa chỉ với mức zoom chi tiết (zoom 15 - 16).
   - Đặt ghim đánh dấu vị trí tìm kiếm.
   - Tự động đồng bộ số liệu thời tiết thực tế tại tọa độ đó.
   - Kiểm tra và hiển thị cảnh báo nếu khu vực quanh địa chỉ đó có trạm đo hoặc điểm ngập lân cận.

---

## 2. Tiêu Chí Thiết Kế Giao Diện (UI/UX)
- Dropdown gợi ý địa chỉ thiết kế theo phong cách Clean Light Mode:
  - Nằm ngay dưới ô `search-box`, bo góc `var(--radius-md)`, bóng đổ nổi `var(--shadow-lg)`, nền kính mờ `backdrop-filter: blur(16px)`.
  - Mỗi dòng gợi ý hiển thị: Icon địa danh (SVG pin/building), Tên địa điểm chính (đậm), Địa chỉ chi tiết quận/huyện/tỉnh (màu nhạt).
  - Hiệu ứng hover mượt mà, hỗ trợ cả chuột lẫn phím điều hướng (ArrowUp, ArrowDown, Enter, Escape).
  - Nút "X" (clear) để xóa nhanh từ khóa tìm kiếm khi cần.

---

## 3. Đặc Tả Yêu Cầu Chức Năng (EARS Notation)

### 3.1 Nhập Từ Khóa & Tải Đề Xuất
- **WHEN** người dùng gõ từ 2 ký tự vào ô tìm kiếm **THE SYSTEM SHALL** kích hoạt cơ chế debounce (260ms) và gửi yêu cầu tới Mapbox Geocoding API với các tham số: `country=vn`, `language=vi`, `types=place,district,locality,neighborhood,address,poi`, `bbox=102.0,8.0,110.0,24.0` (khung giới hạn lãnh thổ VN), và `proximity` từ tâm bản đồ hiện tại.
- **WHEN** Mapbox API trả về kết quả **THE SYSTEM SHALL** hiển thị danh sách gợi ý (tối đa 6 địa chỉ gần đúng nhất) ngay phía dưới ô tìm kiếm.
- **WHEN** Mapbox API thất bại hoặc token không hợp lệ **THE SYSTEM SHALL** fallback sang Nominatim OSM với `addressdetails=1&namedetails=1&accept-language=vi&countrycodes=vn`.

### 3.2 Chọn Địa Chỉ Đề Xuất
- **WHEN** người dùng click vào một kết quả gợi ý **THE SYSTEM SHALL**:
  1. Điền tên địa chỉ vào ô tìm kiếm và ẩn dropdown gợi ý.
  2. Di chuyển tâm bản đồ tới tọa độ địa chỉ được chọn (`flyTo` zoom 15).
  3. Tạo marker ghim tạm thời với popup thông tin vị trí.
  4. Cập nhật thời tiết tức thời tại tọa độ vừa tìm được qua `getRealtimeWeather`.

### 3.3 Hủy / Xóa Tìm Kiếm
- **WHEN** người dùng bấm phím Escape hoặc click ra ngoài ô tìm kiếm **THE SYSTEM SHALL** đóng dropdown gợi ý.
- **WHEN** người dùng xóa sạch nội dung ô tìm kiếm **THE SYSTEM SHALL** xóa ghim tìm kiếm tạm thời và đưa bản đồ về trạng thái hiển thị bình thường.

---

## 4. Kiểm Thử & Chấp Nhận (Acceptance Criteria)
- [x] Tìm kiếm thành công các địa chỉ và địa danh nổi tiếng (ví dụ: "Hồ Gươm", "Chợ Bến Thành", "Đại học Bách Khoa", "Nguyễn Huệ", "Cầu Rồng").
- [x] Debounce 300ms hoạt động chuẩn xác, không spam API.
- [x] Giao diện dropdown gợi ý tinh tế, responsive trên mọi kích thước màn hình.
- [x] Tuân thủ quy tắc kiểm thử qua terminal, không dùng browser subagent.
