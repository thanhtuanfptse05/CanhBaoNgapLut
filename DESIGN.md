# HỆ THỐNG THIẾT KẾ GIAO DIỆN (DESIGN SYSTEM SPECIFICATION)
## FloodGuard Việt Nam — Light Mode GIS Professional Standard

- **Version**: 2.0.0
- **Theme**: Clean Light Mode (Apple / Google Maps / Linear Aesthetic)
- **Status**: Official Design Specification

---

## 1. Triết Lý Thiết Kế (Design Principles)

1. **Light & Crisp (Sáng sủa, Tinh tế)**:
   - Sử dụng gam nền sáng trắng (`#FFFFFF`) và xám ngọc trai (`#F8FAFC`, `#F1F5F9`) tạo cảm giác tin cậy, khoa học và chuyên nghiệp.
   - Loại bỏ hoàn toàn cảm giác u tối, chói mắt hoặc màu sắc lòe loẹt.
2. **Vector Iconography (Tuyệt đối không dùng emoji nghiệp dư)**:
   - 100% biểu tượng là vector SVG sắc nét (theo chuẩn Lucide / Heroicons), nét mảnh 1.75px – 2px, tỉ lệ cân đối.
   - Cấm dùng emoji làm icon chính trên các nút bấm, thanh điều hướng hay marker bản đồ.
3. **Information Hierarchy (Phân tầng thông tin rõ ràng)**:
   - Dữ liệu mực nước và cảnh báo nguy hiểm phải được làm nổi bật nhất trên bản đồ.
   - Độ tương phản đạt chuẩn WCAG AA / AAA để người dùng nhìn rõ ngay cả khi ở ngoài trời nắng.
4. **Micro-Interactions (Tương tác sống động)**:
   - Hiệu ứng đổ bóng mềm đa tầng (`box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.08)`).
   - Hiệu ứng sóng nước lan tỏa (Water Ripple) tinh tế cho các điểm ngập khẩn cấp.

---

## 2. Bảng Màu Chuẩn (Color System Tokens)

### 2.1 Màu Nền & Bề Mặt (Surfaces)
- **App Background**: `#F8FAFC` (Slate 50)
- **Surface Card**: `#FFFFFF` (Pure White)
- **Surface Elevated / Glass**: `rgba(255, 255, 255, 0.94)` kèm `backdrop-filter: blur(16px)`
- **Border Subtle**: `#E2E8F0` (Slate 200)
- **Border Active / Focus**: `#2563EB` (Blue 600)

### 2.2 Màu Chữ (Typography Colors)
- **Text Primary**: `#0F172A` (Slate 900 - Độ tương phản tối đa)
- **Text Secondary**: `#475569` (Slate 600)
- **Text Muted / Placeholder**: `#94A3B8` (Slate 400)

### 2.3 Màu Thương Hiệu & Điểm Nhấn (Brand Accents)
- **Primary Blue**: `#2563EB` (Blue 600)
- **Primary Hover / Gradient**: `linear-gradient(135deg, #1D4ED8 0%, #2563EB 100%)`
- **Primary Subdued**: `#EFF6FF` (Blue 50)

### 2.4 Thang Đo Mức Ngập Lụt (Flood Severity Scale)
- 🟢 **Mức 0 (An toàn - < 10cm)**:
  - Màu chủ đạo: `#059669` (Emerald 600) | Nền phụ: `#ECFDF5`
- 🟡 **Mức 1 (Ngập nhẹ 10 - 30cm - Mắt cá chân)**:
  - Màu chủ đạo: `#D97706` (Amber 600) | Nền phụ: `#FFFBEB`
- 🟠 **Mức 2 (Ngập vừa 30 - 50cm - Đầu gối, chết máy)**:
  - Màu chủ đạo: `#EA580C` (Orange 600) | Nền phụ: `#FFF7ED`
- 🔴 **Mức 3 (Ngập sâu nguy hiểm > 50cm - Cấm đi lại)**:
  - Màu chủ đạo: `#DC2626` (Red 600) | Nền phụ: `#FEF2F2` | Glow: `0 0 16px rgba(220, 38, 38, 0.35)`
- 🚨 **SOS & Cứu Hộ Khẩn Cấp**:
  - Màu chủ đạo: `#BE123C` (Rose 700) | Gradient: `linear-gradient(135deg, #E11D48 0%, #BE123C 100%)`

