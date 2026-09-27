# Feature Spec: Bản Đồ Ngập Lụt & Trạm Đo Toàn Quốc (feat-public-map)

- **Feature Name**: public-flood-map
- **Target Users**: Toàn bộ người dân, tài xế, khách du lịch (100% Public - KHÔNG CẦN ĐĂNG NHẬP)
- **Status**: Approved
- **Version**: 1.0.0
- **Author**: Outcome Engineer
- **Date**: 2026-09-27

---

## 1. Mục Tiêu Nghiệp Vụ (User Value & Business Needs)
Cung cấp một cổng thông tin trực quan hóa ngập lụt toàn quốc nhanh nhất, đẹp nhất và dễ tiếp cận nhất. Người dân khi mở web không bị chặn bởi form đăng nhập, ngay lập tức nhìn thấy:
1. Vị trí ngập xung quanh mình (nếu cho phép định vị GPS).
2. Tình hình ngập úng tại 63 tỉnh/thành phố và các lưu vực sông trọng điểm.
3. Trạng thái mực nước tại các trạm quan trắc tự động (dữ liệu trực tiếp từ Supabase).

---

## 2. Tiêu Chí Thiết Kế Giao Diện (UI/UX Excellence)
- **Phong cách thiết kế**: Hiện đại, chuẩn quốc tế (Clean GIS Dashboard), kết hợp Glassmorphism (hiệu ứng kính mờ), phông chữ không chân hiện đại (Inter / Plus Jakarta Sans).
- **Trải nghiệm tức thì (Zero-friction)**: Tải trang < 1.5s, không popup quảng cáo hay yêu cầu tạo tài khoản.
- **Thang đo màu sắc trực quan theo độ sâu ngập**:
  - 🟢 **Mức 0 (< 10cm - Xanh ngọc)**: Đường thông thoáng, an toàn.
  - 🟡 **Mức 1 (10 - 30cm - Vàng hổ phách)**: Nước ngập mắt cá chân, xe máy đi chậm, xe gầm thấp chú ý.
  - 🟠 **Mức 2 (30 - 50cm - Cam rực rỡ)**: Nước ngập nửa bánh xe/đầu gối, nguy cơ chết máy cao.
  - 🔴 **Mức 3 (> 50cm - Đỏ cảnh báo chớp nháy)**: Ngập sâu nguy hiểm, cấm di chuyển.
- **Tương tác di động (Mobile-First)**: Thanh điều khiển dạng Floating Bottom Sheet vuốt lên/xuống mượt mà trên điện thoại.

---

## 3. Đặc Tả Yêu Cầu Chức Năng (EARS Notation)

### 3.1 Khám Phá Bản Đồ
- **WHEN** người dùng truy cập trang chủ **THE SYSTEM SHALL** hiển thị bản đồ toàn cảnh Việt Nam với các cụm điểm ngập (Marker Clustering) và thanh tìm kiếm nhanh.
- **WHEN** người dùng bấm nút "Vị trí của tôi" (GPS) **THE SYSTEM SHALL** yêu cầu quyền vị trí trình duyệt và di chuyển bản đồ đến tọa độ người dùng trong vòng 500ms.
- **WHEN** người dùng chọn tỉnh/thành phố từ dropdown bộ lọc (VD: Hà Nội, Đà Nẵng, TP.HCM) **THE SYSTEM SHALL** bay mượt (Fly-to) đến tọa độ trung tâm của tỉnh đó và tải danh sách điểm ngập tương ứng.

### 3.2 Tương Tác Điểm Ngập & Trạm Đo
- **WHEN** người dùng click vào một điểm ngập **THE SYSTEM SHALL** mở popup kính mờ hiển thị:
  - Tên tuyến đường/khu vực.
  - Thước đo mực nước trực quan (độ sâu cm).
  - Tình trạng: "Nước đang lên ⬆", "Đứng nước ⏸", "Nước đang rút ⬇", "Đã khô ráo ✅".
  - Thời gian cập nhật gần nhất.
- **WHEN** người dùng click vào một trạm quan trắc **THE SYSTEM SHALL** hiển thị thông số mực nước hiện tại so với 3 mốc Báo động (I, II, III).

### 3.3 Bảng Thống Kê Nhanh (Quick Stats Drawer)
- **WHEN** người dùng bấm xem tổng quan **THE SYSTEM SHALL** hiển thị số lượng điểm ngập đang hoạt động, top các điểm ngập sâu nhất cả nước và trạng thái thời tiết tổng hợp.

---

## 4. Dữ Liệu & Hợp Đồng Giao Tiếp
- Sử dụng trực tiếp dữ liệu từ bảng `provinces`, `stations`, `station_thresholds`, `flood_points` trên **Supabase Cloud**.
- Kết nối thông qua Supabase REST API với khóa công khai (`SUPABASE_PUBLISHABLE_KEY`) an toàn cho Client-side.
- Cơ chế fallback: Nếu mất mạng, hệ thống tự động tải bộ đệm dữ liệu ngoại tuyến (Offline Cache / Local Storage) để không làm trắng màn hình.

---

## 5. Tiêu Chí Thành Công (Success Criteria)
- Thời gian hiển thị bản đồ và điểm ngập lần đầu < 2 giây trên mạng 4G.
- 100% người dùng xem được dữ liệu mà không cần bất kỳ bước xác thực hay đăng nhập nào.
- Giao diện đáp ứng mượt mà trên cả iPhone, Android, Tablet và Desktop (từ màn hình 360px đến 4K).
