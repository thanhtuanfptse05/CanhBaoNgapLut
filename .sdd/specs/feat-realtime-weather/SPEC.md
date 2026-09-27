# Feature Spec: Tích Hợp Thời Tiết Thực Tế & Cảnh Báo Mưa Ngập (feat-realtime-weather)

- **Feature Name**: realtime-weather-integration
- **Target Users**: Người dân theo dõi thời tiết, tài xế di chuyển trong mưa bão, đội cứu hộ
- **Status**: Approved
- **Version**: 1.0.0
- **Author**: Outcome Engineer
- **Date**: 2026-09-27

---

## 1. Mục Tiêu Nghiệp Vụ (User Value & Business Needs)
Ngập lụt tại các đô thị Việt Nam gắn liền trực tiếp với lượng mưa tức thời và lưu lượng nước lũ dâng từ thượng nguồn.
Hệ thống cần cung cấp dữ liệu thời tiết thực tế 100% (Real-time telemetry) và chuẩn xác cao:
1. **Dữ liệu khí tượng chuẩn xác**: Tích hợp Open-Meteo API (mô hình ECMWF / GFS) lấy nhiệt độ, độ ẩm, tốc độ gió, lượng mưa tức thời (mm/h) và xác suất mưa.
2. **Cập nhật theo vị trí & tỉnh thành**: Khi người dùng chọn tỉnh (Hà Nội, TP.HCM, Đà Nẵng, Thừa Thiên Huế, v.v.) hoặc bấm GPS, thời tiết tự động cập nhật theo tọa độ vị trí đó.
3. **Cảnh báo nguy cơ ngập lụt theo lượng mưa**:
   - Mưa nhẹ (< 10 mm/h): Giao thông bình thường.
   - Mưa vừa (10 - 25 mm/h): Chú ý một số tuyến đường trũng thấp có thể đọng nước.
   - Mưa to đến rất to (> 25 - 50 mm/h): Nguy cơ ngập sâu cục bộ, cảnh báo xe gầm thấp.
   - Mưa đặc biệt to (> 50 mm/h hoặc dông bão giật cấp 6+): Cảnh báo khẩn cấp ngập lụt diện rộng.
4. **Lớp Radar Mưa Vệ Tinh (Weather Radar)**: Tích hợp lớp bản đồ radar mưa thời gian thực (RainViewer Real-time Radar Tiles) cho phép người dân bật/tắt để nhìn thấy hướng di chuyển của các đám mây dông gây mưa trên bản đồ.

---

## 2. Tiêu Chí Thiết Kế Giao Diện (UI/UX)
- Giao diện sạch sẽ, phong cách Clean Light Mode, không dùng icon rác/phèn.
- Widget Thời Tiết (Weather Widget) dạng Compact Bar nằm tinh tế trên thanh điều khiển hoặc góc bản đồ:
  - Icon SVG thời tiết theo mã chuẩn WMO (Nắng, Mây rải rác, U ám, Mưa phùn, Mưa rào, Dông sét).
  - Nhiệt độ hiện tại kèm cảm nhận thực tế.
  - Lượng mưa hiện tại (mm/h) & Xác suất mưa (%).
  - Tốc độ gió (km/h) & Độ ẩm (%).
- Nút chuyển đổi nhanh lớp "Radar Mây Mưa" trên bản đồ (Toggle Rain Radar).

---

## 3. Đặc Tả Yêu Cầu Chức Năng (EARS Notation)

### 3.1 Tự Động Tải Thời Tiết Khi Chọn Tỉnh
- **WHEN** ứng dụng khởi chạy hoặc khi người dùng thay đổi tỉnh thành trên dropdown (hoặc lấy GPS) **THE SYSTEM SHALL** gửi yêu cầu API Open-Meteo với tọa độ tâm tương ứng.
- **WHEN** nhận được dữ liệu thời tiết **THE SYSTEM SHALL** cập nhật widget hiển thị:
  - Tên khu vực / tỉnh thành.
  - Mô tả thời tiết tiếng Việt (Ví dụ: "Nhiều mây, mưa rào nhẹ").
  - Nhiệt độ (°C), Độ ẩm (%), Sức gió (km/h), Lượng mưa (mm/h).

### 3.2 Đánh Giá Nguy Cơ Ngập Dựa Trên Lượng Mưa (Rain-to-Flood Risk)
- **WHEN** lượng mưa tức thời >= 25 mm/h **THE SYSTEM SHALL** kích hoạt nhãn trạng thái "Cảnh báo mưa to - Nguy cơ ngập cục bộ" trên widget và cập nhật chỉ số rủi ro khí tượng.

### 3.3 Tích Hợp Lớp Radar Mây Mưa Thời Gian Thực
- **WHEN** người dùng bật nút công tắc "Radar Mây Mưa" **THE SYSTEM SHALL** tải lớp bản đồ nhiệt radar thời gian thực từ RainViewer API (cập nhật 10 phút/lần) đè lên bản đồ Leaflet.
- **WHEN** người dùng tắt nút công tắc **THE SYSTEM SHALL** ẩn lớp radar để xem rõ bản đồ giao thông.

---

## 4. Kiểm Thử & Chấp Nhận (Acceptance Criteria)
- [x] Lấy được dữ liệu thời tiết thực tế từ Open-Meteo cho toàn bộ các tỉnh thành hỗ trợ (Hà Nội, TP.HCM, Đà Nẵng, Thừa Thiên Huế).
- [x] Xử lý mượt mà khi mất mạng hoặc timeout (fallback an toàn, không làm crash web).
- [x] Đơn vị đo đạc chuẩn khoa học: °C, mm/h, km/h, %.
- [x] Tuyệt đối không dùng browser subagent để kiểm thử, chỉ test qua unit test/terminal.