---

## 3. Hệ Thống Kiểu Chữ (Typography System)

- **Font Family**: `'Plus Jakarta Sans', system-ui, -apple-system, sans-serif`
- **Chỉ số kích thước**:
  - `Display / H1`: 1.15rem (18px) | Weight: 700 | Tracking: -0.025em
  - `Heading / H2`: 1.0rem (16px) | Weight: 600 | Tracking: -0.015em
  - `Body Regular`: 0.875rem (14px) | Weight: 400 | Line-height: 1.5
  - `Body Medium`: 0.875rem (14px) | Weight: 500
  - `Small / Badge`: 0.75rem (12px) | Weight: 600 | Tracking: 0.02em
  - `Metric Value`: 1.75rem (28px) | Weight: 800 | Font-variant: tabular-nums

---

## 4. Đặc Tả Thành Phần Giao Diện (Component Specifications)

### 4.1 Thanh Điều Hướng Trên (Header Navigation)
- Đặt nổi trên đầu bản đồ với khoảng cách 16px.
- Bo góc `16px`, nền kính mờ trắng `rgba(255, 255, 255, 0.92)`, bóng đổ mềm.
- **Logo**: Biểu tượng khiên bảo vệ sóng nước (Vector SVG) kết hợp chữ FloodGuard Việt Nam.
- **Badge trạng thái trực tiếp**: Chấm xanh ngọc đập nhịp 1.8s + Chữ "Dữ liệu thời gian thực".
- **Các pill thống kê**: Điểm ngập đang hoạt động, Điểm ngập sâu nhất toàn quốc.
- **Cụm nút hành động**:
  - Nút "Báo ngập" (Nền xanh Blue, icon định vị SVG).
  - Nút "Cứu hộ SOS" (Nền đỏ Rose, icon còi cứu thương SVG, nhịp đập cảnh báo).

### 4.2 Bản Đồ Nền GIS Độ Nét Cao (Mapbox High-Definition)
- **Mặc định**: Bản đồ đường phố sáng sủa, tương phản cao `mapbox/streets-v12`.
- **Hỗ trợ chuyển đổi**:
  - `Bản đồ Đường phố` ➔ `Bản đồ Vệ tinh HD` ➔ `Bản đồ Tối GIS`.
- **Nút công cụ nổi**:
  - Nút GPS "Vị trí của tôi" (Icon crosshair SVG).
  - Nút đổi lớp bản đồ (Icon layers SVG).

### 4.3 Điểm Ghim Cảnh Báo Ngập (Custom Flood Pin)
- Không dùng icon hoạt họa hay hình tròn thô.
- Thiết kế hình giọt nước / hình ghim vector với:
  - Vòng viền màu sắc cảnh báo theo độ sâu.
  - Số cm hiển thị rõ ràng bên trong.
  - Hiệu ứng phát xung (Ripple Pulse) cho Mức 2 và Mức 3.
  - Khi click: Mở Card thông tin tối giản, thanh đo mực nước đồ họa (Water Gauge Bar).

### 4.4 Bảng Điều Khiển Lọc & Tìm Kiếm (Floating Filter Bar)
- Ô tìm kiếm tên đường / ngã tư kèm icon kính lúp SVG.
- Dropdown chọn 63 tỉnh/thành phố với cờ và tên chuẩn hóa.
- Thanh chip lọc mức độ ngập: Tất cả, Mức 3 (>50cm), Mức 2 (30-50cm), Mức 1 (<30cm), Trạm đo.

### 4.5 Modal Cứu Hộ Khẩn Cấp (SOS Modal)
- Nền trắng tinh tế, danh bạ gọi trực tiếp 114 (Cứu nạn), 115 (Y tế), 112 (Tìm kiếm cứu nạn).
- Nút "Sao chép tọa độ cứu hộ" để gửi Zalo/SMS chỉ bằng 1 chạm.

### 4.6 Form Báo Ngập Cộng Đồng 1 Chạm (Community Report)
- Thẻ chọn 4 mức độ ngập thiết kế dạng lưới 2x2 trực quan với độ cao minh họa (15cm, 35cm, 60cm, >100cm).
- Tự động điền tọa độ GPS, người dùng chỉ cần nhập tên đường và nhấn Gửi.
