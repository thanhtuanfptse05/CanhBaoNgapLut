# Feature Spec: Hệ Thống Web Cảnh Báo Ngập Lụt Toàn Quốc (feat-national-flood-system)

- **Feature Name**: national-flood-system
- **Status**: Draft -> Reviewed
- **Version**: 1.0.0
- **Author**: Outcome Engineer
- **Date**: 2026-09-27
- **Scope**: Toàn bộ lãnh thổ Việt Nam (63 tỉnh/thành phố, các lưu vực sông lớn, ven biển và đô thị)

---

## 1. Business Context & Problem Statement
Việt Nam là quốc gia chịu ảnh hưởng nặng nề bởi biến đổi khí hậu, bão lũ, triều cường và ngập úng đô thị (đặc biệt tại Hà Nội, TP.HCM, Đà Nẵng, Cần Thơ, Miền Trung và ĐBSCL). Hiện tại dữ liệu ngập bị phân mảnh theo từng địa phương hoặc cơ quan riêng lẻ.
**Mục tiêu**: Xây dựng một nền tảng Web giám sát và cảnh báo ngập lụt tập trung, trực quan hóa trên bản đồ GIS thời gian thực, hỗ trợ dữ liệu trạm quan trắc IoT tự động kết hợp báo cáo xác minh từ cộng đồng.

---

## 2. User Personas & Scenarios
- **Người dân / Tài xế**: Tra cứu tuyến đường, xem các điểm đang ngập lụt theo thời gian thực trên cả nước, nhận thông báo đẩy khi khu vực mình sinh sống/làm việc có nguy cơ ngập sâu.
- **Cộng đồng đóng góp (Crowdsourcer)**: Gửi ảnh chụp, tọa độ GPS và thông tin ngập úng tại hiện trường để cảnh báo cho mọi người.
- **Cơ quan quản lý / Cứu hộ**: Giám sát toàn diện 63 tỉnh thành, các trạm đo thủy văn, lưu vực sông, đưa ra lệnh phát cảnh báo khẩn cấp (Emergency Broadcast).

---

## 3. Acceptance Criteria (EARS Notation)

### 3.1 Bản Đồ & Trực Quan Hóa GIS
- **WHEN** người dùng truy cập trang chủ **THE SYSTEM SHALL** hiển thị bản đồ toàn quốc với các cụm điểm ngập (clustering) và các trạm quan trắc hoạt động.
- **WHEN** người dùng chọn một tỉnh/thành phố (ví dụ: Đà Nẵng, Hà Nội, TP.HCM) **THE SYSTEM SHALL** tự động zoom vào địa bàn tỉnh đó và lọc các điểm ngập tương ứng trong vòng < 500ms.
- **WHILE** một điểm ngập có độ sâu nước > 50cm **THE SYSTEM SHALL** hiển thị màu đỏ (Cảnh báo nguy hiểm / Mức 3) kèm biểu tượng cấm di chuyển.

### 3.2 Dữ Liệu Quan Trắc & Ngưỡng Cảnh Báo
- **WHEN** cảm biến tại trạm quan trắc gửi dữ liệu mực nước vượt ngưỡng Báo động II hoặc Báo động III **THE SYSTEM SHALL** tự động chuyển trạng thái trạm sang vùng nguy cơ và tạo bản ghi cảnh báo.
- **WHEN** người dân gửi báo cáo ngập kèm hình ảnh **THE SYSTEM SHALL** ghi nhận ở trạng thái "Chờ xác minh" và tự động hiển thị nếu có từ 3 người dùng khác xác nhận (upvote).

### 3.3 Thông Báo & Cảnh Báo Sớm
- **WHEN** một vùng ngập được kích hoạt cảnh báo khẩn cấp **THE SYSTEM SHALL** phát cảnh báo trên thanh thông báo nổi (Emergency Banner) và gửi Push Notification tới người dùng đã đăng ký theo dõi khu vực đó.

---

## 4. Key Entities & Boundaries
- `Province`, `District`, `Commune`: Đơn vị hành chính Việt Nam.
- `RiverBasin`, `FloodRiskZone`: Lưu vực sông và vùng nguy cơ.
- `Station`, `StationThreshold`: Trạm quan trắc thủy văn / đo mưa / triều cường và các ngưỡng cảnh báo.
- `WaterLevelLog`, `RainfallLog`: Dữ liệu đo đạc chuỗi thời gian (time-series).
- `FloodPoint`, `FloodPolygon`: Điểm ngập và vùng ngập không gian GIS (Point, Polygon).
- `CommunityReport`: Báo cáo từ người dân hiện trường.
- `FloodAlert`, `UserSubscription`: Sự kiện cảnh báo và đăng ký nhận tin.

---

## 5. Non-Functional Requirements & Constraints
- **Chuẩn không gian**: Tọa độ WGS84 (EPSG:4326) / GeoJSON.
- **Độ trễ**: Dữ liệu cảm biến polling hoặc webhook được cập nhật tối đa 60 giây/lần.
- **Khả năng chịu tải**: Hỗ trợ tra cứu bản đồ cho tối thiểu 10.000 người dùng đồng thời trong các đợt mưa bão lớn.
- **Bảo mật**: Dữ liệu cấu hình trạm đo và lệnh phát cảnh báo khẩn cấp phải có quyền Admin có xác thực JWT.
